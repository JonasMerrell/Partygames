// Tread Carefully: pixel art. Everything is drawn at 1 logical pixel per pixel
// on a small canvas, then scaled up with crisp edges.
import { COLS, ROWS, TILE, FLOOR, WALL, CRATE, LAVA, BUSH, PAD, LAMP } from './maps.js';

export const W = COLS * TILE, H = ROWS * TILE;

// ---------- colours ----------
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;
export const shade = (c, k) => rgb(hex(c).map((v) => (k < 0 ? v * (1 + k) : v + (255 - v) * k)));

// 12 tank colours, picked to read on every arena
export const TANK_COLORS = ['#e8483b', '#3b82f6', '#f2c230', '#36c05a', '#e05cd0', '#ff8c2a', '#2ed3d3', '#f4f4f4', '#9b6cff', '#a3e635', '#ff6f91', '#8d6e63'];

// ---------- 8x8 icons for items (also used on phones) ----------
export const ICONS = {
  shell: ['........', '..###...', '.#####..', '.######.', '.######.', '.#####..', '..###...', '........'],
  rocket: ['........', '.....##.', '....###.', '...####.', '..####..', '.###....', '##.#....', '#...#...'],
  spread: ['#......#', '.#....#.', '..#..#..', '........', '...##...', '...##...', '...##...', '........'],
  laser: ['#.......', '.#......', '..#...#.', '...#.#..', '....#...', '...#....', '..#.....', '.#......'],
  homing: ['..####..', '.#....#.', '#..##..#', '#.####.#', '#.####.#', '#..##..#', '.#....#.', '..####..'],
  blaster: ['#..#..#.', '.#.#.#..', '..###...', '#######.', '..###...', '.#.#.#..', '#..#..#.', '........'],
  mines: ['...##...', '..####..', '.##..##.', '##.##.##', '##.##.##', '.##..##.', '..####..', '...##...'],
  shield: ['.######.', '#......#', '#.####.#', '#.####.#', '#.####.#', '.#.##.#.', '..#..#..', '...##...'],
  speed: ['....##..', '...##...', '..##....', '.######.', '....##..', '...##...', '..##....', '.##.....'],
  rapid: ['##.##.##', '##.##.##', '........', '##.##.##', '##.##.##', '........', '##.##.##', '##.##.##'],
  cloak: ['..####..', '.#....#.', '#.#..#.#', '#......#', '#.####.#', '#......#', '#.#..#.#', '##.##.##'],
  ghost: ['..####..', '.######.', '##.##.##', '########', '########', '########', '#.##.##.', '........'],
};
export const ITEM_COLORS = {
  rocket: '#e8483b', spread: '#f2a020', laser: '#2ed3d3', homing: '#9b6cff', blaster: '#ff6a1a', mines: '#555b66',
  shield: '#22b8a8', speed: '#3b82f6', rapid: '#e0a800', cloak: '#6b7280', ghost: '#a78bfa', shell: '#4b5563',
};

export function iconCanvas(kind, scale = 4, bg = true) {
  const c = document.createElement('canvas');
  const n = bg ? 12 : 8;
  c.width = n * scale; c.height = n * scale;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (bg) {
    g.fillStyle = '#15151c'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = ITEM_COLORS[kind] || '#666'; g.fillRect(scale, scale, 10 * scale, 10 * scale);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(scale, scale, 10 * scale, scale);
  }
  g.fillStyle = '#fff';
  const o = bg ? 2 : 0;
  (ICONS[kind] || ICONS.shell).forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.fillRect((x + o) * scale, (y + o) * scale, scale, scale); }));
  return c;
}

// ---------- themes ----------
export const THEMES = {
  meadow: { floor: ['#5a9a3a', '#4e8a32', '#6aaa44'], wall: ['#8a8a96', '#6a6a76', '#a8a8b4', '#4a4a54'], crate: ['#b0703a', '#8a5228', '#d08a4a'], ui: '#2f6b1e' },
  frost: { floor: ['#e8f0f8', '#d4e2f0', '#ffffff'], wall: ['#6a7a9a', '#4a5a7a', '#8a9aba', '#2a3a5a'], crate: ['#8ad0f0', '#5aa8d8', '#c8f0ff'], ui: '#35507e' },
  magma: { floor: ['#3a2a2a', '#2e2020', '#463232'], wall: ['#2a2a36', '#1a1a22', '#4a4a5a', '#0a0a10'], crate: ['#7a3a2a', '#5a2a1a', '#ff7a20'], ui: '#7a2a12' },
  orbital: { floor: ['#4a5260', '#40485a', '#56606e'], wall: ['#2a3040', '#1a2030', '#5a6a80', '#10141c'], crate: ['#d0a030', '#a07a20', '#f0d060'], ui: '#253247' },
  night: { floor: ['#3a3a46', '#32323e', '#444452'], wall: ['#5a5a6a', '#3a3a48', '#7a7a8a', '#1a1a24'], crate: ['#a8804a', '#806038', '#c8a068'], ui: '#2a2a3a' },
  jungle: { floor: ['#6b5a3a', '#5e4e32', '#7a6844'], wall: ['#6a7a5a', '#4a5a3a', '#8a9a72', '#2a3422'], crate: ['#9a6a3a', '#734c26', '#c08a52'], ui: '#2f4a22' },
};

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Floor, walls, lava and pads: everything that doesn't change during a round.
export function buildStatic(map) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const P = THEMES[map.theme];
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const px = (x, y, col) => R(x | 0, y | 0, 1, 1, col);
  const rnd = rng(1234 + map.id.length * 77);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const X = x * TILE, Y = y * TILE;
    R(X, Y, TILE, TILE, P.floor[0]);
    for (let k = 0; k < 6; k++) px(X + rnd() * TILE, Y + rnd() * TILE, P.floor[rnd() < 0.5 ? 1 : 2]);
    if (map.theme === 'meadow' && rnd() < 0.18) { px(X + 5, Y + 6, '#7aba54'); px(X + 6, Y + 5, '#7aba54'); px(X + 7, Y + 6, '#7aba54'); }
    if (map.theme === 'meadow' && rnd() < 0.05) { px(X + 10, Y + 10, '#f4e04a'); px(X + 9, Y + 11, '#fff'); px(X + 11, Y + 11, '#fff'); }
    if (map.theme === 'orbital') { R(X, Y, TILE, 1, P.floor[1]); R(X, Y, 1, TILE, P.floor[1]); px(X + 2, Y + 2, '#6a7484'); px(X + 13, Y + 13, '#6a7484'); }
    if (map.theme === 'magma' && rnd() < 0.1) { const lx = X + 3 + (rnd() * 8 | 0), ly = Y + 4 + (rnd() * 8 | 0); R(lx, ly, 4, 1, '#ff5a10'); R(lx + 3, ly + 1, 3, 1, '#ffaa30'); }
    if (map.theme === 'night' && y === 7 && x % 2 === 0) R(X + 3, Y + 7, 10, 2, '#d8c040');
    if (map.theme === 'night' && rnd() < 0.08) R(X + 2 + (rnd() * 8 | 0), Y + 3 + (rnd() * 10 | 0), 3, 1, '#2a2a34');
    if (map.theme === 'frost' && rnd() < 0.12) R(X + 4, Y + 8, 6, 1, '#c0d4ea');
    if (map.theme === 'jungle' && rnd() < 0.2) { px(X + 4, Y + 9, '#4f8a2a'); px(X + 5, Y + 8, '#4f8a2a'); }
    if (map.theme === 'jungle' && rnd() < 0.12) R(X + 6, Y + 3, 2, 2, '#857350');
  }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const code = map.grid[y * COLS + x], X = x * TILE, Y = y * TILE;
    if (code === WALL) drawWall(g, X, Y, map.theme, P, x, y);
    if (code === LAMP) drawLamp(g, X, Y);
    if (code === PAD) drawPad(g, X, Y);
    if (code === LAVA) { R(X, Y, TILE, TILE, '#c02a08'); }
  }
  return c;
}

function drawWall(g, X, Y, theme, P, tx, ty) {
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const [a, b, cc, d] = P.wall;
  if (theme === 'meadow') {
    R(X, Y, TILE, TILE, a);
    for (let r = 0; r < 4; r++) { R(X, Y + r * 4 + 3, TILE, 1, b); const o = (r + tx) % 2 ? 8 : 0; R(X + o, Y + r * 4, 1, 3, b); }
    R(X, Y, TILE, 1, cc); R(X, Y + TILE - 1, TILE, 1, d);
  } else if (theme === 'frost') {
    R(X, Y, TILE, TILE, a); R(X, Y, TILE, 4, '#fff'); R(X + 1, Y + 4, TILE - 2, 1, '#e0ecf8');
    R(X + 3, Y + 5, 1, 1, '#fff'); R(X + 9, Y + 5, 1, 1, '#fff'); R(X, Y + TILE - 1, TILE, 1, d); R(X + 4, Y + 9, 3, 2, b); R(X + 10, Y + 11, 2, 2, b);
  } else if (theme === 'magma') {
    R(X, Y, TILE, TILE, a); R(X + 1, Y + 1, TILE - 2, TILE - 2, b); R(X + 2, Y + 2, 5, 5, cc); R(X + 9, Y + 8, 5, 6, cc); R(X, Y + TILE - 1, TILE, 1, d);
  } else if (theme === 'orbital') {
    R(X, Y, TILE, TILE, a); R(X + 1, Y + 1, TILE - 2, TILE - 2, b); R(X + 1, Y + 1, TILE - 2, 1, cc);
    for (let i = 0; i < TILE; i += 4) { R(X + i, Y + TILE - 4, 2, 3, '#e0b020'); R(X + i + 2, Y + TILE - 4, 2, 3, '#202020'); }
    R(X + 3, Y + 4, 1, 1, '#40e0ff'); R(X + 12, Y + 4, 1, 1, '#ff4060');
  } else if (theme === 'night') {
    R(X, Y, TILE, TILE, a); R(X, Y, TILE, 2, cc); R(X, Y + TILE - 2, TILE, 2, d);
    R(X + 2, Y + 5, 5, 4, (tx * 7 + ty * 3) % 4 ? '#ffd860' : b); R(X + 9, Y + 5, 5, 4, (tx * 5 + ty) % 3 ? b : '#ffd860');
  } else if (theme === 'jungle') {
    R(X, Y, TILE, TILE, a); R(X, Y, TILE, 1, cc); R(X, Y + TILE - 1, TILE, 1, d);
    R(X + 1, Y + 7, 6, 1, b); R(X + 9, Y + 7, 6, 1, b); R(X + 7, Y + 1, 1, 6, b); R(X + 3, Y + 8, 1, 7, b); R(X + 12, Y + 8, 1, 7, b);
    R(X + 2, Y + 2, 2, 1, '#5d9a34'); R(X + 11, Y + 11, 3, 1, '#5d9a34'); R(X + 12, Y + 10, 1, 1, '#5d9a34');
  }
}

function drawLamp(g, X, Y) {
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(X + 3, Y + 3, 10, 10, '#2a2a34'); R(X + 4, Y + 4, 8, 8, '#4a4a58'); R(X + 6, Y + 6, 4, 4, '#ffe680'); R(X + 7, Y + 7, 2, 2, '#fff');
}

function drawPad(g, X, Y) {
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(X + 1, Y + 1, 14, 14, '#1a2030'); R(X + 2, Y + 2, 12, 12, '#2a3a55');
  R(X + 4, Y + 4, 8, 8, '#20e0ff'); R(X + 5, Y + 5, 6, 6, '#1a2030'); R(X + 7, Y + 7, 2, 2, '#a0f8ff');
}

function drawCrate(g, X, Y, theme, hp) {
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const [a, b, cc] = THEMES[theme].crate;
  if (theme === 'frost') {
    R(X + 1, Y + 1, 14, 14, a); R(X + 1, Y + 1, 14, 3, cc); R(X + 3, Y + 6, 2, 6, cc); R(X + 1, Y + 14, 14, 1, b);
  } else if (theme === 'magma') {
    R(X + 1, Y + 1, 14, 14, a); R(X + 1, Y + 1, 14, 1, b);
    for (const [i, j] of [[4, 3], [5, 4], [6, 5], [6, 6], [9, 7], [10, 8], [11, 9], [7, 10], [6, 11]]) R(X + i, Y + j, 1, 1, cc);
  } else if (theme === 'orbital') {
    R(X + 1, Y + 1, 14, 14, a); R(X + 1, Y + 1, 14, 1, cc); R(X + 1, Y + 14, 14, 1, b); R(X + 6, Y + 6, 4, 4, b);
    for (let i = 2; i < 14; i += 3) R(X + i, Y + i, 1, 1, b);
  } else if (theme === 'night') {
    R(X + 1, Y + 2, 14, 13, a); R(X + 1, Y + 2, 14, 2, cc); R(X + 7, Y + 2, 2, 13, '#c8b088'); R(X + 1, Y + 14, 14, 1, b);
  } else {
    R(X + 1, Y + 1, 14, 14, a); R(X + 1, Y + 1, 14, 1, cc); R(X + 1, Y + 14, 14, 1, b); R(X + 1, Y + 5, 14, 1, b); R(X + 1, Y + 10, 14, 1, b);
    R(X + 1, Y + 1, 1, 14, b); R(X + 14, Y + 1, 1, 14, b);
  }
  if (hp === 1) { // cracked
    for (const [i, j] of [[3, 2], [4, 3], [4, 4], [5, 5], [6, 5], [7, 6], [7, 7], [8, 8], [10, 9], [9, 9], [11, 10], [11, 11]]) R(X + i, Y + j, 1, 1, '#1a1410');
  }
}

function drawBush(g, X, Y, t) {
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(X, Y + 2, TILE, TILE - 3, '#2f7a24'); R(X + 2, Y, TILE - 4, TILE, '#2f7a24');
  R(X + 1, Y + 3, 5, 4, '#3f9a2e'); R(X + 8, Y + 2, 5, 4, '#3f9a2e'); R(X + 4, Y + 8, 6, 4, '#3f9a2e');
  R(X + 2, Y + 3, 2, 1, '#6cc04a'); R(X + 9, Y + 2, 2, 1, '#6cc04a'); R(X + 5, Y + 8, 2, 1, '#6cc04a');
  R(X + 3, Y + 12, 3, 2, '#205a18'); R(X + 10, Y + 10, 3, 3, '#205a18');
  const sway = Math.sin(t * 2 + X * 0.1) > 0.6 ? 1 : 0;
  R(X + 12 + sway, Y + 6, 2, 1, '#6cc04a');
}

// ---------- tanks ----------
const SPRITE = [
  'TTTTTTTTTTTTTT',
  'tTtTtTtTtTtTtT',
  '.BBBBBBBBBBBB.',
  '.BHHHHHHHHHHB.',
  '.BHBBBBBBBBBB.',
  '.BBBBBBBBBBBB.',
  '.BBBBBBBBBBBB.',
  '.BBBBBBBBBBDB.',
  '.BDDDDDDDDDDB.',
  '.DDDDDDDDDDDD.',
  'tTtTtTtTtTtTtT',
  'TTTTTTTTTTTTTT',
];
const ROT = 32;
const spriteCache = new Map();
function tankFrames(color) {
  if (spriteCache.has(color)) return spriteCache.get(color);
  const pal = { T: [26, 26, 30], t: [70, 70, 78], B: hex(color), D: hex(color).map((v) => v * 0.62), H: hex(color).map((v) => v + (255 - v) * 0.45) };
  const frames = [];
  for (let k = 0; k < ROT; k++) {
    const a = (k / ROT) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const c = document.createElement('canvas'); c.width = 18; c.height = 18;
    const g = c.getContext('2d'); const img = g.createImageData(18, 18);
    for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) {
      const dx = x + 0.5 - 9, dy = y + 0.5 - 9;
      const sx = Math.floor(dx * ca + dy * sa + 7), sy = Math.floor(-dx * sa + dy * ca + 6);
      if (sx < 0 || sy < 0 || sx >= 14 || sy >= 12) continue;
      const ch = SPRITE[sy][sx]; const col = pal[ch]; if (!col) continue;
      const i = (y * 18 + x) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    frames.push(c);
  }
  spriteCache.set(color, frames);
  return frames;
}

function drawTank(g, t, time) {
  const frames = tankFrames(t.color);
  const k = ((Math.round((t.body / (Math.PI * 2)) * ROT) % ROT) + ROT) % ROT;
  let alpha = 1;
  if (t.power === 'cloak') alpha = 0.14 + 0.06 * Math.sin(time * 12);
  else if (t.power === 'ghost') alpha = 0.55;
  if (t.prot > 0 && Math.floor(time * 10) % 2) alpha *= 0.35;
  g.globalAlpha = alpha;
  const x = Math.round(t.x), y = Math.round(t.y);
  g.drawImage(frames[k], x - 9, y - 9);
  // turret: hub plus a pixel barrel
  const dark = shade(t.color, -0.45), light = shade(t.color, 0.35);
  const ca = Math.cos(t.aim), sa = Math.sin(t.aim);
  g.fillStyle = '#1a1a1e';
  for (let i = 3; i <= 10; i++) g.fillRect(Math.round(x + ca * i - 0.5) - 1, Math.round(y + sa * i - 0.5) - 1, 2, 2);
  g.fillStyle = dark; g.fillRect(x - 3, y - 3, 6, 6);
  g.fillStyle = t.color; g.fillRect(x - 2, y - 2, 4, 4);
  g.fillStyle = light; g.fillRect(x - 2, y - 2, 2, 1);
  g.globalAlpha = 1;
  if (t.shield) {
    g.fillStyle = Math.floor(time * 6) % 2 ? '#7ff6ff' : '#2ed3d3';
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2 + time; g.fillRect(Math.round(x + Math.cos(a) * 11), Math.round(y + Math.sin(a) * 11), 1, 1); }
  }
}

// ---------- the frame ----------
export function createRenderer(map, opts = {}) {
  const base = buildStatic(map);
  const decals = document.createElement('canvas'); decals.width = W; decals.height = H;
  const dg = decals.getContext('2d');
  const dark = document.createElement('canvas'); dark.width = W; dark.height = H;
  const kg = dark.getContext('2d');
  return {
    decal(ev) {
      if (ev.type === 'tread') {
        dg.fillStyle = map.theme === 'frost' ? 'rgba(120,150,190,.25)' : 'rgba(0,0,0,.12)';
        const ca = Math.cos(ev.a + Math.PI / 2), sa = Math.sin(ev.a + Math.PI / 2);
        dg.fillRect(Math.round(ev.x + ca * 5), Math.round(ev.y + sa * 5), 2, 2);
        dg.fillRect(Math.round(ev.x - ca * 5), Math.round(ev.y - sa * 5), 2, 2);
      }
      if (ev.type === 'scorch') {
        dg.fillStyle = 'rgba(20,10,5,.35)';
        for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28, r = Math.random() * ev.r * 0.7; dg.fillRect(Math.round(ev.x + Math.cos(a) * r), Math.round(ev.y + Math.sin(a) * r), 2, 2); }
      }
    },
    draw(g, s, time) {
      g.imageSmoothingEnabled = false;
      g.drawImage(base, 0, 0);
      const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
      // lava shimmer
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        if (s.map.grid[i] !== LAVA) continue;
        const X = x * TILE, Y = y * TILE;
        R(X, Y, TILE, TILE, '#c02a08');
        for (let k = 0; k < 5; k++) {
          const ph = (time * 0.8 + k * 0.37 + x * 0.13 + y * 0.29) % 1;
          R(X + ((k * 5 + x * 3) % 13), Y + Math.floor(ph * 15), 3, 1, k % 2 ? '#ff7a10' : '#ffc040');
        }
        if (s.map.grid[i - COLS] !== LAVA) R(X, Y, TILE, 2, '#4a1a10');
      }
      g.drawImage(decals, 0, 0);
      // crates
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        if (s.map.grid[i] === CRATE) drawCrate(g, x * TILE, y * TILE, s.map.theme, s.map.crateHp[i]);
      }
      // hill
      if (s.hill) {
        const h = s.hill, owner = s.tanks.find((t) => t.id === h.owner);
        const col = owner ? owner.color : h.owner === 'contested' ? '#ffffff' : '#ffe14a';
        g.globalAlpha = 0.22 + 0.08 * Math.sin(time * 4);
        R(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2, col);
        g.globalAlpha = 1;
        const on = Math.floor(time * 8) % 2;
        for (let i = 0; i < h.r * 2; i += 4) {
          R(h.x - h.r + i + on * 2, h.y - h.r, 2, 1, col); R(h.x - h.r + i + on * 2, h.y + h.r - 1, 2, 1, col);
          R(h.x - h.r, h.y - h.r + i + on * 2, 1, 2, col); R(h.x + h.r - 1, h.y - h.r + i + on * 2, 1, 2, col);
        }
      }
      // wrecks
      for (const w of s.wrecks || []) {
        const fr = tankFrames('#3a3a3a'); const k = ((Math.round((w.a / (Math.PI * 2)) * ROT) % ROT) + ROT) % ROT;
        g.globalAlpha = 0.75; g.drawImage(fr[k], Math.round(w.x) - 9, Math.round(w.y) - 9); g.globalAlpha = 1;
        R(Math.round(w.x) - 1, Math.round(w.y) - 1, 3, 3, '#1a1a1a');
      }
      // items
      for (const it of s.items) {
        if (it.t > 18 && Math.floor(it.t * 6) % 2) continue;
        const bob = Math.round(Math.sin(it.t * 4) * 1);
        const X = Math.round(it.x) - 6, Y = Math.round(it.y) - 6 + bob;
        R(X, Y, 12, 12, '#15151c'); R(X + 1, Y + 1, 10, 10, ITEM_COLORS[it.kind]); R(X + 1, Y + 1, 10, 1, 'rgba(255,255,255,.35)');
        g.fillStyle = '#fff';
        ICONS[it.kind].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') g.fillRect(X + 2 + i, Y + 2 + j, 1, 1); }));
      }
      // mines
      for (const mn of s.mines) {
        const X = Math.round(mn.x), Y = Math.round(mn.y);
        R(X - 3, Y - 3, 7, 7, '#1a1a1e'); R(X - 2, Y - 2, 5, 5, '#3a3a42'); R(X - 3, Y, 7, 1, mn.color); R(X, Y - 3, 1, 7, mn.color);
        const rate = mn.t > mn.fuse - 3 ? 10 : 3;
        R(X - 1, Y - 1, 3, 3, Math.floor(mn.t * rate) % 2 ? '#ff2a2a' : '#5a1010');
      }
      // aim guides for human tanks
      for (const t of s.tanks) {
        if (!t.alive || t.cpu || t.power === 'cloak') continue;
        g.fillStyle = t.color;
        for (let d = 14; d < 40; d += 5) g.fillRect(Math.round(t.x + Math.cos(t.aim) * d), Math.round(t.y + Math.sin(t.aim) * d), 1, 1);
      }
      // tanks
      for (const t of s.tanks) if (t.alive) drawTank(g, t, time);
      // shells
      for (const sh of s.shells) {
        const X = Math.round(sh.x), Y = Math.round(sh.y);
        if (sh.kind === 'rocket') { R(X - 2, Y - 1, 4, 3, '#ffeedd'); R(X - 1, Y - 1, 2, 3, '#e8483b'); }
        else if (sh.kind === 'homing') { R(X - 1, Y - 1, 3, 3, '#c4a8ff'); R(X, Y, 1, 1, '#fff'); }
        else if (sh.kind === 'blaster') { R(X - 2, Y - 2, 4, 4, Math.floor(time * 16) % 2 ? '#ff6a1a' : '#ffd040'); }
        else { R(X - 1, Y - 1, 3, 3, '#16161a'); R(X - 1, Y - 1, 1, 1, '#d8d8e0'); }
      }
      // beams
      for (const b of s.beams) {
        g.globalAlpha = 1 - b.t / 0.35;
        for (let i = 0; i < b.pts.length - 1; i++) {
          const p = b.pts[i], q = b.pts[i + 1], n = Math.max(1, Math.hypot(q.x - p.x, q.y - p.y));
          for (let k = 0; k <= n; k++) {
            const x = Math.round(p.x + (q.x - p.x) * k / n), y = Math.round(p.y + (q.y - p.y) * k / n);
            R(x - 1, y - 1, 3, 3, b.color); R(x, y, 1, 1, '#ffffff');
          }
        }
        g.globalAlpha = 1;
      }
      // effects
      for (const f of s.fx) {
        const k = f.t / f.life, X = Math.round(f.x), Y = Math.round(f.y);
        if (f.type === 'flash') { R(X - 1, Y - 1, 3, 3, '#fff6a0'); }
        else if (f.type === 'puff') { const r = 1 + Math.round(k * 4); R(X - r, Y, 1, 1, '#ddd'); R(X + r, Y, 1, 1, '#ddd'); R(X, Y - r, 1, 1, '#ddd'); R(X, Y + r, 1, 1, '#ddd'); }
        else if (f.type === 'smoke') { g.globalAlpha = 1 - k; R(X - 1, Y - 1, 2, 2, '#b8b8c0'); g.globalAlpha = 1; }
        else if (f.type === 'boom') {
          const r = Math.round(f.r * Math.min(1, k * 2.5));
          g.globalAlpha = 1 - k * 0.8;
          pixelDisc(g, X, Y, r, k < 0.3 ? '#fff6c0' : k < 0.6 ? '#ffb020' : '#7a7a80');
          if (k < 0.6) pixelDisc(g, X, Y, Math.round(r * 0.55), '#ff5a10');
          g.globalAlpha = 1;
        } else if (f.type === 'debris') {
          for (let i = 0; i < 8; i++) { const a = i * 0.8, d = k * 14; R(Math.round(X + Math.cos(a) * d), Math.round(Y + Math.sin(a) * d + k * k * 8), 2, 2, i % 2 ? '#8a5228' : '#d08a4a'); }
        } else if (f.type === 'tele') { const r = Math.round(3 + k * 10); ring(g, X, Y, r, '#7ff6ff'); }
        else if (f.type === 'pickup') { for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 3, d = 4 + k * 10; R(Math.round(X + Math.cos(a) * d), Math.round(Y + Math.sin(a) * d), 1, 1, '#fff'); } }
        else if (f.type === 'shieldpop') ring(g, X, Y, Math.round(10 + k * 8), '#7ff6ff');
      }
      // bushes on top of tanks
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (s.map.grid[y * COLS + x] === BUSH) drawBush(g, x * TILE, y * TILE, time);
      // darkness
      if (s.map.dark) {
        kg.globalCompositeOperation = 'source-over';
        kg.clearRect(0, 0, W, H);
        kg.fillStyle = 'rgba(6,6,22,0.86)'; kg.fillRect(0, 0, W, H);
        kg.globalCompositeOperation = 'destination-out';
        const light = (x, y, r) => { const gr = kg.createRadialGradient(x, y, r * 0.3, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); kg.fillStyle = gr; kg.fillRect(x - r, y - r, r * 2, r * 2); };
        for (const l of s.map.lamps) light(l.x, l.y, 62);
        for (const t of s.tanks) if (t.alive && t.power !== 'cloak') { light(t.x, t.y, 26); light(t.x + Math.cos(t.aim) * 30, t.y + Math.sin(t.aim) * 30, 26); }
        for (const sh of s.shells) light(sh.x, sh.y, 9);
        for (const f of s.fx) if (f.type === 'boom') light(f.x, f.y, f.r * 2.2);
        for (const b of s.beams) for (const p of b.pts) light(p.x, p.y, 20);
        for (const it of s.items) light(it.x, it.y, 12);
        for (const mn of s.mines) light(mn.x, mn.y, 7);
        if (s.hill) light(s.hill.x, s.hill.y, 34);
        g.drawImage(dark, 0, 0);
      }
    },
  };
}

function pixelDisc(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
}
function ring(g, cx, cy, r, col) {
  g.fillStyle = col;
  const n = Math.max(8, r * 6);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
}

// A small preview of an arena (setup screen).
export function mapPreview(map, scale = 1) {
  const st = buildStatic(map);
  const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(st, 0, 0, c.width, c.height);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const code = map.grid[y * COLS + x];
    if (code === CRATE) { const tmp = document.createElement('canvas'); tmp.width = TILE; tmp.height = TILE; drawCrate(tmp.getContext('2d'), 0, 0, map.theme, 2); g.drawImage(tmp, x * TILE * scale, y * TILE * scale, TILE * scale, TILE * scale); }
    if (code === BUSH) { const tmp = document.createElement('canvas'); tmp.width = TILE; tmp.height = TILE; drawBush(tmp.getContext('2d'), 0, 0, 0); g.drawImage(tmp, x * TILE * scale, y * TILE * scale, TILE * scale, TILE * scale); }
  }
  if (map.dark) { g.fillStyle = 'rgba(6,6,22,.45)'; g.fillRect(0, 0, c.width, c.height); }
  return c;
}

// A tank portrait for phones and the scoreboard.
export function tankIcon(color, scale = 3) {
  const fr = tankFrames(color)[ROT * 3 / 4];
  const c = document.createElement('canvas'); c.width = 18 * scale; c.height = 18 * scale;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(fr, 0, 0, c.width, c.height);
  const x = 9 * scale, y = 9 * scale;
  g.fillStyle = '#1a1a1e'; g.fillRect(x - scale, y - 10 * scale, 2 * scale, 8 * scale);
  g.fillStyle = shade(color, -0.45); g.fillRect(x - 3 * scale, y - 3 * scale, 6 * scale, 6 * scale);
  g.fillStyle = color; g.fillRect(x - 2 * scale, y - 2 * scale, 4 * scale, 4 * scale);
  return c;
}
