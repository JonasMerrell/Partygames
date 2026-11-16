// Letter Forge: everyone gets the same rack of nine letter tiles and forges
// as many words as they can before the furnace cools. Words are checked
// against a word list (words.txt, from SCOWL; see WORDS-LICENSE.txt).
// A word scores the sum of its tile values, +5 for 6+ letters, and DOUBLE if
// nobody else found it.

const ROUNDS = 3;
const FORGE_TIME = 75;
const VALUE = {
  a: 1, e: 1, i: 1, o: 1, u: 2, n: 1, r: 1, s: 1, t: 1, l: 1,
  d: 2, g: 2, c: 3, m: 3, b: 3, p: 3, h: 4, f: 4, w: 4, y: 4,
  v: 5, k: 5, j: 8, x: 8, q: 10, z: 10,
};
const VOWELS = 'aaaeeeeiiioouu';
const CONSONANTS = 'bbccddddffgghhjkllllmmnnnnnppqrrrrrrssssstttttvvwwxyyz';

let WORDS = null;
async function loadWords(ctx) {
  if (WORDS) return WORDS;
  const txt = await (await fetch(ctx.asset('words.txt'))).text();
  WORDS = new Set(txt.split('\n').filter(Boolean));
  return WORDS;
}

const counts = (s) => [...s].reduce((m, c) => (m[c] = (m[c] || 0) + 1, m), {});
const fits = (word, rack) => {
  const have = counts(rack);
  for (const [c, n] of Object.entries(counts(word))) if ((have[c] || 0) < n) return false;
  return true;
};
const wordScore = (w) => [...w].reduce((s, c) => s + VALUE[c], 0) + (w.length >= 6 ? 5 : 0);

function makeRack(words) {
  for (let tries = 0; ; tries++) {
    const pick = (src, n) => Array.from({ length: n }, () => src[Math.floor(Math.random() * src.length)]);
    const rack = [...pick(VOWELS, 3 + (Math.random() < 0.5 ? 1 : 0)), ...pick(CONSONANTS, 9)].slice(0, 9).join('');
    const possible = [...words].filter((w) => fits(w, rack));
    if ((possible.length >= 40 && possible.some((w) => w.length >= 6)) || tries > 60) return { rack, possible };
  }
}

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  await ctx.say('Letter Forge', 'Same tiles for everyone. Rare words score double.', 3000);
  const words = await loadWords(ctx);

  for (let round = 1; round <= ROUNDS; round++) {
    const players = ctx.connected;
    if (!players.length) return;
    const { rack, possible } = makeRack(words);
    const tiles = (r, cls = '') => h('div.lf-rack' + cls, [...r].map((c) => h('div.lf-tile', c.toUpperCase(), h('sub', VALUE[c]))));
    const found = new Map(players.map((p) => [p.id, []]));
    const board = () => ctx.el.replaceChildren(h('h2', `Round ${round} of ${ROUNDS}`), tiles(rack),
      h('div.chips', players.map((p) => h('div.chip', { style: { '--c': p.color } }, `${p.name} · ${found.get(p.id).length}`))));
    board();
    const deadline = Date.now() + FORGE_TIME * 1000;
    const stop = ctx.clock(FORGE_TIME);
    const rackText = [...rack].map((c) => c.toUpperCase()).join(' ');
    await Promise.all(players.map(async (p) => {
      let note = 'Type a word made from these tiles. Each tile once per word.';
      while (Date.now() < deadline - 300) {
        const mine = found.get(p.id);
        const got = await ctx.ask(p, {
          title: rackText,
          text: `${note}\n\n${mine.length ? `Your words (${mine.length}): ${mine.slice(-12).join(', ')}` : ''}`,
          input: { placeholder: 'word', max: 9, submit: 'Forge' },
        }, { timeout: (deadline - Date.now()) / 1000, clock: false, after: { wait: 'Checking…' } });
        if (!got.has(p.id)) break;
        const w = String(got.get(p.id)).toLowerCase().replace(/[^a-z]/g, '');
        if (w.length < 3) note = `“${w}” is too short. 3 letters or more.`;
        else if (!fits(w, rack)) note = `“${w}” needs tiles you don't have.`;
        else if (mine.includes(w)) note = `You already forged “${w}”.`;
        else if (!words.has(w)) note = `“${w}” isn't in our word list.`;
        else { mine.push(w); note = `✅ ${w.toUpperCase()} (+${wordScore(w)})`; ctx.sfx?.('pop'); board(); }
      }
    }));
    stop();
    ctx.show('all', { wait: 'The furnace cools… look at the TV!' });

    // Scoring
    const by = new Map();
    for (const [id, ws] of found) for (const w of ws) by.set(w, [...(by.get(w) || []), id]);
    const rows = players.map((p) => {
      let pts = 0, best = null;
      for (const w of found.get(p.id)) {
        const unique = by.get(w).length === 1;
        const s = wordScore(w) * (unique ? 2 : 1);
        pts += s;
        if (unique && (!best || s > best.s)) best = { w, s };
      }
      add(p.id, pts);
      return { p, pts, n: found.get(p.id).length, best };
    }).sort((a, b) => b.pts - a.pts);
    const longest = possible.filter((w) => !by.has(w)).sort((a, b) => b.length - a.length || wordScore(b) - wordScore(a))[0];
    ctx.sfx?.('ding');
    ctx.el.replaceChildren(h('h2', 'Round results'), tiles(rack, '.lf-small'),
      h('div.lf-results', rows.map((r) => h('div.lf-res', { style: { '--c': r.p.color } },
        h('b', r.p.name), h('span', `${r.n} words · +${r.pts}`),
        h('span.lf-best', r.best ? `best unique: ${r.best.w.toUpperCase()} (+${r.best.s})` : 'no unique words')))),
      longest && h('p.lf-dim', `Nobody found ${longest.toUpperCase()} (${wordScore(longest)} pts). ${possible.length} words were hiding in this rack.`));
    await ctx.sleep(9000);
    await scoreboard(ctx, score, round === ROUNDS ? 'Final scores' : 'Scores', 5000);
  }

  const best = Math.max(0, ...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  ctx.sfx?.('win');
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'master of the forge', 6000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.lf-scores', rows.map(({ p, s }) =>
    h('div.lf-srow', h('span.lf-sname', p.name),
      h('div.lf-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('letter-forge-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'letter-forge-css', textContent: `
  .lf-rack { display: flex; gap: 1.2vw; justify-content: center; flex-wrap: wrap; }
  .lf-tile { position: relative; width: 4.2em; height: 4.2em; border-radius: 14px; display: grid; place-items: center;
    font-size: 1.6em; font-weight: 900; color: #3a1d05; background: linear-gradient(160deg, #ffd27a, #e8932e);
    box-shadow: 0 8px 0 #9a5512, 0 0 30px #ff8a2a55; animation: pop .35s ease-out; }
  .lf-tile sub { position: absolute; right: 8px; bottom: 4px; font-size: .45em; }
  .lf-small .lf-tile { font-size: .9em; }
  .lf-results { display: flex; flex-direction: column; gap: 10px; width: min(1100px, 100%); }
  .lf-res { display: grid; grid-template-columns: 8em 12em 1fr; gap: 16px; text-align: left; align-items: center;
    background: color-mix(in srgb, var(--c) 15%, var(--card)); border-left: 6px solid var(--c); border-radius: 12px; padding: 10px 16px; }
  .lf-best { color: var(--dim); }
  .lf-dim { color: var(--dim); font-size: 1.1em; }
  .lf-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .lf-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .lf-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lf-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .lf-sbar div { height: 100%; border-radius: 99px; }
` }));
