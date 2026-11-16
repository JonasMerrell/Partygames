// Two Faces: a bluffing game at a masked ball. Everyone holds two hidden masks.
// On your turn you may use any mask's power, whether you wear it or not.
// Rivals can call you out or block you; whoever is wrong loses a mask.
// The last guest with a mask still hidden wins.
import { ROLES, MOVES, START_GOLD, MUST_UNMASK } from './roles.js';

const TURN_TIME = 60;     // seconds to pick a move
const TARGET_TIME = 30;
const REACT_TIME = 12;    // challenge / block windows
const LOSE_TIME = 30;

export default async function (ctx) {
  const { h } = ctx;
  const art = (role) => ctx.asset(`${role || 'back'}.svg`);

  // ---------- setup ----------
  const seats = ctx.shuffle(ctx.connected).map((p) => ({ id: p.id, gold: START_GOLD, masks: [], out: false }));
  if (seats.length < 2) return ctx.say('Not enough guests', 'Two Faces needs at least 2 players.', 5000);
  const copies = seats.length > 6 ? 4 : 3;
  let deck = ctx.shuffle(Object.keys(ROLES).flatMap((r) => Array(copies).fill(r)));
  for (const s of seats) s.masks = [{ role: deck.pop(), open: false }, { role: deck.pop(), open: false }];

  const seat = (id) => seats.find((s) => s.id === id);
  const P = (s) => ctx.player(s.id) || { name: '?', color: '#888', connected: false };
  const name = (s) => P(s).name;
  const alive = () => seats.filter((s) => !s.out);
  const hidden = (s) => s.masks.filter((m) => !m.open);
  const rivals = (s) => alive().filter((x) => x !== s);
  const shuffleDeck = () => { deck = ctx.shuffle(deck); };

  // ---------- TV ----------
  const log = [];        // [{ parts: [string | seat] }]
  let banner = null;     // { parts, sub }
  let spot = null;       // { role, caption }
  let turnOf = null;
  let reveal = false;    // game over: show every mask face up
  const say = (...parts) => { log.push(parts); if (log.length > 40) log.shift(); };
  const txt = (parts) => parts.map((x) => (typeof x === 'object' && x && x.id
    ? h('b', { style: { color: P(x).color } }, name(x)) : String(x)));

  let started = false;
  function draw() {
    if (!started) return;
    ctx.el.replaceChildren(h('div.tf',
      h('div.tf-main',
        h('div.tf-banner', banner ? [h('h2', txt(banner.parts)), banner.sub && h('p', banner.sub)] : h('h2', 'Two Faces')),
        spot && h('div.tf-spot', h('img', { src: art(spot.role), alt: '' }), h('p', txt(spot.caption))),
        h('div.tf-seats', seats.map((s) => h('div.tf-seat' + (s === turnOf ? '.turn' : '') + (s.out ? '.out' : ''),
          { style: { '--c': P(s).color } },
          h('div.tf-name', name(s), P(s).connected ? '' : ' 📴'),
          h('div.tf-masks', s.masks.map((m) => h('img' + (m.open ? '.open' : ''), { src: art(m.open || reveal ? m.role : null), alt: '' }))),
          h('div.tf-gold', s.out ? 'OUT' : `🪙 ${s.gold}`))))),
      h('div.tf-log', h('h3', 'The ball so far'),
        h('ol', log.slice(-7).reverse().map((parts) => h('li', txt(parts)))))));
  }

  // ---------- phones ----------
  function sendHand(s) {
    ctx.send(s.id, { kind: 'hand', gold: s.gold, out: s.out, masks: s.masks });
  }
  const syncHands = () => seats.forEach(sendHand);
  ctx.on('join', (p) => { const s = p && seat(p.id); if (s) sendHand(s); draw(); });
  ctx.on('leave', () => draw());
  ctx.on('message', (p, d) => { const s = p && seat(p.id); if (s && d?.kind === 'hello') sendHand(s); });

  function waitAll(text) {
    for (const s of seats) ctx.show(s.id, { wait: s.out ? 'You\'re out of the ball. Watch the TV!' : text });
  }
  function refresh() { draw(); syncHands(); }

  async function pause(ms) { draw(); await ctx.sleep(ms); }

  /**
   * Ask several players at once and stop as soon as one gives an answer that
   * `hit` accepts (a challenge or a block). Resolves to { s, v } or null.
   */
  async function race(who, view, hit, seconds) {
    who = who.filter((s) => P(s).connected);
    if (!who.length) return null;
    const stop = ctx.clock(seconds);
    let found;
    const first = new Promise((r) => (found = r));
    const all = ctx.ask(who.map((s) => s.id), view, {
      timeout: seconds, clock: false,
      after: { wait: 'Waiting for the others…' },
      onAnswer: (p, v) => { if (hit(v)) found({ s: seat(p.id), v }); },
    }).then(() => null);
    all.catch(() => {});
    try { return await Promise.race([first, all]); } finally {
      stop();
      ctx.show(who.map((x) => x.id), { wait: 'Look at the TV!' });
    }
  }

  async function loseMask(s, why) {
    const left = hidden(s);
    if (!left.length) return;
    let m = left[0];
    if (left.length > 1) {
      ctx.show(rivals(s).map((x) => x.id), { wait: `${name(s)} is choosing a mask to drop…` });
      banner = { parts: [s, ' must drop a mask'], sub: why };
      draw();
      const a = await ctx.ask(s.id, {
        title: 'Drop a mask', text: why, buzz: true,
        choices: left.map((x) => ({ label: `${ROLES[x.role].icon} ${ROLES[x.role].name}`, value: s.masks.indexOf(x) })),
      }, { timeout: LOSE_TIME, after: { wait: 'Look at the TV!' } });
      m = s.masks[a.get(s.id)] || ctx.pick(left);
      if (m.open) m = left[0];
    }
    m.open = true;
    ctx.sfx('lose');
    say(s, ` drops the ${ROLES[m.role].name}.`);
    spot = { role: m.role, caption: [s, ` drops the ${ROLES[m.role].name}`] };
    if (!hidden(s).length) { s.out = true; say(s, ' is unmasked and leaves the ball!'); }
    refresh();
    await pause(2200);
    spot = null;
  }

  /** Someone called `s` a liar about `role`. Returns true if s really had it. */
  async function settle(s, role, accuser) {
    const R = ROLES[role];
    say(accuser, ' challenges ', s, `'s ${R.name}!`);
    banner = { parts: [accuser, ' calls ', s, ' a liar!'], sub: `Does ${name(s)} really wear the ${R.name}?` };
    waitAll('Challenge! Look at the TV…');
    ctx.sfx('buzz');
    await pause(1800);
    const m = hidden(s).find((x) => x.role === role);
    if (m) {
      spot = { role, caption: [s, ` reveals the ${R.name}!`] };
      say(s, ` shows the ${R.name} and shuffles it for a new mask.`);
      banner = { parts: [s, ' was telling the truth!'], sub: `${name(accuser)} loses a mask.` };
      ctx.sfx('ding');
      deck.push(role); shuffleDeck(); m.role = deck.pop();
      refresh();
      await pause(2600);
      spot = null;
      await loseMask(accuser, `You wrongly challenged ${name(s)}.`);
      return true;
    }
    banner = { parts: [s, ' was bluffing!'], sub: `${name(s)} has no ${R.name} and loses a mask.` };
    say(s, ` was bluffing about the ${R.name}!`);
    await pause(2000);
    await loseMask(s, `You were caught bluffing about the ${R.name}.`);
    return false;
  }

  function challengeView(claimer, text, role) {
    return {
      title: `${name(claimer)} claims the ${ROLES[role].name}`, text, color: ROLES[role].color,
      choices: [{ label: '🤝 Let it go', value: 'pass' },
        { label: `🫵 Challenge! No ${ROLES[role].name} there`, value: 'challenge' }],
    };
  }

  // ---------- one turn ----------
  async function turn(s) {
    turnOf = s;
    const mustUnmask = s.gold >= MUST_UNMASK;
    banner = { parts: [s, '\'s turn'], sub: mustUnmask ? `${MUST_UNMASK}+ gold: they must Unmask someone.` : 'Choosing a move…' };
    refresh();
    for (const x of seats) if (x !== s) ctx.show(x.id, { wait: x.out ? 'You\'re out of the ball. Watch the TV!' : `${name(s)} is choosing a move…` });

    const choices = Object.entries(MOVES).map(([k, mv]) => ({
      value: k,
      label: `${mv.claim ? ROLES[mv.claim].icon + ' ' : ''}${mv.label}: ${mv.short}${mv.claim ? ` (claim ${ROLES[mv.claim].name})` : ''}`,
      disabled: (mv.cost || 0) > s.gold || (mustUnmask && k !== 'unmask'),
    }));
    const a = await ctx.ask(s.id, {
      title: 'Your move', text: `You have ${s.gold} gold.${mustUnmask ? ' With 10 or more you must Unmask.' : ''}`,
      buzz: true, choices,
    }, { timeout: TURN_TIME, after: { wait: 'Look at the TV!' } });
    let key = a.get(s.id);
    if (!MOVES[key] || choices.find((c) => c.value === key).disabled) key = mustUnmask ? 'unmask' : 'mingle';
    const mv = MOVES[key];

    let t = null;
    if (mv.target) {
      const rs = rivals(s);
      if (rs.length === 1) t = rs[0];
      else {
        const ta = await ctx.ask(s.id, {
          title: `${mv.label} whom?`,
          choices: rs.map((x) => ({ value: x.id, label: `${P(x).name} (🪙 ${x.gold}, ${hidden(x).length} mask${hidden(x).length > 1 ? 's' : ''})` })),
        }, { timeout: TARGET_TIME, after: { wait: 'Look at the TV!' } });
        t = seat(ta.get(s.id)) || ctx.pick(rs);
        if (t.out || t === s) t = ctx.pick(rs);
      }
    }

    const cost = mv.cost || 0;
    s.gold -= cost;
    const claimText = {
      mingle: [s, ' mingles: +1 gold.'],
      beg: [s, ' begs a favor for 2 gold.'],
      unmask: [s, ' pays 7 to unmask ', t, '!'],
      fund: [s, ' claims the Patron to take 3 gold.'],
      poison: [s, ' pays 3 and claims the Poisoner to poison ', t, '.'],
      lift: [s, ' claims the Pickpocket to lift 2 gold from ', t, '.'],
      foresee: [s, ' claims the Seer to draw 2 masks.'],
    }[key];
    const plain = claimText.map((x) => (typeof x === 'object' ? name(x) : x)).join('');
    say(...claimText);
    if (mv.claim || mv.target) ctx.sfx('whoosh');
    banner = { parts: claimText };
    refresh();

    // Challenge the claim.
    if (mv.claim) {
      banner.sub = 'Anyone can challenge on their phone…';
      draw();
      const others = rivals(s);
      for (const x of seats.filter((x) => x.out)) ctx.show(x.id, { wait: 'You\'re out of the ball. Watch the TV!' });
      const ch = await race(others, challengeView(s, plain, mv.claim), (v) => v === 'challenge', REACT_TIME);
      if (ch) {
        const honest = await settle(s, mv.claim, ch.s);
        if (!honest) { s.gold += cost; refresh(); return; }
        if (t && t.out) return;
      } else {
        say('Nobody challenges.');
      }
    } else {
      await pause(900);
    }

    // Block.
    if (mv.blockedBy) {
      const blockers = mv.anyone ? rivals(s) : [t];
      banner.sub = mv.anyone ? 'Anyone with a Patron can block…' : `${name(t)} may block…`;
      draw();
      ctx.show(seats.filter((x) => !blockers.includes(x)).map((x) => x.id),
        { wait: mv.anyone ? 'Waiting to see if anyone blocks…' : `Waiting to see if ${name(t)} blocks…` });
      const b = await race(blockers, {
        title: mv.anyone ? 'Block it?' : `${name(s)} targets you!`, text: plain, buzz: !mv.anyone,
        choices: [{ label: '👍 Allow it', value: 'allow' },
          ...mv.blockedBy.map((r) => ({ label: `${ROLES[r].icon} Block, claiming the ${ROLES[r].name}`, value: r }))],
      }, (v) => v !== 'allow', REACT_TIME);
      if (b) {
        const role = b.v;
        const blockText = [b.s, ` blocks with the ${ROLES[role].name}.`];
        say(...blockText);
        ctx.sfx('glitch');
        banner = { parts: blockText, sub: 'Anyone can challenge the block…' };
        refresh();
        const ch = await race(rivals(b.s), challengeView(b.s, `${name(b.s)} blocks ${name(s)}'s ${mv.label}.`, role),
          (v) => v === 'challenge', REACT_TIME);
        if (!ch) {
          say('The block stands.');
          banner = { parts: [b.s, ' blocks it.'], sub: `${name(s)}'s ${mv.label} fails.` };
          await pause(1800);
          return;
        }
        const honest = await settle(b.s, role, ch.s);
        if (honest) return;
        if (s.out || (t && t.out)) return;
      } else {
        say('No block.');
      }
    }

    // Do it.
    if (mv.gain) s.gold += mv.gain;
    if (key === 'lift') {
      const n = Math.min(2, t.gold);
      t.gold -= n; s.gold += n;
      say(s, ` lifts ${n} gold from `, t, '.');
    }
    if (key === 'poison') await loseMask(t, `${name(s)} poisoned you.`);
    if (key === 'unmask') await loseMask(t, `${name(s)} unmasked you.`);
    if (key === 'foresee') await foresee(s);
    banner = { parts: claimText, sub: 'Done.' };
    refresh();
    await pause(1200);
  }

  async function foresee(s) {
    const mine = hidden(s);
    const drawn = [deck.pop(), deck.pop()].filter(Boolean);
    const pool = [...mine.map((m) => m.role), ...drawn];
    banner = { parts: [s, ' looks into the future…'], sub: 'Choosing which masks to keep.' };
    draw();
    const a = await ctx.ask(s.id, {
      title: `Keep ${mine.length} mask${mine.length > 1 ? 's' : ''}`,
      text: 'Your masks first, then the two you drew. The rest go back in the deck.',
      choices: pool.map((r, i) => ({ value: i, label: `${ROLES[r].icon} ${ROLES[r].name}${i < mine.length ? ' (yours)' : ' (new)'}` })),
      multi: { min: mine.length, max: mine.length, submit: 'Keep these' },
    }, { timeout: TARGET_TIME, after: { wait: 'Look at the TV!' } });
    let keep = a.get(s.id);
    if (!Array.isArray(keep) || keep.length !== mine.length || new Set(keep).size !== keep.length
      || keep.some((i) => !(i in pool))) keep = mine.map((_, i) => i);
    keep.forEach((i, k) => { mine[k].role = pool[i]; });
    pool.forEach((r, i) => { if (!keep.includes(i)) deck.push(r); });
    shuffleDeck();
    say(s, ' swaps masks with the deck.');
    refresh();
  }

  // ---------- play ----------
  await ctx.say('🎭 Two Faces', 'Every guest wears two secret masks. Claim any power you like, but get caught lying and you lose a mask.', 5000);
  started = true;
  refresh();
  say('The ball begins. Everyone gets 2 gold and two masks.');
  let i = 0;
  while (alive().length > 1) {
    const s = seats[i % seats.length];
    i++;
    if (s.out) continue;
    await turn(s);
    spot = null;
  }

  // ---------- winner ----------
  const w = alive()[0];
  turnOf = w;
  banner = { parts: ['🏆 ', w, ' is the last one masked!'], sub: 'Everyone\'s masks are revealed.' };
  reveal = true;
  ctx.sfx('win');
  say(w, ' wins the ball!');
  refresh();
  ctx.show('all', { title: 'The ball is over', wait: `${name(w)} wins! Back to the lobby soon…` });
  await ctx.sleep(9000);
}

// ---------- styles ----------
document.getElementById('two-faces-css')?.remove();
const css = Object.assign(document.createElement('style'), { id: 'two-faces-css' });
css.textContent = `
  .tf { display: grid; grid-template-columns: 1fr 17em; gap: 2.5vw; width: 100%; align-items: start; text-align: left; }
  .tf-main { display: flex; flex-direction: column; gap: 3vh; align-items: center; position: relative; }
  .tf-banner { text-align: center; min-height: 4.2em; }
  .tf-banner h2 { font-size: 2.1em; margin: 0; }
  .tf-banner p { color: var(--dim); font-size: 1.15em; margin: .3em 0 0; }
  .tf-spot { position: absolute; top: 5.5em; z-index: 2; box-shadow: 0 20px 60px #000c; display: flex; align-items: center; gap: 1.2em; background: var(--card); border: 3px solid var(--accent);
    border-radius: 24px; padding: 1em 1.6em; animation: pop .35s ease-out; }
  .tf-spot img { height: 22vh; filter: drop-shadow(0 8px 24px #000a); }
  .tf-spot p { font-size: 1.5em; font-weight: 800; max-width: 12em; }
  .tf-seats { display: flex; flex-wrap: wrap; gap: 1.1em; justify-content: center; font-size: .8em; }
  .tf-seat { background: color-mix(in srgb, var(--c) 12%, var(--card)); border: 3px solid color-mix(in srgb, var(--c) 50%, var(--line));
    border-radius: 20px; padding: .7em .9em; min-width: 9.5em; display: flex; flex-direction: column; align-items: center; gap: .4em;
    transition: transform .2s, box-shadow .2s; }
  .tf-seat.turn { border-color: var(--c); transform: translateY(-6px); box-shadow: 0 0 32px color-mix(in srgb, var(--c) 55%, transparent); }
  .tf-seat.out { opacity: .4; filter: grayscale(.7); }
  .tf-name { font-weight: 900; font-size: 1.15em; color: var(--c); max-width: 9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tf-masks { display: flex; gap: .35em; }
  .tf-masks img { height: 6.5em; border-radius: 10px; }
  .tf-masks img.open { filter: saturate(.55) brightness(.75); transform: rotate(-4deg); }
  .tf-gold { font-weight: 900; font-size: 1.2em; font-variant-numeric: tabular-nums; }
  .tf-log { background: var(--bg2); border: 2px solid var(--line); border-radius: 20px; padding: 1em 1.2em; max-height: 82vh; overflow: hidden; }
  .tf-log h3 { color: var(--accent); margin: 0 0 .5em; }
  .tf-log ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .45em; font-size: .8em; }
  .tf-log li { border-bottom: 1px solid var(--line); padding-bottom: .35em; }
  .tf-log li:first-child { font-weight: 800; }
  .tf-log li:last-child { border: 0; }
  @media (max-aspect-ratio: 4/3) { .tf { grid-template-columns: 1fr; } }
`;
document.head.append(css);
