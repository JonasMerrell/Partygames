// Line 'Em Up: four things go up on the TV. Put them in order on your phone,
// tapping them one at a time from lowest to highest.
//   +250 per item in the right spot, +500 bonus for a perfect line
//   The fastest perfect line each round gets +250 more.
import { SETS } from './sets.js';

const ROUNDS = 8;
const TIME = 40;

const fmtYear = (v) => (v < 0 ? `${-v} BC` : String(v));

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  const deck = ctx.shuffle(SETS);

  await ctx.say('Line \'Em Up', 'Put four things in order. Close counts, perfect counts more.', 3500);

  for (let round = 1; round <= Math.min(ROUNDS, SETS.length); round++) {
    const players = ctx.connected;
    if (!players.length) return;
    const set = deck.pop();
    const items = ctx.shuffle(set.items.map(([name, v]) => ({ name, v })));
    const correct = [...items].sort((a, b) => a.v - b.v).map((x) => x.name);
    const fmt = (v) => (set.unit ? `${v.toLocaleString()}${set.unit}` : fmtYear(v));
    const done = new Set();
    const board = () => ctx.el.replaceChildren(h('div.le-num', `${round} / ${ROUNDS}`), h('h1', set.q),
      h('div.le-row', items.map((x) => h('div.le-card', x.name))),
      h('p.le-dim', `${set.low} → ${set.high}`),
      h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (done.has(p.id) ? '✓ ' : '') + p.name))));
    board();

    const lines = new Map();
    const when = new Map();
    const start = Date.now();
    const deadline = start + TIME * 1000;
    const stop = ctx.clock(TIME);
    await Promise.all(players.map(async (p) => {
      const line = [];
      while (line.length < items.length - 1 && Date.now() < deadline) {
        const left = items.filter((x) => !line.includes(x.name));
        const got = await ctx.ask(p, {
          title: `${set.q}`,
          text: `Tap the ${line.length ? 'next' : set.low.toLowerCase()} one.${line.length ? `\n\nSo far: ${line.join(' → ')}` : ''}`,
          choices: left.map((x) => ({ label: x.name, value: x.name })),
        }, { timeout: (deadline - Date.now()) / 1000, clock: false, after: { wait: '…' } });
        if (!got.has(p.id)) break;
        line.push(got.get(p.id));
      }
      if (line.length === items.length - 1) {
        line.push(items.find((x) => !line.includes(x.name)).name);
        lines.set(p.id, line);
        when.set(p.id, Date.now() - start);
        ctx.show(p, { title: 'Your line', text: line.join('\n↓\n'), wait: 'Waiting for the others…' });
      }
      done.add(p.id); board();
    }));
    stop();

    // Score
    const results = players.map((p) => {
      const line = lines.get(p.id);
      const right = line ? line.filter((n, i) => correct[i] === n).length : 0;
      const perfect = right === items.length;
      return { p, line, right, perfect, ms: when.get(p.id) ?? Infinity };
    });
    const fastest = results.filter((r) => r.perfect).sort((a, b) => a.ms - b.ms)[0];
    for (const r of results) {
      r.pts = r.right * 250 + (r.perfect ? 500 : 0) + (r === fastest ? 250 : 0);
      add(r.p.id, r.pts);
    }

    // Reveal the answer one item at a time.
    ctx.show('all', { wait: 'Look at the TV!' });
    const val = new Map(items.map((x) => [x.name, x.v]));
    for (let k = 1; k <= correct.length; k++) {
      ctx.el.replaceChildren(h('h2', set.q), h('div.le-row', correct.map((n, i) => (i < k
        ? h('div.le-card.le-on', h('b', n), h('span', fmt(val.get(n))))
        : h('div.le-card.le-hidden', '?')))),
      h('p.le-dim', `${set.low} → ${set.high}`));
      ctx.sfx?.('pop');
      await ctx.sleep(1200);
    }
    ctx.sfx?.('ding');
    ctx.el.append(h('div.le-results', results.sort((a, b) => b.pts - a.pts).map((r) => h('div.le-res', { style: { '--c': r.p.color } },
      h('b', r.p.name), h('span', r.line ? `${r.right}/${items.length}` : '—'),
      h('span', `${r.perfect ? '✨ ' : ''}${r === fastest ? '⚡ ' : ''}+${r.pts}`)))));
    await ctx.sleep(5500);
    if (round % 4 === 0) await scoreboard(ctx, score, round === ROUNDS ? 'Final scores' : 'Scores', 5000);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  ctx.sfx?.('win');
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'has everything in order', 6000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.le-scores', rows.map(({ p, s }) =>
    h('div.le-srow', h('span.le-sname', p.name),
      h('div.le-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('line-em-up-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'line-em-up-css', textContent: `
  .le-num { color: var(--dim); font-weight: 900; letter-spacing: .1em; }
  .le-dim { color: var(--dim); font-size: 1.2em; font-weight: 800; }
  .le-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2vw; width: min(1400px, 100%); }
  .le-card { background: var(--card); border: 3px solid var(--line); border-radius: 20px; padding: 3vh 1vw; font-size: 1.4em;
    font-weight: 900; display: flex; flex-direction: column; gap: 8px; justify-content: center; min-height: 5em; }
  .le-card.le-on { border-color: var(--accent); animation: pop .3s ease-out; }
  .le-card.le-on span { color: var(--accent); font-size: .85em; }
  .le-card.le-hidden { color: var(--dim); font-size: 2.4em; }
  .le-results { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; max-width: 1400px; }
  .le-res { display: flex; gap: 12px; padding: 8px 16px; border-radius: 14px; border: 3px solid var(--c);
    background: color-mix(in srgb, var(--c) 15%, var(--card)); font-weight: 800; }
  .le-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .le-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .le-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .le-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .le-sbar div { height: 100%; border-radius: 99px; }
` }));
