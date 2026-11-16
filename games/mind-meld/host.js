// Mind Meld: a category goes up ("Name a fruit"). Everyone writes one answer
// and tries to think like the room: you score 100 for every other player who
// wrote the same thing. Small typos and plurals still count as a match.
import { CATEGORIES } from './categories.js';

const ROUNDS = 8;
const TIME = 20;

const norm = (s) => {
  let w = String(s).toLowerCase().replace(/^(the|a|an) /, '').replace(/[^a-z0-9]/g, '');
  if (w.length > 4 && w.endsWith('es')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s')) w = w.slice(0, -1);
  return w;
};
function close(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  // edit distance <= 1
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  const deck = ctx.shuffle(CATEGORIES);

  await ctx.say('Mind Meld', 'Write what everyone else will write.', 3000);

  for (let round = 1; round <= ROUNDS; round++) {
    const players = ctx.connected;
    if (players.length < 2) return ctx.say('Not enough players', 'Mind Meld needs at least 2 people.', 5000);
    const cat = deck.pop();
    const mult = round === ROUNDS ? 2 : 1;
    const done = new Set();
    const board = () => ctx.el.replaceChildren(
      h('div.mm-num', round === ROUNDS ? 'LAST ONE · DOUBLE POINTS' : `${round} / ${ROUNDS}`), h('h1.mm-cat', cat),
      h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (done.has(p.id) ? '🧠 ' : '') + p.name))));
    board();
    const got = await ctx.ask(players, {
      title: cat, text: 'Write what you think most people will write.',
      input: { placeholder: 'One answer', max: 30, submit: 'Meld' },
    }, { timeout: TIME, onAnswer: (p) => { done.add(p.id); board(); }, after: { wait: 'Melding…' } });

    // Group matching answers.
    const groups = [];
    for (const p of players) {
      const raw = got.get(p.id);
      if (!raw) continue;
      const k = norm(raw);
      const g = groups.find((x) => close(x.key, k));
      if (g) g.who.push(p); else groups.push({ key: k, label: raw.trim(), who: [p] });
    }
    groups.sort((a, b) => b.who.length - a.who.length);
    for (const g of groups) for (const p of g.who) add(p.id, (g.who.length - 1) * 100 * mult);
    ctx.sfx?.(groups[0]?.who.length === players.length && players.length > 1 ? 'win' : 'ding');
    for (const p of players) {
      const g = groups.find((x) => x.who.includes(p));
      const n = g ? g.who.length - 1 : 0;
      ctx.show(p, { title: n ? `🧠 +${n * 100 * mult}` : 'No match!', text: n ? `${n} other${n === 1 ? '' : 's'} thought the same.` : 'Your mind is unique.', color: n ? '#5df08a' : '#ff5d73' });
    }
    const top = groups[0]?.who.length || 1;
    ctx.el.replaceChildren(h('h2.mm-cat', cat), h('div.mm-groups', groups.map((g) => h('div.mm-group' + (g.who.length === top && top > 1 ? '.mm-top' : ''),
      h('div.mm-label', g.label), h('div.mm-count', `×${g.who.length}`),
      h('div.mm-who', g.who.map((p) => h('span', { style: { color: p.color } }, p.name)))))),
    groups[0]?.who.length === players.length && h('p.mm-meld', 'TOTAL MIND MELD!'));
    await ctx.sleep(6500);
    if (round % 4 === 0) await scoreboard(ctx, score, round === ROUNDS ? 'Final scores' : 'Scores', 5000);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  ctx.sfx?.('win');
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'thinks just like the rest of you', 6000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.show('all', { wait: 'Scores are on the TV' });
  ctx.el.replaceChildren(h('h1', title), h('div.mm-scores', rows.map(({ p, s }) =>
    h('div.mm-srow', h('span.mm-sname', p.name),
      h('div.mm-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('mind-meld-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'mind-meld-css', textContent: `
  .mm-num { color: var(--dim); font-weight: 900; letter-spacing: .1em; }
  .mm-cat { font-size: 2.8em; }
  .mm-groups { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; max-width: 1400px; }
  .mm-group { background: var(--card); border: 3px solid var(--line); border-radius: 20px; padding: 14px 22px; min-width: 10em;
    display: flex; flex-direction: column; gap: 4px; animation: pop .35s ease-out; }
  .mm-group.mm-top { border-color: var(--accent); box-shadow: 0 0 34px color-mix(in srgb, var(--accent) 45%, transparent); }
  .mm-label { font-size: 1.6em; font-weight: 900; }
  .mm-count { color: var(--accent); font-weight: 900; font-size: 1.3em; }
  .mm-who { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; font-weight: 800; }
  .mm-meld { font-size: 2em; font-weight: 900; color: var(--accent); letter-spacing: .1em; }
  .mm-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .mm-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .mm-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mm-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .mm-sbar div { height: 100%; border-radius: 99px; }
` }));
