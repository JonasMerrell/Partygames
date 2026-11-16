// Gobble Gallery: a gentle Thanksgiving drawing game for kids and grown-ups.
//
// Each round everyone picks one of two picture cards ("Turkey on roller
// skates") and draws it. Then the drawings go up one at a time, framed on
// the TV, and everyone else taps which card they think it is from four big
// coloured buttons. The TV reads the four choices out loud, so players who
// can't read yet can still play by colour, shape and emoji.
//
// Scoring is all upside: 2 pies for a right guess, 1 pie to the artist for
// every person who got theirs, and a bonus pie if everyone did. Nobody loses
// points, there's no speed race, and at the end every player gets an award.
//
// Phones run player.js (a kid-sized drawing pad and big answer buttons). The
// two sides talk with messages whose kind starts with "gg-".
import { CARDS, TITLES } from './cards.js';

const PACES = {
  quick: { label: '🐇 Quick', rounds: 1, draw: 60 },
  normal: { label: '🦃 Normal', rounds: 2, draw: 80 },
  relaxed: { label: '🐢 Take our time', rounds: 2, draw: 120 },
};
const PICK_TIME = 20;
const GUESS_TIME = 25;
const GRACE = 5;           // seconds phones get to send their drawing after time's up
const MAX_IMG = 450_000;   // characters of data URL we accept for a drawing
const REACTIONS = ['❤️', '😂', '🤩', '🦃'];
const TILES = [            // colour + shape, so "the blue star one" works for little kids
  { c: '#e8553e', s: '●', name: 'red circle' },
  { c: '#f2b134', s: '▲', name: 'yellow triangle' },
  { c: '#4f9d5d', s: '■', name: 'green square' },
  { c: '#4a7fd1', s: '★', name: 'blue star' },
];

export default async function (ctx) {
  const { h } = ctx;
  const sfx = (n) => { try { ctx.sfx?.(n); } catch {} };
  addStyles();
  const root = h('div.gg');
  const leaves = h('div.gg-leaves', Array.from({ length: 14 }, (_, i) => h('span', {
    style: { left: `${(i * 7.3 + 3) % 100}%`, animationDelay: `${-(i * 1.7) % 12}s`, animationDuration: `${10 + (i % 5) * 2}s` },
  }, ['🍂', '🍁', '🍃'][i % 3])));
  const paint = (...kids) => {
    root.replaceChildren(leaves, ...kids);
    if (!root.isConnected) ctx.el.replaceChildren(root);
  };

  // ---- talking: the TV reads things out (skipped when the TV is muted) ----
  const muted = () => { try { return localStorage.getItem('partyhall.muted') === '1'; } catch { return false; } };
  const say = (text) => {
    try {
      if (muted() || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92; u.pitch = 1.1;
      speechSynthesis.speak(u);
    } catch {}
  };
  const hush = () => { try { window.speechSynthesis?.cancel(); } catch {} };

  // ---- phones talk to us here ----
  const lastView = new Map();
  let collecting = null;   // { phase, answers: Map, who: Set, after, onAnswer }
  let reacting = null;     // (player, emoji) => void
  const show = (to, view) => {
    for (const p of [].concat(to === 'all' ? ctx.players : to)) lastView.set(p.id, view);
    ctx.show(to, view);
  };
  ctx.on('message', (p, d) => {
    if (!p || !d || typeof d !== 'object') return;
    if (d.kind === 'gg-hello') {
      const v = lastView.get(p.id);
      if (v) ctx.show(p, v);
    } else if (d.kind === 'gg-answer' && collecting && d.phase === collecting.phase
      && collecting.who.has(p.id) && !collecting.answers.has(p.id)) {
      collecting.answers.set(p.id, d.value);
      if (collecting.after) show(p, collecting.after(p, d.value));
      collecting.onAnswer?.(p, d.value);
    } else if (d.kind === 'gg-react' && REACTIONS.includes(d.e)) reacting?.(p, d.e);
  });

  // Give each player their own view and wait for answers. At `seconds` the
  // phones are told time's up and send what they have; anyone still quiet
  // GRACE seconds later is skipped.
  let phaseSeq = 0;
  async function collect(jobs, seconds, { after, onAnswer, grace = GRACE } = {}) {
    const phase = `g${++phaseSeq}`;
    const ends = Date.now() + seconds * 1000;
    collecting = { phase, answers: new Map(), who: new Set(jobs.map((j) => j.p.id)), after, onAnswer };
    for (const j of jobs) show(j.p, { ...j.view, phase, seconds, ends });
    const stopClock = ctx.clock(seconds);
    let warned = false;
    const done = () => [...collecting.who].every((id) => collecting.answers.has(id) || !ctx.player(id)?.connected);
    try {
      while (!done()) {
        const now = Date.now();
        if (!warned && now >= ends) { warned = true; ctx.broadcast({ kind: 'gg-timesup', phase }); }
        if (now >= ends + grace * 1000) break;
        await ctx.sleep(150);
      }
    } finally { stopClock(); }
    const got = collecting.answers;
    collecting = null;
    return got;
  }

  // ---- intro ----
  paint(h('div.gg-page.gg-center',
    turkey('gg-mascot'),
    h('h1.gg-logo', 'Gobble ', h('span', 'Gallery')),
    h('p.gg-sub', 'Draw it! Guess it! Gobble it up!')));
  show('all', { gg: 'wait', emoji: '🦃', text: 'Get ready to draw!' });
  say('Welcome to Gobble Gallery!');
  await ctx.sleep(3500);

  const players0 = ctx.connected;
  if (players0.length < 2) return ctx.say('Not enough players', 'Gobble Gallery needs at least 2 people.', 5000);

  // ---- how long? ----
  const vip = players0[0];
  paint(h('div.gg-page.gg-center', turkey('gg-mascot.small'),
    h('h1.gg-title', 'How long should we play?'),
    h('p.gg-sub', h('b', { style: { color: vip.color } }, vip.name), ' is choosing on their phone.')));
  show(players0.filter((p) => p.id !== vip.id), { gg: 'wait', emoji: '⏳', text: `${vip.name} is choosing…` });
  const paceAns = await ctx.ask(vip, {
    title: 'How long should we play?',
    choices: Object.entries(PACES).map(([k, v]) => ({
      label: `${v.label}: ${v.rounds} round${v.rounds > 1 ? 's' : ''}, ${v.draw}s to draw`, value: k })),
  }, { timeout: 20, after: { wait: 'Great choice!' } });
  const pace = PACES[paceAns.get(vip.id)] || PACES.normal;

  // ---- how to play ----
  paint(h('div.gg-page.gg-center',
    h('h1.gg-title', 'How to play'),
    h('div.gg-how',
      h('div.gg-step', h('div.gg-big', '🃏'), h('b', '1. Pick a card')),
      h('div.gg-step', h('div.gg-big', '🖍️'), h('b', '2. Draw it')),
      h('div.gg-step', h('div.gg-big', '🤔'), h('b', '3. Guess the others')),
      h('div.gg-step', h('div.gg-big', '🥧'), h('b', '4. Win pies!'))),
    h('p.gg-sub', 'No letters in your drawing! Right guesses win 2 pies, and artists win a pie for everyone who gets theirs.')));
  show('all', { gg: 'wait', emoji: '👀', text: 'Look at the TV!' });
  say('Pick a card. Draw it. Then guess what everyone else drew. Right guesses win pies!');
  await ctx.sleep(8000);

  const pies = new Map(ctx.players.map((p) => [p.id, 0]));
  const stats = new Map(ctx.players.map((p) => [p.id, { right: 0, gotMine: 0, love: 0 }]));
  const stat = (id) => { if (!stats.has(id)) stats.set(id, { right: 0, gotMine: 0, love: 0 }); return stats.get(id); };
  const addPies = (id, n) => pies.set(id, (pies.get(id) || 0) + n);
  const gallery = [];   // every drawing, for the gallery wall at the end
  let deck = ctx.shuffle(CARDS);
  const deal = () => { if (!deck.length) deck = ctx.shuffle(CARDS); return deck.pop(); };

  for (let round = 1; round <= pace.rounds; round++) {
    const players = ctx.connected;
    if (players.length < 2) break;
    const last = round === pace.rounds;

    // ---- pick a card ----
    await banner(pace.rounds > 1 ? `Round ${round}` : 'Let\'s draw!', last && pace.rounds > 1 ? 'Last round!' : 'Pick a card on your phone', 2500);
    const hands = new Map(players.map((p) => [p.id, [deal(), deal()]]));
    const picked = new Set();
    const pickBoard = () => paint(h('div.gg-page.gg-center',
      h('h1.gg-title', '🃏 Pick a card!'),
      h('p.gg-sub', 'Choose the one you want to draw. Keep it secret!'),
      easels(players, picked)));
    pickBoard();
    say('Pick a card to draw. Keep it secret!');
    const picks = await collect(players.map((p) => ({ p, view: { gg: 'pick', cards: hands.get(p.id) } })), PICK_TIME, {
      grace: 1,
      after: (p, i) => ({ gg: 'wait', emoji: hands.get(p.id)[i === 1 ? 1 : 0].e, text: 'Got it! Get your crayons ready…' }),
      onAnswer: (p) => { picked.add(p.id); sfx('pop'); pickBoard(); },
    });
    const cardOf = new Map(players.map((p) => [p.id, hands.get(p.id)[picks.get(p.id) === 1 ? 1 : 0]]));
    // Put the card you didn't pick back in the deck for later rounds.
    for (const p of players) deck.unshift(hands.get(p.id)[picks.get(p.id) === 1 ? 0 : 1]);

    // ---- draw ----
    const drawn = new Set();
    const drawBoard = () => paint(h('div.gg-page.gg-center',
      turkey('gg-mascot.small.draw'),
      h('h1.gg-title', '🖍️ Everybody draw!'),
      h('p.gg-sub', 'Draw your card. No letters or numbers!'),
      easels(players, drawn)));
    drawBoard();
    say('Everybody draw!');
    const got = await collect(players.map((p) => ({ p, view: { gg: 'draw', card: cardOf.get(p.id) } })), pace.draw, {
      after: () => ({ gg: 'wait', emoji: '🖼️', text: 'Beautiful! Waiting for the other artists…' }),
      onAnswer: (p) => { drawn.add(p.id); sfx('ding'); drawBoard(); },
    });
    const art = [];
    for (const p of players) {
      const v = got.get(p.id);
      const ok = v && typeof v === 'object' && !v.blank && typeof v.img === 'string'
        && /^data:image\/(png|jpeg|webp);base64,/.test(v.img) && v.img.length < MAX_IMG;
      if (ok) art.push({ by: p, card: cardOf.get(p.id), img: v.img, right: 0, love: 0 });
    }
    sfx('whoosh');
    show('all', { gg: 'wait', emoji: '🖼️', text: 'Crayons down! Look at the TV.' });
    if (!art.length) { await banner('Oh no, empty easels!', 'Nobody finished a drawing this time.', 4000); continue; }
    await banner('🖼️ Gallery time!', 'What did everyone draw?', 3000);

    // ---- guess each drawing ----
    const roundCards = [...cardOf.values()];
    for (const [i, a] of ctx.shuffle(art).entries()) {
      await guessDrawing(a, i, art.length, roundCards);
      gallery.push(a);
    }

    if (!last) await scoreboard('Pie count so far');
  }

  // ---- the gallery wall ----
  if (gallery.length) {
    show('all', { gg: 'wait', emoji: '🖼️', text: 'Look at all that art!' });
    paint(h('div.gg-page',
      h('h1.gg-title', '🖼️ The Gobble Gallery'),
      h('div.gg-wall', { style: { '--w': gallery.length <= 6 ? '28vh' : gallery.length <= 12 ? '20vh' : '15vh' } }, gallery.map((a, i) => h('figure.gg-mini', { style: { '--r': `${((i * 37) % 7) - 3}deg`, '--d': `${i * 0.12}s` } },
        h('img', { src: a.img, alt: '' }),
        h('figcaption', h('span', a.card.e), ' ', a.card.t, h('small', { style: { background: a.by.color } }, a.by.name)))))));
    say('Look at all that art!');
    await ctx.sleep(Math.min(16000, 6000 + gallery.length * 900));
  }

  await scoreboard('Final pie count', true);
  await awards();
  show('all', { gg: 'wait', emoji: '🦃', text: 'Happy Thanksgiving! Back to the lobby soon…' });
  await ctx.sleep(1500);
  hush();

  // ===================================================================

  async function guessDrawing(a, i, n, roundCards) {
    // Four choices: the real card, up to two other cards drawn this round (so
    // "is that Grandma's turkey or mine?" is a real question), and the rest
    // from the deck.
    const used = new Set([a.card.t]);
    const fake = [];
    for (const c of ctx.shuffle(roundCards)) {
      if (fake.length >= 2) break;
      if (!used.has(c.t)) { used.add(c.t); fake.push(c); }
    }
    for (const c of ctx.shuffle(CARDS)) {
      if (fake.length >= 3) break;
      if (!used.has(c.t)) { used.add(c.t); fake.push(c); }
    }
    const opts = ctx.shuffle([a.card, ...fake]).map((c, k) => ({ ...c, ...TILES[k] }));
    const answer = opts.findIndex((o) => o.t === a.card.t);
    const guessers = ctx.connected.filter((p) => p.id !== a.by.id);
    const picks = new Map();

    const frame = h('div.gg-frame', h('img', { src: a.img, alt: 'drawing' }));
    const tiles = opts.map((o) => h('div.gg-tile', { style: { '--c': o.c } },
      h('span.gg-shape', o.s), h('span.gg-emoji', o.e), h('span.gg-text', o.t), h('div.gg-who')));
    const status = h('p.gg-sub');
    const setStatus = () => status.replaceChildren(guessers.length
      ? `${picks.size} of ${guessers.length} guessed`
      : 'Nobody else is here to guess!');
    setStatus();
    paint(h('div.gg-page.gg-guess',
      h('div.gg-count', `Drawing ${i + 1} of ${n}`),
      h('div.gg-guess-body', frame, h('div.gg-tiles', tiles)),
      h('div.gg-q', h('b', 'What is it?'), status)));
    sfx('pop');
    hush();
    say(`What is it? Is it ${opts.map((o) => o.t).join('? ... ')}?`);

    show(a.by, { gg: 'mine', card: a.card });
    if (guessers.length) {
      await collect(guessers.map((p) => ({ p, view: { gg: 'guess', options: opts.map(({ e, t, c, s }) => ({ e, t, c, s })) } })), GUESS_TIME, {
        grace: 0,
        after: (p, k) => ({ gg: 'wait', emoji: opts[k]?.e || '🤔', text: opts[k] ? `You picked “${opts[k].t}”` : 'Got it!' }),
        onAnswer: (p, k) => { if (Number.isInteger(k) && opts[k]) picks.set(p.id, k); sfx('pop'); setStatus(); },
      });
    }

    // ---- reveal ----
    hush();
    const right = guessers.filter((p) => picks.get(p.id) === answer);
    a.right = right.length;
    for (const p of right) { addPies(p.id, 2); stat(p.id).right++; }
    let artistPies = right.length;
    const everyone = guessers.length > 1 && right.length === guessers.length;
    if (everyone) artistPies++;
    addPies(a.by.id, artistPies);
    stat(a.by.id).gotMine += right.length;

    tiles.forEach((t, k) => {
      t.classList.add(k === answer ? 'yes' : 'no');
      t.querySelector('.gg-who').replaceChildren(...guessers.filter((p) => picks.get(p.id) === k)
        .map((p) => h('span.gg-chip', { style: { background: p.color } }, p.name)));
    });
    frame.append(h('div.gg-tag', 'by ', h('b', { style: { color: a.by.color } }, a.by.name)));
    const fx = h('div.gg-fx');
    root.append(fx);
    let line;
    if (!guessers.length) line = `It was ${a.card.t}!`;
    else if (everyone) line = `Everybody got it! ${a.by.name} wins ${artistPies} pies!`;
    else if (right.length) line = `${right.length === 1 ? right[0].name + ' got it' : right.length + ' people got it'}! ${a.by.name} wins ${artistPies} pie${artistPies === 1 ? '' : 's'}.`;
    else line = 'A tricky one! Nobody guessed it this time.';
    status.replaceChildren(line);
    root.querySelector('.gg-q b').replaceChildren(`It's ${a.card.e} ${a.card.t}!`);
    sfx(right.length ? 'win' : 'ding');
    say(`It's ${a.card.t}! Drawn by ${a.by.name}. ${line.replace(/^It was.*$/, '')}`);

    for (const p of guessers) {
      const ok = picks.get(p.id) === answer;
      show(p, { gg: 'result', ok, card: a.card, text: ok ? 'You got it! +2 🥧' : picks.has(p.id) ? 'Good try!' : 'Out of time!',
        react: REACTIONS, artist: a.by.name });
    }
    show(a.by, { gg: 'result', mine: true, card: a.card,
      text: artistPies ? `${right.length} got yours! +${artistPies} 🥧` : 'Tricky! Nobody got yours this time.', react: [] });

    const reacted = new Map();
    reacting = (p, e) => {
      const f = h('span.gg-fly', { style: { left: `${8 + Math.random() * 84}%`, '--x': `${Math.random() * 80 - 40}px` } }, e);
      fx.append(f); setTimeout(() => f.remove(), 2600);
      if (p.id !== a.by.id) {
        const nTimes = (reacted.get(p.id) || 0) + 1;
        reacted.set(p.id, nTimes);
        if (nTimes <= 3) { a.love++; stat(a.by.id).love++; }
      }
    };
    await ctx.sleep(7000);
    reacting = null;
    show('all', { gg: 'wait', emoji: '🖼️', text: 'Next picture coming up…' });
  }

  async function scoreboard(title, final = false) {
    const rows = ctx.players.map((p) => ({ p, n: pies.get(p.id) || 0 })).sort((x, y) => y.n - x.n);
    const top = Math.max(1, rows[0]?.n || 0);
    show('all', { gg: 'wait', emoji: '🥧', text: 'Pies are on the TV!' });
    paint(h('div.gg-page.gg-center',
      h('h1.gg-title', `🥧 ${title}`),
      h('div.gg-scores', rows.map(({ p, n }, k) => h('div.gg-srow', { style: { '--d': `${k * 0.15}s` } },
        h('span.gg-sname', { style: { color: p.color } }, p.name),
        h('div.gg-sbar', h('div', { style: { width: `${Math.max(3, (n / top) * 100)}%`, background: p.color } })),
        h('span.gg-snum', `${n} 🥧`))))));
    sfx(final ? 'win' : 'ding');
    await ctx.sleep(final ? 6000 : 5000);
  }

  // Everybody gets an award. The real ones go to whoever earned them, and the
  // rest of the table gets a fun title, so nobody goes home empty-handed.
  async function awards() {
    const all = ctx.players.filter((p) => pies.has(p.id));
    if (!all.length) return;
    const best = Math.max(...all.map((p) => pies.get(p.id)));
    const winners = all.filter((p) => pies.get(p.id) === best);
    const given = new Map();
    for (const p of winners) given.set(p.id, { t: '🏆 Top Turkey', why: `${best} pies!` });
    const award = (title, key, why) => {
      const val = (p) => stat(p.id)[key];
      const max = Math.max(0, ...all.map(val));
      if (!max) return;
      const p = all.filter((x) => val(x) === max && !given.has(x.id))[0];
      if (p) given.set(p.id, { t: title, why: why(max) });
    };
    award('🥧 Pie Picasso', 'gotMine', (n) => `${n} right guess${n === 1 ? '' : 'es'} on their art`);
    award('👀 Eagle Eyes', 'right', (n) => `guessed ${n} right`);
    award('❤️ Crowd Favourite', 'love', (n) => `${n} reaction${n === 1 ? '' : 's'}`);
    const spare = ctx.shuffle(TITLES.filter((t) => ![...given.values()].some((g) => g.t === t)
      && !/Picasso|Eagle|Favourite|Top Turkey/.test(t)));
    for (const p of all) if (!given.has(p.id)) given.set(p.id, { t: spare.pop() || '🦃 Turkey Trotter', why: 'thanks for playing!' });

    for (const p of all) {
      const g = given.get(p.id);
      show(p, { gg: 'award', title: g.t, text: g.why, win: winners.includes(p) });
    }
    paint(h('div.gg-page.gg-center',
      turkey('gg-mascot.small.party'),
      h('h1.gg-title', winners.length > 1 ? `🏆 ${winners.map((p) => p.name).join(' & ')} win!` : `🏆 ${winners[0].name} wins!`),
      h('div.gg-awards', all.map((p, k) => h('div.gg-award', { style: { '--c': p.color, '--d': `${k * 0.25}s` } },
        h('div.gg-aname', p.name), h('div.gg-atitle', given.get(p.id).t), h('small', given.get(p.id).why)))),
      h('p.gg-sub', 'Happy Thanksgiving! 🍂')));
    sfx('win');
    say(`${winners.map((p) => p.name).join(' and ')} ${winners.length > 1 ? 'win' : 'wins'}! Happy Thanksgiving, everybody!`);
    await ctx.sleep(Math.min(16000, 8000 + all.length * 700));
  }

  async function banner(title, sub, ms) {
    paint(h('div.gg-page.gg-center', turkey('gg-mascot.small'), h('h1.gg-title.pop', title), sub && h('p.gg-sub', sub)));
    sfx('whoosh');
    say(title.replace(/[^\p{L}\p{N}\s'!?.,]/gu, ''));
    await ctx.sleep(ms);
  }

  function easels(players, done) {
    return h('div.gg-easels', players.map((p, k) => h('div.gg-easel' + (done.has(p.id) ? '.done' : '') + (p.connected ? '' : '.away'),
      { style: { '--c': p.color, '--r': `${((k * 37) % 7) - 3}deg` } },
      h('div.gg-canvas', done.has(p.id) ? '✓' : '🖍️'), h('span', p.name))));
  }

  function turkey(cls) {
    // An original cartoon turkey drawn in SVG: round body, a fan of autumn
    // feathers, big friendly eyes.
    const NS = 'http://www.w3.org/2000/svg';
    const wrap = h('div.' + cls);
    const feathers = ['#e8553e', '#f2b134', '#4f9d5d', '#e8813e', '#c9473b', '#f2b134', '#e8553e'];
    wrap.innerHTML = `<svg viewBox="0 0 200 200" xmlns="${NS}" aria-hidden="true">
      <g class="gg-tail">${feathers.map((c, k) => `<ellipse cx="100" cy="62" rx="17" ry="52" fill="${c}"
        transform="rotate(${-72 + k * 24} 100 112)" stroke="#5a2e12" stroke-width="3"/>`).join('')}</g>
      <ellipse cx="100" cy="128" rx="52" ry="48" fill="#8b5a2b" stroke="#5a2e12" stroke-width="4"/>
      <ellipse cx="100" cy="140" rx="30" ry="26" fill="#b07a45"/>
      <g class="gg-head">
        <circle cx="100" cy="86" r="28" fill="#a86b36" stroke="#5a2e12" stroke-width="4"/>
        <circle cx="90" cy="80" r="8" fill="#fff"/><circle cx="110" cy="80" r="8" fill="#fff"/>
        <circle cx="91" cy="81" r="4" fill="#24170c"/><circle cx="111" cy="81" r="4" fill="#24170c"/>
        <path d="M92 92 L108 92 L100 104 Z" fill="#f2b134" stroke="#5a2e12" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M104 100 q8 6 4 16 q-8 -2 -6 -14" fill="#e8413c" stroke="#5a2e12" stroke-width="2"/>
        <ellipse cx="80" cy="94" rx="5" ry="3" fill="#ff8f8f" opacity=".7"/><ellipse cx="120" cy="94" rx="5" ry="3" fill="#ff8f8f" opacity=".7"/>
      </g>
      <path d="M86 174 l-4 14 m4 -14 l4 14 M114 174 l-4 14 m4 -14 l4 14" stroke="#f2b134" stroke-width="5" stroke-linecap="round"/>
    </svg>`;
    return wrap;
  }
}

function addStyles() {
  if (!document.getElementById('gg-font')) {
    document.head.append(Object.assign(document.createElement('link'), { id: 'gg-font', rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap' }));
  }
  document.getElementById('gg-css')?.remove();
  document.head.append(Object.assign(document.createElement('style'), { id: 'gg-css', textContent: `
  .gg { --cream: #fff6e5; --ink: #4a2a12; --orange: #f2a541; --font: 'Fredoka', ui-rounded, system-ui, sans-serif;
    position: fixed; inset: 0; z-index: 0; overflow: hidden; font-family: var(--font); color: var(--cream);
    background: radial-gradient(1200px 700px at 50% 0%, #a8501f 0%, transparent 65%),
      radial-gradient(900px 600px at 100% 100%, #6b2d1a 0%, transparent 60%), #3b1d10; }
  .game:has(.gg) .hostbar { position: relative; z-index: 2; padding: 0 1vw; color: #ffe2b8; }
  .gg-leaves span { position: absolute; top: -8vh; font-size: 4vh; opacity: .35; animation: gg-fall linear infinite; }
  @keyframes gg-fall { to { transform: translate(8vw, 116vh) rotate(540deg); } }
  .gg-page { position: absolute; inset: 0; padding: 9vh 4vw 6vh; display: flex; flex-direction: column; gap: 2.5vh; }
  .gg-center { align-items: center; justify-content: center; text-align: center; }
  .gg-logo { font-size: 5.2em; margin: 0; font-weight: 700; color: var(--cream); text-shadow: 0 .08em 0 #7a3412; }
  .gg-logo span { color: var(--orange); }
  .gg-title { font-size: 3em; margin: 0; font-weight: 700; text-shadow: 0 .06em 0 #0005; }
  .gg-title.pop { animation: gg-pop .5s ease-out; }
  .gg-sub { font-size: 1.4em; margin: 0; color: #ffe2b8; max-width: 1200px; }
  @keyframes gg-pop { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.08); } }
  .gg-mascot { width: 32vh; height: 32vh; animation: gg-bob 1.6s ease-in-out infinite; }
  .gg-mascot.small { width: 20vh; height: 20vh; }
  .gg-mascot svg { width: 100%; height: 100%; overflow: visible; }
  .gg-mascot .gg-tail { transform-origin: 100px 112px; animation: gg-fan 2.4s ease-in-out infinite; }
  .gg-mascot.draw .gg-head { animation: gg-nod .6s ease-in-out infinite; transform-origin: 100px 100px; }
  .gg-mascot.party { animation: gg-hop .7s ease-in-out infinite; }
  @keyframes gg-bob { 50% { transform: translateY(-2vh); } }
  @keyframes gg-hop { 50% { transform: translateY(-4vh) rotate(-4deg); } }
  @keyframes gg-fan { 50% { transform: scale(1.06) rotate(2deg); } }
  @keyframes gg-nod { 50% { transform: rotate(-8deg); } }
  .gg-how { display: flex; gap: 3vw; flex-wrap: wrap; justify-content: center; }
  .gg-step { background: var(--cream); color: var(--ink); border-radius: 28px; padding: 3vh 2vw; width: 15vw; min-width: 160px;
    display: flex; flex-direction: column; gap: 1vh; font-size: 1.3em; box-shadow: 0 1vh 0 #0004; }
  .gg-big { font-size: 3em; }
  .gg-easels { display: flex; gap: 2vw; flex-wrap: wrap; justify-content: center; max-width: 1500px; }
  .gg-easel { display: flex; flex-direction: column; align-items: center; gap: 1vh; transform: rotate(var(--r)); font-weight: 700; font-size: 1.2em; }
  .gg-canvas { width: 9vw; min-width: 90px; aspect-ratio: 1; background: var(--cream); border: .6vh solid #8b5a2b; border-radius: 10px;
    display: grid; place-items: center; font-size: 2.2em; color: #4f9d5d; box-shadow: 0 .8vh 0 #0004; }
  .gg-easel:not(.done) .gg-canvas { animation: gg-wiggle 1.2s ease-in-out infinite; }
  .gg-easel.done .gg-canvas { background: #e3f6d8; border-color: var(--c); }
  .gg-easel span { color: var(--c); }
  .gg-easel.away { opacity: .4; }
  @keyframes gg-wiggle { 50% { transform: rotate(4deg); } }

  .gg-guess { padding-bottom: 9vh; }
  .gg-count { font-weight: 700; color: #ffd08a; letter-spacing: .08em; font-size: 1.1em; }
  .gg-guess-body { flex: 1; min-height: 0; display: flex; gap: 3vw; align-items: center; justify-content: center; }
  .gg-frame { position: relative; height: 62vh; aspect-ratio: 1; padding: 2vh; flex: none;
    background: linear-gradient(135deg, #d9a441, #a8701f); border-radius: 12px; box-shadow: 0 1.5vh 3vh #0007, inset 0 0 0 .6vh #7a4d12;
    animation: gg-pop .5s ease-out; }
  .gg-frame img { width: 100%; height: 100%; background: #fff; border-radius: 4px; display: block; }
  .gg-tag { position: absolute; left: 50%; bottom: -2.4vh; transform: translateX(-50%); background: var(--cream); color: var(--ink);
    padding: .5vh 1.4vw; border-radius: 99px; font-size: 1.2em; white-space: nowrap; animation: gg-pop .5s ease-out; box-shadow: 0 .5vh 0 #0004; }
  .gg-tiles { display: grid; grid-template-columns: 1fr; gap: 1.8vh; width: min(38vw, 720px); }
  .gg-tile { background: var(--c); color: #fff; border-radius: 22px; padding: 1.6vh 1.4vw; display: grid;
    grid-template-columns: auto auto 1fr; grid-template-rows: auto auto; align-items: center; column-gap: 1vw;
    box-shadow: 0 .8vh 0 color-mix(in srgb, var(--c) 55%, #000); text-align: left; transition: transform .3s, opacity .3s, filter .3s; }
  .gg-shape { font-size: 1.6em; text-shadow: 0 .05em 0 #0004; }
  .gg-emoji { font-size: 2em; }
  .gg-text { font-size: 1.45em; font-weight: 700; text-shadow: 0 .05em 0 #0004; line-height: 1.1; }
  .gg-who { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: .5vw; }
  .gg-who:empty { display: none; }
  .gg-chip { font-size: .85em; font-weight: 700; padding: .2vh .8vw; border-radius: 99px; color: #1a1a1a; margin-top: .6vh;
    box-shadow: 0 0 0 2px #fff8; animation: gg-pop .4s ease-out; }
  .gg-tile.yes { transform: scale(1.06); box-shadow: 0 0 0 .6vh #fff, 0 0 4vh #fff8; animation: gg-shine 1s ease-in-out 2; }
  .gg-tile.no { opacity: .45; filter: saturate(.4); transform: scale(.95); }
  @keyframes gg-shine { 50% { transform: scale(1.12); } }
  .gg-q { margin-top: 3.5vh; text-align: center; display: flex; flex-direction: column; gap: .6vh; }
  .gg-q b { font-size: 2.2em; }
  .gg-fx { position: absolute; inset: 0; pointer-events: none; }
  .gg-fly { position: absolute; bottom: 4vh; font-size: 7vh; animation: gg-fly 2.6s ease-out forwards; }
  @keyframes gg-fly { to { transform: translate(var(--x), -75vh) scale(1.4); opacity: 0; } }

  .gg-scores { width: min(1100px, 92vw); display: flex; flex-direction: column; gap: 1.6vh; }
  .gg-srow { display: grid; grid-template-columns: 9em 1fr 5em; gap: 1.2vw; align-items: center; font-weight: 700; font-size: 1.35em;
    text-align: left; animation: gg-slide .5s ease-out backwards; animation-delay: var(--d); }
  @keyframes gg-slide { from { transform: translateX(-10vw); opacity: 0; } }
  .gg-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 .05em 0 #0006; }
  .gg-sbar { height: 1.3em; background: #0003; border-radius: 99px; overflow: hidden; }
  .gg-sbar div { height: 100%; border-radius: 99px; }
  .gg-snum { text-align: right; }

  .gg-wall { flex: 1; display: flex; flex-wrap: wrap; gap: 2.4vh 2vw; justify-content: center; align-content: center; }
  .gg-mini { margin: 0; background: var(--cream); color: var(--ink); padding: 1vh 1vh 1.2vh; border-radius: 8px; width: var(--w, 15vh); min-width: 120px;
    transform: rotate(var(--r)); box-shadow: 0 1vh 2vh #0006; animation: gg-pop .5s ease-out backwards; animation-delay: var(--d); }
  .gg-mini img { width: 100%; aspect-ratio: 1; background: #fff; display: block; border-radius: 3px; }
  .gg-mini figcaption { font-size: calc(var(--w, 15vh) / 7.5); font-weight: 700; line-height: 1.15; margin-top: .6vh; display: flex; flex-direction: column; }
  .gg-mini small { font-size: .95em; color: #1a1a1a; border-radius: 99px; padding: 0 .6em; margin-top: .4vh; align-self: center; }

  .gg-awards { display: flex; flex-wrap: wrap; gap: 2vh 1.6vw; justify-content: center; max-width: 1500px; }
  .gg-award { background: var(--cream); color: var(--ink); border-top: 1.2vh solid var(--c); border-radius: 18px; padding: 1.4vh 1.4vw;
    min-width: 13vw; display: flex; flex-direction: column; gap: .4vh; box-shadow: 0 .8vh 0 #0004;
    animation: gg-pop .5s ease-out backwards; animation-delay: var(--d); }
  .gg-aname { font-weight: 700; font-size: 1.3em; }
  .gg-atitle { font-size: 1.15em; }
  .gg-award small { opacity: .7; }
  ` }));
}
