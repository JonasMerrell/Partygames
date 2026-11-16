// Blanktastic: a family-friendly fill-in-the-blank card game.
// Each round one player is the Judge and reads a prompt with a blank. Everyone
// else plays the answer card from their hand (or writes their own) that fills
// it best. The Judge picks a favourite without knowing who played what, and
// that player wins the round.
import { PROMPTS, ANSWERS } from './cards.js';
import { CSS, fill, clean, STICKER } from './look.js';

const HAND = 7;
const BLANKS = 2;        // write-your-own cards per player per game
const PLAY_TIME = 60;    // seconds to pick a card
const JUDGE_TIME = 45;
const WRITE = '__write__';

export default async function (ctx) {
  const { h } = ctx;
  installCss();
  ctx.el.parentElement.classList.add('bt-look');

  const hands = new Map();       // playerId -> [answer]
  const blanks = new Map();      // playerId -> write-your-own cards left
  const score = new Map();
  const add = (id) => score.set(id, (score.get(id) || 0) + 1);
  let answerDeck = ctx.shuffle(ANSWERS);
  let promptDeck = ctx.shuffle(PROMPTS);
  const inPlay = () => new Set([...hands.values()].flat());
  const draw = () => {
    if (!answerDeck.length) {
      const held = inPlay();
      answerDeck = ctx.shuffle(ANSWERS.filter((a) => !held.has(a)));
    }
    return answerDeck.pop();
  };
  const deal = (id) => {
    const hand = hands.get(id) || [];
    while (hand.length < HAND) hand.push(draw());
    hands.set(id, hand);
    if (!blanks.has(id)) blanks.set(id, BLANKS);
    if (!score.has(id)) score.set(id, 0);
  };

  // Judges rotate in join order; late joiners slot in at the end.
  const order = [];
  const n0 = ctx.connected.length;
  const rounds = Math.min(12, n0 <= 4 ? n0 * 2 : n0 + 2);
  let turn = 0;
  const nextJudge = () => {
    for (const p of ctx.players) if (!order.includes(p.id)) order.push(p.id);
    for (let i = 0; i < order.length; i++) {
      const p = ctx.player(order[turn++ % order.length]);
      if (p?.connected) return p;
    }
    return null;
  };

  ctx.show('all', { title: 'Blanktastic', wait: 'Look at the big screen!' });
  ctx.el.replaceChildren(h('div.bt-intro',
    logo(h),
    h('div.bt-rules',
      rule(h, '🧑‍⚖️', 'Each round, one player is the Judge and reads a prompt with a blank.'),
      rule(h, '🃏', 'Everyone else picks the card from their hand that fills it best.'),
      rule(h, '✏️', `Twice a game you can write your own card instead.`),
      rule(h, '⭐', 'The Judge picks a favourite. First to the most stars wins!'))));
  ctx.sfx('whoosh');
  await ctx.sleep(8000);

  for (let round = 1; round <= rounds; round++) {
    if (ctx.connected.length < 3) return ctx.say('Not enough players', 'Blanktastic needs at least 3 people.', 5000);
    const judge = nextJudge();
    const players = ctx.connected.filter((p) => p.id !== judge.id);
    players.forEach((p) => deal(p.id));
    if (!promptDeck.length) promptDeck = ctx.shuffle(PROMPTS);
    const prompt = promptDeck.pop();

    // --- the Judge reads the prompt ---
    ctx.music('party');
    ctx.sfx('whoosh');
    ctx.el.replaceChildren(h('div.bt-round',
      h('div.bt-tag', `Round ${round} of ${rounds}`),
      h('div.bt-judge', h('span', 'Judge'), h('strong', { style: { '--c': judge.color } }, judge.name)),
      promptCard(h, prompt)));
    ctx.show(judge, { title: 'You\'re the Judge!', text: prompt.replace('___', '_____'),
      wait: 'Read the prompt out loud, then wait for the cards.', buzz: true });
    ctx.show(players, { title: `${judge.name} is the Judge`, text: prompt.replace('___', '_____'),
      wait: 'Get ready to pick a card…' });
    await ctx.sleep(4500);

    // --- everyone plays a card ---
    ctx.music('think');
    const played = new Map();     // playerId -> { text, custom }
    const board = () => ctx.el.replaceChildren(h('div.bt-round',
      h('div.bt-judge.bt-small', h('span', 'Judge'), h('strong', { style: { '--c': judge.color } }, judge.name)),
      promptCard(h, prompt),
      h('div.bt-chips', players.map((p) => h('div.bt-chip' + (played.has(p.id) ? '.in' : ''),
        { style: { '--c': p.color } }, (played.has(p.id) ? '🃏 ' : '… ') + p.name)))));
    board();
    const deadline = Date.now() + PLAY_TIME * 1000;
    const stop = ctx.clock(PLAY_TIME);
    const after = { title: 'Card played!', wait: 'Waiting for everyone else…' };
    await Promise.all(players.map(async (p) => {
      const left = () => (deadline - Date.now()) / 1000;
      const hand = hands.get(p.id);
      const spare = blanks.get(p.id);
      const choices = hand.map((c) => ({ label: c, value: c }));
      if (spare > 0) choices.push({ label: `✏️ Write my own (${spare} left)`, value: WRITE });
      const got = await ctx.ask(p, {
        title: 'Pick a card', text: prompt.replace('___', '_____'), choices,
      }, { timeout: left(), clock: false, after });
      let pick = got.get(p.id);
      if (pick === WRITE && left() > 1) {
        const wrote = await ctx.ask(p, {
          title: 'Write your own card', text: prompt.replace('___', '_____'),
          input: { placeholder: 'Something funny (and kind!)', max: 60, submit: 'Play it' },
        }, { timeout: left(), clock: false, after });
        const text = clean(wrote.get(p.id) || '');
        if (text) {
          blanks.set(p.id, spare - 1);
          played.set(p.id, { text, custom: true });
        }
      } else if (pick && pick !== WRITE && hand.includes(pick)) {
        hand.splice(hand.indexOf(pick), 1);
        played.set(p.id, { text: pick, custom: false });
      }
      if (played.has(p.id)) { ctx.sfx('pop'); board(); }
    }));
    stop();

    const entries = ctx.shuffle([...played.entries()].map(([id, c]) => ({ id, ...c })));
    if (!entries.length) {
      ctx.show('all', { wait: 'Nobody played a card. Next round!' });
      await ctx.say('Nobody played a card!', 'On to the next round…', 3500);
      continue;
    }

    // --- read them all out ---
    ctx.music(null);
    ctx.show('all', { title: 'Cards are in!', wait: `${judge.name} is reading them out…` });
    ctx.show(judge, { title: 'Read each card out loud!', wait: 'They appear on the big screen one by one.' });
    const grid = h('div.bt-grid' + (entries.length > 5 ? '.bt-many' : ''));
    ctx.el.replaceChildren(h('div.bt-round', promptCard(h, prompt, true), grid));
    for (const [i, e] of entries.entries()) {
      grid.append(answerCard(h, prompt, e, i));
      ctx.sfx('pop');
      await ctx.sleep(entries.length > 6 ? 1800 : 2600);
    }

    // --- the Judge picks ---
    ctx.music('tense');
    ctx.show(players, { title: 'Judging time', wait: `${judge.name} is picking a favourite…` });
    const verdict = await ctx.ask(judge, {
      title: 'Pick your favourite!', text: prompt.replace('___', '_____'),
      choices: entries.map((e, i) => ({ label: `${i + 1}. ${e.text}`, value: i })),
      color: STICKER[0],
    }, { timeout: JUDGE_TIME, after: { title: 'Great pick!', wait: 'Look at the big screen!' } });
    ctx.music(null);
    let win = entries[verdict.get(judge.id)];
    let lucky = false;
    if (!win) { win = ctx.pick(entries); lucky = true; }
    add(win.id);
    const winner = ctx.player(win.id);

    // --- reveal ---
    ctx.sfx('win');
    grid.replaceChildren(...entries.map((e, i) => answerCard(h, prompt, e, i, {
      who: ctx.player(e.id), win: e === win })));
    ctx.el.replaceChildren(h('div.bt-round',
      h('div.bt-winner', h('span', lucky ? 'The Judge ran out of time, so luck picked…' : `${judge.name} picked…`),
        h('strong', { style: { '--c': winner?.color } }, `⭐ ${winner?.name ?? 'Someone'} ⭐`)),
      h('div.bt-big', fill(h, prompt, win.text)),
      grid));
    ctx.show(winner, { title: '⭐ You won the round! ⭐', wait: 'Look at the big screen!', buzz: true });
    ctx.show(ctx.connected.filter((p) => p.id !== win.id),
      { title: `${winner?.name ?? 'Someone'} won the round`, text: fillText(prompt, win.text), wait: 'Next round soon…' });
    await ctx.sleep(7500);

    // Refill hands for everyone who played from their hand.
    players.forEach((p) => deal(p.id));
    if (round % 3 === 0 && round < rounds) await scoreboard(ctx, score, `Stars after round ${round}`, 6000);
  }

  ctx.music('party');
  await scoreboard(ctx, score, 'Final stars', 7000);
  const best = Math.max(0, ...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best && best > 0).map((p) => p.name);
  const names = winners.length ? winners.join(' & ') : 'Everybody';
  ctx.show('all', { title: 'Game over!', wait: `${names} won. Back to the lobby soon…` });
  ctx.sfx('win');
  ctx.el.replaceChildren(h('div.bt-intro', logo(h),
    h('div.bt-winner', h('span', 'The most Blanktastic player is…'), h('strong', `🏆 ${names} 🏆`))));
  await ctx.sleep(8000);
}

function logo(h) {
  return h('div.bt-logo', [...'Blanktastic'].map((ch, i) =>
    h('span', { style: { '--c': STICKER[i % STICKER.length], animationDelay: `${i * 60}ms` } }, ch)));
}

function rule(h, icon, text) {
  return h('div.bt-rule', h('span.bt-ico', icon), h('span', text));
}

function promptCard(h, prompt, small) {
  return h('div.bt-prompt' + (small ? '.bt-small' : ''), fill(h, prompt, null));
}

function answerCard(h, prompt, e, i, opts = {}) {
  const c = STICKER[i % STICKER.length];
  const tilt = ((i * 37) % 7) - 3;
  return h('div.bt-card' + (opts.win ? '.win' : '') + (opts.who && !opts.win ? '.dim' : ''),
    { style: { '--c': c, '--tilt': `${tilt}deg` } },
    h('span.bt-num', String(i + 1)),
    h('div.bt-ans', e.text),
    e.custom ? h('div.bt-custom', '✏️ written') : null,
    opts.who ? h('div.bt-by', { style: { color: opts.who.color } }, opts.who.name) : null);
}

function fillText(prompt, answer) {
  return prompt.replace('___', answer.toUpperCase());
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  ctx.show('all', { title, wait: 'Look at the big screen!' });
  ctx.sfx('whoosh');
  ctx.el.replaceChildren(h('div.bt-round', h('h1.bt-h', title), h('div.bt-scores', rows.map(({ p, s }, i) =>
    h('div.bt-srow', { style: { '--c': STICKER[i % STICKER.length], animationDelay: `${i * 90}ms` } },
      h('span.bt-sname', { style: { color: p.color } }, p.name),
      h('span.bt-stars', s ? '⭐'.repeat(Math.min(s, 10)) : '·'),
      h('span.bt-spts', s))))));
  await ctx.sleep(ms);
}

function installCss() {
  if (document.getElementById('blanktastic-css')) return;
  document.head.append(Object.assign(document.createElement('style'), { id: 'blanktastic-css', textContent: CSS }));
}
