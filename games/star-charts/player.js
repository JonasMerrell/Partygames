// Star Charts phone screen: the sky grid. Astronomers see the secret star map
// and give clues here; everyone else taps words to vote on what to chart.
// Any other view (rematch vote, waiting screens) uses the standard renderer.
import { art, TEAMS } from './shared.js';

export default function (ctx) {
  const { h } = ctx;
  let draft = { word: '', n: null };   // keep a half-typed clue across redraws

  ctx.on('view', (view) => {
    if (!view?.sc) return ctx.renderView(view);
    draw(view.sc);
  });

  function draw(s) {
    const mine = TEAMS[s.team];
    const nav = s.role === 'nav';
    const head = h('div.scp-head', { style: { '--tc': mine.color } },
      h('span.scp-emb', art(h, s.team)),
      h('div', h('b', mine.name), h('span', nav ? ' · 🔭 astronomer' : '')),
      h('div.scp-score',
        h('span.scp-s', { style: { color: TEAMS.sun.color } }, `☀ ${s.left.sun}`),
        h('span.scp-s', { style: { color: TEAMS.moon.color } }, `☾ ${s.left.moon}`)));

    let status;
    if (s.phase === 'over') {
      status = h('div.scp-status', { style: { '--tc': TEAMS[s.winner].color } },
        h('b', s.winner === s.team ? 'Your team wins! 🎉' : `${TEAMS[s.winner].name} wins`), h('span', s.reason));
    } else if (s.phase === 'clue') {
      status = h('div.scp-status', { style: { '--tc': TEAMS[s.turn].color } },
        s.giveClue ? h('b', 'Your turn: give a clue') : h('span', `🔭 ${s.navName} (${s.turnName}) is thinking of a clue…`));
    } else {
      status = h('div.scp-status', { style: { '--tc': TEAMS[s.turn].color } },
        h('b.scp-clue', `${s.clue.word} · ${s.clue.n === 99 ? '∞' : s.clue.n}`),
        h('span', s.canPick ? `Tap a word to vote. ${s.need} vote${s.need === 1 ? '' : 's'} charts it.`
          : s.turn === s.team ? 'Your team is guessing. Keep a straight face!' : `${s.turnName} is guessing.`));
    }

    const grid = h('div.scp-grid', s.words.map((w, i) => {
      const open = s.open[i];
      const hidden = s.key?.[i];
      const cls = 'button.scp-cell' + (open ? `.open.k-${open}` : hidden ? `.key.k-${hidden}` : '') +
        (s.myVote === i ? '.mine' : '');
      return h(cls, {
        disabled: !s.canPick || !!open,
        onclick: () => ctx.send({ pick: i }),
      }, h('span', w), s.votes[i].length ? h('i', s.votes[i].length) : null);
    }));

    const parts = [head, status, grid];
    if (nav && s.phase !== 'over') parts.push(h('p.scp-legend',
      h('span.k-sun', 'Sun'), h('span.k-moon', 'Moon'), h('span.k-dust', 'Dust'), h('span.k-hole', 'Black hole')));
    if (s.giveClue) parts.push(clueForm(s));
    if (s.canPick || (s.phase === 'guess' && s.turn === s.team && !nav)) {
      parts.push(h('button.ghost.scp-stop' + (s.myVote === 'stop' ? '.mine' : ''), {
        disabled: !s.canStop, onclick: () => ctx.send({ pick: 'stop' }),
      }, s.canStop ? `Stop guessing${s.stopVotes ? ` (${s.stopVotes}/${s.need})` : ''}` : 'Make at least one guess first'));
    }
    if (s.phase !== 'over' && s.giveClue === false && nav && s.phase === 'guess' && s.turn === s.team) {
      parts.push(h('p.scp-tip', 'No hints or faces! Your team is choosing.'));
    }
    ctx.el.replaceChildren(h('div.scp', { style: { '--tc': mine.color } }, parts));
  }

  function clueForm(s) {
    const field = h('input.scp-word', {
      placeholder: 'One-word clue', maxLength: 24, autocomplete: 'off', autocapitalize: 'characters',
      spellcheck: false, value: draft.word, enterKeyHint: 'done',
      oninput: (e) => { draft.word = e.target.value.replace(/\s/g, ''); e.target.value = draft.word; check(); },
    });
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 99];
    const btns = h('div.scp-nums', nums.map((n) => h('button.scp-num' + (draft.n === n ? '.on' : ''), {
      type: 'button',
      onclick: (e) => {
        draft.n = n;
        btns.querySelectorAll('.on').forEach((b) => b.classList.remove('on'));
        e.currentTarget.classList.add('on'); check();
      },
    }, n === 99 ? '∞' : String(n))));
    const send = h('button.big', { type: 'submit' }, 'Send clue');
    const check = () => (send.disabled = !draft.word || draft.n == null);
    check();
    
    return h('form.scp-form', {
      onsubmit: (e) => { e.preventDefault(); if (!send.disabled) ctx.send({ clue: { word: draft.word, n: draft.n } }); },
    }, s.err && h('p.err', s.err), field,
      h('p.scp-sub', 'How many words does it point to?'), btns, send);
  }

  // Forget the draft once the clue is accepted (phase moves on).
  ctx.on('view', (view) => { if (view?.sc && !view.sc.giveClue) draft = { word: '', n: null }; });
}

document.getElementById('star-charts-phone-css')?.remove();
const css = Object.assign(document.createElement('style'), { id: 'star-charts-phone-css' });
css.textContent = `
  .scp { display: flex; flex-direction: column; gap: 12px; }
  .scp-head { display: flex; align-items: center; gap: 10px; }
  .scp-head b { color: var(--tc); font-size: 1.15em; }
  .scp-head span { color: var(--dim); }
  .scp-emb { width: 38px; height: 38px; border-radius: 50%; padding: 4px; background: color-mix(in srgb, var(--tc) 70%, #000); flex: none; }
  .scp-emb svg { display: block; width: 100%; height: 100%; }
  .scp-score { margin-left: auto; display: flex; gap: 10px; font-weight: 900; }
  .scp-status { border: 2px solid var(--tc); background: color-mix(in srgb, var(--tc) 14%, var(--bg2)); border-radius: 14px;
    padding: 10px 14px; display: flex; flex-direction: column; gap: 2px; }
  .scp-status b { color: var(--tc); }
  .scp-status span { color: var(--dim); font-size: .9em; }
  .scp-clue { font-size: 1.5em; letter-spacing: .04em; }
  .scp-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .scp-cell { position: relative; aspect-ratio: 1; border-radius: 9px; border: 2px solid #4d4580; padding: 1px;
    background: linear-gradient(160deg, #3a3266, #221c40); font-weight: 800; font-size: clamp(10px, 3.6vw, 16px); letter-spacing: -.02em;
    display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; color: var(--fg); }
  .scp-cell span { overflow-wrap: anywhere; line-height: 1.05; }
  .scp-cell:disabled { cursor: default; }
  .scp-cell.mine { outline: 3px solid #fff; outline-offset: 1px; }
  .scp-cell i { position: absolute; top: 1px; right: 3px; font-style: normal; font-size: .9em; color: #fff;
    background: #000a; border-radius: 99px; padding: 0 4px; }
  .scp-cell.key.k-sun { border-color: #ffb547; background: linear-gradient(160deg, #6b4a1c, #3a2710); }
  .scp-cell.key.k-moon { border-color: #7fc8ff; background: linear-gradient(160deg, #1f4870, #10243d); }
  .scp-cell.key.k-dust { border-color: #6c6490; }
  .scp-cell.key.k-hole { border-color: #c77dff; background: radial-gradient(#000 40%, #3b1557); color: #f2d9ff; }
  .scp-cell.open { opacity: .55; }
  .scp-cell.open.k-sun { background: #d9891f; border-color: #ffd998; color: #2b1500; }
  .scp-cell.open.k-moon { background: #3a6fc7; border-color: #c2e6ff; color: #fff; }
  .scp-cell.open.k-dust { background: #3a3550; color: #a9a2c8; }
  .scp-cell.open.k-hole { background: #000; border-color: #c77dff; opacity: 1; }
  .scp-legend { display: flex; gap: 12px; justify-content: center; font-size: .8em; margin: 0; flex-wrap: wrap; }
  .scp-legend span::before { content: ''; display: inline-block; width: .8em; height: .8em; border-radius: 3px; margin-right: 4px; vertical-align: -1px; }
  .scp-legend .k-sun::before { background: #ffb547; } .scp-legend .k-moon::before { background: #7fc8ff; }
  .scp-legend .k-dust::before { background: #6c6490; } .scp-legend .k-hole::before { background: #000; border: 1px solid #c77dff; }
  .scp-form { display: flex; flex-direction: column; gap: 10px; }
  .scp-word { text-transform: uppercase; font-weight: 900; letter-spacing: .05em; text-align: center; font-size: 1.4em; }
  .scp-sub { margin: 0; color: var(--dim); font-size: .9em; text-align: center; }
  .scp-nums { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .scp-num { background: var(--card); border: 2px solid var(--line); border-radius: 10px; padding: 10px 0; font-weight: 900; font-size: 1.1em; cursor: pointer; }
  .scp-num.on { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 30%, var(--card)); }
  .scp-stop.mine { border-color: #fff; color: #fff; }
  .scp-tip { text-align: center; color: var(--dim); margin: 0; }
`;
document.head.append(css);
