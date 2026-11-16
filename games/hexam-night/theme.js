// Hexam Night look: a moonlit castle of magic, parchment cards, candle gold.
// Shared by the TV and the phones. All art here is original and drawn in SVG.

export const GOLD = '#f3c969';
export const GHOST = '#9fe8ff';
export const BLOOD = '#ff6b6b';

// Proctor Hollowell, the host: a floating ghost in a scholar's cap with
// round spectacles and a quill. `mood` is 'smug' | 'shock' | 'grim'.
export function proctorSvg(mood = 'smug') {
  const mouth = {
    smug: '<path d="M78 112 q14 10 30 -2" stroke="#2b2350" stroke-width="4" fill="none" stroke-linecap="round"/>',
    shock: '<ellipse cx="92" cy="114" rx="9" ry="12" fill="#2b2350"/>',
    grim: '<path d="M76 116 h32" stroke="#2b2350" stroke-width="4" stroke-linecap="round"/>',
  }[mood] || '';
  return `<svg viewBox="0 0 190 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="hxg" cx="50%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#dff6ff"/><stop offset="1" stop-color="#a9dff2"/>
    </radialGradient>
  </defs>
  <ellipse cx="95" cy="222" rx="46" ry="7" fill="#000" opacity=".25"/>
  <path d="M40 120 C40 50 150 50 150 120 L150 190 q-11 18 -22 0 q-11 18 -22 0 q-11 18 -22 0 q-11 18 -22 0 q-11 18 -22 0 Z" fill="url(#hxg)" stroke="#7fc6de" stroke-width="3"/>
  <path d="M150 140 q26 -6 30 -34" stroke="#7fc6de" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M168 60 l14 44 l-6 2 z" fill="#f3c969" stroke="#9a7426" stroke-width="2"/>
  <path d="M176 104 l-3 10" stroke="#2b2350" stroke-width="3" stroke-linecap="round"/>
  <polygon points="40,52 95,30 150,52 95,72" fill="#2b2350"/>
  <rect x="66" y="56" width="58" height="16" rx="3" fill="#2b2350"/>
  <path d="M150 52 q8 20 2 40" stroke="#f3c969" stroke-width="3" fill="none"/>
  <circle cx="152" cy="94" r="5" fill="#f3c969"/>
  <circle cx="76" cy="96" r="14" fill="#fff" stroke="#2b2350" stroke-width="4"/>
  <circle cx="112" cy="96" r="14" fill="#fff" stroke="#2b2350" stroke-width="4"/>
  <path d="M90 96 h8" stroke="#2b2350" stroke-width="4"/>
  <circle cx="${mood === 'shock' ? 76 : 79}" cy="${mood === 'grim' ? 99 : 97}" r="5" fill="#2b2350"/>
  <circle cx="${mood === 'shock' ? 112 : 115}" cy="${mood === 'grim' ? 99 : 97}" r="5" fill="#2b2350"/>
  ${mood === 'grim' ? '<path d="M62 80 l26 8 M126 80 l-26 8" stroke="#2b2350" stroke-width="4" stroke-linecap="round"/>' : ''}
  ${mouth}
</svg>`;
}

const CASTLE = `<svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="#0b0a1c" d="M0 260 V190 L60 180 L90 150 V110 L80 110 L100 60 L120 110 L110 110 V150 L160 150 V120 L150 120 L175 70 L200 120 L190 120 V160 L300 160 V130 h20 v-12 h14 v12 h14 v-12 h14 v12 h20 V170 L420 170 V90 L410 90 L440 20 L470 90 L460 90 V170 L520 170 V120 h16 v-10 h12 v10 h12 v-10 h12 v10 h16 V170 L640 170 V60 L628 60 L660 0 L692 60 L680 60 V170 L760 170 V140 L750 140 L775 95 L800 140 L790 140 V170 L880 170 V120 h18 v-12 h14 v12 h14 v-12 h14 v12 h18 V175 L1010 175 V100 L1000 100 L1030 40 L1060 100 L1050 100 V180 L1120 185 L1200 195 V260 Z"/>
  <g fill="#f3c969">
    <rect x="96" y="120" width="8" height="14" rx="4"/><rect x="171" y="128" width="8" height="12" rx="4" opacity=".7"/>
    <rect x="434" y="100" width="10" height="16" rx="5"/><rect x="434" y="130" width="10" height="16" rx="5" opacity=".6"/>
    <rect x="654" y="72" width="12" height="18" rx="6"/><rect x="654" y="104" width="12" height="18" rx="6" opacity=".8"/><rect x="654" y="136" width="12" height="18" rx="6" opacity=".5"/>
    <rect x="770" y="148" width="9" height="12" rx="4"/><rect x="1024" y="112" width="10" height="16" rx="5" opacity=".8"/>
    <rect x="320" y="176" width="9" height="12" rx="4" opacity=".6"/><rect x="560" y="182" width="9" height="12" rx="4"/><rect x="920" y="186" width="9" height="12" rx="4" opacity=".7"/>
  </g>
</svg>`;

/** The castle backdrop for the TV: stars, a moon and the castle skyline. */
export function backdrop() {
  const d = document.createElement('div');
  d.className = 'hx-sky';
  let stars = '';
  for (let i = 0; i < 70; i++) {
    const x = (i * 137.5) % 100, y = (i * 61.8) % 62, s = 1 + (i % 3);
    stars += `<i style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${(i % 7) * .6}s"></i>`;
  }
  d.innerHTML = `<div class="hx-stars">${stars}</div><div class="hx-moon"></div><div class="hx-castle">${CASTLE}</div>`;
  return d;
}

export function cauldronSvg() {
  return `<svg viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g fill="#7dffb0" opacity=".85"><circle cx="62" cy="22" r="9"><animate attributeName="cy" values="40;6;40" dur="2.2s" repeatCount="indefinite"/></circle>
  <circle cx="96" cy="30" r="6"><animate attributeName="cy" values="44;10;44" dur="1.7s" repeatCount="indefinite"/></circle></g>
  <ellipse cx="80" cy="48" rx="62" ry="12" fill="#7dffb0"/>
  <path d="M16 50 Q14 120 80 122 Q146 120 144 50 Z" fill="#26233f" stroke="#0e0c22" stroke-width="4"/>
  <ellipse cx="80" cy="48" rx="66" ry="12" fill="none" stroke="#3d3960" stroke-width="8"/>
  <path d="M40 118 l-10 18 M120 118 l10 18" stroke="#26233f" stroke-width="8" stroke-linecap="round"/>
  <path d="M40 80 q8 -16 22 -20" stroke="#4a4580" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;
}

export function tombSvg(name) {
  const n = String(name).replace(/[&<>"']/g, '');
  return `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M14 146 V58 a46 46 0 0 1 92 0 V146 Z" fill="#6b6a7d" stroke="#3a3950" stroke-width="4"/>
  <path d="M26 140 V60 a34 34 0 0 1 68 0 V140" fill="none" stroke="#8a899c" stroke-width="2"/>
  <text x="60" y="58" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="16" fill="#2a2940">R.I.P.</text>
  <text x="60" y="92" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="${n.length > 9 ? 11 : 15}" font-weight="700" fill="#1d1c30">${n}</text>
  <path d="M0 146 h120" stroke="#2c5a2f" stroke-width="8"/>
</svg>`;
}

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@600;800&family=Crimson+Pro:wght@500;700&display=swap');
.hx, body.hx-phone {
  --fg: #f6eedb; --dim: #b9b0d6; --card: #1d1a3a; --line: #4a4380; --bg2: #16142e;
  --accent: ${GOLD}; --err: ${BLOOD};
  font-family: 'Crimson Pro', Georgia, 'Times New Roman', serif; color: var(--fg);
}
body.hx-phone { background: radial-gradient(700px 500px at 50% -10%, #3b2f7a 0%, transparent 70%), #0e0c22; background-attachment: fixed; min-height: 100vh; }
body.hx-phone h2, .hx h1, .hx h2 { font-family: 'Cinzel', Georgia, serif; letter-spacing: .02em; }
body.hx-phone .choice { background: #f1e4c3; color: #2a1f12; border-color: #b89a5e; font-family: 'Crimson Pro', Georgia, serif; font-size: 1.2em; }
body.hx-phone .choice:active, body.hx-phone .choice.on { background: #ffe9a8; border-color: var(--accent); }
body.hx-phone .top { border-color: #3a336b; }
body.hx-phone button.big { font-family: 'Cinzel', Georgia, serif; }

.hx .stage { position: relative; z-index: 1; }
.hx-sky { position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(1000px 600px at 70% 0%, #3b2f7a 0%, transparent 65%), linear-gradient(#0d0b25, #1a1440 70%, #120f2c); }
.hx-stars i { position: absolute; background: #fff; border-radius: 50%; opacity: .7; animation: hxtw 4s ease-in-out infinite alternate; }
@keyframes hxtw { to { opacity: .15; } }
.hx-moon { position: absolute; right: 11%; top: 14%; width: 9vw; height: 9vw; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fffbe8, #e9dfb8 60%, #cbbf94); box-shadow: 0 0 80px 20px rgba(255,245,200,.25); }
.hx-castle { position: absolute; left: 0; right: 0; bottom: 0; height: 22vh; opacity: .9; }
.hx-castle svg { width: 100%; height: 100%; display: block; }
.hx .hostbar { position: relative; z-index: 2; color: var(--dim); }
.hx .timer { font-family: 'Cinzel', Georgia, serif; color: var(--accent); }

.hx-title { font-family: 'Cinzel Decorative', 'Cinzel', Georgia, serif; font-weight: 900; font-size: 4.6em; line-height: 1;
  color: var(--accent); text-shadow: 0 0 30px rgba(243,201,105,.45), 0 4px 0 #6b4c12; margin: 0; }
.hx-tag { font-size: 1.5em; color: var(--dim); font-style: italic; margin: 0; }

.hx-host { display: flex; align-items: center; gap: 2.5vw; max-width: 1400px; width: 100%; justify-content: center; }
.hx-proc { width: 13vw; min-width: 120px; flex: none; animation: hxfloat 3.2s ease-in-out infinite; filter: drop-shadow(0 0 22px rgba(159,232,255,.45)); }
.hx-proc.small { width: 8vw; min-width: 80px; }
@keyframes hxfloat { 50% { transform: translateY(-14px) rotate(-2deg); } }
.hx-bubble { background: #f1e4c3; color: #2a1f12; border-radius: 26px; padding: .8em 1.2em; font-size: 1.6em; line-height: 1.25;
  position: relative; max-width: 60vw; text-align: left; box-shadow: 0 10px 30px rgba(0,0,0,.4); animation: hxin .35s ease-out; }
.hx-bubble::before { content: ''; position: absolute; left: -22px; top: 40%; border: 14px solid transparent; border-right: 22px solid #f1e4c3; border-left: 0; }
.hx-bubble b { color: #7a1f1f; }
.hx-bubble small { display: block; font-size: .65em; color: #6b5a3f; margin-top: .4em; }
@keyframes hxin { from { transform: scale(.85); opacity: 0; } }

.hx-kicker { font-family: 'Cinzel', Georgia, serif; color: var(--accent); letter-spacing: .2em; text-transform: uppercase; font-size: 1em; margin: 0; }
.hx-q { font-family: 'Crimson Pro', Georgia, serif !important; letter-spacing: 0 !important; font-size: 2.6em; font-weight: 700; max-width: 1400px; line-height: 1.15; margin: 0; text-shadow: 0 2px 8px rgba(0,0,0,.6); }
.hx-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1em 1.6vw; width: min(1400px, 92vw); }
.hx-opt { background: #f1e4c3; color: #2a1f12; border: 3px solid #b89a5e; border-radius: 18px; padding: .6em .9em; font-size: 1.45em; font-weight: 700;
  text-align: left; display: flex; gap: .6em; align-items: center; min-height: 3.2em; position: relative; transition: all .4s; }
.hx-opt .l { font-family: 'Cinzel', Georgia, serif; font-weight: 800; background: #2b2350; color: var(--accent); border-radius: 50%;
  width: 1.8em; height: 1.8em; display: grid; place-items: center; flex: none; font-size: .85em; }
.hx-opt .who { position: absolute; z-index: 2; right: .5em; bottom: -.9em; display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.hx-opt.dim { opacity: .5; transform: scale(.97); }
.hx-opt.right { background: #ffe9a8; border-color: #5df08a; box-shadow: 0 0 0 5px #5df08a, 0 0 40px rgba(93,240,138,.5); }
.hx-pip { font-size: .6em; font-weight: 800; padding: 2px 8px; border-radius: 99px; background: var(--c); color: #120f1d; white-space: nowrap; }
.hx-pip.ghost { background: #241d45; color: ${GHOST}; border: 2px dashed ${GHOST}; }

.hx-roster { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; max-width: 1400px; }
.hx-chip { border: 3px solid var(--c); background: color-mix(in srgb, var(--c) 18%, #14122c); border-radius: 99px; padding: 6px 16px;
  font-weight: 700; font-size: 1.05em; transition: all .3s; }
.hx-chip.ghost { border-style: dashed; border-color: ${GHOST}; color: ${GHOST}; background: rgba(159,232,255,.08); opacity: .8; }
.hx-chip.done { box-shadow: 0 0 0 3px var(--accent); }
.hx-chip.done::after { content: ' ✓'; color: var(--accent); }

.hx-board { display: flex; flex-direction: column; gap: 10px; width: min(900px, 90vw); }
.hx-row { display: flex; align-items: center; gap: 16px; background: rgba(29,26,58,.85); border: 2px solid var(--line); border-radius: 16px; padding: 10px 18px; font-size: 1.3em; animation: hxin .3s ease-out backwards; }
.hx-row .n { flex: 1; text-align: left; font-weight: 700; }
.hx-row .s { font-family: 'Cinzel', Georgia, serif; font-weight: 800; color: var(--accent); }
.hx-row.ghost { border-style: dashed; border-color: ${GHOST}; }
.hx-row.ghost .n { color: ${GHOST}; }

.hx-tombs { display: flex; gap: 3vw; justify-content: center; flex-wrap: wrap; }
.hx-tomb { width: 11vw; min-width: 110px; animation: hxrise .8s cubic-bezier(.2,1.4,.4,1) backwards; }
@keyframes hxrise { from { transform: translateY(60px); opacity: 0; } }
.hx-ghostup { font-size: 1.3em; color: ${GHOST}; }

/* mini-games */
.hx-stairs { display: flex; gap: 2vw; align-items: flex-end; justify-content: center; width: min(1400px, 94vw); }
.hx-stair { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: transform 1.2s ease-in, opacity 1.2s; }
.hx-steps { width: 100%; display: flex; flex-direction: column; gap: 4px; }
.hx-steps i { display: block; height: 2.2vh; background: linear-gradient(#8f86b8, #5d5588); border-radius: 4px; box-shadow: 0 3px 0 #2e2950; }
.hx-steps i:nth-child(odd) { margin-left: 12%; } .hx-steps i:nth-child(even) { margin-right: 12%; }
.hx-stair .nm { font-family: 'Cinzel', Georgia, serif; color: var(--accent); font-size: 1em; }
.hx-stair .on { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; min-height: 1.6em; }
.hx-stair.shake { animation: hxshake .12s linear infinite; }
.hx-stair.fall { transform: translateY(80vh) rotate(8deg); opacity: 0; }
@keyframes hxshake { 50% { transform: translateX(6px) rotate(1deg); } }

.hx-curse { font-family: 'Cinzel', Georgia, serif; font-weight: 800; font-size: 5em; color: #c9b6ff; letter-spacing: .12em; text-shadow: 0 0 30px #7b3fe4; }
.hx-candles { position: relative; width: min(1300px, 92vw); height: 52vh; }
.hx-candle { position: absolute; width: 1.1vw; min-width: 10px; height: 5vh; background: linear-gradient(90deg, #efe5c8, #fffaf0, #d8ccaa); border-radius: 3px;
  animation: hxbob 2.6s ease-in-out infinite; }
.hx-candle::before { content: ''; position: absolute; left: 50%; top: -2.2vh; width: .9vw; min-width: 8px; height: 2.2vh; transform: translateX(-50%);
  background: radial-gradient(ellipse at 50% 70%, #fff6c0, #ffb02e 55%, transparent 70%); border-radius: 50% 50% 40% 40%; animation: hxflick .15s infinite alternate; }
.hx-candles.out .hx-candle { opacity: 0; transition: opacity .25s; }
@keyframes hxbob { 50% { transform: translateY(-1.2vh); } }
@keyframes hxflick { to { transform: translateX(-50%) scaleY(.85); } }
.hx-brew { display: flex; gap: 1.4vw; justify-content: center; min-height: 14vh; align-items: center; }
.hx-drop { font-size: 6em; animation: hxin .3s ease-out; }
.hx-cauldron { width: 14vw; min-width: 140px; }
.hx-big { font-family: 'Cinzel', Georgia, serif; font-size: 3em; color: var(--accent); margin: 0; }

/* finale */
.hx-track { display: flex; flex-direction: column; gap: 8px; width: min(1500px, 94vw); }
.hx-lane { display: grid; grid-template-columns: 10em 1fr; align-items: center; gap: 12px; }
.hx-lane .n { text-align: right; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hx-lane.ghost .n { color: ${GHOST}; }
.hx-path { position: relative; height: 2.2em; border-radius: 99px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 calc(100%/var(--len) - 3px), transparent 0 calc(100%/var(--len))); border: 2px solid var(--line); }
.hx-path::after { content: '🚪'; position: absolute; right: -1.6em; top: 50%; transform: translateY(-50%); font-size: 1.2em; }
.hx-token { position: absolute; top: 50%; width: 1.8em; height: 1.8em; margin-left: -.9em; transform: translateY(-50%); border-radius: 50%; background: var(--c);
  border: 3px solid #fff; transition: left .9s cubic-bezier(.3,1.4,.5,1); display: grid; place-items: center; font-size: .9em; }
.hx-lane.ghost .hx-token { background: rgba(159,232,255,.25); border: 3px dashed ${GHOST}; }
`;
