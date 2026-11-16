// Relay-console look for the phones; the standard views do the drawing,
// except the 3-clue form, which the host asks for with a 'threeClues' message.
export default function (ctx) {
  document.body.classList.add('sx-phone');
  if (!document.getElementById('sx-phone-css')) {
    const style = document.createElement('style');
    style.id = 'sx-phone-css';
    style.textContent = `
      body.sx-phone { background: radial-gradient(40em 30em at 50% 20%, #13263f, #070c15 70%) !important; color: #e8f4ff !important;
        font-family: 'Share Tech Mono', ui-monospace, 'SF Mono', Menlo, monospace; }
      body.sx-phone .view { border: 2px solid #2a3d57; border-top: 5px solid #3ee6c1; background: #0d1726; padding: 14px;
        clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); }
      body.sx-phone h1, body.sx-phone h2 { letter-spacing: .06em; text-transform: uppercase; }
      body.sx-phone button { border-radius: 4px !important; font-weight: 800 !important; letter-spacing: .04em; }
      body.sx-phone input, body.sx-phone textarea { background: #060b14 !important; color: #e8f4ff !important;
        border: 2px solid #3ee6c1 !important; border-radius: 4px !important; }
      .sx-form { display: flex; flex-direction: column; gap: 10px; width: 100%; }
      .sx-form input { width: 100%; padding: 12px 14px; font-size: 1.05rem; box-sizing: border-box; font-family: inherit; }
      .sx-form .sx-cat { margin: 0 0 4px; color: #9fb4cc; }
      .sx-form .sx-err { color: #ff8a8a; font-size: .95rem; min-height: 1.1em; }
      .sx-form button { padding: 14px 18px; border: 0; font-size: 1.05rem; cursor: pointer; color: #04221b; font-family: inherit; }
    `;
    document.head.appendChild(style);
  }

  ctx.on('message', (m) => {
    if (!m || m.mode !== 'threeClues') return;
    const h = ctx.h;
    const color = m.color || '#3ee6c1';
    const inputs = [1, 2, 3].map((n) => h('input', { type: 'text', maxlength: 24, placeholder: `Clue ${n} (one word)`, autocomplete: 'off' }));
    const err = h('div.sx-err');
    const btn = h('button', {
      style: { background: color },
      onclick: () => {
        const vals = inputs.map((el) => el.value.trim().split(/\s+/)[0] || '');
        if (vals.some((v) => !v)) { err.textContent = 'Enter all 3 one-word clues.'; return; }
        ctx.send({ clues: vals });
        ctx.renderView({ title: 'Transmitted', text: 'Routing through the Kestrel relay…', wait: 'Waiting for the other crew members…', color });
      },
    }, 'Transmit 3 clues');
    ctx.el.replaceChildren(h('div.view', { style: { borderTopColor: color } },
      h('div.sx-form',
        h('h2', { style: { margin: 0 } }, `Secret word: ${m.word}`),
        h('p.sx-cat', `Category: ${m.cat}`),
        ...inputs, err, btn)));
    inputs[0].focus();
  });
}
