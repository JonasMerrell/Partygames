// Patch Party phone: the standard views, plus one extra view type for
// picking a drawing from a grid of pictures: { pick: [dataUrl...], title, text }.
export default function (ctx) {
  const { h } = ctx;
  ctx.on('view', (view) => {
    if (!view || !view.pick) return ctx.renderView(view);
    const box = h('div.view',
      view.title && h('h2', view.title),
      view.text && h('p.view-text', view.text),
      h('div.pp-picks', view.pick.map((src, i) => h('button.pp-pick', {
        onclick: () => ctx.send({ kind: 'answer', ask: view.ask, value: i }),
      }, h('img', { src, alt: `Design ${i + 1}` })))));
    ctx.el.replaceChildren(box);
  });
  document.getElementById('patch-party-phone-css')?.remove();
  document.head.append(Object.assign(document.createElement('style'), { id: 'patch-party-phone-css', textContent: `
    .pp-picks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .pp-pick { padding: 0; border: 4px dashed var(--line); border-radius: 50%; overflow: hidden; background: #fff; cursor: pointer; aspect-ratio: 1; }
    .pp-pick:active { border-color: var(--accent); }
    .pp-pick img { width: 100%; height: 100%; display: block; }
  ` }));
}
