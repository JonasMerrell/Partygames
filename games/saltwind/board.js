// Draws the islands as SVG. Shared by the TV (host.js) and the phones (player.js).
// Overhauled to Papercraft & Cut-Paper Diorama style.
import { buildGraph, hexXY, TILE_INFO, RES_INFO } from './rules.js';

const NS = 'http://www.w3.org/2000/svg';
export const S = 50; // pixels per hex radius in viewBox units

export const TILE_COLORS = {
  grove:   ['#4cae68', '#25703f'], // forest cardstock
  reef:    ['#ff8870', '#d3433b'], // coral cardstock
  lagoon:  ['#4ecdc4', '#21918d'], // lagoon cyan cardstock
  flats:   ['#f4ebd0', '#c8b688'], // unbleached parchment cardstock
  volcano: ['#786b88', '#4b3d5d'], // slate basalt cardstock
  crater:  ['#9a8b75', '#635340'], // pumice cardstock
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
 * Render the board in Papercraft & Cut-Paper Diorama aesthetic.
 * opts.pick: { verts: [ids], edges: [ids], tiles: [ids], kind } spots to highlight and make tappable
 * opts.selected: { type: 'v'|'e'|'t', id }
 * opts.onPick(type, id)
 * opts.colors: Map(pid -> colour)
 */
export function drawBoard(state, opts = {}) {
  const g = graphOf(state);
  const colors = opts.colors || new Map(state.players.map((p) => [p.id, p.color]));
  const xs = g.verts.map((v) => v.x * S), ys = g.verts.map((v) => v.y * S);
  const pad = S * 1.35;
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad, hgt = Math.max(...ys) - minY + pad;
  const svg = el('svg', { viewBox: `${minX} ${minY} ${w} ${hgt}`, class: 'sw-board', preserveAspectRatio: 'xMidYMid meet' });

  const defs = el('defs');
  // Gradient fills for paper hexes
  for (const [k, [a, b]] of Object.entries(TILE_COLORS)) {
    defs.append(el('radialGradient', { id: `sw-g-${k}`, cx: '45%', cy: '35%', r: '75%' },
      el('stop', { offset: '0%', 'stop-color': a }),
      el('stop', { offset: '100%', 'stop-color': b })));
  }

  // Papercraft wave ripple pattern for ocean base
  defs.append(el('pattern', { id: 'sw-waves', width: 64, height: 32, patternUnits: 'userSpaceOnUse' },
    el('path', { d: 'M0 16 Q16 6 32 16 T64 16', fill: 'none', stroke: 'rgba(255,255,255,.07)', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
    el('path', { d: 'M16 28 Q24 22 32 28 T48 28', fill: 'none', stroke: 'rgba(255,255,255,.04)', 'stroke-width': 1.8 })));

  // SVG Filters for papercraft shadowbox depth
  defs.append(el('filter', { id: 'sw-paper-texture', x: '0%', y: '0%', width: '100%', height: '100%' },
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.04', numOctaves: '3', result: 'noise' }),
    el('feDiffuseLighting', { in: 'noise', 'lighting-color': '#fff', surfaceScale: '1.4', result: 'light' },
      el('feDistantLight', { azimuth: '55', elevation: '50' })),
    el('feBlend', { mode: 'multiply', in: 'SourceGraphic', in2: 'light' })));

  defs.append(el('filter', { id: 'sw-cardstock-shadow', x: '-20%', y: '-20%', width: '140%', height: '140%' },
    el('feDropShadow', { dx: 1, dy: 3.5, stdDeviation: 2.5, 'flood-color': '#061720', 'flood-opacity': .45 })));

  defs.append(el('filter', { id: 'sw-piece-shadow', x: '-30%', y: '-30%', width: '160%', height: '160%' },
    el('feDropShadow', { dx: 2, dy: 5, stdDeviation: 3.5, 'flood-color': '#04121a', 'flood-opacity': .55 })));

  defs.append(el('filter', { id: 'sw-bridge-shadow', x: '-20%', y: '-20%', width: '140%', height: '140%' },
    el('feDropShadow', { dx: 1, dy: 2.5, stdDeviation: 2, 'flood-color': '#04121a', 'flood-opacity': .45 })));

  // Lighthouse beacon light beam gradient
  defs.append(el('linearGradient', { id: 'sw-lantern-glow', x1: '0%', y1: '50%', x2: '100%', y2: '50%' },
    el('stop', { offset: '0%', 'stop-color': '#fff5a0', 'stop-opacity': .85 }),
    el('stop', { offset: '100%', 'stop-color': '#ffe066', 'stop-opacity': .0 })));

  svg.append(defs);

  // Ocean surface with wave lines
  svg.append(el('rect', { x: minX, y: minY, width: w, height: hgt, fill: 'url(#sw-waves)' }));

  const corners = (q, r, k) => {
    const [cx, cy] = hexXY(q, r);
    return Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 180 * (60 * i - 90);
      return `${((cx + Math.cos(a) * k) * S).toFixed(1)},${((cy + Math.sin(a) * k) * S).toFixed(1)}`;
    }).join(' ');
  };

  // Organic scalloped cut-paper wave rings along hex perimeter
  const scallopPath = (q, r, k, count = 3, depth = 0.04) => {
    const [cx, cy] = hexXY(q, r);
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      pts.push([ (cx + Math.cos(a) * k) * S, (cy + Math.sin(a) * k) * S ]);
    }
    let d = '';
    for (let i = 0; i < 6; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % 6];
      if (i === 0) d += `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}`;
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      for (let j = 0; j < count; j++) {
        const t1 = (j + 1) / count;
        const sub0 = [p0[0] + dx * (j / count), p0[1] + dy * (j / count)];
        const sub1 = [p0[0] + dx * t1, p0[1] + dy * t1];
        const mid = [(sub0[0] + sub1[0]) / 2 + nx * depth * S, (sub0[1] + sub1[1]) / 2 + ny * depth * S];
        d += ` Q${mid[0].toFixed(1)} ${mid[1].toFixed(1)} ${sub1[0].toFixed(1)} ${sub1[1].toFixed(1)}`;
      }
    }
    d += ' Z';
    return d;
  };

  // Layered cut-paper scalloped shorelines & reef shelves
  const shore = el('g', { class: 'sw-shorelines' });
  // Tier 1: Deep reef shelf
  for (const t of state.tiles) shore.append(el('path', { d: scallopPath(t.q, t.r, 1.34, 3, 0.045), fill: '#164e61', opacity: .45 }));
  // Tier 2: Turquoise wave shelf
  for (const t of state.tiles) shore.append(el('path', { d: scallopPath(t.q, t.r, 1.22, 3, 0.04), fill: '#2ba3b0', opacity: .55 }));
  // Tier 3: Crisp seafoam crest
  for (const t of state.tiles) shore.append(el('path', { d: scallopPath(t.q, t.r, 1.13, 3, 0.035), fill: '#e0f7fa', opacity: .8 }));
  // Tier 4: Sandcard beach edge with drop shadow
  for (const t of state.tiles) shore.append(el('polygon', { points: corners(t.q, t.r, 1.05), fill: '#e9d8a6', filter: 'url(#sw-cardstock-shadow)' }));
  svg.append(shore);

  // Layered Cardstock Hex Tiles
  const pickT = new Set(opts.pick?.tiles || []);
  const tiles = el('g', { class: 'sw-hex-tiles' });
  state.tiles.forEach((t, i) => {
    const [cx, cy] = hexXY(t.q, t.r).map((v) => v * S);
    const sel = opts.selected?.type === 't' && opts.selected.id === i;
    const grp = el('g', {
      class: 'sw-tile' + (pickT.has(i) ? ' sw-pick' : '') + (sel ? ' sw-sel' : ''),
      onclick: pickT.has(i) ? () => opts.onPick?.('t', i) : null,
    });

    // Outer beveled cardstock rim
    grp.append(el('polygon', { points: corners(t.q, t.r, 0.98), fill: '#f2e8d0', stroke: '#d9caa3', 'stroke-width': 1 }));
    // Inner landmass polygon with gradient and shadow
    grp.append(el('polygon', {
      points: corners(t.q, t.r, 0.94),
      fill: `url(#sw-g-${t.kind})`,
      stroke: 'rgba(0,0,0,.22)',
      'stroke-width': 1.5,
      filter: 'url(#sw-cardstock-shadow)',
    }));

    // Origami facet crease lines radiating from hex center to alternating vertices
    for (let vIdx = 0; vIdx < 6; vIdx += 2) {
      const a = Math.PI / 180 * (60 * vIdx - 90);
      const vx = cx + Math.cos(a) * 0.94 * S;
      const vy = cy + Math.sin(a) * 0.94 * S;
      grp.append(el('line', {
        x1: cx, y1: cy, x2: vx, y2: vy,
        stroke: 'rgba(255,255,255,0.28)',
        'stroke-width': 1.2,
        'stroke-linecap': 'round',
      }));
    }

    // Resource emblem
    grp.append(el('text', {
      x: cx, y: cy - S * 0.42,
      'font-size': S * 0.42,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      opacity: .95,
      class: 'sw-tile-icon',
    }, TILE_ICON[t.kind]));

    // Thick debossed cardboard number chit
    if (t.num) {
      const hot = t.num === 6 || t.num === 8;
      // Perforated stamp ring
      grp.append(el('circle', {
        cx, cy: cy + S * 0.1, r: S * 0.33,
        fill: 'none', stroke: '#cbb994', 'stroke-width': 1, 'stroke-dasharray': '2.5 1.5',
      }));
      // Debossed pressed cardstock base
      grp.append(el('circle', {
        cx, cy: cy + S * 0.1, r: S * 0.3,
        fill: '#faf5e8', stroke: '#8c7b64', 'stroke-width': 1.5,
        filter: 'url(#sw-piece-shadow)',
      }));
      // Serif numeral
      grp.append(el('text', {
        x: cx, y: cy + S * 0.08,
        'font-size': S * 0.3,
        'font-weight': 900,
        'font-family': 'Georgia, serif',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: hot ? '#c92a2a' : '#2b2233',
      }, t.num));
      // Punched indent pip dots
      const k = pips(t.num);
      for (let j = 0; j < k; j++) {
        grp.append(el('circle', {
          cx: cx + (j - (k - 1) / 2) * S * 0.07,
          cy: cy + S * 0.29,
          r: S * 0.026,
          fill: hot ? '#c92a2a' : '#2b2233',
        }));
      }
    }

    if (pickT.has(i)) {
      grp.append(el('polygon', {
        points: corners(t.q, t.r, 0.9),
        fill: 'rgba(255,255,255,.14)',
        stroke: sel ? '#fff' : 'rgba(255,255,255,.8)',
        'stroke-width': sel ? 6 : 3,
        'stroke-dasharray': sel ? null : '8 6',
        class: 'sw-hl',
      }));
    }
    tiles.append(grp);
  });
  svg.append(tiles);

  // Harbours: Wooden plank piers with wax seal badges
  const hb = el('g', { class: 'sw-harbours' });
  for (const h of state.harbors) {
    const e = g.edges[h.edge];
    const t = state.tiles[e.tiles[0]];
    const [tx, ty] = hexXY(t.q, t.r);
    const a = g.verts[e.a], b = g.verts[e.b];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const ox = (mx - tx) * 0.62, oy = (my - ty) * 0.62;
    const px = (mx + ox) * S, py = (my + oy) * S;

    // Wooden plank pier piles with woodgrain dash strokes
    for (const v of [a, b]) {
      hb.append(el('line', {
        x1: v.x * S, y1: v.y * S, x2: px, y2: py,
        stroke: '#4a3320', 'stroke-width': 7, 'stroke-linecap': 'round',
        filter: 'url(#sw-bridge-shadow)',
      }));
      hb.append(el('line', {
        x1: v.x * S, y1: v.y * S, x2: px, y2: py,
        stroke: '#a67c52', 'stroke-width': 4.5, 'stroke-dasharray': '5 3', 'stroke-linecap': 'round',
      }));
    }

    // Wax seal badge
    hb.append(el('circle', {
      cx: px, cy: py, r: S * 0.34,
      fill: '#123a4a', stroke: '#e8d5a0', 'stroke-width': 2.5,
      filter: 'url(#sw-piece-shadow)',
    }));
    if (h.type === 'any') {
      hb.append(el('text', {
        x: px, y: py,
        'font-size': S * 0.24, 'font-weight': 900, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff',
      }, '3:1'));
    } else {
      hb.append(el('text', {
        x: px, y: py - S * 0.09,
        'font-size': S * 0.22, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      }, RES_INFO[h.type].icon));
      hb.append(el('text', {
        x: px, y: py + S * 0.15,
        'font-size': S * 0.17, 'font-weight': 900, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff',
      }, '2:1'));
    }
  }
  svg.append(hb);

  // Cut-Paper Squall Marker (multi-layer storm cloud with lightning & paper droplets)
  if (state.squall != null && state.squall >= 0) {
    const t = state.tiles[state.squall];
    const [cx, cy] = hexXY(t.q, t.r).map((v) => v * S);
    const sq = el('g', { class: 'sw-squall', 'pointer-events': 'none', filter: 'url(#sw-piece-shadow)' });
    // Layered storm cloud lobes
    sq.append(el('circle', { cx: cx - S * 0.28, cy: cy - S * 0.08, r: S * 0.38, fill: '#222538' }));
    sq.append(el('circle', { cx: cx + S * 0.28, cy: cy - S * 0.08, r: S * 0.36, fill: '#2a2f45' }));
    sq.append(el('circle', { cx, cy: cy - S * 0.18, r: S * 0.44, fill: '#384358' }));
    // Dangling zigzag lightning cutout
    sq.append(el('polygon', {
      points: `${cx-3},${cy-8} ${cx+7},${cy-8} ${cx+1},${cy+6} ${cx+8},${cy+6} ${cx-5},${cy+22} ${cx-1},${cy+8} ${cx-7},${cy+8}`,
      fill: '#ffd84d', stroke: '#cfa01f', 'stroke-width': 1,
    }));
    // Paper raindrops
    sq.append(el('line', { x1: cx - S * 0.25, y1: cy + S * 0.25, x2: cx - S * 0.28, y2: cy + S * 0.45, stroke: '#8be9fd', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    sq.append(el('line', { x1: cx + S * 0.25, y1: cy + S * 0.25, x2: cx + S * 0.22, y2: cy + S * 0.45, stroke: '#8be9fd', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    svg.append(sq);
  }

  // Bridges: Wooden causeway with stitched player ribbon and brass eyelet rivets
  const pickE = new Set(opts.pick?.edges || []);
  const br = el('g', { class: 'sw-bridges' });
  g.edges.forEach((e, i) => {
    const a = g.verts[e.a], b = g.verts[e.b];
    const line = (attrs) => el('line', { x1: a.x * S, y1: a.y * S, x2: b.x * S, y2: b.y * S, 'stroke-linecap': 'round', ...attrs });
    const owner = state.edges[i];
    if (owner != null) {
      const c = colors.get(owner);
      // Wood plank base with drop shadow
      br.append(line({ stroke: '#3a2315', 'stroke-width': 13, filter: 'url(#sw-bridge-shadow)' }));
      // Stitched player-colored fabric ribbon
      br.append(line({ stroke: c, 'stroke-width': 8, 'stroke-dasharray': '6 3' }));
      // Brass eyelet rivets at causeway endpoints
      br.append(el('circle', { cx: a.x * S, cy: a.y * S, r: 3, fill: '#f1d279', stroke: '#5c4516', 'stroke-width': 1 }));
      br.append(el('circle', { cx: b.x * S, cy: b.y * S, r: 3, fill: '#f1d279', stroke: '#5c4516', 'stroke-width': 1 }));
    } else if (pickE.has(i)) {
      const sel = opts.selected?.type === 'e' && opts.selected.id === i;
      br.append(el('g', { class: 'sw-pick' + (sel ? ' sw-sel' : ''), onclick: () => opts.onPick?.('e', i) },
        line({ stroke: 'transparent', 'stroke-width': 26 }),
        line({ stroke: sel ? '#fff' : 'rgba(255,255,255,.8)', 'stroke-width': sel ? 10 : 6, 'stroke-dasharray': sel ? null : '4 6', class: 'sw-hl' })));
    }
  });
  svg.append(br);

  // Origami Huts & Faceted Lighthouses
  const pickV = new Set(opts.pick?.verts || []);
  const bl = el('g', { class: 'sw-buildings' });
  g.verts.forEach((v, i) => {
    const x = v.x * S, y = v.y * S;
    const b = state.verts[i];
    if (b) {
      const c = colors.get(b.pid) || '#3fd6c0';
      const grp = el('g', { filter: 'url(#sw-piece-shadow)', class: 'sw-placed-piece' });
      if (b.kind === 'hut') {
        // Folded 3D paper chalet diorama
        // Left roof facet (illuminated)
        grp.append(el('polygon', {
          points: `${x - 12},${y + 9} ${x},${y - 14} ${x},${y + 9}`,
          fill: `color-mix(in srgb, ${c} 82%, white)`,
          stroke: '#1b1424', 'stroke-width': 1.8, 'stroke-linejoin': 'round',
        }));
        // Right roof facet (shaded)
        grp.append(el('polygon', {
          points: `${x},${y - 14} ${x + 12},${y + 9} ${x},${y + 9}`,
          fill: `color-mix(in srgb, ${c} 72%, black)`,
          stroke: '#1b1424', 'stroke-width': 1.8, 'stroke-linejoin': 'round',
        }));
        // Front triangular paper gable
        grp.append(el('polygon', {
          points: `${x - 9},${y + 9} ${x},${y - 5} ${x + 9},${y + 9}`,
          fill: '#faf2de', stroke: '#1b1424', 'stroke-width': 1.6, 'stroke-linejoin': 'round',
        }));
        // Arched doorway cutout
        grp.append(el('path', {
          d: `M${x - 3} ${y + 9} L${x - 3} ${y + 4} Q${x} ${y + 1} ${x + 3} ${y + 4} L${x + 3} ${y + 9} Z`,
          fill: '#1b1424',
        }));
        // Mountain-fold crease line along ridge beam
        grp.append(el('line', {
          x1: x, y1: y - 14, x2: x, y2: y + 9,
          stroke: '#ffffff', 'stroke-width': 1.5, opacity: .9,
        }));
      } else {
        // Origami Faceted Lighthouse Watchtower
        // Left tower facet (illuminated)
        grp.append(el('polygon', {
          points: `${x - 10},${y + 13} ${x - 6},${y - 10} ${x},${y - 10} ${x},${y + 13}`,
          fill: `color-mix(in srgb, ${c} 85%, white)`,
          stroke: '#1b1424', 'stroke-width': 2, 'stroke-linejoin': 'round',
        }));
        // Right tower facet (shaded)
        grp.append(el('polygon', {
          points: `${x},${y - 10} ${x + 6},${y - 10} ${x + 10},${y + 13} ${x},${y + 13}`,
          fill: `color-mix(in srgb, ${c} 70%, black)`,
          stroke: '#1b1424', 'stroke-width': 2, 'stroke-linejoin': 'round',
        }));
        // Horizontal paper banding
        grp.append(el('path', {
          d: `M${x - 8} ${y + 2} L${x + 8} ${y + 2} M${x - 7} ${y - 4} L${x + 7} ${y - 4}`,
          stroke: '#fff', 'stroke-width': 2.5, opacity: .9,
        }));
        // Gallery platform
        grp.append(el('rect', {
          x: x - 9, y: y - 13, width: 18, height: 4, rx: 1,
          fill: '#e8dec5', stroke: '#1b1424', 'stroke-width': 1.5,
        }));
        // Lantern beacon housing
        grp.append(el('rect', {
          x: x - 7, y: y - 21, width: 14, height: 9, rx: 1.5,
          fill: '#ffe97a', stroke: '#1b1424', 'stroke-width': 1.8,
        }));
        // Conical paper roof cap
        grp.append(el('polygon', {
          points: `${x - 8},${y - 21} ${x},${y - 29} ${x + 8},${y - 21}`,
          fill: '#d9433b', stroke: '#1b1424', 'stroke-width': 1.8, 'stroke-linejoin': 'round',
        }));
        // Translucent glowing beacon light fan
        grp.append(el('polygon', {
          points: `${x},${y - 16} ${x + 46},${y - 34} ${x + 46},${y + 2}`,
          fill: 'url(#sw-lantern-glow)', 'pointer-events': 'none',
        }));
      }

      if (pickV.has(i)) {
        const sel = opts.selected?.type === 'v' && opts.selected.id === i;
        grp.append(el('circle', {
          cx: x, cy: y, r: 21, fill: 'transparent',
          stroke: sel ? '#fff' : 'rgba(255,255,255,.85)',
          'stroke-width': sel ? 5 : 3,
          'stroke-dasharray': sel ? null : '4 4',
          class: 'sw-hl',
        }));
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
