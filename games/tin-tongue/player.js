// Tin Tongue: 1950s Handheld Tin Robot Diagnostic Panel Phone Controller.
// Drives clue-giver (Solari card + Got/Skip), opposing team (Solari card + spring-loaded BZZT buzzer),
// and teammate radio guess view.
import { robot, injectCss, BOT_CSS } from './art.js';

export default function (ctx) {
  const { h } = ctx;
  injectCss('tin-tongue-phone', BOT_CSS + CSS);
  let tick = null;

  ctx.on('view', (v) => {
    clearInterval(tick);
    if (!v || !v.tt) return ctx.renderView(v);
    if (v.color) document.body.style.setProperty('--accent', v.color);
    const endAt = Date.now() + (v.left || 0) * 1000;
    const clock = h('div.ttp-clock');
    const upd = () => {
      const s = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      clock.textContent = `${s}s`;
      clock.classList.toggle('ttp-urgent', s <= 10);
    };
    upd();
    tick = setInterval(upd, 250);
    const bot = (mood) => { const d = h('div.ttp-bot'); d.innerHTML = robot(v.color, mood); return d; };
    const send = (tt, btns) => {
      btns.forEach((b) => (b.disabled = true));
      ctx.send({ tt, card: v.card });
      // The host answers with a new card; re-enable in case the tap was ignored.
      setTimeout(() => btns.forEach((b) => (b.disabled = false)), 1200);
    };

    if (v.tt === 'give') {
      const got = h('button.ttp-btn.ttp-got', { onclick: () => send('got', [got, skip]) }, '✅ Got it!');
      const skip = h('button.ttp-btn.ttp-skip', { onclick: () => send('skip', [got, skip]) }, '↷ Skip');
      ctx.el.replaceChildren(h('div.ttp',
        v.flash && h('div.ttp-flash', v.flash.late ? `BZZT on your last card from ${v.flash.by}. −1` : `BZZT! ${v.flash.by} caught a slip. −1`),
        h('div.ttp-row', h('span.ttp-label', 'DIAGNOSTIC TARGET'), clock),
        h('div.ttp-card', { key: v.card },
          h('div.ttp-solari-flap.ttp-solari-top', h('span', v.word)),
          h('div.ttp-solari-hinge'),
          h('div.ttp-solari-flap.ttp-solari-bottom', h('span', v.word)),
          h('div.ttp-pts', '●'.repeat(v.points) + `  ${v.points} point${v.points > 1 ? 's' : ''}`)),
        h('p.ttp-hint', 'One-syllable words only. No part of the word.'),
        got, skip));
    } else if (v.tt === 'watch') {
      const zap = h('button.ttp-btn.ttp-glitch', {
        onclick: (e) => {
          zap.classList.add('recoil');
          setTimeout(() => zap.classList.remove('recoil'), 500);
          send('glitch', [zap]);
        },
      },
      h('div.ttp-spring-coil'),
      h('span.ttp-buzzer-cap', '⚡ BZZT!'));
      ctx.el.replaceChildren(h('div.ttp',
        h('div.ttp-row', h('span.ttp-label', `${v.giver}'S TRANSMISSION`), clock),
        h('div.ttp-card.ttp-watch',
          h('div.ttp-solari-flap.ttp-solari-top', h('span', v.word)),
          h('div.ttp-solari-hinge'),
          h('div.ttp-solari-flap.ttp-solari-bottom', h('span', v.word))),
        h('p.ttp-hint', 'Two syllables, or any part of the word? Hit it!'),
        zap));
    } else {
      ctx.el.replaceChildren(h('div.ttp.ttp-guess',
        h('div.ttp-row', h('span.ttp-label', 'RADIO RECEIVER'), clock),
        bot('talk'),
        h('h2', 'Guess out loud!'),
        h('p.ttp-hint', `${v.giver} is giving clues.`)));
    }
  });
}

const CSS = `
  /* 1950s Handheld Tin Robot Diagnostic Panel */
  .ttp {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: #09233b;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 16px 16px;
    border: 4px solid #1a4f78;
    border-radius: 16px;
    padding: 16px;
    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.8), 0 8px 24px rgba(0, 0, 0, 0.6);
    font-family: 'Share Tech Mono', 'Oswald', monospace;
  }

  .ttp-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px dashed rgba(100, 200, 255, 0.3);
    padding-bottom: 6px;
  }
  .ttp-label {
    color: #64b5f6;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.85em;
  }
  .ttp-clock {
    font-weight: 900;
    font-size: 1.4em;
    color: #faf5eb;
    font-variant-numeric: tabular-nums;
  }
  .ttp-clock.ttp-urgent {
    color: #ff3344;
    text-shadow: 0 0 10px #ff3344;
  }

  /* Solari Split-Flap Phone Card Display */
  .ttp-card {
    background: #121820;
    border: 3.5px solid #d4af37;
    border-radius: 12px;
    padding: 18px 12px;
    text-align: center;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.2);
    position: relative;
    animation: tt-solari-drop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1) backwards;
  }
  .ttp-solari-flap {
    background: #0b1118;
    color: #faf5eb;
    padding: 6px 10px;
    font-size: clamp(2em, 11vw, 2.9em);
    font-weight: 900;
    text-transform: uppercase;
    overflow-wrap: anywhere;
    line-height: 1.05;
    letter-spacing: 0.05em;
  }
  .ttp-solari-top {
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    border-bottom: 1.5px solid #000;
  }
  .ttp-solari-bottom {
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    border-top: 1.5px solid rgba(255, 255, 255, 0.15);
  }
  .ttp-solari-hinge {
    height: 3px;
    background: #000;
    position: relative;
  }
  .ttp-solari-hinge::before, .ttp-solari-hinge::after {
    content: '';
    position: absolute;
    top: -2px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #d4af37;
  }
  .ttp-solari-hinge::before { left: 4px; }
  .ttp-solari-hinge::after { right: 4px; }

  .ttp-pts {
    margin-top: 12px;
    font-weight: 800;
    color: #ffe14d;
    font-size: 1.1em;
    letter-spacing: 0.06em;
  }
  .ttp-hint {
    color: #90caf9;
    text-align: center;
    margin: 0;
    font-size: 0.95em;
  }

  .ttp-btn {
    border: 0;
    border-radius: 14px;
    padding: 20px;
    font-size: 1.5em;
    font-weight: 900;
    cursor: pointer;
    font-family: 'Share Tech Mono', 'Oswald', sans-serif;
    text-transform: uppercase;
    transition: transform 0.06s, box-shadow 0.06s;
  }
  .ttp-btn:disabled {
    filter: grayscale(0.7) brightness(0.6);
  }

  /* Green Bakelite Industrial Button */
  .ttp-got {
    background: radial-gradient(circle at 40% 30%, #5df08a, #2e7d32 70%, #1b5e20 100%);
    border: 3.5px solid #144917;
    color: #faf5eb;
    box-shadow: 0 8px 0 #0e3010, 0 12px 18px rgba(0, 0, 0, 0.6);
    padding: 26px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
  }
  .ttp-got:active {
    transform: translateY(6px);
    box-shadow: 0 2px 0 #0e3010, 0 4px 10px rgba(0, 0, 0, 0.6);
  }

  /* Stamped Sheet Metal Toggle */
  .ttp-skip {
    background: linear-gradient(135deg, #8a9ba8 0%, #cbd6e0 50%, #788a97 100%);
    color: #121e29;
    border: 3px solid #374857;
    box-shadow: 0 6px 0 #202d38, 0 8px 14px rgba(0, 0, 0, 0.5);
  }
  .ttp-skip:active {
    transform: translateY(4px);
    box-shadow: 0 2px 0 #202d38, 0 4px 8px rgba(0, 0, 0, 0.5);
  }

  /* Giant Spring-Loaded Mechanical Buzzer */
  .ttp-glitch {
    background: radial-gradient(circle at 40% 35%, #ff5252, #d32f2f 65%, #8b0000 100%);
    border: 4px solid #5a0000;
    border-radius: 28px;
    color: #fff;
    font-size: 2.2em;
    font-weight: 900;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
    box-shadow:
      0 12px 0 #500808,
      0 18px 24px rgba(0, 0, 0, 0.7);
    position: relative;
    cursor: pointer;
    padding: 44px 20px;
    overflow: hidden;
  }
  .ttp-glitch:active {
    transform: translateY(10px);
    box-shadow:
      0 2px 0 #500808,
      0 6px 12px rgba(0, 0, 0, 0.7);
  }
  .ttp-glitch.recoil {
    animation: tt-spring-recoil 0.45s ease-out;
  }

  /* Coiled Mechanical Spring under Buzzer */
  .ttp-spring-coil {
    position: absolute;
    bottom: 4px;
    left: 20%;
    right: 20%;
    height: 10px;
    background-image: repeating-linear-gradient(
      90deg,
      #1a2632,
      #1a2632 8px,
      #8a9ba8 8px,
      #8a9ba8 16px
    );
    opacity: 0.35;
    border-radius: 3px;
  }

  .ttp-flash {
    background: #d32f2f;
    border: 3px solid #ff5252;
    color: #fff;
    font-weight: 900;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    box-shadow: 0 0 20px rgba(255, 51, 68, 0.8);
    animation: tt-shake 0.08s linear 8;
  }

  /* Teammate Radio Receiver Screen */
  .ttp-guess {
    align-items: center;
    text-align: center;
    padding-top: 2vh;
    background-image:
      radial-gradient(#153554 20%, transparent 20%),
      radial-gradient(#153554 20%, transparent 20%);
    background-position: 0 0, 8px 8px;
    background-size: 16px 16px;
  }
  .ttp-guess h2 {
    font-size: 2em;
    margin: 0;
    color: #faf5eb;
  }
  .ttp-bot .tt-bot { width: 160px; height: auto; }
`;
