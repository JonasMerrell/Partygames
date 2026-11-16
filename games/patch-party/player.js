// Patch Party phone: tailor cutting-mat green grid styling,
// round felt drawing pad, and swatch pickers.
export default function (ctx) {
  const { h } = ctx;
  ctx.el.classList.add('pp-phone-stage');

  ctx.on('view', (view) => {
    if (!view || !view.pick) return ctx.renderView(view);
    const box = h('div.view.pp-view',
      view.title && h('h2.pp-title', view.title),
      view.text && h('p.view-text.pp-text', view.text),
      h('div.pp-picks', view.pick.map((src, i) => h('button.pp-pick', {
        onclick: () => ctx.send({ kind: 'answer', ask: view.ask, value: i }),
      },
      h('div.pp-pick-felt', h('img', { src, alt: `Design ${i + 1}` }))
      ))));
    ctx.el.replaceChildren(box);
  });

  document.getElementById('patch-party-phone-css')?.remove();
  document.head.append(Object.assign(document.createElement('style'), { id: 'patch-party-phone-css', textContent: `
    .pp-phone-stage {
      background-color: #173b2f !important;
      background-image:
        linear-gradient(rgba(255, 235, 150, 0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 235, 150, 0.12) 1px, transparent 1px),
        linear-gradient(rgba(255, 235, 150, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 235, 150, 0.04) 1px, transparent 1px) !important;
      background-size: 80px 80px, 80px 80px, 16px 16px, 16px 16px !important;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
      min-height: 100vh;
      padding: 16px;
    }
    .pp-picks { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 8px 0; }
    .pp-pick {
      padding: 6px;
      border: 4px dashed #d48b28;
      border-radius: 50%;
      overflow: hidden;
      background: #fbf8f2;
      cursor: pointer;
      aspect-ratio: 1;
      box-shadow: 0 6px 14px rgba(0,0,0,0.45);
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .pp-pick:active {
      transform: scale(0.96);
      border-color: #ffd700;
      box-shadow: 0 2px 6px rgba(0,0,0,0.6);
    }
    .pp-pick-felt { width: 100%; height: 100%; border-radius: 50%; overflow: hidden; background: #fff; }
    .pp-pick-felt img { width: 100%; height: 100%; display: block; object-fit: contain; }

    /* Cutting Mat Drawing Pad */
    .pp-phone-stage canvas.pad {
      border-radius: 50% !important;
      border: 6px dashed #d48b28 !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.1) !important;
      background: #faf7f2 !important;
      aspect-ratio: 1;
    }
    .pp-phone-stage .swatches {
      background: rgba(0,0,0,0.3);
      padding: 8px 12px;
      border-radius: 12px;
      border: 1px dashed rgba(255,255,255,0.25);
    }
    .pp-phone-stage .swatch {
      border-radius: 6px !important;
      border: 2px solid #fff !important;
      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
    }
    .pp-phone-stage .swatch.on {
      transform: scale(1.15);
      border-color: #ffd700 !important;
    }
  ` }));
}
