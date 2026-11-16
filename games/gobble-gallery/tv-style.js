// Gobble Gallery TV styles. Sizes use --fw/--fh, 1% of the 16:9 TV frame.
export function addStyles() {
  if (!document.getElementById('gg-font')) {
    document.head.append(Object.assign(document.createElement('link'), { id: 'gg-font', rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap' }));
  }
  document.getElementById('gg-css')?.remove();
  document.head.append(Object.assign(document.createElement('style'), { id: 'gg-css', textContent: `
  .gg { --cream: #fff6e5; --ink: #4a2a12; --orange: #f2a541; --font: 'Fredoka', ui-rounded, system-ui, sans-serif;
    position: absolute; inset: 0; z-index: 0; overflow: hidden;
    --fw: calc(min(100vw, 100vh * 16 / 9) / 100); --fh: calc(min(100vh, 100vw * 9 / 16) / 100); font-family: var(--font); color: var(--cream);
    background: radial-gradient(1200px 700px at 50% 0%, #a8501f 0%, transparent 65%),
      radial-gradient(900px 600px at 100% 100%, #6b2d1a 0%, transparent 60%), #3b1d10; }
  .game:has(.gg) .hostbar { position: relative; z-index: 2; padding: 0 calc(1 * var(--fw)); color: #ffe2b8; }
  .gg-leaves span { position: absolute; top: calc(-8 * var(--fh)); font-size: calc(4 * var(--fh)); opacity: .35; animation: gg-fall linear infinite; }
  @keyframes gg-fall { to { transform: translate(calc(8 * var(--fw)), calc(116 * var(--fh))) rotate(540deg); } }
  .gg-page { position: absolute; inset: 0; padding: calc(9 * var(--fh)) calc(4 * var(--fw)) calc(6 * var(--fh)); display: flex; flex-direction: column; gap: calc(2.5 * var(--fh)); }
  .gg-center { align-items: center; justify-content: center; text-align: center; }
  .gg-logo { font-size: 5.2em; margin: 0; font-weight: 700; color: var(--cream); text-shadow: 0 .08em 0 #7a3412; }
  .gg-logo span { color: var(--orange); }
  .gg-title { font-size: 3em; margin: 0; font-weight: 700; text-shadow: 0 .06em 0 #0005; }
  .gg-title.pop { animation: gg-pop .5s ease-out; }
  .gg-sub { font-size: 1.4em; margin: 0; color: #ffe2b8; max-width: 1200px; }
  @keyframes gg-pop { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.08); } }
  .gg-mascot { width: calc(32 * var(--fh)); height: calc(32 * var(--fh)); animation: gg-bob 1.6s ease-in-out infinite; }
  .gg-mascot.small { width: calc(20 * var(--fh)); height: calc(20 * var(--fh)); }
  .gg-mascot svg { width: 100%; height: 100%; overflow: visible; }
  .gg-mascot .gg-tail { transform-origin: 100px 112px; animation: gg-fan 2.4s ease-in-out infinite; }
  .gg-mascot.draw .gg-head { animation: gg-nod .6s ease-in-out infinite; transform-origin: 100px 100px; }
  .gg-mascot.party { animation: gg-hop .7s ease-in-out infinite; }
  @keyframes gg-bob { 50% { transform: translateY(calc(-2 * var(--fh))); } }
  @keyframes gg-hop { 50% { transform: translateY(calc(-4 * var(--fh))) rotate(-4deg); } }
  @keyframes gg-fan { 50% { transform: scale(1.06) rotate(2deg); } }
  @keyframes gg-nod { 50% { transform: rotate(-8deg); } }
  .gg-how { display: flex; gap: calc(3 * var(--fw)); flex-wrap: wrap; justify-content: center; }
  .gg-step { background: var(--cream); color: var(--ink); border-radius: 28px; padding: calc(3 * var(--fh)) calc(2 * var(--fw)); width: calc(15 * var(--fw)); min-width: 160px;
    display: flex; flex-direction: column; gap: calc(1 * var(--fh)); font-size: 1.3em; box-shadow: 0 calc(1 * var(--fh)) 0 #0004; }
  .gg-big { font-size: 3em; }
  .gg-easels { display: flex; gap: calc(2 * var(--fw)); flex-wrap: wrap; justify-content: center; max-width: 1500px; }
  .gg-easel { display: flex; flex-direction: column; align-items: center; gap: calc(1 * var(--fh)); transform: rotate(var(--r)); font-weight: 700; font-size: 1.2em; }
  .gg-canvas { width: calc(9 * var(--fw)); min-width: 90px; aspect-ratio: 1; background: var(--cream); border: calc(.6 * var(--fh)) solid #8b5a2b; border-radius: 10px;
    display: grid; place-items: center; font-size: 2.2em; color: #4f9d5d; box-shadow: 0 calc(.8 * var(--fh)) 0 #0004; }
  .gg-easel:not(.done) .gg-canvas { animation: gg-wiggle 1.2s ease-in-out infinite; }
  .gg-easel.done .gg-canvas { background: #e3f6d8; border-color: var(--c); }
  .gg-easel > span { color: var(--c); }
  .gg-canvas { position: relative; }
  .gg-eava { font-size: 1.3em; }
  .gg-emark { position: absolute; right: -.35em; bottom: -.35em; font-size: .55em; background: var(--cream); border-radius: 99px;
    width: 1.5em; height: 1.5em; display: grid; place-items: center; box-shadow: 0 2px 0 #0003; color: #4f9d5d; }
  .gg-easel:not(.done) .gg-emark { animation: gg-wiggle .8s ease-in-out infinite; }
  .gg-canvas.ava { font-size: 3em; }
  .gg-easels.many .gg-canvas { width: calc(7 * var(--fw)); min-width: 70px; }
  .gg-easels.many { gap: calc(1.4 * var(--fw)); }
  .gg-ava { margin-right: .3em; }
  .gg-scores.many { gap: calc(.8 * var(--fh)); font-size: .8em; }
  .gg-awards.many .gg-award { min-width: 0; font-size: .8em; padding: calc(1 * var(--fh)) calc(1 * var(--fw)); }
  .gg-easel.away { opacity: .4; }
  @keyframes gg-wiggle { 50% { transform: rotate(4deg); } }

  .gg-guess { padding-bottom: calc(9 * var(--fh)); }
  .gg-count { font-weight: 700; color: #ffd08a; letter-spacing: .08em; font-size: 1.1em; }
  .gg-guess-body { flex: 1; min-height: 0; display: flex; gap: calc(3 * var(--fw)); align-items: center; justify-content: center; }
  .gg-frame { position: relative; height: calc(58 * var(--fh)); aspect-ratio: 1; padding: calc(2 * var(--fh)); flex: none;
    background: linear-gradient(135deg, #d9a441, #a8701f); border-radius: 12px; box-shadow: 0 calc(1.5 * var(--fh)) calc(3 * var(--fh)) #0007, inset 0 0 0 calc(.6 * var(--fh)) #7a4d12;
    animation: gg-pop .5s ease-out; }
  .gg-frame img { width: 100%; height: 100%; background: #fff; border-radius: 4px; display: block; }
  .gg-tag { position: absolute; left: 50%; bottom: calc(-2.4 * var(--fh)); transform: translateX(-50%); background: var(--cream); color: var(--ink);
    padding: calc(.5 * var(--fh)) calc(1.4 * var(--fw)); border-radius: 99px; font-size: 1.2em; white-space: nowrap; animation: gg-pop .5s ease-out; box-shadow: 0 calc(.5 * var(--fh)) 0 #0004; }
  .gg-tiles { display: grid; grid-template-columns: 1fr; gap: calc(1.8 * var(--fh)); width: min(calc(38 * var(--fw)), 720px); }
  .gg-tile { background: var(--c); color: #fff; border-radius: 22px; padding: calc(1.6 * var(--fh)) calc(1.4 * var(--fw)); display: grid;
    grid-template-columns: auto auto 1fr; grid-template-rows: auto auto; align-items: center; column-gap: calc(1 * var(--fw));
    box-shadow: 0 calc(.8 * var(--fh)) 0 color-mix(in srgb, var(--c) 55%, #000); text-align: left; transition: transform .3s, opacity .3s, filter .3s; }
  .gg-shape { font-size: 1.6em; text-shadow: 0 .05em 0 #0004; }
  .gg-emoji { font-size: 2em; }
  .gg-text { font-size: 1.45em; font-weight: 700; text-shadow: 0 .05em 0 #0004; line-height: 1.1; }
  .gg-who { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: calc(.5 * var(--fw)); }
  .gg-who:empty { display: none; }
  .gg-chip { font-size: .85em; font-weight: 700; padding: calc(.2 * var(--fh)) calc(.8 * var(--fw)); border-radius: 99px; color: #1a1a1a; margin-top: calc(.6 * var(--fh));
    box-shadow: 0 0 0 2px #fff8; animation: gg-pop .4s ease-out; }
  .gg-tile.yes { transform: scale(1.06); box-shadow: 0 0 0 calc(.6 * var(--fh)) #fff, 0 0 calc(4 * var(--fh)) #fff8; animation: gg-shine 1s ease-in-out 2; }
  .gg-tile.no { opacity: .45; filter: saturate(.4); transform: scale(.95); }
  @keyframes gg-shine { 50% { transform: scale(1.12); } }
  .gg-q { margin-top: calc(3.5 * var(--fh)); text-align: center; display: flex; flex-direction: column; gap: calc(.6 * var(--fh)); }
  .gg-q b { font-size: 2.2em; }
  .gg-fx { position: absolute; inset: 0; pointer-events: none; }
  .gg-fly { position: absolute; bottom: calc(4 * var(--fh)); font-size: calc(7 * var(--fh)); animation: gg-fly 2.6s ease-out forwards; }
  @keyframes gg-fly { to { transform: translate(var(--x), calc(-75 * var(--fh))) scale(1.4); opacity: 0; } }

  .gg-scores { width: min(1100px, calc(92 * var(--fw))); display: flex; flex-direction: column; gap: calc(1.6 * var(--fh)); }
  .gg-srow { display: grid; grid-template-columns: 9em 1fr 5em; gap: calc(1.2 * var(--fw)); align-items: center; font-weight: 700; font-size: 1.35em;
    text-align: left; animation: gg-slide .5s ease-out backwards; animation-delay: var(--d); }
  @keyframes gg-slide { from { transform: translateX(calc(-10 * var(--fw))); opacity: 0; } }
  .gg-sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 .05em 0 #0006; }
  .gg-sbar { height: 1.3em; background: #0003; border-radius: 99px; overflow: hidden; }
  .gg-sbar div { height: 100%; border-radius: 99px; }
  .gg-snum { text-align: right; }

  .gg-wall { flex: 1; display: flex; flex-wrap: wrap; gap: calc(2.4 * var(--fh)) calc(2 * var(--fw)); justify-content: center; align-content: center; }
  .gg-mini { margin: 0; background: var(--cream); color: var(--ink); padding: calc(1 * var(--fh)) calc(1 * var(--fh)) calc(1.2 * var(--fh)); border-radius: 8px; width: var(--w, calc(15 * var(--fh))); min-width: 120px;
    transform: rotate(var(--r)); box-shadow: 0 calc(1 * var(--fh)) calc(2 * var(--fh)) #0006; animation: gg-pop .5s ease-out backwards; animation-delay: var(--d); }
  .gg-mini img { width: 100%; aspect-ratio: 1; background: #fff; display: block; border-radius: 3px; }
  .gg-mini figcaption { font-size: calc(var(--w, calc(15 * var(--fh))) / 7.5); font-weight: 700; line-height: 1.15; margin-top: calc(.6 * var(--fh)); display: flex; flex-direction: column; }
  .gg-mini small { font-size: .95em; color: #1a1a1a; border-radius: 99px; padding: 0 .6em; margin-top: calc(.4 * var(--fh)); align-self: center; }

  .gg-awards { display: flex; flex-wrap: wrap; gap: calc(2 * var(--fh)) calc(1.6 * var(--fw)); justify-content: center; max-width: 1500px; }
  .gg-award { background: var(--cream); color: var(--ink); border-top: calc(1.2 * var(--fh)) solid var(--c); border-radius: 18px; padding: calc(1.4 * var(--fh)) calc(1.4 * var(--fw));
    min-width: calc(13 * var(--fw)); display: flex; flex-direction: column; gap: calc(.4 * var(--fh)); box-shadow: 0 calc(.8 * var(--fh)) 0 #0004;
    animation: gg-pop .5s ease-out backwards; animation-delay: var(--d); }
  .gg-aname { font-weight: 700; font-size: 1.3em; }
  .gg-atitle { font-size: 1.15em; }
  .gg-award small { opacity: .7; }
  ` }));
}
