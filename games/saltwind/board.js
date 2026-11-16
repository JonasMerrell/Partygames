// Draws the islands as SVG. Shared by the TV (host.js) and the phones (player.js).
import { buildGraph, hexXY, TILE_INFO, RES_INFO } from './rules.js';

const NS = 'http://www.w3.org/2000/svg';
export const S = 50; // pixels per hex radius in viewBox units

export const TILE_COLORS = {
  grove:   ['#3fae5a', '#1f7a3c'],
  reef:    ['#ff8f7a', '#d9534f'],
  lagoon:  ['#4fd1d9', '#1f8fa6'],
  flats:   ['#f3ead2', '#c9b98d'],
  volcano: ['#7b6f8c', '#463d57'],
  crater:  ['#8a7a66', '#5b4d3d'],
};
const TILE_ICON = { grove: '🌴', reef: '🪸', lagoon: '🐟', flats: '🧂', volcano: '🌋', crater: '♨️' };

function el(tag, attrs = {}, ...kids) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
}

/** Load the game's stylesheet once. */
export function useStyle(url) {
  if (document.querySelector('link[data-sw]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = url; l.dataset.sw = '1';
  document.head.append(l);
}

const pips = (n) => (n ? 6 - Math.abs(7 - n) : 0);
const graphCache = new WeakMap();
export function graphOf(state) {
  let g = graphCache.get(state.tiles);
  if (!g) { g = buildGraph(state.tiles); graphCache.set(state.tiles, g); }
  return g;
}

/**
 * Render the board.
 * opts.pick: { verts: [ids], edges: [ids], tiles: [ids], kind } spots to highlight and make tappable
 * opts.selected: { type: 'v'|'e'|'t', id }
 * opts.onPick(type, id)
 * opts.colors: Map(pid -> colour)
 */
export function drawBoard(state, opts = {}) {
  const g = graphOf(state);
  const colors = opts.colors || new Map(state.players.map((p) => [p.id, p.color]));
  const xs = g.verts.map((v) => v.x * S), ys = g.verts.map((v) => v.y * S);
  const pad = S * 1.25;
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad, hgt = Math.max(...ys) - minY + pad;
  const svg = el('svg', { viewBox: `${minX} ${minY} ${w} ${hgt}`, class: 'sw-board', preserveAspectRatio: 'xMidYMid meet' });

  const defs = el('defs');
  for (const [k, [a, b]] of Object.entries(TILE_COLORS)) {
    defs.append(el('radialGradient', { id: `sw-g-${k}`, cx: '50%', cy: '35%', r: '75%' },
      el('stop', { offset: '0%', 'stop-color': a }), el('stop', { offset: '100%', 'stop-color': b })));
  }
  defs.append(el('pattern', { id: 'sw-waves', width: 60, height: 30, patternUnits: 'userSpaceOnUse' },
    el('path', { d: 'M0 15 Q15 5 30 15 T60 15', fill: 'none', stroke: 'rgba(255,255,255,.06)', 'stroke-width': 2 })));
  defs.append(el('filter', { id: 'sw-shadow', x: '-20%', y: '-20%', width: '140%', height: '140%' },
    el('feDropShadow', { dx: 0, dy: 2, stdDeviation: 2, 'flood-color': '#000', 'flood-opacity': .55 })));
  svg.append(defs);
  svg.append(el('rect', { x: minX, y: minY, width: w, height: hgt, fill: 'url(#sw-waves)' }));

  const corners = (q, r, k) => {
    const [cx, cy] = hexXY(q, r);
    return Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 180 * (60 * i - 90);
      return `${(cx + Math.cos(a) * k) * S},${(cy + Math.sin(a) * k) * S}`;
    }).join(' ');
  };

  // Shallows and beaches under the land.
  const shore = el('g');
  for (const t of state.tiles) shore.append(el('polygon', { points: corners(t.q, t.r, 1.28), fill: '#2f8f9d', opacity: .35 }));
  for (const t of state.tiles) shore.append(el('polygon', { points: corners(t.q, t.r, 1.1), fill: '#e8d5a0' }));
  svg.append(shore);

  // Tiles.
  const pickT = new Set(opts.pick?.tiles || []);
  const tiles = el('g');
  state.tiles.forEach((t, i) => {
    const [cx, cy] = hexXY(t.q, t.r).map((v) => v * S);
    const sel = opts.selected?.type === 't' && opts.selected.id === i;
    const grp = el('g', {
      class: 'sw-tile' + (pickT.has(i) ? ' sw-pick' : '') + (sel ? ' sw-sel' : ''),
      onclick: pickT.has(i) ? () => opts.onPick?.('t', i) : null,
    });
    grp.append(el('polygon', { points: corners(t.q, t.r, 0.96), fill: `url(#sw-g-${t.kind})`, stroke: 'rgba(0,0,0,.25)', 'stroke-width': 2 }));
    grp.append(el('text', { x: cx, y: cy - S * 0.42, 'font-size': S * 0.42, 'text-anchor': 'middle', 'dominant-baseline': 'central', opacity: .9 }, TILE_ICON[t.kind]));
    if (t.num) {
      const hot = t.num === 6 || t.num === 8;
      grp.append(el('circle', { cx, cy: cy + S * 0.1, r: S * 0.3, fill: '#fff8e7', stroke: '#5b4d3d', 'stroke-width': 1.5, filter: 'url(#sw-shadow)' }));
      grp.append(el('text', { x: cx, y: cy + S * 0.07, 'font-size': S * 0.3, 'font-weight': 900, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: hot ? '#d62f2f' : '#2b2233' }, t.num));
      const k = pips(t.num);
      for (let j = 0; j < k; j++) grp.append(el('circle', { cx: cx + (j - (k - 1) / 2) * S * 0.07, cy: cy + S * 0.3, r: S * 0.025, fill: hot ? '#d62f2f' : '#2b2233' }));
    }
    if (pickT.has(i)) grp.append(el('polygon', { points: corners(t.q, t.r, 0.9), fill: 'rgba(255,255,255,.12)', stroke: sel ? '#fff' : 'rgba(255,255,255,.7)', 'stroke-width': sel ? 6 : 3, 'stroke-dasharray': sel ? null : '8 6', class: 'sw-hl' }));
    tiles.append(grp);
  });
  svg.append(tiles);

  // Harbours.
  const hb = el('g');
  for (const h of state.harbors) {
    const e = g.edges[h.edge];
    const t = state.tiles[e.tiles[0]];
    const [tx, ty] = hexXY(t.q, t.r);
    const a = g.verts[e.a], b = g.verts[e.b];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const ox = (mx - tx) * 0.62, oy = (my - ty) * 0.62;
    const px = (mx + ox) * S, py = (my + oy) * S;
    for (const v of [a, b]) hb.append(el('line', { x1: v.x * S, y1: v.y * S, x2: px, y2: py, stroke: '#a67c52', 'stroke-width': 5, 'stroke-linecap': 'round' }));
    hb.append(el('circle', { cx: px, cy: py, r: S * 0.32, fill: '#123a4a', stroke: '#e8d5a0', 'stroke-width': 2.5 }));
    if (h.type === 'any') {
      hb.append(el('text', { x: px, y: py, 'font-size': S * 0.24, 'font-weight': 900, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff' }, '3:1'));
    } else {
      hb.append(el('text', { x: px, y: py - S * 0.09, 'font-size': S * 0.22, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, RES_INFO[h.type].icon));
      hb.append(el('text', { x: px, y: py + S * 0.15, 'font-size': S * 0.17, 'font-weight': 900, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff' }, '2:1'));
    }
  }
  svg.append(hb);

  // The squall.
  if (state.squall != null && state.squall >= 0) {
    const t = state.tiles[state.squall];
    const [cx, cy] = hexXY(t.q, t.r).map((v) => v * S);
    svg.append(el('g', { class: 'sw-squall', 'pointer-events': 'none' },
      el('circle', { cx, cy, r: S * 0.7, fill: 'rgba(20,20,40,.55)' }),
      el('text', { x: cx, y: cy, 'font-size': S * 0.8, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '⛈️')));
  }

  // Bridges.
  const pickE = new Set(opts.pick?.edges || []);
  const br = el('g');
  g.edges.forEach((e, i) => {
    const a = g.verts[e.a], b = g.verts[e.b];
    const line = (attrs) => el('line', { x1: a.x * S, y1: a.y * S, x2: b.x * S, y2: b.y * S, 'stroke-linecap': 'round', ...attrs });
    const owner = state.edges[i];
    if (owner != null) {
      br.append(line({ stroke: '#1b1424', 'stroke-width': 13 }));
      br.append(line({ stroke: colors.get(owner), 'stroke-width': 8, 'stroke-dasharray': '6 3' }));
    } else if (pickE.has(i)) {
      const sel = opts.selected?.type === 'e' && opts.selected.id === i;
      br.append(el('g', { class: 'sw-pick' + (sel ? ' sw-sel' : ''), onclick: () => opts.onPick?.('e', i) },
        line({ stroke: 'transparent', 'stroke-width': 26 }),
        line({ stroke: sel ? '#fff' : 'rgba(255,255,255,.75)', 'stroke-width': sel ? 10 : 6, 'stroke-dasharray': sel ? null : '4 6', class: 'sw-hl' })));
    }
  });
  svg.append(br);

  // Huts and lighthouses.
  const pickV = new Set(opts.pick?.verts || []);
  const bl = el('g');
  g.verts.forEach((v, i) => {
    const x = v.x * S, y = v.y * S;
    const b = state.verts[i];
    if (b) {
      const c = colors.get(b.pid);
      const grp = el('g', { filter: 'url(#sw-shadow)' });
      if (b.kind === 'hut') {
        grp.append(el('path', { d: `M${x - 11} ${y + 9} L${x - 11} ${y - 2} L${x} ${y - 13} L${x + 11} ${y - 2} L${x + 11} ${y + 9} Z`, fill: c, stroke: '#1b1424', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
      } else {
        grp.append(el('path', { d: `M${x - 10} ${y + 13} L${x - 6} ${y - 10} L${x + 6} ${y - 10} L${x + 10} ${y + 13} Z`, fill: c, stroke: '#1b1424', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
        grp.append(el('rect', { x: x - 8, y: y - 19, width: 16, height: 9, rx: 2, fill: '#ffe680', stroke: '#1b1424', 'stroke-width': 2.5 }));
        grp.append(el('path', { d: `M${x - 7} ${y + 1} L${x + 7} ${y + 1}`, stroke: '#fff', 'stroke-width': 3, opacity: .8 }));
      }
      if (pickV.has(i)) {
        const sel = opts.selected?.type === 'v' && opts.selected.id === i;
        grp.append(el('circle', { cx: x, cy: y, r: 20, fill: 'transparent', stroke: sel ? '#fff' : 'rgba(255,255,255,.8)', 'stroke-width': sel ? 5 : 3, 'stroke-dasharray': sel ? null : '4 4', class: 'sw-hl' }));
        grp.classList.add('sw-pick');
        grp.addEventListener('click', () => opts.onPick?.('v', i));
      }
      bl.append(grp);
    } else if (pickV.has(i)) {
      const sel = opts.selected?.type === 'v' && opts.selected.id === i;
      bl.append(el('g', { class: 'sw-pick' + (sel ? ' sw-sel' : ''), onclick: () => opts.onPick?.('v', i) },
        el('circle', { cx: x, cy: y, r: 18, fill: 'transparent' }),
        el('circle', { cx: x, cy: y, r: sel ? 12 : 8, fill: sel ? '#fff' : 'rgba(255,255,255,.85)', stroke: '#1b1424', 'stroke-width': 2, class: 'sw-hl' })));
    }
  });
  svg.append(bl);
  return svg;
}

export const tileLabel = (state, i) => {
  const t = state.tiles[i];
  return `${TILE_INFO[t.kind].name}${t.num ? ' ' + t.num : ''}`;
};
