// Hard Sell: one player is the customer and picks who they are. Everyone else
// glues two word cards from their hand into a product, pitches it out loud,
// and the customer buys one. The other sellers also vote a crowd favourite.
import { WORDS } from './words.js';
import { PERSONAS } from './personas.js';

const HAND = 6;
const PERSONA_TIME = 20;
const BUILD_TIME = 75;     // pick two words and (optionally) name it
const CHOOSE_TIME = 45;
const SALE_POINTS = 3;
const CROWD_POINTS = 1;

export default async function (ctx) {
  const { h } = ctx;
  injectCss();
  const sfx = (n) => { try { ctx.sfx?.(n); } catch {} };
  const music = (m) => { try { ctx.music?.(m); } catch {} };
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const sales = new Map(ctx.players.map((p) => [p.id, []]));   // persona cards won
  const hands = new Map();
  let pile = ctx.shuffle(WORDS);
  let personaDeck = ctx.shuffle(PERSONAS);

  const draw = () => {
    if (!pile.length) {
      const held = new Set([...hands.values()].flat());
      pile = ctx.shuffle(WORDS.filter((w) => !held.has(w)));
    }
    return pile.pop();
  };
  const fill = (id) => {
    const hand = hands.get(id) || [];
    while (hand.length < HAND) hand.push(draw());
    hands.set(id, hand);
  };
  const drawPersonas = () => {
    if (personaDeck.length < 3) personaDeck = ctx.shuffle(PERSONAS);
    return [personaDeck.pop(), personaDeck.pop(), personaDeck.pop()];
  };

  const start = ctx.connected;
  if (start.length < 3) return ctx.say('Not enough players', 'Hard Sell needs at least 3 people.', 5000);
  const order = ctx.shuffle(start);
  const rounds = order.length <= 4 ? order.length * 2 : order.length;
  const pitchTime = order.length > 6 ? 30 : 45;

  ctx.show('all', { title: 'Hard Sell', wait: 'Look at the TV!' });
  ctx.el.replaceChildren(h('div.hs-intro',
    h('img.hs-logo', { src: ctx.asset('logo.svg'), alt: 'Hard Sell' }),
    h('ol.hs-rules',
      h('li', 'Each round one of you is the ', h('b', 'customer'), ' and picks who they are.'),
      h('li', 'Everyone else glues ', h('b', 'two word cards'), ' into a product for them.'),
      h('li', 'Take turns ', h('b', 'pitching it out loud'), '. Sell it like your life depends on it.'),
      h('li', 'The customer buys one: ', h('b', `+${SALE_POINTS}`), '. The other sellers vote a crowd favourite: ', h('b', `+${CROWD_POINTS}`), '.'))));
  await ctx.sleep(9000);

  for (let r = 0; r < rounds; r++) {
    let customer = order[r % order.length];
    if (!ctx.player(customer.id)?.connected) {
      customer = ctx.connected.find((p) => !order.slice(0, r).includes(p)) || ctx.pick(ctx.connected);
    }
    if (!customer) break;
    const sellers = ctx.connected.filter((p) => p.id !== customer.id);
    if (sellers.length < 2) return ctx.say('Not enough players', 'Too many people left. Back to the lobby.', 5000);
    sellers.forEach((p) => fill(p.id));

    // --- the customer picks who they are ---
    await ctx.say(`Round ${r + 1} of ${rounds}`, `${customer.name} is the customer`, 2500);
    const options = drawPersonas();
    ctx.el.replaceChildren(h('div.hs-wait',
      h('div.hs-who', { style: { '--c': customer.color } }, customer.name),
      h('p.sub', 'is deciding who they are today…'),
      h('div.hs-deck', [0, 1, 2].map(() => h('div.hs-persona.back', h('span', '?'))))));
    ctx.show(sellers, { title: 'Get ready', wait: `${customer.name} is picking a customer card…` });
    const chosen = await ctx.ask(customer, {
      title: 'You are the customer!',
      text: 'Pick who you are this round. Then listen to the pitches and buy the best one.',
      color: '#ffb23e', buzz: true,
      choices: options.map((p, i) => ({ label: `${p.e} ${p.name}, ${p.who}`, value: i })),
    }, { timeout: PERSONA_TIME, after: { wait: 'Great. The sellers are building products for you…' } });
    const persona = options[chosen.get(customer.id) ?? Math.floor(Math.random() * 3)];

    ctx.el.replaceChildren(h('div.hs-reveal',
      h('p.sub', `${customer.name} is…`),
      personaCard(h, persona, customer, 'big')));
    sfx('ding');
    await ctx.sleep(3500);

    // --- sellers build products ---
    const products = new Map();     // seller id -> { words, name }
    const done = new Set();
    const board = () => ctx.el.replaceChildren(h('div.hs-build',
      personaCard(h, persona, customer),
      h('div.hs-buildside',
        h('h1', 'Build a product!'),
        h('p.sub', 'Pick two word cards on your phone.'),
        h('div.chips', sellers.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
          { style: { '--c': p.color } }, (done.has(p.id) ? '✓ ' : '') + p.name))))));
    board();
    ctx.show(customer, { title: `${persona.e} ${persona.name}`, text: persona.who, wait: 'The sellers are building products for you. Get into character!' });
    const deadline = Date.now() + BUILD_TIME * 1000;
    const left = () => (deadline - Date.now()) / 1000;
    music('think');
    const stopClock = ctx.clock(BUILD_TIME);
    await Promise.all(sellers.map(async (p) => {
      const hand = hands.get(p.id);
      const forWho = `For: ${persona.e} ${persona.name}, ${persona.who}`;
      const got = await ctx.ask(p, {
        title: 'Pick two cards', text: forWho, buzz: true,
        choices: hand.map((w) => ({ label: w, value: w })),
        multi: { min: 2, max: 2, submit: 'Glue them together' },
      }, { timeout: left(), clock: false, after: { wait: 'Glued!' } });
      let words = got.get(p.id);
      if (!Array.isArray(words) || words.length !== 2) words = ctx.shuffle(hand).slice(0, 2);
      const product = { words, name: '' };
      products.set(p.id, product);
      if (left() > 3) {
        const want = await ctx.ask(p, {
          title: `${words[0]} + ${words[1]}`, text: 'Want to give it a catchy name?',
          choices: [{ label: '✏️ Name it', value: 'name' }, { label: '🚀 No, ship it as is', value: 'skip' }],
        }, { timeout: left(), clock: false, after: { wait: '…' } });
        if (want.get(p.id) === 'name' && left() > 2) {
          const named = await ctx.ask(p, {
            title: `${words[0]} + ${words[1]}`, text: 'Name your product',
            input: { placeholder: 'e.g. The Snooze-o-Matic 3000', max: 40, submit: 'Done' },
          }, { timeout: left(), clock: false, after: { wait: 'Nice. Get your pitch ready!' } });
          if (named.has(p.id)) product.name = String(named.get(p.id)).slice(0, 40);
        }
      }
      ctx.show(p, { title: product.name || `${words[0]} + ${words[1]}`, wait: 'Get your pitch ready. You\'ll be called up on the TV.' });
      done.add(p.id);
      sfx('pop');
      board();
    }));
    stopClock();
    for (const [id, { words }] of products) hands.set(id, hands.get(id).filter((w) => !words.includes(w)));

    // --- pitches ---
    const pitchers = ctx.shuffle(sellers.filter((p) => products.has(p.id)));
    music(null);
    await ctx.say('Pitch time!', `Sell it to the ${persona.name.toLowerCase()}.`, 2500);
    for (const [i, p] of pitchers.entries()) {
      if (!ctx.player(p.id)?.connected) continue;
      const prod = products.get(p.id);
      ctx.el.replaceChildren(h('div.hs-pitch',
        h('div.hs-pitchtop',
          h('span.sub', `Pitch ${i + 1} of ${pitchers.length} · for `),
          h('b', `${persona.e} ${persona.name}`)),
        productCard(h, prod, p, 'big'),
        h('p.hs-mic', '🎤 ', h('b', { style: { color: p.color } }, p.name), ', you\'re on!')));
      sfx('start');
      const others = ctx.connected.filter((q) => q.id !== p.id);
      ctx.show(others, { title: `${p.name} is pitching`, wait: 'Listen up…' });
      ctx.show(customer, { title: `${p.name} is pitching`, text: `${prod.words[0]} + ${prod.words[1]}`, wait: 'Listen, ask questions, haggle. You choose at the end.' });
      await ctx.ask(p, {
        title: 'You\'re on!', text: `Pitch ${prod.name || `your ${prod.words[0]} + ${prod.words[1]}`} out loud.`,
        color: p.color, buzz: true,
        choices: [{ label: '✅ Done pitching', value: 1 }],
      }, { timeout: pitchTime, after: { wait: 'Nice pitch!' } });
    }

    // --- the customer buys, the other sellers vote a crowd favourite ---
    const live = pitchers.filter((p) => ctx.player(p.id)?.connected);
    const label = (p) => `${products.get(p.id).name || `${products.get(p.id).words.join(' + ')}`} (${p.name})`;
    ctx.el.replaceChildren(h('div.hs-choose',
      h('div.hs-choosetop', personaCard(h, persona, customer, 'small'),
        h('h1', `${customer.name}, what are you buying?`)),
      h('div.hs-grid', live.map((p) => productCard(h, products.get(p.id), p)))));
    const crowdVoters = live.length >= 3 ? live : [];
    const [buy, crowd] = await Promise.all([
      ctx.ask(customer, {
        title: 'Which one are you buying?', color: '#ffb23e', buzz: true,
        choices: live.map((p) => ({ label: label(p), value: p.id })),
      }, { timeout: CHOOSE_TIME, after: { wait: 'Sold! Look at the TV.' } }),
      Promise.all(crowdVoters.map((p) => ctx.ask(p, {
        title: 'Crowd favourite', text: 'Which other pitch did you love most?',
        choices: live.filter((q) => q.id !== p.id).map((q) => ({ label: label(q), value: q.id })),
      }, { timeout: CHOOSE_TIME, clock: false, after: { wait: 'Vote in. Waiting for the customer…' } }))),
    ]);
    const winnerId = buy.get(customer.id) ?? ctx.pick(live)?.id;
    const tally = new Map();
    for (const m of crowd) for (const v of m.values()) tally.set(v, (tally.get(v) || 0) + 1);
    const top = Math.max(0, ...tally.values());
    const favs = top ? [...tally].filter(([, n]) => n === top).map(([id]) => id) : [];

    if (winnerId) {
      score.set(winnerId, (score.get(winnerId) || 0) + SALE_POINTS);
      sales.get(winnerId)?.push(persona);
    }
    for (const id of favs) score.set(id, (score.get(id) || 0) + CROWD_POINTS);

    // --- reveal ---
    const winner = ctx.player(winnerId);
    ctx.show('all', { wait: 'Look at the TV!' });
    if (winner) {
      ctx.el.replaceChildren(h('div.hs-sold',
        h('div.hs-soldcard', productCard(h, products.get(winnerId), winner, 'big'), h('div.hs-stamp', 'SOLD!')),
        h('h1', h('span', { style: { color: winner.color } }, winner.name), ` made the sale! +${SALE_POINTS}`),
        favs.length ? h('p.hs-fav', '⭐ Crowd favourite: ', favs.map((id) => ctx.player(id)?.name).join(' & '), ` +${CROWD_POINTS}`) : null));
      sfx('win');
      music('party');
      ctx.show(winner, { title: 'SOLD! 🎉', text: `You sold to the ${persona.name.toLowerCase()}. +${SALE_POINTS}`, color: winner.color, buzz: true });
      await ctx.sleep(6500);
    }

    await scoreboard(ctx, score, sales, r === rounds - 1 ? 'Final sales figures' : 'Sales figures', r === rounds - 1 ? 7000 : 5000);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won. Back to the lobby soon…` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, best ? 'Salesperson of the year!' : 'Nobody sold a thing. Impressive.', 8000);
}

function personaCard(h, p, customer, size = '') {
  return h('div.hs-persona' + (size ? '.' + size : ''),
    h('div.hs-pe', p.e),
    h('div.hs-pname', p.name),
    h('div.hs-pwho', p.who),
    customer && h('div.hs-pby', { style: { color: customer.color } }, customer.name));
}

function productCard(h, prod, seller, size = '') {
  const [a, b] = prod.words;
  return h('div.hs-product' + (size ? '.' + size : ''), { style: { '--c': seller.color } },
    h('div.hs-words', h('div.hs-word.l', a), h('span.hs-plus', '+'), h('div.hs-word.r', b)),
    prod.name && h('div.hs-name', `“${prod.name}”`),
    h('div.hs-seller', seller.name));
}

async function scoreboard(ctx, score, sales, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.hs-scores', rows.map(({ p, s }) =>
    h('div.hs-srow', h('span.hs-sname', p.name),
      h('div.hs-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span.hs-sales', (sales.get(p.id) || []).map((x) => x.e).join('')),
      h('span.hs-spts', s)))));
  await ctx.sleep(ms);
}

function injectCss() {
  document.getElementById('hard-sell-css')?.remove();
  const css = Object.assign(document.createElement('style'), { id: 'hard-sell-css' });
  css.textContent = `
  .hs-intro { display: flex; flex-direction: column; align-items: center; gap: 3vh; }
  .hs-logo { width: min(640px, 70vw); animation: hs-wobble 2.4s ease-in-out infinite alternate; }
  .hs-rules { text-align: left; font-size: 1.35em; max-width: 1000px; display: flex; flex-direction: column; gap: .5em; }
  .hs-rules b { color: #ffb23e; }
  .hs-who { font-size: 3em; font-weight: 900; color: var(--c); }
  .hs-deck { display: flex; gap: 2vw; margin-top: 2vh; }
  .hs-persona { --pc: #ffb23e; width: 15em; min-height: 19em; border-radius: 22px; padding: 1.4em 1.2em;
    background: linear-gradient(160deg, #fff4d6, #ffd98a); color: #3a1d00; border: 6px solid #3a1d00;
    box-shadow: 0 12px 0 #3a1d00, 0 20px 50px #0008; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: .4em; text-align: center; animation: hs-pop .4s ease-out; }
  .hs-persona.back { background: repeating-linear-gradient(45deg, #ff9f1c 0 18px, #ffb23e 18px 36px); }
  .hs-persona.back span { font-size: 5em; font-weight: 900; color: #3a1d00; }
  .hs-deck .hs-persona:nth-child(1) { transform: rotate(-6deg); } .hs-deck .hs-persona:nth-child(3) { transform: rotate(6deg); }
  .hs-persona.big { width: 22em; min-height: 26em; font-size: 1.1em; transform: rotate(-2deg); }
  .hs-persona.small { width: 11em; min-height: 0; font-size: .8em; padding: .8em; box-shadow: 0 6px 0 #3a1d00; }
  .hs-pe { font-size: 5em; line-height: 1.1; }
  .hs-persona.small .hs-pe { font-size: 3em; }
  .hs-pname { font-size: 1.7em; font-weight: 900; text-transform: uppercase; letter-spacing: .03em; }
  .hs-pwho { font-size: 1.1em; font-style: italic; }
  .hs-pby { font-weight: 900; margin-top: .4em; text-shadow: 0 1px 0 #3a1d00, 0 -1px 0 #3a1d00, 1px 0 0 #3a1d00, -1px 0 0 #3a1d00; }
  .hs-build { display: flex; gap: 5vw; align-items: center; justify-content: center; flex-wrap: wrap; }
  .hs-buildside { max-width: 900px; }
  .hs-pitch { display: flex; flex-direction: column; align-items: center; gap: 4vh; }
  .hs-pitchtop { font-size: 1.3em; }
  .hs-mic { font-size: 1.8em; font-weight: 800; margin: 0; }
  .hs-product { background: var(--card); border: 4px solid var(--c); border-radius: 24px; padding: 1.2em;
    display: flex; flex-direction: column; align-items: center; gap: .6em; animation: hs-pop .35s ease-out; }
  .hs-words { display: flex; align-items: center; gap: .6em; }
  .hs-word { background: #fffaf0; color: #222; font-weight: 900; border-radius: 14px; padding: 1em .9em; min-width: 6em;
    border: 4px solid #222; box-shadow: 0 6px 0 #222; font-size: 1.15em; text-transform: uppercase; }
  .hs-word.l { transform: rotate(-4deg); } .hs-word.r { transform: rotate(3deg); }
  .hs-plus { font-size: 2em; font-weight: 900; color: #ffb23e; }
  .hs-name { font-size: 1.4em; font-weight: 900; color: #ffd166; }
  .hs-seller { color: var(--c); font-weight: 800; }
  .hs-product.big { font-size: 1.7em; padding: 1em 1.6em; }
  .hs-choose { display: flex; flex-direction: column; align-items: center; gap: 3vh; width: 100%; }
  .hs-choosetop { display: flex; gap: 3vw; align-items: center; }
  .hs-grid { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; max-width: 1600px; }
  .hs-grid .hs-product { font-size: .85em; }
  .hs-sold { display: flex; flex-direction: column; align-items: center; gap: 4vh; }
  .hs-soldcard { position: relative; }
  .hs-stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-14deg);
    font-size: 5em; font-weight: 900; color: #ff3b3b; border: 10px solid #ff3b3b; border-radius: 18px; padding: 0 .3em;
    letter-spacing: .08em; background: #14111f99; animation: hs-stamp .45s cubic-bezier(.2,1.6,.4,1) both .3s; }
  .hs-fav { font-size: 1.5em; color: #ffd166; font-weight: 800; margin: 0; }
  .hs-scores { width: min(1100px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .hs-srow { display: grid; grid-template-columns: 8em 1fr 7em 3em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .hs-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hs-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .hs-sbar div { height: 100%; border-radius: 99px; transition: width .8s; }
  .hs-sales { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .hs-spts { text-align: right; font-variant-numeric: tabular-nums; }
  @keyframes hs-pop { from { transform: scale(.7); opacity: 0; } }
  @keyframes hs-wobble { from { transform: rotate(-2deg); } to { transform: rotate(2deg) scale(1.03); } }
  @keyframes hs-stamp { from { transform: translate(-50%, -50%) rotate(-14deg) scale(3); opacity: 0; } }
  `;
  document.head.append(css);
}
