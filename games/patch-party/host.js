// Patch Party: design embroidered jacket patches together.
//  1. Everyone draws two patch designs.
//  2. Everyone writes three short mottos.
//  3. Everyone gets a random handful of other people's designs and mottos,
//     and stitches the best combination into a patch.
//  4. All the patches go up on the TV and everyone votes for two favourites.
//   Per vote: +300 to whoever stitched it, +200 to the artist, +200 to the motto writer.

const DRAW_TIME = 100;
const MOTTO_TIME = 60;
const STITCH_TIME = 45;
const VOTE_TIME = 30;
const HAND = 3;

const MOTTO_PROMPTS = [
  'A motto for a club that meets in a cupboard',
  'Something your grandma would stitch on a jacket',
  'A slogan for the world\'s laziest sports team',
  'Words to live by, but wrong',
  'A motto for people who are always late',
  'What a pigeon would put on its jacket',
  'A warning label for yourself',
  'The motto of a very nervous pirate crew',
  'A slogan for a snack that is mostly air',
];

// Shrink a drawing so several fit in one message to a phone.
function shrink(url, size = 300) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = Object.assign(document.createElement('canvas'), { width: size, height: size });
      c.getContext('2d').drawImage(img, 0, 0, size, size);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  const players = ctx.connected;
  if (players.length < 3) return ctx.say('Not enough players', 'Patch Party needs at least 3 people.', 5000);

  await ctx.say('Patch Party', 'Draw patches, write mottos, stitch them together.', 3500);
  const done = new Set();
  const board = (title, sub) => ctx.el.replaceChildren(h('h1', title), sub && h('p.pp-dim', sub),
    h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
      { style: { '--c': p.color } }, (done.has(p.id) ? '🧵 ' : '') + p.name))));

  // --- 1. designs ---
  const designs = [];
  board('Step 1: draw two patch designs', 'Keep it round: the corners get trimmed off.');
  let deadline = Date.now() + DRAW_TIME * 1000;
  let stop = ctx.clock(DRAW_TIME);
  await Promise.all(players.map(async (p) => {
    for (let k = 0; k < 2 && Date.now() < deadline; k++) {
      const got = await ctx.ask(p, {
        title: `Patch design ${k + 1} of 2`, text: 'Draw a patch: an animal, a symbol, a creature, anything. No words; mottos come later!',
        draw: { submit: k ? 'Done' : 'Next design' },
      }, { timeout: (deadline - Date.now()) / 1000, clock: false, after: { wait: 'Lovely. Waiting for the others…' } });
      if (got.has(p.id)) designs.push({ by: p, img: await shrink(got.get(p.id)) });
    }
    done.add(p.id); board('Step 1: draw two patch designs', 'Keep it round: the corners get trimmed off.');
  }));
  stop();

  // --- 2. mottos ---
  const mottos = [];
  done.clear();
  board('Step 2: write three mottos', 'Short and punchy. Someone else will stitch them onto a patch.');
  deadline = Date.now() + MOTTO_TIME * 1000;
  stop = ctx.clock(MOTTO_TIME);
  await Promise.all(players.map(async (p) => {
    const prompts = ctx.shuffle(MOTTO_PROMPTS);
    for (let k = 0; k < 3 && Date.now() < deadline; k++) {
      const got = await ctx.ask(p, {
        title: `Motto ${k + 1} of 3`, text: `Idea: ${prompts[k]}`,
        input: { placeholder: 'A short motto', max: 32, submit: 'Stitch it' },
      }, { timeout: (deadline - Date.now()) / 1000, clock: false, after: { wait: 'Nice. Waiting for the others…' } });
      const v = got.get(p.id);
      if (v) mottos.push({ by: p, text: v.trim() });
    }
    done.add(p.id); board('Step 2: write three mottos', 'Short and punchy. Someone else will stitch them onto a patch.');
  }));
  stop();
  if (!designs.length || !mottos.length) return ctx.say('Not enough material', 'We need drawings and mottos to make patches!', 5000);

  // --- 3. stitch ---
  const handOf = (pool, p) => {
    const others = ctx.shuffle(pool.filter((x) => x.by.id !== p.id));
    const own = ctx.shuffle(pool.filter((x) => x.by.id === p.id));
    return [...others, ...own].slice(0, HAND);
  };
  const patches = [];
  done.clear();
  board('Step 3: stitch your patch', 'Pick a design and a motto from the pile you were dealt.');
  deadline = Date.now() + STITCH_TIME * 1000;
  stop = ctx.clock(STITCH_TIME);
  await Promise.all(players.map(async (p) => {
    const dh = handOf(designs, p), mh = handOf(mottos, p);
    let d = dh[0], m = mh[0];
    const g1 = await ctx.ask(p, { title: 'Pick a design', text: 'Tap the one you want on your patch.', pick: dh.map((x) => x.img) },
      { timeout: (deadline - Date.now()) / 1000, clock: false, after: { wait: '…' } });
    if (g1.has(p.id)) d = dh[g1.get(p.id)] || d;
    const g2 = await ctx.ask(p, {
      title: 'Pick a motto', image: d.img, choices: mh.map((x, i) => ({ label: x.text, value: i })),
    }, { timeout: Math.max(1, (deadline - Date.now()) / 1000), clock: false, after: { wait: 'Stitching… look at the TV soon!' } });
    if (g2.has(p.id)) m = mh[g2.get(p.id)] || m;
    patches.push({ maker: p, design: d, motto: m });
    done.add(p.id); board('Step 3: stitch your patch', 'Pick a design and a motto from the pile you were dealt.');
  }));
  stop();

  // --- 4. show and vote ---
  const shown = ctx.shuffle(patches);
  const patchEl = (pt, i, extra) => h('div.pp-patch', { style: { '--c': pt.maker.color } },
    h('div.pp-badge', h('img', { src: pt.design.img, alt: '' })),
    h('div.pp-ribbon', pt.motto.text), h('div.pp-n', `#${i + 1}`), extra);
  ctx.show('all', { wait: 'Look at the TV!' });
  for (const [i, pt] of shown.entries()) {
    ctx.el.replaceChildren(h('h2', 'Fresh off the machine…'), h('div.pp-solo', patchEl(pt, i)));
    ctx.sfx?.('pop');
    await ctx.sleep(3000);
  }
  ctx.el.replaceChildren(h('h2', 'Vote for your two favourites'), h('div.pp-wall', shown.map((pt, i) => patchEl(pt, i))));
  const votes = new Map();
  stop = ctx.clock(VOTE_TIME);
  await Promise.all(players.map(async (p) => {
    const choices = shown.map((pt, i) => ({ label: `#${i + 1}: ${pt.motto.text}`, value: i, disabled: pt.maker.id === p.id }));
    const can = choices.filter((c) => !c.disabled).length;
    if (!can) return;
    const got = await ctx.ask(p, {
      title: 'Your two favourites', choices, multi: { min: 1, max: Math.min(2, can), submit: 'Vote' },
    }, { timeout: VOTE_TIME, clock: false, after: { wait: 'Votes in!' } });
    if (got.has(p.id)) votes.set(p.id, got.get(p.id));
  }));
  stop();
  const tally = shown.map(() => 0);
  for (const [pid, list] of votes) for (const i of new Set(list || [])) if (shown[i] && shown[i].maker.id !== pid) tally[i]++;
  shown.forEach((pt, i) => {
    add(pt.maker.id, tally[i] * 300);
    add(pt.design.by.id, tally[i] * 200);
    add(pt.motto.by.id, tally[i] * 200);
  });
  const order = shown.map((pt, i) => ({ pt, i, v: tally[i] })).sort((a, b) => b.v - a.v);
  ctx.sfx?.('win');
  const credit = (pt) => h('div.pp-credit',
    h('span', { style: { color: pt.maker.color } }, `stitched by ${pt.maker.name}`),
    h('span', { style: { color: pt.design.by.color } }, `art: ${pt.design.by.name}`),
    h('span', { style: { color: pt.motto.by.color } }, `motto: ${pt.motto.by.name}`));
  ctx.el.replaceChildren(h('h2', 'Patch of the night'), h('div.pp-solo', patchEl(order[0].pt, order[0].i,
    h('div.pp-votes', `${order[0].v} vote${order[0].v === 1 ? '' : 's'}`))), credit(order[0].pt));
  await ctx.sleep(6500);
  ctx.el.replaceChildren(h('h2', 'The whole collection'), h('div.pp-wall', order.map(({ pt, i, v }) =>
    patchEl(pt, i, h('div.pp-votes', `${v} vote${v === 1 ? '' : 's'}`)))));
  await ctx.sleep(7000);
  await scoreboard(ctx, score, 'Final scores', 6000);

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'head of the stitching circle', 6000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.pp-scores', rows.map(({ p, s }) =>
    h('div.pp-srow', h('span.pp-sname', p.name),
      h('div.pp-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('patch-party-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'patch-party-css', textContent: `
  .pp-dim { color: var(--dim); font-size: 1.1em; }
  .pp-wall { display: flex; flex-wrap: wrap; gap: 2vw; justify-content: center; max-width: 1600px; }
  .pp-solo { transform: scale(1.5); margin: 8vh 0; }
  .pp-patch { position: relative; display: flex; flex-direction: column; align-items: center; width: 13em; animation: pop .4s ease-out; }
  .pp-badge { width: 11em; height: 11em; border-radius: 50%; overflow: hidden; background: #fff;
    border: 8px solid var(--c); outline: 3px dashed color-mix(in srgb, var(--c) 60%, #fff); outline-offset: -14px;
    box-shadow: 0 10px 30px #0008; }
  .pp-badge img { width: 100%; height: 100%; display: block; }
  .pp-ribbon { margin-top: -1.4em; background: var(--c); color: #120f1d; font-weight: 900; padding: 6px 16px; border-radius: 8px;
    max-width: 100%; text-transform: uppercase; letter-spacing: .04em; font-size: .85em; box-shadow: 0 4px 0 #0006;
    border: 2px dashed #fff8; overflow-wrap: anywhere; }
  .pp-n { position: absolute; top: 0; left: 0; background: var(--card); border-radius: 99px; padding: 2px 10px; font-weight: 900; }
  .pp-votes { margin-top: 6px; color: var(--accent); font-weight: 900; }
  .pp-credit { display: flex; gap: 24px; font-weight: 800; font-size: 1.2em; flex-wrap: wrap; justify-content: center; }
  .pp-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .pp-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .pp-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pp-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .pp-sbar div { height: 100%; border-radius: 99px; }
` }));
