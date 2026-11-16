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
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;900&family=Crimson+Pro:ital,wght@0,400;0,700;1,400&display=swap');
  .view, body { font-family: 'Crimson Pro', Georgia, serif; }
  .hmp-svg { line-height: 0; display: inline-block; }
  .hmp-who { display: flex; gap: 12px; align-items: center; }
  .hmp-who h2 { margin: 0; font-family: 'Cinzel', serif; font-size: 1.4em; }
  .hmp-pad {
    display: grid; grid-template-columns: repeat(3, 1fr); grid-template-areas: ". u ." "l s r" ". d ."; gap: 10px;
    width: min(100%, 330px); margin: 0 auto;
  }
  .hmp-dir {
    aspect-ratio: 1; border-radius: 18px; border: 2px solid #f9e79f;
    background: linear-gradient(145deg, #d4ac0d, #a07800); color: #1c1503;
    font-size: 2em; font-weight: 900; font-family: 'Cinzel', serif;
    box-shadow: 0 5px 0 #594300, 0 8px 15px rgba(0,0,0,0.4); cursor: pointer;
    transition: transform .1s, box-shadow .1s;
  }
  .hmp-dir:active { transform: translateY(3px); box-shadow: 0 2px 0 #594300; }
  .hmp-dir:disabled { filter: grayscale(1) brightness(.45); opacity: .4; }
  .hmp-dir.u { grid-area: u; } .hmp-dir.d { grid-area: d; } .hmp-dir.l { grid-area: l; } .hmp-dir.r { grid-area: r; }
  .hmp-dir.stop {
    grid-area: s; font-size: 1em; background: #231c2c; color: #f6eedb;
    border: 2px solid #4d3a5a; box-shadow: 0 4px 0 #120d18; font-family: 'Cinzel', serif;
  }
  .hmp-picks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .hmp-pick {
    background: #231c2c; border: 2px solid #4d3a5a; border-radius: 14px; padding: 8px 4px; display: flex;
    flex-direction: column; align-items: center; gap: 4px; font-weight: 800; font-size: .8em; cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: 'Cinzel', serif;
  }
  .hmp-pick.mine { border-color: #d4ac0d; box-shadow: 0 0 12px rgba(212,172,13,0.35); }
  .hmp-pick b { color: #d4ac0d; font-size: .9em; }
  .hmp-pick:disabled, .hmp-skip:disabled { opacity: .4; }
  .hmp-skip { grid-column: 1 / -1; text-align: center; font-family: 'Cinzel', serif; }
  .hmp-hand {
    margin-top: 20px; padding: 14px 10px; border-top: 2px solid #4d3a5a;
    background: rgba(29, 23, 41, 0.65); border-radius: 16px; display: flex; flex-direction: column; gap: 10px;
  }
  .hmp-k { color: #d4ac0d; font-family: 'Cinzel', serif; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; font-size: .75em; }
  .hmp-heirs { display: flex; flex-wrap: wrap; gap: 10px; }
  .hmp-heir { display: flex; flex-direction: column; align-items: center; width: 6.2em; text-align: center; font-weight: 800; font-size: .8em; font-family: 'Cinzel', serif; }
  .hmp-heir b { color: #d4ac0d; font-size: .85em; }
  .hmp-heir i { color: var(--dim); }
  .hmp-heir.out span { text-decoration: line-through; opacity: .5; }
  .hmp-cards { display: flex; flex-wrap: wrap; gap: 8px; }
  .hmp-card {
    background: linear-gradient(135deg, #441822, #290f15); border: 2px solid #e74c3c; border-radius: 12px;
    padding: 6px 10px; display: flex; flex-direction: column; align-items: center; font-weight: 800; font-size: .8em; min-width: 6em;
    box-shadow: 0 4px 10px rgba(0,0,0,0.4); font-family: 'Crimson Pro', Georgia, serif;
  }
  .hmp-card.cod {
    background: linear-gradient(135deg, #3d2f14, #241c0b); border-color: #f1c40f;
    box-shadow: 0 0 10px rgba(241, 196, 15, 0.25);
  }
  .hmp-card small { color: var(--dim); font-weight: 600; }
  .hmp-ci { font-size: 1.6em; }
  `;
  document.head.append(css);
}
