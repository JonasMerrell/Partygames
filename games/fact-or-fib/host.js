// Fact or Fib: rapid-fire true or false. Right answers score 500 plus a
// speed bonus of up to 500. Three right in a row starts a streak worth an
// extra 100 per answer. Late joiners jump straight in.
import { FACTS } from './facts.js';

const QUESTIONS = 12;
const TIME = 10;

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map();
  const streak = new Map();
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  const deck = ctx.shuffle(FACTS).slice(0, QUESTIONS);

  await ctx.say('Fact or Fib', 'True or false? Fast answers score more.', 3500);

  for (const [i, f] of deck.entries()) {
    const players = ctx.connected;
    if (!players.length) return;
    ctx.el.replaceChildren(h('div.ff-num', `${i + 1} / ${deck.length}`), h('h1.ff-s', f.s),
      h('div.ff-opts', h('div.ff-opt.ff-t', 'FACT'), h('div.ff-opt.ff-f', 'FIB')));
    const start = Date.now();
    const when = new Map();
    const got = await ctx.ask(players, {
      title: `${i + 1} / ${deck.length}`, text: f.s,
      choices: [{ label: '✅ Fact', value: true }, { label: '❌ Fib', value: false }],
    }, { timeout: TIME, onAnswer: (p) => when.set(p.id, Date.now()), after: { wait: 'Locked in!' } });

    const right = [];
    for (const p of players) {
      if (got.get(p.id) === f.t) {
        const secs = ((when.get(p.id) || Date.now()) - start) / 1000;
        const s = (streak.get(p.id) || 0) + 1;
        streak.set(p.id, s);
        const gain = 500 + Math.round(500 * Math.max(0, 1 - secs / TIME)) + (s >= 3 ? 100 * (s - 2) : 0);
        add(p.id, gain);
        right.push({ p, gain, s, secs });
      } else {
        streak.set(p.id, 0);
        score.set(p.id, score.get(p.id) || 0);
      }
    }
    ctx.sfx?.('ding');
    right.sort((a, b) => a.secs - b.secs);
    for (const p of players) {
      const r = right.find((x) => x.p.id === p.id);
      ctx.show(p, r
        ? { title: `✅ +${r.gain}`, text: r.s >= 3 ? `🔥 ${r.s} in a row!` : 'Nice!', color: '#5df08a' }
        : { title: '❌ Nope', text: f.t ? 'That one was true.' : 'That one was a fib.', color: '#ff5d73' });
    }
    ctx.el.replaceChildren(h('div.ff-num', `${i + 1} / ${deck.length}`), h('h1.ff-s', f.s),
      h('div.ff-verdict' + (f.t ? '.ff-t' : '.ff-f'), f.t ? 'FACT' : 'FIB'),
      h('p.ff-why', f.why),
      h('div.ff-fast', right.slice(0, 5).map((r) => h('span', { style: { color: r.p.color } },
        `${r.p.name} ${r.secs.toFixed(1)}s${r.s >= 3 ? ' 🔥' : ''}`))),
      !right.length && h('p.ff-why', 'Nobody got that one!'));
    await ctx.sleep(4500);
    if ((i + 1) % 4 === 0 && i + 1 < deck.length) await scoreboard(ctx, score, 'Scores so far', 4000);
  }

  await scoreboard(ctx, score, 'Final scores', 6000);
  const best = Math.max(0, ...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'can tell a fact from a fib', 6000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.show('all', { wait: 'Scores are on the TV' });
  ctx.el.replaceChildren(h('h1', title), h('div.ff-scores', rows.map(({ p, s }) =>
    h('div.ff-srow', h('span.ff-sname', p.name),
      h('div.ff-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('fact-or-fib-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'fact-or-fib-css', textContent: `
  .ff-num { color: var(--dim); font-weight: 900; letter-spacing: .1em; }
  .ff-s { font-size: 2.6em; max-width: 1300px; animation: pop .3s ease-out; }
  .ff-opts { display: flex; gap: 3vw; }
  .ff-opt, .ff-verdict { font-weight: 900; font-size: 1.6em; padding: 14px 40px; border-radius: 20px; letter-spacing: .1em; }
  .ff-t { background: #5df08a; color: #10301a; }
  .ff-f { background: #ff5d73; color: #3a0d15; }
  .ff-verdict { font-size: 3em; animation: pop .4s ease-out; }
  .ff-why { color: var(--dim); font-size: 1.3em; max-width: 1100px; }
  .ff-fast { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; font-weight: 800; font-size: 1.2em; }
  .ff-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .ff-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .ff-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ff-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .ff-sbar div { height: 100%; border-radius: 99px; }
` }));
