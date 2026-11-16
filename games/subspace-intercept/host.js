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
    .sx-title { flex: 1; display: flex; justify-content: space-between; align-items: center; padding: .3em .9em;
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
    .sx-code { display: flex; gap: .3em; }
    .sx-cell { width: 1.9em; height: 2.2em; border: 2px solid #3b5374; background: #060b14; display: grid; place-items: center;
      font-size: 1.2em; font-weight: 900; color: #8aa2c2; transform: skewX(-8deg); }
    .sx-cell.on { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 22%, #060b14); color: #fff;
      animation: sxPop .45s cubic-bezier(.2, 1.4, .4, 1); }
    @keyframes sxPop { 0% { transform: skewX(-8deg) scale(.5); } 70% { transform: skewX(-8deg) scale(1.18); } 100% { transform: skewX(-8deg); } }

    .sx-stage { background: #081120e6; border: 2px solid var(--sx-line); padding: 1em 1.6em; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: .9em; position: relative; overflow: hidden; min-height: 0; }
    .sx-stage::before { content: ''; position: absolute; width: 26em; height: 26em; border-radius: 50%; border: 2px solid #3ee6c114;
      box-shadow: 0 0 0 4em #3ee6c10a, 0 0 0 8em #3ee6c107; pointer-events: none; }
    .sx-kicker { font-size: .9em; letter-spacing: .18em; text-transform: uppercase; color: var(--sx-teal); font-weight: 700; }
    .sx-big { font-size: 2.1em; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; text-align: center; }
    .sx-sub { font-size: 1.1em; color: var(--sx-ink); text-align: center; max-width: 44em; line-height: 1.35; }
    .jamtext { color: ${STATIC} !important; }

    .sx-clues { display: grid; grid-template-columns: repeat(3, minmax(10em, 1fr)); gap: 1em; width: 100%; max-width: 44em; }
    .sx-clue { background: #0f1c30; border: 2px solid #3b5374; border-left: .4em solid var(--sx-teal); padding: 1em .8em; text-align: center;
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
  const teams = [
    { id: 'alpha', name: 'Team Alpha', color: '#3ee6c1', members: players.slice(0, mid), code: codes[0],
      revealed: [false, false, false, false, false], senderIdx: 0, jamIdx: 0 },
    { id: 'beta', name: 'Team Beta', color: '#ffb347', members: players.slice(mid), code: codes[1],
      revealed: [false, false, false, false, false], senderIdx: 0, jamIdx: 0 },
  ];

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
          h('div', h('div.sx-tname', t.name), h('div.sx-roster', t.members.map((m) => m.name).join(' • '))),
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
    h('div.sx-sub', 'Send 3 one-word clues to your crew. The other crew rides the Static and jams one of them with a fake. Crack your 5-letter access code first to take the relay!'),
  ]);
  await ctx.sleep(4500);

  let winner = null;
  let winReason = '';

  while (!winner) {
    round += 1;
    const team = teams[activeTeamIdx];
    const opp = teams[1 - activeTeamIdx];

    const sender = team.members[team.senderIdx % team.members.length];
    team.senderIdx += 1;
    const guessers = team.members.filter((m) => m.id !== sender.id);
    const jammer = opp.members[opp.jamIdx % opp.members.length];
    opp.jamIdx += 1;

    const target = nextWord();

    // 1. Transmit
    jamAlert = false;
    statusText = 'Transmitting';
    footerText = `${team.name} • sender: ${sender.name}`;
    announce('transmit');
    renderScreen([
      h('div.sx-kicker', `${team.name} • encoded transmission`),
      h('div.sx-big', `${sender.name} is encoding`),
      h('div.sx-wave', h('span'), h('span'), h('span'), h('span'), h('span'), h('span'), h('span')),
      h('div.sx-sub', `Category: ${target.cat}. Sending 3 one-word clues to ${guessers.map((g) => g.name).join(' & ')}.`),
      clueCards(['•••', '•••', '•••'], ' hidden'),
    ]);

    ctx.show(guessers, {
      title: 'Stand by',
      text: `${sender.name} is encoding 3 clues for you (${target.cat}). ${jammer.name} is jamming for the other crew!`,
      wait: 'Waiting for the transmission…',
      color: team.color,
    });
    ctx.show(jammer, {
      title: 'You are the jammer',
      text: `${sender.name} is writing 3 clues. Get ready to swap one for a fake!`,
      wait: 'Listening to the channel…',
      color: STATIC,
    });
    const idleOpp = opp.members.filter((m) => m.id !== jammer.id);
    if (idleOpp.length) {
      ctx.show(idleOpp, { title: `${team.name}'s turn`, text: `${jammer.name} is jamming for your crew this round.`, wait: 'Listening to the channel…', color: opp.color });
    }

    const clueAns = await ctx.ask(sender, {
      title: `Secret word: ${target.word}`,
      text: `Category: ${target.cat}\nEnter 3 one-word clues separated by spaces:`,
      color: team.color,
      buzz: true,
      input: { placeholder: 'word1 word2 word3', max: 60, submit: 'Transmit' },
    }, {
      timeout: 65,
      after: { title: 'Transmitted', text: 'Routing through the Kestrel relay…', wait: 'Interference detected!' },
    });
    const clues = parseClues(clueAns.get(sender.id));

    // 2. Jam
    jamAlert = true;
    statusText = 'Jamming';
    footerText = `Jammer: ${jammer.name} • swapping a clue`;
    ctx.sfx('glitch');
    renderScreen([
      h('div.sx-noise'),
      h('div.sx-kicker.jamtext', 'Warning // interference on the line'),
      h('div.sx-big.jamtext', `${jammer.name} is jamming a clue`),
      h('div.sx-sub', 'The Static is swapping one clue for a fake.'),
      clueCards(['Scanning', 'Scanning', 'Scanning'], ' scan'),
    ]);
    ctx.show(sender, { title: 'Interference!', text: `${jammer.name} is jamming one of your clues…`, wait: 'Hold on…', color: STATIC });

    const pickAns = await ctx.ask(jammer, {
      title: 'Jam a clue',
      text: `Category: ${target.cat}\nPick ONE clue to swap out:`,
      color: STATIC,
      buzz: true,
      choices: clues.map((c, i) => ({ label: `${i + 1}. ${c}`, value: i })),
    }, { timeout: 35 });
    const chosenIdx = Number.isInteger(pickAns.get(jammer.id)) ? pickAns.get(jammer.id) : 0;
    const originalWord = clues[chosenIdx];

    const replaceAns = await ctx.ask(jammer, {
      title: 'Write the fake',
      text: `Replacing "${originalWord}". Enter 1 misleading word:`,
      color: STATIC,
      input: { placeholder: 'Misleading word…', max: 24, submit: 'Jam it' },
    }, {
      timeout: 35,
      after: { title: 'Jammed', text: 'Your fake is on the channel.', wait: 'Watch the main screen!' },
    });
    const fakeWord = (replaceAns.get(jammer.id) || 'STATIC').trim().split(/\s+/)[0] || 'STATIC';
    const finalClues = [...clues];
    finalClues[chosenIdx] = fakeWord;

    ctx.sfx('glitch');
    announce('jam');
    renderScreen([
      h('div.sx-noise'),
      h('div.sx-cloud', '⚡'),
      h('div.sx-kicker.jamtext', 'The Static got in'),
      h('div.sx-big.jamtext', 'Clue jammed'),
      h('div.sx-sub', 'One of the three clues is now a fake.'),
    ]);
    await ctx.sleep(3200);

    // 3. Decode, out loud
    jamAlert = false;
    statusText = 'Decode';
    footerText = `${team.name} • say your guess out loud`;
    announce('decode');
    renderScreen([
      h('div.sx-kicker', `Category: ${target.cat}`),
      h('div.sx-big', `${guessers.map((g) => g.name).join(' & ')}: decode the word`),
      h('div.sx-sub', 'Say your guess out loud! One of these three clues is a fake.'),
      clueCards(finalClues),
    ]);
    ctx.show(guessers, {
      title: `Category: ${target.cat}`,
      text: `Clues: ${finalClues.join('  •  ')}\n\nSay your guess out loud to ${sender.name}!`,
      color: team.color,
      buzz: true,
    });
    ctx.show(jammer, { title: 'Fake on the line', text: `You swapped "${originalWord}" for "${fakeWord}".`, wait: `Waiting for ${team.name}'s guess…`, color: STATIC });

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
        h('div.sx-sub', `${team.name} may reveal 1 code letter, or risk it all and guess the whole 5-letter code!`),
        revealedCards,
      ]);

      const choiceAns = await ctx.ask(sender, {
        title: `Access code: ${formatCode(team)}`,
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
          winner = team;
          winReason = `${team.name} cracked the full access code "${team.code}"!`;
        } else {
          ctx.sfx('buzz');
          renderScreen([
            h('div.sx-kicker.jamtext', 'Code rejected'),
            h('div.sx-big.jamtext', `Wrong code: "${attempt || '---'}"`),
            h('div.sx-sub', 'No letter this turn. The channel passes to the other crew.'),
          ]);
          await ctx.sleep(3200);
        }
      } else {
        revealNextLetter(team);
        ctx.sfx('pop');
        if (isCodeCracked(team)) {
          winner = team;
          winReason = `${team.name} decoded all 5 letters of "${team.code}"!`;
        } else {
          renderScreen([
            h('div.sx-kicker', 'Code letter decoded'),
            h('div.sx-big', `${team.name}: ${formatCode(team)}`),
            h('div.sx-sub', 'One step closer to taking the relay.'),
          ]);
          await ctx.sleep(2600);
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
      await ctx.sleep(3600);
      if (isCodeCracked(opp)) {
        winner = opp;
        winReason = `${opp.name} completed their access code "${opp.code}" thanks to the Static!`;
      }
    }

    activeTeamIdx = 1 - activeTeamIdx;
  }

  // Victory
  jamAlert = false;
  statusText = 'Code accepted';
  footerText = `${winner.name} holds the relay`;
  ctx.sfx('win');
  announce('win');
  renderScreen([
    h('div.sx-kicker', 'Access code accepted'),
    h('div.sx-big', { style: { color: winner.color, fontSize: '2.6em' } }, `${winner.name} wins!`),
    h('div.sx-sub', winReason),
  ]);
  ctx.show(winner.members, { title: 'Victory!', text: winReason, color: winner.color, buzz: true });
  ctx.show(teams.find((t) => t.id !== winner.id).members, { title: `${winner.name} cracked the code`, text: winReason, color: '#9fb4cc' });
  await ctx.sleep(8000);
}
