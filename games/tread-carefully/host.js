// Tread Carefully: a free-for-all pixel tank battle. The TV runs the simulation
// and draws the arena; phones are controllers (drag to aim, tap to fire).
import * as E from './engine.js';
import { MAPS, buildMap } from './maps.js';
import * as A from './art.js';
import { createSound, createMusic } from './sound.js';

const BOT_NAMES = ['Rusty', 'Sprocket', 'Clank', 'Rivet', 'Dozer', 'Gizmo', 'Tinker', 'Bolt'];
const STEP = 1 / 60;
const LTS_ROUND_SECS = 120;
const HILL_TARGET = 60;

export function installStyle(ctx) {
  const id = 'tread-carefully-style';
  let link = document.getElementById(id);
  if (link?.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    if (!link) {
      link = Object.assign(document.createElement('link'), { id, rel: 'stylesheet', href: ctx.asset('style.css') });
      document.head.append(link);
    }
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
    setTimeout(resolve, 1500);
  });
}

export default async function (ctx) {
  const cleanups = [];
  try { await game(ctx, cleanups); } finally { for (const f of cleanups) try { f(); } catch {} }
}

async function game(ctx, cleanups) {
  const { h } = ctx;
  await installStyle(ctx);
  ctx.el.classList.add('tc-stage');
  ctx.music(null);
  const sound = createSound(ctx);
  const music = createMusic(ctx);
  cleanups.push(() => music.stop());
  music.play('bg_main');
  const fast = new URLSearchParams(location.search).has('fast');

  const humans = ctx.connected.slice(0, 8);
  if (humans.length < 1) { music.stop(); return ctx.say('No drivers yet', 'Join on your phone to play Tread Carefully.', 4000); }
  const humanIds = new Set(humans.map((p) => p.id));
  const match = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const items = Object.fromEntries(E.ITEM_KINDS.map((k) => [k, true]));
  const settings = {
    mode: 'lts', map: 'cycle', bots: Math.max(humans.length === 1 ? 1 : 0, 4 - humans.length), level: 'normal',
    target: 3, minutes: 3, items,
  };
  let phase = 'setup', started = false, leave = false;
  // each driver gets the free tank colour closest to their Party Hall colour
  const tankColor = new Map();
  {
    const rgbOf = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const free = new Set(A.TANK_COLORS);
    for (const p of humans) {
      const want = rgbOf(p.color);
      let best = [...free][0], bd = Infinity;
      if (want) for (const c of free) { const v = rgbOf(c); const d = (v[0] - want[0]) ** 2 + (v[1] - want[1]) ** 2 + (v[2] - want[2]) ** 2; if (d < bd) { bd = d; best = c; } }
      free.delete(best); tankColor.set(p.id, best);
    }
  }
  const captain = () => humans.find((p) => ctx.player(p.id)?.connected) || humans[0];

  // ---------- phone messages ----------
  let M = null, s = null; // match state and round state
  ctx.on('message', (p, data) => {
    if (!p || !humanIds.has(p.id) || !data || data.match !== match) return;
    if (data.type === 'settings' && phase === 'setup' && p.id === captain()?.id) { applySettings(data); return; }
    if (data.type === 'leave' && phase === 'results' && p.id === captain()?.id) { leave = true; return; }
    if (data.type === 'in' && s) {
      const t = s.tanks.find((x) => x.id === p.id);
      if (!t) return;
      const mx = Number(data.mx) || 0, my = Number(data.my) || 0;
      t.input.mx = Math.max(-1, Math.min(1, mx)); t.input.my = Math.max(-1, Math.min(1, my));
      if (typeof data.aim === 'number' && Number.isFinite(data.aim)) t.input.aim = data.aim;
      if (Number.isInteger(data.fire)) t.input.fire = data.fire;
      if (Number.isInteger(data.mine)) t.input.mine = data.mine;
    }
  });
  ctx.on('join', (p) => {
    if (phase === 'setup') drawSetup();
    else if (humanIds.has(p.id)) { sendPhoneView(p.id); lastStatus.delete(p.id); }
  });
  ctx.on('leave', () => { if (phase === 'setup') drawSetup(); });

  function applySettings(d) {
    if (E.MODES[d.mode]) settings.mode = d.mode;
    if (d.map === 'cycle' || MAPS.some((m) => m.id === d.map)) settings.map = d.map;
    if (Number.isInteger(d.bots)) settings.bots = Math.max(humans.length === 1 ? 1 : 0, Math.min(8 - humans.length, d.bots));
    if (E.LEVELS[d.level]) settings.level = d.level;
    if ([2, 3, 5].includes(d.target)) settings.target = d.target;
    if ([2, 3, 5].includes(d.minutes)) settings.minutes = d.minutes;
    if (typeof d.item === 'string' && d.item in settings.items) settings.items[d.item] = !settings.items[d.item];
    if (d.items === 'all' || d.items === 'none') for (const k of E.ITEM_KINDS) settings.items[k] = d.items === 'all';
    if (d.start === true) started = true;
    else drawSetup();
  }

  // ---------- setup screen ----------
  const previews = new Map();
  const preview = (def) => { if (!previews.has(def.id)) previews.set(def.id, A.mapPreview(buildMap(def), 1)); const c = previews.get(def.id); const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; k.getContext('2d').drawImage(c, 0, 0); return k; };
  function drawSetup() {
    if (phase !== 'setup') return;
    const set = (d) => () => applySettings(d);
    const timed = settings.mode !== 'lts';
    const total = humans.length + settings.bots;
    const mapDef = MAPS.find((m) => m.id === settings.map);
    ctx.el.replaceChildren(h('div.tc-root', h('div.tc-setup',
      h('div',
        h('div.tc-head', A.tankIcon('#e8483b', 3), h('div', h('h1.tc-title', 'Tread Carefully'), h('p', 'Pixel tanks, bouncing shells, no mercy. Every tank for itself.'))),
        h('h2', 'Game mode'),
        h('div.tc-modes', Object.entries(E.MODES).map(([id, m]) => h(`button.tc-opt${settings.mode === id ? '.on' : ''}`, { onclick: set({ mode: id }) }, h('b', m.name), h('span', m.desc)))),
        h('h2', 'Arena'),
        h('div.tc-maps',
          h(`button.tc-map${settings.map === 'cycle' ? '.on' : ''}`, { onclick: set({ map: 'cycle' }) }, h('div.rot', 'ALL 6'), 'Rotate'),
          MAPS.map((m) => h(`button.tc-map${settings.map === m.id ? '.on' : ''}`, { onclick: set({ map: m.id }) }, preview(m), m.name))),
        h('p.tc-blurb', mapDef ? mapDef.blurb : timed ? 'A random arena for the match.' : 'A new arena every round, all six in turn.')),
      h('div',
        h('h2', 'Tanks'),
        h('div.tc-row', h('span.lbl', 'Computer tanks'), h('div.tc-step',
          h('button.tc-btn', { disabled: settings.bots <= (humans.length === 1 ? 1 : 0), onclick: set({ bots: settings.bots - 1 }), 'aria-label': 'Fewer computer tanks' }, '−'),
          h('b', String(settings.bots)),
          h('button.tc-btn', { disabled: total >= 8, onclick: set({ bots: settings.bots + 1 }), 'aria-label': 'More computer tanks' }, '+'))),
        h('div.tc-row', h('span.lbl', 'Bot skill'), ['easy', 'normal', 'hard'].map((l) => h(`button.tc-btn${settings.level === l ? '.on' : ''}`, { onclick: set({ level: l }) }, l[0].toUpperCase() + l.slice(1)))),
        timed
          ? h('div.tc-row', h('span.lbl', 'Match length'), [2, 3, 5].map((n) => h(`button.tc-btn${settings.minutes === n ? '.on' : ''}`, { onclick: set({ minutes: n }) }, `${n} min`)))
          : h('div.tc-row', h('span.lbl', 'Round wins'), [2, 3, 5].map((n) => h(`button.tc-btn${settings.target === n ? '.on' : ''}`, { onclick: set({ target: n }) }, `First to ${n}`))),
        h('h2', 'Ammo and power-ups'),
        h('div.tc-row', h('button.tc-btn', { onclick: set({ items: 'all' }) }, 'All on'), h('button.tc-btn', { onclick: set({ items: 'none' }) }, 'All off'),
          h('span', { style: { fontSize: '.67em', color: '#d9d4c4' } }, 'Tap one to switch it.')),
        h('div.tc-items', E.ITEM_KINDS.map((k) => h(`button.tc-item${settings.items[k] ? '' : '.off'}`, { onclick: set({ item: k }), 'aria-pressed': !!settings.items[k], title: (E.AMMO[k] || E.POWERS[k]).desc },
          A.iconCanvas(k, 3), (E.AMMO[k] || E.POWERS[k]).name))),
        h('button.tc-start', { onclick: () => { started = true; } }, `Roll out · ${total} tanks`),
        h('p.tc-note', `${captain()?.name || 'The first player'} can also set this up and start from their phone.`)))));
    for (const p of humans) sendPhoneView(p.id);
  }

  // ---------- phones ----------
  const lastStatus = new Map();
  function sendPhoneView(id) {
    const p = ctx.player(id);
    if (!p) return;
    const t = M?.tanks.find((x) => x.id === id);
    ctx.show(id, { tc: {
      match, phase, captain: captain()?.id === id, captainName: captain()?.name || 'The first player',
      settings, humans: humans.length, color: t?.color || tankColor.get(id) || p.color, name: p.name,
      results: phase === 'results' ? resultsFor(id) : null,
    } });
  }
  function statusFor(t) {
    const mode = s?.mode || settings.mode;
    return {
      alive: t.alive, respawn: t.alive ? 0 : Math.ceil(t.respawnT), ammo: t.ammo, ammoLeft: t.ammoLeft, power: t.power,
      powerT: t.power ? Math.ceil(t.powerT) : 0, shield: t.shield, mines: 2 + Math.min(3, t.extraMines),
      minesOut: s ? s.mines.filter((m) => m.owner === t.id).length : 0,
      score: mode === 'lts' ? t.wins : t.score, kills: t.kills, mode, frozen: !!s?.frozen, out: mode === 'lts' && !t.alive,
      round: M?.round || 0, color: t.color,
    };
  }
  function pushStatus(force = false) {
    if (!M) return;
    for (const t of M.tanks) {
      if (t.cpu) continue;
      const st = statusFor(t);
      const key = JSON.stringify(st);
      if (!force && lastStatus.get(t.id) === key) continue;
      lastStatus.set(t.id, key);
      ctx.send(t.id, { tc: 'status', match, ...st });
    }
  }
  function buzz(id, kind) { if (humanIds.has(id)) ctx.send(id, { tc: 'buzz', match, kind }); }

  // ---------- setup wait ----------
  drawSetup();
  while (!started) await ctx.sleep(150);
  phase = 'play';

  // entrants
  const used = new Set();
  const entrants = humans.map((p) => {
    const c = tankColor.get(p.id);
    used.add(c);
    return { id: p.id, name: p.name, color: c };
  });
  for (let i = 0; i < settings.bots; i++) {
    const c = A.TANK_COLORS.find((x) => !used.has(x)); used.add(c);
    entrants.push({ id: `cpu${i}`, name: BOT_NAMES[i], color: c, cpu: true, level: settings.level });
  }
  M = E.createMatch(settings, entrants);
  for (const p of humans) sendPhoneView(p.id);
  music.play('bg_battle');

  // ---------- arena DOM ----------
  const board = h('div.tc-board');
  const canvas = h('canvas.tc-main');
  const banner = h('div.tc-banner.hidden');
  const feed = h('div.tc-feed');
  const info = h('div.tc-info');
  const arena = h('div.tc-arena', canvas, banner, feed, info);
  const g = canvas.getContext('2d');
  const pix = document.createElement('canvas'); pix.width = A.W; pix.height = A.H;
  const pg = pix.getContext('2d');
  let scale = 1, dpr = 1;
  function fit() {
    const r = arena.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = window.devicePixelRatio || 1;
    scale = Math.max(0.5, Math.min(r.width / A.W, (r.height - 4) / A.H));
    canvas.style.width = `${Math.floor(A.W * scale)}px`; canvas.style.height = `${Math.floor(A.H * scale)}px`;
    canvas.width = Math.floor(A.W * scale * dpr); canvas.height = Math.floor(A.H * scale * dpr);
  }
  const ro = new ResizeObserver(fit);
  ro.observe(arena);
  cleanups.push(() => ro.disconnect());

  const icons = new Map(M.tanks.map((t) => [t.id, A.tankIcon(t.color, 2)]));
  let boardKey = '';
  function drawBoard() {
    const lts = settings.mode === 'lts';
    const key = M.tanks.map((t) => `${t.alive}${lts ? t.wins : t.score}`).join('|');
    if (key === boardKey) return;
    boardKey = key;
    board.replaceChildren(...M.tanks.map((t) => {
      const ic = document.createElement('canvas'); const src = icons.get(t.id); ic.width = src.width; ic.height = src.height; ic.getContext('2d').drawImage(src, 0, 0);
      return h(`div.tc-chip${s && !t.alive ? '.dead' : ''}`, { style: { '--pc': t.color } }, ic, h('span.nm', t.name + (t.cpu ? ' 🤖' : '')),
        lts ? h('span.pips', Array.from({ length: settings.target }, (_, i) => h(`i${i < t.wins ? '.on' : ''}`))) : h('span.sc', String(t.score)));
    }));
  }
  let feedItems = [];
  function addFeed(text, color) {
    feedItems.push({ text, color, at: performance.now() });
    feedItems = feedItems.slice(-3);
    feed.replaceChildren(...feedItems.map((f) => h('div', { style: { '--pc': f.color } }, f.text)));
  }
  function showBanner(title, sub) {
    if (!title) { banner.classList.add('hidden'); return; }
    banner.replaceChildren(h('h1', title), sub ? h('p', sub) : '');
    banner.classList.remove('hidden');
  }

  // ---------- one round ----------
  let mapOrder = ctx.shuffle([...MAPS]);
  function pickMap() {
    if (settings.map !== 'cycle') return MAPS.find((m) => m.id === settings.map);
    if (!mapOrder.length) mapOrder = ctx.shuffle([...MAPS]);
    return mapOrder.shift();
  }

  async function playRound(mapDef, secs) {
    M.round++;
    s = E.startRound(M, mapDef);
    const renderer = A.createRenderer(s.map);
    feedItems = []; feed.replaceChildren();
    ctx.el.replaceChildren(h('div.tc-root', board, arena));
    boardKey = ''; drawBoard(); fit();
    info.textContent = `${E.MODES[s.mode].name} · ${mapDef.name}${s.mode === 'lts' ? ` · Round ${M.round}` : ''}`;
    let running = true, last = performance.now(), acc = 0, raf = 0, endAt = 0, statusT = 0;
    const nameFont = () => Math.round(Math.max(20, scale * 5.4) * dpr);
    const frame = (now) => {
      if (!running) return;
      acc += Math.min(0.1, (now - last) / 1000); last = now;
      while (acc >= STEP) {
        E.step(s, STEP);
        handleEvents(renderer);
        acc -= STEP;
      }
      renderer.draw(pg, s, now / 1000);
      g.imageSmoothingEnabled = false;
      g.drawImage(pix, 0, 0, canvas.width, canvas.height);
      // names
      const k = canvas.width / A.W;
      g.font = `700 ${nameFont()}px 'DotGothic16', monospace`; g.textAlign = 'center'; g.textBaseline = 'bottom';
      g.lineWidth = Math.max(3, nameFont() / 5); g.strokeStyle = '#000'; g.lineJoin = 'round';
      for (const t of s.tanks) {
        if (!t.alive || t.power === 'cloak') continue;
        if (s.map.grid[Math.floor(t.y / 16) * 28 + Math.floor(t.x / 16)] === 4) continue; // hidden in a bush
        const x = t.x * k, y = (t.y - 11) * k;
        g.strokeText(t.name, x, y); g.fillStyle = t.color; g.fillText(t.name, x, y);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    pushStatus(true);
    try {
      // countdown
      for (const n of ['3', '2', '1']) {
        showBanner(n, s.mode === 'lts' ? `Round ${M.round} · ${mapDef.name}` : `${E.MODES[s.mode].name} · ${mapDef.name}`);
        sound.play('count'); await ctx.sleep(fast ? 250 : 800);
      }
      showBanner('GO!', mapDef.blurb); sound.play('go');
      s.frozen = false; pushStatus(true);
      endAt = performance.now() + secs * 1000;
      const stopClock = ctx.clock(secs);
      let goT = performance.now(), lastDeadT = 0;
      try {
        while (true) {
          await ctx.sleep(100);
          if (banner && !banner.classList.contains('hidden') && performance.now() - goT > 900 && !lastDeadT) showBanner(null);
          drawBoard();
          statusT += 0.1;
          pushStatus();
          // autopilot for drivers who dropped out
          for (const t of s.tanks) if (!t.cpu) {
            const on = !!ctx.player(t.id)?.connected;
            if (!on) { t.offT = (t.offT || 0) + 0.1; if (t.offT > 3 && !t.autopilot) { t.autopilot = true; t.level = 'normal'; addFeed(`${t.name} is on autopilot`, t.color); } }
            else { t.offT = 0; if (t.autopilot) { t.autopilot = false; t.input.mx = t.input.my = 0; } }
          }
          if (performance.now() >= endAt) break;
          if (s.mode === 'lts') {
            const alive = E.aliveCount(s);
            if (alive <= 1) { if (!lastDeadT) lastDeadT = performance.now(); if (performance.now() - lastDeadT > 1500) break; }
          }
          if (s.mode === 'hill' && s.tanks.some((t) => t.score >= HILL_TARGET)) break;
        }
      } finally { stopClock(); }
      s.frozen = true;
      for (const t of s.tanks) { t.input.mx = t.input.my = 0; }
      drawBoard(); pushStatus(true);
    } catch (e) { running = false; cancelAnimationFrame(raf); throw e; }
    return { stop: () => { running = false; cancelAnimationFrame(raf); } };
  }

  function nameOf(id) { return M.tanks.find((t) => t.id === id); }
  function handleEvents(renderer) {
    for (const ev of s.events) {
      switch (ev.type) {
        case 'fire': sound.play(ev.kind === 'shell' ? 'fire' : ev.kind); break;
        case 'bounce': sound.play('bounce'); break;
        case 'fizz': sound.play('fizz'); break;
        case 'clash': sound.play('clash'); break;
        case 'boom': sound.play(ev.big ? 'bigboom' : 'boom'); break;
        case 'crate': sound.play('crate'); renderer.decal({ type: 'scorch', x: ev.x * 16 + 8, y: ev.y * 16 + 8, r: 10 }); break;
        case 'crack': sound.play('crack'); break;
        case 'item': sound.play('item'); break;
        case 'tele': sound.play('tele'); break;
        case 'mine': sound.play('mine'); break;
        case 'spawn': sound.play('spawn'); buzz(ev.id, 'spawn'); break;
        case 'hill': sound.play('hill'); if (s.t > 1) addFeed('The hill moved!', '#ffd84a'); break;
        case 'tread': renderer.decal(ev); break;
        case 'pickup': {
          sound.play('pickup');
          const t = nameOf(ev.id); const it = E.AMMO[ev.kind] || E.POWERS[ev.kind];
          if (t && !t.cpu) buzz(t.id, 'pickup');
          if (t) addFeed(`${t.name} grabbed ${it.name}`, t.color);
          break;
        }
        case 'shield': sound.play('shield'); buzz(ev.id, 'hit'); break;
        case 'kill': {
          sound.play('kill');
          const v = nameOf(ev.id), k = nameOf(ev.by);
          renderer.decal({ type: 'scorch', x: v.x, y: v.y, r: 16 });
          buzz(ev.id, 'dead');
          if (k && k !== v) {
            buzz(k.id, 'kill');
            const how = ev.kind === 'boom' ? 'blew up' : ev.kind === 'laser' ? 'zapped' : ev.bounces >= 2 ? `banked ${ev.bounces} walls to get` : ev.bounces === 1 ? 'bank-shot' : 'shelled';
            addFeed(`${k.name} ${how} ${v.name}`, k.color);
          } else addFeed(`${v.name} is out`, v.color);
          break;
        }
        case 'tick': break;
        default: break;
      }
    }
  }

  // ---------- the match ----------
  let roundCtl = null;
  try {
    if (settings.mode === 'lts') {
      const cap = settings.target * 3 + 2;
      while (M.tanks.every((t) => t.wins < settings.target) && M.round < cap) {
        const def = pickMap();
        roundCtl = await playRound(def, LTS_ROUND_SECS);
        const alive = s.tanks.filter((t) => t.alive);
        let title, sub;
        if (alive.length === 1) {
          alive[0].wins++; title = `${alive[0].name} wins!`; sub = `Round ${M.round} goes to the last tank standing.`; sound.play('round');
          buzz(alive[0].id, 'win');
        } else { title = 'Draw!'; sub = alive.length ? 'Time ran out with tanks still rolling.' : 'Nobody survived that one.'; }
        boardKey = ''; drawBoard();
        const lead = M.tanks.slice().sort((a, b) => b.wins - a.wins)[0];
        showBanner(title, lead.wins >= settings.target ? `${lead.name} takes the match!` : `${sub} First to ${settings.target} round wins.`);
        await ctx.sleep(fast ? 800 : 3200);
        roundCtl.stop(); roundCtl = null;
      }
    } else {
      const def = pickMap();
      const secs = fast ? 25 : settings.minutes * 60;
      roundCtl = await playRound(def, secs);
      showBanner(settings.mode === 'hill' && M.tanks.some((t) => t.score >= HILL_TARGET) ? 'King of the hill!' : 'Time!', 'Counting up the wreckage…');
      sound.play('round');
      await ctx.sleep(fast ? 800 : 2600);
      roundCtl.stop(); roundCtl = null;
    }
  } finally {
    roundCtl?.stop();
    ro.disconnect();
  }

  // ---------- results ----------
  phase = 'results';
  s = null;
  const lts = settings.mode === 'lts';
  const ranking = M.tanks.slice().sort((a, b) => (lts ? b.wins - a.wins : b.score - a.score) || b.kills - a.kills || a.deaths - b.deaths);
  const top = ranking[0];
  const tie = ranking[1] && (lts ? ranking[1].wins === top.wins : ranking[1].score === top.score) && ranking[1].kills === top.kills && ranking[1].deaths === top.deaths;
  function resultsFor(id) {
    const i = ranking.findIndex((t) => t.id === id);
    const t = ranking[i];
    if (!t) return null;
    return { place: i + 1, of: ranking.length, winner: i === 0 && !tie, kills: t.kills, deaths: t.deaths, score: lts ? t.wins : t.score, mode: settings.mode, winnerName: tie ? 'A tie' : top.name };
  }
  const unit = { lts: 'round wins', frenzy: 'knockouts', hill: 'hill points', bounce: 'bank-shot KOs' }[settings.mode];
  const val = (t) => (lts ? t.wins : t.score);
  const awards = [];
  const most = (f) => M.tanks.slice().sort((a, b) => f(b) - f(a))[0];
  const hunter = most((t) => t.kills); if (hunter.kills > 0) awards.push(['Top gun', `${hunter.name} · ${hunter.kills} KOs`]);
  const streak = most((t) => t.bestStreak); if (streak.bestStreak >= 3) awards.push(['On a roll', `${streak.name} · ${streak.bestStreak} in a row`]);
  const survivor = M.tanks.slice().sort((a, b) => a.deaths - b.deaths)[0]; awards.push(['Hard to hit', `${survivor.name} · ${survivor.deaths} wrecks`]);
  for (const p of humans) sendPhoneView(p.id);
  sound.play('win');
  music.play('bg_main');
  const podium = ranking.slice(0, 3);
  const order = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;
  ctx.el.replaceChildren(h('div.tc-root', h('div.tc-results',
    h('h1.tc-title', tie ? 'A dead heat!' : `${top.name} wins!`),
    h('div.tc-podium', order.map((t) => h(`div.tc-pod${t === top ? '.first' : ''}`, { style: { '--pc': t.color } },
      A.tankIcon(t.color, 3), h('b', `${ranking.indexOf(t) + 1}. ${t.name}`), h('span', `${val(t)} ${unit}`)))),
    h('table.tc-table', h('tr', h('th', '#'), h('th', 'Tank'), h('th', lts ? 'Wins' : 'Score'), h('th', 'KOs'), h('th', 'Wrecks')),
      ranking.map((t, i) => h('tr', h('td', String(i + 1)), h('td', h('span.pname', { style: { '--pc': t.color } }, t.name)), h('td', String(val(t))), h('td', String(t.kills)), h('td', String(t.deaths))))),
    h('div.tc-awards', awards.map(([a, b]) => h('div', h('b', a), ' ', b))),
    h('button.tc-start', { onclick: () => { leave = true; } }, 'Back to the lobby'))));
  const until = Date.now() + 25000;
  try { while (!leave && Date.now() < until) await ctx.sleep(200); } finally { music.stop(); }
}
