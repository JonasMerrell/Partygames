// Tin Tongue: 1950s Retro-Mechanical Tin Toy & Blueprint Art Subsystem.
// Inline SVG stamped sheet-metal robot, interlocking brass gears,
// 3D Solari split-flap departure cards, and mechanical keyframes.

export function robot(color = '#ffb84d', mood = 'idle') {
  // Dynamic eye mechanisms
  let eye = '';
  if (mood === 'glitch') {
    eye = `
      <g stroke="#ff3344" stroke-width="7" stroke-linecap="round">
        <line x1="68" y1="88" x2="88" y2="108"/><line x1="88" y1="88" x2="68" y2="108"/>
        <line x1="112" y1="88" x2="132" y2="108"/><line x1="132" y1="88" x2="112" y2="108"/>
      </g>`;
  } else if (mood === 'happy') {
    eye = `
      <path d="M66 102 Q78 86 90 102" stroke="#d4af37" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M110 102 Q122 86 134 102" stroke="#d4af37" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="78" cy="98" r="3" fill="#fff" opacity="0.8"/>
      <circle cx="122" cy="98" r="3" fill="#fff" opacity="0.8"/>`;
  } else {
    eye = `
      <rect x="66" y="86" width="24" height="26" rx="4" fill="#0d1f30" stroke="#4a5d6e" stroke-width="2"/>
      <rect x="110" y="86" width="24" height="26" rx="4" fill="#0d1f30" stroke="#4a5d6e" stroke-width="2"/>
      <line x1="66" y1="99" x2="90" y2="99" stroke="#000" stroke-width="1.5"/>
      <line x1="110" y1="99" x2="134" y2="99" stroke="#000" stroke-width="1.5"/>
      <circle cx="78" cy="99" r="6" fill="#ffe14d"/>
      <circle cx="122" cy="99" r="6" fill="#ffe14d"/>
      <circle cx="80" cy="97" r="2" fill="#fff"/>
      <circle cx="124" cy="97" r="2" fill="#fff"/>`;
  }

  // Dynamic mouth mechanisms
  let mouth = '';
  if (mood === 'talk') {
    mouth = `
      <rect x="74" y="122" width="52" height="18" rx="4" fill="#0d1f30" stroke="#223a52" stroke-width="2"/>
      <g stroke="#5df08a" stroke-width="3">
        <line x1="82" y1="126" x2="82" y2="136"/>
        <line x1="91" y1="126" x2="91" y2="136"/>
        <line x1="100" y1="126" x2="100" y2="136"/>
        <line x1="109" y1="126" x2="109" y2="136"/>
        <line x1="118" y1="126" x2="118" y2="136"/>
      </g>`;
  } else if (mood === 'glitch') {
    mouth = `
      <path d="M72 131 L80 124 L88 134 L96 124 L104 134 L112 124 L120 134 L128 126"
        stroke="#ff3344" stroke-width="5" fill="none" stroke-linejoin="round"/>`;
  } else if (mood === 'happy') {
    mouth = `
      <path d="M74 122 Q100 146 126 122 Z" fill="#0d1f30" stroke="#d4af37" stroke-width="2.5"/>
      <line x1="88" y1="124" x2="88" y2="132" stroke="#fff" stroke-width="2"/>
      <line x1="100" y1="124" x2="100" y2="135" stroke="#fff" stroke-width="2"/>
      <line x1="112" y1="124" x2="112" y2="132" stroke="#fff" stroke-width="2"/>`;
  } else {
    mouth = `
      <rect x="76" y="126" width="48" height="10" rx="3" fill="#0d1f30" stroke="#374857" stroke-width="2"/>
      <line x1="88" y1="127" x2="88" y2="135" stroke="#ffe14d" stroke-width="2"/>
      <line x1="100" y1="127" x2="100" y2="135" stroke="#ffe14d" stroke-width="2"/>
      <line x1="112" y1="127" x2="112" y2="135" stroke="#ffe14d" stroke-width="2"/>`;
  }

  // Chest galvanometer needle angle based on mood
  const needleRot = mood === 'glitch' ? 52 : mood === 'talk' ? 24 : mood === 'happy' ? 38 : -15;

  return `<svg class="tt-bot tt-${mood}" viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <!-- Tinplate Specular Sheen Gradient -->
      <linearGradient id="tt-tin-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#abb5bf"/>
        <stop offset="28%" stop-color="#dbe3eb"/>
        <stop offset="55%" stop-color="#929ea9"/>
        <stop offset="85%" stop-color="#c4cbd3"/>
        <stop offset="100%" stop-color="#7a8793"/>
      </linearGradient>
      <!-- Brass Rivet / Windup Gradient -->
      <radialGradient id="tt-brass-rad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#fff6c7"/>
        <stop offset="45%" stop-color="#d4af37"/>
        <stop offset="85%" stop-color="#8a6e19"/>
        <stop offset="100%" stop-color="#4d3d0c"/>
      </radialGradient>
      <!-- Vacuum Filament Glow Filter -->
      <filter id="tt-filament-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="glow"/>
        <feMerge>
          <feMergeNode in="glow"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Brass Windup Key on Temple (Turns continuously) -->
    <g class="tt-windup-key" transform="translate(172, 70)">
      <rect x="0" y="-3" width="16" height="6" fill="#8a6e19" stroke="#4d3d0c" stroke-width="1.5"/>
      <ellipse cx="22" cy="0" rx="9" ry="14" fill="url(#tt-brass-rad)" stroke="#4d3d0c" stroke-width="2"/>
      <ellipse cx="22" cy="0" rx="4" ry="7" fill="#09233b"/>
    </g>

    <!-- Vacuum Tube Antenna with Filament Coil -->
    <line x1="100" y1="44" x2="100" y2="20" stroke="#4d3d0c" stroke-width="6"/>
    <!-- Glass Tube Bulb -->
    <ellipse cx="100" cy="18" rx="14" ry="16" fill="rgba(200, 240, 255, 0.25)" stroke="#607d8b" stroke-width="2"/>
    <!-- Incandescent Coil inside Bulb -->
    <path class="tt-filament" d="M96 24 Q100 12 104 24 Q100 8 96 16"
      stroke="${mood === 'glitch' ? '#ff3344' : mood === 'happy' ? '#ffe14d' : '#5df08a'}"
      stroke-width="2.5" fill="none" filter="url(#tt-filament-glow)"/>

    <!-- Ear Mount Spools / Pulleys -->
    <rect x="18" y="80" width="18" height="40" rx="4" fill="url(#tt-tin-grad)" stroke="#1a2632" stroke-width="3"/>
    <circle cx="27" cy="100" r="4" fill="url(#tt-brass-rad)"/>
    <rect x="164" y="80" width="18" height="40" rx="4" fill="url(#tt-tin-grad)" stroke="#1a2632" stroke-width="3"/>
    <circle cx="173" cy="100" r="4" fill="url(#tt-brass-rad)"/>

    <!-- Main Head: Stamped Tin Box with Seams -->
    <rect x="34" y="44" width="132" height="116" rx="18" fill="${color}" stroke="#162330" stroke-width="5"/>
    <rect x="38" y="48" width="124" height="108" rx="14" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
    <!-- Bent Crimp Tabs -->
    <rect x="54" y="41" width="10" height="6" fill="url(#tt-tin-grad)" stroke="#162330" stroke-width="1.5"/>
    <rect x="136" y="41" width="10" height="6" fill="url(#tt-tin-grad)" stroke="#162330" stroke-width="1.5"/>
    <!-- Brass Corner Rivets on Head -->
    <circle cx="44" cy="54" r="3.5" fill="url(#tt-brass-rad)" stroke="#162330" stroke-width="1"/>
    <circle cx="156" cy="54" r="3.5" fill="url(#tt-brass-rad)" stroke="#162330" stroke-width="1"/>
    <circle cx="44" cy="150" r="3.5" fill="url(#tt-brass-rad)" stroke="#162330" stroke-width="1"/>
    <circle cx="156" cy="150" r="3.5" fill="url(#tt-brass-rad)" stroke="#162330" stroke-width="1"/>

    <!-- Head Faceplate (Recessed Screen) -->
    <rect x="52" y="74" width="96" height="50" rx="10" fill="#0a1926" stroke="#253a4e" stroke-width="3.5"/>
    ${eye}${mouth}

    <!-- Neck Bellows / Flexible Collar -->
    <rect x="78" y="160" width="44" height="8" rx="2" fill="#304150" stroke="#162330" stroke-width="2"/>

    <!-- Torso: Stamped Sheet Metal Chest with Galvanometer Meter -->
    <rect x="50" y="168" width="100" height="54" rx="10" fill="url(#tt-tin-grad)" stroke="#162330" stroke-width="4.5"/>
    <!-- Corner Screws on Torso -->
    <circle cx="58" cy="176" r="3" fill="url(#tt-brass-rad)"/>
    <circle cx="142" cy="176" r="3" fill="url(#tt-brass-rad)"/>
    <circle cx="58" cy="214" r="3" fill="url(#tt-brass-rad)"/>
    <circle cx="142" cy="214" r="3" fill="url(#tt-brass-rad)"/>

    <!-- Analog Galvanometer Meter -->
    <path d="M72 176 L128 176 L124 204 L76 204 Z" fill="#faf5eb" stroke="#162330" stroke-width="2"/>
    <!-- Meter Dial Arc & Ticks -->
    <path d="M80 198 Q100 184 120 198" fill="none" stroke="#526071" stroke-width="1.5"/>
    <!-- Red Hazard Zone on Right -->
    <path d="M112 189 Q116 193 120 198" fill="none" stroke="#d32f2f" stroke-width="2.5"/>
    <!-- Meter Pivot and Rotating Needle -->
    <circle cx="100" cy="202" r="3" fill="#162330"/>
    <line class="tt-needle" x1="100" y1="202" x2="100" y2="182" stroke="#d32f2f" stroke-width="2" stroke-linecap="round"
      transform="rotate(${needleRot}, 100, 202)"/>

    <!-- Indicator Lenses -->
    <circle cx="82" cy="214" r="4" fill="${mood === 'glitch' ? '#ff3344' : '#64b5f6'}"/>
    <circle cx="100" cy="214" r="4" fill="${mood === 'talk' ? '#5df08a' : '#ffe14d'}"/>
    <circle cx="118" cy="214" r="4" fill="${mood === 'happy' ? '#ffe14d' : '#90a4ae'}"/>

    <!-- Glitch Electrical Malfunction Arc Sparks -->
    ${mood === 'glitch' ? `
      <g stroke="#ffe14d" stroke-width="4" fill="none" stroke-linejoin="round" filter="url(#tt-filament-glow)">
        <path d="M12 50 L28 58 L18 68 L36 78"/>
        <path d="M188 44 L170 54 L180 62 L164 74"/>
        <path d="M90 6 L100 -4 L110 6"/>
      </g>` : ''}
  </svg>`;
}

// Generate interlocking rotating brass drive gear + pinion gear SVG
export function gearsSvg() {
  return `<svg class="tt-gears-cluster" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Outer Drive Gear: 24 teeth in brass finish -->
    <g class="tt-gear tt-gear-main">
      <circle cx="130" cy="130" r="115" stroke="rgba(212,175,55,0.4)" stroke-width="2" fill="none" stroke-dasharray="4 4"/>
      <path d="M130 12 L134 23 L142 24 L149 14 L157 19 L158 31 L166 34 L177 27 L183 35 L179 47 L186 53 L198 49 L202 59 L193 68 L198 76 L211 76 L211 87 L200 93 L202 102 L215 106 L212 117 L199 119 L198 128 L210 136 L204 146 L192 144 L188 153 L198 164 L190 172 L179 166 L173 174 L180 187 L170 193 L162 184 L154 190 L156 204 L145 207 L140 195 L131 199 L129 212 L118 212 L117 199 L108 196 L102 208 L92 204 L95 190 L87 185 L78 194 L69 187 L76 175 L70 167 L58 172 L51 162 L61 153 L57 144 L44 145 L40 135 L52 128 L51 118 L38 115 L38 104 L50 100 L51 91 L39 84 L42 74 L55 75 L58 66 L48 57 L55 48 L67 53 L73 45 L68 33 L78 27 L86 34 L94 29 L94 16 L105 14 L109 26 L119 24 Z"
        fill="#c59b27" stroke="#6b5314" stroke-width="2"/>
      <circle cx="130" cy="130" r="82" fill="#09233b" stroke="#d4af37" stroke-width="3"/>
      <!-- Weight Reduction Cutout Holes -->
      <circle cx="130" cy="80" r="15" fill="#061828" stroke="#c59b27" stroke-width="2"/>
      <circle cx="173" cy="105" r="15" fill="#061828" stroke="#c59b27" stroke-width="2"/>
      <circle cx="173" cy="155" r="15" fill="#061828" stroke="#c59b27" stroke-width="2"/>
      <circle cx="130" cy="180" r="15" fill="#061828" stroke="#c59b27" stroke-width="2"/>
      <circle cx="87" cy="155" r="15" fill="#061828" stroke="#c59b27" stroke-width="2"/>
      <circle cx="87" cy="105" r="15" fill="#061828" stroke="#c59b27" stroke-width="2"/>
    </g>
    <!-- Interlocking Pinion Gear -->
    <g class="tt-gear tt-gear-pinion" transform="translate(208, 48)">
      <circle cx="0" cy="0" r="28" fill="#8a9ba8" stroke="#374857" stroke-width="2.5"/>
      <circle cx="0" cy="0" r="8" fill="#09233b" stroke="#d4af37" stroke-width="2"/>
    </g>
  </svg>`;
}

// 3D Solari split-flap departure board card generator
export function solariCard(word, points = null, result = '') {
  return `<div class="tt-solari ${result ? 'tt-' + result : ''}">
    <div class="tt-solari-flap tt-solari-top">
      <span class="tt-solari-text">${word}</span>
    </div>
    <div class="tt-solari-hinge"></div>
    <div class="tt-solari-flap tt-solari-bottom">
      <span class="tt-solari-text">${word}</span>
    </div>
    ${points != null ? `<div class="tt-solari-badge">${'●'.repeat(points)} ${points}pt</div>` : ''}
  </div>`;
}

// Styles shared by the TV and phone. Injected once per page.
export function injectCss(id, text) {
  document.getElementById(id)?.remove();
  const css = Object.assign(document.createElement('style'), { id });
  css.textContent = text;
  document.head.append(css);
}

export const BOT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Oswald:wght@600;700&display=swap');

  .tt-bot {
    display: block;
    filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.6));
  }
  .tt-bot .tt-filament {
    animation: tt-filament-pulse 1.4s ease-in-out infinite;
  }
  @keyframes tt-filament-pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  .tt-windup-key {
    transform-origin: 0 0;
    animation: tt-windup-spin 4s linear infinite;
  }
  @keyframes tt-windup-spin {
    from { transform: translate(172px, 70px) rotate(0deg); }
    to { transform: translate(172px, 70px) rotate(360deg); }
  }

  .tt-talk {
    animation: tt-bob 0.4s ease-in-out infinite alternate;
  }
  .tt-glitch {
    animation: tt-malfunction 0.08s linear infinite;
  }
  .tt-happy {
    animation: tt-hop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) infinite alternate;
  }

  @keyframes tt-bob {
    to { transform: translateY(-8px) rotate(-1.5deg); }
  }
  @keyframes tt-malfunction {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(-5px, 3px) rotate(-3deg); filter: drop-shadow(0 0 16px #ff3344); }
    75% { transform: translate(5px, -3px) rotate(3deg); filter: drop-shadow(0 0 16px #ff3344); }
  }
  @keyframes tt-hop {
    to { transform: translateY(-16px); }
  }

  /* Interlocking Gear Rotations */
  .tt-gears-cluster {
    position: absolute;
    inset: -14px;
    width: calc(100% + 28px);
    height: calc(100% + 28px);
    pointer-events: none;
    z-index: 1;
  }
  .tt-gear-main {
    transform-origin: 130px 130px;
    animation: tt-gear-cw 40s linear infinite;
  }
  .tt-gear-pinion {
    transform-origin: 208px 48px;
    animation: tt-gear-ccw 20s linear infinite;
  }
  .tt-ring.tt-urgent .tt-gear-main {
    animation: tt-gear-cw 6s linear infinite, tt-gear-jitter 0.07s linear infinite;
  }
  .tt-ring.tt-urgent .tt-gear-pinion {
    animation: tt-gear-ccw 3s linear infinite, tt-gear-jitter 0.07s linear infinite;
  }

  @keyframes tt-gear-cw {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes tt-gear-ccw {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }
  @keyframes tt-gear-jitter {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-1.5px, 1.5px); }
  }

  /* 3D Solari Split-Flap Departure Cards */
  .tt-solari {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    perspective: 600px;
    border-radius: 6px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.7);
    font-family: 'Share Tech Mono', 'Oswald', monospace;
    text-transform: uppercase;
  }
  .tt-solari-flap {
    position: relative;
    overflow: hidden;
    background: #121820;
    color: #faf5eb;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tt-solari-top {
    height: 1.2em;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    border-bottom: 1.5px solid #000;
    box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.15);
    transform-origin: bottom center;
  }
  .tt-solari-bottom {
    height: 1.2em;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    border-top: 1.5px solid rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 -2px 6px rgba(0, 0, 0, 0.6);
    transform-origin: top center;
  }
  .tt-solari-hinge {
    height: 3px;
    background: #000;
    position: relative;
  }
  .tt-solari-hinge::before, .tt-solari-hinge::after {
    content: '';
    position: absolute;
    top: -2px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #d4af37;
  }
  .tt-solari-hinge::before { left: 4px; }
  .tt-solari-hinge::after { right: 4px; }

  /* Solari Card Flip Animation */
  .tt-solari.flip-in {
    animation: tt-solari-drop 0.45s cubic-bezier(0.2, 0.8, 0.3, 1) backwards;
  }
  @keyframes tt-solari-drop {
    0% { transform: perspective(500px) rotateX(85deg); opacity: 0; }
    100% { transform: perspective(500px) rotateX(0deg); opacity: 1; }
  }

  /* Spring Recoil Physics Keyframe */
  @keyframes tt-spring-recoil {
    0% { transform: translateY(12px) scale(0.94); }
    28% { transform: translateY(-7px) scale(1.05); }
    55% { transform: translateY(3px) scale(0.98); }
    80% { transform: translateY(-1.5px) scale(1.01); }
    100% { transform: translateY(0) scale(1); }
  }
`;
