// Plays many bot games through the rules to catch crashes and stuck states.
//   node games/saltwind/test/sim.mjs [games]
import { Game, RES } from '../rules.js';

const N = +(process.argv[2] || 300);
let seed = 1;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const stats = { wins: 0, stuck: 0, turns: [], errors: 0, players: {} };
for (let gi = 0; gi < N; gi++) {
  const n = 2 + (gi % 5);
  const players = Array.from({ length: n }, (_, i) => ({ id: i + 1, name: 'P' + (i + 1), color: '#fff' }));
  const g = new Game(players, { rnd, target: 10 });
  const totalCards = () => RES.reduce((s, r) => s + g.bank[r] + [...g.p.values()].reduce((a, p) => a + p.hand[r], 0), 0);
  let steps = 0;
  while (g.phase.name !== 'over' && steps < 20000) {
    steps++;
    // Occasionally try a player trade.
    if (g.phase.name === 'main' && rnd() < 0.05 && !g.offer) {
      const a = g.active, h = g.p.get(a).hand;
      const give = RES.find((r) => h[r] > 0), get = RES.find((r) => r !== give);
      if (give) {
        const r = g.act(a, { a: 'offer', give: { [give]: 1 }, get: { [get]: 1 } });
        if (r.ok) {
          for (const p of players) if (p.id !== a) g.act(p.id, { a: 'reply', accept: rnd() < 0.5 });
          const yes = Object.entries(g.offer.replies).find(([, v]) => v);
          g.act(a, yes ? { a: 'deal', with: +yes[0] } : { a: 'cancelOffer' });
        }
      }
    }
    for (const pid of g.waitingOn()) {
      const m = g.autoMove(pid, true);
      if (!m) throw new Error('no move in ' + g.phase.name);
      const r = g.act(pid, m);
      if (r.err) {
        stats.errors++;
        if (stats.errors < 10) console.log('err', g.phase.name, JSON.stringify(m), r.err);
        // Fall back to the simplest move.
        const r2 = g.act(pid, g.autoMove(pid, false));
        if (r2.err) throw new Error(`stuck: ${g.phase.name} ${r2.err}`);
      }
      g.view(pid);
    }
    if (totalCards() !== 95) throw new Error('cards not conserved: ' + totalCards());
    if (RES.some((r) => g.bank[r] < 0 || [...g.p.values()].some((p) => p.hand[r] < 0))) throw new Error('negative');
  }
  if (g.phase.name === 'over') { stats.wins++; stats.turns.push(g.round); (stats.players[n] ||= []).push(g.round); }
  else stats.stuck++;
}
const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log(`${N} games, ${stats.wins} finished, ${stats.stuck} hit the step cap, ${stats.errors} rejected bot moves`);
for (const [n, a] of Object.entries(stats.players)) console.log(`  ${n} players: ${avg(a)} rounds on average`);
