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
  let cur = null;   // { phase, flush() } for the drawing being worked on
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

  function render(v) {
    const box = h('div.ggp');
    ctx.el.replaceChildren(box);
    const add = (...k) => box.append(...k.filter((x) => x != null && x !== false && x !== ''));
    if (v.gg === 'wait') add(h('div.ggp-wait', h('div.ggp-bob', v.emoji || '🦃'), h('p', v.text || 'Look at the TV!')));
    else if (v.gg === 'pick') pickView(add, v);
    else if (v.gg === 'draw') drawView(add, box, v);
    else if (v.gg === 'mine') add(h('div.ggp-wait', h('div.ggp-bob', '🤫'), h('h2', 'That\'s your drawing!'),
      h('p', 'Shh! Don\'t tell anyone what it is.'), cardEl(v.card)));
    else if (v.gg === 'guess') guessView(add, v);
    else if (v.gg === 'result') resultView(add, v);
    else if (v.gg === 'award') add(h('div.ggp-wait', h('div.ggp-bob', v.win ? '🏆' : '🎉'),
      h('h2', v.title), h('p', v.text), h('p', 'Happy Thanksgiving! 🍂')));
  }

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
    if (!cur || cur.phase !== v.phase) return;
    cur = null;
    ctx.send({ kind: 'gg-answer', phase: v.phase, value });
  }

  function pickView(add, v) {
    cur = { phase: v.phase, flush: () => submit(v, 0) };
    add(timerBar(v), h('h2.ggp-title', 'Pick one to draw!'),
      h('div.ggp-picks', v.cards.map((c, i) => h('button.ggp-pick', { onclick: () => submit(v, i) },
        h('span.ggp-cardemoji', c.e), h('b', c.t)))));
  }

  function guessView(add, v) {
    cur = { phase: v.phase, flush: () => {} };
    add(timerBar(v), h('h2.ggp-title', 'What is it?'), h('p.ggp-text', 'Look at the TV and tap the matching one.'),
      h('div.ggp-guesses', v.options.map((o, i) => h('button.ggp-guess', { style: { '--c': o.c }, onclick: () => submit(v, i) },
        h('span.ggp-shape', o.s), h('span.ggp-cardemoji', o.e), h('b', o.t)))));
  }

  function resultView(add, v) {
    add(h('div.ggp-result' + (v.mine ? '.mine' : v.ok ? '.ok' : '.miss'),
      h('div.ggp-bob', v.mine ? '🖼️' : v.ok ? '🎉' : '🍂'),
      h('h2', v.text),
      !v.mine && h('p', 'It was:'),
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
    const key = 'draw.' + v.phase;
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
    cur = { phase: v.phase, flush: () => { end(); finish(); } };

    let armed = 0;
    const clearBtn = h('button.ggp-tool', { onclick: () => {
      if (!ops.length) return;
      const now = Date.now();
      if (now - armed < 2500) { armed = 0; ops = []; redraw(); save(); clearBtn.classList.remove('arm'); return; }
      armed = now; clearBtn.classList.add('arm'); setTimeout(() => clearBtn.classList.remove('arm'), 2500);
    } }, h('span', '🗑️'), h('small', 'clear'));

    add(timerBar(v),
      h('div.ggp-drawthis', h('small', 'Draw this:'), cardEl(v.card, '.slim')),
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
  .ggp-pad { width: 100%; aspect-ratio: 1; background: #fff; border-radius: 10px; touch-action: none;
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
  `;
  document.head.append(css);
}
