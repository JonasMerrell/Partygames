// Sketchy Rumours phone screen: writing, guessing, the drawing pad and the
// reveal buttons. Views with an `sr` field are ours; anything else (like the
// pace picker) goes to the standard view renderer.
const SIZE = 720;
const COLORS = ['#1d1d1f', '#7a7a80', '#ffffff', '#e8413c', '#ff8a3d', '#ffd23f', '#5ccf5c', '#1f9d6b',
  '#3fb7ff', '#2f5bd8', '#8e4ee0', '#ff6fb5', '#8b5a2b', '#f5c9a0'];
const WIDTHS = [5, 14, 34];

export default function (ctx) {
  const { h } = ctx;
  addStyles();
  let cur = null; // { phase, flush() } for the page being worked on
  let lastReact = 0;

  ctx.on('view', (v) => {
    cur = null;
    if (v && v.sr) render(v);
    else ctx.renderView(v);
  });
  ctx.on('message', (m) => {
    if (m && m.kind === 'sr-timesup' && cur && cur.phase === m.phase) cur.flush();
  });
  // The first view may have arrived before this file loaded: ask for it again.
  ctx.send({ kind: 'sr-hello' });

  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem('sr.' + k)); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem('sr.' + k, JSON.stringify(v)); } catch {} },
  };

  function render(v) {
    const box = h('div.srp');
    ctx.el.replaceChildren(box);
    // DOM append() would print null/undefined, so drop empty bits first.
    const el = { append: (...k) => box.append(...k.filter((x) => x != null && x !== false && x !== '')),
      querySelectorAll: (q) => box.querySelectorAll(q) };
    if (v.sr === 'wait') {
      el.append(h('div.srp-wait', h('div.srp-pencil', '✏️'), h('p', v.text || 'Look at the TV!')));
    } else if (v.sr === 'write') writeView(el, v);
    else if (v.sr === 'draw') drawView(el, v);
    else if (v.sr === 'react' || v.sr === 'present') revealView(el, v);
  }

  function timerBar(v) {
    const fill = h('div');
    const label = h('span');
    const bar = h('div.srp-timer', fill, label);
    const got = Date.now();
    let left0 = (v.ends - Date.now()) / 1000;
    // Trust the host's deadline unless our clock is clearly off.
    if (!(left0 >= -2 && left0 <= v.seconds + 3)) left0 = v.seconds;
    const endAt = got + left0 * 1000;
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
    ctx.send({ kind: 'sr-answer', phase: v.phase, value });
  }

  function writeView(el, v) {
    const key = 'text.' + v.phase;
    const field = h('textarea.srp-field', { maxLength: 100, rows: 3, placeholder: v.placeholder || '',
      value: store.get(key) || '', autocapitalize: 'sentences', enterKeyHint: 'done' });
    field.addEventListener('input', () => store.set(key, field.value));
    field.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    const go = () => { if (field.value.trim()) submit(v, field.value.trim()); };
    cur = { phase: v.phase, flush: () => submit(v, field.value.trim()) };
    let idea = 0;
    el.append(timerBar(v), h('h2.srp-title', v.title),
      v.image && h('img.srp-img', { src: v.image, alt: 'drawing' }),
      h('p.srp-text', v.text),
      h('div.srp-paper', field),
      h('div.srp-row',
        v.ideas && h('button.srp-btn.alt', { onclick: () => {
          field.value = v.ideas[idea++ % v.ideas.length]; store.set(key, field.value);
        } }, '🎲 Inspire me'),
        h('button.srp-btn', { onclick: go }, 'Pass it on ➜')));
    if (!v.image) setTimeout(() => field.focus(), 60);
  }

  function drawView(el, v) {
    const key = 'draw.' + v.phase;
    const c = h('canvas.srp-pad', { width: SIZE, height: SIZE });
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

    const pick = (sel, btn) => { el.querySelectorAll(sel).forEach((b) => b.classList.remove('on')); btn.classList.add('on'); };
    const swatches = h('div.srp-swatches', COLORS.map((col, i) => h('button.srp-sw' + (i ? '' : '.on'), {
      style: { background: col }, 'aria-label': col,
      onclick: (e) => { color = col; if (tool === 'erase') setTool('pen'); pick('.srp-sw', e.currentTarget); },
    })));
    const tools = {};
    const setTool = (t) => { tool = t; pick('.srp-tool', tools[t]); };
    const toolBtn = (t, label) => (tools[t] = h('button.srp-tool' + (t === 'pen' ? '.on' : ''), { onclick: () => setTool(t) }, label));
    const sizes = h('div.srp-sizes', WIDTHS.map((w, i) => h('button.srp-size' + (i === 1 ? '.on' : ''), {
      onclick: (e) => { width = w; if (tool !== 'pen') setTool('pen'); pick('.srp-size', e.currentTarget); },
    }, h('span', { style: { width: `${6 + i * 7}px`, height: `${6 + i * 7}px` } }))));

    const finish = () => {
      let img = c.toDataURL('image/jpeg', 0.85);
      if (img.length > 400_000) img = c.toDataURL('image/jpeg', 0.6);
      if (img.length > 440_000) img = c.toDataURL('image/jpeg', 0.35);
      submit(v, { img, blank: ops.length === 0 && !live });
    };
    cur = { phase: v.phase, flush: () => { end(); finish(); } };

    el.append(timerBar(v),
      h('div.srp-prompt', h('small', 'Draw this:'), h('b', v.prompt || '???')),
      v.note && h('p.srp-note', v.note),
      c,
      swatches,
      h('div.srp-tools', sizes, toolBtn('pen', '✏️'), toolBtn('fill', '🪣'), toolBtn('erase', '🧽'),
        h('button.srp-tool', { onclick: () => { ops.pop(); redraw(); save(); } }, '↩️'),
        h('button.srp-tool', { onclick: () => { if (ops.length && confirmClear()) { ops = []; redraw(); save(); } } }, '🗑️')),
      h('button.srp-btn.wide', { onclick: () => { end(); finish(); } }, 'Done, pass it on ➜'));

    // A second tap within 2 s clears; no browser dialogs.
    let armed = 0;
    function confirmClear() {
      const now = Date.now();
      if (now - armed < 2000) { armed = 0; return true; }
      armed = now;
      const btn = [...el.querySelectorAll('.srp-tool')].pop();
      btn.classList.add('arm'); setTimeout(() => btn.classList.remove('arm'), 2000);
      return false;
    }
  }

  function revealView(el, v) {
    el.append(h('h2.srp-title', v.title), v.text && h('p.srp-text', v.text));
    if (v.button) el.append(h('button.srp-btn.wide.big', { onclick: () => ctx.send({ kind: 'sr-next' }) }, v.button));
    el.append(h('p.srp-text.dim', 'Throw a reaction at the TV:'),
      h('div.srp-reacts', v.emojis.map((e) => h('button.srp-react', {
        onclick: (ev) => {
          const now = Date.now();
          if (now - lastReact < 250) return;
          lastReact = now;
          ctx.send({ kind: 'sr-react', e });
          const b = ev.currentTarget; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        },
      }, e))));
  }
}

// Scanline flood fill with a little colour tolerance, so anti-aliased edges
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
  // Grow the fill one pixel into the edge it stopped at, to cover the soft rim.
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
  if (!document.getElementById('sr-font')) {
    document.head.append(Object.assign(document.createElement('link'), { id: 'sr-font', rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Permanent+Marker&display=swap' }));
  }
  if (document.getElementById('srp-css')) return;
  const css = Object.assign(document.createElement('style'), { id: 'srp-css' });
  css.textContent = `
  .srp { --ink: #24305e; --hand: 'Patrick Hand', 'Comic Sans MS', 'Chalkboard SE', cursive;
    --marker: 'Permanent Marker', 'Patrick Hand', 'Comic Sans MS', cursive;
    display: flex; flex-direction: column; gap: 12px; font-family: var(--hand); color: var(--ink);
    background: repeating-linear-gradient(0deg, #d9e3f3 0 1px, transparent 1px 26px), #fbf8ef;
    border-radius: 16px; padding: 14px; box-shadow: 0 10px 30px #0006; }
  .srp-title { font-family: var(--marker); font-weight: 400; font-size: 1.7em; margin: 0; }
  .srp-text { font-size: 1.2em; margin: 0; }
  .srp-text.dim { opacity: .7; }
  .srp-note { margin: 0; color: #a2452b; }
  .srp-img { width: 100%; border-radius: 6px; background: #fff; box-shadow: 0 4px 12px #0003; }
  .srp-paper { background: #fff27a; padding: 10px; transform: rotate(-.6deg); box-shadow: 0 4px 12px #0002; }
  .srp-field { width: 100%; background: transparent; border: 0; color: var(--ink); font-family: var(--hand);
    font-size: 1.45em; min-height: 3.6em; resize: none; padding: 4px; outline: none; }
  .srp-row { display: flex; gap: 10px; }
  .srp-row > * { flex: 1; }
  .srp-btn { font-family: var(--marker); font-size: 1.2em; background: #c43d26; color: #fff; border: 0; border-radius: 14px;
    padding: 14px 16px; box-shadow: 0 5px 0 #9c3221; cursor: pointer; }
  .srp-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #9c3221; }
  .srp-btn.alt { background: #2f5bd8; box-shadow: 0 5px 0 #1c3a8f; }
  .srp-btn.big { font-size: 1.6em; padding: 22px; }
  .srp-timer { position: relative; height: 26px; border-radius: 99px; background: #e4e0d3; overflow: hidden; }
  .srp-timer div { position: absolute; inset: 0 auto 0 0; background: #5ccf5c; transition: width .2s linear; }
  .srp-timer.low div { background: #e8413c; }
  .srp-timer span { position: absolute; inset: 0; text-align: center; font-weight: 700; line-height: 26px; }
  .srp-timer.low span { animation: srp-pulse .5s infinite alternate; }
  @keyframes srp-pulse { to { transform: scale(1.25); } }
  .srp-prompt { background: #ffc2d6; padding: 8px 12px; transform: rotate(-.8deg); box-shadow: 0 3px 8px #0002;
    display: flex; flex-direction: column; }
  .srp-prompt b { font-size: 1.35em; line-height: 1.15; }
  .srp-pad { width: 100%; aspect-ratio: 1; background: #fff; border-radius: 4px; touch-action: none;
    box-shadow: 0 4px 14px #0003; cursor: crosshair; }
  .srp-swatches { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .srp-sw { aspect-ratio: 1; border-radius: 50%; border: 2px solid #0003; cursor: pointer; padding: 0; }
  .srp-sw.on { outline: 3px solid var(--ink); outline-offset: 2px; }
  .srp-tools { display: flex; gap: 6px; align-items: center; justify-content: space-between; }
  .srp-sizes { display: flex; gap: 4px; }
  .srp-tool, .srp-size { width: 44px; height: 44px; border-radius: 12px; border: 2px solid #c9c3b0; background: #fff;
    font-size: 1.25em; display: grid; place-items: center; cursor: pointer; padding: 0; }
  .srp-size span { display: block; border-radius: 50%; background: var(--ink); }
  .srp-tool.on, .srp-size.on { border-color: var(--ink); background: #ffe9a8; }
  .srp-tool.arm { border-color: #e8413c; background: #ffd0cc; }
  .srp-wait { text-align: center; padding: 8vh 0; font-size: 1.4em; }
  .srp-pencil { font-size: 3em; animation: srp-scribble 1s ease-in-out infinite; display: inline-block; }
  @keyframes srp-scribble { 0%,100% { transform: translate(-10px, 0) rotate(-10deg); } 50% { transform: translate(10px, -6px) rotate(10deg); } }
  .srp-reacts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .srp-react { font-size: 2.2em; aspect-ratio: 1; border-radius: 16px; border: 2px solid #c9c3b0; background: #fff; cursor: pointer; padding: 0; }
  .srp-react.pop { animation: srp-pop .3s; }
  @keyframes srp-pop { 50% { transform: scale(1.3); } }
  `;
  document.head.append(css);
}
