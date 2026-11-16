// Face-Off: the sample game. Each prompt goes to two players; everyone else
// votes for the better answer. Two rounds, the second worth double.
import { PROMPTS } from './prompts.js';

const ANSWER_TIME = 75;   // seconds to write both answers
const VOTE_TIME = 20;

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  let deck = ctx.shuffle(PROMPTS);

  for (const round of [1, 2]) {
    const mult = round;
    const players = ctx.shuffle(ctx.connected);
    const n = players.length;
    if (n < 3) return ctx.say('Not enough players', 'Face-Off needs at least 3 people.', 5000);
    await ctx.say(`Round ${round}`, round === 1
      ? 'Answer the prompts on your phone. Funny beats correct.'
      : 'Double points this round!', 3500);

    // Prompt i goes to players i and i+1, so everyone answers two.
    if (deck.length < n) deck = ctx.shuffle(PROMPTS);
    const matchups = players.map((p, i) => ({
      prompt: deck.pop(),
      a: p, b: players[(i + 1) % n],
      answers: {},
    }));

    // --- writing ---
    const done = new Set();
    const board = () => ctx.el.replaceChildren(
      h('h1', 'Write your answers!'),
      h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (done.has(p.id) ? '✓ ' : '') + p.name))));
    board();
    const deadline = Date.now() + ANSWER_TIME * 1000;
    const stopClock = ctx.clock(ANSWER_TIME);
    await Promise.all(players.map(async (p) => {
      const mine = matchups.filter((m) => m.a.id === p.id || m.b.id === p.id);
      for (const [k, m] of mine.entries()) {
        const left = (deadline - Date.now()) / 1000;
        if (left <= 0) break;
        const got = await ctx.ask(p, {
          title: `Prompt ${k + 1} of ${mine.length}`,
          text: m.prompt,
          input: { placeholder: 'Your answer', max: 80, submit: 'Send' },
        }, { timeout: left, clock: false, after: { wait: 'Nice. Waiting for everyone else…' } });
        if (got.has(p.id)) m.answers[p.id] = got.get(p.id);
      }
      done.add(p.id);
      board();
    }));
    stopClock();
    ctx.show('all', { wait: 'Look at the big screen!' });

    // --- voting ---
    for (const m of ctx.shuffle(matchups)) {
      const A = m.answers[m.a.id] ?? '(no answer)';
      const B = m.answers[m.b.id] ?? '(no answer)';
      const card = (txt, cls) => h('div.ans.' + cls, txt);
      ctx.el.replaceChildren(
        h('h2.prompt', m.prompt),
        h('div.vs', card(A, 'left'), h('span.vsword', 'VS'), card(B, 'right')));
      const voters = ctx.connected.filter((p) => p.id !== m.a.id && p.id !== m.b.id);
      const votes = await ctx.ask(voters, {
        title: 'Which is better?', text: m.prompt,
        choices: [{ label: A, value: 'a' }, { label: B, value: 'b' }],
      }, { timeout: VOTE_TIME, after: { wait: 'Vote counted!' } });
      // Authors see a waiting screen while others vote.
      const vA = [...votes.values()].filter((v) => v === 'a').length;
      const vB = [...votes.values()].filter((v) => v === 'b').length;
      const total = vA + vB || 1;
      const pts = (v) => Math.round((v / total) * 1000 * mult);
      const sweep = (v) => (v === voters.length && v > 0 ? 250 * mult : 0);
      const gainA = pts(vA) + sweep(vA), gainB = pts(vB) + sweep(vB);
      score.set(m.a.id, (score.get(m.a.id) || 0) + gainA);
      score.set(m.b.id, (score.get(m.b.id) || 0) + gainB);
      const reveal = (txt, who, v, gain, cls) => h('div.ans.' + cls + (v > (cls === 'left' ? vB : vA) ? '.win' : ''),
        txt, h('div.by', { style: { color: who.color } }, who.name),
        h('div.votes', `${v} vote${v === 1 ? '' : 's'} · +${gain}`),
        sweep(v) ? h('div.sweep', 'CLEAN SWEEP!') : null);
      ctx.el.replaceChildren(
        h('h2.prompt', m.prompt),
        h('div.vs', reveal(A, m.a, vA, gainA, 'left'), h('span.vsword', 'VS'), reveal(B, m.b, vB, gainB, 'right')));
      await ctx.sleep(5500);
    }

    await scoreboard(ctx, score, round === 2 ? 'Final scores' : 'Scores after round 1', 7000);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won. Back to the lobby soon…` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'wins Face-Off!', 8000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.scores', rows.map(({ p, s }) =>
    h('div.srow', h('span.sname', p.name),
      h('div.sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span.spts', s)))));
  await ctx.sleep(ms);
}

// Game-specific styles live with the game.
document.getElementById('face-off-css')?.remove();
const css = Object.assign(document.createElement('style'), { id: 'face-off-css' });
css.textContent = `
  .prompt { font-size: 2em; max-width: 1100px; }
  .vs { display: flex; gap: 3vw; align-items: stretch; justify-content: center; width: 100%; max-width: 1400px; }
  .vsword { align-self: center; font-weight: 900; font-size: 1.6em; color: var(--accent); }
  .ans { flex: 1; background: var(--card); border: 3px solid var(--line); border-radius: 24px; padding: 4vh 2vw;
    font-size: 1.7em; font-weight: 800; display: flex; flex-direction: column; gap: .4em; justify-content: center;
    animation: pop .35s ease-out; overflow-wrap: anywhere; }
  .ans.win { border-color: var(--accent); box-shadow: 0 0 40px color-mix(in srgb, var(--accent) 45%, transparent); }
  .ans .by { font-size: .6em; }
  .ans .votes { font-size: .55em; color: var(--dim); }
  .ans .sweep { font-size: .55em; color: var(--accent); letter-spacing: .1em; }
  .scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .sbar div { height: 100%; border-radius: 99px; transition: width .8s; }
  .spts { text-align: right; font-variant-numeric: tabular-nums; }
`;
document.head.append(css);
