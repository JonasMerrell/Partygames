// Tin Tongue: two robot teams take turns. The clue-giver's voice chip only
// does one-syllable words; their team guesses out loud. The other team sees
// the word too and hits BZZT on a slip. A card scores one point per
// syllable (max 3); a BZZT costs the clue team a point.
import { WORDS } from './words.js';
import { robot, injectCss, BOT_CSS } from './art.js';

const TURN_TIME = 60;         // seconds per turn
const READY_TIME = 20;        // clue-giver has this long to press Start
const GLITCH_GRACE = 1500;    // ms: a glitch right after a new card counts against the card before it
const TEAMS = [
  { name: 'Bolts', color: '#ffb84d' },
  { name: 'Sprockets', color: '#4dd8ff' },
];
const RULES = [
  'Words of one syllable only: "big", "red", "goes", "on top of".',
  'No part of the word itself, and no "sounds like".',
  'Gestures are fine. Slip up and the other team hits BZZT: minus one point.',
];

export default async function (ctx) {
  const { h } = ctx;
  injectCss('tin-tongue-css', BOT_CSS + CSS);

  const people = ctx.shuffle(ctx.connected);
  if (people.length < 4) {
    return ctx.say('Not enough players', 'Tin Tongue needs at least 4 people: two teams of two.', 5000);
  }
  const teams = TEAMS.map((t, i) => ({
    ...t, i, members: people.filter((_, k) => k % 2 === i), score: 0, next: 0, best: null,
  }));
  const teamOf = new Map();
  for (const t of teams) for (const p of t.members) teamOf.set(p.id, t);
  const bot = (color, mood, cls = '') => {
    const d = h('div.tt-botwrap' + cls);
    d.innerHTML = robot(color, mood);
    return d;
  };

  let deck = ctx.shuffle(WORDS);
  const draw = () => {
    if (!deck.length) deck = ctx.shuffle(WORDS);
    return deck.pop();
  };

  // One message handler for the whole game; it forwards to the turn in play.
  let turn = null;
  ctx.on('message', (p, data) => turn?.(p, data?.kind === 'choice' ? data.value : data));

  // ---------- intro ----------
  ctx.el.replaceChildren(h('div.tt-intro',
    h('h1.tt-title', 'Tin ', h('span', 'Tongue')),
    h('p.tt-tag', 'Your voice chip only does one-syllable words.'),
    h('div.tt-teams', teams.map((t) => h('div.tt-team', { style: { '--tc': t.color } },
      bot(t.color, 'idle'),
      h('h2', t.name),
      h('div.tt-roster', t.members.map((p) => h('span', p.name)))))),
    h('ol.tt-rules', RULES.map((r) => h('li', r)))));
  for (const t of teams) {
    ctx.show(t.members, {
      title: `You're a ${t.name.slice(0, -1)}!`,
      text: `Team ${t.name}: ${t.members.map((p) => p.name).join(', ')}\n\n${RULES.join('\n')}`,
      color: t.color, buzz: true,
    });
  }
  await ctx.sleep(12000);

  // ---------- turns ----------
  const rounds = Math.max(...teams.map((t) => t.members.length));
  for (let r = 0; r < rounds; r++) {
    for (const t of teams) {
      const giver = nextGiver(t);
      if (!giver) continue;
      await playTurn(t, giver, `Turn ${r + 1} of ${rounds}`);
    }
  }

  // ---------- final ----------
  const [a, b] = teams;
  const tie = a.score === b.score;
  const win = a.score > b.score ? a : b;
  const stars = teams.map((t) => t.best).filter(Boolean).sort((x, y) => y.pts - x.pts);
  ctx.show('all', { title: 'Game over!', wait: tie ? 'A tie! Back to the lobby soon…' : `The ${win.name} win! Back to the lobby soon…` });
  ctx.el.replaceChildren(h('div.tt-final',
    h('h1', tie ? 'A dead heat!' : `The ${win.name} win!`),
    h('div.tt-teams', teams.map((t) => h('div.tt-team' + (!tie && t === win ? '.tt-win' : ''), { style: { '--tc': t.color } },
      bot(t.color, tie || t === win ? 'happy' : 'glitch'),
      h('h2', t.name), h('div.tt-big', t.score)))),
    stars[0] && stars[0].pts > 0 && h('p.tt-star', `Smoothest talker: ${stars[0].p.name}, ${stars[0].pts} points in one turn`)));
  ctx.sfx?.('win');
  await ctx.sleep(10000);

  function nextGiver(t) {
    for (let k = 0; k < t.members.length; k++) {
      const p = t.members[t.next++ % t.members.length];
      if (ctx.player(p.id)?.connected) return p;
    }
    return null;
  }

  async function playTurn(team, giver, label) {
    const other = teams[1 - team.i];
    const guessers = team.members.filter((p) => p.id !== giver.id);

    // Get ready.
    ctx.el.replaceChildren(h('div.tt-ready', { style: { '--tc': team.color } },
      h('p.tt-label', label),
      bot(team.color, 'idle'),
      h('h1', h('span', giver.name), ' is up for the ', team.name),
      h('p.tt-sub', `${other.name}: you'll see the word too. Listen for slips!`),
      scoreRow()));
    ctx.show(team.members.filter((p) => p.id !== giver.id), { title: 'Get ready to guess!', wait: `${giver.name} is about to give clues.`, color: team.color });
    ctx.show(other.members, { title: 'Get ready to listen', wait: `You'll see ${giver.name}'s word. Hit BZZT on any slip.`, color: other.color });
    await ctx.ask(giver, {
      title: 'You\'re up!',
      text: `Hide your screen from your team. You have ${TURN_TIME} seconds.\n\n${RULES[0]}`,
      choices: ['Start'], color: team.color, buzz: true,
    }, { timeout: READY_TIME, clock: false, after: { wait: 'Here we go…', color: team.color } });

    // TV layout, built once and updated in place.
    const timer = h('div.tt-timer');
    const ring = h('div.tt-ring', timer);
    const tally = h('div.tt-tally');
    const last = h('div.tt-last');
    const face = h('div.tt-face');
    const setFace = (mood) => { face.replaceChildren(bot(team.color, mood)); };
    const scores = h('div.tt-scorewrap', scoreRow());
    ctx.el.replaceChildren(h('div.tt-turn', { style: { '--tc': team.color } },
      h('div.tt-turnhead', h('p.tt-label', label), h('h2', h('span', giver.name), ' clues for the ', team.name)),
      h('div.tt-mid', face, ring, h('div.tt-side', tally, last)),
      scores));
    setFace('talk');

    const log = [];
    let card = null, dealtAt = 0, moodTimer = null;
    const endAt = Date.now() + TURN_TIME * 1000;
    const mood = (m) => { setFace(m); clearTimeout(moodTimer); moodTimer = setTimeout(() => setFace('talk'), 1300); };
    const refresh = () => {
      const got = log.filter((c) => c.result === 'got');
      const net = log.reduce((s, c) => s + (c.result === 'got' ? c.points : c.result === 'glitch' ? -1 : 0), 0);
      tally.replaceChildren(
        h('div', h('b', net), ` point${Math.abs(net) === 1 ? '' : 's'}`),
        h('div.tt-small', `✓ ${got.length}   ↷ ${log.filter((c) => c.result === 'skip').length}   ⚡ ${log.filter((c) => c.result === 'glitch').length}`));
      scores.replaceChildren(scoreRow());
    };
    const showLast = (c) => {
      const txt = c.result === 'got' ? [`✓ ${c.word}`, `+${c.points}`]
        : c.result === 'skip' ? [`↷ ${c.word}`, 'skipped']
          : [`⚡ ${c.word}`, `BZZT from ${c.by.name}  −1`];
      last.replaceChildren(h('div.tt-lastcard.tt-' + c.result, h('div', txt[0]), h('div.tt-small', txt[1])));
    };
    const views = (flash) => {
      const left = Math.max(1, Math.round((endAt - Date.now()) / 1000));
      ctx.show(giver, {
        tt: 'give', word: card.word, points: card.points, syllables: card.syllables, card: card.id, left, flash,
        team: team.name, color: team.color, buzz: !!flash,
        title: card.word.toUpperCase(), text: `${card.points} point${card.points > 1 ? 's' : ''}. One-syllable words only!`,
        choices: [{ label: '✅ Got it', value: { tt: 'got', card: card.id } }, { label: '↷ Skip', value: { tt: 'skip', card: card.id } }],
      });
      ctx.show(other.members, {
        tt: 'watch', word: card.word, points: card.points, card: card.id, left, giver: giver.name, color: other.color,
        title: `${giver.name} is cluing: ${card.word.toUpperCase()}`, text: 'Tap BZZT on any word with 2+ syllables, or any part of the word.',
        choices: [{ label: '⚡ BZZT!', value: { tt: 'glitch', card: card.id } }],
      });
      ctx.show(guessers, { tt: 'guess', left, giver: giver.name, title: 'Guess out loud!', wait: `${giver.name} is giving clues.`, color: team.color });
    };
    const deal = (flash) => {
      card = { id: (card?.id || 0) + 1, ...draw() };
      dealtAt = Date.now();
      views(flash);
    };

    turn = (p, d) => {
      if (!p || !d || !d.tt || !card || Date.now() >= endAt) return;
      const now = Date.now();
      if (d.tt === 'got' || d.tt === 'skip') {
        if (p.id !== giver.id || d.card !== card.id) return;
        const c = { ...card, result: d.tt, at: now };
        log.push(c);
        if (c.result === 'got') { team.score += c.points; mood('happy'); ctx.sfx?.('ding'); } else ctx.sfx?.('whoosh');
        showLast(c); refresh(); deal();
      } else if (d.tt === 'glitch') {
        if (teamOf.get(p.id) !== other) return;
        const prev = log.at(-1);
        if (d.card === card.id && now - dealtAt >= GLITCH_GRACE) {
          // A slip on the card in play: it's lost.
          const c = { ...card, result: 'glitch', by: p, at: now };
          log.push(c);
          team.score -= 1;
          mood('glitch'); ctx.sfx?.('glitch'); showLast(c); refresh(); deal({ by: p.name });
        } else if (prev && prev.result !== 'glitch' && now - prev.at < GLITCH_GRACE + 1500
          && (d.card === prev.id || d.card === card.id)) {
          // They slipped right before Got it / Skip: the card before loses its points.
          if (prev.result === 'got') team.score -= prev.points;
          prev.result = 'glitch'; prev.by = p;
          team.score -= 1;
          mood('glitch'); ctx.sfx?.('glitch'); showLast(prev); refresh(); views({ by: p.name, late: true });
        }
      }
    };

    ctx.sfx?.('start');
    ctx.music?.('tense');
    deal();
    refresh();
    let lastS = TURN_TIME + 1;
    while (Date.now() < endAt) {
      const s = Math.ceil((endAt - Date.now()) / 1000);
      if (s !== lastS && s <= 10) ctx.sfx?.(s % 2 ? 'tick' : 'tock');
      lastS = s;
      timer.textContent = s;
      ring.style.setProperty('--p', `${(s / TURN_TIME) * 100}%`);
      ring.classList.toggle('tt-urgent', s <= 10);
      await ctx.sleep(100);
    }
    turn = null;
    clearTimeout(moodTimer);
    ctx.sfx?.('timeup');
    ctx.music?.('party');
    if (card) log.push({ ...card, result: 'timeout' });

    // Recap.
    const pts = log.reduce((s, c) => s + (c.result === 'got' ? c.points : c.result === 'glitch' ? -1 : 0), 0);
    const gotPts = log.filter((c) => c.result === 'got').reduce((s, c) => s + c.points, 0);
    if (!team.best || gotPts > team.best.pts) team.best = { p: giver, pts: gotPts };
    ctx.show('all', { title: 'Time!', wait: 'Look at the TV for the recap.', buzz: true });
    ctx.el.replaceChildren(h('div.tt-recap', { style: { '--tc': team.color } },
      h('h1', 'Time!'),
      h('p.tt-sub', `${giver.name} scored ${pts >= 0 ? '+' : ''}${pts} for the ${team.name}`),
      h('div.tt-cards', log.length ? log.map((c) => h('div.tt-rcard.tt-' + c.result,
        h('div.tt-rword', c.word),
        h('div.tt-small', c.result === 'got' ? `+${c.points}` : c.result === 'skip' ? 'skipped'
          : c.result === 'glitch' ? `⚡ ${c.by.name} −1` : 'out of time')))
        : h('p.tt-sub', 'No cards. The robot froze up!')),
      scoreRow()));
    await ctx.sleep(Math.min(14000, 6000 + log.length * 700));
  }

  function scoreRow() {
    return h('div.tt-scores', teams.map((t) => h('div.tt-score', { style: { '--tc': t.color } },
      h('span', t.name), h('b', t.score))));
  }
}

const CSS = `
  .tt-intro, .tt-ready, .tt-turn, .tt-recap, .tt-final { width: 100%; max-width: 1500px; display: flex; flex-direction: column; align-items: center; gap: 2.5vh; }
  .tt-title { font-size: 4.5em; font-weight: 900; letter-spacing: -.02em; margin: 0; }
  .tt-title span { color: var(--accent); }
  .tt-tag, .tt-sub { color: var(--dim); font-size: 1.3em; margin: 0; }
  .tt-label { color: var(--dim); text-transform: uppercase; letter-spacing: .15em; font-weight: 800; margin: 0; }
  .tt-teams { display: flex; gap: 5vw; justify-content: center; flex-wrap: wrap; }
  .tt-team { background: color-mix(in srgb, var(--tc) 14%, var(--card)); border: 3px solid var(--tc); border-radius: 28px;
    padding: 2.5vh 3vw; min-width: 16em; display: flex; flex-direction: column; align-items: center; gap: .5em; animation: pop .4s ease-out; }
  .tt-team h2 { color: var(--tc); font-size: 1.8em; margin: 0; }
  .tt-team.tt-win { box-shadow: 0 0 60px color-mix(in srgb, var(--tc) 55%, transparent); }
  .tt-roster { display: flex; flex-wrap: wrap; gap: .4em .8em; justify-content: center; font-weight: 800; }
  .tt-botwrap .tt-bot { width: 8em; height: auto; }
  .tt-rules { text-align: left; font-size: 1.15em; max-width: 46em; margin: 0; padding-left: 1.4em; }
  .tt-rules li { margin: .3em 0; }
  .tt-ready h1, .tt-turnhead h2 { margin: 0; }
  .tt-ready h1 span, .tt-turnhead h2 span { color: var(--tc); }
  .tt-ready h1 { font-size: 2.6em; }
  .tt-turnhead h2 { font-size: 2em; }
  .tt-mid { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 4vw; width: 100%; }
  .tt-face { justify-self: end; }
  .tt-face .tt-bot { width: 11em; height: auto; }
  .tt-ring { --p: 100%; width: 13em; height: 13em; border-radius: 50%; display: grid; place-items: center;
    background: conic-gradient(var(--tc) var(--p), var(--bg2) 0); transition: background .1s; }
  .tt-ring.tt-urgent { --tc: var(--err); animation: pulse .5s ease-in-out infinite alternate; }
  .tt-timer { width: 80%; height: 80%; border-radius: 50%; background: var(--bg); display: grid; place-items: center;
    font-size: 4.5em; font-weight: 900; font-variant-numeric: tabular-nums; }
  .tt-side { justify-self: start; text-align: left; display: flex; flex-direction: column; gap: 1.2em; min-width: 12em; }
  .tt-tally { font-size: 1.4em; }
  .tt-tally b { font-size: 2em; color: var(--tc); }
  .tt-small { font-size: .7em; color: var(--dim); font-weight: 700; white-space: pre; }
  .tt-lastcard { font-size: 1.5em; font-weight: 900; border-radius: 18px; padding: .5em .8em; background: var(--card);
    border: 3px solid var(--line); animation: pop .3s ease-out; }
  .tt-lastcard.tt-got { border-color: #5df08a; }
  .tt-lastcard.tt-glitch { border-color: var(--err); animation: pop .3s ease-out, tt-shake .08s linear 6; }
  .tt-scores { display: flex; gap: 3vw; justify-content: center; }
  .tt-score { display: flex; align-items: baseline; gap: .6em; background: var(--card); border: 3px solid var(--tc);
    border-radius: 99px; padding: .3em 1.2em; font-weight: 900; font-size: 1.3em; }
  .tt-score span { color: var(--tc); }
  .tt-score b { font-size: 1.4em; font-variant-numeric: tabular-nums; }
  .tt-recap h1 { font-size: 3.5em; margin: 0; color: var(--tc); }
  .tt-cards { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; max-width: 1300px; }
  .tt-rcard { background: var(--card); border: 3px solid var(--line); border-radius: 16px; padding: .5em 1em; min-width: 7em; animation: pop .35s ease-out backwards; }
  .tt-rcard:nth-child(n) { animation-delay: calc(var(--i, 0) * 60ms); }
  .tt-rword { font-size: 1.3em; font-weight: 900; text-transform: capitalize; }
  .tt-rcard.tt-got { border-color: #5df08a; }
  .tt-rcard.tt-glitch { border-color: var(--err); }
  .tt-rcard.tt-skip, .tt-rcard.tt-timeout { opacity: .6; }
  .tt-final h1 { font-size: 3.6em; margin: 0; }
  .tt-big { font-size: 3em; font-weight: 900; }
  .tt-star { font-size: 1.3em; color: var(--dim); margin: 0; }
`;
