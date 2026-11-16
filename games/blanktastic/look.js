// Blanktastic's look: a sunny sticker-book. Sky background with floating
// doodles, a chunky grape-purple prompt card, and answer cards as tilted
// stickers with fat coloured outlines. Shared by the TV and the phones.
import { BLOCKED } from './cards.js';

export const STICKER = ['#ffb627', '#ff6f91', '#38c6f4', '#7bd85a', '#b583ff', '#ff8a3d', '#2ed3b7', '#ffd93d'];

/** Fit an answer into the prompt's blank. With no answer, draws an empty blank. */
export function fill(h, prompt, answer) {
  const [before, after] = prompt.split('___');
  let a = answer;
  if (a != null) {
    a = a.trim();
    if (/^[.!?,;:]/.test(after)) a = a.replace(/[.!?,;:]+$/, '');
    if (!before.trim() || /[.!?]\s*$/.test(before)) a = a[0].toUpperCase() + a.slice(1);
  }
  return h('span.bt-text', before,
    a == null ? h('span.bt-blank', ' ') : h('span.bt-fill', a), after);
}

/** Tidy a written card and swap any blocked word for a halo. */
export function clean(text) {
  let t = String(text).replace(/\s+/g, ' ').trim().slice(0, 60);
  for (const w of BLOCKED) {
    const re = new RegExp(`\\b${w.replace(/[^a-z ]/g, '')}\\w*`, 'gi');
    t = t.replace(re, '😇');
  }
  return t;
}

const SKY = `
  radial-gradient(circle at 12% 18%, rgba(255,255,255,.55) 0 3px, transparent 4px) 0 0/140px 120px,
  radial-gradient(circle at 70% 64%, rgba(255,255,255,.35) 0 2px, transparent 3px) 0 0/90px 110px,
  radial-gradient(ellipse 260px 90px at 18% 88%, rgba(255,255,255,.55), transparent 70%),
  radial-gradient(ellipse 340px 110px at 86% 12%, rgba(255,255,255,.5), transparent 70%),
  linear-gradient(170deg, #7fd3ff 0%, #a6e4ff 45%, #ffe7a8 100%)`;

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Nunito:wght@700;800;900&display=swap');
.bt-look, body.bt-look {
  --fg: #2a1f4a; --dim: #5b5384; --card: #fffdf6; --line: #2a1f4a; --bg2: #e9f7ff; --accent: #7a3cff; --err: #e2344f;
  color: var(--fg); font-family: 'Nunito', var(--font); color-scheme: light;
}
.bt-look::before, body.bt-look::before { content: ''; position: fixed; inset: 0; z-index: -1; background: ${SKY}; }
.bt-look .hostbar { color: var(--dim); }
.bt-look button.ghost { border-color: var(--line); color: var(--fg); background: rgba(255,255,255,.6); }
.bt-look .timer { font-family: 'Fredoka', var(--font); color: var(--fg); }
.bt-look .timer:not(:empty) { background: #fff; border: 4px solid var(--line); border-radius: 99px; padding: 0 .6em;
  flex: 0 0 auto; margin: 0 auto; box-shadow: 0 5px 0 var(--line); }
.bt-look .timer.urgent { background: #ff6f91; color: #fff; }
.bt-look .say h1 { font-family: 'Fredoka', var(--font); }

.bt-intro, .bt-round { display: flex; flex-direction: column; align-items: center; gap: 3vh; width: 100%; }
.bt-logo { display: flex; font-family: 'Fredoka', var(--font); font-weight: 700; font-size: 6em; line-height: 1; }
.bt-logo span { color: var(--c); -webkit-text-stroke: 6px var(--line); paint-order: stroke fill;
  text-shadow: 0 8px 0 var(--line); display: inline-block; animation: bt-bounce .6s backwards cubic-bezier(.3,1.8,.5,1); }
.bt-logo span:nth-child(odd) { transform: rotate(-4deg); }
.bt-logo span:nth-child(even) { transform: rotate(3deg) translateY(.05em); }
@keyframes bt-bounce { from { transform: translateY(-1.2em) scale(.4); opacity: 0; } }

.bt-rules { display: grid; grid-template-columns: 1fr 1fr; gap: 2vh 2vw; max-width: 1300px; }
.bt-rule { display: flex; gap: .7em; align-items: center; background: #fff; border: 4px solid var(--line);
  border-radius: 22px; padding: .7em 1.1em; font-size: 1.35em; text-align: left; box-shadow: 0 6px 0 var(--line); }
.bt-ico { font-size: 1.6em; }

.bt-tag { font-family: 'Fredoka', var(--font); font-size: 1.3em; background: var(--line); color: #fff;
  padding: .15em 1em; border-radius: 99px; }
.bt-judge { display: flex; flex-direction: column; align-items: center; font-size: 1.4em; }
.bt-judge span { color: var(--dim); font-weight: 900; text-transform: uppercase; letter-spacing: .12em; font-size: .7em; }
.bt-judge strong { font-family: 'Fredoka', var(--font); font-size: 1.8em; color: var(--fg);
  text-decoration: underline 6px var(--c); text-underline-offset: 8px; }
.bt-judge.bt-small { font-size: 1em; }

.bt-prompt { position: relative; background: #5b2bd6; color: #fff; border: 6px solid var(--line); border-radius: 34px;
  padding: 1em 1.4em; max-width: 1200px; font-family: 'Fredoka', var(--font); font-weight: 700; font-size: 2.6em;
  line-height: 1.25; box-shadow: 0 12px 0 var(--line), inset 0 -10px 0 rgba(0,0,0,.15);
  animation: bt-flip .5s backwards cubic-bezier(.3,1.5,.5,1); }
.bt-prompt::after { content: '?'; position: absolute; top: -.55em; right: -.35em; width: 1.3em; height: 1.3em;
  display: grid; place-items: center; border-radius: 50%; background: #ffd93d; color: var(--line); border: 5px solid var(--line);
  font-size: .8em; transform: rotate(14deg); }
.bt-prompt.bt-small { font-size: 1.8em; }
.bt-blank { display: inline-block; min-width: 4em; border-bottom: .12em solid #ffd93d; margin: 0 .1em; }
.bt-fill { background: #ffd93d; color: var(--line); padding: 0 .25em; border-radius: .25em; box-decoration-break: clone;
  -webkit-box-decoration-break: clone; }
@keyframes bt-flip { from { transform: perspective(900px) rotateY(80deg) scale(.8); opacity: 0; } }

.bt-big { font-family: 'Fredoka', var(--font); font-weight: 700; font-size: 2.4em; max-width: 1300px; line-height: 1.3;
  background: #fff; border: 6px solid var(--line); border-radius: 30px; padding: .6em 1em; box-shadow: 0 10px 0 var(--line);
  animation: bt-bounce .5s backwards cubic-bezier(.3,1.6,.5,1); }

.bt-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; max-width: 1400px; }
.bt-chip { padding: .35em .9em; border-radius: 99px; border: 4px dashed rgba(42,31,74,.35); color: var(--dim);
  background: rgba(255,255,255,.55); font-weight: 900; font-size: 1.2em; }
.bt-chip.in { border: 4px solid var(--line); background: #fff; color: var(--fg); box-shadow: 0 4px 0 var(--line);
  animation: bt-bounce .35s cubic-bezier(.3,1.8,.5,1); }

.bt-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 2vw; max-width: 1600px; }
.bt-card { position: relative; width: 13em; min-height: 8em; background: #fffdf6; border: 5px solid var(--line);
  border-radius: 22px; padding: 1em 1em .8em; font-size: 1.25em; display: flex; flex-direction: column; gap: .4em;
  justify-content: center; transform: rotate(var(--tilt)); box-shadow: 0 0 0 8px var(--c), 0 0 0 12px var(--line), 0 16px 0 4px var(--line);
  margin: 12px; animation: bt-stick .45s backwards cubic-bezier(.3,1.7,.5,1); overflow-wrap: anywhere; }
.bt-ans { font-weight: 900; font-size: 1.15em; line-height: 1.2; }
.bt-num { position: absolute; top: -.9em; left: -.9em; width: 1.8em; height: 1.8em; display: grid; place-items: center;
  border-radius: 50%; background: var(--c); border: 4px solid var(--line); font-family: 'Fredoka', var(--font); }
.bt-custom { font-size: .7em; color: var(--dim); }
.bt-by { font-family: 'Fredoka', var(--font); font-size: .95em; filter: brightness(.75); }
.bt-many .bt-card { width: 10.5em; min-height: 6em; font-size: 1em; margin: 8px; }
.bt-card.dim { opacity: .55; filter: saturate(.5); }
.bt-card.win { transform: rotate(0) scale(1.12); z-index: 1; animation: bt-wiggle 1s ease-in-out infinite alternate; }
.bt-card.win::after { content: '⭐'; position: absolute; top: -.9em; right: -.6em; font-size: 2em; }
@keyframes bt-stick { from { transform: scale(1.8) rotate(20deg); opacity: 0; } }
@keyframes bt-wiggle { from { transform: rotate(-2deg) scale(1.12); } to { transform: rotate(2deg) scale(1.15); } }

.bt-winner { display: flex; flex-direction: column; align-items: center; gap: .2em; }
.bt-winner span { font-size: 1.4em; color: var(--dim); font-weight: 900; }
.bt-winner strong { font-family: 'Fredoka', var(--font); font-size: 3.4em; color: #fff; -webkit-text-stroke: 5px var(--line);
  paint-order: stroke fill; text-shadow: 0 6px 0 var(--line); animation: bt-bounce .5s backwards cubic-bezier(.3,1.8,.5,1); }

.bt-h { font-family: 'Fredoka', var(--font); font-size: 3em; }
.bt-scores { display: flex; flex-direction: column; gap: 14px; width: min(1000px, 100%); }
.bt-srow { display: grid; grid-template-columns: 9em 1fr 3em; gap: 1em; align-items: center; background: #fff;
  border: 4px solid var(--line); border-left: 18px solid var(--c); border-radius: 20px; padding: .4em 1em; font-size: 1.4em;
  font-weight: 900; text-align: left; box-shadow: 0 5px 0 var(--line); animation: bt-bounce .4s backwards; }
.bt-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; filter: brightness(.75); }
.bt-stars { letter-spacing: .1em; }
.bt-spts { text-align: right; font-family: 'Fredoka', var(--font); }

/* phones */
body.phone.bt-look .top { border-color: rgba(42,31,74,.25); }
body.phone.bt-look .view h2 { font-family: 'Fredoka', var(--font); font-size: 1.5em; }
body.phone.bt-look .view-text { font-family: 'Fredoka', var(--font); font-size: 1.25em; background: #5b2bd6; color: #fff;
  border: 4px solid var(--line); border-radius: 20px; padding: .7em .9em; box-shadow: 0 6px 0 var(--line); }
body.phone.bt-look input, body.phone.bt-look textarea { background: #fff; border: 4px solid var(--line); color: var(--fg); }
body.phone.bt-look .choice { background: #fffdf6; color: var(--fg); border: 4px solid var(--line); border-radius: 18px;
  font-weight: 900; box-shadow: 0 5px 0 var(--line); border-left-width: 16px; }
body.phone.bt-look .choice:nth-child(8n+1) { border-left-color: ${STICKER[0]}; }
body.phone.bt-look .choice:nth-child(8n+2) { border-left-color: ${STICKER[1]}; }
body.phone.bt-look .choice:nth-child(8n+3) { border-left-color: ${STICKER[2]}; }
body.phone.bt-look .choice:nth-child(8n+4) { border-left-color: ${STICKER[3]}; }
body.phone.bt-look .choice:nth-child(8n+5) { border-left-color: ${STICKER[4]}; }
body.phone.bt-look .choice:nth-child(8n+6) { border-left-color: ${STICKER[5]}; }
body.phone.bt-look .choice:nth-child(8n+7) { border-left-color: ${STICKER[6]}; }
body.phone.bt-look .choice:nth-child(8n+8) { border-left-color: ${STICKER[7]}; }
body.phone.bt-look button.big { background: #ffd93d; color: var(--line); border: 4px solid var(--line); font-family: 'Fredoka', var(--font);
  box-shadow: 0 6px 0 var(--line); }
body.phone.bt-look .wait { color: var(--dim); }
body.phone.bt-look .banner { background: #fff; color: var(--fg); }
`;
