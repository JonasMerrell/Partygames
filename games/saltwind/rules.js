// Saltwind Isles: the rules. Pure logic, no DOM, so host.js, player.js and the
// test script all share it. The host owns the one true Game; phones get
// game.view(playerId) snapshots and rebuild the geometry with buildGraph().

export const RES = ['wood', 'coral', 'fish', 'salt', 'basalt'];
export const RES_INFO = {
  wood:   { name: 'Driftwood', icon: '🪵', tile: 'grove' },
  coral:  { name: 'Coral',     icon: '🪸', tile: 'reef' },
  fish:   { name: 'Fish',      icon: '🐟', tile: 'lagoon' },
  salt:   { name: 'Salt',      icon: '🧂', tile: 'flats' },
  basalt: { name: 'Basalt',    icon: '🪨', tile: 'volcano' },
};
export const TILE_INFO = {
  grove:   { name: 'Palm Grove',  res: 'wood' },
  reef:    { name: 'Coral Shoal', res: 'coral' },
  lagoon:  { name: 'Lagoon',      res: 'fish' },
  flats:   { name: 'Salt Flats',  res: 'salt' },
  volcano: { name: 'Basalt Peak', res: 'basalt' },
  crater:  { name: 'Ash Crater',  res: null },
};
export const COST = {
  bridge:     { wood: 1, coral: 1 },
  hut:        { wood: 1, coral: 1, fish: 1, salt: 1 },
  lighthouse: { fish: 2, basalt: 3 },
  chart:      { fish: 1, salt: 1, basalt: 1 },
};
export const PIECES = { bridge: 15, hut: 5, lighthouse: 4 };
export const CHARTS = {
  vane:   { name: 'Weathervane', icon: '🌀', text: 'Move the squall and take a card from someone beside it.' },
  cove:   { name: 'Hidden Cove', icon: '🏝️', text: 'Worth 1 point. Stays secret until someone wins.' },
  crew:   { name: 'Rope Crew',   icon: '🪢', text: 'Build 2 bridges for free.' },
  windfall: { name: 'Windfall',  icon: '🎁', text: 'Take any 2 cards from the bank.' },
  toll:   { name: 'Harbour Toll', icon: '⚓', text: 'Name a cargo. Everyone hands you all of theirs.' },
};
export const HAND_LIMIT = 9;      // a squall roll makes you drop half if you hold more
export const AWARD_MIN = { causeway: 5, rider: 3 };

// ---------- geometry ----------
const SQ3 = Math.sqrt(3);
export const hexXY = (q, r) => [SQ3 * (q + r / 2), 1.5 * r];
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/** Vertices and edges of a tile list. Deterministic, so the phones get the same ids. */
export function buildGraph(tiles) {
  const verts = [], edges = [], vkey = new Map(), ekey = new Map();
  const tileVerts = [], tileEdges = [];
  tiles.forEach((t, ti) => {
    const [cx, cy] = hexXY(t.q, t.r);
    const vs = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      const x = cx + Math.cos(a), y = cy + Math.sin(a);
      const k = `${Math.round(x * 100)},${Math.round(y * 100)}`;
      let vi = vkey.get(k);
      if (vi == null) { vi = verts.length; vkey.set(k, vi); verts.push({ x, y, tiles: [], adj: [], edges: [] }); }
      verts[vi].tiles.push(ti);
      vs.push(vi);
    }
    const es = [];
    for (let i = 0; i < 6; i++) {
      const a = vs[i], b = vs[(i + 1) % 6];
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      let ei = ekey.get(k);
      if (ei == null) {
        ei = edges.length; ekey.set(k, ei);
        edges.push({ a, b, tiles: [] });
        verts[a].adj.push(b); verts[b].adj.push(a);
        verts[a].edges.push(ei); verts[b].edges.push(ei);
      }
      edges[ei].tiles.push(ti);
      es.push(ei);
    }
    tileVerts.push(vs); tileEdges.push(es);
  });
  return { verts, edges, tileVerts, tileEdges };
}

// ---------- map generation ----------
const shuffle = (a, rnd) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** A random archipelago-shaped island chain. Big map for 5+ players. */
export function makeMap(nPlayers, rnd = Math.random) {
  const big = nPlayers >= 5;
  const counts = big
    ? { grove: 6, reef: 5, lagoon: 6, flats: 6, volcano: 5, crater: 2 }
    : { grove: 4, reef: 3, lagoon: 4, flats: 4, volcano: 3, crater: 1 };
  const nums = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  if (big) nums.push(2, 3, 4, 5, 6, 8, 9, 10, 11, 12);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  for (let attempt = 0; attempt < 500; attempt++) {
    const cells = growShape(total, big ? 4 : 3, rnd);
    if (!cells) continue;
    const kinds = shuffle(Object.entries(counts).flatMap(([k, n]) => Array(n).fill(k)), rnd);
    const tiles = cells.map(([q, r], i) => ({ q, r, kind: kinds[i], num: null }));
    if (!assignNumbers(tiles, nums, rnd)) continue;
    const graph = buildGraph(tiles);
    const harbors = placeHarbors(tiles, graph, big, rnd);
    if (!harbors) continue;
    return { tiles, harbors };
  }
  throw new Error('could not generate a map');
}

function growShape(n, radius, rnd) {
  const key = (q, r) => `${q},${r}`;
  const inside = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) <= radius;
  const land = new Map([[key(0, 0), [0, 0]]]);
  const nb = (q, r) => DIRS.map(([dq, dr]) => [q + dq, r + dr]);
  while (land.size < n) {
    const front = new Map();
    for (const [q, r] of land.values()) for (const [a, b] of nb(q, r)) {
      if (!inside(a, b) || land.has(key(a, b))) continue;
      front.set(key(a, b), [a, b]);
    }
    const opts = [...front.values()].map((c) => {
      const k = nb(...c).filter(([a, b]) => land.has(key(a, b))).length;
      return [c, k * k + 0.5];
    });
    let t = rnd() * opts.reduce((s, o) => s + o[1], 0);
    let pick = opts[opts.length - 1][0];
    for (const [c, w] of opts) { if ((t -= w) <= 0) { pick = c; break; } }
    land.set(key(...pick), pick);
  }
  // No lakes: every sea cell next to land must reach the open sea.
  for (let q = -radius - 1; q <= radius + 1; q++) for (let r = -radius - 1; r <= radius + 1; r++) {
    if (land.has(key(q, r))) continue;
    if (nb(q, r).every(([a, b]) => land.has(key(a, b)))) return null;
  }
  return [...land.values()];
}

function assignNumbers(tiles, nums, rnd) {
  const prod = tiles.map((t, i) => [t, i]).filter(([t]) => t.kind !== 'crater');
  const near = (a, b) => DIRS.some(([dq, dr]) => a.q + dq === b.q && a.r + dr === b.r);
  for (let tries = 0; tries < 200; tries++) {
    const deck = shuffle(nums, rnd);
    prod.forEach(([t], i) => (t.num = deck[i]));
    const hot = prod.map(([t]) => t).filter((t) => t.num === 6 || t.num === 8);
    const same = (x) => prod.map(([t]) => t).filter((t) => t.num === x);
    const bad = hot.some((a) => hot.some((b) => a !== b && near(a, b)))
      || [2, 12].some((x) => same(x).some((a) => same(x).some((b) => a !== b && near(a, b))));
    if (!bad) return true;
  }
  return false;
}

function placeHarbors(tiles, graph, big, rnd) {
  const types = shuffle([...RES, 'any', 'any', 'any', 'any', ...(big ? ['any', 'any'] : [])], rnd);
  const coast = graph.edges.map((e, i) => [e, i]).filter(([e]) => e.tiles.length === 1);
  // Walk the coast by angle around the centre, then take evenly spaced edges.
  const cx = graph.verts.reduce((s, v) => s + v.x, 0) / graph.verts.length;
  const cy = graph.verts.reduce((s, v) => s + v.y, 0) / graph.verts.length;
  const ang = ([e]) => {
    const a = graph.verts[e.a], b = graph.verts[e.b];
    return Math.atan2((a.y + b.y) / 2 - cy, (a.x + b.x) / 2 - cx);
  };
  coast.sort((x, y) => ang(x) - ang(y));
  const step = coast.length / types.length;
  const off = rnd() * step;
  const used = new Set(), out = [];
  for (let k = 0; k < types.length; k++) {
    let placed = false;
    for (let d = 0; d < coast.length && !placed; d++) {
      const [e, ei] = coast[(Math.floor(off + k * step) + d) % coast.length];
      const touches = (v) => used.has(v) || graph.verts[v].adj.some((w) => used.has(w));
      if (touches(e.a) || touches(e.b)) continue;
      used.add(e.a); used.add(e.b);
      out.push({ edge: ei, type: types[k] });
      placed = true;
    }
    if (!placed) return null;
  }
  return out;
}

// ---------- the game ----------
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const emptyHand = () => Object.fromEntries(RES.map((r) => [r, 0]));
const fmt = (o) => Object.entries(o).filter(([, n]) => n > 0).map(([r, n]) => `${n}${RES_INFO[r].icon}`).join(' ');
export const formatCards = fmt;

export class Game {
  /** players: [{ id, name, color }] in seat order. */
  constructor(players, { target = 10, rnd = Math.random, map } = {}) {
    this.rnd = rnd;
    this.target = target;
    const m = map || makeMap(players.length, rnd);
    this.tiles = m.tiles;
    this.harbors = m.harbors;
    this.g = buildGraph(this.tiles);
    this.squall = this.tiles.findIndex((t) => t.kind === 'crater');
    this.verts = this.g.verts.map(() => null);   // { pid, kind: 'hut'|'lighthouse' }
    this.edges = this.g.edges.map(() => null);   // pid
    this.bank = Object.fromEntries(RES.map((r) => [r, 19]));
    const deck = [...Array(14).fill('vane'), ...Array(5).fill('cove'), 'crew', 'crew', 'windfall', 'windfall', 'toll', 'toll'];
    this.deck = shuffle(deck, rnd);
    this.order = players.map((p) => p.id);
    this.p = new Map(players.map((p) => [p.id, {
      id: p.id, name: p.name, color: p.color,
      hand: emptyHand(), charts: [], newCharts: [], played: { vane: 0 },
      left: { ...PIECES }, causeway: 0,
    }]));
    this.awards = { causeway: null, rider: null };
    this.harborAt = new Map();
    for (const hb of this.harbors) {
      const e = this.g.edges[hb.edge];
      this.harborAt.set(e.a, hb.type); this.harborAt.set(e.b, hb.type);
    }
    // Snake order for the opening: 1..n then n..1.
    this.setupOrder = [...this.order, ...[...this.order].reverse()];
    this.phase = { name: 'setup', step: 0, want: 'hut', hut: null };
    this.turn = 0;           // index into this.order once play starts
    this.round = 0;
    this.dice = null;
    this.playedChart = false;
    this.offer = null;       // { from, give, get, replies: Map(pid -> bool) }
    this.log = [];
    this.winner = null;
    this.seq = 0;            // bumps on every change
    this.say(`${this.name(this.setupOrder[0])} places first.`);
  }

  // ----- small helpers -----
  name(pid) { return this.p.get(pid)?.name ?? '?'; }
  say(text, pid = null) { this.log.push({ text, pid, n: this.log.length }); if (this.log.length > 60) this.log.shift(); }
  get active() {
    if (this.phase.name === 'setup') return this.setupOrder[this.phase.step];
    return this.order[this.turn];
  }
  vertTaken(v) { return this.verts[v] != null; }
  spaced(v) { return !this.vertTaken(v) && this.g.verts[v].adj.every((w) => !this.vertTaken(w)); }
  touchesOwn(pid, v) { return this.g.verts[v].edges.some((e) => this.edges[e] === pid); }
  /** Can pid extend a bridge from vertex v? Not through someone else's building. */
  passable(pid, v) { const b = this.verts[v]; return !b || b.pid === pid; }
  canAfford(pid, cost) { const h = this.p.get(pid).hand; return Object.entries(cost).every(([r, n]) => h[r] >= n); }
  pay(pid, cost) { const h = this.p.get(pid).hand; for (const [r, n] of Object.entries(cost)) { h[r] -= n; this.bank[r] += n; } }
  give(pid, res, n) { const k = Math.min(n, this.bank[res]); this.bank[res] -= k; this.p.get(pid).hand[res] += k; return k; }
  handSize(pid) { return sum(this.p.get(pid).hand); }

  rate(pid, res) {
    let best = 4;
    this.verts.forEach((b, v) => {
      if (!b || b.pid !== pid) return;
      const t = this.harborAt.get(v);
      if (t === 'any') best = Math.min(best, 3);
      else if (t === res) best = Math.min(best, 2);
    });
    return best;
  }

  legalHuts(pid) {
    const out = [];
    for (let v = 0; v < this.verts.length; v++) {
      if (!this.spaced(v)) continue;
      if (this.phase.name === 'setup' || this.touchesOwn(pid, v)) out.push(v);
    }
    return out;
  }
  legalBridges(pid) {
    const out = [];
    this.g.edges.forEach((e, ei) => {
      if (this.edges[ei] != null) return;
      if (this.phase.name === 'setup') {
        if (e.a === this.phase.hut || e.b === this.phase.hut) out.push(ei);
        return;
      }
      const from = (v) => (this.verts[v]?.pid === pid) || (this.passable(pid, v) && this.touchesOwn(pid, v));
      if (from(e.a) || from(e.b)) out.push(ei);
    });
    return out;
  }
  legalLighthouses(pid) {
    return this.verts.map((b, v) => [b, v]).filter(([b]) => b && b.pid === pid && b.kind === 'hut').map(([, v]) => v);
  }

  points(pid, hidden = true) {
    const pl = this.p.get(pid);
    let pts = 0;
    for (const b of this.verts) if (b && b.pid === pid) pts += b.kind === 'hut' ? 1 : 2;
    if (this.awards.causeway === pid) pts += 2;
    if (this.awards.rider === pid) pts += 2;
    if (hidden) pts += [...pl.charts, ...pl.newCharts].filter((c) => c === 'cove').length;
    return pts;
  }

  // ----- longest causeway -----
  causewayOf(pid) {
    const mine = this.edges.map((o, i) => [o, i]).filter(([o]) => o === pid).map(([, i]) => i);
    let best = 0;
    const used = new Set();
    const walk = (v, len) => {
      best = Math.max(best, len);
      if (!this.passable(pid, v) && len > 0) return;
      for (const ei of this.g.verts[v].edges) {
        if (this.edges[ei] !== pid || used.has(ei)) continue;
        used.add(ei);
        const e = this.g.edges[ei];
        walk(e.a === v ? e.b : e.a, len + 1);
        used.delete(ei);
      }
    };
    const starts = new Set(mine.flatMap((ei) => [this.g.edges[ei].a, this.g.edges[ei].b]));
    for (const v of starts) walk(v, 0);
    return best;
  }
  updateCauseway() {
    for (const pl of this.p.values()) pl.causeway = this.causewayOf(pl.id);
    const len = (pid) => this.p.get(pid).causeway;
    const holder = this.awards.causeway;
    const others = [...this.p.values()].filter((pl) => pl.id !== holder);
    const topOther = Math.max(0, ...others.map((pl) => pl.causeway));
    if (holder != null && len(holder) >= AWARD_MIN.causeway && len(holder) >= topOther) return;
    const top = Math.max(0, ...[...this.p.values()].map((pl) => pl.causeway));
    const lead = [...this.p.values()].filter((pl) => pl.causeway === top);
    const next = top >= AWARD_MIN.causeway && lead.length === 1 ? lead[0].id : null;
    if (next !== holder) {
      this.awards.causeway = next;
      if (next != null) this.say(`${this.name(next)} has the Longest Causeway (${top} bridges, +2).`, next);
      else this.say('Nobody holds the Longest Causeway now.');
    }
  }
  updateRider(pid) {
    const n = this.p.get(pid).played.vane;
    const holder = this.awards.rider;
    if (holder === pid || n < AWARD_MIN.rider) return;
    if (holder == null || n > this.p.get(holder).played.vane) {
      this.awards.rider = pid;
      this.say(`${this.name(pid)} is the Storm Rider (${n} weathervanes, +2).`, pid);
    }
  }

  checkWin() {
    if (this.winner != null || this.phase.name === 'setup') return;
    const pid = this.active;
    if (this.points(pid) >= this.target) {
      this.winner = pid;
      this.phase = { name: 'over' };
      this.offer = null;
      this.say(`${this.name(pid)} wins with ${this.points(pid)} points!`, pid);
    }
  }

  // ----- turn flow -----
  nextTurn() {
    const pl = this.p.get(this.active);
    pl.charts.push(...pl.newCharts); pl.newCharts = [];
    this.offer = null;
    this.turn = (this.turn + 1) % this.order.length;
    if (this.turn === 0) this.round++;
    this.playedChart = false;
    this.dice = null;
    this.phase = { name: 'roll' };
    this.say(`${this.name(this.active)}'s turn.`, this.active);
    this.checkWin();
  }

  roll() {
    const d = [1 + Math.floor(this.rnd() * 6), 1 + Math.floor(this.rnd() * 6)];
    this.dice = d;
    const n = d[0] + d[1];
    this.say(`${this.name(this.active)} rolled ${n}.`, this.active);
    if (n === 7) {
      const need = {};
      for (const pl of this.p.values()) {
        const k = this.handSize(pl.id);
        if (k > HAND_LIMIT) need[pl.id] = Math.floor(k / 2);
      }
      if (Object.keys(need).length) {
        this.phase = { name: 'discard', need };
        this.say('Squall! Big hands lose half: ' + Object.keys(need).map((id) => this.name(+id)).join(', ') + '.');
      } else this.phase = { name: 'squall', then: 'main' };
      return { roll: n, gains: {} };
    }
    // Production.
    const want = new Map(); // res -> Map(pid -> n)
    this.tiles.forEach((t, ti) => {
      if (t.num !== n || ti === this.squall) return;
      const res = TILE_INFO[t.kind].res;
      for (const v of this.g.tileVerts[ti]) {
        const b = this.verts[v];
        if (!b) continue;
        if (!want.has(res)) want.set(res, new Map());
        const m = want.get(res);
        m.set(b.pid, (m.get(b.pid) || 0) + (b.kind === 'lighthouse' ? 2 : 1));
      }
    });
    const gains = {};
    for (const [res, m] of want) {
      const total = [...m.values()].reduce((a, b) => a + b, 0);
      if (total > this.bank[res] && m.size > 1) { this.say(`The bank is out of ${RES_INFO[res].name}. Nobody gets any.`); continue; }
      for (const [pid, k] of m) {
        const got = this.give(pid, res, k);
        if (got) (gains[pid] ||= emptyHand())[res] += got;
      }
    }
    const parts = Object.entries(gains).map(([pid, h]) => `${this.name(+pid)} ${fmt(h)}`);
    if (parts.length) this.say(parts.join(' · '));
    else this.say('Nobody collects anything.');
    this.phase = { name: 'main' };
    return { roll: n, gains };
  }

  stealCandidates(pid) {
    const out = new Set();
    for (const v of this.g.tileVerts[this.squall]) {
      const b = this.verts[v];
      if (b && b.pid !== pid && this.handSize(b.pid) > 0) out.add(b.pid);
    }
    return [...out];
  }

  steal(thief, victim) {
    const h = this.p.get(victim).hand;
    const pool = RES.flatMap((r) => Array(h[r]).fill(r));
    if (!pool.length) return null;
    const r = pool[Math.floor(this.rnd() * pool.length)];
    h[r]--; this.p.get(thief).hand[r]++;
    this.say(`${this.name(thief)} took a card from ${this.name(victim)}.`, thief);
    return r;
  }

  afterSquall() {
    const then = this.phase.then || 'main';
    this.phase = { name: then === 'roll' ? 'roll' : 'main' };
  }

  /**
   * Apply one action from a player. Returns { ok: true, ...extra } or { err }.
   * Every action is validated here, so phones can be sloppy.
   */
  act(pid, m) {
    if (!m || typeof m !== 'object') return { err: 'bad message' };
    if (this.phase.name === 'over') return { err: 'The game is over.' };
    const r = this._act(pid, m);
    if (r.ok) { this.seq++; this.checkWin(); }
    return r;
  }

  _act(pid, m) {
    const ph = this.phase, me = this.p.get(pid);
    if (!me) return { err: 'not in this game' };
    const mine = pid === this.active;

    // Discards and trade replies can come from anyone.
    if (m.a === 'discard') {
      if (ph.name !== 'discard' || !ph.need[pid]) return { err: 'No need to drop cards.' };
      const c = m.cards || {};
      if (!RES.every((r) => Number.isInteger(c[r] ?? 0) && (c[r] ?? 0) >= 0 && (c[r] ?? 0) <= me.hand[r])) return { err: 'You don\'t have those.' };
      if (sum(Object.fromEntries(RES.map((r) => [r, c[r] ?? 0]))) !== ph.need[pid]) return { err: `Drop exactly ${ph.need[pid]}.` };
      for (const r of RES) { me.hand[r] -= c[r] ?? 0; this.bank[r] += c[r] ?? 0; }
      delete ph.need[pid];
      this.say(`${me.name} dropped ${fmt(c)}.`, pid);
      if (!Object.keys(ph.need).length) this.phase = { name: 'squall', then: 'main' };
      return { ok: true };
    }
    if (m.a === 'reply') {
      const o = this.offer;
      if (!o || pid === o.from) return { err: 'No offer to answer.' };
      if (m.accept && !this.canAfford(pid, o.get)) return { err: 'You don\'t have what they want.' };
      o.replies[pid] = !!m.accept;
      return { ok: true };
    }

    if (!mine) return { err: 'Not your turn.' };

    if (ph.name === 'setup') {
      if (m.a !== 'place') return { err: 'Place your pieces first.' };
      if (ph.want === 'hut') {
        if (!this.legalHuts(pid).includes(m.v)) return { err: 'You can\'t build there.' };
        this.verts[m.v] = { pid, kind: 'hut' }; me.left.hut--;
        ph.hut = m.v; ph.want = 'bridge';
        if (ph.step >= this.order.length) {
          // Second hut pays out straight away.
          const got = emptyHand();
          for (const ti of this.g.verts[m.v].tiles) {
            const res = TILE_INFO[this.tiles[ti].kind].res;
            if (res) got[res] += this.give(pid, res, 1);
          }
          this.say(`${me.name} starts with ${fmt(got) || 'nothing'}.`, pid);
        }
        return { ok: true };
      }
      if (!this.legalBridges(pid).includes(m.e)) return { err: 'The bridge must touch the hut you just built.' };
      this.edges[m.e] = pid; me.left.bridge--;
      ph.step++; ph.want = 'hut'; ph.hut = null;
      if (ph.step >= this.setupOrder.length) {
        this.turn = 0; this.round = 1;
        this.phase = { name: 'roll' };
        this.updateCauseway();
        this.say(`Islands settled! ${this.name(this.active)} rolls first.`, this.active);
      } else this.say(`${this.name(this.active)} is placing.`, this.active);
      return { ok: true };
    }

    switch (m.a) {
      case 'roll':
        if (ph.name !== 'roll') return { err: 'You already rolled.' };
        return { ok: true, ...this.roll() };

      case 'squall': {
        if (ph.name !== 'squall') return { err: 'Not now.' };
        const t = m.tile;
        if (!Number.isInteger(t) || t < 0 || t >= this.tiles.length || t === this.squall) return { err: 'Pick a different island.' };
        this.squall = t;
        this.say(`${me.name} sent the squall to the ${TILE_INFO[this.tiles[t].kind].name}${this.tiles[t].num ? ' ' + this.tiles[t].num : ''}.`, pid);
        const c = this.stealCandidates(pid);
        if (c.length === 1) { this.steal(pid, c[0]); this.afterSquall(); }
        else if (c.length > 1) this.phase = { name: 'steal', from: c, then: ph.then };
        else this.afterSquall();
        return { ok: true };
      }
      case 'steal':
        if (ph.name !== 'steal' || !ph.from.includes(m.victim)) return { err: 'Pick someone beside the squall.' };
        this.steal(pid, m.victim);
        this.afterSquall();
        return { ok: true };

      case 'play': {
        if (!['roll', 'main'].includes(ph.name)) return { err: 'Not now.' };
        if (this.playedChart) return { err: 'One chart per turn.' };
        const k = m.chart;
        const i = me.charts.indexOf(k);
        if (i < 0 || k === 'cove') return { err: me.newCharts.includes(k) ? 'Charts bought this turn wait until next turn.' : 'You don\'t have that chart.' };
        if (ph.name === 'roll' && k !== 'vane') return { err: 'Roll first.' };
        if (k === 'windfall') {
          const rs = m.res;
          if (!Array.isArray(rs) || rs.length !== 2 || !rs.every((r) => RES.includes(r))) return { err: 'Pick two cards.' };
          const need = emptyHand(); rs.forEach((r) => need[r]++);
          if (!RES.every((r) => this.bank[r] >= need[r])) return { err: 'The bank doesn\'t have those.' };
          rs.forEach((r) => this.give(pid, r, 1));
          this.say(`${me.name} played Windfall: ${fmt(need)}.`, pid);
        } else if (k === 'toll') {
          if (!RES.includes(m.res)) return { err: 'Pick a cargo.' };
          let got = 0;
          for (const o of this.p.values()) if (o.id !== pid) { got += o.hand[m.res]; o.hand[m.res] = 0; }
          me.hand[m.res] += got;
          this.say(`${me.name} played Harbour Toll on ${RES_INFO[m.res].name} and collected ${got}${RES_INFO[m.res].icon}.`, pid);
        } else if (k === 'crew') {
          if (!this.legalBridges(pid).length || me.left.bridge === 0) return { err: 'Nowhere to build a bridge.' };
          this.phase = { name: 'crew', left: Math.min(2, me.left.bridge), back: ph.name };
          this.say(`${me.name} played Rope Crew.`, pid);
        } else if (k === 'vane') {
          me.played.vane++;
          this.say(`${me.name} played a Weathervane.`, pid);
          this.updateRider(pid);
          this.phase = { name: 'squall', then: ph.name };
        }
        me.charts.splice(i, 1);
        this.playedChart = true;
        return { ok: true };
      }

      case 'build': {
        const crew = ph.name === 'crew';
        if (ph.name !== 'main' && !crew) return { err: ph.name === 'roll' ? 'Roll first.' : 'Not now.' };
        if (crew && m.what !== 'bridge') return { err: 'Place your free bridges first.' };
        const what = m.what;
        if (!COST[what] || what === 'chart') return { err: 'bad build' };
        if (me.left[what] <= 0) return { err: `You have no ${what}s left.` };
        if (!crew && !this.canAfford(pid, COST[what])) return { err: 'You can\'t afford that.' };
        if (what === 'bridge') {
          if (!this.legalBridges(pid).includes(m.at)) return { err: 'Bridges must join your network.' };
          this.edges[m.at] = pid; me.left.bridge--;
          if (crew) {
            ph.left--;
            if (ph.left <= 0 || !this.legalBridges(pid).length || me.left.bridge === 0) this.phase = { name: ph.back };
          } else this.pay(pid, COST.bridge);
          this.updateCauseway();
        } else if (what === 'hut') {
          if (!this.legalHuts(pid).includes(m.at)) return { err: 'Huts need a bridge and space around them.' };
          this.pay(pid, COST.hut);
          this.verts[m.at] = { pid, kind: 'hut' }; me.left.hut--;
          this.say(`${me.name} built a hut.`, pid);
          this.updateCauseway();
        } else if (what === 'lighthouse') {
          if (!this.legalLighthouses(pid).includes(m.at)) return { err: 'Lighthouses go on your own huts.' };
          this.pay(pid, COST.lighthouse);
          this.verts[m.at].kind = 'lighthouse'; me.left.lighthouse--; me.left.hut++;
          this.say(`${me.name} lit a lighthouse.`, pid);
        }
        return { ok: true };
      }
      case 'crewDone':
        if (ph.name !== 'crew') return { err: 'Not now.' };
        this.phase = { name: ph.back };
        return { ok: true };

      case 'chart': {
        if (ph.name !== 'main') return { err: 'Not now.' };
        if (!this.deck.length) return { err: 'The chart deck is empty.' };
        if (!this.canAfford(pid, COST.chart)) return { err: 'You can\'t afford a chart.' };
        this.pay(pid, COST.chart);
        const c = this.deck.pop();
        me.newCharts.push(c);
        this.say(`${me.name} bought a chart.`, pid);
        return { ok: true, chart: c };
      }

      case 'bank': {
        if (ph.name !== 'main') return { err: 'Not now.' };
        const { give, get } = m;
        if (!RES.includes(give) || !RES.includes(get) || give === get) return { err: 'Pick two different cargos.' };
        const n = this.rate(pid, give);
        if (me.hand[give] < n) return { err: `You need ${n} ${RES_INFO[give].name}.` };
        if (this.bank[get] < 1) return { err: 'The bank is out of that.' };
        me.hand[give] -= n; this.bank[give] += n;
        this.give(pid, get, 1);
        this.say(`${me.name} traded ${n}${RES_INFO[give].icon} with the bank for 1${RES_INFO[get].icon}.`, pid);
        return { ok: true };
      }

      case 'offer': {
        if (ph.name !== 'main') return { err: 'Roll first.' };
        const clean = (o) => Object.fromEntries(RES.map((r) => [r, Math.max(0, Math.min(19, Math.floor(+(o?.[r]) || 0)))]));
        const give = clean(m.give), get = clean(m.get);
        if (!sum(give) || !sum(get)) return { err: 'Ask for something and offer something.' };
        if (RES.some((r) => give[r] && get[r])) return { err: 'Don\'t give and ask for the same cargo.' };
        if (!this.canAfford(pid, give)) return { err: 'You don\'t have that much.' };
        this.offer = { from: pid, give, get, replies: {}, id: (this.offer?.id || 0) + 1 };
        this.say(`${me.name} offers ${fmt(give)} for ${fmt(get)}.`, pid);
        return { ok: true };
      }
      case 'cancelOffer':
        this.offer = null;
        return { ok: true };
      case 'deal': {
        const o = this.offer;
        if (!o) return { err: 'That offer is gone.' };
        const other = this.p.get(m.with);
        if (!other || !o.replies[m.with]) return { err: 'They haven\'t accepted.' };
        if (!this.canAfford(pid, o.give)) { this.offer = null; return { err: 'You no longer have those cards.' }; }
        if (!this.canAfford(m.with, o.get)) { o.replies[m.with] = false; return { err: `${other.name} no longer has those cards.` }; }
        for (const r of RES) {
          me.hand[r] += o.get[r] - o.give[r];
          other.hand[r] += o.give[r] - o.get[r];
        }
        this.say(`${me.name} traded ${fmt(o.give)} to ${other.name} for ${fmt(o.get)}.`, pid);
        this.offer = null;
        return { ok: true };
      }

      case 'end':
        if (ph.name !== 'main') return { err: ph.name === 'roll' ? 'Roll first.' : 'Finish what you\'re doing first.' };
        this.nextTurn();
        return { ok: true };
    }
    return { err: 'Unknown action.' };
  }

  // ----- what to do when someone is away or slow -----
  /** Who the game is waiting on right now. */
  waitingOn() {
    if (this.phase.name === 'discard') return Object.keys(this.phase.need).map(Number);
    if (this.phase.name === 'over') return [];
    return [this.active];
  }

  /** A sensible move for pid, used for timeouts, absent players and tests. */
  autoMove(pid, smart = false) {
    const ph = this.phase;
    const pick = (a) => a[Math.floor(this.rnd() * a.length)];
    if (ph.name === 'discard' && ph.need[pid]) {
      const h = { ...this.p.get(pid).hand }, out = emptyHand();
      for (let k = 0; k < ph.need[pid]; k++) {
        const r = RES.reduce((a, b) => (h[b] > h[a] ? b : a));
        h[r]--; out[r]++;
      }
      return { a: 'discard', cards: out };
    }
    if (pid !== this.active) return null;
    switch (ph.name) {
      case 'setup':
        if (ph.want === 'hut') {
          const opts = this.legalHuts(pid);
          return { a: 'place', v: opts.reduce((best, v) => (this.spotValue(v) > this.spotValue(best) ? v : best), opts[0]) };
        }
        return { a: 'place', e: pick(this.legalBridges(pid)) };
      case 'roll': return { a: 'roll' };
      case 'squall': {
        const opts = this.tiles.map((_, i) => i).filter((i) => i !== this.squall);
        const hurt = opts.filter((i) => this.g.tileVerts[i].some((v) => this.verts[v] && this.verts[v].pid !== pid)
          && !this.g.tileVerts[i].some((v) => this.verts[v]?.pid === pid));
        return { a: 'squall', tile: pick(hurt.length ? hurt : opts) };
      }
      case 'steal': return { a: 'steal', victim: pick(ph.from) };
      case 'crew': {
        const opts = this.legalBridges(pid);
        return opts.length ? { a: 'build', what: 'bridge', at: pick(opts) } : { a: 'crewDone' };
      }
      case 'main': {
        if (this.offer?.from === pid) return { a: 'cancelOffer' };
        if (!smart) return { a: 'end' };
        return this.botMain(pid);
      }
    }
    return null;
  }

  spotValue(v) {
    const pips = (n) => (n ? 6 - Math.abs(7 - n) : 0);
    return this.g.verts[v].tiles.reduce((s, ti) => s + pips(this.tiles[ti].num) + (ti === this.squall ? -2 : 0), 0)
      + (this.harborAt.has(v) ? 1 : 0);
  }

  /** A simple greedy bot, used by the test script to play whole games. */
  botMain(pid) {
    const me = this.p.get(pid);
    const best = (vs) => vs.reduce((b, v) => (this.spotValue(v) > this.spotValue(b) ? v : b), vs[0]);
    if (me.charts.length && !this.playedChart) {
      const k = me.charts.find((c) => c !== 'cove');
      if (k === 'windfall') return { a: 'play', chart: k, res: ['wood', 'coral'].filter((r) => this.bank[r] > 0).length === 2 ? ['wood', 'coral'] : ['fish', 'salt'] };
      if (k === 'toll') return { a: 'play', chart: k, res: 'basalt' };
      if (k && (k !== 'crew' || (this.legalBridges(pid).length && me.left.bridge))) return { a: 'play', chart: k };
    }
    if (this.canAfford(pid, COST.lighthouse) && this.legalLighthouses(pid).length && me.left.lighthouse)
      return { a: 'build', what: 'lighthouse', at: best(this.legalLighthouses(pid)) };
    if (this.canAfford(pid, COST.hut) && this.legalHuts(pid).length && me.left.hut)
      return { a: 'build', what: 'hut', at: best(this.legalHuts(pid)) };
    if (this.canAfford(pid, COST.bridge) && me.left.bridge && !this.legalHuts(pid).length && this.legalBridges(pid).length) {
      const opts = this.legalBridges(pid);
      return { a: 'build', what: 'bridge', at: opts[Math.floor(this.rnd() * opts.length)] };
    }
    if (this.canAfford(pid, COST.chart) && this.deck.length && this.rnd() < 0.5) return { a: 'chart' };
    // Trade surplus with the bank toward what's missing.
    const goal = this.legalHuts(pid).length ? COST.hut : COST.bridge;
    const missing = RES.find((r) => (goal[r] || 0) > me.hand[r] && this.bank[r] > 0);
    const spare = RES.find((r) => me.hand[r] >= this.rate(pid, r) + (goal[r] || 0));
    if (missing && spare && spare !== missing) return { a: 'bank', give: spare, get: missing };
    return { a: 'end' };
  }

  // ----- snapshots -----
  /** Everything a phone or the TV needs. Private bits only for `pid`. */
  view(pid = null) {
    const pub = {
      seq: this.seq,
      tiles: this.tiles, harbors: this.harbors, squall: this.squall,
      verts: this.verts, edges: this.edges, bank: this.bank, deck: this.deck.length,
      phase: this.phase.name, need: this.phase.need || null, stealFrom: this.phase.from || null,
      crewLeft: this.phase.left || 0,
      setupWant: this.phase.want || null, setupHut: this.phase.hut ?? null,
      active: this.phase.name === 'over' ? null : this.active,
      dice: this.dice, round: this.round, target: this.target, playedChart: this.playedChart,
      awards: this.awards, winner: this.winner,
      offer: this.offer && { ...this.offer },
      log: this.log.slice(-8),
      players: this.order.map((id) => {
        const pl = this.p.get(id);
        const over = this.phase.name === 'over';
        return {
          id, name: pl.name, color: pl.color,
          cards: this.handSize(id), charts: pl.charts.length + pl.newCharts.length,
          vanes: pl.played.vane, causeway: pl.causeway, left: pl.left,
          points: this.points(id, over), coves: over ? [...pl.charts, ...pl.newCharts].filter((c) => c === 'cove').length : null,
        };
      }),
    };
    if (pid != null && this.p.has(pid)) {
      const pl = this.p.get(pid);
      pub.me = {
        id: pid, hand: pl.hand, charts: pl.charts, newCharts: pl.newCharts,
        points: this.points(pid), rates: Object.fromEntries(RES.map((r) => [r, this.rate(pid, r)])),
        legal: pid === this.active ? {
          huts: this.phase.name === 'setup' ? (this.phase.want === 'hut' ? this.legalHuts(pid) : [])
            : (pl.left.hut ? this.legalHuts(pid) : []),
          bridges: this.phase.name === 'setup' ? (this.phase.want === 'bridge' ? this.legalBridges(pid) : [])
            : (pl.left.bridge ? this.legalBridges(pid) : []),
          lighthouses: pl.left.lighthouse ? this.legalLighthouses(pid) : [],
        } : null,
      };
    }
    return pub;
  }
}
