// Tread Carefully: the phone controller. Left pad drives, right pad aims:
// drag to turn the turret, tap to fire (a tap points the turret where you tapped).
import * as E from './engine.js';
import { MAPS } from './maps.js';
import * as A from './art.js';

export default async function (ctx) {
  const { h } = ctx;
  if (!document.getElementById('tread-carefully-style')) {
    document.head.append(Object.assign(document.createElement('link'), { id: 'tread-carefully-style', rel: 'stylesheet', href: ctx.asset('style.css') }));
  }
  let view = null, status = null, ctl = null;
  const input = { mx: 0, my: 0, aim: null, fire: 0, mine: 0 };
  let sendT = 0, dirty = false, lastSend = 0;
  const send = (d) => view && ctx.send({ ...d, match: view.match });

  function flush() {
    if (!view || view.phase !== 'play') return;
    send({ type: 'in', mx: +input.mx.toFixed(2), my: +input.my.toFixed(2), aim: input.aim == null ? null : +input.aim.toFixed(3), fire: input.fire, mine: input.mine });
    dirty = false; lastSend = performance.now();
  }
  function changed(now = false) {
    dirty = true;
    if (now || performance.now() - lastSend > 45) flush();
    else if (!sendT) sendT = setTimeout(() => { sendT = 0; if (dirty) flush(); }, 50);
  }
  setInterval(() => { if (view?.phase === 'play' && performance.now() - lastSend > 1000) flush(); }, 500);

  ctx.on('view', (v) => {
    if (!v?.tc) { view = null; ctl = null; document.body.classList.remove('tc-phone'); ctx.renderView(v); return; }
    const prev = view;
    view = v.tc;
    document.body.classList.add('tc-phone');
    if (prev?.match !== view.match) { input.fire = 0; input.mine = 0; }
    draw();
  });
  ctx.on('message', (m) => {
    if (!m || !view || m.match !== view.match) return;
    if (m.tc === 'status') { status = m; if (ctl) ctl.update(); }
    if (m.tc === 'buzz' && navigator.vibrate) navigator.vibrate({ dead: [60, 40, 160], hit: 60, kill: [30, 30, 30], win: [40, 30, 40, 30, 120], pickup: 25, spawn: 25 }[m.kind] || 30);
  });

  function draw() {
    ctl = null;
    if (view.phase === 'setup') return view.captain ? setupPanel() : waiting();
    if (view.phase === 'results') return results();
    controller();
  }

  function waiting() {
    ctx.el.replaceChildren(h('div.tc-p', { style: { '--pc': view.color } },
      h('h2.center', 'Tread Carefully'),
      A.tankIcon(view.color, 6), h('p.center', 'This is your tank.'),
      h('p.center.dim', `${view.captainName} is picking the mode and arena on the TV or their phone.`),
      h('p.center.dim', 'Left pad drives. Right pad aims: drag to turn your turret, tap to fire.')));
    ctx.el.querySelector('canvas').className = 'big-tank';
  }

  function setupPanel() {
    const S = view.settings;
    const set = (d) => () => send({ type: 'settings', ...d });
    const timed = S.mode !== 'lts';
    const total = view.humans + S.bots;
    const minBots = view.humans === 1 ? 1 : 0;
    ctx.el.replaceChildren(h('div.tc-p.tc-scroll', { style: { '--pc': view.color } },
      h('h2', 'You set up the battle'),
      h('div.tc-modes', Object.entries(E.MODES).map(([id, m]) => h(`button.tc-opt${S.mode === id ? '.on' : ''}`, { onclick: set({ mode: id }) }, h('b', m.short), h('span', m.desc)))),
      h('h2', 'Arena'),
      h('div.tc-maps', h(`button.tc-btn${S.map === 'cycle' ? '.on' : ''}`, { onclick: set({ map: 'cycle' }) }, 'Rotate'),
        MAPS.map((m) => h(`button.tc-btn${S.map === m.id ? '.on' : ''}`, { onclick: set({ map: m.id }) }, m.name.split(' ')[0]))),
      h('div.tc-row', h('span.lbl', 'Bots'), h('div.tc-step',
        h('button.tc-btn', { disabled: S.bots <= minBots, onclick: set({ bots: S.bots - 1 }), 'aria-label': 'Fewer computer tanks' }, '−'), h('b', String(S.bots)),
        h('button.tc-btn', { disabled: total >= 8, onclick: set({ bots: S.bots + 1 }), 'aria-label': 'More computer tanks' }, '+'))),
      h('div.tc-row', h('span.lbl', 'Bot skill'), ['easy', 'normal', 'hard'].map((l) => h(`button.tc-btn${S.level === l ? '.on' : ''}`, { onclick: set({ level: l }) }, l[0].toUpperCase() + l.slice(1)))),
      timed
        ? h('div.tc-row', h('span.lbl', 'Length'), [2, 3, 5].map((n) => h(`button.tc-btn${S.minutes === n ? '.on' : ''}`, { onclick: set({ minutes: n }) }, `${n} min`)))
        : h('div.tc-row', h('span.lbl', 'Wins'), [2, 3, 5].map((n) => h(`button.tc-btn${S.target === n ? '.on' : ''}`, { onclick: set({ target: n }) }, `First to ${n}`))),
      h('h2', 'Ammo & power-ups'),
      h('div.tc-row', h('button.tc-btn', { onclick: set({ items: 'all' }) }, 'All on'), h('button.tc-btn', { onclick: set({ items: 'none' }) }, 'All off')),
      h('div.tc-items', E.ITEM_KINDS.map((k) => h(`button.tc-item${S.items[k] ? '' : '.off'}`, { onclick: set({ item: k }), 'aria-pressed': !!S.items[k] },
        A.iconCanvas(k, 2), (E.AMMO[k] || E.POWERS[k]).name.split(' ')[0]))),
      h('button.tc-start', { onclick: set({ start: true }) }, `Roll out · ${total} tanks`)));
  }

  function results() {
    const r = view.results;
    ctx.el.replaceChildren(h('div.tc-p', { style: { '--pc': view.color } },
      h('h2.center', r?.winner ? 'You win!' : `${r?.winnerName || 'Someone'} wins`),
      A.tankIcon(view.color, 6),
      r ? h('p.center', `You came ${ordinal(r.place)} of ${r.of}.`) : '',
      r ? h('p.center.dim', `${r.kills} knockouts · ${r.deaths} wrecks`) : '',
      view.captain ? h('button.tc-start', { onclick: () => send({ type: 'leave' }) }, 'Back to the lobby') : h('p.center.dim', 'Look at the TV for the scores.')));
    ctx.el.querySelector('canvas').className = 'big-tank';
  }

  // ---------- the controller ----------
  function controller() {
    const icon = A.tankIcon(view.color, 2);
    const l1 = h('div.l1'), l2 = h('div.l2'), badge = h('div.badge');
    const hud = h('div.tc-hud', { style: { '--pc': view.color } }, icon, h('div.col', l1, l2), badge);
    const stat = h('div.tc-status');
    const moveC = h('canvas'), aimC = h('canvas');
    const movePad = h('div.tc-pad', moveC, h('div.cap', 'Drive'));
    const aimPad = h('div.tc-pad', aimC, h('div.cap', 'Drag to aim · tap to fire'));
    const mineBtn = h('button.tc-minebtn', { onclick: () => { input.mine++; changed(true); } }, 'Drop mine');
    const root = h('div.tc-p', { style: { '--pc': view.color } }, hud, stat, h('div.tc-pads', movePad, aimPad), mineBtn);
    ctx.el.replaceChildren(root);
    const size = () => {
      const top = root.getBoundingClientRect().top;
      root.style.height = `${Math.max(420, window.innerHeight - top - 20)}px`;
      for (const c of [moveC, aimC]) { const r = c.getBoundingClientRect(); c.width = r.width * devicePixelRatio; c.height = r.height * devicePixelRatio; }
      paint();
    };
    // drive: a floating stick wherever your thumb lands
    let mv = null; // { id, ox, oy, x, y }
    movePad.addEventListener('pointerdown', (e) => {
      e.preventDefault(); movePad.setPointerCapture(e.pointerId);
      const r = moveC.getBoundingClientRect();
      mv = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, x: e.clientX - r.left, y: e.clientY - r.top };
      paint();
    });
    movePad.addEventListener('pointermove', (e) => {
      if (!mv || e.pointerId !== mv.id) return;
      const r = moveC.getBoundingClientRect();
      mv.x = e.clientX - r.left; mv.y = e.clientY - r.top;
      const R = 48, dx = mv.x - mv.ox, dy = mv.y - mv.oy, d = Math.hypot(dx, dy);
      const k = d > R ? R / d : 1;
      input.mx = (dx * k) / R; input.my = (dy * k) / R;
      changed(); paint();
    });
    const moveEnd = (e) => { if (!mv || e.pointerId !== mv.id) return; mv = null; input.mx = input.my = 0; changed(true); paint(); };
    movePad.addEventListener('pointerup', moveEnd); movePad.addEventListener('pointercancel', moveEnd);
    // aim: direction from the pad's centre; a quick tap fires
    let am = null, flash = 0;
    const aimAt = (e) => {
      const r = aimC.getBoundingClientRect();
      const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
      if (Math.hypot(dx, dy) > Math.min(r.width, r.height) * 0.12) { input.aim = Math.atan2(dy, dx); changed(); }
    };
    aimPad.addEventListener('pointerdown', (e) => {
      e.preventDefault(); aimPad.setPointerCapture(e.pointerId);
      am = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), drag: false };
      aimAt(e); paint();
    });
    aimPad.addEventListener('pointermove', (e) => {
      if (!am || e.pointerId !== am.id) return;
      if (Math.hypot(e.clientX - am.x, e.clientY - am.y) > 14) am.drag = true;
      aimAt(e); paint();
    });
    const aimEnd = (e) => {
      if (!am || e.pointerId !== am.id) return;
      if (!am.drag && performance.now() - am.t < 400 && e.type === 'pointerup') { input.fire++; flash = performance.now(); changed(true); }
      am = null; paint();
    };
    aimPad.addEventListener('pointerup', aimEnd); aimPad.addEventListener('pointercancel', aimEnd);

    function paint() {
      const dp = devicePixelRatio;
      // move pad
      let g = moveC.getContext('2d'); g.clearRect(0, 0, moveC.width, moveC.height);
      const cx = mv ? mv.ox * dp : moveC.width / 2, cy = mv ? mv.oy * dp : moveC.height / 2 + 10 * dp;
      g.strokeStyle = '#5a5a70'; g.lineWidth = 3 * dp; g.beginPath(); g.arc(cx, cy, 48 * dp, 0, 7); g.stroke();
      g.fillStyle = mv ? view.color : '#3a3a4e';
      g.beginPath(); g.arc(cx + input.mx * 48 * dp, cy + input.my * 48 * dp, 22 * dp, 0, 7); g.fill();
      // aim pad
      g = aimC.getContext('2d'); g.clearRect(0, 0, aimC.width, aimC.height);
      const ax = aimC.width / 2, ay = aimC.height / 2, R = Math.min(ax, ay) * 0.82;
      g.strokeStyle = '#5a5a70'; g.lineWidth = 3 * dp; g.beginPath(); g.arc(ax, ay, R, 0, 7); g.stroke();
      g.beginPath(); g.arc(ax, ay, R * 0.15, 0, 7); g.stroke();
      const fl = performance.now() - flash < 150;
      if (input.aim != null) {
        g.strokeStyle = fl ? '#fff6a0' : view.color; g.lineWidth = 8 * dp; g.lineCap = 'round';
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + Math.cos(input.aim) * R, ay + Math.sin(input.aim) * R); g.stroke();
        g.fillStyle = fl ? '#fff6a0' : view.color; g.beginPath(); g.arc(ax + Math.cos(input.aim) * R, ay + Math.sin(input.aim) * R, 9 * dp, 0, 7); g.fill();
      }
      g.fillStyle = view.color; g.fillRect(ax - 9 * dp, ay - 9 * dp, 18 * dp, 18 * dp);
      if (fl) requestAnimationFrame(paint);
    }
    function update() {
      const st = status;
      if (!st) { l1.textContent = view.name; l2.textContent = 'Get ready…'; return; }
      l1.textContent = view.name;
      const ammo = E.AMMO[st.ammo]?.name || 'Shell';
      const parts = [st.ammo === 'shell' ? 'Shells' : `${ammo} ×${st.ammoLeft}`];
      if (st.power) parts.push(`${E.POWERS[st.power].name} ${st.powerT}s`);
      l2.textContent = parts.join(' · ');
      badge.textContent = st.mode === 'lts' ? `${st.score}★` : String(st.score);
      mineBtn.textContent = `Drop mine (${Math.max(0, st.mines - st.minesOut)})`;
      mineBtn.disabled = !st.alive || st.frozen;
      stat.classList.toggle('bad', !st.alive);
      stat.textContent = st.frozen ? (st.alive ? 'Get ready… find your tank on the TV' : 'Round over') : st.out ? 'Wrecked! Watch the TV until the next round.' : !st.alive ? `Wrecked! Back in ${Math.max(1, st.respawn)}…` : 'Rolling. Tread carefully!';
    }
    ctl = { update };
    update();
    requestAnimationFrame(size);
    window.onresize = size;
  }
}

function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
