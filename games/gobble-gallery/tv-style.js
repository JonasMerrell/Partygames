// Gobble Gallery TV styles — Claymation & Plasticine Stop-Motion. Sizes use --fw/--fh, 1% of the 16:9 TV frame.
export function addStyles() {
  if (!document.getElementById('gg-font')) {
    document.head.append(Object.assign(document.createElement('link'), { id: 'gg-font', rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap' }));
  }

  // Inject SVG Claymation bevel & texture filters if not already present
  if (!document.getElementById('gg-filters')) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'gg-filters';
    svg.setAttribute('style', 'position: absolute; width: 0; height: 0; pointer-events: none;');
    svg.innerHTML = `
      <defs>
        <filter id="gg-clay-bevel" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feDiffuseLighting in="displaced" lighting-color="#fff8ed" surfaceScale="2" result="light">
            <feDistantLight azimuth="55" elevation="65" />
          </feDiffuseLighting>
          <feComposite in="displaced" in2="light" operator="arithmetic" k1="1.1" k2="0.1" k3="0" k4="0" result="lit" />
          <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#2a1205" flood-opacity="0.45" />
        </filter>
        <filter id="gg-clay-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#2c1408" flood-opacity="0.55" />
        </filter>
      </defs>
    `;
    document.body.append(svg);
  }

  document.getElementById('gg-css')?.remove();
  document.head.append(Object.assign(document.createElement('style'), { id: 'gg-css', textContent: `
  .gg { --cream: #fff6e5; --ink: #4a2a12; --orange: #f2a541; --font: 'Fredoka', ui-rounded, system-ui, sans-serif;
    position: absolute; inset: 0; z-index: 0; overflow: hidden;
    --fw: calc(min(100vw, 100vh * 16 / 9) / 100); --fh: calc(min(100vh, 100vw * 9 / 16) / 100); font-family: var(--font); color: var(--cream);
    background:
      radial-gradient(ellipse 1100px 700px at 50% 12%, rgba(255, 238, 204, 0.22) 0%, transparent 68%),
      radial-gradient(900px 600px at 100% 100%, #52210f 0%, transparent 60%),
      linear-gradient(180deg, #421e0f 0%, #2e1408 50%, #1e0b04 100%); }
  .game:has(.gg) .hostbar { position: relative; z-index: 2; padding: 0 calc(1 * var(--fw)); color: #ffe2b8; }
  .gg-leaves span { position: absolute; top: calc(-8 * var(--fh)); font-size: calc(4 * var(--fh)); opacity: .45; animation: gg-fall 12s steps(12, end) infinite; }
  @keyframes gg-fall { to { transform: translate(calc(8 * var(--fw)), calc(116 * var(--fh))) rotate(540deg); } }
  .gg-page { position: absolute; inset: 0; padding: calc(9 * var(--fh)) calc(4 * var(--fw)) calc(6 * var(--fh)); display: flex; flex-direction: column; gap: calc(2.5 * var(--fh)); }
  .gg-center { align-items: center; justify-content: center; text-align: center; }
  .gg-logo { font-size: 5.2em; margin: 0; font-weight: 700; color: var(--cream); text-shadow: 0 .08em 0 #7a3412, 0 .15em .3em rgba(0,0,0,.6); }
  .gg-logo span { color: var(--orange); }
  .gg-title { font-size: 3em; margin: 0; font-weight: 700; text-shadow: 0 .06em 0 #2a1205, 0 .1em .25em rgba(0,0,0,.5); }
  .gg-title.pop { animation: gg-clay-pop .4s steps(6, end); }
  .gg-sub { font-size: 1.4em; margin: 0; color: #ffe2b8; max-width: 1200px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }

  /* 12fps Stepped Mascot Stop-Motion Animations */
  .gg-mascot { width: calc(32 * var(--fh)); height: calc(32 * var(--fh)); animation: gg-bob 0.5s steps(6, end) infinite; }
  .gg-mascot.small { width: calc(20 * var(--fh)); height: calc(20 * var(--fh)); }
  .gg-mascot svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 calc(1.5 * var(--fh)) calc(2.5 * var(--fh)) rgba(0,0,0,.5)); }
  .gg-mascot .gg-tail { transform-origin: 100px 112px; animation: gg-fan 0.8s steps(8, end) infinite; }
  .gg-mascot.draw .gg-head { animation: gg-nod 0.4s steps(4, end) infinite; transform-origin: 100px 100px; }
  .gg-mascot.party { animation: gg-hop 0.65s steps(8, end) infinite; }

  @keyframes gg-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(calc(-2.5 * var(--fh))); }
  }
  @keyframes gg-hop {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(calc(-4.5 * var(--fh))) rotate(-5deg); }
  }
  @keyframes gg-fan {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.08) rotate(3deg); }
  }
  @keyframes gg-nod {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-10deg); }
  }
  @keyframes gg-wiggle {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(5deg); }
  }

  /* Squash & Stretch Clay Morph Keyframes */
  @keyframes gg-clay-pop {
    0% { transform: scale(0.35); opacity: 0; }
    60% { transform: scale(1.22, 0.82); opacity: 1; }
    80% { transform: scale(0.92, 1.12); }
    100% { transform: scale(1, 1); }
  }

  @keyframes gg-clay-slam {
    0% { transform: translateY(calc(-30 * var(--fh))) scale(0.85, 1.25); opacity: 0; }
    65% { transform: translateY(calc(2.5 * var(--fh))) scale(1.18, 0.82); opacity: 1; }
    85% { transform: translateY(calc(-1 * var(--fh))) scale(0.95, 1.05); }
    100% { transform: translateY(0) scale(1, 1); }
  }

  .gg-how { display: flex; gap: calc(3 * var(--fw)); flex-wrap: wrap; justify-content: center; }
  .gg-step {
    background: var(--cream); color: var(--ink); border-radius: 28px; padding: calc(3 * var(--fh)) calc(2 * var(--fw)); width: calc(15 * var(--fw)); min-width: 160px;
    display: flex; flex-direction: column; gap: calc(1 * var(--fh)); font-size: 1.3em;
    box-shadow: inset 0 3px 0 rgba(255,255,255,0.8), inset 0 -4px 0 rgba(0,0,0,0.15), 0 calc(1.2 * var(--fh)) 0 #2a1205, 0 calc(1.8 * var(--fh)) calc(3 * var(--fh)) rgba(0,0,0,0.4);
    border: 3px solid #dfcba5;
    animation: gg-clay-pop 0.5s steps(6, end) backwards;
  }
  .gg-big { font-size: 3em; }
  .gg-easels { display: flex; gap: calc(2 * var(--fw)); flex-wrap: wrap; justify-content: center; max-width: 1500px; }
  .gg-easel { display: flex; flex-direction: column; align-items: center; gap: calc(1 * var(--fh)); transform: rotate(var(--r)); font-weight: 700; font-size: 1.2em; }
  
  /* Chunky Plasticine Easel */
  .gg-canvas {
    width: calc(9 * var(--fw)); min-width: 90px; aspect-ratio: 1;
    background: var(--cream);
    border: calc(.7 * var(--fh)) solid #8b5a2b;
    border-radius: 16px;
    display: grid; place-items: center; font-size: 2.2em; color: #4f9d5d;
    box-shadow: inset 0 3px 0 rgba(255,255,255,0.7), inset 0 -3px 0 rgba(0,0,0,0.2), 0 calc(.9 * var(--fh)) 0 #4a2a12, 0 calc(1.4 * var(--fh)) calc(2 * var(--fh)) rgba(0,0,0,0.4);
    position: relative;
  }
  .gg-easel:not(.done) .gg-canvas { animation: gg-wiggle 0.6s steps(6, end) infinite; }
  .gg-easel.done .gg-canvas { background: #e3f6d8; border-color: var(--c); }
  .gg-easel > span { color: var(--c); text-shadow: 0 2px 4px rgba(0,0,0,0.4); }
  .gg-eava { font-size: 1.3em; }
  .gg-emark {
    position: absolute; right: -.35em; bottom: -.35em; font-size: .55em; background: var(--cream); border-radius: 99px;
    width: 1.5em; height: 1.5em; display: grid; place-items: center;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 3px 0 #2a1205; color: #4f9d5d;
    border: 2px solid #8b5a2b;
  }
  .gg-easel:not(.done) .gg-emark { animation: gg-wiggle 0.6s steps(6, end) infinite; }
  .gg-canvas.ava { font-size: 3em; }
  .gg-easels.many .gg-canvas { width: calc(7 * var(--fw)); min-width: 70px; }
  .gg-easels.many { gap: calc(1.4 * var(--fw)); }
  .gg-ava { margin-right: .3em; }
  .gg-scores.many { gap: calc(.8 * var(--fh)); font-size: .8em; }
  .gg-awards.many .gg-award { min-width: 0; font-size: .8em; padding: calc(1 * var(--fh)) calc(1 * var(--fw)); }
  .gg-easel.away { opacity: .4; }

  .gg-guess { padding-bottom: calc(9 * var(--fh)); }
  .gg-count { font-weight: 700; color: #ffd08a; letter-spacing: .08em; font-size: 1.1em; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
  .gg-guess-body { flex: 1; min-height: 0; display: flex; gap: calc(3 * var(--fw)); align-items: center; justify-content: center; }

  /* Chunky Sculpted Plasticine Picture Frame */
  .gg-frame {
    position: relative; height: calc(58 * var(--fh)); aspect-ratio: 1; padding: calc(2 * var(--fh)); flex: none;
    background: linear-gradient(135deg, #e59f38, #b26815);
    border: calc(1.6 * var(--fh)) solid #c97a2b;
    border-radius: 26px;
    box-shadow:
      inset 0 calc(.6 * var(--fh)) 0 rgba(255,255,255,0.65),
      inset 0 calc(-.6 * var(--fh)) 0 rgba(0,0,0,0.35),
      0 calc(1.8 * var(--fh)) 0 #6e3a10,
      0 calc(2.6 * var(--fh)) calc(4 * var(--fh)) rgba(0,0,0,0.6);
    animation: gg-clay-slam 0.4s steps(6, end) ease-out;
  }
  .gg-frame img { width: 100%; height: 100%; background: #fff; border-radius: 8px; display: block; box-shadow: inset 0 0 12px rgba(0,0,0,0.3); }
  .gg-tag {
    position: absolute; left: 50%; bottom: calc(-2.4 * var(--fh)); transform: translateX(-50%); background: var(--cream); color: var(--ink);
    padding: calc(.5 * var(--fh)) calc(1.4 * var(--fw)); border-radius: 99px; font-size: 1.2em; white-space: nowrap;
    animation: gg-clay-pop 0.4s steps(6, end) ease-out;
    box-shadow: inset 0 2px 0 rgba(255,255,255,0.8), 0 calc(.6 * var(--fh)) 0 #2a1205, 0 calc(1 * var(--fh)) calc(2 * var(--fh)) rgba(0,0,0,0.4);
    border: 2px solid #dfcba5;
  }

  /* Sculpted Plasticine Bevel Choice Tiles */
  .gg-tiles { display: grid; grid-template-columns: 1fr; gap: calc(1.8 * var(--fh)); width: min(calc(38 * var(--fw)), 720px); }
  .gg-tile {
    background: var(--c); color: #fff;
    border-radius: 26px;
    padding: calc(1.6 * var(--fh)) calc(1.4 * var(--fw));
    display: grid;
    grid-template-columns: auto auto 1fr; grid-template-rows: auto auto; align-items: center; column-gap: calc(1 * var(--fw));
    box-shadow:
      inset 0 4px 0 rgba(255,255,255,0.55),
      inset 0 -5px 0 rgba(0,0,0,0.35),
      0 calc(1 * var(--fh)) 0 color-mix(in srgb, var(--c) 45%, #000),
      0 calc(1.6 * var(--fh)) calc(2.5 * var(--fh)) rgba(0,0,0,0.45);
    text-align: left;
    transition: transform .25s steps(4, end), opacity .3s, filter .3s;
  }
  .gg-shape { font-size: 1.6em; text-shadow: 0 .05em 0 #0005; }
  .gg-emoji { font-size: 2em; }
  .gg-text { font-size: 1.45em; font-weight: 700; text-shadow: 0 .05em 0 #0005; line-height: 1.1; }
  .gg-who { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: calc(.5 * var(--fw)); }
  .gg-who:empty { display: none; }
  .gg-chip {
    font-size: .85em; font-weight: 700; padding: calc(.2 * var(--fh)) calc(.8 * var(--fw)); border-radius: 99px; color: #1a1a1a; margin-top: calc(.6 * var(--fh));
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 4px rgba(0,0,0,0.3);
    animation: gg-clay-pop .35s steps(6, end) ease-out;
  }
  .gg-tile.yes {
    transform: scale(1.06);
    box-shadow:
      inset 0 5px 0 #fff,
      0 0 0 calc(.6 * var(--fh)) #fff,
      0 0 calc(4 * var(--fh)) rgba(255,255,255,0.7),
      0 calc(1.6 * var(--fh)) calc(3 * var(--fh)) rgba(0,0,0,0.5);
    animation: gg-shine 0.8s steps(6, end) 2;
  }
  .gg-tile.no { opacity: .45; filter: saturate(.4); transform: scale(.95); }
  @keyframes gg-shine { 50% { transform: scale(1.12); } }

  .gg-q { margin-top: calc(3.5 * var(--fh)); text-align: center; display: flex; flex-direction: column; gap: calc(.6 * var(--fh)); }
  .gg-q b { font-size: 2.2em; text-shadow: 0 3px 6px rgba(0,0,0,0.5); }
  .gg-fx { position: absolute; inset: 0; pointer-events: none; }
  .gg-fly { position: absolute; bottom: calc(4 * var(--fh)); font-size: calc(7 * var(--fh)); animation: gg-fly 2.4s steps(12, end) forwards; }
  @keyframes gg-fly { to { transform: translate(var(--x), calc(-75 * var(--fh))) scale(1.4); opacity: 0; } }

  .gg-scores { width: min(1100px, calc(92 * var(--fw))); display: flex; flex-direction: column; gap: calc(1.6 * var(--fh)); }
  .gg-srow {
    display: grid; grid-template-columns: 9em 1fr 5em; gap: calc(1.2 * var(--fw)); align-items: center; font-weight: 700; font-size: 1.35em;
    text-align: left; animation: gg-slide .4s steps(6, end) backwards; animation-delay: var(--d);
  }
  @keyframes gg-slide { from { transform: translateX(calc(-10 * var(--fw))); opacity: 0; } }
  .gg-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 .05em 0 #0006; }
  .gg-sbar { height: 1.3em; background: #0004; border-radius: 99px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.4); }
  .gg-sbar div { height: 100%; border-radius: 99px; box-shadow: inset 0 2px 0 rgba(255,255,255,0.6); }
  .gg-snum { text-align: right; text-shadow: 0 .05em 0 #0006; }

  .gg-wall { flex: 1; display: flex; flex-wrap: wrap; gap: calc(2.4 * var(--fh)) calc(2 * var(--fw)); justify-content: center; align-content: center; }
  .gg-mini {
    margin: 0; background: var(--cream); color: var(--ink); padding: calc(1 * var(--fh)) calc(1 * var(--fh)) calc(1.2 * var(--fh)); border-radius: 12px; width: var(--w, calc(15 * var(--fh))); min-width: 120px;
    transform: rotate(var(--r)); box-shadow: 0 calc(1 * var(--fh)) calc(2 * var(--fh)) #0007;
    border: 2px solid #dfcba5;
    animation: gg-clay-pop .4s steps(6, end) backwards; animation-delay: var(--d);
  }
  .gg-mini img { width: 100%; aspect-ratio: 1; background: #fff; display: block; border-radius: 6px; }
  .gg-mini figcaption { font-size: calc(var(--w, calc(15 * var(--fh))) / 7.5); font-weight: 700; line-height: 1.15; margin-top: calc(.6 * var(--fh)); display: flex; flex-direction: column; }
  .gg-mini small { font-size: .95em; color: #1a1a1a; border-radius: 99px; padding: 0 .6em; margin-top: calc(.4 * var(--fh)); align-self: center; }

  .gg-awards { display: flex; flex-wrap: wrap; gap: calc(2 * var(--fh)) calc(1.6 * var(--fw)); justify-content: center; max-width: 1500px; }
  .gg-award {
    background: var(--cream); color: var(--ink); border-top: calc(1.2 * var(--fh)) solid var(--c); border-radius: 20px; padding: calc(1.4 * var(--fh)) calc(1.4 * var(--fw));
    min-width: calc(13 * var(--fw)); display: flex; flex-direction: column; gap: calc(.4 * var(--fh));
    box-shadow: inset 0 2px 0 rgba(255,255,255,0.7), 0 calc(.8 * var(--fh)) 0 #2a1205, 0 calc(1.2 * var(--fh)) calc(2 * var(--fh)) rgba(0,0,0,0.4);
    border: 2px solid #dfcba5; border-top: calc(1.2 * var(--fh)) solid var(--c);
    animation: gg-clay-pop .4s steps(6, end) backwards; animation-delay: var(--d);
  }
  .gg-aname { font-weight: 700; font-size: 1.3em; }
  .gg-atitle { font-size: 1.15em; }
  .gg-award small { opacity: .7; }
  ` }));
}
