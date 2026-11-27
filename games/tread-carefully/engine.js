// Tread Carefully: the simulation. Pure logic, no DOM, so it can be tested in Node.
import { COLS, ROWS, TILE, FLOOR, WALL, CRATE, LAVA, BUSH, PAD, LAMP, buildMap } from './maps.js';

export const W = COLS * TILE, H = ROWS * TILE;
export const TANK_R = 6;
const TAU = Math.PI * 2;

// ---------- items ----------
export const AMMO = {
  shell: { name: 'Shell', desc: 'Bounces once.' },
  rocket: { name: 'Rockets', desc: 'Twice as fast. Bounces once.', shots: 4 },
  spread: { name: 'Spread shot', desc: 'Three shells in a fan.', shots: 3 },
  laser: { name: 'Ricochet laser', desc: 'Instant beam that bounces three times.', shots: 2 },
  homing: { name: 'Homing missile', desc: 'Steers toward the nearest enemy.', shots: 2 },
  blaster: { name: 'Blaster shell', desc: 'Explodes on impact and smashes crates.', shots: 3 },
  mines: { name: 'Mine pack', desc: 'Three extra mines.' },
};
export const POWERS = {
  shield: { name: 'Shield', desc: 'Blocks one hit.', secs: 15 },
  speed: { name: 'Turbo', desc: 'Drive much faster.', secs: 8 },
  rapid: { name: 'Rapid fire', desc: 'Shoot faster, more shells at once.', secs: 8 },
  cloak: { name: 'Cloak', desc: 'Nearly invisible.', secs: 7 },
  ghost: { name: 'Ghost treads', desc: 'Drive through walls.', secs: 6 },
};
export const ITEM_KINDS = [...Object.keys(AMMO).filter((k) => k !== 'shell'), ...Object.keys(POWERS)];

export const MODES = {
  lts: { name: 'Last Tank Standing', short: 'Last Tank', desc: 'One life each. Last tank alive wins the round.' },
  frenzy: { name: 'Frag Frenzy', short: 'Frenzy', desc: 'Respawns on. Most knockouts when time runs out wins.' },
  hill: { name: 'Hold the Hill', short: 'Hill', desc: 'Sit alone in the glowing zone to score. The zone moves.' },
  bounce: { name: 'Bank Shots Only', short: 'Bank Shots', desc: 'Respawns on. Shells only count after a bounce.' },
};

export const LEVELS = {
  easy: { think: 0.5, err: 0.22, fire: 0.35, dodge: 0, search: 8, keep: 3, turn: 3 },
  normal: { think: 0.28, err: 0.09, fire: 0.6, dodge: 0.55, search: 24, keep: 5, turn: 5 },
  hard: { think: 0.14, err: 0.035, fire: 0.85, dodge: 0.95, search: 48, keep: 6, turn: 8 },
};

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const tileAt = (s, px, py) => {
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return WALL;
  return s.map.grid[y * COLS + x];
};
const shellSolid = (t) => t === WALL || t === CRATE || t === LAMP;
const tankSolid = (t) => t === WALL || t === CRATE || t === LAMP || t === LAVA;
const isBorder = (x, y) => x <= 0 || y <= 0 || x >= COLS - 1 || y >= ROWS - 1;

// ---------- setup ----------
export function createMatch(settings, entrants, rand = Math.random) {
  return {
    settings, rand,
    tanks: entrants.map((e, i) => ({
      id: e.id, name: e.name, color: e.color, cpu: !!e.cpu, level: e.level || 'normal', slot: i,
      kills: 0, deaths: 0, wins: 0, score: 0, hold: 0, bestStreak: 0, streak: 0,
    })),
    round: 0,
  };
}

export function startRound(m, mapDef) {
  const s = {
    map: buildMap(mapDef), mode: m.settings.mode, settings: m.settings, rand: m.rand,
    tanks: m.tanks, shells: [], mines: [], items: [], fx: [], beams: [], events: [],
    t: 0, itemT: 4, frozen: true, hill: null, hillT: 0, hillOrder: [], over: false,
  };
  const spawns = shuffle([...s.map.spawns], s.rand);
  s.tanks.forEach((t, i) => {
    const sp = spawns[i % spawns.length];
    resetTank(t, sp, s);
  });
  if (s.mode === 'hill') nextHill(s);
  return s;
}

function resetTank(t, sp, s) {
  Object.assign(t, {
    x: sp.x, y: sp.y, vx: 0, vy: 0, alive: true,
    body: Math.atan2(H / 2 - sp.y, W / 2 - sp.x), aim: Math.atan2(H / 2 - sp.y, W / 2 - sp.x),
    input: { mx: 0, my: 0, aim: null, fire: 0, mine: 0 }, fired: t.input?.fire || 0, mined: t.input?.mine || 0,
    cool: 0, ammo: 'shell', ammoLeft: 0, power: null, powerT: 0, shield: false, extraMines: 0,
    respawnT: 0, prot: s.mode === 'lts' ? 0 : 2, teleCd: 0, ai: t.ai || null, treadT: 0,
  });
  t.input.fire = t.fired; t.input.mine = t.mined;
  t.ai = null;
}

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function nextHill(s) {
  if (!s.hillOrder.length) s.hillOrder = shuffle([...s.map.hills], s.rand);
  let h = s.hillOrder.shift();
  if (s.hill && h.x === s.hill.x && h.y === s.hill.y && s.map.hills.length > 1) h = s.hillOrder.shift() || s.map.hills[0];
  s.hill = { x: h.x, y: h.y, r: TILE * 1.5 };
  s.hillT = 20;
  s.events.push({ type: 'hill' });
}

// ---------- the step ----------
export function step(s, dt) {
  s.events.length = 0;
  if (s.frozen) { for (const t of s.tanks) if (t.cpu || t.autopilot) aiThink(s, t, dt, true); return; }
  s.t += dt;
  const enabled = ITEM_KINDS.filter((k) => s.settings.items[k]);
  // items
  if (enabled.length) {
    s.itemT -= dt;
    const cap = Math.min(4, 1 + Math.ceil(s.tanks.length / 3));
    if (s.itemT <= 0) {
      s.itemT = 6 + s.rand() * 4;
      if (s.items.length < cap) spawnItem(s, enabled);
    }
  }
  for (const it of s.items) it.t += dt;
  s.items = s.items.filter((it) => it.t < 22);
  // hill
  if (s.hill) {
    s.hillT -= dt;
    if (s.hillT <= 0) nextHill(s);
    const inside = s.tanks.filter((t) => t.alive && Math.abs(t.x - s.hill.x) < s.hill.r && Math.abs(t.y - s.hill.y) < s.hill.r);
    s.hill.owner = inside.length === 1 ? inside[0].id : inside.length ? 'contested' : null;
    if (inside.length === 1) {
      const t = inside[0];
      t.hold += dt;
      const ns = Math.floor(t.hold);
      if (ns > t.score) { t.score = ns; s.events.push({ type: 'tick', id: t.id }); }
    }
  }
  // tanks
  for (const t of s.tanks) {
    if (!t.alive) {
      if (t.respawnT > 0) { t.respawnT -= dt; if (t.respawnT <= 0) respawn(s, t); }
      continue;
    }
    if (t.cpu || t.autopilot) aiThink(s, t, dt, false);
    tankUpdate(s, t, dt);
  }
  separateTanks(s);
  // shells
  for (const sh of s.shells) shellUpdate(s, sh, dt);
  s.shells = s.shells.filter((sh) => !sh.dead);
  shellVsShell(s);
  // mines
  for (const mn of s.mines) mineUpdate(s, mn, dt);
  s.mines = s.mines.filter((mn) => !mn.dead);
  // effects
  for (const f of s.fx) f.t += dt;
  s.fx = s.fx.filter((f) => f.t < f.life);
  for (const b of s.beams) b.t += dt;
  s.beams = s.beams.filter((b) => b.t < 0.35);
}

function spawnItem(s, enabled) {
  for (let tries = 0; tries < 40; tries++) {
    const x = 1 + Math.floor(s.rand() * (COLS - 2)), y = 1 + Math.floor(s.rand() * (ROWS - 2));
    if (s.map.grid[y * COLS + x] !== FLOOR) continue;
    const p = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
    if (s.tanks.some((t) => t.alive && dist2(t, p) < 48 * 48)) continue;
    if (s.items.some((it) => dist2(it, p) < 64 * 64)) continue;
    s.items.push({ ...p, kind: enabled[Math.floor(s.rand() * enabled.length)], t: 0 });
    s.events.push({ type: 'item' });
    return;
  }
}

function respawn(s, t) {
  const foes = s.tanks.filter((o) => o.alive && o !== t);
  let best = s.map.spawns[0], bestD = -1;
  for (const sp of s.map.spawns) {
    const d = foes.length ? Math.min(...foes.map((o) => dist2(o, sp))) : s.rand();
    if (d > bestD) { bestD = d; best = sp; }
  }
  resetTank(t, best, s);
  t.prot = 2;
  s.events.push({ type: 'spawn', id: t.id });
}

function tankUpdate(s, t, dt) {
  t.cool -= dt; t.teleCd -= dt; t.prot -= dt;
  if (t.power) {
    t.powerT -= dt;
    if (t.powerT <= 0) {
      if (t.power === 'ghost') unstick(s, t);
      if (t.power === 'shield') t.shield = false;
      t.power = null;
    }
  }
  const inp = t.input;
  // aim: humans aim instantly, bots turn their turret
  if (inp.aim != null) {
    if (t.cpu || t.autopilot) {
      const d = angDiff(inp.aim, t.aim), turn = LEVELS[t.level].turn * dt;
      t.aim += clamp(d, -turn, turn);
    } else t.aim = inp.aim;
  }
  // drive
  const mag = Math.min(1, Math.hypot(inp.mx, inp.my));
  const fast = t.power === 'speed';
  const top = (fast ? 72 : 44) * mag;
  let want = { x: 0, y: 0 };
  if (mag > 0.15) {
    const target = Math.atan2(inp.my, inp.mx);
    let d = angDiff(target, t.body), dir = 1;
    if (Math.abs(d) > 2.1) { dir = -1; d = angDiff(target + Math.PI, t.body); }
    const turn = (fast ? 9 : 6.5) * dt;
    t.body += clamp(d, -turn, turn);
    const rest = Math.abs(angDiff(dir > 0 ? target : target + Math.PI, t.body));
    const k = rest < 1.2 ? Math.cos(rest) ** 2 : 0;
    want = { x: Math.cos(t.body) * top * k * dir, y: Math.sin(t.body) * top * k * dir };
  }
  if (s.map.ice) {
    const a = Math.min(1, dt * (mag > 0.15 ? 1.6 : 0.7));
    t.vx += (want.x - t.vx) * a; t.vy += (want.y - t.vy) * a;
  } else { t.vx = want.x; t.vy = want.y; }
  const ghost = t.power === 'ghost';
  t.x += t.vx * dt; collideTank(s, t, ghost, 'x');
  t.y += t.vy * dt; collideTank(s, t, ghost, 'y');
  if (Math.hypot(t.vx, t.vy) > 5) {
    t.treadT += dt;
    if (t.treadT > 0.12) { t.treadT = 0; s.events.push({ type: 'tread', x: t.x, y: t.y, a: t.body, id: t.id }); }
  }
  // teleport
  if (t.teleCd <= 0) for (const p of s.map.pads) {
    if (dist2(t, p) < 25 && p.to !== p) {
      t.x = p.to.x; t.y = p.to.y; t.teleCd = 1.5;
      s.fx.push({ type: 'tele', x: p.x, y: p.y, t: 0, life: 0.5 }, { type: 'tele', x: p.to.x, y: p.to.y, t: 0, life: 0.5 });
      s.events.push({ type: 'tele' });
      break;
    }
  }
  // items
  for (const it of s.items) if (!it.taken && dist2(t, it) < 11 * 11) { it.taken = true; pickup(s, t, it.kind); }
  s.items = s.items.filter((it) => !it.taken);
  // fire
  if (inp.fire !== t.fired) {
    t.fired = inp.fire;
    fire(s, t);
  }
  if (inp.mine !== t.mined) {
    t.mined = inp.mine;
    layMine(s, t);
  }
}

function collideTank(s, t, ghost, axis) {
  const r = TANK_R;
  const x0 = Math.floor((t.x - r) / TILE), x1 = Math.floor((t.x + r) / TILE);
  const y0 = Math.floor((t.y - r) / TILE), y1 = Math.floor((t.y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const out = tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS;
    const code = out ? WALL : s.map.grid[ty * COLS + tx];
    if (!tankSolid(code)) continue;
    if (ghost && !out && !isBorder(tx, ty)) continue;
    const bx = tx * TILE, by = ty * TILE;
    // overlap of the tank's box with the tile, resolved on the axis we just moved
    const ox = Math.min(t.x + r, bx + TILE) - Math.max(t.x - r, bx);
    const oy = Math.min(t.y + r, by + TILE) - Math.max(t.y - r, by);
    if (ox <= 0 || oy <= 0) continue;
    if (axis === 'x') { t.x += t.x < bx + TILE / 2 ? -ox : ox; if (!s.map.ice) t.vx = 0; else t.vx *= -0.3; }
    else { t.y += t.y < by + TILE / 2 ? -oy : oy; if (!s.map.ice) t.vy = 0; else t.vy *= -0.3; }
  }
}

function unstick(s, t) {
  const tx = Math.floor(t.x / TILE), ty = Math.floor(t.y / TILE);
  if (!tankSolid(s.map.grid[ty * COLS + tx])) return;
  // nearest walkable tile
  let best = null, bd = Infinity;
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
    if (tankSolid(s.map.grid[y * COLS + x])) continue;
    const d = (x - tx) ** 2 + (y - ty) ** 2;
    if (d < bd) { bd = d; best = { x, y }; }
  }
  if (best) { t.x = best.x * TILE + TILE / 2; t.y = best.y * TILE + TILE / 2; }
}

function separateTanks(s) {
  const live = s.tanks.filter((t) => t.alive);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = TANK_R * 2;
    if (d < min) {
      const push = (min - d) / 2, nx = dx / d, ny = dy / d;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      collideTank(s, a, a.power === 'ghost', 'x'); collideTank(s, a, a.power === 'ghost', 'y');
      collideTank(s, b, b.power === 'ghost', 'x'); collideTank(s, b, b.power === 'ghost', 'y');
    }
  }
}

function pickup(s, t, kind) {
  if (AMMO[kind]) {
    if (kind === 'mines') t.extraMines += 3;
    else { t.ammo = kind; t.ammoLeft = AMMO[kind].shots; }
  } else {
    if (t.power === 'ghost' && kind !== 'ghost') unstick(s, t);
    t.power = kind; t.powerT = POWERS[kind].secs;
    if (kind === 'shield') t.shield = true;
    else t.shield = false;
  }
  s.fx.push({ type: 'pickup', x: t.x, y: t.y, t: 0, life: 0.6, color: t.color });
  s.events.push({ type: 'pickup', id: t.id, kind });
}

const MAX_SHELLS = 5, MAX_RAPID = 9;

export function canFire(s, t) {
  if (!t.alive || t.cool > 0) return false;
  const mine = s.shells.filter((sh) => sh.owner === t.id).length;
  return mine < (t.power === 'rapid' ? MAX_RAPID : MAX_SHELLS);
}

function muzzle(t) { return { x: t.x + Math.cos(t.aim) * 9, y: t.y + Math.sin(t.aim) * 9 }; }

function fire(s, t) {
  if (!canFire(s, t)) return;
  const rapid = t.power === 'rapid';
  t.cool = rapid ? 0.12 : 0.32;
  const kind = t.ammo;
  let m = muzzle(t);
  // a barrel poking into a wall fires from the tank's centre instead
  if (shellSolid(tileAt(s, m.x, m.y))) m = { x: t.x, y: t.y };
  const shell = (a, over = {}) => ({ owner: t.id, kind: 'shell', x: m.x, y: m.y, vx: Math.cos(a) * 96, vy: Math.sin(a) * 96,
    bounces: 0, maxB: 1, life: 12, teleCd: 0, ...over });
  if (kind === 'laser') { fireLaser(s, t, m); }
  else if (kind === 'spread') { for (const d of [-0.26, 0, 0.26]) s.shells.push(shell(t.aim + d)); }
  else if (kind === 'rocket') s.shells.push(shell(t.aim, { kind: 'rocket', vx: Math.cos(t.aim) * 190, vy: Math.sin(t.aim) * 190 }));
  else if (kind === 'homing') s.shells.push(shell(t.aim, { kind: 'homing', vx: Math.cos(t.aim) * 78, vy: Math.sin(t.aim) * 78, maxB: 2, life: 9 }));
  else if (kind === 'blaster') s.shells.push(shell(t.aim, { kind: 'blaster', vx: Math.cos(t.aim) * 88, vy: Math.sin(t.aim) * 88, maxB: 0 }));
  else s.shells.push(shell(t.aim));
  if (kind !== 'shell') { t.ammoLeft--; if (t.ammoLeft <= 0) t.ammo = 'shell'; }
  s.fx.push({ type: 'flash', x: m.x, y: m.y, a: t.aim, t: 0, life: 0.1 });
  s.events.push({ type: 'fire', kind, id: t.id });
}

function layMine(s, t) {
  if (!t.alive) return;
  const mine = s.mines.filter((mn) => mn.owner === t.id).length;
  if (mine >= 2 + Math.min(t.extraMines, 3)) return;
  if (t.extraMines > 0 && mine >= 2) t.extraMines--;
  s.mines.push({ owner: t.id, x: t.x, y: t.y, t: 0, fuse: 10, dead: false, color: t.color });
  s.events.push({ type: 'mine', id: t.id });
}

// Trace a ray that reflects off walls. Used by the laser and by the bots' aim.
export function trace(s, x, y, a, maxB, len, ownerId, opts = {}) {
  let dx = Math.cos(a), dy = Math.sin(a), bounces = 0;
  const pts = [{ x, y }];
  const stepLen = 1.5;
  for (let d = 0; d < len; d += stepLen) {
    let nx = x + dx * stepLen, ny = y + dy * stepLen;
    const hitX = shellSolid(tileAt(s, nx, y)), hitY = shellSolid(tileAt(s, x, ny));
    let hit = false;
    if (hitX) { dx = -dx; hit = true; }
    if (hitY) { dy = -dy; hit = true; }
    if (!hitX && !hitY && shellSolid(tileAt(s, nx, ny))) { dx = -dx; dy = -dy; hit = true; }
    if (hit) {
      bounces++;
      pts.push({ x, y });
      if (bounces > maxB) return { pts, bounces, tank: null, end: 'wall' };
      continue;
    }
    x = nx; y = ny;
    for (const t of opts.tanks || s.tanks) {
      if (!t.alive || t.id === ownerId) continue;
      if ((t.x - x) ** 2 + (t.y - y) ** 2 < (TANK_R + (opts.pad || 1)) ** 2) {
        pts.push({ x, y });
        return { pts, bounces, tank: t, end: 'tank', d };
      }
    }
  }
  pts.push({ x, y });
  return { pts, bounces, tank: null, end: 'len' };
}

function fireLaser(s, t, m) {
  // the beam passes through tanks it reaches before its first bounce in Bank Shots
  const skip = new Set([t.id]);
  let res;
  for (let k = 0; k < 8; k++) {
    res = trace(s, m.x, m.y, t.aim, 3, 700, t.id, { tanks: s.tanks.filter((o) => !skip.has(o.id)) });
    if (res.tank && s.mode === 'bounce' && res.bounces === 0) { skip.add(res.tank.id); continue; }
    break;
  }
  s.beams.push({ pts: res.pts, color: t.color, t: 0 });
  if (res.tank) hitTank(s, res.tank, t.id, 'laser', res.bounces);
}

function shellUpdate(s, sh, dt) {
  sh.life -= dt; sh.teleCd -= dt;
  if (sh.life <= 0) { sh.dead = true; s.fx.push({ type: 'puff', x: sh.x, y: sh.y, t: 0, life: 0.25 }); return; }
  if (sh.kind === 'homing') {
    let best = null, bd = 170 * 170;
    for (const t of s.tanks) {
      if (!t.alive || t.id === sh.owner || t.power === 'cloak') continue;
      const d = dist2(t, sh);
      if (d < bd) { bd = d; best = t; }
    }
    if (best) {
      const sp = Math.hypot(sh.vx, sh.vy), a = Math.atan2(sh.vy, sh.vx);
      const na = a + clamp(angDiff(Math.atan2(best.y - sh.y, best.x - sh.x), a), -2.6 * dt, 2.6 * dt);
      sh.vx = Math.cos(na) * sp; sh.vy = Math.sin(na) * sp;
    }
  }
  if (sh.kind === 'rocket' || sh.kind === 'homing') {
    sh.trailT = (sh.trailT || 0) + dt;
    if (sh.trailT > 0.04) { sh.trailT = 0; s.fx.push({ type: 'smoke', x: sh.x, y: sh.y, t: 0, life: 0.5 }); }
  }
  const sp = Math.hypot(sh.vx, sh.vy);
  const n = Math.max(1, Math.ceil(sp * dt / 2));
  const h = dt / n;
  for (let k = 0; k < n && !sh.dead; k++) {
    const nx = sh.x + sh.vx * h, ny = sh.y + sh.vy * h;
    const tX = tileAt(s, nx, sh.y), tY = tileAt(s, sh.x, ny);
    let hitX = shellSolid(tX), hitY = shellSolid(tY), corner = false;
    if (!hitX && !hitY && shellSolid(tileAt(s, nx, ny))) corner = true;
    if (hitX || hitY || corner) {
      const hx = hitX ? nx : corner ? nx : sh.x, hy = hitY ? ny : corner ? ny : sh.y;
      const code = tileAt(s, hx, hy);
      if (sh.kind === 'blaster') { explode(s, sh.x, sh.y, 22, sh.owner); sh.dead = true; return; }
      if (code === CRATE) { damageCrate(s, hx, hy, 1); sh.dead = true; s.fx.push({ type: 'puff', x: sh.x, y: sh.y, t: 0, life: 0.25 }); return; }
      if (hitX || corner) sh.vx = -sh.vx;
      if (hitY || corner) sh.vy = -sh.vy;
      sh.bounces++;
      if (sh.bounces > sh.maxB) { sh.dead = true; s.fx.push({ type: 'puff', x: sh.x, y: sh.y, t: 0, life: 0.25 }); s.events.push({ type: 'fizz' }); return; }
      s.events.push({ type: 'bounce' });
      continue;
    }
    sh.x = nx; sh.y = ny;
    // teleport pads carry shells too
    if (sh.teleCd <= 0) for (const p of s.map.pads) {
      if (p.to !== p && dist2(sh, p) < 16) { sh.x = p.to.x; sh.y = p.to.y; sh.teleCd = 0.6; s.events.push({ type: 'tele' }); break; }
    }
    for (const t of s.tanks) {
      if (!t.alive || t.id === sh.owner) continue;
      if ((t.x - sh.x) ** 2 + (t.y - sh.y) ** 2 < (TANK_R + 1.5) ** 2) {
        if (sh.kind === 'blaster') { explode(s, sh.x, sh.y, 22, sh.owner); sh.dead = true; return; }
        if (s.mode === 'bounce' && sh.bounces === 0) continue; // direct hits pass harmlessly
        sh.dead = true;
        hitTank(s, t, sh.owner, sh.kind, sh.bounces);
        return;
      }
    }
    for (const mn of s.mines) {
      if (!mn.dead && (mn.x - sh.x) ** 2 + (mn.y - sh.y) ** 2 < 25) { sh.dead = true; detonate(s, mn); return; }
    }
  }
}

function shellVsShell(s) {
  const list = s.shells;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.dead || b.dead) continue;
    if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 < 16) {
      a.dead = b.dead = true;
      s.fx.push({ type: 'puff', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0, life: 0.3 });
      s.events.push({ type: 'clash' });
    }
  }
  s.shells = list.filter((sh) => !sh.dead);
}

function mineUpdate(s, mn, dt) {
  mn.t += dt;
  if (mn.t >= mn.fuse) return detonate(s, mn);
  if (mn.t < 0.7) return;
  for (const t of s.tanks) {
    if (t.alive && t.id !== mn.owner && dist2(t, mn) < 17 * 17) return detonate(s, mn);
  }
}

function detonate(s, mn) {
  if (mn.dead) return;
  mn.dead = true;
  explode(s, mn.x, mn.y, 28, mn.owner);
}

function explode(s, x, y, r, owner) {
  s.fx.push({ type: 'boom', x, y, r, t: 0, life: 0.5 });
  s.events.push({ type: 'boom', big: r > 24 });
  for (const t of s.tanks) {
    if (t.alive && t.id !== owner && dist2(t, { x, y }) < (r + TANK_R) ** 2) hitTank(s, t, owner, 'boom', 1);
  }
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE), y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
    if ((cx - x) ** 2 + (cy - y) ** 2 < (r + 6) ** 2) damageCrate(s, cx, cy, 9);
  }
  for (const sh of s.shells) if (!sh.dead && (sh.x - x) ** 2 + (sh.y - y) ** 2 < r * r) sh.dead = true;
  for (const mn of s.mines) if (!mn.dead && (mn.x - x) ** 2 + (mn.y - y) ** 2 < r * r) { mn.t = Math.max(mn.t, mn.fuse - 0.15); }
}

function damageCrate(s, px, py, n) {
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
  const i = y * COLS + x;
  if (s.map.grid[i] !== CRATE) return;
  s.map.crateHp[i] = Math.max(0, s.map.crateHp[i] - n);
  if (s.map.crateHp[i] === 0) {
    s.map.grid[i] = FLOOR;
    s.fx.push({ type: 'debris', x: x * TILE + 8, y: y * TILE + 8, t: 0, life: 0.6 });
    s.events.push({ type: 'crate', x, y });
  } else s.events.push({ type: 'crack' });
  s.mapVer = (s.mapVer || 0) + 1;
}

function hitTank(s, t, by, kind, bounces) {
  if (!t.alive || t.prot > 0) return;
  if (t.shield) {
    t.shield = false; t.power = null; t.powerT = 0;
    s.fx.push({ type: 'shieldpop', x: t.x, y: t.y, t: 0, life: 0.4 });
    s.events.push({ type: 'shield', id: t.id });
    return;
  }
  t.alive = false; t.deaths++; t.streak = 0;
  t.respawnT = s.mode === 'lts' ? 0 : 3;
  t.power = null; t.shield = false; t.ammo = 'shell';
  const killer = s.tanks.find((o) => o.id === by);
  if (killer && killer !== t) {
    killer.kills++; killer.streak++; killer.bestStreak = Math.max(killer.bestStreak, killer.streak);
    if (s.mode === 'frenzy' || s.mode === 'bounce') killer.score++;
  }
  s.fx.push({ type: 'wreck', x: t.x, y: t.y, t: 0, life: 1.2, color: t.color }, { type: 'boom', x: t.x, y: t.y, r: 14, t: 0, life: 0.5 });
  s.events.push({ type: 'kill', id: t.id, by, kind, bounces });
  s.wrecks = s.wrecks || [];
  s.wrecks.push({ x: t.x, y: t.y, a: t.body, color: t.color });
  if (s.wrecks.length > 6) s.wrecks.shift();
}

// ---------- bots ----------
function walkable(s, x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  return !tankSolid(s.map.grid[y * COLS + x]);
}

function flowField(s, gx, gy) {
  const dist = new Int16Array(COLS * ROWS).fill(-1);
  const q = [gy * COLS + gx];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % COLS, y = (i / COLS) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(s, nx, ny)) continue;
      const j = ny * COLS + nx;
      if (dist[j] >= 0) continue;
      dist[j] = dist[i] + 1; q.push(j);
    }
  }
  return dist;
}

function visibleTo(t, o) {
  if (!o.alive || o.prot > 0.5) return false;
  const d = Math.sqrt(dist2(t, o));
  if (o.power === 'cloak' && d > 36) return false;
  return true;
}

function aiThink(s, t, dt, frozen) {
  const L = LEVELS[t.level] || LEVELS.normal;
  const ai = t.ai || (t.ai = { next: 0, goal: null, field: null, fieldKey: '', stuck: 0, lx: t.x, ly: t.y, wander: 0, wanderA: 0, shot: null, dodge: null, dodgeT: 0 });
  const inp = t.input;
  if (frozen || !t.alive) { inp.mx = inp.my = 0; return; }
  ai.next -= dt;
  const foes = s.tanks.filter((o) => o !== t && visibleTo(t, o));
  if (ai.next <= 0) {
    ai.next = L.think * (0.7 + s.rand() * 0.6);
    // 1. find a shot
    ai.shot = null;
    const maxB = t.ammo === 'laser' ? 3 : t.ammo === 'blaster' ? 0 : t.ammo === 'homing' ? 2 : 1;
    const len = t.ammo === 'laser' ? 600 : t.ammo === 'rocket' ? 520 : 380;
    const near = foes.slice().sort((a, b) => dist2(t, a) - dist2(t, b)).slice(0, 3);
    for (const o of near) {
      const a = Math.atan2(o.y - t.y, o.x - t.x);
      const r = trace(s, t.x, t.y, a, maxB, len, t.id);
      if (r.tank === o && (s.mode !== 'bounce' || r.bounces > 0)) { ai.shot = a; break; }
    }
    if (ai.shot == null && L.search && foes.length) {
      const off = s.rand() * TAU;
      for (let k = 0; k < L.search; k++) {
        const a = off + (k / L.search) * TAU;
        const r = trace(s, t.x, t.y, a, maxB, len, t.id);
        if (r.tank && r.tank !== t && foes.includes(r.tank) && (s.mode !== 'bounce' || r.bounces > 0)) { ai.shot = a; break; }
      }
    }
    // 2. pick where to go
    let goal = null;
    const item = s.items.filter((it) => dist2(it, t) < 120 * 120).sort((a, b) => dist2(a, t) - dist2(b, t))[0];
    if (s.hill && (t.level !== 'easy' || s.rand() < 0.6)) goal = s.hill;
    else if (item) goal = item;
    else if (foes.length) goal = foes.slice().sort((a, b) => dist2(t, a) - dist2(t, b))[0];
    else goal = s.items[0] || s.map.spawns[t.slot % s.map.spawns.length];
    ai.goal = goal;
    if (goal) {
      const gx = clamp(Math.floor(goal.x / TILE), 0, COLS - 1), gy = clamp(Math.floor(goal.y / TILE), 0, ROWS - 1);
      const key = gx + ',' + gy + ',' + (s.mapVer || 0);
      if (key !== ai.fieldKey) { ai.field = flowField(s, gx, gy); ai.fieldKey = key; }
      ai.keep = goal === s.hill || goal === item ? 0 : L.keep;
    }
    // 3. dodge incoming shells
    ai.dodge = null;
    if (L.dodge && s.rand() < L.dodge) {
      for (const sh of s.shells) {
        if (sh.owner === t.id) continue;
        const rx = t.x - sh.x, ry = t.y - sh.y;
        const sp2 = sh.vx * sh.vx + sh.vy * sh.vy;
        const tt = (rx * sh.vx + ry * sh.vy) / sp2;
        if (tt < 0 || tt > 0.9) continue;
        const cx = sh.x + sh.vx * tt - t.x, cy = sh.y + sh.vy * tt - t.y;
        if (cx * cx + cy * cy < 14 * 14) {
          const px = -sh.vy, py = sh.vx; const sgn = (px * -cx + py * -cy) >= 0 ? 1 : -1;
          ai.dodge = { x: px * sgn, y: py * sgn }; ai.dodgeT = 0.4; break;
        }
      }
      for (const mn of s.mines) if (mn.owner !== t.id && dist2(mn, t) < 34 * 34) { ai.dodge = { x: t.x - mn.x, y: t.y - mn.y }; ai.dodgeT = 0.5; }
    }
    // 4. mines
    if (t.level !== 'easy' && foes.some((o) => dist2(o, t) < 46 * 46) && s.rand() < 0.25) inp.mine++;
  }
  // aim
  if (ai.shot != null) {
    inp.aim = ai.shot + (s.rand() - 0.5) * L.err * 2 * 0.3;
    if (!ai.err || s.rand() < 0.05) ai.err = (s.rand() - 0.5) * L.err * 2;
    inp.aim = ai.shot + ai.err;
    if (Math.abs(angDiff(inp.aim, t.aim)) < 0.08 && canFire(s, t) && s.rand() < L.fire * dt * 6) inp.fire++;
  } else if (foes.length) {
    const o = foes.reduce((a, b) => (dist2(t, a) < dist2(t, b) ? a : b));
    inp.aim = Math.atan2(o.y - t.y, o.x - t.x);
  }
  // move
  ai.dodgeT -= dt;
  if (ai.dodge && ai.dodgeT > 0) { const m = Math.hypot(ai.dodge.x, ai.dodge.y) || 1; inp.mx = ai.dodge.x / m; inp.my = ai.dodge.y / m; }
  else if (ai.wander > 0) { ai.wander -= dt; inp.mx = Math.cos(ai.wanderA); inp.my = Math.sin(ai.wanderA); }
  else if (ai.field) {
    const tx = Math.floor(t.x / TILE), ty = Math.floor(t.y / TILE);
    const here = ai.field[ty * COLS + tx];
    if (here >= 0 && here <= (ai.keep || 0)) {
      // in range: strafe a little, or sit still on the hill
      if (ai.keep) { ai.strafe = (ai.strafe || 0) - dt; if (ai.strafe <= 0) { ai.strafe = 1 + s.rand() * 1.5; ai.strafeA = s.rand() * TAU; } inp.mx = Math.cos(ai.strafeA) * 0.6; inp.my = Math.sin(ai.strafeA) * 0.6; }
      else { const g = ai.goal; inp.mx = clamp((g.x - t.x) / 8, -1, 1); inp.my = clamp((g.y - t.y) / 8, -1, 1); }
    } else {
      let best = null, bd = here >= 0 ? here : 9999;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const v = ai.field[(ty + dy) * COLS + tx + dx];
        if (v >= 0 && v < bd) { bd = v; best = [dx, dy]; }
      }
      if (best) {
        const cx = (tx + best[0]) * TILE + TILE / 2, cy = (ty + best[1]) * TILE + TILE / 2;
        // keep to the middle of the lane so corners don't snag
        const ex = best[0] ? cx - t.x : (tx * TILE + TILE / 2 - t.x) * 2;
        const ey = best[1] ? cy - t.y : (ty * TILE + TILE / 2 - t.y) * 2;
        const m = Math.hypot(ex, ey) || 1;
        inp.mx = ex / m; inp.my = ey / m;
      } else { inp.mx = inp.my = 0; }
    }
  } else { inp.mx = inp.my = 0; }
  // stuck?
  ai.stuck += dt;
  if (ai.stuck > 1) {
    const moved = Math.hypot(t.x - ai.lx, t.y - ai.ly);
    if (moved < 4 && Math.hypot(inp.mx, inp.my) > 0.3) { ai.wander = 0.6; ai.wanderA = s.rand() * TAU; }
    ai.stuck = 0; ai.lx = t.x; ai.ly = t.y;
  }
}

// ---------- round state ----------
export function aliveCount(s) { return s.tanks.filter((t) => t.alive).length; }

export function mapConnected(def) {
  const map = buildMap(def);
  const s = { map };
  const sp = map.spawns[0];
  const f = flowField(s, Math.floor(sp.x / TILE), Math.floor(sp.y / TILE));
  return map.spawns.every((p) => f[Math.floor(p.y / TILE) * COLS + Math.floor(p.x / TILE)] >= 0)
    && map.hills.every((p) => f[Math.floor(p.y / TILE) * COLS + Math.floor(p.x / TILE)] >= 0);
}
