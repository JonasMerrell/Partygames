// Long Shot: a guess-and-bet trivia game.
//
// Every question has a number for an answer. Everyone guesses on their phone,
// the guesses are lined up smallest to largest on the TV, and each slot gets
// payout odds: guesses near the middle pay 2 to 1, outliers pay more, and the
// "Smaller than every guess" slot pays the most. Then everyone bets on the
// guess they think is closest to the answer WITHOUT going over.
//
// Each round you get two free chips (worth CHIP points each, never lost) and
// may also stake points from your bank on one guess (lost if it misses).
// The guesser closest without going over earns a bonus. Final round pays double.
import { QUESTIONS } from './questions.js';

const ROUNDS = 7;
const GUESS_TIME = 45;
const BET_TIME = 40;
const CHIP = 10;            // a free chip's stake
const CLOSEST_BONUS = 30;   // for owning the winning guess
const EXACT_BONUS = 60;     // ...when it is spot on
const UNDER = 6;            // odds for "Smaller than every guess"
const MAX_ODDS = 5;

export default async function (ctx) {
  const { h } = ctx;
  injectCss();
  const sfx = (n) => { try { ctx.sfx?.(n); } catch {} };
  const music = (m) => { try { ctx.music?.(m); } catch {} };
  const bank = new Map();
  const get = (id) => bank.get(id) || 0;
  const deck = ctx.shuffle(QUESTIONS);

  ctx.show('all', { title: 'Long Shot', wait: 'Look at the TV for how to play!' });
  put(ctx.el, h('div.ls-intro',
    logo(h),
    h('div.ls-steps',
      step(h, '1', 'Guess', 'Every question has a number for an answer. Type your best guess.'),
      step(h, '2', 'Bet', 'The guesses line up on the board. Put your 2 free chips on the one you think is closest without going over.'),
      step(h, '3', 'Win', 'Long shots pay more. Once you have points, you can stake them too.')),
    h('p.ls-dim', `${ROUNDS} questions. The last one pays double.`)));
  await ctx.sleep(11000);

  for (let round = 1; round <= ROUNDS; round++) {
    const q = deck[(round - 1) % deck.length];
    const mult = round === ROUNDS ? 2 : 1;
    const fmt = (n) => fmtNum(n, q);

    await ctx.say(round === ROUNDS ? 'Final question!' : `Question ${round} of ${ROUNDS}`,
      round === ROUNDS ? 'All payouts are doubled.' : '', 2200);

    // ---- guessing ----
    music('think');
    const players = ctx.connected;
    const locked = new Set();
    const guessBoard = () => put(ctx.el, 
      h('div.ls-qnum', round === ROUNDS ? 'Final question · double payouts' : `Question ${round} of ${ROUNDS}`),
      h('h1.ls-q', q.q),
      q.unit && h('p.ls-dim', `Answer in ${q.unit}`),
      h('div.chips', players.map((p) => h('div.chip' + (locked.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (locked.has(p.id) ? '✓ ' : '') + p.name))));
    guessBoard();
    const raw = await ctx.ask(players, {
      title: round === ROUNDS ? 'Final question' : `Question ${round}`,
      keypad: { question: q.q, unit: q.year ? '' : q.unit || '', year: !!q.year, submit: 'Lock in' },
      // Shown only if the custom phone screen hasn't loaded yet.
      text: q.q,
      input: { placeholder: 'Type a number', max: 15, submit: 'Lock in' },
    }, {
      timeout: GUESS_TIME,
      after: { wait: 'Locked in. Waiting for everyone else…' },
      onAnswer: (p) => { locked.add(p.id); guessBoard(); },
    });

    const guesses = new Map();
    for (const [id, v] of raw) {
      const n = parseGuess(v);
      if (n !== null) guesses.set(id, n);
    }
    ctx.show('all', { wait: 'Look at the TV!' });

    if (!guesses.size) {
      await reveal(ctx, q, fmt, null, [], new Map(), 0);
      await ctx.say('Nobody guessed!', `The answer was ${fmt(q.a)}`, 4500);
      continue;
    }

    // ---- the board ----
    const slots = buildSlots(guesses, ctx);
    const win = winningSlot(slots, q.a);
    put(ctx.el, 
      h('h2.ls-q.sm', q.q),
      board(ctx, slots, fmt, new Map(), null),
      h('p.ls-dim', 'Place your bets on your phone!'));
    await ctx.sleep(2500);

    // ---- betting ----
    music('tense');
    const bettors = ctx.connected;
    const betIn = new Set();
    const bets = new Map();
    const betBoard = () => put(ctx.el, 
      h('h2.ls-q.sm', q.q),
      board(ctx, slots, fmt, new Map(), null),
      h('div.chips', bettors.map((p) => h('div.chip' + (betIn.has(p.id) ? '' : '.away'),
        { style: { '--c': p.color } }, (betIn.has(p.id) ? '✓ ' : '') + p.name))));
    betBoard();
    const stopClock = ctx.clock(BET_TIME);
    await Promise.all(bettors.map(async (p) => {
      const got = await ctx.ask(p, {
        title: 'Place your bets',
        bet: {
          slots: slots.map((s) => ({ label: s.label, value: s.value === null ? null : fmt(s.value), odds: s.odds, mine: s.owners.some((o) => o.id === p.id) })),
          bank: get(p.id), chip: CHIP, mult,
        },
        text: 'Tap the guess you think is closest without going over. Both free chips go on it.',
        choices: slots.map((s, i) => ({ label: `${s.value === null ? s.label : fmt(s.value)}  ·  ${s.odds} to 1`, value: i })),
      }, {
        timeout: BET_TIME, clock: false,
        after: { wait: 'Bets placed! Watch the TV.' },
        onAnswer: () => { betIn.add(p.id); betBoard(); },
      });
      if (got.has(p.id)) bets.set(p.id, parseBet(got.get(p.id), slots.length, get(p.id)));
    }));
    stopClock();
    ctx.show('all', { wait: 'Here comes the answer…' });
    music(null);

    // chips on the board
    const stacks = new Map(); // slot -> [{ player, kind, amount }]
    for (const [id, b] of bets) {
      const p = ctx.player(id); if (!p) continue;
      for (const i of b.chips) push(stacks, i, { p, kind: 'chip' });
      if (b.wager.amount > 0) push(stacks, b.wager.slot, { p, kind: 'stake', amount: b.wager.amount });
    }
    put(ctx.el, h('h2.ls-q.sm', q.q), board(ctx, slots, fmt, stacks, null), h('p.ls-dim', 'All bets are in…'));
    await ctx.sleep(3000);

    // ---- payouts ----
    const results = new Map(); // id -> { gain, lines[] }
    const add = (id, n, why) => {
      const r = results.get(id) || { gain: 0, lines: [] };
      r.gain += n; r.lines.push(why); results.set(id, r);
    };
    const odds = slots[win].odds;
    for (const [id, b] of bets) {
      const hits = b.chips.filter((i) => i === win).length;
      if (hits) add(id, hits * CHIP * odds * mult, `${hits} chip${hits > 1 ? 's' : ''} at ${odds} to 1`);
      if (b.wager.amount > 0) {
        if (b.wager.slot === win) add(id, b.wager.amount * odds * mult, `stake won at ${odds} to 1`);
        else add(id, -b.wager.amount, 'stake lost');
      }
    }
    const exact = slots[win].value === q.a;
    for (const o of slots[win].owners) {
      add(o.id, (exact ? EXACT_BONUS : CLOSEST_BONUS) * mult, exact ? 'spot on!' : 'closest guess');
    }
    for (const [id, r] of results) bank.set(id, Math.max(0, get(id) + r.gain));

    await reveal(ctx, q, fmt, slots, stacks, results, win, sfx);
    music('party');

    for (const p of ctx.connected) {
      const r = results.get(p.id);
      ctx.show(p, {
        title: r ? (r.gain >= 0 ? `+${r.gain}` : `${r.gain}`) : '+0',
        text: `The answer was ${fmt(q.a)}.${r ? '\n' + r.lines.join(', ') : ''}\nYou have ${get(p.id)} points.`,
        wait: 'Next question soon…',
      });
    }
    await scoreboard(ctx, bank, round === ROUNDS ? 'Final standings' : 'Standings', round === ROUNDS ? 6000 : 5500);
  }

  const best = Math.max(0, ...ctx.players.map((p) => get(p.id)));
  const winners = ctx.players.filter((p) => get(p.id) === best).map((p) => p.name);
  sfx('win');
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won with ${best} points. Back to the lobby soon…` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, `wins Long Shot with ${best} points!`, 8000);
}

// ---------- rules ----------

export function parseGuess(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\s,_']/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Sorted slots: index 0 is "Smaller than every guess", then each distinct guess. */
export function buildSlots(guesses, ctx) {
  const byVal = new Map();
  for (const [id, n] of guesses) {
    const p = ctx.player(id);
    if (!byVal.has(n)) byVal.set(n, []);
    if (p) byVal.get(n).push(p);
  }
  const vals = [...byVal.keys()].sort((a, b) => a - b);
  const mid = (vals.length - 1) / 2;
  return [
    { value: null, label: 'Smaller than every guess', odds: UNDER, owners: [] },
    ...vals.map((v, i) => ({
      value: v, label: String(v), owners: byVal.get(v),
      odds: Math.min(MAX_ODDS, 2 + Math.floor(Math.abs(i - mid))),
    })),
  ];
}

/** The largest guess that doesn't go over the answer, or slot 0. */
export function winningSlot(slots, answer) {
  let w = 0;
  for (let i = 1; i < slots.length; i++) if (slots[i].value <= answer + 1e-9) w = i;
  return w;
}

/** Bet answer from a phone: { chips: [i, j], wager: { slot, amount } }, or a plain slot index (fallback screen). */
export function parseBet(v, n, bankNow) {
  const ok = (i) => Number.isInteger(i) && i >= 0 && i < n;
  if (typeof v === 'number') return ok(v) ? { chips: [v, v], wager: { slot: 0, amount: 0 } } : { chips: [], wager: { slot: 0, amount: 0 } };
  const chips = Array.isArray(v?.chips) ? v.chips.filter(ok).slice(0, 2) : [];
  let amount = Math.floor(Number(v?.wager?.amount) || 0);
  const slot = v?.wager?.slot;
  if (!ok(slot) || amount <= 0) amount = 0;
  amount = Math.min(amount, bankNow);
  return { chips, wager: { slot: amount ? slot : 0, amount } };
}

function fmtNum(n, q) {
  if (q.year) return String(n);
  const s = Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return q.unit ? `${s} ${q.unit}` : s;
}

function push(map, k, v) { if (!map.has(k)) map.set(k, []); map.get(k).push(v); }

// ---------- drawing ----------

function board(ctx, slots, fmt, stacks, win) {
  const { h } = ctx;
  return h('div.ls-board', { style: { '--n': slots.length } }, slots.map((s, i) => h(
    'div.ls-slot' + (s.value === null ? '.under' : '') + (win === null ? '' : i === win ? '.win' : '.lose'),
    { style: { animationDelay: `${i * 80}ms` } },
    h('div.ls-odds', `${s.odds} to 1`),
    h('div.ls-val', s.value === null ? 'Smaller than every guess' : fmt(s.value)),
    h('div.ls-owners', s.owners.map((p) => h('span', { style: { color: p.color } }, p.name))),
    h('div.ls-stack', (stacks.get(i) || []).map((c) => h('span.ls-token' + (c.kind === 'stake' ? '.stake' : ''),
      { style: { '--c': c.p.color }, title: c.p.name }, c.kind === 'stake' ? c.amount : ''))))));
}

async function reveal(ctx, q, fmt, slots, stacks, results, win, sfx = () => {}) {
  const { h } = ctx;
  const ans = h('div.ls-answer', h('div.ls-dim', 'The answer is…'), h('div.ls-big', '?'));
  put(ctx.el, h('h2.ls-q.sm', q.q), ans, slots ? board(ctx, slots, fmt, stacks, null) : null);
  await ctx.sleep(2200);
  ans.querySelector('.ls-big').textContent = fmt(q.a);
  sfx('ding');
  ans.querySelector('.ls-big').classList.add('pop');
  if (q.note) ans.append(h('div.ls-note', q.note));
  if (!slots) { await ctx.sleep(3000); return; }
  await ctx.sleep(1200);
  sfx(results.size ? 'win' : 'lose');
  const s = slots[win];
  const rows = [...results].map(([id, r]) => ({ p: ctx.player(id), r })).filter((x) => x.p)
    .sort((a, b) => b.r.gain - a.r.gain);
  put(ctx.el, 
    h('h2.ls-q.sm', q.q), ans, board(ctx, slots, fmt, stacks, win),
    h('div.ls-winline', s.value === null
      ? 'Every guess went over!'
      : `${s.owners.map((p) => p.name).join(' & ')} ${s.value === q.a ? 'nailed it!' : 'got closest without going over.'}`),
    h('div.ls-gains', rows.map(({ p, r }) => h('span.ls-gain' + (r.gain < 0 ? '.neg' : ''),
      { style: { '--c': p.color } }, `${p.name} ${r.gain >= 0 ? '+' : ''}${r.gain}`))));
  await ctx.sleep(6500);
}

async function scoreboard(ctx, bank, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: bank.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  put(ctx.el, h('h1', title), h('div.ls-scores', rows.map(({ p, s }) =>
    h('div.ls-srow', h('span.ls-sname', p.name),
      h('div.ls-sbar', h('div', { style: { width: `${Math.max(3, (s / top) * 100)}%`, background: p.color } })),
      h('span.ls-spts', s)))));
  await ctx.sleep(ms);
}

function step(h, n, head, text) {
  return h('div.ls-step', h('div.ls-stepn', n), h('h3', head), h('p', text));
}

function logo(h) {
  const svg = `<svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
    <circle cx="60" cy="60" r="54" fill="#1b3b2c" stroke="#ffc94d" stroke-width="6"/>
    <circle cx="60" cy="60" r="36" fill="none" stroke="#ffc94d" stroke-width="4" stroke-dasharray="10 8"/>
    <circle cx="60" cy="60" r="16" fill="#ff6b5d"/>
    <path d="M60 60 L104 16" stroke="#f4f1ff" stroke-width="6" stroke-linecap="round"/>
    <path d="M96 10 L110 10 L110 24" fill="none" stroke="#f4f1ff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  const el = h('div.ls-logo', h('span.ls-mark'), h('h1', 'Long ', h('span', 'Shot')));
  el.querySelector('.ls-mark').innerHTML = svg;
  return el;
}

function injectCss() {
  document.getElementById('long-shot-css')?.remove();
  const css = Object.assign(document.createElement('style'), { id: 'long-shot-css' });
  css.textContent = `
  .ls-logo { display: flex; align-items: center; gap: .5em; justify-content: center; }
  .ls-logo h1 { font-size: 4em; margin: 0; letter-spacing: -.02em; }
  .ls-logo h1 span { color: var(--accent); }
  .ls-intro { display: flex; flex-direction: column; gap: 4vh; align-items: center; }
  .ls-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2vw; max-width: 1400px; }
  .ls-step { background: var(--card); border: 3px solid var(--line); border-radius: 24px; padding: 3vh 2vw; text-align: left; animation: pop .4s ease-out backwards; }
  .ls-step:nth-child(2) { animation-delay: .3s } .ls-step:nth-child(3) { animation-delay: .6s }
  .ls-step h3 { color: var(--accent); font-size: 1.5em; margin: .2em 0; }
  .ls-step p { margin: 0; color: var(--dim); }
  .ls-stepn { width: 1.8em; height: 1.8em; border-radius: 50%; background: var(--accent); color: #120f1d; font-weight: 900; display: grid; place-items: center; }
  .ls-dim { color: var(--dim); font-size: 1.1em; margin: 0; }
  .ls-qnum { color: var(--accent); font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
  .ls-q { font-size: 2.6em; max-width: 1300px; margin: 0; }
  .ls-q.sm { font-size: 1.5em; color: var(--dim); }
  .ls-board { display: flex; gap: 1vw; justify-content: center; align-items: stretch; width: 100%; max-width: 1700px;
    background: radial-gradient(ellipse at 50% 0%, #2a6b4c, #15392a 70%); border: 6px solid #6b4a24; border-radius: 28px;
    padding: 2.5vh 1.5vw; box-shadow: inset 0 0 60px #0008, 0 20px 50px #0006; }
  .ls-slot { flex: 1 1 0; min-width: 0; max-width: 260px; background: #0f2a1f; border: 3px solid #ffffff2a; border-radius: 18px;
    padding: 1.5vh .6vw; display: flex; flex-direction: column; gap: .5em; align-items: center; animation: pop .35s ease-out backwards;
    transition: opacity .4s, transform .4s, border-color .4s; }
  .ls-slot.under { background: #2a1720; }
  .ls-slot.win { border-color: var(--accent); transform: scale(1.06); box-shadow: 0 0 50px color-mix(in srgb, var(--accent) 60%, transparent); }
  .ls-slot.lose { opacity: .35; }
  .ls-odds { background: var(--accent); color: #120f1d; font-weight: 900; border-radius: 99px; padding: .15em .7em; font-size: .9em; white-space: nowrap; }
  .ls-slot.under .ls-odds { background: #ff6b5d; }
  .ls-val { font-weight: 900; font-size: 1.5em; overflow-wrap: anywhere; line-height: 1.1; }
  .ls-slot.under .ls-val { font-size: 1em; color: #ffd0c8; }
  .ls-owners { display: flex; flex-direction: column; font-weight: 800; font-size: .8em; }
  .ls-stack { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: auto; min-height: 1.6em; }
  .ls-token { width: 1.4em; height: 1.4em; border-radius: 50%; background: var(--c); border: 3px dashed #fff8; animation: drop .4s ease-out backwards; }
  .ls-token.stake { width: auto; min-width: 1.6em; padding: 0 .35em; border-radius: 99px; border-style: solid; color: #120f1d; font-weight: 900; font-size: .8em; display: grid; place-items: center; }
  @keyframes drop { from { transform: translateY(-60px); opacity: 0; } }
  .ls-answer { display: flex; flex-direction: column; align-items: center; }
  .ls-big { font-size: 4.5em; font-weight: 900; color: var(--accent); line-height: 1; }
  .ls-big.pop { animation: pop .5s cubic-bezier(.2, 1.6, .4, 1); }
  .ls-note { color: var(--dim); font-size: 1.1em; margin-top: .3em; }
  .ls-winline { font-size: 1.5em; font-weight: 900; }
  .ls-gains { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; max-width: 1400px; }
  .ls-gain { border: 3px solid var(--c); border-radius: 99px; padding: 6px 16px; font-weight: 900; background: color-mix(in srgb, var(--c) 20%, var(--card)); animation: pop .3s ease-out backwards; }
  .ls-gain.neg { opacity: .7; }
  .ls-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .ls-srow { display: grid; grid-template-columns: 8em 1fr 5em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .ls-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ls-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .ls-sbar div { height: 100%; border-radius: 99px; transition: width .8s; }
  .ls-spts { text-align: right; font-variant-numeric: tabular-nums; }
  `;
  document.head.append(css);
}

/** replaceChildren that skips null/false/'' (so `cond && el` works). */
function put(el, ...kids) {
  el.replaceChildren(...kids.filter((k) => k != null && k !== false && k !== ''));
}
