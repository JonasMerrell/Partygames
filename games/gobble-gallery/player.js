// Gobble Gallery phone screen: picking a card, a kid-sized drawing pad,
// big colour-and-shape answer buttons, and reactions. Views with a `gg`
// field are ours; anything else (the length picker) goes to the standard
// renderer.
const SIZE = 640;
const COLORS = ['#1d1d1f', '#8b5a2b', '#e8413c', '#ff8a3d', '#ffd23f', '#5ccf5c',
  '#1f9d6b', '#3fb7ff', '#2f5bd8', '#8e4ee0', '#ff6fb5', '#ffffff'];
const WIDTHS = [8, 22, 44];

export default function (ctx) {
  const { h } = ctx;
  addStyles();
  let cur = null;   // { phase, sid, flush() } for the turn being worked on
  let lastReact = 0;

  ctx.on('view', (v) => {
    cur = null;
    if (v && v.gg) render(v);
    else ctx.renderView(v);
  });
  ctx.on('message', (m) => {
    if (m && m.kind === 'gg-timesup' && cur && cur.phase === m.phase) cur.flush();
  });
  ctx.send({ kind: 'gg-hello' });

  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem('gg.' + k)); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem('gg.' + k, JSON.stringify(v)); } catch {} },
  };

  // Reads text out on this phone, for players who can't read yet.
  const speak = (text) => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9; u.pitch = 1.1; u.volume = 0.8;
      speechSynthesis.speak(u);
    } catch {}
  };
  const hasSpeech = typeof speechSynthesis !== 'undefined';
  const hear = (text, label = '🔊 Hear it') => hasSpeech && h('button.ggp-hear', { onclick: () => speak(typeof text === 'function' ? text() : text) }, label);

  function frame() {
    const box = h('div.ggp');
    ctx.el.replaceChildren(box);
    const add = (...k) => box.append(...k.flat().filter((x) => x != null && x !== false && x !== ''));
    return { box, add };
  }

  function render(v) {
    if (v.gg === 'turns') return runTurns(v);
    const { box, add } = frame();
    if (v.gg === 'wait') add(h('div.ggp-wait', h('div.ggp-bob', v.emoji || '🦃'), h('p', v.text || 'Look at the TV!')));
    else if (v.gg === 'who') whoView(add, v);
    else if (v.gg === 'mine') add(h('div.ggp-wait', h('div.ggp-bob', '🤫'),
      h('h2', v.who ? `${v.who.avatar} ${v.who.name}, that's yours!` : 'That\'s your drawing!'),
      h('p', 'Shh! Don\'t tell anyone what it is.'), cardEl(v.card)));
    else if (v.gg === 'result') resultView(add, v);
    else if (v.gg === 'award') add(h('div.ggp-wait', h('div.ggp-bob', v.rows.some((r) => r.win) ? '🏆' : '🎉'),
      v.rows.map((r) => h('div.ggp-row', { style: { '--c': r.color } }, h('span.ggp-rowava', r.avatar),
        h('div', h('b', r.name), h('div.ggp-big', r.title), h('small', r.text)))),
      h('p', 'Happy Thanksgiving! 🍂')));
    void box;
  }

  // A shared phone takes turns. Before each secret turn it shows a "pass the
  // phone" screen with the next player's animal, so nobody sees another
  // player's card by accident.
  function runTurns(v) {
    let i = 0;
    const step = () => {
      if (i >= v.turns.length) {
        const { add } = frame();
        add(h('div.ggp-wait', h('div.ggp-bob', '👍'), h('p', 'All done! Look at the TV.')));
        return;
      }
      const t = v.turns[i];
      const inner = { ...t.view, phase: v.phase, seconds: v.seconds, ends: v.ends, sid: t.sid, who: t,
        many: v.turns.length > 1, next: () => { i++; step(); } };
      if (v.handoff) handoff(t, () => show(inner));
      else show(inner);
    };
    const show = (inner) => {
      const { box, add } = frame();
      if (inner.gg === 'pick') pickView(add, inner);
      else if (inner.gg === 'draw') drawView(add, box, inner);
      else if (inner.gg === 'guess') guessView(add, inner);
    };
    step();
  }

  function handoff(t, go) {
    cur = null;
    const { add } = frame();
    add(h('div.ggp-handoff', { style: { '--c': t.color } },
      h('div.ggp-handava', t.avatar),
      h('h2', `${t.name}'s turn!`),
      h('p', 'Pass the phone. No peeking!'),
      h('button.ggp-btn', { onclick: go }, `I'm ${t.name}! ▶`),
      hear(`${t.name}, it's your turn!`, '🔊 Whose turn?')));
  }

  const whoBar = (v) => v.who && h('div.ggp-whobar', { style: { '--c': v.who.color } },
    h('span.ggp-whoava', v.who.avatar), h('b', `${v.who.name}${v.many ? '\'s turn' : ''}`));

  const cardEl = (c, extra = '') => h('div.ggp-card' + extra, h('span.ggp-cardemoji', c.e), h('b', c.t));

  function timerBar(v) {
    const fill = h('div');
    const label = h('span');
    const bar = h('div.ggp-timer', fill, label);
    let left0 = (v.ends - Date.now()) / 1000;
    if (!(left0 >= -2 && left0 <= v.seconds + 3)) left0 = v.seconds;
    const endAt = Date.now() + left0 * 1000;
    let shown = false;
    const tick = () => {
      if (bar.isConnected) shown = true;
      else if (shown) return clearInterval(t);
      const left = Math.max(0, (endAt - Date.now()) / 1000);
      fill.style.width = `${(left / v.seconds) * 100}%`;
      label.textContent = Math.ceil(left);
      bar.classList.toggle('low', left <= 10);
    };
    const t = setInterval(tick, 200);
    tick();
    return bar;
  }

  function submit(v, value) {
    if (!cur || cur.phase !== v.phase || cur.sid !== v.sid) return;
    cur = null;
    ctx.send({ kind: 'gg-answer', phase: v.phase, sid: v.sid, value });
    v.next?.();
  }

  function whoView(add, v) {
    let me = true;
    const kids = [];
    const list = h('div.ggp-kids');
    const meBtn = h('button.ggp-me.on', { onclick: () => { me = !me; meBtn.classList.toggle('on', me); meBtn.lastChild.textContent = me ? `${v.name} is playing` : `${v.name} is just helping`; } },
      h('span.ggp-check', '✓'), h('span', `${v.name} is playing`));
    const field = h('input.ggp-field', { placeholder: 'Kid\'s name', maxLength: 16, autocomplete: 'off', autocapitalize: 'words', enterKeyHint: 'done' });
    const addBtn = h('button.ggp-add', { type: 'submit' }, '+ Add');
    const drawList = () => {
      list.replaceChildren(...kids.map((k, i) => h('div.ggp-kid', h('span', '🧒'), h('b', k),
        h('button.ggp-x', { 'aria-label': 'remove', onclick: () => { kids.splice(i, 1); drawList(); } }, '×'))));
      addBtn.disabled = field.disabled = kids.length >= v.max;
    };
    const addKid = () => { const n = field.value.replace(/\s+/g, ' ').trim(); if (n && kids.length < v.max) { kids.push(n); field.value = ''; drawList(); } };
    drawList();
    add(timerBar(v), h('h2.ggp-title', 'Who\'s playing on this phone?'),
      h('p.ggp-text', 'Kids without a phone can play on yours. You\'ll pass it around.'),
      meBtn, list,
      h('form.ggp-addrow', { onsubmit: (e) => { e.preventDefault(); addKid(); } }, field, addBtn),
      h('button.ggp-btn', { onclick: () => { addKid(); if (!me && !kids.length) me = true; ctx.send({ kind: 'gg-who', me, kids }); } }, 'Ready! ▶'));
  }

  function pickView(add, v) {
    cur = { phase: v.phase, sid: v.sid, flush: () => submit(v, 0) };
    add(timerBar(v), whoBar(v), h('h2.ggp-title', 'Pick one to draw!'),
      h('div.ggp-picks', v.cards.map((c, i) => h('button.ggp-pick', { onclick: () => submit(v, i) },
        h('span.ggp-cardemoji', c.e), h('b', c.t)))),
      hear(`${v.cards[0].t}. Or. ${v.cards[1].t}.`, '🔊 Hear them (quietly!)'));
  }

  function guessView(add, v) {
    cur = { phase: v.phase, sid: v.sid, flush: () => {} };
    add(timerBar(v), whoBar(v), h('h2.ggp-title', 'What is it?'),
      v.note ? h('p.ggp-text', v.note) : h('p.ggp-text', 'Look at the TV and tap the matching one.'),
      h('div.ggp-guesses', v.options.map((o, i) => h('button.ggp-guess', { style: { '--c': o.c }, onclick: () => submit(v, i) },
        h('span.ggp-shape', o.s), h('span.ggp-cardemoji', o.e), h('b', o.t)))),
      hear(v.options.map((o) => o.t).join('? '), '🔊 Hear them'));
  }

  function resultView(add, v) {
    const rows = v.rows || [];
    const mood = rows.some((r) => r.ok) ? '🎉' : rows.every((r) => r.mine) ? '🖼️' : '🍂';
    add(h('div.ggp-result',
      h('div.ggp-bob', mood),
      rows.map((r) => h('div.ggp-row' + (r.ok ? '.ok' : ''), { style: { '--c': r.color } },
        h('span.ggp-rowava', r.avatar), h('div', h('b', r.name), h('div.ggp-big', r.mine ? `🖼️ ${r.text}` : r.ok ? `🎉 ${r.text}` : `🍂 ${r.text}`)))),
      h('p', 'It was:'),
      cardEl(v.card)));
    if (v.react && v.react.length) {
      add(h('p.ggp-text', `Send ${v.artist || 'the artist'} some love:`),
        h('div.ggp-reacts', v.react.map((e) => h('button.ggp-react', {
          onclick: (ev) => {
            const now = Date.now();
            if (now - lastReact < 250) return;
            lastReact = now;
            ctx.send({ kind: 'gg-react', e });
            const b = ev.currentTarget; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
          },
        }, e))));
    }
  }

  function drawView(add, box, v) {
    const key = 'draw.' + v.phase + '.' + v.sid;
    const c = h('canvas.ggp-pad', { width: SIZE, height: SIZE });
    const g = c.getContext('2d', { willReadFrequently: true });
    let ops = store.get(key) || [];
    let color = COLORS[0], width = WIDTHS[1], tool = 'pen', live = null;

    const line = (op) => {
      g.strokeStyle = op.c; g.fillStyle = op.c; g.lineWidth = op.w; g.lineCap = g.lineJoin = 'round';
      const p = op.p;
      if (p.length === 2) { g.beginPath(); g.arc(p[0], p[1], op.w / 2, 0, 7); g.fill(); return; }
      g.beginPath(); g.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
      g.stroke();
    };
    const redraw = () => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, SIZE, SIZE);
      for (const op of ops) op.t === 'f' ? flood(g, op.x, op.y, op.c) : line(op);
    };
    const save = () => store.set(key, ops);
    redraw();

    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return [Math.round((e.clientX - r.left) * SIZE / r.width), Math.round((e.clientY - r.top) * SIZE / r.height)];
    };
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const [x, y] = pos(e);
      if (tool === 'fill') { const op = { t: 'f', x, y, c: color }; ops.push(op); flood(g, x, y, color); save(); return; }
      c.setPointerCapture(e.pointerId);
      live = { t: 'l', c: tool === 'erase' ? '#ffffff' : color, w: tool === 'erase' ? WIDTHS[2] : width, p: [x, y] };
      line(live);
    });
    c.addEventListener('pointermove', (e) => {
      if (!live) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs.length ? evs : [e]) {
        const [x, y] = pos(ev);
        const p = live.p;
        const lx = p[p.length - 2], ly = p[p.length - 1];
        if (Math.abs(x - lx) + Math.abs(y - ly) < 2) continue;
        g.strokeStyle = live.c; g.lineWidth = live.w; g.lineCap = g.lineJoin = 'round';
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(x, y); g.stroke();
        p.push(x, y);
      }
    });
    const end = () => { if (live) { ops.push(live); live = null; save(); } };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);

    const pick = (sel, btn) => { box.querySelectorAll(sel).forEach((b) => b.classList.remove('on')); btn.classList.add('on'); };
    const tools = {};
    const setTool = (t) => { tool = t; pick('.ggp-tool', tools[t]); };
    const swatches = h('div.ggp-swatches', COLORS.map((col, i) => h('button.ggp-sw' + (i ? '' : '.on'), {
      style: { background: col }, 'aria-label': col,
      onclick: (e) => { color = col; if (tool === 'erase') setTool('pen'); pick('.ggp-sw', e.currentTarget); },
    })));
    const toolBtn = (t, label, name) => (tools[t] = h('button.ggp-tool' + (t === 'pen' ? '.on' : ''), { onclick: () => setTool(t) },
      h('span', label), h('small', name)));
    const sizes = WIDTHS.map((w, i) => h('button.ggp-size' + (i === 1 ? '.on' : ''), {
      'aria-label': ['thin', 'medium', 'fat'][i],
      onclick: (e) => { width = w; if (tool !== 'pen') setTool('pen'); pick('.ggp-size', e.currentTarget); },
    }, h('span', { style: { width: `${8 + i * 9}px`, height: `${8 + i * 9}px` } })));

    const finish = () => {
      let img = c.toDataURL('image/jpeg', 0.85);
      if (img.length > 400_000) img = c.toDataURL('image/jpeg', 0.6);
      if (img.length > 440_000) img = c.toDataURL('image/jpeg', 0.35);
      submit(v, { img, blank: ops.length === 0 && !live });
    };
    cur = { phase: v.phase, sid: v.sid, flush: () => { end(); finish(); } };

    let armed = 0;
    const clearBtn = h('button.ggp-tool', { onclick: () => {
      if (!ops.length) return;
      const now = Date.now();
      if (now - armed < 2500) { armed = 0; ops = []; redraw(); save(); clearBtn.classList.remove('arm'); return; }
      armed = now; clearBtn.classList.add('arm'); setTimeout(() => clearBtn.classList.remove('arm'), 2500);
    } }, h('span', '🗑️'), h('small', 'clear'));

    add(timerBar(v), whoBar(v),
      h('div.ggp-drawthis', h('small', 'Draw this:'), h('div.ggp-drawrow', cardEl(v.card, '.slim'), hear(v.card.t, '🔊'))),
      c,
      swatches,
      h('div.ggp-tools',
        ...sizes,
        toolBtn('pen', '🖍️', 'crayon'), toolBtn('fill', '🪣', 'fill'), toolBtn('erase', '🧽', 'eraser'),
        h('button.ggp-tool', { onclick: () => { ops.pop(); redraw(); save(); } }, h('span', '↩️'), h('small', 'undo')),
        clearBtn),
      h('button.ggp-btn', { onclick: () => { end(); finish(); } }, 'I\'m done! ✓'));
  }
}

// Scanline flood fill with a little colour tolerance, so soft crayon edges
// don't leave a halo.
function flood(g, x, y, hex) {
  const W = SIZE, H = SIZE;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const img = g.getImageData(0, 0, W, H), d = img.data;
  const n = parseInt(hex.slice(1), 16);
  const fr = (n >> 16) & 255, fg = (n >> 8) & 255, fb = n & 255;
  const at = (y * W + x) * 4;
  const tr = d[at], tg = d[at + 1], tb = d[at + 2];
  if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 10) return;
  const same = (i) => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) < 90;
  const seen = new Uint8Array(W * H);
  const stack = [x, y];
  while (stack.length) {
    const sy = stack.pop(); let sx = stack.pop();
    while (sx > 0 && !seen[sy * W + sx - 1] && same((sy * W + sx - 1) * 4)) sx--;
    let up = false, down = false;
    for (; sx < W; sx++) {
      const k = sy * W + sx;
      if (seen[k] || !same(k * 4)) break;
      seen[k] = 1;
      const i = k * 4; d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255;
      if (sy > 0) { const u = k - W; const ok = !seen[u] && same(u * 4); if (ok && !up) stack.push(sx, sy - 1); up = ok; }
      if (sy < H - 1) { const dn = k + W; const ok = !seen[dn] && same(dn * 4); if (ok && !down) stack.push(sx, sy + 1); down = ok; }
    }
  }
  const grow = [];
  for (let k = 0; k < W * H; k++) {
    if (seen[k]) continue;
    const kx = k % W;
    if ((kx > 0 && seen[k - 1]) || (kx < W - 1 && seen[k + 1]) || (k >= W && seen[k - W]) || (k < W * (H - 1) && seen[k + W])) grow.push(k);
  }
  for (const k of grow) { const i = k * 4; d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
}

function addStyles() {
  if (!document.getElementById('gg-font')) {
    document.head.append(Object.assign(document.createElement('link'), { id: 'gg-font', rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap' }));
  }
  if (document.getElementById('ggp-css')) return;
  const css = Object.assign(document.createElement('style'), { id: 'ggp-css' });
  css.textContent = `
  .ggp { --ink: #4a2a12; --cream: #fff6e5; font-family: 'Fredoka', ui-rounded, system-ui, sans-serif; color: var(--ink);
    display: flex; flex-direction: column; gap: 12px; background: var(--cream); border-radius: 22px; padding: 14px;
    box-shadow: 0 10px 30px #0006; border-top: 10px solid #f2a541; }
  .ggp h2 { margin: 0; font-size: 1.6em; }
  .ggp p { margin: 0; }
  .ggp-title { text-align: center; }
  .ggp-text { font-size: 1.1em; text-align: center; }
  .ggp-wait { text-align: center; padding: 6vh 0; font-size: 1.3em; display: flex; flex-direction: column; gap: 12px; align-items: center; }
  .ggp-bob { font-size: 4em; animation: ggp-bob 1.4s ease-in-out infinite; }
  @keyframes ggp-bob { 50% { transform: translateY(-10px) rotate(-6deg); } }
  .ggp-card { display: flex; align-items: center; gap: 12px; background: #fff; border: 3px dashed #f2a541; border-radius: 16px; padding: 12px 14px; text-align: left; }
  .ggp-card b { font-size: 1.35em; line-height: 1.15; }
  .ggp-card.slim { padding: 6px 10px; }
  .ggp-card.slim .ggp-cardemoji { font-size: 2em; }
  .ggp-cardemoji { font-size: 2.6em; line-height: 1; }
  .ggp-drawthis small { display: block; font-weight: 700; opacity: .7; margin-bottom: 3px; }
  .ggp-picks { display: flex; flex-direction: column; gap: 14px; }
  .ggp-pick { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 12px; border-radius: 20px;
    border: 0; background: #fff; box-shadow: 0 6px 0 #d8c3a0; cursor: pointer; color: var(--ink); }
  .ggp-pick .ggp-cardemoji { font-size: 3.6em; }
  .ggp-pick b { font-size: 1.45em; }
  .ggp-pick:active, .ggp-guess:active, .ggp-btn:active { transform: translateY(4px); box-shadow: none; }
  .ggp-guesses { display: flex; flex-direction: column; gap: 12px; }
  .ggp-guess { background: var(--c); color: #fff; border: 0; border-radius: 18px; padding: 14px 14px; min-height: 76px;
    display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer;
    box-shadow: 0 6px 0 color-mix(in srgb, var(--c) 55%, #000); }
  .ggp-guess b { font-size: 1.3em; line-height: 1.1; text-shadow: 0 1px 0 #0004; }
  .ggp-shape { font-size: 1.7em; width: 1.1em; text-align: center; }
  .ggp-guess .ggp-cardemoji { font-size: 2.2em; }
  .ggp-result { text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; padding: 10px 0; }
  .ggp-result.ok h2 { color: #2f8a3f; }
  .ggp-reacts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .ggp-react { font-size: 2.4em; aspect-ratio: 1; border-radius: 18px; border: 0; background: #fff; box-shadow: 0 5px 0 #d8c3a0; cursor: pointer; padding: 0; }
  .ggp-react.pop { animation: ggp-pop .3s; }
  @keyframes ggp-pop { 50% { transform: scale(1.3); } }
  .ggp-timer { position: relative; height: 28px; border-radius: 99px; background: #eadcc4; overflow: hidden; }
  .ggp-timer div { position: absolute; inset: 0 auto 0 0; background: #5ccf5c; transition: width .2s linear; }
  .ggp-timer.low div { background: #ff8a3d; }
  .ggp-timer span { position: absolute; inset: 0; text-align: center; font-weight: 700; line-height: 28px; }
  .ggp-pad { width: min(100%, 36vh); align-self: center; aspect-ratio: 1; background: #fff; border-radius: 10px; touch-action: none;
    box-shadow: 0 0 0 4px #8b5a2b, 0 6px 14px #0003; cursor: crosshair; }
  .ggp-swatches { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .ggp-sw { border-radius: 99px; border: 3px solid #0002; cursor: pointer; padding: 0; min-height: 34px; aspect-ratio: auto; height: 34px; }
  .ggp-sw.on { outline: 4px solid var(--ink); outline-offset: 2px; }
  .ggp-tools { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
  .ggp-tool, .ggp-size { min-height: 50px; border-radius: 12px; border: 3px solid #e0cfae; background: #fff; cursor: pointer; padding: 2px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--ink); }
  .ggp-tool span { font-size: 1.5em; line-height: 1; }
  .ggp-tool small { font-size: .55em; line-height: 1; font-weight: 700; }
  .ggp-size span { display: block; border-radius: 50%; background: var(--ink); }
  .ggp-tool.on, .ggp-size.on { border-color: var(--ink); background: #ffe9a8; }
  .ggp-tool.arm { border-color: #e8413c; background: #ffd0cc; }
  .ggp-btn { font-family: inherit; font-weight: 700; font-size: 1.5em; background: #4f9d5d; color: #fff; border: 0; border-radius: 18px;
    padding: 18px; box-shadow: 0 6px 0 #2f6a3a; cursor: pointer; }
  .ggp-hear { font-family: inherit; font-weight: 700; font-size: 1.05em; background: #fff; color: var(--ink); border: 3px solid #e0cfae;
    border-radius: 14px; padding: 10px; cursor: pointer; }
  .ggp-drawrow { display: flex; gap: 8px; align-items: stretch; }
  .ggp-drawrow .ggp-card { flex: 1; }
  .ggp-drawrow .ggp-hear { font-size: 1.5em; padding: 0 12px; }
  .ggp-whobar { display: flex; align-items: center; gap: 10px; background: var(--c); border-radius: 16px; padding: 6px 12px; color: #2a1a0c; }
  .ggp-whoava { font-size: 2.2em; line-height: 1; }
  .ggp-whobar b { font-size: 1.3em; }
  .ggp-handoff { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; padding: 3vh 0;
    background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--c) 45%, transparent), transparent 70%); }
  .ggp-handava { font-size: 7em; line-height: 1; animation: ggp-bob 1.4s ease-in-out infinite; }
  .ggp-handoff h2 { font-size: 2em; }
  .ggp-handoff p { font-size: 1.2em; }
  .ggp-handoff .ggp-btn { width: 100%; background: var(--c); color: #2a1a0c; box-shadow: 0 6px 0 color-mix(in srgb, var(--c) 55%, #000); }
  .ggp-me { font-family: inherit; display: flex; align-items: center; gap: 10px; background: #fff; border: 3px solid #e0cfae; border-radius: 16px;
    padding: 12px; font-size: 1.15em; font-weight: 700; color: var(--ink); cursor: pointer; text-align: left; }
  .ggp-check { width: 1.6em; height: 1.6em; border-radius: 8px; border: 3px solid #c9b48c; display: grid; place-items: center; color: transparent; }
  .ggp-me.on .ggp-check { background: #4f9d5d; border-color: #4f9d5d; color: #fff; }
  .ggp-kids { display: flex; flex-direction: column; gap: 8px; }
  .ggp-kids:empty { display: none; }
  .ggp-kid { display: flex; align-items: center; gap: 10px; background: #fff3d6; border-radius: 14px; padding: 8px 12px; font-size: 1.2em; }
  .ggp-kid b { flex: 1; }
  .ggp-x { border: 0; background: #e8553e; color: #fff; border-radius: 10px; width: 40px; height: 40px; font-size: 1.3em; cursor: pointer; }
  .ggp-addrow { display: flex; gap: 8px; }
  .ggp-field { flex: 1; min-width: 0; background: #fff; color: var(--ink); border: 3px solid #e0cfae; border-radius: 14px; font-family: inherit; font-size: 1.15em; padding: 12px; }
  .ggp-add { font-family: inherit; font-weight: 700; font-size: 1.1em; background: #f2a541; color: #fff; border: 0; border-radius: 14px; padding: 0 16px; cursor: pointer; }
  .ggp-add:disabled, .ggp-field:disabled { opacity: .5; }
  .ggp-row { display: flex; align-items: center; gap: 12px; width: 100%; background: #fff; border-left: 8px solid var(--c); border-radius: 14px; padding: 8px 12px; text-align: left; }
  .ggp-rowava { font-size: 2.6em; line-height: 1; }
  .ggp-big { font-size: 1.25em; font-weight: 700; }
  .ggp-row.ok { background: #e3f6d8; }
  `;
  document.head.append(css);
}
