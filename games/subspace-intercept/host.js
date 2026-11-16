import { OVERRIDE_CODES, TRANSMISSIONS } from './words.js';

// Relay Station Kestrel: two crews share one deep-space relay, and a living
// cloud of interference called the Static lets the other crew jam a clue.

// Announcer lines, spoken with the browser's voice (no audio files).
const LINES = {
  start: [
    'Relay Station Kestrel online. Two crews, one channel. Keep your messages clean.',
    'Kestrel relay is live. Watch out. The Static is listening.',
  ],
  transmit: ['Sender, you have the channel.', 'Encoding. Three words, no more.', 'Channel open. Make every word count.'],
  jam: ['Interference on the line.', 'The Static got in. One clue is fake.', 'Jammed. Trust carefully.'],
  decode: ['Decode it. Say your guess out loud.', 'Three clues. One is a lie. What is the word?'],
  correct: ['Signal confirmed.', 'Clean copy. Well decoded.', 'That is the word.'],
  wrong: ['Signal lost.', 'Static wins that one.', 'Garbled. The other crew gains ground.'],
  attempt: ['Going for the full code. Bold.'],
  win: ['Access code accepted. The relay is yours.'],
};

const STATIC = '#ff4fd8';

function injectStyles() {
  document.getElementById('sx-host-css')?.remove();
  const s = document.createElement('style');
  s.id = 'sx-host-css';
  s.textContent = `
    .sx-root {
      --sx-ink: #e8f4ff; --sx-dim: #9fb4cc; --sx-line: #2a3d57; --sx-panel: #0d1726; --sx-teal: #3ee6c1; --sx-amber: #ffb347;
      width: 100%; height: 100%; box-sizing: border-box; position: relative; overflow: hidden;
      display: grid; grid-template-rows: auto auto 1fr auto; gap: .6em; padding: .9em 1.2em;
      color: var(--sx-ink); font-family: 'Share Tech Mono', ui-monospace, 'SF Mono', Menlo, monospace;
      background:
        repeating-linear-gradient(0deg, transparent 0 2.9em, #ffffff06 2.9em 3em),
        repeating-linear-gradient(90deg, transparent 0 2.9em, #ffffff06 2.9em 3em),
        radial-gradient(60em 30em at 50% 40%, #13263f, #070c15 70%);
      border-radius: .6em;
    }
    .sx-root.jam { box-shadow: inset 0 0 70px ${STATIC}55; }
    .sx-cut { clip-path: polygon(.8em 0, 100% 0, 100% calc(100% - .8em), calc(100% - .8em) 100%, 0 100%, 0 .8em); }

    .sx-top { display: flex; align-items: center; gap: .8em; }
    .sx-badge { display: flex; align-items: center; gap: .45em; padding: .3em .8em; background: var(--sx-teal); color: #04221b;
      font-weight: 900; letter-spacing: .12em; text-transform: uppercase; font-size: .9em; }
    .sx-title { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; gap: 1em; display: flex; justify-content: space-between; align-items: center; padding: .3em .9em;
      border: 2px solid var(--sx-line); background: var(--sx-panel); letter-spacing: .14em; text-transform: uppercase; font-size: .9em; color: var(--sx-dim); }
    .sx-title b { color: var(--sx-ink); }
    .sx-status { padding: .3em .9em; border: 2px solid var(--sx-teal); color: var(--sx-teal); font-weight: 900; letter-spacing: .12em;
      text-transform: uppercase; font-size: .9em; transition: all .3s; }
    .sx-status.jam { border-color: ${STATIC}; color: #1a0217; background: ${STATIC}; animation: sxPulse .7s infinite alternate; }
    @keyframes sxPulse { from { box-shadow: 0 0 6px ${STATIC}; } to { box-shadow: 0 0 26px ${STATIC}; } }

    .sx-teams { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; }
    .sx-team { --tc: var(--sx-teal); background: var(--sx-panel); border: 2px solid color-mix(in srgb, var(--tc) 55%, var(--sx-line));
      border-top: .35em solid var(--tc); padding: .55em 1em; display: flex; align-items: center; justify-content: space-between; gap: .8em;
      transition: transform .25s, box-shadow .25s; }
    .sx-team.beta { --tc: var(--sx-amber); }
    .sx-team.active { box-shadow: 0 0 24px color-mix(in srgb, var(--tc) 40%, transparent); transform: translateY(-2px); }
    .sx-tname { font-size: 1.15em; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; color: var(--tc); }
    .sx-roster { font-size: .8em; color: var(--sx-dim); }
    .sx-tname { display: flex; align-items: center; gap: .6em; white-space: nowrap; }
    .sx-pips { display: inline-flex; gap: .25em; }
    .sx-pip { width: 1.3em; height: .6em; border: 2px solid #5a7394; background: #060b14; }
    .sx-pip.done { background: var(--tc); border-color: var(--tc); box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 70%, transparent); }
    .sx-code { display: flex; gap: .3em; }
    .sx-cell { width: 1.9em; height: 2.2em; border: 2px solid #3b5374; background: #060b14; display: grid; place-items: center;
      font-size: 1.2em; font-weight: 900; color: #8aa2c2; transform: skewX(-8deg); }
    .sx-cell.on { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 22%, #060b14); color: #fff;
      animation: sxPop .45s cubic-bezier(.2, 1.4, .4, 1); }
    @keyframes sxPop { 0% { transform: skewX(-8deg) scale(.5); } 70% { transform: skewX(-8deg) scale(1.18); } 100% { transform: skewX(-8deg); } }

    .sx-stage { background: #081120e6; border: 2px solid var(--sx-line); padding: .7em 1.6em; display: flex; flex-direction: column;
      align-items: center; justify-content: safe center; gap: .6em; position: relative; overflow: hidden; min-height: 0; }
    .sx-stage::before { content: ''; position: absolute; width: 26em; height: 26em; border-radius: 50%; border: 2px solid #3ee6c114;
      box-shadow: 0 0 0 4em #3ee6c10a, 0 0 0 8em #3ee6c107; pointer-events: none; }
    .sx-kicker { font-size: .9em; letter-spacing: .18em; text-transform: uppercase; color: var(--sx-teal); font-weight: 700; }
    .sx-big { font-size: 1.9em; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; text-align: center; }
    .sx-sub { font-size: 1.1em; color: var(--sx-ink); text-align: center; max-width: 44em; line-height: 1.35; }
    .jamtext { color: ${STATIC} !important; }

    .sx-clues { display: grid; grid-template-columns: repeat(3, minmax(10em, 1fr)); gap: 1em; width: 100%; max-width: 44em; }
    .sx-clue { background: #0f1c30; border: 2px solid #3b5374; border-left: .4em solid var(--sx-teal); padding: .65em .8em; text-align: center;
      animation: sxIn .4s ease-out both; }
    .sx-clue:nth-child(2) { animation-delay: .1s; } .sx-clue:nth-child(3) { animation-delay: .2s; }
    @keyframes sxIn { from { opacity: 0; transform: translateY(14px); } }
    .sx-clabel { font-size: .75em; letter-spacing: .16em; text-transform: uppercase; color: var(--sx-dim); margin-bottom: .3em; }
    .sx-cword { font-size: 1.7em; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; overflow-wrap: anywhere; }
    .sx-clue.hidden .sx-cword { color: var(--sx-amber); letter-spacing: .25em; }
    .sx-clue.scan { border-color: ${STATIC}; border-left-color: ${STATIC}; }
    .sx-clue.scan .sx-cword, .sx-clue.scan .sx-clabel { color: ${STATIC}; }
    .sx-clue.jammed { border-color: ${STATIC}; border-left-color: ${STATIC}; background: #2a0b27; box-shadow: 0 0 26px ${STATIC}55;
      animation: sxGlitch .5s ease-in-out; }
    .sx-clue.jammed .sx-cword { color: ${STATIC}; }
    .sx-orig { margin-top: .4em; font-size: .8em; color: var(--sx-dim); text-decoration: line-through; }
    .sx-tag { display: inline-block; margin-top: .35em; padding: .15em .6em; background: ${STATIC}; color: #1a0217; font-size: .75em;
      font-weight: 900; letter-spacing: .1em; }
    @keyframes sxGlitch { 20% { transform: translate(-4px, 2px) skewX(-4deg); } 40% { transform: translate(4px, -2px) skewX(4deg); }
      60% { transform: translate(-3px, 0); } 80% { transform: translate(3px, 1px); } }

    .sx-noise { position: absolute; inset: 0; pointer-events: none; opacity: .5;
      background: repeating-linear-gradient(0deg, ${STATIC}22 0 2px, transparent 2px 6px); animation: sxNoise .25s steps(3) infinite; }
    @keyframes sxNoise { to { background-position: 0 6px; } }
    .sx-wave { display: flex; align-items: center; gap: .3em; height: 2.2em; }
    .sx-wave span { width: .3em; height: .6em; background: var(--sx-teal); animation: sxBar .9s ease-in-out infinite; }
    .sx-wave span:nth-child(even) { background: var(--sx-amber); }
    .sx-wave span:nth-child(2) { animation-delay: .12s; } .sx-wave span:nth-child(3) { animation-delay: .24s; }
    .sx-wave span:nth-child(4) { animation-delay: .36s; } .sx-wave span:nth-child(5) { animation-delay: .48s; }
    .sx-wave span:nth-child(6) { animation-delay: .6s; } .sx-wave span:nth-child(7) { animation-delay: .72s; }
    @keyframes sxBar { 0%, 100% { height: .5em; opacity: .5; } 50% { height: 2.1em; opacity: 1; } }
    .sx-cloud { font-size: 3.2em; filter: drop-shadow(0 0 18px ${STATIC}); animation: sxShake .18s linear infinite; }
    @keyframes sxShake { 25% { transform: translate(-2px, 1px); } 75% { transform: translate(2px, -1px); } }

    .sx-foot { display: flex; align-items: center; gap: .8em; padding: .3em .9em; border: 2px solid var(--sx-line); background: var(--sx-panel);
      font-size: .85em; letter-spacing: .1em; text-transform: uppercase; color: var(--sx-ink); }
    .sx-foot .dots { margin-left: auto; display: flex; gap: .35em; }
    .sx-foot .dots span { width: .7em; height: .7em; background: var(--sx-teal); animation: sxBlink 1.6s infinite; }
    .sx-foot .dots span:nth-child(2) { animation-delay: .35s; } .sx-foot .dots span:nth-child(3) { animation-delay: .7s; }
    @keyframes sxBlink { 50% { opacity: .2; } }
  `;
  document.head.appendChild(s);
}

function parseClues(raw) {
  const parts = String(raw || '').split(/[\s,;/]+/).map((w) => w.trim()).filter(Boolean);
  const out = parts.slice(0, 3);
  while (out.length < 3) out.push('REDACTED');
  return out;
}

export default async function (ctx) {
  injectStyles();
  const h = ctx.h;

  // The announcer uses the browser's speech voice and stays quiet when the TV is muted.
  const muted = () => { try { return localStorage.getItem('partyhall.muted') === '1'; } catch { return false; } };
  const lastLine = new Map();
  function announce(group) {
    const list = LINES[group];
    if (!list || muted() || !('speechSynthesis' in window)) return;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && lastLine.get(group) === i) i = (i + 1) % list.length;
    lastLine.set(group, i);
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(list[i]);
      u.rate = 1.05; u.pitch = 0.8;
      speechSynthesis.speak(u);
    } catch {}
  }

  const players = ctx.shuffle([...ctx.players]);
  const mid = Math.ceil(players.length / 2);
  const codes = ctx.shuffle([...OVERRIDE_CODES]);
  let codeIdx = 0;
  const nextCode = () => { if (codeIdx >= codes.length) codeIdx = 0; return codes[codeIdx++]; };
  const CODES_TO_WIN = 3;
  const teams = [
    { id: 'alpha', name: 'Team Alpha', color: '#3ee6c1', members: players.slice(0, mid), code: nextCode(),
      revealed: [false, false, false, false, false], codesCracked: 0 },
    { id: 'beta', name: 'Team Beta', color: '#ffb347', members: players.slice(mid), code: nextCode(),
      revealed: [false, false, false, false, false], codesCracked: 0 },
  ];
  const teamOf = (p) => teams.find((t) => t.members.some((m) => m.id === p.id));

  const deck = ctx.shuffle([...TRANSMISSIONS]);
  let deckIdx = 0;
  const nextWord = () => { if (deckIdx >= deck.length) deckIdx = 0; return deck[deckIdx++]; };

  function revealNextLetter(team) {
    const locked = team.revealed.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0);
    if (!locked.length) return -1;
    const pick = locked[Math.floor(Math.random() * locked.length)];
    team.revealed[pick] = true;
    return pick;
  }
  const isCodeCracked = (team) => team.revealed.every(Boolean);
  const formatCode = (team) => team.code.split('').map((ch, i) => (team.revealed[i] ? ch : '_')).join(' ');

  let round = 0;
  let activeTeamIdx = 0;
  let jamAlert = false;
  let statusText = 'Relay online';
  let footerText = 'Kestrel relay • all channels clear';

  function renderScreen(stageChildren) {
    ctx.el.replaceChildren(h('div', { class: `sx-root${jamAlert ? ' jam' : ''}` },
      h('div.sx-top',
        h('div.sx-badge.sx-cut', '📡 Kestrel'),
        h('div.sx-title.sx-cut', h('span', h('b', 'Subspace Intercept'), ' // relay station Kestrel'), h('span', `Cycle ${round || 1}`)),
        h('div', { class: `sx-status sx-cut${jamAlert ? ' jam' : ''}` }, statusText)),
      h('div.sx-teams', teams.map((t, idx) =>
        h('div', { class: `sx-team sx-cut ${t.id}${idx === activeTeamIdx ? ' active' : ''}` },
          h('div', h('div.sx-tname', t.name,
              h('span.sx-pips', { title: `${t.codesCracked}/${CODES_TO_WIN} codes` }, [0, 1, 2].map((i) => h('span', { class: `sx-pip${i < t.codesCracked ? ' done' : ''}` })))),
            h('div.sx-roster', t.members.map((m) => m.name).join(' • '))),
          h('div.sx-code', t.code.split('').map((ch, ci) => h('div', { class: `sx-cell${t.revealed[ci] ? ' on' : ''}` }, t.revealed[ci] ? ch : '?')))))),
      h('div.sx-stage.sx-cut', ...stageChildren),
      h('div.sx-foot.sx-cut', h('span', footerText), h('div.dots', h('span'), h('span'), h('span')))));
  }

  const clueCards = (words, cls = '', style = {}) => h('div.sx-clues', words.map((w, i) =>
    h('div', { class: `sx-clue${cls}`, style }, h('div.sx-clabel', `Clue 0${i + 1}`), h('div.sx-cword', w))));

  // Intro
  ctx.sfx('start');
  announce('start');
  renderScreen([
    h('div.sx-kicker', 'Incoming briefing'),
    h('div.sx-big', 'Subspace Intercept'),
    h('div.sx-sub', 'Everyone writes 3 clues at once, then everyone jams one clue from the other crew. Decode your crew\'s words to crack 3 five-letter access codes and take the relay!'),
  ]);
  await ctx.sleep(4500);

  let winner = null;
  let winReason = '';

  // A finished code counts toward the 3 a team needs; otherwise load a fresh one.
  async function codeCracked(team, reason) {
    team.codesCracked += 1;
    if (team.codesCracked >= CODES_TO_WIN) {
      winner = team;
      winReason = reason;
      return;
    }
    const oldCode = team.code;
    team.code = nextCode();
    team.revealed = [false, false, false, false, false];
    ctx.sfx('win');
    renderScreen([
      h('div.sx-kicker', `Access code ${team.codesCracked} of ${CODES_TO_WIN} cracked`),
      h('div.sx-big', { style: { color: team.color } }, `${team.name}: "${oldCode}" decoded!`),
      h('div.sx-sub', `Loading the next 5-letter code (${CODES_TO_WIN - team.codesCracked} to go).`),
    ]);
    await ctx.sleep(3200);
  }

  while (!winner) {
    round += 1;

    // 1. Transmit: everyone writes 3 clues for their own secret word at once.
    jamAlert = false;
    statusText = 'Transmitting';
    footerText = `Cycle ${round} • every crew member is encoding`;
    announce('transmit');
    renderScreen([
      h('div.sx-kicker', `Cycle ${round} • everyone transmits`),
      h('div.sx-big', 'Everyone: write 3 clues'),
      h('div.sx-wave', h('span'), h('span'), h('span'), h('span'), h('span'), h('span'), h('span')),
      h('div.sx-sub', 'Check your phone! You each have a secret word. Enter 3 one-word clues for it.'),
      clueCards(['•••', '•••', '•••'], ' hidden'),
    ]);

    const targetByPlayer = new Map();
    const cluesByPlayer = new Map();
    await new Promise((resolve) => {
      let done = false;
      let unsub = null;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); unsub?.(); resolve(); };
      const timer = setTimeout(finish, 65000);
      unsub = ctx.on('message', (p, data) => {
        if (done || !p || !data || !Array.isArray(data.clues) || !targetByPlayer.has(p.id)) return;
        cluesByPlayer.set(p.id, parseClues(data.clues.join(' ')));
        if (cluesByPlayer.size >= players.length) finish();
      });
      players.forEach((p) => {
        const target = nextWord();
        targetByPlayer.set(p.id, target);
        ctx.send(p, { mode: 'threeClues', word: target.word, cat: target.cat, color: teamOf(p).color });
      });
    });
    players.forEach((p) => { if (!cluesByPlayer.has(p.id)) cluesByPlayer.set(p.id, parseClues('')); });

    // 2. Jam: everyone swaps one clue of a player on the other crew, all at once.
    jamAlert = true;
    statusText = 'Jamming';
    footerText = `Cycle ${round} • everyone is jamming`;
    ctx.sfx('glitch');
    renderScreen([
      h('div.sx-noise'),
      h('div.sx-cloud', '⚡'),
      h('div.sx-kicker.jamtext', 'Warning // interference on every line'),
      h('div.sx-big.jamtext', 'Everyone: jam a clue'),
      h('div.sx-sub', 'Pick one clue from the other crew on your phone and swap it for a misleading word.'),
    ]);

    const victimOf = new Map();
    teams[0].members.forEach((p, i) => victimOf.set(p.id, teams[1].members[i % teams[1].members.length]));
    teams[1].members.forEach((p, i) => victimOf.set(p.id, teams[0].members[i % teams[0].members.length]));
    // With uneven crews someone can be jammed twice; the last fake to arrive wins.
    const jamBySender = new Map();
    await Promise.all(players.map(async (jammer) => {
      const victim = victimOf.get(jammer.id);
      const vTarget = targetByPlayer.get(victim.id);
      const vClues = cluesByPlayer.get(victim.id);
      const pickAns = await ctx.ask(jammer, {
        title: `Jam ${victim.name}'s clues`,
        text: `Category: ${vTarget.cat}\nPick ONE clue to swap out:`,
        color: STATIC,
        buzz: true,
        choices: vClues.map((c, i) => ({ label: `${i + 1}. ${c}`, value: i })),
      }, { timeout: 35 });
      const chosenIdx = Number.isInteger(pickAns.get(jammer.id)) ? pickAns.get(jammer.id) : 0;
      const originalWord = vClues[chosenIdx];
      const replaceAns = await ctx.ask(jammer, {
        title: 'Write the fake',
        text: `Replacing "${originalWord}". Enter 1 misleading word:`,
        color: STATIC,
        input: { placeholder: 'Misleading word…', max: 24, submit: 'Jam it' },
      }, {
        timeout: 35,
        after: { title: 'Jammed', text: 'Your fake is on the channel.', wait: 'Waiting for the other jammers…' },
      });
      const fakeWord = (replaceAns.get(jammer.id) || 'STATIC').trim().split(/\s+/)[0] || 'STATIC';
      const finalClues = [...vClues];
      finalClues[chosenIdx] = fakeWord;
      jamBySender.set(victim.id, { jammer, chosenIdx, originalWord, fakeWord, finalClues });
    }));

    ctx.sfx('glitch');
    announce('jam');
    renderScreen([
      h('div.sx-noise'),
      h('div.sx-cloud', '⚡'),
      h('div.sx-kicker.jamtext', 'The Static got in'),
      h('div.sx-big.jamtext', 'Every transmission jammed'),
      h('div.sx-sub', 'Each set of clues now hides one fake. Time to decode!'),
    ]);
    await ctx.sleep(3000);

    // 3. Decode: crews take turns, one sender at a time, guessing out loud.
    const queue = [];
    const longest = Math.max(teams[0].members.length, teams[1].members.length);
    for (let i = 0; i < longest; i++) {
      if (i < teams[0].members.length) queue.push({ team: teams[0], opp: teams[1], sender: teams[0].members[i] });
      if (i < teams[1].members.length) queue.push({ team: teams[1], opp: teams[0], sender: teams[1].members[i] });
    }

    for (const { team, opp, sender } of queue) {
      if (winner) break;
      activeTeamIdx = teams.indexOf(team);
      const guessers = team.members.filter((m) => m.id !== sender.id);
      const target = targetByPlayer.get(sender.id);
      const { jammer, chosenIdx, originalWord, fakeWord, finalClues } = jamBySender.get(sender.id);

      jamAlert = false;
      statusText = 'Decode';
      footerText = `${team.name} • ${sender.name} → ${guessers.map((g) => g.name).join(' & ')}`;
      announce('decode');
      renderScreen([
        h('div.sx-kicker', `${team.name} • category: ${target.cat}`),
        h('div.sx-big', `${guessers.map((g) => g.name).join(' & ')}: decode ${sender.name}'s word`),
        h('div.sx-sub', 'Say your guess out loud! One of these three clues is a fake.'),
        clueCards(finalClues),
      ]);
      ctx.show(guessers, {
        title: `Category: ${target.cat}`,
        text: `Clues: ${finalClues.join('  •  ')}\n\nSay your guess out loud to ${sender.name}!`,
        color: team.color,
        buzz: true,
      });
      ctx.show(opp.members, {
        title: `${team.name} is decoding`,
        text: jammer && opp.members.some((m) => m.id === jammer.id)
          ? `${jammer.name} swapped "${originalWord}" for "${fakeWord}". Listen to their guess!`
          : 'Listen to their guess!',
        wait: `Waiting for ${team.name}'s guess…`,
        color: opp.color,
      });

      const judgeAns = await ctx.ask(sender, {
        title: `Answer: ${target.word}`,
        text: `Clues shown: ${finalClues.join(' • ')}\nDid your crew say "${target.word}" out loud?`,
        color: team.color,
        choices: [
          { label: '✓ Got it (correct)', value: 'hit' },
          { label: '✕ Signal lost (wrong)', value: 'miss' },
        ],
      }, { timeout: 90, clock: false });
      const isHit = judgeAns.get(sender.id) === 'hit';

      const revealedCards = h('div.sx-clues', finalClues.map((c, i) =>
        h('div', { class: `sx-clue${i === chosenIdx ? ' jammed' : ''}` },
          h('div.sx-clabel', `Clue 0${i + 1}`),
          h('div.sx-cword', c),
          ...(i === chosenIdx ? [h('div.sx-orig', `Original: ${originalWord}`), h('div.sx-tag', 'FAKE')] : []))));

      if (isHit) {
        ctx.sfx('ding');
        announce('correct');
        statusText = 'Confirmed';
        renderScreen([
          h('div.sx-kicker', `Word decoded: ${target.word}`),
          h('div.sx-big', 'Transmission confirmed!'),
          h('div.sx-sub', `${team.name} may reveal 1 code letter, or risk it and guess the whole 5-letter code!`),
          revealedCards,
        ]);

        const choiceAns = await ctx.ask(sender, {
          title: `Code ${team.codesCracked + 1}/${CODES_TO_WIN}: ${formatCode(team)}`,
          text: 'Reveal 1 letter, or skip it and try the whole 5-letter code?',
          color: team.color,
          choices: [
            { label: '🔓 Reveal 1 letter', value: 'letter' },
            { label: '⚡ Try the full code', value: 'full' },
          ],
        }, { timeout: 45 });
        const choice = choiceAns.get(sender.id) || 'letter';

        if (choice === 'full') {
          announce('attempt');
          const fullAns = await ctx.ask(sender, {
            title: `Full code (${formatCode(team)})`,
            text: 'Enter the exact 5-letter access code:',
            color: team.color,
            input: { placeholder: '5-LETTER CODE', max: 12, submit: 'Send code' },
          }, { timeout: 45 });
          const attempt = (fullAns.get(sender.id) || '').trim().toUpperCase();
          if (attempt === team.code) {
            team.revealed = [true, true, true, true, true];
            await codeCracked(team, `${team.name} cracked all ${CODES_TO_WIN} access codes, finishing with "${team.code}"!`);
          } else {
            ctx.sfx('buzz');
            renderScreen([
              h('div.sx-kicker.jamtext', 'Code rejected'),
              h('div.sx-big.jamtext', `Wrong code: "${attempt || '---'}"`),
              h('div.sx-sub', 'No letter this turn.'),
            ]);
            await ctx.sleep(2800);
          }
        } else {
          revealNextLetter(team);
          ctx.sfx('pop');
          if (isCodeCracked(team)) {
            await codeCracked(team, `${team.name} decoded all ${CODES_TO_WIN} access codes!`);
          } else {
            renderScreen([
              h('div.sx-kicker', `Code ${team.codesCracked + 1}/${CODES_TO_WIN} • letter decoded`),
              h('div.sx-big', `${team.name}: ${formatCode(team)}`),
              h('div.sx-sub', 'One step closer to taking the relay.'),
            ]);
            await ctx.sleep(2400);
          }
        }
      } else {
        ctx.sfx('buzz');
        jamAlert = true;
        statusText = 'Signal lost';
        announce('wrong');
        revealNextLetter(opp);
        renderScreen([
          h('div.sx-noise'),
          h('div.sx-kicker.jamtext', `The word was: ${target.word}`),
          h('div.sx-big.jamtext', 'Signal lost'),
          h('div.sx-sub', `${opp.name} decodes 1 letter of their code!`),
          revealedCards,
        ]);
        await ctx.sleep(3200);
        if (isCodeCracked(opp)) {
          await codeCracked(opp, `${opp.name} completed all ${CODES_TO_WIN} access codes thanks to the Static!`);
        }
      }
    }
  }

  // Victory
  jamAlert = false;
  statusText = 'Code accepted';
  footerText = `${winner.name} holds the relay`;
  ctx.sfx('win');
  announce('win');
  renderScreen([
    h('div.sx-kicker', 'Access codes accepted'),
    h('div.sx-big', { style: { color: winner.color, fontSize: '2.6em' } }, `${winner.name} wins!`),
    h('div.sx-sub', winReason),
  ]);
  ctx.show(winner.members, { title: 'Victory!', text: winReason, color: winner.color, buzz: true });
  ctx.show(teams.find((t) => t.id !== winner.id).members, { title: `${winner.name} cracked the codes`, text: winReason, color: '#9fb4cc' });
  await ctx.sleep(8000);
}
