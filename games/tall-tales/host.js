// Tall Tales: a strange-but-true fact with a blank. Everyone writes a
// believable fake to fill it, then picks which answer they think is true.
//   +1000 for finding the truth (x round)
//   +500  for each player your tall tale fooled (x round)
// If you accidentally write the truth, you get a small bonus and write again.
import { TALES } from './tales.js';

const WRITE_TIME = 45;
const PICK_TIME = 25;
const QUESTIONS = [3, 3]; // per round

const norm = (s) => String(s).toLowerCase().replace(/^(the|a|an) /, '').replace(/[^a-z0-9]/g, '');

export default async function (ctx) {
  const { h } = ctx;
  const score = new Map(ctx.players.map((p) => [p.id, 0]));
  const add = (id, n) => score.set(id, (score.get(id) || 0) + n);
  const deck = ctx.shuffle(TALES);

  await ctx.say('Tall Tales', 'Every fact is true. Every other answer is a lie.', 3500);

  for (const [ri, count] of QUESTIONS.entries()) {
    const mult = ri + 1;
    await ctx.say(`Round ${mult}`, mult > 1 ? 'Double points!' : 'Fool your friends, find the truth.', 2500);
    for (let qi = 0; qi < count; qi++) {
      const players = ctx.connected;
      if (players.length < 2) return ctx.say('Not enough players', 'Tall Tales needs at least 2 people.', 5000);
      const t = deck.pop();
      const truths = [t.a, ...(t.alt || [])].map(norm);
      const fact = (blank) => h('h1.tt-q', ...t.q.split('___').flatMap((part, i) => (i ? [blank, part] : [part])));
      const blank = () => h('span.tt-blank', '?');

      // --- writing ---
      const lies = new Map();
      const done = new Set();
      const board = () => ctx.el.replaceChildren(fact(blank()),
        h('p.tt-dim', 'Write a lie to fill the blank.'),
        h('div.chips', players.map((p) => h('div.chip' + (done.has(p.id) ? '' : '.away'),
          { style: { '--c': p.color } }, (done.has(p.id) ? '✓ ' : '') + p.name))));
      board();
      const deadline = Date.now() + WRITE_TIME * 1000;
      const stop = ctx.clock(WRITE_TIME);
      await Promise.all(players.map(async (p) => {
        let note = '';
        let foundTruth = false;
        while (Date.now() < deadline) {
          const got = await ctx.ask(p, {
            title: 'Fill the blank with a lie', text: t.q + (note ? `\n\n${note}` : ''),
            input: { placeholder: 'A believable lie', max: 30, submit: 'Tell it' },
          }, { timeout: (deadline - Date.now()) / 1000, clock: false, after: { wait: 'Very convincing. Waiting…' } });
          const v = got.get(p.id);
          if (!v) break;
          if (truths.includes(norm(v))) {
            if (!foundTruth) { foundTruth = true; add(p.id, 100 * mult); }
            note = `That's actually the truth! (+${100 * mult}) Now write a lie.`;
            continue;
          }
          if ([...lies.values()].some((l) => norm(l) === norm(v))) { note = 'Someone already told that one. Try another.'; continue; }
          lies.set(p.id, v.trim());
          break;
        }
        done.add(p.id); board();
      }));
      stop();

      // --- picking ---
      const options = [{ text: t.a, truth: true, authors: [] }];
      for (const [id, text] of lies) options.push({ text, authors: [id] });
      for (const d of ctx.shuffle(t.decoys || [])) {
        if (options.length >= 4) break;
        if (!options.some((o) => norm(o.text) === norm(d))) options.push({ text: d, house: true, authors: [] });
      }
      const shown = ctx.shuffle(options);
      ctx.el.replaceChildren(fact(blank()), h('div.tt-opts', shown.map((o) => h('div.tt-opt', o.text))));
      const picks = new Map();
      const stopP = ctx.clock(PICK_TIME);
      await Promise.all(players.map(async (p) => {
        const got = await ctx.ask(p, {
          title: 'Which one is true?', text: t.q,
          choices: shown.map((o, i) => ({ label: o.text, value: i, disabled: o.authors.includes(p.id) })),
        }, { timeout: PICK_TIME, clock: false, after: { wait: 'Locked in.' } });
        if (got.has(p.id)) picks.set(p.id, got.get(p.id));
      }));
      stopP();
      ctx.show('all', { wait: 'The truth is on the TV…' });

      // --- reveal: lies first, truth last ---
      const pickedBy = shown.map(() => []);
      for (const [id, i] of picks) if (shown[i] && !shown[i].authors.includes(id)) pickedBy[i].push(id);
      const order = shown.map((_, i) => i).filter((i) => pickedBy[i].length || shown[i].truth)
        .sort((a, b) => (shown[a].truth ? 1 : 0) - (shown[b].truth ? 1 : 0));
      for (const i of order) {
        const o = shown[i];
        const names = pickedBy[i].map((id) => ctx.player(id)?.name).filter(Boolean);
        let tag;
        if (o.truth) {
          for (const id of pickedBy[i]) add(id, 1000 * mult);
          tag = h('div.tt-tag.tt-true', 'THE TRUTH');
          ctx.sfx?.('win');
        } else {
          for (const a of o.authors) add(a, 500 * mult * pickedBy[i].length);
          tag = h('div.tt-tag.tt-lie', o.house ? 'A HOUSE LIE' : `A TALL TALE by ${o.authors.map((a) => ctx.player(a)?.name).join(', ')}`);
          ctx.sfx?.('lose');
        }
        ctx.el.replaceChildren(fact(h('span.tt-fill' + (o.truth ? '.tt-good' : ''), o.text)),
          h('p.tt-picked', names.length ? `Believed by ${names.join(', ')}` : 'Nobody believed it'), tag);
        await ctx.sleep(o.truth ? 4500 : 3500);
      }
    }
    await scoreboard(ctx, score, ri === QUESTIONS.length - 1 ? 'Final scores' : 'Scores', 6000);
  }

  const best = Math.max(...score.values());
  const winners = ctx.players.filter((p) => score.get(p.id) === best).map((p) => p.name);
  ctx.show('all', { title: 'Game over!', wait: `${winners.join(' & ')} won.` });
  await ctx.say(`🏆 ${winners.join(' & ')}`, 'the most trustworthy liar', 6000);
}

async function scoreboard(ctx, score, title, ms) {
  const { h } = ctx;
  const rows = ctx.players.map((p) => ({ p, s: score.get(p.id) || 0 })).sort((a, b) => b.s - a.s);
  const top = rows[0]?.s || 1;
  ctx.el.replaceChildren(h('h1', title), h('div.tt-scores', rows.map(({ p, s }) =>
    h('div.tt-srow', h('span.tt-sname', p.name),
      h('div.tt-sbar', h('div', { style: { width: `${Math.max(4, (s / top) * 100)}%`, background: p.color } })),
      h('span', s)))));
  await ctx.sleep(ms);
}

document.getElementById('tall-tales-css')?.remove();
document.head.append(Object.assign(document.createElement('style'), { id: 'tall-tales-css', textContent: `
  .tt-q { font-size: 2.3em; max-width: 1300px; font-family: Georgia, 'Times New Roman', serif; }
  .tt-blank { display: inline-block; min-width: 4em; border-bottom: 6px solid var(--accent); color: var(--accent); }
  .tt-fill { color: #ff5d73; border-bottom: 6px solid currentColor; animation: pop .35s ease-out; display: inline-block; }
  .tt-fill.tt-good { color: #5df08a; }
  .tt-dim { color: var(--dim); }
  .tt-opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; width: min(1300px, 100%); }
  .tt-opt { background: #f3e6c8; color: #3b2a10; border-radius: 10px; padding: 16px; font-weight: 900; font-size: 1.3em;
    box-shadow: 0 5px 0 #b59b62; animation: pop .3s ease-out; font-family: Georgia, 'Times New Roman', serif; }
  .tt-picked { font-size: 1.4em; color: var(--dim); }
  .tt-tag { font-weight: 900; font-size: 1.5em; padding: 10px 24px; border-radius: 14px; letter-spacing: .05em; }
  .tt-true { background: #5df08a; color: #10301a; }
  .tt-lie { background: #ff5d73; color: #3a0d15; }
  .tt-scores { width: min(1000px, 100%); display: flex; flex-direction: column; gap: 14px; }
  .tt-srow { display: grid; grid-template-columns: 8em 1fr 4em; gap: 16px; align-items: center; font-weight: 800; text-align: left; }
  .tt-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tt-sbar { height: 1.4em; background: var(--bg2); border-radius: 99px; overflow: hidden; }
  .tt-sbar div { height: 100%; border-radius: 99px; }
` }));
