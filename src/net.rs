//! Listener: one port serving TLS and (where allowed) plain HTTP, told apart by
//! the first byte. The certificate is re-read every few hours so renewals by
//! another program are picked up without a restart.

use std::{
    net::{IpAddr, SocketAddr},
    path::Path,
    sync::{Arc, RwLock},
    time::Duration,
};

use axum::{Router, extract::ConnectInfo};
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    server::conn::auto::Builder,
    service::TowerToHyperService,
};
use tokio::net::{TcpListener, TcpStream};
use tokio_rustls::{TlsAcceptor, rustls};
use tower::ServiceExt;

use crate::AppState;

fn load_tls(cert: &Path, key: &Path) -> Result<Arc<rustls::ServerConfig>, String> {
    let certs = rustls_pemfile::certs(&mut std::io::BufReader::new(
        std::fs::File::open(cert).map_err(|e| format!("{}: {e}", cert.display()))?,
    ))
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    let key = rustls_pemfile::private_key(&mut std::io::BufReader::new(
        std::fs::File::open(key).map_err(|e| format!("{}: {e}", key.display()))?,
    ))
    .map_err(|e| e.to_string())?
    .ok_or("no private key found")?;
    let mut sc = rustls::ServerConfig::builder_with_provider(Arc::new(
        rustls::crypto::ring::default_provider(),
    ))
    .with_safe_default_protocol_versions()
    .map_err(|e| e.to_string())?
    .with_no_client_auth()
    .with_single_cert(certs, key)
    .map_err(|e| e.to_string())?;
    sc.alpn_protocols = vec![b"h2".to_vec(), b"http/1.1".to_vec()];
    Ok(Arc::new(sc))
}

pub fn is_private(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v) => v.is_private() || v.is_loopback() || v.is_link_local(),
        IpAddr::V6(v) => {
            if let Some(v4) = v.to_ipv4_mapped() {
                return is_private(IpAddr::V4(v4));
            }
            v.is_loopback() || (v.segments()[0] & 0xfe00) == 0xfc00 || (v.segments()[0] & 0xffc0) == 0xfe80
        }
    }
}

pub async fn serve(state: Arc<AppState>, app: Router) {
    let cfg = &state.cfg;
    let tls: Option<Arc<RwLock<Arc<rustls::ServerConfig>>>> =
        match (&cfg.tls_cert, &cfg.tls_key) {
            (Some(c), Some(k)) => match load_tls(c, k) {
                Ok(sc) => Some(Arc::new(RwLock::new(sc))),
                Err(e) => {
                    eprintln!("TLS setup failed: {e}");
                    std::process::exit(1)
                }
            },
            _ => None,
        };
    if let (Some(tls), Some(c), Some(k)) = (&tls, cfg.tls_cert.clone(), cfg.tls_key.clone()) {
        let tls = tls.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(6 * 3600)).await;
                match load_tls(&c, &k) {
                    Ok(sc) => *tls.write().unwrap() = sc,
                    Err(e) => tracing::warn!("TLS reload failed, keeping old cert: {e}"),
                }
            }
        });
    }
    let plain_anywhere = tls.is_none() || cfg.allow_plain_public;
    let addr = SocketAddr::from(([0, 0, 0, 0, 0, 0, 0, 0], cfg.port));
    let listener = match TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(_) => TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], cfg.port)))
            .await
            .unwrap_or_else(|e| {
                eprintln!("cannot listen on port {}: {e}", cfg.port);
                std::process::exit(1)
            }),
    };
    tracing::info!(
        "partyhall {} listening on port {} ({})",
        env!("CARGO_PKG_VERSION"),
        cfg.port,
        if tls.is_some() { "TLS + LAN plain" } else { "plain HTTP" }
    );
    loop {
        let Ok((stream, peer)) = listener.accept().await else {
            tokio::time::sleep(Duration::from_millis(50)).await;
            continue;
        };
        let app = app.clone();
        let tls = tls.as_ref().map(|t| t.read().unwrap().clone());
        tokio::spawn(async move {
            let _ = stream.set_nodelay(true);
            let mut b = [0u8; 1];
            let is_tls = matches!(
                tokio::time::timeout(Duration::from_secs(10), stream.peek(&mut b)).await,
                Ok(Ok(1))
            ) && b[0] == 0x16;
            match (is_tls, tls) {
                (true, Some(sc)) => {
                    if let Ok(Ok(s)) = tokio::time::timeout(
                        Duration::from_secs(10),
                        TlsAcceptor::from(sc).accept(stream),
                    )
                    .await
                    {
                        conn(app, s, peer).await
                    }
                }
                (false, _) if plain_anywhere || is_private(peer.ip()) => {
                    conn(app, stream, peer).await
                }
                (false, Some(_)) => refuse_plain(stream).await,
                _ => {}
            }
        });
    }
}

async fn refuse_plain(mut s: TcpStream) {
    use tokio::io::AsyncWriteExt;
    let body = "Use https:// to reach this server from outside the local network.\n";
    let _ = s
        .write_all(
            format!(
                "HTTP/1.1 400 Bad Request\r\ncontent-type: text/plain\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                body.len()
            )
            .as_bytes(),
        )
        .await;
}

async fn conn<S>(app: Router, s: S, peer: SocketAddr)
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin + Send + 'static,
{
    let svc = app.map_request(move |mut req: hyper::Request<hyper::body::Incoming>| {
        req.extensions_mut().insert(ConnectInfo(peer));
        req
    });
    let _ = Builder::new(TokioExecutor::new())
        .serve_connection_with_upgrades(TokioIo::new(s), TowerToHyperService::new(svc))
        .await;
}
