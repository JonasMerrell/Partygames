// Orbit Estates look: dark glass tiles on a starfield, neon district bands.
export const CSS = `
.oe-root { --B: min(84vh, 62vw); display: flex; gap: 2vw; align-items: center; justify-content: center; width: 100%; text-align: left; }
.game:has(.oe-root), .game:has(.oe-intro) {
  background:
    radial-gradient(1px 1px at 12% 18%, #fff8, transparent), radial-gradient(1px 1px at 72% 12%, #fff9, transparent),
    radial-gradient(1.5px 1.5px at 40% 70%, #fff7, transparent), radial-gradient(1px 1px at 88% 64%, #fff8, transparent),
    radial-gradient(1px 1px at 22% 88%, #fff6, transparent), radial-gradient(1.5px 1.5px at 58% 36%, #fff6, transparent),
    radial-gradient(900px 600px at 50% 50%, #241a4a 0%, transparent 70%);
}
.oe-board { width: var(--B); height: var(--B); display: grid; grid-template: repeat(9, 1fr) / repeat(9, 1fr); gap: calc(var(--B) * .004);
  font-size: calc(var(--B) / 9 * .145); flex-shrink: 0; }
.oe-tile { position: relative; background: linear-gradient(160deg, #2c2550ee, #1b1636ee); border: 1px solid #ffffff1c; border-radius: calc(var(--B) * .008);
  display: flex; overflow: hidden; box-shadow: inset 0 0 0 calc(var(--B) * .003) var(--o); }
.oe-tile.s-b { flex-direction: column; } .oe-tile.s-t { flex-direction: column-reverse; }
.oe-tile.s-l { flex-direction: row-reverse; } .oe-tile.s-r { flex-direction: row; }
.oe-tile.corner { background: radial-gradient(circle at 50% 40%, #3c3170, #1b1636); }
.oe-tile.focus { outline: calc(var(--B) * .005) solid #fff; z-index: 2; transform: scale(1.06); transition: transform .2s; }
.oe-tile.mort .oe-tbody { opacity: .45; background: repeating-linear-gradient(45deg, transparent 0 6px, #ffffff10 6px 12px); }
.oe-band { background: var(--g); color: #120f1d; font-weight: 900; display: flex; align-items: center; justify-content: center;
  letter-spacing: -.1em; font-size: .9em; line-height: 1; box-shadow: 0 0 12px color-mix(in srgb, var(--g) 60%, transparent); }
.s-b .oe-band, .s-t .oe-band { height: 22%; } .s-l .oe-band, .s-r .oe-band { width: 22%; writing-mode: vertical-rl; }
.oe-tbody { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2px; gap: .1em; min-width: 0; }
.oe-tname { font-weight: 800; line-height: 1.05; font-size: 1em; overflow-wrap: anywhere; hyphens: auto; }
.corner .oe-tname { font-size: 1.15em; }
.oe-ticon { font-size: 1.8em; line-height: 1; }
.corner .oe-ticon { font-size: 3em; }
.oe-tprice { color: #cfc9ea; font-size: .95em; font-weight: 700; }
.oe-tokens { position: absolute; inset: auto 0 6% 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 2px; }
.oe-tok { font-size: 2.1em; line-height: 1; filter: drop-shadow(0 0 4px var(--c)) drop-shadow(0 0 2px var(--c)); animation: oe-hop .2s; }
@keyframes oe-hop { from { transform: translateY(-30%) scale(1.2); } }

.oe-center { grid-area: 2 / 2 / 9 / 9; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(var(--B) * .02);
  font-size: calc(var(--B) * .024); text-align: center; padding: 3%; }
.oe-logo { display: flex; flex-direction: column; align-items: center; gap: .2em; }
.oe-logo h1 { font-size: 2.4em; letter-spacing: .06em; text-transform: uppercase; font-weight: 900; margin: 0;
  background: linear-gradient(90deg, #ffd23d, #ff8a3d, #d45ae0); -webkit-background-clip: text; background-clip: text; color: transparent; }
.oe-logo.sm h1 { font-size: 1.6em; }
.oe-ring { position: relative; width: 6em; height: 3.2em; }
.oe-logo.sm .oe-ring { width: 4em; height: 2.1em; }
.oe-ring-planet { position: absolute; left: 30%; top: 0; width: 40%; aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffe9a8, #ff8a3d 55%, #7a2e5e); box-shadow: 0 0 30px #ff8a3d66; }
.oe-ring-band { position: absolute; inset: 30% 0 20%; border-radius: 50%; border: .25em solid #9ef0ffcc; transform: rotate(-12deg);
  clip-path: polygon(0 45%, 100% 45%, 100% 100%, 0 100%); box-shadow: 0 0 14px #9ef0ff88; }
.oe-dice { display: flex; gap: .8em; }
.oe-die { width: 3.2em; height: 3.2em; background: #f4f1ff; border-radius: .6em; display: grid; grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  padding: .45em; box-shadow: 0 .25em 0 #a9a2c8, 0 0 20px #9ef0ff44; }
.oe-die span.on { background: #1b1636; border-radius: 50%; margin: 14%; }
.oe-dice.rolling .oe-die { animation: oe-shake .14s infinite alternate; }
@keyframes oe-shake { from { transform: rotate(-12deg) translateY(-4px); } to { transform: rotate(12deg); } }
.oe-status { font-size: 1.5em; font-weight: 900; min-height: 1.3em; }
.oe-feed { display: flex; flex-direction: column; gap: .3em; font-size: 1em; max-width: 92%; }
.oe-feed div { border-left: .3em solid var(--c); padding-left: .5em; text-align: left; }
.oe-dim { color: var(--dim); }

.oe-card, .oe-announce, .oe-trade, .oe-auction { background: linear-gradient(160deg, #3a2f6e, #211a42); border: 2px solid #9ef0ff66;
  border-radius: 1em; padding: 1.2em 1.6em; max-width: 95%; box-shadow: 0 0 40px #9ef0ff33; animation: oe-in .35s ease-out;
  display: flex; flex-direction: column; align-items: center; gap: .6em; }
@keyframes oe-in { from { transform: scale(.7) rotate(-3deg); opacity: 0; } }
.oe-card-head { font-weight: 900; color: #9ef0ff; letter-spacing: .1em; text-transform: uppercase; }
.oe-card p { font-size: 1.5em; margin: 0; }
.oe-card-to { color: var(--dim); }
.oe-announce h2 { font-size: 2em; margin: 0; } .oe-announce p { font-size: 1.2em; margin: 0; color: var(--dim); }
.oe-tsides { display: flex; gap: 1em; align-items: stretch; }
.oe-tside { display: flex; flex-direction: column; gap: .3em; min-width: 8em; }
.oe-tname { font-weight: 900; }
.oe-tlot { border-left: .4em solid var(--g); background: #ffffff10; padding: .2em .5em; border-radius: .3em; text-align: left; }
.oe-tcash { font-weight: 900; font-size: 1.3em; color: #ffd23d; }
.oe-tarrow { font-size: 2em; align-self: center; }
.oe-deed { background: #f4f1ff; color: #1b1636; border-radius: .5em; overflow: hidden; width: 16em; }
.oe-deed-band { background: var(--g); font-weight: 900; padding: .4em; font-size: 1.2em; }
.oe-deed p { margin: .5em .8em; font-size: .85em; } .oe-deed b { display: block; padding-bottom: .5em; }
.oe-bidders { display: flex; gap: .5em; flex-wrap: wrap; justify-content: center; }
.oe-bidder { border: 2px solid var(--c); border-radius: 99px; padding: .2em .7em; opacity: .55; }
.oe-bidder.in { opacity: 1; background: color-mix(in srgb, var(--c) 25%, transparent); }
.oe-bids { display: flex; flex-direction: column; gap: .3em; min-width: 14em; }
.oe-bid { display: flex; justify-content: space-between; gap: 1em; border-left: .3em solid var(--c); padding: .1em .6em; }
.oe-bid.win { background: #ffd23d33; font-weight: 900; }

.oe-side { display: flex; flex-direction: column; gap: 1.2vh; width: min(24vw, 420px); font-size: clamp(14px, 1.15vw, 26px); }
.oe-clock { font-weight: 900; color: var(--dim); text-align: center; }
.oe-clock.last { color: #ff5d73; animation: pulse .6s infinite alternate; }
.oe-pl { display: flex; align-items: center; gap: .6em; background: #2a2445cc; border: 2px solid #ffffff14; border-left: .4em solid var(--c);
  border-radius: .8em; padding: .5em .7em; transition: transform .2s; }
.oe-pl.turn { border-color: var(--c); transform: scale(1.04); box-shadow: 0 0 18px color-mix(in srgb, var(--c) 50%, transparent); }
.oe-pl.out { opacity: .35; text-decoration: line-through; }
.oe-pl.away .oe-pl-name::after { content: ' (away)'; color: var(--dim); font-weight: 400; }
.oe-pl-tok { font-size: 1.8em; }
.oe-pl-main { flex: 1; min-width: 0; }
.oe-pl-name { font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.oe-pl-deeds { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
.oe-pip { width: .7em; height: .9em; border-radius: 2px; background: var(--g); }
.oe-pip.mort { opacity: .3; }
.oe-pl-cash { font-weight: 900; font-size: 1.2em; color: #ffd23d; font-variant-numeric: tabular-nums; }

.oe-intro, .oe-results { display: flex; flex-direction: column; align-items: center; gap: 3vh; text-align: center; font-size: 1.3em; }
.oe-intro .oe-ring, .oe-results .oe-ring { width: 10em; height: 5.4em; }
.oe-rank { display: flex; flex-direction: column; gap: 1.2vh; width: min(800px, 90vw); }
.oe-rrow { display: grid; grid-template-columns: 3em 1fr auto; gap: 1em; align-items: center; background: #2a2445; border-left: .4em solid var(--c);
  border-radius: .7em; padding: .5em 1em; animation: oe-in .4s backwards; text-align: left; }
.oe-wintok { font-size: 4em; line-height: 1; animation: oe-in .6s; }
.oe-rk { font-weight: 900; color: var(--dim); }
.oe-rrow b { color: #ffd23d; }

/* phones */
.oe-bar { background: linear-gradient(160deg, #2c2550, #1b1636); border: 2px solid var(--c, #ffb84d); border-radius: 16px; padding: 10px 14px;
  margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
.oe-bar-top { display: flex; align-items: center; gap: 10px; }
.oe-bar-tok { font-size: 2em; }
.oe-bar-cash { font-size: 1.9em; font-weight: 900; color: #ffd23d; flex: 1; font-variant-numeric: tabular-nums; }
.oe-bar-tags { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.oe-bar-tag { font-size: .85em; font-weight: 800; border: 1px solid #ffffff33; border-radius: 99px; padding: 2px 8px; color: var(--dim); }
.oe-bar-tag.hot { color: #120f1d; background: #ffd23d; border-color: #ffd23d; }
.oe-bar-deeds { display: flex; flex-wrap: wrap; gap: 6px; }
.oe-bar-deed { font-size: .78em; font-weight: 700; border-left: 6px solid var(--g); background: #ffffff10; border-radius: 4px; padding: 2px 6px; }
.oe-bar-deed.mort { opacity: .45; text-decoration: line-through; }
.oe-bar-none { color: var(--dim); font-size: .85em; }
`;
