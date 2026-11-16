// Peak Fever's look: an alpine range at dusk, carved-stone dice, tents for
// camps and pennant flags on the summits. Shared by the TV and the phones.

export const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Nunito:wght@600;800;900&display=swap');";

/** Pip positions on a 3x3 grid for each face. */
export const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export const PAIR_COLORS = ['#ffb347', '#5ee0d0'];

/** Four dice as an SVG data URL, pairs ringed in colour, for phone views. */
export function diceImage(dice, pairs) {
  const ring = (i) => (pairs ? PAIR_COLORS[pairs.findIndex((p) => p.includes(i))] : null);
  const order = pairs ? pairs.flat() : [0, 1, 2, 3];
  let x = 6;
  const parts = order.map((i, n) => {
    if (n === 2 && pairs) x += 22;
    const d = dice[i], c = ring(i), ox = x;
    x += 92;
    const pips = PIPS[d].map((k) => `<circle cx="${ox + 18 + (k % 3) * 24}" cy="${24 + Math.floor(k / 3) * 24}" r="8" fill="#2d2440"/>`).join('');
    return `<rect x="${ox}" y="6" width="84" height="84" rx="18" fill="#f6efe2" stroke="${c || '#cbbfa8'}" stroke-width="${c ? 7 : 3}"/>${pips}`;
  }).join('');
  const sums = pairs ? pairs.map((p, n) => {
    const cx = n ? 6 + 92 * 2 + 22 + 88 : 6 + 88;
    return `<text x="${cx}" y="128" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="30" fill="${PAIR_COLORS[n]}">${dice[p[0]] + dice[p[1]]}</text>`;
  }).join('') : '';
  const w = x + 4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${pairs ? 140 : 96}">${parts}${sums}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export const CSS = `
${FONTS}
.pf-frame, body.pf-alpine {
  --fg: #fff6e8; --dim: #c9bcd8; --card: #2b2547; --line: #4d4473; --accent: #ffb347;
  font-family: 'Nunito', var(--font);
}
.pf-frame::before, body.pf-alpine::before {
  content: ''; position: fixed; inset: 0; z-index: -1;
  background: linear-gradient(180deg, #1b1840 0%, #3b2a63 40%, #8a4d6e 72%, #e0875a 100%);
}
.pf-frame .stage { justify-content: flex-start; gap: 0; }
.pf-frame .timer { font-family: 'Alfa Slab One', serif; color: var(--fg); }

.pf-wrap { display: grid; grid-template-columns: 1fr minmax(300px, 24vw); gap: 2vw; width: 100%; height: calc(94vh - 40px); align-items: stretch; }
.pf-left { position: relative; display: flex; flex-direction: column; min-height: 0; }
.pf-head { font-family: 'Alfa Slab One', serif; font-size: 2.4em; letter-spacing: .02em; min-height: 1.3em;
  text-shadow: 0 3px 0 rgba(0,0,0,.35); transition: color .3s; }
.pf-head small { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: .5em; color: var(--dim); margin-left: .6em; letter-spacing: 0; text-shadow: none; }
.pf-board { flex: 1; min-height: 0; width: 100%; }
.pf-board svg { width: 100%; height: 100%; display: block; overflow: visible; }
.pf-board.shake svg { animation: pf-shake .7s; }
@keyframes pf-shake { 10%,50%,90% { transform: translate(-8px, 2px); } 30%,70% { transform: translate(8px, -2px); } }

.pf-spire { transition: opacity .4s, filter .4s; }
.pf-spire.closed { opacity: .55; filter: saturate(.4); }
.pf-ledge { fill: rgba(255,255,255,.16); }
.pf-ledge.hot { fill: rgba(255,255,255,.32); }
.pf-num { font-family: 'Alfa Slab One', serif; font-size: 34px; fill: #fff6e8; text-anchor: middle; }
.pf-plaque { fill: #2d2440; stroke: rgba(255,255,255,.25); stroke-width: 2; }
.pf-plaque.lit { fill: #ffb347; stroke: #fff; }
.pf-plaque.lit2 { fill: #3fbfae; stroke: #fff; }
.pf-mk { transition: transform .55s cubic-bezier(.3,1.4,.5,1), opacity .5s; }
.pf-mk.gone { opacity: 0; }
.pf-climber .ring { animation: pf-pulse 1.1s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
@keyframes pf-pulse { 50% { transform: scale(1.25); opacity: .5; } }
.pf-rope { stroke-dasharray: 5 6; stroke-width: 3; fill: none; opacity: .8; }
.pf-flag { animation: pf-wave 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: left center; }
@keyframes pf-wave { 50% { transform: skewY(-8deg) scaleX(.92); } }
.pf-flag-in { animation: pf-plant .6s cubic-bezier(.3,1.6,.5,1) backwards; transform-box: fill-box; transform-origin: bottom center; }
@keyframes pf-plant { from { transform: translateY(-120px) scale(1.6); opacity: 0; } }

.pf-side { display: flex; flex-direction: column; gap: 1.6vh; min-height: 0; }
.pf-tray { background: rgba(20,16,40,.55); border: 2px solid rgba(255,255,255,.12); border-radius: 22px; padding: 18px;
  display: flex; flex-direction: column; align-items: center; gap: 10px; }
.pf-dice { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.pf-die { width: 74px; height: 74px; border-radius: 16px; background: linear-gradient(145deg, #fffaf0, #e6dac4);
  box-shadow: 0 6px 0 #a8987c, 0 10px 18px rgba(0,0,0,.35); display: grid; grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  padding: 10px; transition: transform .25s, box-shadow .25s, outline-color .25s; outline: 5px solid transparent; outline-offset: 3px; }
.pf-die i { width: 14px; height: 14px; border-radius: 50%; background: #2d2440; place-self: center; visibility: hidden; }
.pf-die i.on { visibility: visible; }
.pf-die.rolling { animation: pf-tumble .18s linear infinite; }
@keyframes pf-tumble { 0% { transform: rotate(-14deg) translateY(-6px); } 50% { transform: rotate(12deg) translateY(4px); } 100% { transform: rotate(-14deg) translateY(-6px); } }
.pf-die.p0 { outline-color: ${PAIR_COLORS[0]}; }
.pf-die.p1 { outline-color: ${PAIR_COLORS[1]}; }
.pf-die.idle { opacity: .35; }
.pf-trayline { font-weight: 800; color: var(--dim); font-size: 1.05em; text-align: center; min-height: 1.4em; }
.pf-trayline b { color: var(--fg); }
.pf-ropes { display: flex; gap: 10px; align-items: center; color: var(--dim); font-weight: 800; }
.pf-rp { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #fff; background: var(--pc); box-shadow: 0 0 12px var(--pc); }
.pf-rp.used { background: transparent; box-shadow: none; opacity: .35; }

.pf-players { display: flex; flex-direction: column; gap: 10px; overflow: hidden; }
.pf-pl { display: grid; grid-template-columns: 20px 1fr auto; gap: 12px; align-items: center; padding: 10px 14px;
  border-radius: 16px; background: rgba(20,16,40,.45); border: 2px solid transparent; font-weight: 800; font-size: 1.15em;
  transition: background .3s, border-color .3s, transform .3s; text-align: left; }
.pf-pl.on { border-color: var(--pc); background: color-mix(in srgb, var(--pc) 22%, rgba(20,16,40,.6)); transform: translateX(-8px); }
.pf-pl.away { opacity: .45; }
.pf-dot { width: 20px; height: 20px; border-radius: 6px; background: var(--pc); }
.pf-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pf-flags { display: flex; gap: 4px; }
.pf-flags span { width: 18px; height: 22px; clip-path: polygon(0 0, 100% 25%, 0 50%); background: rgba(255,255,255,.18); }
.pf-flags span.got { background: var(--pc); }
.pf-odds { font-size: .95em; color: var(--dim); font-weight: 800; text-align: center; }

.pf-cheers { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.pf-cheer { position: absolute; bottom: 4%; padding: 8px 16px; border-radius: 999px; font-weight: 900; font-size: 1.2em;
  background: var(--pc); color: #1b1530; box-shadow: 0 6px 18px rgba(0,0,0,.35); animation: pf-rise 2.6s ease-out forwards; white-space: nowrap; }
@keyframes pf-rise { 0% { transform: translateY(20px) scale(.6); opacity: 0; } 15% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-46vh); opacity: 0; } }

.pf-snow { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.pf-snow b { position: absolute; top: -6%; border-radius: 50%; background: #fff; opacity: .9; animation: pf-fall linear forwards; }
@keyframes pf-fall { to { transform: translate(var(--dx), 115vh); opacity: .2; } }
.pf-wall { position: absolute; left: -10%; right: -10%; top: -60%; height: 60%; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0), #f4f8ff 55%, #dfe8f7); filter: blur(6px);
  animation: pf-slide 1.6s cubic-bezier(.5,0,.6,1) forwards;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
@keyframes pf-slide { 0% { transform: translateY(0); } 55% { transform: translateY(150%); opacity: 1; } 100% { transform: translateY(230%); opacity: 0; } }

.pf-title { font-family: 'Alfa Slab One', serif; font-size: 5.4em; line-height: 1; color: #fff6e8;
  text-shadow: 0 6px 0 #8a4d6e, 0 14px 30px rgba(0,0,0,.45); animation: pf-plant .7s cubic-bezier(.3,1.5,.5,1) backwards; }
.pf-sub { font-size: 1.6em; font-weight: 800; color: var(--dim); max-width: 1000px; }
.pf-rules { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2vw; max-width: 1300px; margin-top: 2vh; }
.pf-rule { background: rgba(20,16,40,.5); border-radius: 22px; padding: 22px; font-size: 1.25em; font-weight: 700; text-align: left;
  animation: pf-plant .6s backwards cubic-bezier(.3,1.4,.5,1); }
.pf-rule b { display: block; font-family: 'Alfa Slab One', serif; font-weight: 400; font-size: 1.3em; color: var(--accent); margin-bottom: 6px; }
.pf-centre { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2vh; flex: 1; text-align: center; width: 100%; }

/* phones */
body.phone.pf-alpine .top { border-color: rgba(255,255,255,.15); }
body.phone.pf-alpine .view h2 { font-family: 'Alfa Slab One', serif; font-weight: 400; font-size: 1.7em; text-shadow: 0 3px 0 rgba(0,0,0,.3); }
body.phone.pf-alpine .view-img { border-radius: 0; max-height: 26vh; object-fit: contain; }
body.phone.pf-alpine .choice { background: rgba(20,16,40,.55); border-color: rgba(255,255,255,.18); font-weight: 900; font-size: 1.25em; }
body.phone.pf-alpine button.big { color: #1b1530; }
`;
