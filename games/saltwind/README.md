# Saltwind Isles

An island-settling trading game for 2–6 players. The TV shows the islands; each
phone shows your cargo, a map you tap to build on, trading and charts.

**Cargo.** Palm groves give driftwood 🪵, coral shoals coral 🪸, lagoons fish 🐟,
salt flats salt 🧂, basalt peaks basalt 🪨. The ash crater gives nothing.

**Opening.** In snake order everyone places two huts and a bridge beside each.
Your second hut pays out one card from each island it touches.

**Your turn.** Roll the dice. Every island showing that number pays its cargo to
each hut (1) or lighthouse (2) on its corners. Then build and trade, and end
your turn.

| Build | Cost | |
|---|---|---|
| Bridge | 🪵🪸 | extends your network along an edge |
| Hut | 🪵🪸🐟🧂 | 1 point; on a corner your bridges reach, two edges from any hut |
| Lighthouse | 🐟🐟🪨🪨🪨 | upgrades a hut: 2 points, double cargo |
| Chart | 🐟🧂🪨 | a surprise card |

**Squall (a roll of 7).** Anyone holding more than 9 cards drops half. The
roller moves the squall onto another island (it pays nothing while covered) and
takes a random card from someone with a hut beside it.

**Trading.** Offer any swap to everyone; whoever accepts, you pick one. Or trade
with the bank at 4:1, 3:1 from a 3:1 harbour, 2:1 for that harbour's cargo.

**Charts.** Weathervane (move the squall), Rope Crew (2 free bridges), Windfall
(take 2 from the bank), Harbour Toll (everyone hands you all of one cargo),
Hidden Cove (1 secret point). One per turn, not on the turn you bought it.

**Awards, 2 points each.** Longest Causeway (5+ bridges in one unbroken line)
and Storm Rider (3+ weathervanes played). Someone has to beat you to take them.

**Winning.** First to the target (7 quick or 10 full) on their own turn wins.

Slow players get a turn timer (2½ minutes) and absent players are played for,
so the game never stalls.

Tests: `node games/saltwind/test/sim.mjs` plays 300 bot games through the rules;
`node games/saltwind/test/play.mjs 4` plays a full game in real browsers against a
local server (`cargo run -- --port 8080 --games games`).
