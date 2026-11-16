// Gallery of Lies: every player secretly draws a title. Then, one artwork at
// a time, the other players write fake museum placards for it, and everyone
// (except the artist) tries to pick the real placard.
//   +500  for picking the real title
//   +300  to the artist for each visitor who found the real title
//   +400  to a placard's author for each visitor it fooled
import { TITLES } from './titles.js';

const DRAW_TIME = 90;
const FAKE_TIME = 45;
const PICK_TIME = 25;

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  const players = ctx.connected;
  if (players.length < 3) return ctx.say('Not enough players', 'Gallery of Lies needs at least 3 people.', 5000);

  await ctx.say('Gallery of Lies', 'Tonight\'s exhibition is painted by you.', 3500);

  // --- drawing ---
  const deck = ctx.shuffle(TITLES);
  const works = players.map((p) => ({ by: p, title: deck.pop(), png: null }));
  const done = new Set();
  const board = (title) => ctx.el.replaceChildren(h('h1', title),
    h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
      { style: { '--c': p.color } }, (done.has(p.id) ? '🖌️ ' : '') + p.name))));
  board('The artists are at work…');
  const stopClock = ctx.clock(DRAW_TIME);
  await Promise.all(works.map(async (w) => {
    const got = await ctx.ask(w.by, {
      title: 'Your secret title', text: `“${w.title}”\nDraw it. Don't write words!`,
      draw: { submit: 'Hang it in the gallery' },
    }, { timeout: DRAW_TIME, clock: false, after: { wait: 'Masterpiece. Waiting for the other artists…' } });
    w.png = got.get(w.by.id) || null;
    done.add(w.by.id); board('The artists are at work…');
  }));
  stopClock();

  // --- each artwork ---
  for (const w of ctx.shuffle(works.filter((x) => x.png))) {
    const frame = () => h('div.gl-frame', h('img', { src: w.png, alt: '' }));
    const others = ctx.connected.filter((p) => p.id !== w.by.id);

    // Fake placards. Too close to the real title? Write another one.
    done.clear();
    const board2 = () => ctx.el.replaceChildren(h('div.gl-row', frame(), h('div',
      h('h2', 'What is this masterpiece called?'),
      h('p.gl-dim', 'Write a fake title that visitors will believe.'),
      h('div.chips', others.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'), { style: { '--c': p.color } }, p.name))))));
    board2();
    ctx.show(w.by, { title: 'That\'s yours!', wait: 'Everyone is writing fake titles for your drawing.' });
    const fakes = new Map();
    const deadline = Date.now() + FAKE_TIME * 1000;
    const stop2 = ctx.clock(FAKE_TIME);
    await Promise.all(others.map(async (p) => {
      let note = '';
      while (Date.now() < deadline) {
        const got = await ctx.ask(p, {
          title: 'Write a fake title', image: w.png, text: note,
          input: { placeholder: 'A believable title', max: 50, submit: 'Hang the placard' },
        }, { timeout: (deadline - Date.now()) / 1000, clock: false, after: { wait: 'Sneaky. Waiting for the others…' } });
        const v = got.get(p.id);
        if (!v) break;
        if (norm(v) === norm(w.title)) { note = 'That\'s the real title! Try a fake one.'; continue; }
        if ([...fakes.values()].some((f) => norm(f) === norm(v))) { note = 'Someone already wrote that. Try another.'; continue; }
        fakes.set(p.id, v);
        break;
      }
      done.add(p.id); board2();
    }));
    stop2();

    // Picking. Each placard groups the players who wrote it.
    const placards = [{ text: w.title, real: true, authors: [] }];
    for (const [id, text] of fakes) placards.push({ text, real: false, authors: [id] });
    const shown = ctx.shuffle(placards);
    const list = () => h('div.gl-placards', shown.map((pl, i) => h('div.gl-placard', `${i + 1}. ${pl.text}`)));
    ctx.el.replaceChildren(h('div.gl-row', frame(), h('div', h('h2', 'Which placard is real?'), list())));
    ctx.show(w.by, { title: 'Sit tight', wait: 'Visitors are reading the placards.' });
    const picks = new Map();
    const stop3 = ctx.clock(PICK_TIME);
    await Promise.all(others.map(async (p) => {
      const got = await ctx.ask(p, {
        title: 'Which title is real?', image: w.png,
        choices: shown.map((pl, i) => ({ label: `${i + 1}. ${pl.text}`, value: i, disabled: pl.authors.includes(p.id) })),
      }, { timeout: PICK_TIME, clock: false, after: { wait: 'Interesting choice…' } });
      if (got.has(p.id)) picks.set(p.id, got.get(p.id));
    }));
    stop3();
    const pickedBy = shown.map(() => []);
    for (const [id, i] of picks) if (shown[i] && !shown[i].authors.includes(id)) pickedBy[i].push(id);

    // Reveal fakes first, the real one last.
    const order = shown.map((pl, i) => i).filter((i) => pickedBy[i].length || shown[i].real)
      .sort((a, b) => (shown[a].real ? 1 : 0) - (shown[b].real ? 1 : 0));
    ctx.show('all', { wait: 'The truth is on the TV…' });
    for (const i of order) {
      const pl = shown[i];
      const names = pickedBy[i].map((id) => ctx.player(id)?.name).filter(Boolean);
      let verdict;
      if (pl.real) {
        for (const id of pickedBy[i]) add(id, 500);
        add(w.by.id, 300 * pickedBy[i].length);
        ctx.sfx?.('win');
        verdict = h('div.gl-verdict.gl-true', `THE REAL TITLE, drawn by ${w.by.name}`);
      } else {
        for (const a of pl.authors) add(a, 400 * pickedBy[i].length);
        ctx.sfx?.('lose');
        verdict = h('div.gl-verdict.gl-fake', `A forgery by ${pl.authors.map((a) => ctx.player(a)?.name).join(', ')}`);
      }
      ctx.el.replaceChildren(h('div.gl-row', frame(), h('div.gl-reveal',
        h('div.gl-placard.gl-big', pl.text),
        h('p', names.length ? `Picked by ${names.join(', ')}` : 'Nobody picked it'),
        verdict)));
      await ctx.sleep(4000);
    }
    await scoreboard(ctx, score, 'Gallery standings', 5000);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'The gallery is closing', wait: `${winners.join(' & ')} won.` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'artist and forger of the year', 7000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.gl-scores', rows.map(({ p, s }) =>
    h('div.gl-srow', h('span.gl-sname', p.name),
      h('div.gl-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('gallery-of-lies-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'gallery-of-lies-css', textContent: `
  .gl-row { display: flex; gap: 4vw; align-items: center; justify-content: center; width: 100%; text-align: left; }
  .gl-frame { background: linear-gradient(135deg, #c9a24a, #7a5a1c); padding: 18px; border-radius: 6px;
    box-shadow: 0 20px 60px #0008, inset 0 0 0 4px #e9cf8a; flex: none; }
  .gl-frame img { display: block; width: min(42vw, 62vh); aspect-ratio: 1; background: #fff; }
  .gl-dim { color: var(--dim); }
  .gl-placards { display: flex; flex-direction: column; gap: 12px; }
  .gl-placard { background: #f3ead3; color: #2b2112; border-radius: 6px; padding: 12px 18px; font-weight: 800;
    font-family: Georgia, 'Times New Roman', serif; box-shadow: 0 4px 0 #b8a77d; animation: pop .3s ease-out; }
  .gl-big { font-size: 1.8em; }
  .gl-reveal { display: flex; flex-direction: column; gap: 16px; font-size: 1.2em; }
  .gl-verdict { font-weight: 900; font-size: 1.2em; padding: 10px 16px; border-radius: 14px; }
  .gl-true { background: #5df08a; color: #10301a; }
  .gl-fake { background: #ff5d73; color: #3a0d15; }
  .gl-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .gl-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .gl-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gl-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .gl-sbar div { height: 100%; border-radius: 99px; }
` }));
