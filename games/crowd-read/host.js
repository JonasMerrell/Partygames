// Crowd Read: a yes/no question goes to everyone. You answer it secretly,
// then guess how many people in the room said yes (including you).
//   exact guess +1000, off by one +500, off by two +200
// The last round is a double-points "confession" round.
import { QUESTIONS } from './questions.js';

const ROUNDS = 8;
const ANSWER_TIME = 25;

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  const deck = ctx.shuffle(QUESTIONS);

  await ctx.say('Crowd Read', 'Answer honestly. Then guess how many of you said yes.', 3500);

  for (let round = 1; round <= ROUNDS; round++) {
    const players = ctx.connected;
    if (players.length < 2) return ctx.say('Not enough players', 'Crowd Read needs at least 2 people.', 5000);
    const q = deck.pop();
    const mult = round === ROUNDS ? 2 : 1;
    const n = players.length;
    const done = new Set();
    const board = () => ctx.el.replaceChildren(
      h('div.cr-num', round === ROUNDS ? 'FINAL QUESTION · DOUBLE POINTS' : `${round} / ${ROUNDS}`),
      h('h1.cr-q', q),
      h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (done.has(p.id) ? '✓ ' : '') + p.name))));
    board();

    const said = new Map();
    const guess = new Map();
    const deadline = Date.now() + ANSWER_TIME * 1000;
    const stop = ctx.clock(ANSWER_TIME);
    await Promise.all(players.map(async (p) => {
      const a = await ctx.ask(p, {
        title: 'Be honest…', text: q,
        choices: [{ label: '✋ Yes', value: true }, { label: '🙅 No', value: false }],
      }, { timeout: Math.max(1, (deadline - Date.now()) / 1000), clock: false, after: { wait: '…' } });
      if (!a.has(p.id)) return;
      said.set(p.id, a.get(p.id));
      const g = await ctx.ask(p, {
        title: `How many of the ${n} of you said yes?`, text: q,
        number: { min: 0, max: n, step: 1, value: Math.round(n / 2), submit: 'Lock in' },
      }, { timeout: Math.max(1, (deadline - Date.now()) / 1000), clock: false, after: { wait: 'Locked in. Look at the TV!' } });
      if (g.has(p.id)) guess.set(p.id, g.get(p.id));
      done.add(p.id); board();
    }));
    stop();
    ctx.show('all', { wait: 'The count is on the TV…' });

    const yes = [...said.values()].filter(Boolean).length;
    // Suspense: count up.
    for (let k = 0; k <= yes; k++) {
      ctx.el.replaceChildren(h('h1.cr-q', q), h('div.cr-count', String(k)), h('p.cr-dim', `of ${said.size} said yes`));
      ctx.sfx?.('tick');
      await ctx.sleep(k === yes ? 1200 : 450);
    }
    ctx.sfx?.('ding');
    const rows = players.map((p) => {
      const g = guess.get(p.id);
      const off = g == null ? null : Math.abs(g - yes);
      const pts = (off === 0 ? 1000 : off === 1 ? 500 : off === 2 ? 200 : 0) * mult;
      add(p.id, pts);
      return { p, g, pts };
    });
    ctx.el.replaceChildren(h('h1.cr-q', q),
      h('div.cr-count', String(yes)),
      h('div.cr-guesses', rows.map((r) => h('div.cr-guess' + (r.pts >= 1000 * mult ? '.cr-exact' : ''), { style: { '--c': r.p.color } },
        h('b', r.p.name), h('span', r.g == null ? '—' : `guessed ${r.g}`), h('span', r.pts ? `+${r.pts}` : '')))));
    await ctx.sleep(6000);
    if (round % 4 === 0 || round === ROUNDS) await scoreboard(ctx, score, round === ROUNDS ? 'Final scores' : 'Scores', 5000);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  ctx.sfx?.('win');
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'reads this crowd like a book', 6000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.cr-scores', rows.map(({ p, s }) =>
    h('div.cr-srow', h('span.cr-sname', p.name),
      h('div.cr-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('crowd-read-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'crowd-read-css', textContent: `
  .cr-num { color: var(--dim); font-weight: 900; letter-spacing: .1em; }
  .cr-q { font-size: 2.4em; max-width: 1300px; }
  .cr-dim { color: var(--dim); font-size: 1.3em; }
  .cr-count { font-size: 8em; font-weight: 900; color: var(--accent); line-height: 1; animation: pop .25s ease-out; }
  .cr-guesses { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; max-width: 1300px; }
  .cr-guess { display: flex; flex-direction: column; gap: 2px; padding: 12px 20px; border-radius: 16px; min-width: 9em;
    background: color-mix(in srgb, var(--c) 15%, var(--card)); border: 3px solid var(--c); }
  .cr-guess.cr-exact { box-shadow: 0 0 30px var(--c); transform: scale(1.06); }
  .cr-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .cr-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .cr-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cr-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .cr-sbar div { height: 100%; border-radius: 99px; }
` }));
