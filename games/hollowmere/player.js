// Hollowmere phone: your secret heirs and cards stay on screen under every
// view, heirs are picked by portrait, and moves use a D-pad.
import { HEIR, CARDS, portrait } from './art.js';

export default function (ctx) {
  const { h } = ctx;
  injectCss();
  const svg = (s) => { const d = h('span.hmp-svg'); d.innerHTML = s; return d; };

  ctx.on('view', (view) => {
    const answer = (value) => {
      ctx.el.querySelectorAll('button').forEach((b) => (b.disabled = true));
      ctx.send({ kind: 'answer', ask: view.ask, value });
    };
    if (view?.dpad && view.ask) {
      const hr = HEIR[view.dpad];
      const by = Object.fromEntries(view.choices.map((c) => [c.value, c]));
      const btn = (d, cls, label) => h('button.hmp-dir.' + cls, { disabled: by[d]?.disabled, onclick: () => answer(d) }, label);
      ctx.el.replaceChildren(h('div.view',
        h('div.hmp-who', svg(portrait(hr, 56)), h('div', h('h2', hr.name), h('p.view-text', view.text))),
        h('div.hmp-pad',
          btn('u', 'u', '▲'), btn('l', 'l', '◀'),
          h('button.hmp-dir.stop', { onclick: () => answer('stop') }, 'Stop'),
          btn('r', 'r', '▶'), btn('d', 'd', '▼'))));
    } else if (view?.pick && view.ask) {
      ctx.el.replaceChildren(h('div.view',
        view.title && h('h2', view.title), view.text && h('p.view-text', view.text),
        h('div.hmp-picks', view.choices.map((c) => c.heir
          ? h('button.hmp-pick' + (c.label.endsWith('★') ? '.mine' : ''), { onclick: () => answer(c.value) },
            svg(portrait(HEIR[c.heir], 52)), h('span', HEIR[c.heir].name), c.label.endsWith('★') ? h('b', '★ yours') : null)
          : h('button.choice.hmp-skip', { onclick: () => answer(c.value) }, c.label)))));
    } else {
      ctx.renderView(view);
    }
    if (view?.hand) ctx.el.append(handPanel(view.hand));
  });

  function handPanel(hand) {
    return h('div.hmp-hand',
      h('div.hmp-k', 'Your secret heirs'),
      h('div.hmp-heirs', hand.heirs.map((x) => h('div.hmp-heir' + (x.out ? '.out' : '') + (x.named ? '.named' : ''),
        svg(portrait(HEIR[x.id], 46, x.out)), h('span', HEIR[x.id].name),
        x.named ? h('b', '📜 named in the will') : x.out ? h('i', 'departed') : null))),
      h('div.hmp-k', 'Your cards'),
      h('div.hmp-cards', hand.cards.length ? hand.cards.map((c) => h('div.hmp-card' + (c === 'codicil' ? '.cod' : ''),
        h('span.hmp-ci', CARDS[c].icon), h('span', CARDS[c].name), CARDS[c].room && h('small', CARDS[c].room)))
        : h('p.sub', 'No cards. You draw one at the end of each turn.')),
      hand.named && h('p.sub', `The will currently names ${HEIR[hand.named].name}.`));
  }
}

function injectCss() {
  if (document.getElementById('hollowmere-phone-css')) return;
  const css = Object.assign(document.createElement('style'), { id: 'hollowmere-phone-css' });
  css.textContent = `
  .hmp-svg { line-height: 0; display: inline-block; }
  .hmp-who { display: flex; gap: 12px; align-items: center; }
  .hmp-who h2 { margin: 0; }
  .hmp-pad { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-areas: ". u ." "l s r" ". d ."; gap: 10px;
    width: min(100%, 330px); margin: 0 auto; }
  .hmp-dir { aspect-ratio: 1; border-radius: 18px; border: 0; background: var(--accent); color: #120f1d; font-size: 2em; font-weight: 900;
    box-shadow: 0 5px 0 color-mix(in srgb, var(--accent) 55%, #000); cursor: pointer; }
  .hmp-dir:active { transform: translateY(3px); box-shadow: 0 2px 0 color-mix(in srgb, var(--accent) 55%, #000); }
  .hmp-dir:disabled { filter: grayscale(1) brightness(.45); }
  .hmp-dir.u { grid-area: u; } .hmp-dir.d { grid-area: d; } .hmp-dir.l { grid-area: l; } .hmp-dir.r { grid-area: r; }
  .hmp-dir.stop { grid-area: s; font-size: 1em; background: var(--card); color: var(--fg); border: 2px solid var(--line); box-shadow: none; }
  .hmp-picks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .hmp-pick { background: var(--card); border: 2px solid var(--line); border-radius: 14px; padding: 8px 4px; display: flex;
    flex-direction: column; align-items: center; gap: 4px; font-weight: 800; font-size: .8em; cursor: pointer; }
  .hmp-pick.mine { border-color: #d4ac0d; }
  .hmp-pick b { color: #d4ac0d; font-size: .9em; }
  .hmp-pick:disabled, .hmp-skip:disabled { opacity: .4; }
  .hmp-skip { grid-column: 1 / -1; text-align: center; }
  .hmp-hand { margin-top: 22px; padding-top: 14px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 10px; }
  .hmp-k { color: var(--dim); font-weight: 800; text-transform: uppercase; letter-spacing: .08em; font-size: .75em; }
  .hmp-heirs { display: flex; flex-wrap: wrap; gap: 10px; }
  .hmp-heir { display: flex; flex-direction: column; align-items: center; width: 6.2em; text-align: center; font-weight: 800; font-size: .8em; }
  .hmp-heir b { color: #d4ac0d; font-size: .85em; }
  .hmp-heir i { color: var(--dim); }
  .hmp-heir.out span { text-decoration: line-through; opacity: .5; }
  .hmp-cards { display: flex; flex-wrap: wrap; gap: 8px; }
  .hmp-card { background: #3a1f28; border: 2px solid #ff5d73; border-radius: 12px; padding: 6px 10px; display: flex; flex-direction: column;
    align-items: center; font-weight: 800; font-size: .8em; min-width: 6em; }
  .hmp-card.cod { background: #3a2f1a; border-color: #d4ac0d; }
  .hmp-card small { color: var(--dim); font-weight: 600; }
  .hmp-ci { font-size: 1.6em; }
  `;
  document.head.append(css);
}
