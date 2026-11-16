//! Party Hall: a tiny server for Jackbox-style party games.
//!
//! The server only relays messages between one host screen and the players'
//! phones. All game logic runs in the host's browser, loaded from a game folder
//! at runtime, so adding a game never needs a server rebuild or restart.

mod games;
mod net;
mod rooms;

use std::{net::SocketAddr, path::PathBuf, sync::Arc};

use axum::{
    Router,
    extract::{ConnectInfo, DefaultBodyLimit, State, WebSocketUpgrade},
    http::{HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
    routing::get,
};

pub struct Config {
    pub port: u16,
    /// Game folders, searched in order. The first one is where uploads go.
    pub game_dirs: Vec<PathBuf>,
    pub admin_token: Option<String>,
    pub tls_cert: Option<PathBuf>,
    pub tls_key: Option<PathBuf>,
    /// Accept plain HTTP from any address (otherwise only from private/LAN
    /// addresses when TLS is configured).
    pub allow_plain_public: bool,
}

pub struct AppState {
    pub cfg: Config,
    pub hub: rooms::Hub,
}

fn usage() -> ! {
    eprintln!(
        "partyhall [--port N] [--games DIR]... [--tls-cert FILE --tls-key FILE] [--allow-plain]\n\
         env: PARTY_ADMIN_TOKEN (enables game upload API), PARTY_ADMIN_TOKEN_FILE"
    );
    std::process::exit(2)
}

fn parse_args() -> Config {
    let mut cfg = Config {
        port: 7777,
        game_dirs: vec![],
        admin_token: None,
        tls_cert: None,
        tls_key: None,
        allow_plain_public: false,
    };
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        let mut val = || args.next().unwrap_or_else(|| usage());
        match a.as_str() {
            "--port" => cfg.port = val().parse().unwrap_or_else(|_| usage()),
            "--games" => cfg.game_dirs.push(val().into()),
            "--tls-cert" => cfg.tls_cert = Some(val().into()),
            "--tls-key" => cfg.tls_key = Some(val().into()),
            "--allow-plain" => cfg.allow_plain_public = true,
            "--version" => {
                println!("partyhall {}", env!("CARGO_PKG_VERSION"));
                std::process::exit(0)
            }
            _ => usage(),
        }
    }
    if cfg.game_dirs.is_empty() {
        cfg.game_dirs.push("games".into());
    }
    cfg.admin_token = std::env::var("PARTY_ADMIN_TOKEN")
        .ok()
        .or_else(|| {
            std::env::var("PARTY_ADMIN_TOKEN_FILE")
                .ok()
                .and_then(|f| std::fs::read_to_string(f).ok())
        })
        .map(|t| t.trim().to_string())
        .filter(|t| t.len() >= 16);
    // systemd LoadCredential=tls-cert:/... and tls-key:/...
    if cfg.tls_cert.is_none() {
        if let Ok(dir) = std::env::var("CREDENTIALS_DIRECTORY") {
            let (c, k) = (PathBuf::from(&dir).join("tls-cert"), PathBuf::from(&dir).join("tls-key"));
            if c.is_file() && k.is_file() {
                cfg.tls_cert = Some(c);
                cfg.tls_key = Some(k);
            }
        }
    }
    if cfg.tls_cert.is_some() != cfg.tls_key.is_some() {
        eprintln!("--tls-cert and --tls-key go together");
        usage()
    }
    cfg
}

macro_rules! asset {
    ($name:literal, $mime:literal) => {
        get(|| async {
            (
                [
                    (header::CONTENT_TYPE, $mime),
                    (header::CACHE_CONTROL, "no-cache"),
                ],
                include_str!(concat!("../web/", $name)),
            )
        })
    };
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_target(false).init();
    let cfg = parse_args();
    for d in &cfg.game_dirs {
        tracing::info!("games folder: {}", d.display());
    }
    if cfg.admin_token.is_none() {
        tracing::info!("no PARTY_ADMIN_TOKEN: game upload API disabled");
    }
    let state = Arc::new(AppState {
        cfg,
        hub: rooms::Hub::default(),
    });
    tokio::spawn(rooms::reaper(state.clone()));

    let app = Router::new()
        .route("/", asset!("index.html", "text/html; charset=utf-8"))
        .route("/host", asset!("host.html", "text/html; charset=utf-8"))
        .route("/sdk/style.css", asset!("style.css", "text/css"))
        .route("/sdk/common.js", asset!("common.js", "text/javascript"))
        .route("/sdk/host.js", asset!("host.js", "text/javascript"))
        .route("/sdk/play.js", asset!("play.js", "text/javascript"))
        .route("/sdk/widgets.js", asset!("widgets.js", "text/javascript"))
        .route("/sdk/audio.js", asset!("audio.js", "text/javascript"))
        .route("/sdk/tutorial.js", asset!("tutorial.js", "text/javascript"))
        .route("/healthz", get(|| async { "ok" }))
        .route("/qr.svg", get(qr))
        .route("/ws", get(ws))
        .route("/api/games", get(games::list))
        .route(
            "/api/games/{id}",
            axum::routing::delete(games::delete),
        )
        .route(
            "/api/games/{id}/{*path}",
            axum::routing::put(games::upload),
        )
        .route("/games/{id}/{*path}", get(games::file))
        .layer(DefaultBodyLimit::max(4 * 1024 * 1024))
        .layer(axum::middleware::map_response(security_headers))
        .with_state(state.clone());

    net::serve(state, app).await;
}

async fn security_headers(mut res: Response) -> Response {
    let h = res.headers_mut();
    h.insert("x-content-type-options", HeaderValue::from_static("nosniff"));
    h.insert("referrer-policy", HeaderValue::from_static("no-referrer"));
    res
}

async fn ws(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    up: WebSocketUpgrade,
) -> impl IntoResponse {
    if state.hub.too_many_sockets() {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    }
    up.max_message_size(512 * 1024)
        .on_upgrade(move |sock| rooms::handle_socket(state, sock, addr))
}

#[derive(serde::Deserialize)]
struct QrQuery {
    text: String,
}

/// QR code for the join link on the lobby screen.
async fn qr(axum::extract::Query(q): axum::extract::Query<QrQuery>) -> Response {
    if q.text.len() > 300 {
        return StatusCode::BAD_REQUEST.into_response();
    }
    match qrcode::QrCode::with_error_correction_level(q.text.as_bytes(), qrcode::EcLevel::M) {
        Ok(code) => {
            let svg = code
                .render::<qrcode::render::svg::Color>()
                .min_dimensions(256, 256)
                .quiet_zone(true)
                .dark_color(qrcode::render::svg::Color("#14111f"))
                .light_color(qrcode::render::svg::Color("#ffffff"))
                .build();
            ([(header::CONTENT_TYPE, "image/svg+xml"), (header::CACHE_CONTROL, "max-age=3600")], svg).into_response()
        }
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}
