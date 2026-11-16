// CRT Vaporwave & Glitch Terminal engine for Glitch Squad
// Shared by TV host screen and mobile controller screens.

export const CRT_COLORS = [
  '#39ff14', // Phosphor Green
  '#00f0ff', // Electric Cyan
  '#ff007f', // Neon Hot Pink
  '#ffb000', // Terminal Amber
  '#bf55ec', // Cyber Purple
  '#00ffcc', // Matrix Mint
  '#ff3366', // Laser Red
  '#ffff00', // Warning Yellow
];

// Backwards-compatible alias for legacy references
export const PAPER = CRT_COLORS;

/** Render terminal monospace text with chromatic aberration and phosphor glow */
export function terminalText(h, text) {
  let n = 0;
  return h('span.gs-term-title.gs-ransom', [...String(text || '')].map((ch) => {
    if (ch === ' ') return h('span.gs-sp', ' ');
    n++;
    const c = CRT_COLORS[(n * 3 + ch.charCodeAt(0)) % CRT_COLORS.length];
    return h('span.gs-l', { style: { '--glow': c, animationDelay: `${(n % 8) * 35}ms` } }, ch);
  }));
}

// Backwards-compatible alias for existing host.js calls
export const ransom = terminalText;

/** Render a cyber terminal node card for player clue / status */
export function terminalCard(h, i, big, small, extra = '') {
  const c = CRT_COLORS[i % CRT_COLORS.length];
  return h('div.gs-card' + extra, { style: { '--paper': c, '--card-glow': c } },
    h('div.gs-card-big', big),
    small && h('div.gs-card-small', small));
}

export const paperCard = terminalCard;

/** Dramatic Glitch reveal container with slicing chromatic aberration */
export function glitchReveal(h, name) {
  return h('div.gs-reveal',
    h('div.gs-reveal-k', '// INTRUDER ANOMALY DETECTED //'),
    h('div.gs-glitch', { 'data-text': name }, name));
}

/** Construct background CRT overlays (Scanlines, Vignette, Tracking, Synthwave Grid) */
export function crtOverlays(h) {
  return [
    h('div.gs-crt-overlay'),
    h('div.gs-vhs-tracking'),
    h('div.gs-grid', h('div.gs-grid-plane')),
  ];
}

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&family=Orbitron:wght@500;700;900&display=swap');

:root, .gs-crt, .gs-paper, body.gs-crt, body.gs-paper {
  --gs-bg: #0b0314;
  --gs-bg-card: rgba(18, 10, 32, 0.85);
  --gs-cyan: #00f0ff;
  --gs-pink: #ff007f;
  --gs-green: #39ff14;
  --gs-amber: #ffb000;
  --gs-purple: #7b3fe4;
  --gs-text: #e0faff;
  --gs-dim: #738a9c;
  --font-mono: 'Share Tech Mono', 'VT323', monospace;
  --font-cyber: 'Orbitron', 'Share Tech Mono', monospace;
  color: var(--gs-text);
  font-family: var(--font-mono);
}

/* --- CRT Chassis Bezel & Screen Glass --- */
.gs-crt, .gs-paper, body.gs-crt, body.gs-paper {
  background-color: var(--gs-bg);
  position: relative;
}

.gs-crt::before, .gs-paper::before, body.gs-crt::before, body.gs-paper::before {
  content: ''; position: fixed; inset: 0; z-index: -2;
  background: radial-gradient(circle at 50% 50%, #15092a 0%, #08020e 100%);
}

.game.gs-crt, .game.gs-paper {
  box-shadow: inset 0 0 100px rgba(0,0,0,0.95), inset 0 0 25px rgba(0,240,255,0.2);
  border: 4px solid #1a1528;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}

/* CRT Scanlines and Screen Curvature Vignette */
.gs-crt-overlay {
  position: fixed; inset: 0; pointer-events: none; z-index: 998;
  background:
    radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(5,2,15,0.75) 85%, rgba(0,0,0,0.95) 100%),
    repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 3px);
  animation: gs-scanline-flicker 0.15s infinite;
}
@keyframes gs-scanline-flicker {
  0% { opacity: 0.96; } 50% { opacity: 1; } 100% { opacity: 0.98; }
}

/* VHS Tracking Line */
.gs-vhs-tracking {
  position: absolute; left: 0; right: 0; height: 10px;
  background: linear-gradient(180deg, transparent, rgba(0,240,255,0.2) 40%, rgba(255,0,127,0.2) 60%, transparent);
  pointer-events: none; z-index: 999;
  animation: gs-vhs-roll 9s linear infinite;
  mix-blend-mode: screen;
}
@keyframes gs-vhs-roll {
  0% { top: 105%; opacity: 0; }
  10% { opacity: 0.8; }
  50% { top: -5%; opacity: 0.8; }
  51% { top: -5%; opacity: 0; }
  100% { top: -5%; opacity: 0; }
}

/* Perspective Synthwave Wireframe Grid */
.gs-grid {
  position: absolute; bottom: 0; left: 0; right: 0; height: 48%;
  perspective: 350px; overflow: hidden; pointer-events: none; z-index: 0;
}
.gs-grid-plane {
  position: absolute; inset: -50% -20%;
  background-image:
    linear-gradient(to right, rgba(0, 240, 255, 0.22) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 0, 127, 0.22) 1px, transparent 1px);
  background-size: 45px 45px;
  transform: rotateX(70deg);
  transform-origin: 50% 100%;
  animation: gs-grid-move 2.5s linear infinite;
  mask-image: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 80%);
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 80%);
}
@keyframes gs-grid-move {
  from { background-position: 0 0; }
  to { background-position: 0 45px; }
}

/* CRT Beam Power-On / Transition Wipe */
@keyframes gs-beam-expand {
  0% { transform: scaleY(0.005) scaleX(0); filter: brightness(30); opacity: 0; }
  30% { transform: scaleY(0.005) scaleX(1); filter: brightness(20); opacity: 1; }
  65% { transform: scaleY(0.12) scaleX(1); filter: brightness(6); }
  100% { transform: scaleY(1) scaleX(1); filter: brightness(1); opacity: 1; }
}
.gs-beam-wipe {
  animation: gs-beam-expand 0.65s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  transform-origin: center center;
}

/* RGB-Split Jitter Shake Burst */
@keyframes gs-rgb-jitter {
  0% { transform: translate(0, 0); text-shadow: -2px 0 var(--gs-pink), 2px 0 var(--gs-cyan); }
  20% { transform: translate(-3px, 2px) skewX(2deg); text-shadow: -5px 0 var(--gs-pink), 4px 0 var(--gs-cyan); }
  40% { transform: translate(3px, -2px) skewX(-2deg); text-shadow: 4px -2px var(--gs-pink), -4px 2px var(--gs-cyan); }
  60% { transform: translate(-2px, -1px); text-shadow: -5px 1px var(--gs-pink), 4px -1px var(--gs-cyan); }
  80% { transform: translate(2px, 2px); text-shadow: 3px 0 var(--gs-pink), -3px 0 var(--gs-cyan); }
  100% { transform: translate(0, 0); text-shadow: -1px 0 rgba(255,0,127,0.7), 1px 0 rgba(0,240,255,0.7); }
}
.gs-jitter {
  animation: gs-rgb-jitter 0.28s ease-out;
}

/* Blinking Phosphor Cursor */
.gs-cursor {
  display: inline-block; width: 0.55em; height: 1.05em; background: var(--gs-green);
  box-shadow: 0 0 8px var(--gs-green); vertical-align: -0.15em; margin-left: 4px;
  animation: gs-cursor-blink 0.9s infinite steps(1);
}
@keyframes gs-cursor-blink {
  0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; }
}

/* Typography & Monospace Chromatic Aberration */
.gs-term-title { display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 0.04em; }
.gs-l {
  display: inline-block;
  color: var(--glow, var(--gs-cyan));
  text-shadow: 0 0 8px var(--glow, var(--gs-cyan)), -1.5px 0 var(--gs-pink), 1.5px 0 var(--gs-cyan);
}
.gs-sp { width: 0.35em; }

.gs-title {
  font-family: var(--font-cyber); font-size: 3.4em; letter-spacing: 0.08em;
  text-transform: uppercase; color: #fff;
  text-shadow: 0 0 12px var(--gs-cyan), -2px 0 var(--gs-pink), 2px 0 var(--gs-cyan);
}
.gs-sub {
  font-family: var(--font-mono); font-size: 1.35em; color: var(--gs-green);
  background: rgba(10, 25, 15, 0.85); border: 1px solid var(--gs-green);
  box-shadow: 0 0 12px rgba(57, 255, 20, 0.35); padding: 0.35em 1.2em;
}
.gs-banner {
  font-family: var(--font-cyber); font-size: 2.2em; color: var(--gs-cyan);
  text-shadow: 0 0 8px var(--gs-cyan), -1.5px 0 var(--gs-pink); letter-spacing: 0.05em;
}
.gs-note {
  font-family: var(--font-mono); font-size: 1.25em; color: var(--gs-amber);
  background: rgba(25, 18, 5, 0.8); border-left: 3px solid var(--gs-amber);
  padding: 0.35em 1em; box-shadow: 0 0 10px rgba(255, 176, 0, 0.2);
}

/* HUD Terminal Cards */
.gs-board {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;
  max-width: 1400px; padding: 1.5vh 0; z-index: 1; position: relative;
}
.gs-card {
  position: relative; background: var(--gs-bg-card);
  border: 1px solid var(--paper, var(--gs-cyan)); min-width: 9em; max-width: 15em;
  padding: 1em 1.2em; border-radius: 4px; backdrop-filter: blur(4px);
  box-shadow: 0 0 14px rgba(0, 240, 255, 0.25), inset 0 0 12px rgba(0, 240, 255, 0.08);
  animation: gs-beam-expand 0.3s ease-out;
}
.gs-card::before {
  content: ''; position: absolute; top: -2px; left: -2px; width: 8px; height: 8px;
  border-top: 2px solid var(--paper, var(--gs-cyan)); border-left: 2px solid var(--paper, var(--gs-cyan));
}
.gs-card::after {
  content: ''; position: absolute; bottom: -2px; right: -2px; width: 8px; height: 8px;
  border-bottom: 2px solid var(--paper, var(--gs-cyan)); border-right: 2px solid var(--paper, var(--gs-cyan));
}
.gs-card-big {
  font-size: 1.5em; font-weight: 700; color: #fff;
  text-shadow: 0 0 6px var(--paper, var(--gs-cyan)); overflow-wrap: anywhere;
}
.gs-card.gs-big .gs-card-big { font-size: 2em; letter-spacing: 0.04em; }
.gs-card-small { color: var(--gs-dim); font-size: 0.95em; margin-top: 4px; }
.gs-card.gs-dim { opacity: 0.75; filter: grayscale(0.6); }
.gs-card.gs-accused {
  border-color: var(--gs-pink);
  box-shadow: 0 0 25px var(--gs-pink), inset 0 0 15px rgba(255, 0, 127, 0.3);
  animation: gs-accused-pulse 0.9s infinite alternate;
}
@keyframes gs-accused-pulse {
  0% { transform: scale(1); } 100% { transform: scale(1.06); }
}

/* Glitch Reveal */
.gs-reveal { display: flex; flex-direction: column; align-items: center; gap: 0.5em; z-index: 2; position: relative; }
.gs-reveal-k { font-size: 1.4em; color: var(--gs-pink); letter-spacing: 0.1em; }
.gs-glitch {
  position: relative; font-family: var(--font-cyber); font-size: 4.2em; font-weight: 900;
  color: #fff; background: #000; border: 2px solid var(--gs-pink);
  padding: 0.15em 0.7em; box-shadow: 0 0 30px var(--gs-pink), inset 0 0 20px rgba(255,0,127,0.4);
  letter-spacing: 0.08em;
}
.gs-glitch::before, .gs-glitch::after {
  content: attr(data-text); position: absolute; inset: 0; padding: 0.15em 0.7em; background: #000; overflow: hidden;
}
.gs-glitch::before {
  color: var(--gs-pink); clip-path: inset(15% 0 50% 0);
  animation: gs-glitch-slice-1 0.8s infinite steps(2);
}
.gs-glitch::after {
  color: var(--gs-cyan); clip-path: inset(55% 0 10% 0);
  animation: gs-glitch-slice-2 0.65s infinite reverse steps(2);
}
@keyframes gs-glitch-slice-1 {
  0% { transform: translate(-8px, -2px); } 30% { transform: translate(6px, 3px); }
  70% { transform: translate(-4px, 1px); } 100% { transform: translate(5px, -1px); }
}
@keyframes gs-glitch-slice-2 {
  0% { transform: translate(8px, 2px); } 30% { transform: translate(-6px, -3px); }
  70% { transform: translate(4px, -2px); } 100% { transform: translate(-5px, 2px); }
}

/* Secret Word */
.gs-word { display: flex; flex-direction: column; align-items: center; gap: 0.4em; margin: 1.5vh 0; }
.gs-word span { font-size: 1.3em; color: var(--gs-dim); }
.gs-word strong {
  font-family: var(--font-cyber); font-size: 3em; color: var(--gs-green);
  background: rgba(10, 25, 15, 0.9); border: 2px solid var(--gs-green);
  padding: 0.2em 0.8em; box-shadow: 0 0 25px rgba(57,255,20,0.5), inset 0 0 15px rgba(57,255,20,0.2);
}

/* Scoreboard */
.gs-scores { display: flex; flex-direction: column; gap: 12px; width: min(850px, 95%); margin: 0 auto; }
.gs-srow {
  display: grid; grid-template-columns: 3.5em 1fr 5em; align-items: center; gap: 1em;
  background: var(--gs-bg-card); border: 1px solid var(--paper, var(--gs-cyan));
  border-left: 5px solid var(--paper, var(--gs-cyan)); padding: 0.5em 1.2em;
  font-size: 1.35em; box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
}
.gs-rank { font-family: var(--font-cyber); color: var(--gs-cyan); }
.gs-spts { text-align: right; color: var(--gs-green); font-family: var(--font-mono); font-weight: 700; }

/* Phone Controller Styles */
body.phone.gs-crt, body.phone.gs-paper {
  background: #0b0314; color: var(--gs-text); font-family: var(--font-mono);
}
body.phone.gs-crt .top, body.phone.gs-paper .top {
  border-bottom: 1px solid rgba(0,240,255,0.3); background: rgba(18, 8, 32, 0.95);
}
body.phone.gs-crt .view h2, body.phone.gs-paper .view h2 {
  font-family: var(--font-cyber); color: var(--gs-cyan); text-shadow: 0 0 8px var(--gs-cyan);
  border-left: 3px solid var(--gs-cyan); padding: 0.2em 0.6em; background: rgba(0, 240, 255, 0.08);
}
body.phone.gs-crt input, body.phone.gs-crt textarea,
body.phone.gs-paper input, body.phone.gs-paper textarea {
  background: rgba(10, 25, 20, 0.85); border: 1px solid var(--gs-green);
  border-radius: 4px; color: var(--gs-green); font-family: var(--font-mono);
  font-size: 1.25em; padding: 0.6em 0.8em;
  box-shadow: 0 0 10px rgba(57, 255, 20, 0.25), inset 0 0 8px rgba(57, 255, 20, 0.1);
}
body.phone.gs-crt .choice, body.phone.gs-paper .choice {
  background: var(--gs-bg-card); border: 1px solid rgba(0,240,255,0.3);
  border-radius: 4px; color: #fff; font-family: var(--font-mono);
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.15);
}
body.phone.gs-crt .choice:active, body.phone.gs-paper .choice:active {
  border-color: var(--gs-cyan); box-shadow: 0 0 16px var(--gs-cyan); transform: scale(0.98);
}
body.phone.gs-crt button.big, body.phone.gs-paper button.big {
  background: linear-gradient(135deg, #00f0ff, #7b3fe4); border: 0; color: #fff;
  font-family: var(--font-cyber); box-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
}
body.phone.gs-crt .wait, body.phone.gs-paper .wait { color: var(--gs-dim); }
body.phone.gs-crt .banner, body.phone.gs-paper .banner {
  background: rgba(18, 10, 32, 0.95); color: var(--gs-cyan); border: 1px solid var(--gs-cyan);
}

/* Secret Glitch Phone Mode */
body.phone.gs-glitch-mode {
  background: #150020 !important;
  animation: gs-phone-tear 2.5s infinite;
}
body.phone.gs-glitch-mode::after {
  content: '⚡ ERROR: INTRUDER PROTOCOL // SEG_FAULT 0x7E ⚡';
  position: fixed; top: 40px; left: 0; right: 0; background: var(--gs-pink);
  color: #fff; font-size: 0.75em; font-weight: 700; letter-spacing: 0.1em;
  text-align: center; padding: 2px 0; z-index: 999;
  animation: gs-glitch-banner-flicker 0.4s infinite alternate;
}
@keyframes gs-phone-tear {
  0%, 92%, 100% { transform: none; filter: none; }
  93% { transform: translate(-4px, 2px) skewX(3deg); filter: hue-rotate(90deg) contrast(150%); }
  95% { transform: translate(5px, -2px) skewX(-4deg); filter: invert(15%); }
  97% { transform: translate(-2px, 1px); }
}
@keyframes gs-glitch-banner-flicker {
  0% { opacity: 0.85; } 100% { opacity: 1; }
}
body.phone.gs-glitch-mode .view h2 {
  color: var(--gs-pink) !important; border-left-color: var(--gs-pink) !important;
  text-shadow: 0 0 10px var(--gs-pink), -2px 0 var(--gs-cyan) !important;
}
body.phone.gs-glitch-mode button.big {
  background: linear-gradient(135deg, var(--gs-pink), var(--gs-purple)) !important;
  box-shadow: 0 0 25px var(--gs-pink) !important;
}
`;
