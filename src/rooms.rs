//! Rooms: one host socket and up to MAX_PLAYERS phone sockets, joined by a
//! four-letter code. The server never looks inside game messages; it only
//! routes them.

use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{
        Arc, Mutex,
        atomic::{AtomicUsize, Ordering},
    },
    time::{Duration, Instant},
};

use axum::extract::ws::{Message, WebSocket};
use rand::Rng;
use serde::Deserialize;
use serde_json::{Value, json};
use tokio::sync::mpsc::{self, UnboundedSender};

use crate::AppState;

const MAX_ROOMS: usize = 200;
const MAX_PLAYERS: usize = 16;
const MAX_SOCKETS: usize = 2000;
/// A room whose host has been gone this long is closed.
const HOST_GRACE: Duration = Duration::from_secs(20 * 60);
/// Rooms close after this long regardless.
const ROOM_MAX_AGE: Duration = Duration::from_secs(24 * 3600);

type Tx = UnboundedSender<Message>;

struct Player {
    name: String,
    token: String,
    tx: Option<Tx>,
    conn: u64,
}

struct Room {
    game: String,
    host_token: String,
    host: Option<(Tx, u64)>,
    host_gone: Option<Instant>,
    created: Instant,
    locked: bool,
    next_id: u32,
    players: HashMap<u32, Player>,
}

#[derive(Default)]
pub struct Hub {
    rooms: Mutex<HashMap<String, Room>>,
    sockets: AtomicUsize,
    conn_ids: std::sync::atomic::AtomicU64,
}

impl Hub {
    pub fn too_many_sockets(&self) -> bool {
        self.sockets.load(Ordering::Relaxed) >= MAX_SOCKETS
    }
}

fn token() -> String {
    let mut r = rand::thread_rng();
    (0..24)
        .map(|_| {
            let c = r.gen_range(0..36u8);
            (if c < 10 { b'0' + c } else { b'a' + c - 10 }) as char
        })
        .collect()
}

fn room_code(existing: &HashMap<String, Room>) -> String {
    // No vowels except A, no look-alikes, so codes rarely spell words.
    const L: &[u8] = b"BCDFGHJKLMNPQRSTVWXZ";
    let mut r = rand::thread_rng();
    loop {
        let c: String = (0..4).map(|_| L[r.gen_range(0..L.len())] as char).collect();
        if !existing.contains_key(&c) {
            return c;
        }
    }
}

fn send(tx: &Tx, v: Value) {
    let _ = tx.send(Message::Text(v.to_string().into()));
}

#[derive(Deserialize)]
#[serde(tag = "t", rename_all = "snake_case")]
enum Hello {
    Create { game: String },
    Resume { code: String, token: String },
    Join { code: String, name: String, token: Option<String> },
}

#[derive(Deserialize)]
#[serde(tag = "t", rename_all = "snake_case")]
enum HostMsg {
    Send { to: Value, data: Value },
    Kick { id: u32 },
    Lock { locked: bool },
    Close,
    Ping,
}

#[derive(Deserialize)]
#[serde(tag = "t", rename_all = "snake_case")]
enum PlayerMsg {
    Send { data: Value },
    Ping,
}

enum Role {
    Host { code: String },
    Player { code: String, id: u32 },
}

fn clean_name(n: &str) -> String {
    let n: String = n
        .chars()
        .filter(|c| !c.is_control())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    n.chars().take(16).collect()
}

fn players_json(room: &Room) -> Value {
    let mut ids: Vec<_> = room.players.keys().copied().collect();
    ids.sort();
    Value::Array(
        ids.iter()
            .map(|id| {
                let p = &room.players[id];
                json!({"id": id, "name": p.name, "connected": p.tx.is_some()})
            })
            .collect(),
    )
}

struct SocketGuard<'a>(&'a Hub);
impl Drop for SocketGuard<'_> {
    fn drop(&mut self) {
        self.0.sockets.fetch_sub(1, Ordering::Relaxed);
    }
}

pub async fn handle_socket(state: Arc<AppState>, ws: WebSocket, addr: SocketAddr) {
    let hub = &state.hub;
    hub.sockets.fetch_add(1, Ordering::Relaxed);
    let _guard = SocketGuard(hub);
    let conn = hub.conn_ids.fetch_add(1, Ordering::Relaxed);
    use futures_util::{SinkExt, StreamExt};
    let (mut sink, mut stream) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
    let writer = tokio::spawn(async move {
        while let Some(m) = rx.recv().await {
            let close = matches!(m, Message::Close(_));
            if sink.send(m).await.is_err() || close {
                break;
            }
        }
    });

    // First message says who this socket is.
    let first = match tokio::time::timeout(Duration::from_secs(15), stream.next()).await {
        Ok(Some(Ok(Message::Text(t)))) => t,
        _ => return,
    };
    let role = match serde_json::from_str::<Hello>(&first) {
        Ok(h) => hello(&state, h, &tx, conn, addr),
        Err(_) => Err("bad hello".to_string()),
    };
    let role = match role {
        Ok(r) => r,
        Err(e) => {
            send(&tx, json!({"t": "error", "msg": e}));
            let _ = tx.send(Message::Close(None));
            let _ = writer.await;
            return;
        }
    };

    // Rate limit: a burst of 60 messages, refilled at 20/s.
    let mut budget = 60.0f64;
    let mut last = Instant::now();
    loop {
        let msg = match tokio::time::timeout(Duration::from_secs(120), stream.next()).await {
            Ok(Some(Ok(m))) => m,
            _ => break,
        };
        let text = match msg {
            Message::Text(t) => t,
            Message::Close(_) => break,
            _ => continue,
        };
        let now = Instant::now();
        budget = (budget + now.duration_since(last).as_secs_f64() * 20.0).min(60.0);
        last = now;
        if budget < 1.0 {
            continue;
        }
        budget -= 1.0;
        let keep = match &role {
            Role::Host { code } => match serde_json::from_str::<HostMsg>(&text) {
                Ok(m) => host_msg(&state, code, m, &tx),
                Err(_) => true,
            },
            Role::Player { code, id } => match serde_json::from_str::<PlayerMsg>(&text) {
                Ok(m) => player_msg(&state, code, *id, m, &tx),
                Err(_) => true,
            },
        };
        if !keep {
            break;
        }
    }

    // Disconnected.
    {
    let mut rooms = hub.rooms.lock().unwrap();
    match role {
        Role::Host { code } => {
            if let Some(room) = rooms.get_mut(&code) {
                if room.host.as_ref().is_some_and(|(_, c)| *c == conn) {
                    room.host = None;
                    room.host_gone = Some(Instant::now());
                    for p in room.players.values() {
                        if let Some(t) = &p.tx {
                            send(t, json!({"t": "host", "connected": false}));
                        }
                    }
                }
            }
        }
        Role::Player { code, id } => {
            if let Some(room) = rooms.get_mut(&code) {
                if let Some(p) = room.players.get_mut(&id) {
                    if p.conn == conn {
                        p.tx = None;
                        if let Some((h, _)) = &room.host {
                            send(h, json!({"t": "leave", "id": id}));
                        }
                    }
                }
            }
        }
    }
    }
    let _ = tx.send(Message::Close(None));
    let _ = writer.await;
}

fn hello(state: &AppState, h: Hello, tx: &Tx, conn: u64, addr: SocketAddr) -> Result<Role, String> {
    let mut rooms = state.hub.rooms.lock().unwrap();
    match h {
        Hello::Create { game } => {
            if crate::games::find(&state.cfg, &game).is_none() {
                return Err("unknown game".into());
            }
            if rooms.len() >= MAX_ROOMS {
                return Err("server is full, try again later".into());
            }
            let code = room_code(&rooms);
            let tok = token();
            rooms.insert(
                code.clone(),
                Room {
                    game: game.clone(),
                    host_token: tok.clone(),
                    host: Some((tx.clone(), conn)),
                    host_gone: None,
                    created: Instant::now(),
                    locked: false,
                    next_id: 1,
                    players: HashMap::new(),
                },
            );
            tracing::info!("room {code} created for {game} by {}", addr.ip());
            send(tx, json!({"t": "created", "code": code, "token": tok, "game": game}));
            Ok(Role::Host { code })
        }
        Hello::Resume { code, token } => {
            let code = code.to_uppercase();
            let room = rooms.get_mut(&code).ok_or("room has closed")?;
            if room.host_token != token {
                return Err("room has closed".into());
            }
            if let Some((old, _)) = room.host.take() {
                send(&old, json!({"t": "error", "msg": "this room was opened in another window"}));
                let _ = old.send(Message::Close(None));
            }
            room.host = Some((tx.clone(), conn));
            room.host_gone = None;
            for p in room.players.values() {
                if let Some(t) = &p.tx {
                    send(t, json!({"t": "host", "connected": true}));
                }
            }
            send(
                tx,
                json!({"t": "resumed", "code": code, "game": room.game, "players": players_json(room), "locked": room.locked}),
            );
            Ok(Role::Host { code })
        }
        Hello::Join { code, name, token: ptok } => {
            let code = code.trim().to_uppercase();
            let room = rooms.get_mut(&code).ok_or("no room with that code")?;
            // Rejoin with a saved token.
            if let Some(ptok) = ptok {
                if let Some((&id, p)) = room.players.iter_mut().find(|(_, p)| p.token == ptok) {
                    if let Some(old) = p.tx.take() {
                        let _ = old.send(Message::Close(None));
                    }
                    p.tx = Some(tx.clone());
                    p.conn = conn;
                    let name = p.name.clone();
                    send(
                        tx,
                        json!({"t": "joined", "id": id, "name": name, "token": ptok, "game": room.game, "code": code, "host": room.host.is_some()}),
                    );
                    if let Some((h, _)) = &room.host {
                        send(h, json!({"t": "join", "id": id, "name": name, "rejoin": true}));
                    }
                    return Ok(Role::Player { code, id });
                }
            }
            let name = clean_name(&name);
            if name.is_empty() {
                return Err("pick a name".into());
            }
            if room.locked {
                return Err("this game has already started".into());
            }
            if room.players.len() >= MAX_PLAYERS {
                return Err("the room is full".into());
            }
            if room
                .players
                .values()
                .any(|p| p.name.to_lowercase() == name.to_lowercase())
            {
                return Err("someone already has that name".into());
            }
            let id = room.next_id;
            room.next_id += 1;
            let ptok = token();
            room.players.insert(
                id,
                Player {
                    name: name.clone(),
                    token: ptok.clone(),
                    tx: Some(tx.clone()),
                    conn,
                },
            );
            send(
                tx,
                json!({"t": "joined", "id": id, "name": name, "token": ptok, "game": room.game, "code": code, "host": room.host.is_some()}),
            );
            if let Some((h, _)) = &room.host {
                send(h, json!({"t": "join", "id": id, "name": name, "rejoin": false}));
            }
            Ok(Role::Player { code, id })
        }
    }
}

fn host_msg(state: &AppState, code: &str, m: HostMsg, tx: &Tx) -> bool {
    let mut rooms = state.hub.rooms.lock().unwrap();
    let Some(room) = rooms.get_mut(code) else {
        return false;
    };
    match m {
        HostMsg::Send { to, data } => {
            let out = Message::Text(json!({"t": "msg", "data": data}).to_string().into());
            let send_to = |p: &Player| {
                if let Some(t) = &p.tx {
                    let _ = t.send(out.clone());
                }
            };
            match to {
                Value::String(s) if s == "all" => room.players.values().for_each(send_to),
                Value::Number(n) => {
                    if let Some(p) = n.as_u64().and_then(|n| room.players.get(&(n as u32))) {
                        send_to(p)
                    }
                }
                Value::Array(ids) => {
                    for n in ids {
                        if let Some(p) = n.as_u64().and_then(|n| room.players.get(&(n as u32))) {
                            send_to(p)
                        }
                    }
                }
                _ => {}
            }
        }
        HostMsg::Kick { id } => {
            if let Some(p) = room.players.remove(&id) {
                if let Some(t) = p.tx {
                    send(&t, json!({"t": "kicked"}));
                    let _ = t.send(Message::Close(None));
                }
                send(tx, json!({"t": "removed", "id": id}));
            }
        }
        HostMsg::Lock { locked } => room.locked = locked,
        HostMsg::Close => {
            if let Some(room) = rooms.remove(code) {
                close_room(room);
            }
            return false;
        }
        HostMsg::Ping => send(tx, json!({"t": "pong"})),
    }
    true
}

fn player_msg(state: &AppState, code: &str, id: u32, m: PlayerMsg, tx: &Tx) -> bool {
    let rooms = state.hub.rooms.lock().unwrap();
    let Some(room) = rooms.get(code) else {
        return false;
    };
    if !room.players.contains_key(&id) {
        return false;
    }
    match m {
        PlayerMsg::Send { data } => {
            if let Some((h, _)) = &room.host {
                send(h, json!({"t": "msg", "from": id, "data": data}));
            }
        }
        PlayerMsg::Ping => send(tx, json!({"t": "pong"})),
    }
    true
}

fn close_room(room: Room) {
    for p in room.players.into_values() {
        if let Some(t) = p.tx {
            send(&t, json!({"t": "closed"}));
            let _ = t.send(Message::Close(None));
        }
    }
}

pub async fn reaper(state: Arc<AppState>) {
    loop {
        tokio::time::sleep(Duration::from_secs(60)).await;
        let mut rooms = state.hub.rooms.lock().unwrap();
        let dead: Vec<String> = rooms
            .iter()
            .filter(|(_, r)| {
                r.created.elapsed() > ROOM_MAX_AGE
                    || r.host_gone.is_some_and(|t| t.elapsed() > HOST_GRACE)
            })
            .map(|(c, _)| c.clone())
            .collect();
        for c in dead {
            if let Some(r) = rooms.remove(&c) {
                tracing::info!("room {c} closed (idle)");
                close_room(r);
            }
        }
    }
}
