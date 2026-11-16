// Orbit Estates on the phone: a status strip with your cash and deeds above
// the standard views (which still draw every question).
import { CSS } from './style.js';

export default function (ctx) {
  const { h } = ctx;
  if (!document.getElementById('orbit-estates-css')) {
    document.head.append(Object.assign(document.createElement('style'), { id: 'orbit-estates-css', textContent: CSS }));
  }
  const bar = h('div.oe-bar.hidden');
  ctx.el.parentElement.insertBefore(bar, ctx.el);

  ctx.on('message', (m) => {
    if (m?.kind !== 'oe-status') return;
    if (m.done) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    bar.style.setProperty('--c', m.color);
    const tags = [
      m.myTurn && h('span.oe-bar-tag.hot', 'Your turn'),
      m.jailed && h('span.oe-bar-tag', '🧪 Quarantine'),
      m.passes > 0 && h('span.oe-bar-tag', `🎫 ${m.passes} pass${m.passes > 1 ? 'es' : ''}`),
      m.lastRound ? h('span.oe-bar-tag.hot', '⏰ Last round') : m.minutesLeft != null && h('span.oe-bar-tag', `⏱️ ${m.minutesLeft} min`),
      h('span.oe-bar-tag', `worth ₡${m.worth}`),
    ];
    bar.replaceChildren(
      h('div.oe-bar-top', h('span.oe-bar-tok', m.token), h('span.oe-bar-cash', m.bankrupt ? 'Bankrupt' : `₡${m.cash}`), h('div.oe-bar-tags', tags)),
      h('div.oe-bar-deeds', m.deeds.length ? m.deeds.map((d) => h('span.oe-bar-deed' + (d.mortgaged ? '.mort' : ''), { style: { '--g': d.color } },
        d.name, d.level === 5 ? ' 🏙️' : d.level ? ` ${'●'.repeat(d.level)}` : ''))
        : h('span.oe-bar-none', 'No deeds yet. Land on a lot to buy it.')));
  });
  ctx.send({ kind: 'oe-hello' });
}
