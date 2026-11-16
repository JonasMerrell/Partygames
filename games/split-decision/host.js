// Split Decision: each player gets a tempting offer and writes the catch.
// Everyone else votes whether they'd take the deal. The closer the room
// splits to 50/50, the more the author scores. Voters who side with the
// minority get a small bonus for bravery.
import { OFFERS } from './offers.js';

const WRITE_TIME = 70;
const VOTE_TIME = 20;
const ROUNDS = 2;

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  let deck = ctx.shuffle(OFFERS);

  await ctx.say('Split Decision', 'Write a catch so the room can\'t agree.', 4000);

  for (let round = 1; round <= ROUNDS; round++) {
    const players = ctx.connected;
    if (players.length < 3) return ctx.say('Not enough players', 'Split Decision needs at least 3 people.', 5000);
    if (deck.length < players.length) deck = ctx.shuffle(OFFERS);
    const deals = players.map((p) => ({ by: p, offer: deck.pop(), catch: null }));

    // --- writing ---
    const done = new Set();
    const board = () => ctx.el.replaceChildren(
      h('h1', `Round ${round}: write the catch`),
      h('p.sd-sub', 'Make it hard to choose. A perfect 50/50 split scores the most.'),
      h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (done.has(p.id) ? '✓ ' : '') + p.name))));
    board();
    const stopClock = ctx.clock(WRITE_TIME);
    await Promise.all(deals.map(async (d) => {
      const got = await ctx.ask(d.by, {
        title: 'The deal', text: `${d.offer}… BUT`,
        input: { placeholder: 'the catch', max: 90, submit: 'Seal the deal' },
      }, { timeout: WRITE_TIME, after: { wait: 'Devious. Waiting for the others…' }, clock: false });
      d.catch = got.get(d.by.id) || null;
      done.add(d.by.id); board();
    }));
    stopClock();
    ctx.show('all', { wait: 'Look at the TV!' });

    // --- voting ---
    for (const d of ctx.shuffle(deals.filter((x) => x.catch))) {
      const voters = ctx.connected.filter((p) => p.id !== d.by.id);
      const card = (extra) => h('div.sd-card', h('div.sd-offer', d.offer), h('div.sd-but', 'BUT'),
        h('div.sd-catch', d.catch), extra);
      ctx.el.replaceChildren(h('h2', 'Would you take the deal?'), card());
      const votes = await ctx.ask(voters, {
        title: 'Take the deal?', text: `${d.offer}…\nBUT ${d.catch}`,
        choices: [{ label: '👍 Deal', value: 'yes' }, { label: '👎 No deal', value: 'no' }],
      }, { timeout: VOTE_TIME, after: { wait: 'Locked in. Look at the TV!' } });
      const yes = [...votes.values()].filter((v) => v === 'yes').length;
      const no = votes.size - yes;
      const total = yes + no;
      const split = total ? 1 - Math.abs(yes - no) / total : 0;
      const gain = Math.round(split * 1000 * round);
      add(d.by.id, gain);
      const minority = yes === no ? null : (yes < no ? 'yes' : 'no');
      if (minority) for (const [id, v] of votes) if (v === minority) add(id, 100 * round);
      ctx.sfx?.(split === 1 && total > 1 ? 'win' : 'ding');
      const pct = total ? Math.round((yes / total) * 100) : 0;
      ctx.el.replaceChildren(h('h2', split === 1 && total > 1 ? 'PERFECT SPLIT!' : 'The room says…'),
        card(h('div.sd-by', { style: { color: d.by.color } }, `catch by ${d.by.name} · +${gain}`)),
        h('div.sd-bar', h('div.sd-yes', { style: { width: `${pct}%` } }, `${yes} deal`),
          h('div.sd-no', { style: { width: `${100 - pct}%` } }, `${no} no deal`)),
        minority && h('p.sd-sub', `Brave minority (+${100 * round}): ${[...votes].filter(([, v]) => v === minority).map(([id]) => ctx.player(id)?.name).join(', ')}`));
      await ctx.sleep(6000);
    }
    await scoreboard(ctx, score, round === ROUNDS ? 'Final scores' : `Scores after round ${round}`, 7000);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'the master of indecision!', 7000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.show('all', { wait: 'Scores are on the TV' });
  ctx.el.replaceChildren(h('h1', title), h('div.sd-scores', rows.map(({ p, s }) =>
    h('div.sd-srow', h('span.sd-sname', p.name),
      h('div.sd-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('split-decision-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'split-decision-css', textContent: `
  .sd-sub { color: var(--dim); font-size: 1.1em; }
  .sd-card { background: var(--card); border: 3px solid var(--line); border-radius: 28px; padding: 4vh 4vw; max-width: 1100px;
    display: flex; flex-direction: column; gap: .5em; animation: pop .35s ease-out; }
  .sd-offer { font-size: 1.8em; font-weight: 800; }
  .sd-but { font-size: 2.4em; font-weight: 900; color: var(--accent); letter-spacing: .1em; }
  .sd-catch { font-size: 1.8em; font-weight: 800; overflow-wrap: anywhere; }
  .sd-by { font-size: 1em; font-weight: 800; }
  .sd-bar { display: flex; width: min(1100px, 90vw); height: 2.6em; border-radius: 99px; overflow: hidden; font-weight: 900; }
  .sd-bar div { display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden; transition: width .8s; }
  .sd-yes { background: #5df08a; color: #10301a; }
  .sd-no { background: #ff5d73; color: #3a0d15; }
  .sd-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .sd-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .sd-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sd-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .sd-sbar div { height: 100%; border-radius: 99px; }
` }));
