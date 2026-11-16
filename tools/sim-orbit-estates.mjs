// Plays many random games of Orbit Estates headless to catch rule bugs.
//   node tools/sim-orbit-estates.mjs [games=300]
import { Game } from '../games/orbit-estates/engine.js';
import { BOARD, OWNABLE, START_CASH } from '../games/orbit-estates/board.js';

const games = Number(process.argv[2] || 300);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let rounds = 0, trades = 0, bankrupts = 0, limitHits = 0;

function check(g, where) {
  const fail = (m) => { throw new Error(`${where}: ${m}`); };
  for (const p of g.players) {
    if (!Number.isFinite(p.cash) || p.cash < 0) fail(`${p.name} cash ${p.cash}`);
    if (p.bankrupt && g.owned(p).length) fail(`${p.name} bankrupt but owns lots`);
    if (p.pos < 0 || p.pos >= BOARD.length) fail(`bad pos ${p.pos}`);
  }
  for (const i of OWNABLE) {
    const L = g.lots.get(i);
    if (L.level < 0 || L.level > 5) fail(`level ${L.level}`);
    if (L.level && (!L.owner || !g.ownsGroup(L.owner, BOARD[i].group))) fail(`dome without full district on ${BOARD[i].name}`);
    if (L.level && L.mortgaged) fail('mortgaged with domes');
    if (!L.owner && (L.level || L.mortgaged)) fail('unowned lot has state');
  }
  const held = g.players.reduce((n, p) => n + p.passes, 0);
  if (held !== g.passHeld) fail(`passHeld ${g.passHeld} vs ${held}`);
}

for (let n = 0; n < games; n++) {
  let clock = 0;
  let g;
  const answer = (view, fallback) => {
    clock += 1000;
    if (Math.random() < 0.05) return fallback; // timed out
    const opts = view.choices.map((c) => c.value);
    // Prefer buying and building so games actually end.
    for (const want of ['buy', 'yes']) if (opts.includes(want) && Math.random() < 0.7) return want;
    if (opts.some((v) => String(v).startsWith('build:')) && Math.random() < 0.6) return pick(opts.filter((v) => String(v).startsWith('build:')));
    if (opts.includes('build') && Math.random() < 0.5) return 'build';
    if (opts.includes('trade') && Math.random() < 0.08) { trades++; return 'trade'; }
    if (opts.includes('bankrupt') && Math.random() < 0.9) return pick(opts.filter((v) => v !== 'bankrupt'));
    if (opts.includes('go') && Math.random() < 0.85) return 'go';
    return pick(opts);
  };
  const io = {
    now: () => clock,
    random: Math.random,
    pause: async () => {},
    update: () => check(g, 'update'),
    choose: async (p, view, fallback) => answer(view, fallback),
    multi: async (p, view) => view.choices.filter(() => Math.random() < 0.3).map((c) => c.value),
    number: async (p, view, fallback) => (Math.random() < 0.5 ? fallback : Math.floor(Math.random() * view.number.max / 10) * 10),
    auction: async (i, bidders) => new Map(bidders.map((p) => [p.id, Math.random() < 0.3 ? 0 : Math.floor(Math.random() * Math.min(p.cash, BOARD[i].price * 1.5))])),
  };
  const count = 2 + (n % 7);
  const limit = n % 3 === 0 ? 30 * 60 * 1000 : 0;
  g = new Game(io, Array.from({ length: count }, (_, k) => ({ id: k + 1, name: `P${k + 1}` })), { limitMs: limit, maxRounds: 400 });
  const res = await g.play();
  check(g, 'end');
  if (res.length !== count) throw new Error('standings lost players');
  const live = res.filter((p) => !p.bankrupt);
  for (let k = 1; k < live.length; k++) if (live[k].worth > live[k - 1].worth) throw new Error('standings not sorted');
  if (res.slice(0, live.length).some((p) => p.bankrupt)) throw new Error('bankrupt ranked above solvent');
  rounds += g.round; bankrupts += g.outCount;
  if (g.lastRound) limitHits++;
  if (g.players.reduce((s, p) => s + p.cash, 0) > START_CASH * count * 50) throw new Error('money explosion');
}
console.log(`${games} games ok: avg ${(rounds / games).toFixed(1)} rounds, ${bankrupts} bankruptcies, ${trades} trade attempts, ${limitHits} hit the time limit`);
