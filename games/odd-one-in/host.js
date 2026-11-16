// Odd One In: everyone answers the same question, except one player whose
// phone shows a different question. They know they're the odd one, but not
// what everyone else was asked. Answers go up on the TV, the room talks it
// over, then everyone votes for who they think got the different question.
//   +500  for voting for the odd one
//   +250  to the odd one for each player who didn't vote for them
//   +500  to the odd one if they escape (not the most-voted player)
import { PAIRS } from './questions.js';

const ANSWER_TIME = 40;
const TALK_TIME = 30;
const VOTE_TIME = 20;

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  const rounds = Math.min(5, Math.max(3, ctx.connected.length));
  let deck = ctx.shuffle(PAIRS);
  let oddPool = [];

  await ctx.say('Odd One In', 'One of you got a different question. Blend in, or sniff them out.', 4500);

  for (let round = 1; round <= rounds; round++) {
    const players = ctx.connected;
    if (players.length < 3) return ctx.say('Not enough players', 'Odd One In needs at least 3 people.', 5000);
    if (!deck.length) deck = ctx.shuffle(PAIRS);
    const pair = deck.pop();
    // Rotate the odd role so everyone gets a turn before anyone gets two.
    oddPool = oddPool.filter((id) => players.some((p) => p.id === id));
    if (!oddPool.length) oddPool = ctx.shuffle(players.map((p) => p.id));
    const odd = ctx.player(oddPool.pop());

    await ctx.say(`Round ${round} of ${rounds}`, 'Check your phone. Answer honestly… mostly.', 2500);
    const input = pair.kind === 'number'
      ? { number: { min: pair.min, max: pair.max, step: 1, value: Math.round((pair.min + pair.max) / 2), submit: 'Lock in' } }
      : { input: { placeholder: 'Your answer', max: 40, submit: 'Send' } };
    const done = new Set();
    const board = () => ctx.el.replaceChildren(h('h1', 'Answer your question'),
      h('p.oo-dim', 'One phone is showing a different question…'),
      h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (done.has(p.id) ? '✓ ' : '') + p.name))));
    board();
    const answers = new Map();
    const stop = ctx.clock(ANSWER_TIME);
    await Promise.all(players.map(async (p) => {
      const isOdd = p.id === odd.id;
      const got = await ctx.ask(p, {
        title: isOdd ? '🕵️ You\'re the odd one!' : 'Your question',
        text: (isOdd ? pair.odd + '\n\nEveryone else has a different question. Blend in!' : pair.q),
        color: isOdd ? '#ff5d73' : undefined,
        buzz: isOdd, ...input,
      }, { timeout: ANSWER_TIME, clock: false, after: { wait: 'Got it. Waiting for the others…' } });
      answers.set(p.id, got.has(p.id) ? String(got.get(p.id)) : '…');
      done.add(p.id); board();
    }));
    stop();

    // --- answers on the TV, then talk it over ---
    const grid = (extra) => h('div.oo-grid', players.map((p) => h('div.oo-ans' + (extra?.(p) || ''), { style: { '--c': p.color } },
      h('div.oo-name', p.name), h('div.oo-val', answers.get(p.id)))));
    ctx.show('all', { title: 'Talk it over', wait: 'Who got the different question? Discuss!' });
    ctx.el.replaceChildren(h('h2.oo-q', pair.q), grid(), h('p.oo-dim', 'Everyone except one person answered this. Who doesn\'t fit?'));
    await ctx.countdown(TALK_TIME);

    // --- vote ---
    const votes = new Map();
    const stopV = ctx.clock(VOTE_TIME);
    await Promise.all(players.map(async (p) => {
      const got = await ctx.ask(p, {
        title: 'Who\'s the odd one?', text: pair.q,
        choices: players.filter((x) => x.id !== p.id).map((x) => ({ label: `${x.name}: ${answers.get(x.id)}`, value: x.id })),
      }, { timeout: VOTE_TIME, clock: false, after: { wait: 'Vote locked.' } });
      if (got.has(p.id)) votes.set(p.id, got.get(p.id));
    }));
    stopV();

    const tally = new Map();
    for (const v of votes.values()) tally.set(v, (tally.get(v) || 0) + 1);
    const top = Math.max(0, ...tally.values());
    const caught = (tally.get(odd.id) || 0) === top && top > 0;
    const voters = players.filter((p) => p.id !== odd.id);
    let fooled = 0;
    for (const p of voters) {
      if (votes.get(p.id) === odd.id) add(p.id, 500); else fooled++;
    }
    add(odd.id, fooled * 250 + (caught ? 0 : 500));

    ctx.sfx?.(caught ? 'win' : 'lose');
    ctx.show('all', { wait: 'The truth is on the TV!' });
    ctx.el.replaceChildren(h('h2', caught ? `Caught! It was ${odd.name}` : `${odd.name} got away with it!`),
      h('div.oo-reveal', h('div', h('span.oo-dim', 'Everyone got: '), pair.q),
        h('div', h('span.oo-dim', `${odd.name} got: `), pair.odd)),
      grid((p) => (p.id === odd.id ? '.oo-odd' : '')),
      h('div.oo-votes', players.map((p) => h('span', { style: { color: p.color } },
        `${p.name} ${tally.get(p.id) ? '🗳️'.repeat(tally.get(p.id)) : ''}`))));
    await ctx.sleep(8000);
    await scoreboard(ctx, score, round === rounds ? 'Final scores' : 'Scores', round === rounds ? 7000 : 4500);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'the sharpest eye (or best liar) in the room', 7000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.oo-scores', rows.map(({ p, s }) =>
    h('div.oo-srow', h('span.oo-sname', p.name),
      h('div.oo-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('odd-one-in-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'odd-one-in-css', textContent: `
  .oo-dim { color: var(--dim); }
  .oo-q { font-size: 2em; max-width: 1200px; }
  .oo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; width: min(1400px, 100%); }
  .oo-ans { background: color-mix(in srgb, var(--c) 18%, var(--card)); border: 3px solid var(--c); border-radius: 22px;
    padding: 18px; animation: pop .35s ease-out; }
  .oo-ans.oo-odd { box-shadow: 0 0 0 6px #ff5d73, 0 0 50px #ff5d7388; transform: scale(1.05); }
  .oo-name { font-weight: 900; color: var(--c); }
  .oo-val { font-size: 1.8em; font-weight: 900; overflow-wrap: anywhere; }
  .oo-reveal { display: flex; flex-direction: column; gap: 8px; font-size: 1.3em; font-weight: 800; max-width: 1200px; }
  .oo-votes { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; font-weight: 800; }
  .oo-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .oo-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .oo-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .oo-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .oo-sbar div { height: 100%; border-radius: 99px; }
` }));
