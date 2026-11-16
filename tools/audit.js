// Legibility audit: plays each game with bots on a 1920x1080 TV and 390x800 phones and flags
// screens that need the auto zoom, text outside the frame or cut off, low contrast and small text.
//   node tools/audit.js http://localhost:8080 [game-id ...]
// Env: SECS (play time per game, default 90), PAR (games at once, default 3), OUT (report folder).
// Flags:
//  - TV stage auto-zoom below 1 (content didn't fit), elements outside the frame
//  - clipped text (overflow hidden with more content than box)
//  - text contrast below WCAG AA, TV text smaller than 20px, phone text < 14px
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const OUT = (process.env.OUT || 'audit') + '/';
fs.mkdirSync(OUT, { recursive: true });
const SECS = Number(process.env.SECS || 90);
const PAR = Number(process.env.PAR || 3);

const CHECK = (isTv) => {
  const parse = (c) => {
    const m = c.match(/[\d.]+/g); if (!m) return [0, 0, 0, 0];
    const v = m.map(Number);
    if (c.startsWith('color(')) return [v[0] * 255, v[1] * 255, v[2] * 255, v[3] ?? 1];
    return v;
  };
  // The part of the element left visible by ancestors that clip (overflow other than visible).
  const visibleRect = (el, r) => {
    let v = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const p = e.getBoundingClientRect();
        v = { left: Math.max(v.left, p.left), top: Math.max(v.top, p.top), right: Math.min(v.right, p.right), bottom: Math.min(v.bottom, p.bottom) };
      }
    }
    return v.right > v.left && v.bottom > v.top ? v : null;
  };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)); };
  const bgOf = (el) => {
    const stack = [];
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url')) return null; // gradient: unknown
      const c = parse(cs.backgroundColor);
      if ((c[3] ?? 1) > 0) { stack.push(c); if ((c[3] ?? 1) >= 1) break; }
    }
    let bg = [20, 17, 31];
    for (const c of stack.reverse()) bg = blend(c, bg);
    return bg;
  };
  const root = isTv ? document.getElementById('app') : document.body;
  const ar = root.getBoundingClientRect();
  const out = { zoom: 1, outside: [], clipped: [], contrast: [], small: [] };
  const stage = root.querySelector('.game > .stage');
  if (isTv && stage) out.zoom = Number(stage.style.zoom || 1);
  const name = (el) => (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
  for (const el of root.querySelectorAll('*')) {
    if (el.closest('.t-overlay')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.3) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    const vr = visibleRect(el, r);
    if (!vr) continue;
    if (isTv && (vr.right > ar.right + 2 || vr.bottom > ar.bottom + 2 || vr.left < ar.left - 2 || vr.top < ar.top - 2)) out.outside.push(name(el));
    if (!isTv && vr.right > innerWidth + 2) out.outside.push(name(el));
    if ((cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.textOverflow === 'ellipsis') && el.tagName !== 'CANVAS'
        && !['auto', 'scroll'].includes(cs.overflowY) && el.textContent.trim()
        && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) out.clipped.push(name(el) + ' "' + el.textContent.trim().slice(0, 30) + '"');
    if (!text || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
    const zoom = isTv && stage && stage.contains(el) ? out.zoom : 1;
    const svgScale = el instanceof SVGGraphicsElement && el.getScreenCTM() ? Math.hypot(el.getScreenCTM().a, el.getScreenCTM().b) / (zoom || 1) : 1;
    const px = parseFloat(cs.fontSize) * zoom * svgScale;
    if (isTv && px < 20) out.small.push(`${name(el)} ${px.toFixed(0)}px "${text.slice(0, 20)}"`);
    if (!isTv && px < 14) out.small.push(`${name(el)} ${px.toFixed(0)}px "${text.slice(0, 20)}"`);
    const bg = bgOf(el);
    if (!bg) continue;
    let op = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
    if (op < 0.35) continue; // fading in or out
    const fc = parse(cs.color); fc[3] = (fc[3] ?? 1) * op;
    const fg = blend(fc, bg);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) out.contrast.push(`${name(el)} ${ratio.toFixed(1)}:1 "${text.slice(0, 20)}"`);
  }
  for (const k of ['outside', 'clipped', 'contrast', 'small']) out[k] = [...new Set(out[k])];
  return out;
};

async function auditGame(b, g) {
  const res = { id: g.id, zoom: 1, outside: new Set(), clipped: new Set(), contrast: new Set(), small: new Set(), phone: { outside: new Set(), clipped: new Set(), contrast: new Set(), small: new Set() }, errs: [] };
  const ctxs = [];
  try {
    const hc = await b.newContext({ viewport: { width: 1920, height: 1080 } }); ctxs.push(hc);
    const host = await hc.newPage();
    host.on('pageerror', (e) => res.errs.push(e.message));
    await host.goto(BASE + '/host');
    await host.click(`.gcard:has-text(${JSON.stringify(g.name)})`);
    await host.waitForSelector('.roomcode');
    const code = await host.textContent('.roomcode');
    const n = Math.min(g.maxPlayers || 8, Math.max(g.minPlayers || 1, 5));
    const phones = [];
    for (let i = 0; i < n; i++) {
      const c = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1 }); ctxs.push(c);
      const p = await c.newPage();
      p.on('pageerror', (e) => res.errs.push('phone: ' + e.message));
      await p.goto(BASE + '/?code=' + code);
      await p.fill('input[autocomplete=nickname]', ['Ana', 'Benjamin', 'Cy', 'Dee', 'Esmeralda', 'Fox', 'Gus', 'Hal'][i] || 'P' + i);
      await p.click('button[type=submit]');
      phones.push(p);
    }
    await host.waitForFunction((n) => document.querySelectorAll('.chip').length === n, n);
    await host.click('button.big');
    let shot = 0, tick = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < SECS * 1000) {
      tick++;
      for (const [k, p] of phones.entries()) {
        try {
          for (const inp of await p.$$('input:not([type=range]):visible, textarea:visible')) {
            if (!(await inp.inputValue())) await inp.fill(['banana', 'a very long answer that keeps going on and on for a while', 'cat'][k % 3], { timeout: 300 });
          }
          const pad = await p.$('canvas:visible');
          if (pad) { const bb = await pad.boundingBox(); if (bb) { await p.mouse.move(bb.x + 20, bb.y + 20); await p.mouse.down(); await p.mouse.move(bb.x + bb.width - 20, bb.y + bb.height - 20, { steps: 3 }); await p.mouse.up(); } }
          const btns = await p.$$('button:visible:not([disabled]):not(.link)');
          if (btns.length) await btns[(k + tick) % btns.length].click({ timeout: 400 });
        } catch {}
      }
      try {
        if (process.env.SNAP && tick % Number(process.env.SNAP) === 0) await host.screenshot({ path: `${OUT}snap-${g.id}-${String(tick).padStart(3, '0')}.png` });
        const m = await host.evaluate(CHECK, true);
        const fresh = m.zoom < res.zoom - 0.02 || m.outside.some((x) => !res.outside.has(x)) || m.clipped.some((x) => !res.clipped.has(x)) || m.contrast.some((x) => !res.contrast.has(x));
        res.zoom = Math.min(res.zoom, m.zoom);
        for (const k of ['outside', 'clipped', 'contrast', 'small']) m[k].forEach((x) => res[k].add(x));
        if (fresh && shot < 6) await host.screenshot({ path: `${OUT}${g.id}-tv-${shot++}.png` });
        const pm = await phones[tick % phones.length].evaluate(CHECK, false);
        const pfresh = pm.clipped.some((x) => !res.phone.clipped.has(x)) || pm.contrast.some((x) => !res.phone.contrast.has(x)) || pm.outside.some((x) => !res.phone.outside.has(x));
        for (const k of ['outside', 'clipped', 'contrast', 'small']) pm[k].forEach((x) => res.phone[k].add(x));
        if (pfresh && shot < 10) await phones[tick % phones.length].screenshot({ path: `${OUT}${g.id}-phone-${shot++}.png` });
      } catch (e) { if (res.errs.length < 3) res.errs.push('check: ' + e.message.split('\n')[0]); }
      await new Promise((r) => setTimeout(r, 600));
    }
  } catch (e) { res.errs.push('audit: ' + e.message.split('\n')[0]); }
  for (const c of ctxs) await c.close().catch(() => {});
  const arr = (s) => [...s].slice(0, 8);
  return { id: res.id, zoom: res.zoom.toFixed(2), outside: arr(res.outside), clipped: arr(res.clipped), contrast: arr(res.contrast), small: arr(res.small),
    phone: { outside: arr(res.phone.outside), clipped: arr(res.phone.clipped), contrast: arr(res.phone.contrast), small: arr(res.phone.small) }, errs: res.errs.slice(0, 3) };
}

(async () => {
  const only = process.argv.slice(3);
  const b = await chromium.launch();
  const games = (await (await fetch(BASE + '/api/games')).json()).filter((g) => !only.length || only.includes(g.id));
  const queue = [...games];
  const results = [];
  await Promise.all(Array.from({ length: PAR }, async () => {
    for (let g; (g = queue.shift());) { const r = await auditGame(b, g); results.push(r); console.log(JSON.stringify(r)); }
  }));
  fs.writeFileSync(OUT + 'report.json', JSON.stringify(results, null, 1));
  await b.close();
})();
