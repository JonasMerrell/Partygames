// Tin Tongue's phone screens for the clue-giver (word + Got it / Skip), the
// other team (word + BZZT) and the guessers. Every other view, and anything
// sent before this file loads, falls back to the standard Party Hall screen.
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
      const got = h('button.ttp-btn.ttp-got', { onclick: () => send('got', [got, skip]) }, 'Got it!');
      const skip = h('button.ttp-btn.ttp-skip', { onclick: () => send('skip', [got, skip]) }, 'Skip');
      ctx.el.replaceChildren(h('div.ttp',
        v.flash && h('div.ttp-flash', v.flash.late ? `BZZT on your last card from ${v.flash.by}. −1` : `BZZT! ${v.flash.by} caught a slip. −1`),
        h('div.ttp-row', h('span.ttp-label', 'Your word'), clock),
        h('div.ttp-card', { key: v.card },
          h('div.ttp-word', v.word),
          h('div.ttp-pts', '●'.repeat(v.points) + `  ${v.points} point${v.points > 1 ? 's' : ''}`)),
        h('p.ttp-hint', 'One-syllable words only. No part of the word.'),
        got, skip));
    } else if (v.tt === 'watch') {
      const zap = h('button.ttp-btn.ttp-glitch', { onclick: () => send('glitch', [zap]) }, '⚡ BZZT!');
      ctx.el.replaceChildren(h('div.ttp',
        h('div.ttp-row', h('span.ttp-label', `${v.giver} is cluing`), clock),
        h('div.ttp-card.ttp-watch', h('div.ttp-word', v.word)),
        h('p.ttp-hint', 'Two syllables, or any part of the word? Hit it!'),
        zap));
    } else {
      ctx.el.replaceChildren(h('div.ttp.ttp-guess',
        h('div.ttp-row', h('span.ttp-label', 'Your team is up'), clock),
        bot('talk'),
        h('h2', 'Guess out loud!'),
        h('p.ttp-hint', `${v.giver} is giving clues.`)));
    }
  });
}

const CSS = `
  .ttp { display: flex; flex-direction: column; gap: 16px; }
  .ttp-row { display: flex; justify-content: space-between; align-items: center; }
  .ttp-label { color: var(--dim); font-weight: 800; text-transform: uppercase; letter-spacing: .12em; font-size: .85em; }
  .ttp-clock { font-weight: 900; font-size: 1.4em; font-variant-numeric: tabular-nums; }
  .ttp-clock.ttp-urgent { color: var(--err); }
  .ttp-card { background: #f4f1ff; color: #14111f; border-radius: 22px; padding: 28px 18px; text-align: center;
    border: 5px solid var(--accent); box-shadow: 0 8px 0 color-mix(in srgb, var(--accent) 55%, #000); animation: pop .3s ease-out; }
  .ttp-word { font-size: clamp(2em, 12vw, 3.2em); font-weight: 900; text-transform: uppercase; overflow-wrap: anywhere; line-height: 1.05; }
  .ttp-pts { margin-top: 10px; font-weight: 800; color: #6b6489; white-space: pre; }
  .ttp-hint { color: var(--dim); text-align: center; margin: 0; }
  .ttp-btn { border: 0; border-radius: 20px; padding: 22px; font-size: 1.5em; font-weight: 900; cursor: pointer; color: #120f1d;
    transition: transform .06s; }
  .ttp-btn:active { transform: translateY(4px); }
  .ttp-btn:disabled { filter: grayscale(.7) brightness(.6); }
  .ttp-got { background: #5df08a; box-shadow: 0 6px 0 #2a8a49; padding: 30px; }
  .ttp-skip { background: var(--card); color: var(--fg); border: 2px solid var(--line); }
  .ttp-glitch { background: var(--err); box-shadow: 0 8px 0 #8a2a3a; padding: 46px 22px; font-size: 2em; }
  .ttp-flash { background: var(--err); color: #120f1d; font-weight: 900; border-radius: 14px; padding: 12px; text-align: center;
    animation: tt-shake .08s linear 8; }
  .ttp-guess { align-items: center; text-align: center; padding-top: 3vh; }
  .ttp-guess h2 { font-size: 2em; margin: 0; }
  .ttp-bot .tt-bot { width: 160px; height: auto; }
`;
