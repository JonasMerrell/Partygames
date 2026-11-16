// Peak Fever's look: Mid-Century Screenprint Alpine Poster aesthetic.
// Flat spot color plates, 2px ink misregistration, halftone dot shading,
// bold geometric poster typography. Shared by the TV and the phones.

export const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Oswald:wght@500;700&family=Nunito:wght@700;800;900&display=swap');";

/** Pip positions on a 3x3 grid for each face. */
export const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export const PAIR_COLORS = ['#d35400', '#208994']; // Burnt Orange & Glacier Teal spot colors

/** Four dice as an SVG data URL, pairs ringed in spot colour, for phone views. */
export function diceImage(dice, pairs) {
  const ring = (i) => (pairs ? PAIR_COLORS[pairs.findIndex((p) => p.includes(i))] : null);
  const order = pairs ? pairs.flat() : [0, 1, 2, 3];
  let x = 8;
  const parts = order.map((i, n) => {
    if (n === 2 && pairs) x += 22;
    const d = dice[i], c = ring(i), ox = x;
    x += 94;
    const pips = PIPS[d].map((k) => `<circle cx="${ox + 19 + (k % 3) * 24}" cy="${25 + Math.floor(k / 3) * 24}" r="7.5" fill="#162330"/>`).join('');
    return `<rect x="${ox}" y="6" width="86" height="86" rx="8" fill="#faf5eb" stroke="${c || '#162330'}" stroke-width="${c ? 6 : 3}"/>${pips}`;
  }).join('');
  const sums = pairs ? pairs.map((p, n) => {
    const cx = n ? 8 + 94 * 2 + 22 + 90 : 8 + 90;
    return `<text x="${cx}" y="132" text-anchor="middle" font-family="'Alfa Slab One', serif" font-size="28" fill="${PAIR_COLORS[n]}">${dice[p[0]] + dice[p[1]]}</text>`;
  }).join('') : '';
  const w = x + 8;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${pairs ? 144 : 98}">${parts}${sums}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export const CSS = `
${FONTS}

/* ==========================================================================
   Mid-Century Screenprint Alpine Poster Theme
   ========================================================================== */

:root {
  --pf-paper: #faf5eb;
  --pf-paper-aged: #f4eee1;
  --pf-navy: #162330;
  --pf-orange: #d35400;
  --pf-green: #1b4d3e;
  --pf-teal: #208994;
  --pf-mustard: #e67e22;
  --pf-white: #fffbf0;
}

.pf-frame, body.pf-alpine {
  --fg: #162330;
  --dim: #526071;
  --card: #faf5eb;
  --line: #162330;
  --accent: #d35400;
  font-family: 'Nunito', sans-serif;
  color: var(--fg);
}

/* Vintage Screenprint Poster Margin & Grain */
.pf-frame::before, body.pf-alpine::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: var(--pf-paper);
  background-image:
    radial-gradient(var(--pf-navy) 0.65px, transparent 0.65px),
    linear-gradient(180deg, rgba(22, 35, 48, 0.04) 0%, rgba(211, 84, 0, 0.06) 100%);
  background-size: 8px 8px, 100% 100%;
}

.pf-frame .stage { justify-content: flex-start; gap: 0; }
.pf-frame .timer { font-family: 'Alfa Slab One', serif; color: var(--pf-navy); }

.pf-wrap {
  display: grid;
  grid-template-columns: 1fr minmax(320px, 25vw);
  gap: 2vw;
  width: 100%;
  height: calc(94vh - 40px);
  align-items: stretch;
}

.pf-left {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Headings with 2px Ink Misregistration Drop Shadow */
.pf-head {
  font-family: 'Alfa Slab One', serif;
  font-size: 2.3em;
  letter-spacing: 0.03em;
  color: var(--pf-navy);
  text-transform: uppercase;
  text-shadow: 2px 1.5px 0 var(--pf-orange), -1.5px -1px 0 var(--pf-teal);
  transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1);
  min-height: 1.3em;
}

.pf-head small {
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 0.52em;
  color: var(--pf-teal);
  margin-left: 0.8em;
  letter-spacing: 0.06em;
  text-shadow: 1px 1px 0 rgba(22, 35, 48, 0.3);
}

/* Mountain SVG Board & Shaking */
.pf-board {
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
}

.pf-board svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.pf-board.shake svg {
  animation: pf-avalanche-jitter 0.75s ease-in-out;
}

@keyframes pf-avalanche-jitter {
  0%, 100% { transform: translate(0, 0); }
  15% { transform: translate(-10px, 3px) rotate(-0.5deg); }
  30% { transform: translate(12px, -4px) rotate(0.6deg); }
  50% { transform: translate(-8px, 4px) rotate(-0.3deg); }
  70% { transform: translate(9px, -2px) rotate(0.4deg); }
  85% { transform: translate(-4px, 2px); }
}

/* Halftone Mountain Spire Elements */
.pf-spire {
  transition: opacity 0.4s, filter 0.4s;
}

.pf-spire.closed {
  opacity: 0.45;
  filter: grayscale(0.6) opacity(0.7);
}

.pf-ledge {
  fill: var(--pf-paper);
  stroke: var(--pf-navy);
  stroke-width: 2px;
  transition: fill 0.25s, stroke 0.25s, transform 0.25s;
}

.pf-ledge.hot {
  fill: var(--pf-mustard);
  stroke: var(--pf-navy);
  stroke-width: 3px;
  filter: drop-shadow(0 0 6px var(--pf-mustard));
}

.pf-plaque {
  fill: var(--pf-paper);
  stroke: var(--pf-navy);
  stroke-width: 3.5px;
  transition: fill 0.3s, stroke 0.3s, transform 0.3s;
}

.pf-plaque.lit {
  fill: var(--pf-orange);
  stroke: var(--pf-navy);
  transform-origin: center;
}

.pf-plaque.lit2 {
  fill: var(--pf-teal);
  stroke: var(--pf-navy);
}

.pf-num {
  font-family: 'Alfa Slab One', serif;
  font-size: 32px;
  fill: var(--pf-navy);
  text-anchor: middle;
  pointer-events: none;
}

.pf-plaque.lit + .pf-num,
.pf-plaque.lit2 + .pf-num {
  fill: var(--pf-white);
}

.pf-mk {
  transition: transform 0.55s cubic-bezier(0.2, 1.3, 0.35, 1), opacity 0.5s;
}

.pf-mk.gone {
  opacity: 0;
}

/* Climber Piton Marker */
.pf-climber .ring {
  animation: pf-climber-pulse 1.3s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}

@keyframes pf-climber-pulse {
  0%, 100% { transform: scale(1); stroke-width: 3px; }
  50% { transform: scale(1.25); stroke-width: 4px; stroke: var(--pf-orange); }
}

.pf-rope {
  stroke-dasharray: 5 6;
  stroke-width: 3;
  fill: none;
  opacity: 0.85;
}

/* Summit Pennant Flag Snap & Wave */
.pf-flag-in {
  animation: pf-flag-snap 0.65s cubic-bezier(0.15, 1.4, 0.35, 1) backwards;
  transform-box: fill-box;
  transform-origin: bottom center;
}

@keyframes pf-flag-snap {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  60% { transform: scale(1.35) rotate(10deg); opacity: 1; }
  85% { transform: scale(0.92) rotate(-4deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.pf-flag {
  animation: pf-flag-wave 1.8s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: left center;
}

@keyframes pf-flag-wave {
  0%, 100% { transform: skewY(0deg) scaleX(1); }
  50% { transform: skewY(-9deg) scaleX(0.9); }
}

/* Rotating Stamped Starburst Badge */
.pf-starburst {
  animation: pf-starburst-rotate 12s linear infinite;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes pf-starburst-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Side Panel: Dice Tray, Roster */
.pf-side {
  display: flex;
  flex-direction: column;
  gap: 1.8vh;
  min-height: 0;
}

.pf-tray {
  background: var(--pf-paper);
  border: 3.5px solid var(--pf-navy);
  border-radius: 4px;
  box-shadow: 5px 5px 0 var(--pf-navy);
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.pf-dice {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Carved Screenprinted Wooden Dice */
.pf-die {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  background: var(--pf-paper);
  border: 3px solid var(--pf-navy);
  box-shadow: 3px 3px 0 var(--pf-navy);
  display: grid;
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  padding: 8px;
  transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
  outline: 4px solid transparent;
  outline-offset: 2px;
}

.pf-die i {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--pf-navy);
  place-self: center;
  visibility: hidden;
}

.pf-die i.on {
  visibility: visible;
}

.pf-die.rolling {
  animation: pf-die-shake 0.16s linear infinite;
}

@keyframes pf-die-shake {
  0% { transform: rotate(-12deg) translateY(-4px); }
  50% { transform: rotate(14deg) translateY(4px); }
  100% { transform: rotate(-12deg) translateY(-4px); }
}

.pf-die.p0 {
  outline-color: var(--pf-orange);
  border-color: var(--pf-orange);
}

.pf-die.p1 {
  outline-color: var(--pf-teal);
  border-color: var(--pf-teal);
}

.pf-die.idle {
  opacity: 0.35;
}

.pf-trayline {
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 1.15em;
  text-transform: uppercase;
  color: var(--pf-navy);
  letter-spacing: 0.05em;
  min-height: 1.4em;
  text-align: center;
}

.pf-trayline b {
  color: var(--pf-orange);
}

.pf-ropes {
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 0.95em;
  text-transform: uppercase;
  color: var(--pf-green);
}

.pf-rp {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2.5px solid var(--pf-navy);
  background: var(--pc);
  box-shadow: 2px 2px 0 var(--pf-navy);
}

.pf-rp.used {
  background: transparent;
  border-style: dashed;
  opacity: 0.4;
}

/* Player Roster */
.pf-players {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.pf-pl {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border-radius: 4px;
  background: var(--pf-paper);
  border: 3px solid var(--pf-navy);
  box-shadow: 3px 3px 0 var(--pf-navy);
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 1.18em;
  text-transform: uppercase;
  transition: transform 0.25s, box-shadow 0.25s, background 0.25s;
  text-align: left;
}

.pf-pl.on {
  transform: translateX(-8px);
  background: var(--pf-paper-aged);
  border-color: var(--pf-orange);
  box-shadow: 4px 4px 0 var(--pf-orange);
}

.pf-pl.away {
  opacity: 0.45;
}

.pf-dot {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  background: var(--pc);
  border: 2px solid var(--pf-navy);
}

.pf-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pf-flags {
  display: flex;
  gap: 4px;
}

.pf-flags span {
  width: 18px;
  height: 22px;
  clip-path: polygon(0 0, 100% 30%, 0 60%);
  background: rgba(22, 35, 48, 0.15);
  border-left: 2px solid var(--pf-navy);
}

.pf-flags span.got {
  background: var(--pc);
}

.pf-odds {
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 1.05em;
  color: var(--pf-navy);
  text-transform: uppercase;
  text-align: center;
  letter-spacing: 0.04em;
}

/* Cheer Badges */
.pf-cheers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.pf-cheer {
  position: absolute;
  bottom: 4%;
  padding: 8px 18px;
  border-radius: 4px;
  border: 3px solid var(--pf-navy);
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 1.25em;
  text-transform: uppercase;
  background: var(--pc);
  color: var(--pf-navy);
  box-shadow: 4px 4px 0 var(--pf-navy);
  animation: pf-cheer-rise 2.6s cubic-bezier(0.15, 0.9, 0.3, 1) forwards;
  white-space: nowrap;
}

@keyframes pf-cheer-rise {
  0% { transform: translateY(24px) scale(0.7); opacity: 0; }
  15% { transform: translateY(0) scale(1); opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateY(-48vh) scale(0.95); opacity: 0; }
}

/* Geometric Avalanche Cascade Shards */
.pf-snow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.pf-shard {
  position: absolute;
  top: -8%;
  opacity: 0.92;
  animation: pf-shard-cascade linear forwards;
}

@keyframes pf-shard-cascade {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  85% { opacity: 0.9; }
  100% { transform: translate(var(--dx), 118vh) rotate(var(--rot)); opacity: 0.2; }
}

.pf-scree-wall {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 14px,
    rgba(211, 84, 0, 0.25) 14px,
    rgba(211, 84, 0, 0.25) 28px,
    rgba(32, 137, 148, 0.25) 28px,
    rgba(32, 137, 148, 0.25) 42px
  );
  animation: pf-scree-slide 1.4s cubic-bezier(0.3, 0, 0.7, 1) forwards;
}

@keyframes pf-scree-slide {
  0% { transform: translateY(-100%); opacity: 0; }
  40% { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
}

/* Plate Alignment Entrance */
@keyframes pf-plate-snap {
  0% { transform: translateY(-30px) scale(0.95); opacity: 0; }
  70% { transform: translateY(4px) scale(1.02); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

/* Title Screen & Rules Cards */
.pf-title {
  font-family: 'Alfa Slab One', serif;
  font-size: 5.4em;
  line-height: 1;
  color: var(--pf-navy);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-shadow: 3px 2.5px 0 var(--pf-orange), -2px -2px 0 var(--pf-teal);
  animation: pf-plate-snap 0.8s cubic-bezier(0.2, 1.4, 0.4, 1) backwards;
}

.pf-sub {
  font-family: 'Oswald', sans-serif;
  font-size: 1.6em;
  font-weight: 700;
  color: var(--pf-green);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  max-width: 900px;
}

.pf-rules {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2vw;
  max-width: 1200px;
  margin-top: 2.5vh;
}

.pf-rule {
  background: var(--pf-paper);
  border: 3.5px solid var(--pf-navy);
  border-radius: 4px;
  box-shadow: 4px 4px 0 var(--pf-orange);
  padding: 22px;
  font-size: 1.18em;
  font-weight: 800;
  text-align: left;
  animation: pf-plate-snap 0.6s cubic-bezier(0.2, 1.3, 0.4, 1) backwards;
}

.pf-rule b {
  display: block;
  font-family: 'Alfa Slab One', serif;
  font-size: 1.25em;
  color: var(--pf-orange);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.pf-centre {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2vh;
  flex: 1;
  text-align: center;
  width: 100%;
}

/* Phone Controller Styles */
body.phone.pf-alpine {
  background: var(--pf-paper);
}

body.phone.pf-alpine .top {
  border-bottom: 3.5px solid var(--pf-navy);
  background: var(--pf-paper-aged);
}

body.phone.pf-alpine .view h2 {
  font-family: 'Alfa Slab One', serif;
  font-size: 1.8em;
  color: var(--pf-navy);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-shadow: 2px 1.5px 0 var(--pf-orange), -1.5px -1px 0 var(--pf-teal);
}

body.phone.pf-alpine .view-img {
  border-radius: 4px;
  border: 3px solid var(--pf-navy);
  box-shadow: 3px 3px 0 var(--pf-navy);
  max-height: 26vh;
  object-fit: contain;
}

body.phone.pf-alpine .choice {
  background: var(--pf-paper);
  border: 3px solid var(--pf-navy);
  box-shadow: 3px 3px 0 var(--pf-navy);
  border-radius: 4px;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 1.3em;
  text-transform: uppercase;
  color: var(--pf-navy);
  transition: transform 0.15s, box-shadow 0.15s;
}

body.phone.pf-alpine .choice:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--pf-navy);
}

body.phone.pf-alpine button.big {
  border: 3.5px solid var(--pf-navy);
  border-radius: 4px;
  box-shadow: 4px 4px 0 var(--pf-navy);
  font-family: 'Alfa Slab One', serif;
  text-transform: uppercase;
  color: var(--pf-navy);
  background: var(--pf-orange);
}
`;
