// Shared by the TV (host.js) and the phones (player.js).

export const TEAMS = {
  sun: { name: 'Team Sun', short: 'Sun', color: '#ffb547' },
  moon: { name: 'Team Moon', short: 'Moon', color: '#7fc8ff' },
};

// ---------- art ----------
// Small inline SVGs, so the game needs no image files.
export function art(h, kind) {
  const svg = {
    sun: `<svg viewBox="0 0 100 100"><g fill="none" stroke="#fff6d8" stroke-width="5" stroke-linecap="round">${
      Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; const c = Math.cos(a), s = Math.sin(a);
        return `<line x1="${50 + c * 30}" y1="${50 + s * 30}" x2="${50 + c * 42}" y2="${50 + s * 42}"/>`; }).join('')
    }</g><circle cx="50" cy="50" r="21" fill="#fff6d8"/></svg>`,
    moon: `<svg viewBox="0 0 100 100"><path d="M62 14a38 38 0 1 0 24 58A32 32 0 0 1 62 14z" fill="#eaf6ff"/><circle cx="44" cy="58" r="5" fill="#bfe0ff"/><circle cx="56" cy="74" r="3.5" fill="#bfe0ff"/></svg>`,
    dust: `<svg viewBox="0 0 100 100" fill="#d8d2ee"><circle cx="30" cy="40" r="4"/><circle cx="62" cy="30" r="3"/><circle cx="50" cy="62" r="5"/><circle cx="74" cy="66" r="3"/><circle cx="26" cy="72" r="2.5"/></svg>`,
    hole: `<svg viewBox="0 0 100 100"><defs><radialGradient id="bh" r=".5"><stop offset=".45" stop-color="#000"/><stop offset=".62" stop-color="#c77dff"/><stop offset=".8" stop-color="#ff7d5d" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="50" r="48" fill="url(#bh)"/><ellipse cx="50" cy="50" rx="46" ry="9" fill="none" stroke="#ffd2a8" stroke-width="3" opacity=".8"/></svg>`,
  }[kind];
  const el = h('span.sc-svg');
  el.innerHTML = svg || '';
  return el;
}
export const emblem = (h, t) => art(h, t);

