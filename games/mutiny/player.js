// Phone extra for Mutiny on the Starling: a "hold to see your role" button that
// stays at the bottom of the screen, so a secret role can be rechecked without
// leaving it on show. The normal phone views still draw everything else.
export default function (ctx) {
  const { h } = ctx;
  document.querySelectorAll('.mt-rolebtn, .mt-rolecard, #mutiny-phone-css').forEach((e) => e.remove());

  const img = h('img', { alt: '' });
  const title = h('h2');
  const text = h('p');
  const card = h('div.mt-rolecard.hidden', img, title, text);
  const btn = h('button.mt-rolebtn.hidden', '🔒 Hold to see your role');
  const show = (e) => { e.preventDefault(); card.classList.remove('hidden'); };
  const hide = () => card.classList.add('hidden');
  btn.addEventListener('pointerdown', show);
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, hide);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  document.body.append(card, btn);

  ctx.on('message', (m) => {
    if (m?.kind !== 'role') return;
    if (m.hide) { btn.classList.add('hidden'); hide(); return; }
    img.src = m.image;
    title.textContent = m.title;
    title.style.color = m.color;
    text.textContent = m.text;
    btn.classList.remove('hidden');
  });
  ctx.send({ kind: 'hello' });

  const css = h('style#mutiny-phone-css');
  css.textContent = `
    body.phone main { padding-bottom: 110px; }
    .mt-rolebtn { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(16px + env(safe-area-inset-bottom));
      width: min(488px, calc(100% - 32px)); padding: 18px; border-radius: 16px; border: 2px solid var(--line);
      background: var(--bg2); color: var(--fg); font-weight: 800; font-size: 1.05em; user-select: none; -webkit-user-select: none;
      touch-action: none; -webkit-touch-callout: none; z-index: 10; }
    .mt-rolebtn:active { border-color: var(--accent); }
    .mt-rolecard { position: fixed; inset: 0; bottom: calc(96px + env(safe-area-inset-bottom)); background: var(--bg); z-index: 9;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 20px; text-align: center;
      pointer-events: none; }
    .mt-rolecard img { max-height: 46vh; max-width: 80%; }
    .mt-rolecard h2 { font-size: 2em; margin: 0; }
    .mt-rolecard p { font-size: 1.1em; margin: 0; max-width: 460px; }
  `;
  document.head.append(css);
}
