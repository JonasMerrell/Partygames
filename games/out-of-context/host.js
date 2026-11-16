// Out of Context: everyone answers an innocent question. Each answer is then
// handed (anonymously) to another player, who writes a NEW question that
// makes that answer sound ridiculous. The TV shows each twisted pair, then
// everyone votes for their favourite.
//   +500 per vote to the twister, +200 per vote to the original answerer
//   (x round number)
import { INNOCENT } from './prompts.js';

const ANSWER_TIME = 45;
const TWIST_TIME = 60;
const VOTE_TIME = 25;
const ROUNDS = 2;

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  let deck = ctx.shuffle(INNOCENT);

  await ctx.say('Out of Context', 'Answer innocently. Your friends will make it weird.', 3500);

  for (let round = 1; round <= ROUNDS; round++) {
    const players = ctx.shuffle(ctx.connected);
    const n = players.length;
    if (n < 3) return ctx.say('Not enough players', 'Out of Context needs at least 3 people.', 5000);
    if (deck.length < n) deck = ctx.shuffle(INNOCENT);

    // --- 1. innocent answers ---
    await ctx.say(`Round ${round}`, 'Step 1: answer an innocent question. Nothing to worry about…', 3000);
    const items = players.map((p) => ({ by: p, q: deck.pop(), a: null, twister: null, twist: null }));
    const done = new Set();
    const board = (title, who) => ctx.el.replaceChildren(h('h1', title),
      h('div.chips', who.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (done.has(p.id) ? '✓ ' : '') + p.name))));
    board('Answer your question', players);
    let stop = ctx.clock(ANSWER_TIME);
    await Promise.all(items.map(async (it) => {
      const got = await ctx.ask(it.by, {
        title: 'A perfectly innocent question', text: it.q,
        input: { placeholder: 'Your answer', max: 60, submit: 'Send' },
      }, { timeout: ANSWER_TIME, clock: false, after: { wait: 'Thanks! Nothing bad will happen to this answer.' } });
      it.a = got.get(it.by.id) || null;
      done.add(it.by.id); board('Answer your question', players);
    }));
    stop();

    // --- 2. twists: player i twists the answer of player i+1 ---
    const live = items.filter((it) => it.a);
    if (live.length < 2) { await ctx.say('Not enough answers', 'Let\'s try another round.', 3000); continue; }
    live.forEach((it, i) => { it.twister = live[(i + 1) % live.length].by; });
    done.clear();
    await ctx.say('Plot twist!', 'Step 2: write a NEW question that makes someone\'s answer sound ridiculous.', 4000);
    const twisters = live.map((it) => it.twister);
    board('Twisting answers…', twisters);
    stop = ctx.clock(TWIST_TIME);
    await Promise.all(live.map(async (it) => {
      const got = await ctx.ask(it.twister, {
        title: 'Someone answered:', text: `“${it.a}”\n\nWrite a different question that makes this answer hilarious.`,
        input: { placeholder: 'Your new question', max: 90, submit: 'Twist it' },
      }, { timeout: TWIST_TIME, clock: false, after: { wait: 'Wicked. Waiting for the others…' } });
      it.twist = got.get(it.twister.id) || null;
      done.add(it.twister.id); board('Twisting answers…', twisters);
    }));
    stop();

    // --- 3. reveal each, then vote ---
    const shows = ctx.shuffle(live.filter((it) => it.twist));
    if (!shows.length) continue;
    ctx.show('all', { wait: 'Look at the TV!' });
    for (const [i, it] of shows.entries()) {
      ctx.el.replaceChildren(h('div.oc-num', `${i + 1} / ${shows.length}`), h('div.oc-post',
        h('div.oc-q', it.twist), h('div.oc-a', it.a)));
      ctx.sfx?.('whoosh');
      await ctx.sleep(4500);
    }
    const cards = () => h('div.oc-grid', shows.map((it, i) => h('div.oc-mini', h('b', `${i + 1}. ${it.twist}`), h('span', it.a))));
    ctx.el.replaceChildren(h('h2', 'Vote for your favourite twist'), cards());
    const votes = new Map();
    stop = ctx.clock(VOTE_TIME);
    await Promise.all(ctx.connected.map(async (p) => {
      const got = await ctx.ask(p, {
        title: 'Best twist?',
        choices: shows.map((it, i) => ({ label: `${i + 1}. ${it.twist} → ${it.a}`, value: i,
          disabled: it.twister.id === p.id || it.by.id === p.id })),
      }, { timeout: VOTE_TIME, clock: false, after: { wait: 'Vote counted.' } });
      if (got.has(p.id)) votes.set(p.id, got.get(p.id));
    }));
    stop();
    const tally = shows.map(() => 0);
    for (const [pid, i] of votes) if (shows[i] && shows[i].twister.id !== pid && shows[i].by.id !== pid) tally[i]++;
    shows.forEach((it, i) => { add(it.twister.id, tally[i] * 500 * round); add(it.by.id, tally[i] * 200 * round); });
    const rank = shows.map((it, i) => ({ it, v: tally[i] })).sort((a, b) => b.v - a.v);
    ctx.sfx?.('ding');
    ctx.el.replaceChildren(h('h2', 'The originals'), h('div.oc-grid', rank.map(({ it, v }) => h('div.oc-mini' + (v && v === rank[0].v ? '.oc-win' : ''),
      h('b', it.twist), h('span', it.a),
      h('small', `Really asked: “${it.q}”`),
      h('small', h('span', { style: { color: it.by.color } }, it.by.name), ' answered · ',
        h('span', { style: { color: it.twister.color } }, it.twister.name), ` twisted · ${v} vote${v === 1 ? '' : 's'}`)))));
    await ctx.sleep(10000);
    await scoreboard(ctx, score, round === ROUNDS ? 'Final scores' : 'Scores', 5000);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  ctx.sfx?.('win');
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'took everything out of context', 6000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.oc-scores', rows.map(({ p, s }) =>
    h('div.oc-srow', h('span.oc-sname', p.name),
      h('div.oc-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('out-of-context-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'out-of-context-css', textContent: `
  .oc-num { color: var(--dim); font-weight: 900; letter-spacing: .1em; }
  .oc-post { display: flex; flex-direction: column; gap: 18px; max-width: 1200px; width: 100%; }
  .oc-q { align-self: flex-start; background: var(--card); border-radius: 26px 26px 26px 6px; padding: 22px 30px;
    font-size: 2em; font-weight: 800; text-align: left; animation: pop .35s ease-out; }
  .oc-a { align-self: flex-end; background: var(--accent); color: #12101c; border-radius: 26px 26px 6px 26px; padding: 22px 30px;
    font-size: 2.2em; font-weight: 900; text-align: right; animation: pop .5s ease-out; overflow-wrap: anywhere; }
  .oc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; width: min(1500px, 100%); }
  .oc-mini { display: flex; flex-direction: column; gap: 6px; text-align: left; background: var(--card); border: 3px solid var(--line);
    border-radius: 18px; padding: 14px 18px; }
  .oc-mini span { color: var(--accent); font-weight: 900; font-size: 1.2em; }
  .oc-mini small { color: var(--dim); }
  .oc-mini.oc-win { border-color: var(--accent); box-shadow: 0 0 30px color-mix(in srgb, var(--accent) 50%, transparent); }
  .oc-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .oc-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .oc-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .oc-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .oc-sbar div { height: 100%; border-radius: 99px; }
` }));
