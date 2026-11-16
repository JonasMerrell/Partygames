// Codswallop: a bluffing game. The TV shows an obscure word, an odd law or a
// strange fact. Everyone writes a convincing fake answer, the real one is
// shuffled in with the fakes, and everybody votes for the one they think is
// true. Find the truth for points; fool other people for more.
import { PROMPTS, CATEGORIES } from './prompts.js';

const WRITE_TIME = 60;   // seconds to write a lie
const VOTE_TIME = 30;
const PICK_TIME = 12;
const TRUTH_PTS = 1000;  // for voting for the real answer
const FOOL_PTS = 500;    // per player who votes for your lie
const KNOW_PTS = 250;    // for typing the real answer by accident (once per prompt)
// One entry per prompt: its points multiplier. The last one is the finale.
const ROUNDS = [1, 1, 1, 2, 2, 3];

export default async function (ctx) {
  const { h } = ctx;
  injectCss();
  const sfx = (n) => { try { ctx.sfx?.(n); } catch {} };
  const music = (m) => { try { ctx.music?.(m); } catch {} };
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, pts) => score.set(id, (score.get(id) || 0) + pts);
  const decks = {};
  for (const p of ctx.shuffle(PROMPTS)) (decks[p.cat] ||= []).push(p);

  if (ctx.connected.length < 2) return ctx.say('Not enough players', 'Codswallop needs at least 2 people.', 5000);

  // ---------- title ----------
  ctx.show('all', { image: ctx.asset('logo.svg'), title: 'Welcome to Codswallop', wait: 'Look at the big screen!' });
  ctx.el.replaceChildren(h('div.cw-title',
    h('img.cw-logo', { src: ctx.asset('logo.svg'), alt: 'Codswallop' }),
    h('ol.cw-rules',
      h('li', 'A strange word, law or fact appears.'),
      h('li', 'Write a fake answer that sounds real.'),
      h('li', 'Find the truth among the lies.'),
      h('li', h('b', `+${TRUTH_PTS}`), ' for finding the truth, ', h('b', `+${FOOL_PTS}`), ' for everyone you fool.'))));
  await ctx.sleep(9000);

  let chooserIdx = 0;
  for (const [i, mult] of ROUNDS.entries()) {
    const last = i === ROUNDS.length - 1;
    const players = ctx.connected;
    if (players.length < 2) return ctx.say('Not enough players', 'Everyone else left!', 5000);

    await ctx.say(last ? 'The Final Fib' : `Prompt ${i + 1} of ${ROUNDS.length}`,
      mult > 1 ? `Everything is worth ${mult}× points!` : 'Get ready to lie.', 2800);

    // ---------- choose a category ----------
    const cats = Object.keys(CATEGORIES).filter((c) => decks[c]?.length);
    const chooser = players[chooserIdx++ % players.length];
    ctx.el.replaceChildren(h('div.cw-pick',
      h('p.cw-dim', h('span.pname', { style: { '--pc': chooser.color } }, chooser.name), ' is picking a category…'),
      h('div.cw-cats', cats.map((c) => h('div.cw-cat', h('span.cw-caticon', CATEGORIES[c].icon), CATEGORIES[c].name)))));
    ctx.show(players.filter((p) => p.id !== chooser.id), { wait: `${chooser.name} is picking a category…` });
    const picked = await ctx.ask(chooser, {
      title: 'Pick a category',
      choices: cats.map((c) => ({ label: `${CATEGORIES[c].icon}  ${CATEGORIES[c].name}`, value: c })),
    }, { timeout: PICK_TIME });
    const catId = cats.includes(picked.get(chooser.id)) ? picked.get(chooser.id) : ctx.pick(cats);
    const cat = CATEGORIES[catId];
    const prompt = decks[catId].pop();
    const truth = tidy(prompt.a);
    const isWord = catId === 'word' || catId === 'thing';

    // ---------- write lies ----------
    const lies = new Map(); // playerId -> text
    const knew = new Set();
    const promptEl = () => h('div.cw-prompt',
      h('div.cw-catline', cat.icon, ' ', cat.name),
      isWord ? h('div.cw-word', prompt.q) : h('div.cw-fact', blanked(h, prompt.q)),
      h('div.cw-dim', isWord ? cat.ask : ''));
    // Redraw only the chips as lies come in, so the prompt doesn't re-animate.
    const writeChips = h('div.chips');
    const board = () => writeChips.replaceChildren(...players.map((p) => h('div.chip' + (lies.has(p.id) ? '' : '.away'),
      { style: { '--c': p.color } }, (lies.has(p.id) ? '✓ ' : '') + p.name)));
    ctx.el.replaceChildren(promptEl(), writeChips);
    board();
    music('think');
    const phoneText = isWord ? `${cat.hint} for “${prompt.q}”.` : prompt.q.replace('____', '_____');
    const deadline = Date.now() + WRITE_TIME * 1000;
    const stopClock = ctx.clock(WRITE_TIME);
    await Promise.all(players.map(async (p) => {
      let note = '';
      for (;;) {
        const left = (deadline - Date.now()) / 1000;
        if (left <= 0) return;
        const got = await ctx.ask(p, {
          title: isWord ? prompt.q : cat.hint,
          text: (note ? note + '\n\n' : '') + phoneText,
          input: { placeholder: isWord ? 'Your fake definition' : 'Your fake answer', max: 90, submit: 'Lie!' },
        }, { timeout: left, clock: false, after: { wait: 'Devious. Waiting for the others…' } });
        if (!got.has(p.id)) return;
        const lie = tidy(got.get(p.id));
        if (tooClose(lie, prompt, truth)) {
          if (!knew.has(p.id)) { knew.add(p.id); add(p.id, KNOW_PTS * mult); }
          note = `You found the truth! +${KNOW_PTS * mult} points. Now write a lie instead.`;
          continue;
        }
        lies.set(p.id, lie);
        board();
        return;
      }
    }));
    stopClock();

    // Merge identical lies; the truth goes in with them.
    const options = [];
    for (const [pid, text] of lies) {
      const same = options.find((o) => norm(o.text) === norm(text));
      if (same) same.authors.push(pid);
      else options.push({ text, authors: [pid], votes: [] });
    }
    const real = { text: truth, authors: [], votes: [], real: true };
    options.push(real);
    const shown = ctx.shuffle(options);

    if (shown.length < 2) {
      ctx.show('all', { wait: 'Look at the big screen!' });
      ctx.el.replaceChildren(promptEl(), h('p.cw-dim', 'Nobody lied! The truth is…'), h('div.cw-truth', truth));
      await ctx.sleep(6000);
      continue;
    }

    // ---------- vote ----------
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const voted = new Set();
    const voteChips = h('div.chips.small');
    const voteBoard = () => voteChips.replaceChildren(...ctx.connected.map((p) => h('div.chip' + (voted.has(p.id) ? '' : '.away'),
      { style: { '--c': p.color } }, (voted.has(p.id) ? '✓ ' : '') + p.name)));
    ctx.el.replaceChildren(promptEl(),
      h('div.cw-opts' + (shown.length > 6 ? '.many' : ''), shown.map((o, k) =>
        h('div.cw-opt', h('span.cw-letter', L[k]), h('span', o.text)))),
      voteChips);
    voteBoard();
    music('tense');
    const voters = ctx.connected;
    // Each player gets their own ask (their own lie is greyed out), so the
    // TV gets one shared clock.
    const stopVoteClock = ctx.clock(VOTE_TIME);
    const votes = await Promise.all(voters.map((p) => ctx.ask(p, {
      title: 'Which one is true?',
      text: prompt.q,
      choices: shown.map((o, k) => ({
        label: `${L[k]}. ${o.text}${o.authors.includes(p.id) ? '  (your lie)' : ''}`,
        value: k, disabled: o.authors.includes(p.id),
      })),
    }, {
      timeout: VOTE_TIME, clock: false, after: { wait: 'Locked in. Fingers crossed…' },
      onAnswer: () => { voted.add(p.id); voteBoard(); },
    })));
    stopVoteClock();
    for (const [k, p] of voters.entries()) {
      const v = votes[k].get(p.id);
      const o = shown[v];
      if (o && !o.authors.includes(p.id)) o.votes.push(p.id);
    }
    ctx.show('all', { wait: 'The moment of truth… look at the TV!' });
    music(null);

    // ---------- reveal ----------
    const gains = new Map();
    const gain = (id, pts) => { add(id, pts); gains.set(id, (gains.get(id) || 0) + pts); };
    for (const id of knew) gains.set(id, KNOW_PTS * mult);
    const fooled = shown.filter((o) => !o.real && o.votes.length).sort((a, b) => a.votes.length - b.votes.length);
    const chipsOf = (ids) => h('div.chips.small', ids.map((id) => {
      const p = ctx.player(id);
      return h('div.chip', { style: { '--c': p?.color || '#888' } }, p?.name || '?');
    }));
    for (const o of fooled) {
      const card = h('div.cw-reveal', h('div.cw-revtext', o.text));
      ctx.el.replaceChildren(promptEl(), card);
      sfx('whoosh');
      await ctx.sleep(1400);
      card.append(h('p.cw-dim', `Fooled ${o.votes.length}:`), chipsOf(o.votes));
      await ctx.sleep(1800);
      const pts = Math.round((FOOL_PTS * mult * o.votes.length) / o.authors.length);
      for (const a of o.authors) gain(a, pts);
      card.classList.add('lie');
      sfx('buzz');
      card.append(h('div.cw-stamp', 'LIE'), h('div.cw-by', 'Written by ',
        o.authors.flatMap((a, n) => [n ? ' & ' : '', h('span.pname', { style: { '--pc': ctx.player(a)?.color } }, ctx.player(a)?.name || '?')]),
        h('b', `  +${pts}`)));
      await ctx.sleep(3200);
    }
    // The truth last.
    const tcard = h('div.cw-reveal.real', h('p.cw-dim', 'The truth is…'), h('div.cw-revtext', truth));
    ctx.el.replaceChildren(promptEl(), tcard);
    await ctx.sleep(2200);
    for (const id of real.votes) gain(id, TRUTH_PTS * mult);
    sfx(real.votes.length ? 'ding' : 'lose');
    tcard.append(h('div.cw-stamp.true', 'TRUE'),
      real.votes.length ? h('div', h('p.cw-dim', `Found by ${real.votes.length}  +${TRUTH_PTS * mult} each`), chipsOf(real.votes))
        : h('p.cw-dim', 'Nobody found it. Total codswallop all round!'));
    // Lies nobody fell for, briefly.
    const ignored = shown.filter((o) => !o.real && !o.votes.length);
    if (ignored.length) tcard.append(h('p.cw-dim.cw-ignored', 'Nobody fell for: ', ignored.map((o) => `“${o.text}”`).join(' · ')));
    for (const [id, g] of gains) ctx.show(id, { title: `+${g}`, wait: 'Look at the TV!' });
    await ctx.sleep(5500);

    if (i === 2 || i === 4 || last) {
      music('party');
      await scoreboard(ctx, score, last ? 'Final scores' : 'Scores so far', last ? 8000 : 6000);
    }
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  sfx('win');
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won. Back to the lobby soon…` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'is the most convincing liar in the room!', 8000);
}

// ---------- helpers ----------

/** Make answers look alike: trimmed, single spaces, capital first letter, no full stop. */
function tidy(s) {
  s = String(s).replace(/\s+/g, ' ').trim().replace(/[.。]+$/, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'are', 'was', 'were',
  'its', 'his', 'her', 'their', 'who', 'what', 'when', 'into', 'onto', 'some', 'something', 'someone', 'very', 'like', 'being']);
export const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim().replace(/^(a|an|the|to) /, '');
const tokens = (s) => norm(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => w.replace(/(es|s)$/, ''));

/** True if a lie gives away the real answer. */
export function tooClose(lie, prompt, truth) {
  const n = norm(lie);
  if (!n) return false;
  if (n === norm(truth)) return true;
  for (const k of prompt.key || []) {
    if (new RegExp(`(^|[^a-z0-9])${norm(k).replace(/ /g, '\\s')}(?![0-9])`).test(n)) return true;
  }
  const want = tokens(truth);
  if (!want.length) return false;
  const have = new Set(tokens(lie));
  const hit = want.filter((w) => have.has(w)).length;
  return want.length >= 5 ? hit / want.length >= 0.8 : hit === want.length;
}

function blanked(h, q) {
  const [a, b] = q.split('____');
  return b === undefined ? q : [a, h('span.cw-blank', '?'), b];
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.cw-scores', rows.map(({ p, s }) =>
    h('div.cw-srow', h('span.cw-sname', p.name),
      h('div.cw-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span.cw-spts', s)))));
  ctx.show('all', { wait: 'Scores are on the TV!' });
  await ctx.sleep(ms);
}

function injectCss() {
  document.getElementById('codswallop-css')?.remove();
  const css = Object.assign(document.createElement('style'), { id: 'codswallop-css' });
  css.textContent = `
  .cw-title { display: flex; flex-direction: column; align-items: center; gap: 3vh; }
  .cw-logo { width: min(820px, 80vw); animation: pop .5s ease-out; }
  .cw-rules { text-align: left; font-size: 1.3em; line-height: 1.7; margin: 0; padding-left: 1.4em; }
  .cw-rules b { color: var(--accent); }
  .cw-dim { color: var(--dim); margin: 0; }
  .cw-cats { display: flex; gap: 2vw; flex-wrap: wrap; justify-content: center; }
  .cw-cat { background: var(--card); border: 3px solid var(--line); border-radius: 22px; padding: 3vh 2.5vw;
    font-weight: 900; font-size: 1.3em; display: flex; flex-direction: column; gap: .3em; min-width: 9em; }
  .cw-caticon { font-size: 2em; }
  .cw-pick { display: flex; flex-direction: column; gap: 4vh; align-items: center; }
  .cw-prompt { display: flex; flex-direction: column; align-items: center; gap: 1vh; max-width: 1300px; }
  .cw-catline { font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); font-size: .9em; }
  .cw-word { font-family: Georgia, "Times New Roman", serif; font-style: italic; font-size: 4.2em; font-weight: 700;
    line-height: 1.05; overflow-wrap: anywhere; animation: pop .4s ease-out; }
  .cw-fact { font-family: Georgia, "Times New Roman", serif; font-size: 2em; line-height: 1.3; animation: pop .4s ease-out; }
  .cw-blank { display: inline-block; min-width: 3em; border-bottom: 4px solid var(--accent); color: var(--accent); margin: 0 .15em; }
  .cw-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; width: min(1500px, 100%); }
  .cw-opts.many { font-size: .85em; }
  .cw-opt, .cw-reveal { background: #f4ead2; color: #2a2118; border-radius: 16px; padding: 16px 20px; text-align: left;
    font-family: Georgia, "Times New Roman", serif; font-size: 1.15em; display: flex; gap: 14px; align-items: baseline;
    box-shadow: 0 6px 0 #b9a77e; animation: pop .35s ease-out both; overflow-wrap: anywhere; }
  .cw-opt:nth-child(2) { animation-delay: .08s } .cw-opt:nth-child(3) { animation-delay: .16s }
  .cw-opt:nth-child(4) { animation-delay: .24s } .cw-opt:nth-child(5) { animation-delay: .32s }
  .cw-opt:nth-child(n+6) { animation-delay: .4s }
  .cw-letter { font-family: var(--font); font-weight: 900; color: #8a5a00; min-width: 1.2em; }
  .cw-reveal { flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 4vh 4vw;
    width: min(1100px, 100%); position: relative; }
  .cw-reveal .cw-dim { color: #6e604a; font-family: var(--font); font-weight: 700; }
  .cw-reveal .chip { color: var(--fg); font-family: var(--font); }
  .cw-revtext { font-size: 1.8em; }
  .cw-by { font-family: var(--font); font-weight: 900; font-size: 1.1em; }
  .cw-by b { color: #8a5a00; }
  .cw-stamp { position: absolute; top: 14px; right: 22px; font-family: var(--font); font-weight: 900; font-size: 1.6em;
    color: #d8323f; border: 5px solid currentColor; border-radius: 10px; padding: 0 .4em; transform: rotate(9deg);
    animation: stamp .35s cubic-bezier(.3,1.6,.6,1) both; letter-spacing: .08em; }
  .cw-stamp.true { color: #1f9a52; }
  .cw-reveal.real { box-shadow: 0 6px 0 #b9a77e, 0 0 60px color-mix(in srgb, var(--accent) 55%, transparent); }
  .cw-truth { font-family: Georgia, serif; font-size: 2em; color: var(--accent); }
  .cw-ignored { font-size: .8em; max-width: 90%; }
  @keyframes stamp { from { transform: rotate(9deg) scale(3); opacity: 0; } }
  .chips.small { gap: 8px; min-height: 0; }
  .chips.small .chip { font-size: .8em; padding: 5px 14px; }
  .cw-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .cw-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .cw-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cw-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .cw-sbar div { height: 100%; border-radius: 99px; transition: width .8s; }
  .cw-spts { text-align: right; font-variant-numeric: tabular-nums; }
  @media (max-width: 900px) { .cw-opts { grid-template-columns: 1fr; } }
  `;
  document.head.append(css);
}
