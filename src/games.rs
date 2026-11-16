//! Game folders. Each game is a folder `<id>/` holding `game.json` and
//! `host.js` (plus optional `player.js` and any assets). Folders are read on
//! every request, so a new or edited game shows up immediately.

use std::{
    path::{Component, Path, PathBuf},
    sync::Arc,
};

use axum::{
    Json,
    body::Bytes,
    extract::{Path as UrlPath, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
};
use serde_json::{Value, json};

use crate::{AppState, Config};

pub fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 40
        && id
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && !id.starts_with('-')
}

/// Folder of a game, searching the game folders in order.
pub fn find(cfg: &Config, id: &str) -> Option<PathBuf> {
    if !valid_id(id) {
        return None;
    }
    cfg.game_dirs
        .iter()
        .map(|d| d.join(id))
        .find(|d| d.join("game.json").is_file())
}

fn safe_rel(path: &str) -> Option<PathBuf> {
    let p = Path::new(path);
    if path.len() > 200 || p.components().any(|c| !matches!(c, Component::Normal(_))) {
        return None;
    }
    let ok = p.components().all(|c| {
        c.as_os_str().to_str().is_some_and(|s| {
            !s.starts_with('.')
                && s.bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"-_.".contains(&b))
        })
    });
    ok.then(|| p.to_path_buf())
}

fn mime(p: &Path) -> &'static str {
    match p.extension().and_then(|e| e.to_str()).unwrap_or("") {
        "js" | "mjs" => "text/javascript",
        "json" => "application/json",
        "css" => "text/css",
        "html" => "text/html; charset=utf-8",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "mp3" => "audio/mpeg",
        "ogg" => "audio/ogg",
        "wav" => "audio/wav",
        "txt" | "md" => "text/plain; charset=utf-8",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

pub async fn list(State(st): State<Arc<AppState>>) -> Json<Value> {
    let mut seen = std::collections::HashSet::new();
    let mut out = vec![];
    for dir in &st.cfg.game_dirs {
        let Ok(rd) = std::fs::read_dir(dir) else { continue };
        for e in rd.flatten() {
            let id = e.file_name().to_string_lossy().to_string();
            if !valid_id(&id) || seen.contains(&id) {
                continue;
            }
            let Ok(txt) = std::fs::read_to_string(e.path().join("game.json")) else {
                continue;
            };
            let mut meta: Value = match serde_json::from_str(&txt) {
                Ok(Value::Object(m)) => Value::Object(m),
                _ => {
                    tracing::warn!("{id}/game.json is not a JSON object");
                    continue;
                }
            };
            if meta.get("hidden").and_then(Value::as_bool) == Some(true) {
                continue;
            }
            let ver = ["game.json", "host.js", "player.js"]
                .iter()
                .filter_map(|f| e.path().join(f).metadata().ok()?.modified().ok())
                .max()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);
            meta["id"] = json!(id);
            meta["version"] = json!(ver);
            meta["hasPlayer"] = json!(e.path().join("player.js").is_file());
            seen.insert(id);
            out.push(meta);
        }
    }
    out.sort_by(|a, b| {
        let n = |v: &Value| v["name"].as_str().unwrap_or("").to_lowercase();
        n(a).cmp(&n(b))
    });
    Json(Value::Array(out))
}

pub async fn file(
    State(st): State<Arc<AppState>>,
    UrlPath((id, path)): UrlPath<(String, String)>,
) -> Response {
    let (Some(dir), Some(rel)) = (find(&st.cfg, &id), safe_rel(&path)) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let p = dir.join(&rel);
    match tokio::fs::read(&p).await {
        Ok(bytes) => (
            [
                (header::CONTENT_TYPE, mime(&p)),
                (header::CACHE_CONTROL, "no-cache"),
            ],
            bytes,
        )
            .into_response(),
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}

fn authorized(st: &AppState, h: &HeaderMap) -> bool {
    let Some(want) = &st.cfg.admin_token else { return false };
    let got = h
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or("");
    // Constant-time compare.
    got.len() == want.len()
        && got
            .bytes()
            .zip(want.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
}

/// PUT /api/games/<id>/<path> with `Authorization: Bearer <token>` writes one
/// file into the first games folder.
pub async fn upload(
    State(st): State<Arc<AppState>>,
    UrlPath((id, path)): UrlPath<(String, String)>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    if !authorized(&st, &headers) {
        return (StatusCode::UNAUTHORIZED, "bad or missing admin token\n").into_response();
    }
    let (true, Some(rel)) = (valid_id(&id), safe_rel(&path)) else {
        return (StatusCode::BAD_REQUEST, "bad game id or path\n").into_response();
    };
    if rel == Path::new("game.json") && !matches!(serde_json::from_slice::<Value>(&body), Ok(Value::Object(_))) {
        return (StatusCode::BAD_REQUEST, "game.json must be a JSON object\n").into_response();
    }
    let dest = st.cfg.game_dirs[0].join(&id).join(&rel);
    if let Some(parent) = dest.parent() {
        if let Err(e) = tokio::fs::create_dir_all(parent).await {
            return (StatusCode::INTERNAL_SERVER_ERROR, format!("{e}\n")).into_response();
        }
    }
    let tmp = dest.with_extension("partyhall-tmp");
    let res = async {
        tokio::fs::write(&tmp, &body).await?;
        tokio::fs::rename(&tmp, &dest).await
    }
    .await;
    match res {
        Ok(()) => {
            tracing::info!("uploaded {id}/{path} ({} bytes)", body.len());
            (StatusCode::OK, format!("saved {id}/{path}\n")).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("{e}\n")).into_response(),
    }
}

/// DELETE /api/games/<id> removes an uploaded game.
pub async fn delete(
    State(st): State<Arc<AppState>>,
    UrlPath(id): UrlPath<String>,
    headers: HeaderMap,
) -> Response {
    if !authorized(&st, &headers) {
        return (StatusCode::UNAUTHORIZED, "bad or missing admin token\n").into_response();
    }
    if !valid_id(&id) {
        return StatusCode::BAD_REQUEST.into_response();
    }
    match tokio::fs::remove_dir_all(st.cfg.game_dirs[0].join(&id)).await {
        Ok(()) => (StatusCode::OK, format!("deleted {id}\n")).into_response(),
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}
