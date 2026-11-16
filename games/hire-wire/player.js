// Hire Wire phone: the tile builder. Views with `tiles` become a tap-to-build
// answer; everything else goes to the standard view screen.
export default function (ctx) {
  const { h } = ctx;
  let cur = null; // { view, picked: [tile ids] }
  const store = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const load = (k) => { try { return JSON.parse(sessionStorage.getItem(k)) || []; } catch { return []; } };

  ctx.on('view', (v) => {
    if (v?.hands) {
      const tiles = v.hands[ctx.me.id];
      if (!tiles) { cur = null; ctx.renderView({ wait: 'You will be in the next interview. Look at the TV!' }); return; }
      const view = { ...v, tiles, key: `${v.key}-${ctx.me.id}` };
      const ids = new Set(tiles.map((t) => t.id));
      cur = { view, picked: load('hirewire.' + view.key).filter((id) => ids.has(id)) };
      draw();
      return;
    }
    cur = null;
    // Votes: you can't hire yourself.
    if (v?.authors && v.choices) {
      v = { ...v, choices: v.choices.map((c) => (v.authors[c.value] === ctx.me.id
        ? { ...c, label: c.label + '  (yours)', disabled: true } : c)) };
    }
    ctx.renderView(v);
  });
  ctx.on('message', (m) => {
    if (m?.kind !== 'hurry' || !cur) return;
    if (cur.picked.length) submit();
    else { cur.hurry = true; draw(); }
  });

  function submit() {
    if (!cur || !cur.picked.length) return;
    const { view, picked } = cur;
    ctx.send({ kind: 'answer', ask: view.ask, value: picked });
    store('hirewire.' + view.key, null);
    cur = null;
    ctx.el.replaceChildren(h('div.wait', h('div.spinner'), h('p', 'Sending…')));
  }

  function draw() {
    const { view: v, picked } = cur;
    store('hirewire.' + v.key, picked);
    const byId = new Map(v.tiles.map((t) => [t.id, t]));
    const max = v.max || 12;
    const set = (p) => { cur.picked = p; draw(); };
    const tile = (t, onclick, extra = '') => h('button.hw-tile.k-' + t.k + extra, { onclick }, t.w);
    const used = new Set(picked);
    const bank = (k) => v.tiles.filter((t) => (k === 'g' ? t.k === 'g' : t.k !== 'g'))
      .map((t) => tile(t, () => !used.has(t.id) && picked.length < max && set([...picked, t.id]), used.has(t.id) ? '.used' : ''));
    ctx.el.replaceChildren(h('div.hw',
      h('div.hw-job', 'Now hiring: ', h('b', v.title || '')),
      h('h2.hw-q', v.text || ''),
      cur.hurry ? h('p.hw-hurry', 'Time is almost up! Tap some words.') : null,
      h('div.hw-answer', picked.length
        ? picked.map((id) => tile(byId.get(id), () => set(picked.filter((x) => x !== id))))
        : h('span.hw-hint', 'Tap words below to build your answer. Tap a word here to take it back.')),
      h('div.hw-tools',
        h('button.ghost.sm', { disabled: !picked.length, onclick: () => set(picked.slice(0, -1)) }, '⌫ Undo'),
        h('button.ghost.sm', { disabled: !picked.length, onclick: () => set([]) }, 'Clear'),
        h('span.hw-count', `${picked.length}/${max}`)),
      h('div.hw-label', 'Salvaged words'),
      h('div.hw-bank', bank('w')),
      h('div.hw-label', 'Office supplies'),
      h('div.hw-bank', bank('g')),
      h('button.big.hw-send', { disabled: !picked.length, onclick: submit }, 'Submit answer')));
  }

  document.getElementById('hire-wire-phone')?.remove();
  const css = Object.assign(document.createElement('style'), { id: 'hire-wire-phone' });
  css.textContent = `
    .hw { display: flex; flex-direction: column; gap: 12px; padding-bottom: 12px; --accent: #ffb84d; }
    .hw-job { color: var(--dim); font-size: .9em; }
    .hw-job b { color: var(--accent); }
    .hw-q { font-size: 1.35em; margin: 0; }
    .hw-hurry { background: #4a3a10; color: #ffe9a8; border-radius: 12px; padding: 8px 12px; margin: 0; font-weight: 700; }
    .hw-answer { min-height: 92px; background: var(--bg2); border: 2px dashed var(--accent); border-radius: 16px; padding: 10px;
      display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
    .hw-hint { color: var(--dim); font-size: .9em; }
    .hw-tools { display: flex; gap: 10px; align-items: center; }
    .hw-count { margin-left: auto; color: var(--dim); font-weight: 800; font-variant-numeric: tabular-nums; }
    .hw-label { color: var(--dim); font-size: .85em; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; margin-top: 4px; }
    .hw-bank { display: flex; flex-wrap: wrap; gap: 8px; }
    .hw-tile { background: #fff7d6; color: #1b1f2e; border: 0; border-radius: 9px; padding: 9px 12px; font-weight: 800; font-size: 1.02em;
      box-shadow: 0 4px 0 #c9b98a; cursor: pointer; touch-action: manipulation; }
    .hw-tile:active { transform: translateY(3px); box-shadow: 0 1px 0 #c9b98a; }
    .hw-tile.k-g { background: #d6dde8; box-shadow: 0 4px 0 #9aa6b8; }
    .hw-tile.k-s { background: #ffe0e6; box-shadow: 0 4px 0 #d9a3ae; }
    .hw-tile.used { opacity: .25; box-shadow: none; transform: translateY(3px); }
    .hw-send { position: sticky; bottom: 12px; margin-top: 10px; }
    .hw-bank:last-of-type { margin-bottom: 8px; }
  `;
  document.head.append(css);
}
