// Paper-craft look for Glitch Squad: kraft background, construction-paper
// cards with tape, ransom-note titles. Shared by the TV and the phones.

export const PAPER = ['#f2c14e', '#e8553d', '#5fa8d3', '#8cc084', '#f78fb3', '#f4a259', '#b8a1e3', '#fffaf0'];

/** Ransom-note letters: each one cut from a different scrap of paper. */
export function ransom(h, text) {
  let n = 0;
  return h('span.gs-ransom', [...text].map((ch) => {
    if (ch === ' ') return h('span.gs-sp', ' ');
    n++;
    const c = PAPER[(n * 5 + ch.charCodeAt(0)) % PAPER.length];
    const tilt = ((n * 47 + ch.charCodeAt(0)) % 11) - 5;
    const font = ['gs-f1', 'gs-f2', 'gs-f3'][(n + ch.charCodeAt(0)) % 3];
    return h('span.gs-l.' + font, { style: { '--paper': c, '--tilt': `${tilt}deg`, animationDelay: `${n * 40}ms` } }, ch);
  }));
}

const KRAFT = `
  radial-gradient(circle at 20% 30%, rgba(255,255,255,.18) 0 1px, transparent 2px) 0 0/23px 29px,
  radial-gradient(circle at 70% 60%, rgba(90,60,30,.12) 0 1px, transparent 2px) 0 0/31px 17px,
  repeating-linear-gradient(17deg, rgba(120,85,45,.05) 0 2px, transparent 2px 7px),
  repeating-linear-gradient(-63deg, rgba(255,255,255,.05) 0 1px, transparent 1px 9px),
  linear-gradient(160deg, #d8b98a, #c9a46f)`;

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Bowlby+One&family=Special+Elite&display=swap');
.gs-paper, body.gs-paper {
  --fg: #2b2118; --dim: #5e4a35; --card: #fffaf0; --line: #8a6e4b; --bg2: #efe2c9;
  --accent: #e8553d; --err: #c0392b;
  color: var(--fg); font-family: 'Patrick Hand', 'Comic Sans MS', var(--font);
}
.gs-paper::before, body.gs-paper::before {
  content: ''; position: fixed; inset: 0; z-index: -1; background: ${KRAFT};
}
.gs-paper .hostbar { color: var(--dim); }
.gs-paper button.ghost { border-color: var(--line); color: var(--dim); background: rgba(255,250,240,.5); }
.gs-paper .timer { font-family: 'Bowlby One', var(--font); color: var(--fg); }
.gs-paper .timer:not(:empty) { background: #fffaf0; border-radius: 4px; padding: 0 .5em; flex: 0 0 auto; margin: 0 auto;
  box-shadow: 2px 3px 0 rgba(60,40,20,.35); transform: rotate(-2deg); }
.gs-paper .timer.urgent { color: #fff; background: var(--accent); }

.gs-ransom { display: inline-flex; flex-wrap: wrap; justify-content: center; gap: .08em; row-gap: .25em; }
.gs-l { display: inline-block; background: var(--paper); padding: .02em .16em .06em; transform: rotate(var(--tilt));
  box-shadow: 2px 3px 0 rgba(60,40,20,.35); animation: gs-drop .35s backwards cubic-bezier(.3,1.6,.6,1);
  clip-path: polygon(0 4%, 12% 0, 30% 5%, 52% 0, 75% 4%, 100% 0, 97% 30%, 100% 62%, 96% 100%, 70% 95%, 45% 100%, 20% 96%, 0 100%, 3% 55%); }
.gs-f1 { font-family: 'Bowlby One', var(--font); }
.gs-f2 { font-family: 'Special Elite', monospace; font-weight: 700; }
.gs-f3 { font-family: 'Patrick Hand', var(--font); font-weight: 700; }
.gs-sp { width: .35em; }
@keyframes gs-drop { from { transform: translateY(-40px) rotate(20deg); opacity: 0; } }

.gs-title { font-size: 3.6em; line-height: 1.15; }
.gs-sub { font-size: 1.5em; color: var(--dim); background: #fffaf0; padding: .3em 1em; transform: rotate(-1deg);
  box-shadow: 3px 4px 0 rgba(60,40,20,.3); }
.gs-banner { font-size: 2.2em; }
.gs-note { font-size: 1.4em; background: #fffaf0; padding: .25em .9em; transform: rotate(1deg);
  box-shadow: 3px 4px 0 rgba(60,40,20,.3); }

.gs-board { display: flex; flex-wrap: wrap; justify-content: center; gap: 2.2vw; max-width: 1500px; padding: 1vh 0; }
.gs-card { position: relative; background: var(--paper); min-width: 7em; max-width: 14em; padding: 1.1em 1.3em .8em;
  transform: rotate(var(--tilt)); box-shadow: 4px 6px 0 rgba(60,40,20,.35), 0 0 0 1px rgba(0,0,0,.04) inset;
  animation: gs-pin .4s backwards cubic-bezier(.3,1.5,.6,1); }
.gs-card::before { content: ''; position: absolute; top: -.7em; left: 50%; width: 3.2em; height: 1.3em;
  transform: translateX(-50%) rotate(-4deg); background: rgba(255,248,220,.75); box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.gs-card-big { font-size: 1.5em; font-weight: 700; overflow-wrap: anywhere; }
.gs-card.gs-big .gs-card-big { font-size: 2em; font-family: 'Special Elite', monospace; }
.gs-card-small { color: rgba(43,33,24,.7); font-size: 1em; }
.gs-card.gs-dim { filter: saturate(.35) brightness(1.05); opacity: .75; }
.gs-card.gs-accused { outline: 5px dashed var(--fg); outline-offset: 6px; }
@keyframes gs-pin { from { transform: scale(1.6) rotate(12deg); opacity: 0; } }

.gs-reveal { display: flex; flex-direction: column; align-items: center; gap: .3em; }
.gs-reveal-k { font-size: 1.4em; color: var(--dim); }
.gs-glitch { position: relative; font-family: 'Bowlby One', var(--font); font-size: 4em; background: #2b2118; color: #fffaf0;
  padding: .1em .5em; transform: rotate(-2deg); box-shadow: 6px 8px 0 #7b3fe4; }
.gs-glitch::before, .gs-glitch::after { content: attr(data-text); position: absolute; inset: 0; padding: .1em .5em;
  background: #2b2118; overflow: hidden; }
.gs-glitch::before { color: #ff4d8d; clip-path: inset(10% 0 55% 0); animation: gs-cut 1.4s infinite steps(1); }
.gs-glitch::after { color: #4de1ff; clip-path: inset(60% 0 8% 0); animation: gs-cut 1.1s infinite reverse steps(1); }
@keyframes gs-cut { 0% { transform: translate(-6px, 0); } 25% { transform: translate(5px, 2px); }
  50% { transform: translate(-3px, -2px); } 75% { transform: translate(7px, 0); } }

.gs-word { display: flex; flex-direction: column; align-items: center; gap: .3em; }
.gs-word span { font-size: 1.3em; color: var(--dim); }
.gs-word strong { font-family: 'Special Elite', monospace; font-size: 3em; background: #fffaf0; padding: .15em .6em;
  box-shadow: 5px 6px 0 rgba(60,40,20,.35); transform: rotate(1.5deg); }

.gs-scores { display: flex; flex-direction: column; gap: 14px; width: min(900px, 100%); }
.gs-srow { display: grid; grid-template-columns: 3em 1fr 4em; align-items: center; gap: 1em; background: var(--paper);
  padding: .4em 1em; font-size: 1.4em; font-weight: 700; transform: rotate(var(--tilt));
  box-shadow: 4px 5px 0 rgba(60,40,20,.35); animation: gs-pin .4s backwards; text-align: left; }
.gs-rank { font-family: 'Bowlby One', var(--font); }
.gs-spts { text-align: right; font-family: 'Special Elite', monospace; }

/* phones */
body.phone.gs-paper .top { border-color: rgba(60,40,20,.35); }
body.phone.gs-paper .view h2 { font-family: 'Bowlby One', var(--font); font-size: 1.5em; background: #fffaf0;
  padding: .3em .5em; box-shadow: 3px 4px 0 rgba(60,40,20,.3); transform: rotate(-1deg); }
body.phone.gs-paper .view-text { font-size: 1.35em; }
body.phone.gs-paper input, body.phone.gs-paper textarea { background: #fffaf0; border: 0; border-radius: 2px;
  box-shadow: 3px 4px 0 rgba(60,40,20,.3); font-family: 'Special Elite', monospace; color: var(--fg); }
body.phone.gs-paper .choice { border: 0; border-radius: 2px; background: #fffaf0; color: var(--fg); font-family: inherit;
  box-shadow: 3px 4px 0 rgba(60,40,20,.3); }
body.phone.gs-paper .choice:nth-child(4n+1) { background: #f2c14e; transform: rotate(-.6deg); }
body.phone.gs-paper .choice:nth-child(4n+2) { background: #5fa8d3; transform: rotate(.5deg); }
body.phone.gs-paper .choice:nth-child(4n+3) { background: #8cc084; transform: rotate(-.3deg); }
body.phone.gs-paper .choice:nth-child(4n+4) { background: #f78fb3; transform: rotate(.7deg); }
body.phone.gs-paper button.big { border-radius: 2px; font-family: 'Bowlby One', var(--font); color: #fffaf0;
  box-shadow: 4px 5px 0 rgba(60,40,20,.45); }
body.phone.gs-paper .wait { color: var(--dim); }
body.phone.gs-paper .banner { background: #fffaf0; color: var(--fg); }
`;
