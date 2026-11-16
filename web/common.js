// Shared helpers for the host screen, the phones and game code.

/** Build an element: h('div.card#main', {onclick}, 'text', child, [more]) */
export function h(tag, attrs, ...kids) {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(tag) || [];
  const el = document.createElement(m[1] || 'div');
  for (const part of (m[2] || '').match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    kids.unshift(attrs); attrs = null;
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    }
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (k) => {
    if (k == null || k === false) return;
    if (Array.isArray(k)) k.forEach(add);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  };
  kids.forEach(add);
  return el;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const PLAYER_COLORS = ['#ff5d73', '#ffb84d', '#ffe14d', '#5df08a', '#4dd8ff', '#7d8cff',
  '#c77dff', '#ff7dd6', '#ff8a4d', '#b8f04d', '#4dffd2', '#4d9dff', '#e04dff', '#ffd6a5', '#a5ffd6', '#d6a5ff'];
export const colorOf = (id) => PLAYER_COLORS[(id - 1) % PLAYER_COLORS.length];

/**
 * A WebSocket that reconnects. `hello()` returns the first message to send on
 * every (re)connect. Calls onMsg(obj) for each message and onState(open).
 */
export function socket({ hello, onMsg, onState }) {
  let ws, closed = false, retry = 500, pingTimer;
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      retry = 500;
      ws.send(JSON.stringify(hello()));
      onState?.(true);
      clearInterval(pingTimer);
      pingTimer = setInterval(() => send({ t: 'ping' }), 25000);
    };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t !== 'pong') onMsg(m);
    };
    ws.onclose = () => {
      clearInterval(pingTimer);
      onState?.(false);
      if (!closed) setTimeout(open, retry = Math.min(retry * 2, 8000));
    };
  };
  const send = (m) => { if (ws?.readyState === 1) ws.send(JSON.stringify(m)); };
  open();
  return { send, close() { closed = true; ws?.close(); } };
}

/**
 * Keep the screen awake while a room is open (Screen Wake Lock API). Needs
 * HTTPS (or localhost); browsers drop the lock when the tab is hidden, so it
 * is taken again whenever the tab comes back.
 */
export function keepAwake(on) {
  keepAwake.want = on;
  if (!('wakeLock' in navigator)) return;
  if (on && !keepAwake.lock && document.visibilityState === 'visible') {
    navigator.wakeLock.request('screen').then((l) => {
      keepAwake.lock = l;
      l.addEventListener('release', () => { keepAwake.lock = null; });
      if (!keepAwake.want) l.release();
    }).catch(() => {});
  } else if (!on && keepAwake.lock) {
    keepAwake.lock.release().catch(() => {});
    keepAwake.lock = null;
  }
}
document.addEventListener('visibilitychange', () => {
  if (keepAwake.want && document.visibilityState === 'visible') keepAwake(true);
});
