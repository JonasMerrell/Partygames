// Bracket Brawl: a topic goes up ("The best thing to bring to a desert
// island"). Everyone writes an entry, then the entries are seeded into a
// knockout bracket (house entries fill empty slots). Before the first match,
// everyone bets on which entry will win the whole thing. Each match, everyone
// except the two authors votes.
//   +100 per vote your entry gets, +1000 if your entry is champion
//   +800 for betting on the champion
import { TOPICS } from './topics.js';

const WRITE_TIME = 50;
const BET_TIME = 25;
const VOTE_TIME = 15;

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  const topics = ctx.shuffle(TOPICS);
  const n0 = ctx.connected.length;
  const brackets = n0 <= 4 || n0 > 8 ? 2 : 1;
  const satOut = new Set(); // authors whose entry missed the last bracket (more than 8 entries)

  await ctx.say('Bracket Brawl', 'Your answers fight it out. Bet on the champion.', 3500);

  for (let b = 1; b <= brackets; b++) {
    const players = ctx.connected;
    if (players.length < 3) return ctx.say('Not enough players', 'Bracket Brawl needs at least 3 people.', 5000);
    const topic = topics.pop();

    // --- entries (two each in small games) ---
    const per = players.length <= 3 ? 2 : 1;
    const entries = [];
    const done = new Set();
    const board = () => ctx.el.replaceChildren(h('div.bb-num', `Bracket ${b} of ${brackets}`), h('h1.bb-topic', topic.q),
      h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (done.has(p.id) ? '✓ ' : '') + p.name))));
    board();
    const deadline = Date.now() + WRITE_TIME * 1000;
    const stop = ctx.clock(WRITE_TIME);
    await Promise.all(players.map(async (p) => {
      for (let k = 0; k < per && Date.now() < deadline; k++) {
        const got = await ctx.ask(p, {
          title: per > 1 ? `Entry ${k + 1} of ${per}` : 'Your entry', text: topic.q,
          input: { placeholder: 'A contender', max: 40, submit: 'Enter the ring' },
        }, { timeout: (deadline - Date.now()) / 1000, clock: false, after: { wait: 'Entered! Waiting for the others…' } });
        const v = got.get(p.id);
        if (v && !entries.some((e) => e.text.toLowerCase() === v.trim().toLowerCase())) entries.push({ text: v.trim(), by: p });
      }
      done.add(p.id); board();
    }));
    stop();

    // Fill to 4 or 8 with house entries.
    const size = entries.length <= 4 ? 4 : 8;
    for (const x of ctx.shuffle(topic.house)) {
      if (entries.length >= size) break;
      if (!entries.some((e) => e.text.toLowerCase() === x.toLowerCase())) entries.push({ text: x, by: null });
    }
    // More than 8 entries: those who sat out last time go first.
    const seeded = ctx.shuffle(entries).sort((x, y) => (satOut.has(y.by?.id) ? 1 : 0) - (satOut.has(x.by?.id) ? 1 : 0));
    let field = ctx.shuffle(seeded.slice(0, size));
    satOut.clear();
    for (const e of seeded.slice(size)) if (e.by) satOut.add(e.by.id);
    const rounds = [field];

    const drawBracket = (hl) => h('div.bb-bracket', rounds.map((r, ri) => h('div.bb-col', r.map((e, i) =>
      h('div.bb-slot' + (hl && hl.includes(e) ? '.bb-hl' : '') + (rounds[ri + 1] && !rounds[ri + 1].includes(e) ? '.bb-out' : ''),
        { style: { '--c': e.by?.color || '#8a83a8' } }, e.text)))));

    // --- bets ---
    const cut = [...satOut].map((id) => ctx.player(id)?.name).filter(Boolean);
    ctx.el.replaceChildren(h('h2.bb-topic', topic.q), drawBracket(), h('p.bb-dim', 'Place your bets: who wins it all?'),
      cut.length ? h('p.bb-dim', `Didn't make the cut this time (first in next time): ${cut.join(', ')}`) : null);
    const bets = new Map();
    const stopB = ctx.clock(BET_TIME);
    await Promise.all(players.map(async (p) => {
      const got = await ctx.ask(p, {
        title: 'Bet on the champion', text: topic.q,
        choices: field.map((e, i) => ({ label: e.text, value: i, disabled: e.by?.id === p.id })),
      }, { timeout: BET_TIME, clock: false, after: { wait: 'Bet placed. Let the brawl begin!' } });
      if (got.has(p.id) && field[got.get(p.id)]?.by?.id !== p.id) bets.set(p.id, field[got.get(p.id)]);
    }));
    stopB();

    // --- matches ---
    while (field.length > 1) {
      const next = [];
      const label = field.length === 2 ? 'FINAL' : field.length === 4 ? 'Semi-final' : 'Quarter-final';
      for (let i = 0; i < field.length; i += 2) {
        const A = field[i], B = field[i + 1];
        ctx.el.replaceChildren(h('div.bb-num', label), h('h2.bb-topic', topic.q),
          h('div.bb-vs', h('div.bb-fighter', A.text), h('span.bb-vsword', 'VS'), h('div.bb-fighter', B.text)));
        ctx.sfx?.('start');
        const voters = ctx.connected.filter((p) => p.id !== A.by?.id && p.id !== B.by?.id);
        const votes = await ctx.ask(voters, {
          title: label, text: topic.q,
          choices: [{ label: A.text, value: 'a' }, { label: B.text, value: 'b' }],
        }, { timeout: VOTE_TIME, after: { wait: 'Vote in!' } });
        const va = [...votes.values()].filter((v) => v === 'a').length;
        const vb = votes.size - va;
        if (A.by) add(A.by.id, va * 100);
        if (B.by) add(B.by.id, vb * 100);
        const win = va === vb ? (Math.random() < 0.5 ? A : B) : va > vb ? A : B;
        next.push(win);
        ctx.sfx?.('ding');
        ctx.el.replaceChildren(h('div.bb-num', label), h('h2.bb-topic', topic.q),
          h('div.bb-vs',
            h('div.bb-fighter' + (win === A ? '.bb-win' : '.bb-lose'), A.text, h('small', `${va} vote${va === 1 ? '' : 's'}`)),
            h('span.bb-vsword', 'VS'),
            h('div.bb-fighter' + (win === B ? '.bb-win' : '.bb-lose'), B.text, h('small', `${vb} vote${vb === 1 ? '' : 's'}`))),
          va === vb && h('p.bb-dim', 'A tie! The coin toss decides.'));
        ctx.show('all', { wait: 'Next match coming up…' });
        await ctx.sleep(3500);
      }
      rounds.push(next);
      field = next;
      ctx.el.replaceChildren(h('h2.bb-topic', topic.q), drawBracket(next));
      await ctx.sleep(3000);
    }

    // --- champion ---
    const champ = field[0];
    if (champ.by) add(champ.by.id, 1000);
    const winners = [...bets].filter(([, e]) => e === champ).map(([id]) => ctx.player(id)).filter(Boolean);
    for (const p of winners) add(p.id, 800);
    ctx.sfx?.('win');
    ctx.el.replaceChildren(h('div.bb-num', 'CHAMPION'), h('div.bb-champ', '🏆 ', champ.text),
      h('p', champ.by ? h('span', { style: { color: champ.by.color } }, `entered by ${champ.by.name} · +1000`) : 'a house entry!'),
      h('p.bb-dim', winners.length ? `Called it (+800): ${winners.map((p) => p.name).join(', ')}` : 'Nobody bet on the champion!'));
    await ctx.sleep(6500);
    await scoreboard(ctx, score, b === brackets ? 'Final scores' : 'Scores', 5500);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'undisputed bracket champion', 6000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.bb-scores', rows.map(({ p, s }) =>
    h('div.bb-srow', h('span.bb-sname', p.name),
      h('div.bb-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('bracket-brawl-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'bracket-brawl-css', textContent: `
  .bb-num { color: var(--accent); font-weight: 900; letter-spacing: .15em; }
  .bb-topic { font-size: 2em; max-width: 1300px; }
  .bb-dim { color: var(--dim); font-size: 1.2em; }
  .bb-bracket { display: flex; gap: 2vw; align-items: stretch; width: min(1500px, 100%); }
  .bb-col { flex: 1; display: flex; flex-direction: column; justify-content: space-around; gap: 10px; }
  .bb-slot { background: color-mix(in srgb, var(--c) 18%, var(--card)); border-left: 6px solid var(--c); border-radius: 10px;
    padding: 10px 14px; font-weight: 800; text-align: left; overflow-wrap: anywhere; }
  .bb-slot.bb-out { opacity: .35; text-decoration: line-through; }
  .bb-slot.bb-hl { box-shadow: 0 0 0 3px var(--accent); animation: pop .35s ease-out; }
  .bb-vs { display: flex; gap: 3vw; align-items: stretch; width: min(1400px, 100%); }
  .bb-vsword { align-self: center; font-size: 2.4em; font-weight: 900; color: var(--accent); font-style: italic; }
  .bb-fighter { flex: 1; background: var(--card); border: 4px solid var(--line); border-radius: 24px; padding: 5vh 2vw;
    font-size: 2em; font-weight: 900; display: flex; flex-direction: column; gap: 10px; justify-content: center;
    animation: pop .35s ease-out; overflow-wrap: anywhere; }
  .bb-fighter small { font-size: .5em; color: var(--dim); }
  .bb-win { border-color: var(--accent); box-shadow: 0 0 40px color-mix(in srgb, var(--accent) 50%, transparent); transform: scale(1.04); }
  .bb-lose { opacity: .45; transform: rotate(-2deg) scale(.95); }
  .bb-champ { font-size: 3.4em; font-weight: 900; color: var(--accent); max-width: 1300px; animation: pop .5s ease-out; }
  .bb-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .bb-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .bb-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bb-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .bb-sbar div { height: 100%; border-radius: 99px; }
` }));
