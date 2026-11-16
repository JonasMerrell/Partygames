// Plays a whole game in real browsers: a TV and N phones against a local server.
//   cargo run -- --port 8080 --games games &   then   node games/saltwind/test/play.mjs [players] [shots dir]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // require() finds the global install

const N = +(process.argv[2] || 3);
const SHOTS = process.argv[3] || null;
const BASE = process.env.BASE || 'http://localhost:8080';
const browser = await chromium.launch();
const errors = [];
const watch = (page, who) => {
  page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${who}: ${m.text()}`));
};
const tv = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
watch(tv, 'tv');
await tv.goto(BASE + '/host');
await tv.click('text=Saltwind Isles');
const code = (await tv.locator('.roomcode').textContent()).trim();
const phones = [];
for (let i = 0; i < N; i++) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  watch(p, 'phone' + i);
  await p.goto(BASE + '/');
  await p.fill('.code-in', code);
  await p.fill('input[placeholder="Your name"]', ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Flo'][i]);
  await p.click('button:has-text("Join")');
  phones.push(p);
}
await tv.waitForTimeout(500);
await tv.click('button.big');
// Whoever got the length question answers it (quick game).
await tv.waitForTimeout(800);
for (const p of phones) { const b = p.locator('button:has-text("Quick")'); if (await b.count()) await b.click(); }
await tv.waitForFunction(() => window.__saltwind, null, { timeout: 15000 });
const ids = [];
for (const p of phones) { await p.waitForFunction(() => window.__saltwind?.state()?.me); ids.push(await p.evaluate(() => window.__saltwind.state().me.id)); }
const phoneOf = (id) => phones[ids.indexOf(id)];
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });

// First placement through the real UI: tap a glowing corner, then the button.
{
  const id = await tv.evaluate(() => window.__saltwind.active);
  const p = phoneOf(id);
  await p.waitForSelector('.sw-pick');
  await shot(p, 'phone-setup');
  await p.locator('.sw-pick').first().dispatchEvent('click');
  const box = await p.locator('.sw-pick circle').first().boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await p.click('button:has-text("Build hut here")');
  await p.waitForFunction(() => window.__saltwind.state().setupWant === 'bridge');
}
let steps = 0, shotsTaken = new Set(), lastSeq = -1;
while (steps++ < 4000) {
  const st = await tv.evaluate(() => {
    const g = window.__saltwind;
    if (g.phase.name === 'over') return { over: true };
    return { waiting: g.waitingOn(), phase: g.phase.name, seq: g.seq, moves: g.waitingOn().map((pid) => [pid, g.autoMove(pid, true)]) };
  });
  if (st.over) break;
  if (SHOTS && st.phase === 'main' && !shotsTaken.has('main') && steps > 40) {
    shotsTaken.add('main');
    const p = phoneOf(st.waiting[0]);
    await p.waitForSelector('button:has-text("Trade")');
    await shot(tv, 'tv-main'); await shot(p, 'phone-main');
    await p.click('button:has-text("Trade")'); await shot(p, 'phone-trade'); await p.click('button:has-text("Back")');
  }
  if (st.phase === 'roll' && steps > 10 && steps % 7 === 0) {
    // Roll with the real button now and then.
    const p = phoneOf(st.waiting[0]);
    try { await p.click('button:has-text("Roll the dice")', { timeout: 5000 }); }
    catch (e) {
      const info = await p.evaluate(() => ({ st: window.__saltwind.state()?.phase, active: window.__saltwind.state()?.active, me: window.__saltwind.state()?.me?.id, text: document.querySelector('main').innerText.slice(0, 400) }));
      console.log('roll button missing', JSON.stringify(info), st.waiting);
      throw e;
    }
  } else {
    for (const [pid, m] of st.moves) if (m) await phoneOf(pid).evaluate((m) => window.__saltwind.act(m), m);
  }
  await tv.waitForTimeout(60);
  await tv.waitForFunction((s) => window.__saltwind.seq !== s || window.__saltwind.phase.name === 'over', st.seq, { timeout: 5000 }).catch(() => errors.push('no progress after ' + JSON.stringify(st.moves)));
}
const res = await tv.evaluate(() => ({ over: window.__saltwind.phase.name === 'over', winner: window.__saltwind.winner, round: window.__saltwind.round }));
await tv.waitForTimeout(600);
await shot(tv, 'tv-over'); await shot(phones[0], 'phone-over');
console.log(JSON.stringify({ ...res, steps, errors: errors.slice(0, 15) }, null, 1));
await browser.close();
process.exit(res.over && !errors.length ? 0 : 1);
