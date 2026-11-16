// Saltwind Isles: the phone. Your cargo, the map for placing pieces, building,
// trading and charts. Every action goes to the host, which checks the rules.
import { RES, RES_INFO, COST, CHARTS, HAND_LIMIT, formatCards } from './rules.js';
import { drawBoard, graphOf, S, tileLabel, useStyle } from './board.js';

export default function (ctx) {
  const { h } = ctx;
  useStyle(ctx.asset('style.css'));
  let s = null;           // latest state from the host
  let me0 = null;         // my private part, sent separately
  let secs = 0, secsAt = 0;
  let mode = null;        // null | 'bridge' | 'hut' | 'lighthouse' | 'trade' | 'charts'
  let sel = null;         // { type, id } picked on the map
  let phaseKey = '';
  let draft = { give: {}, get: {} };
  let bank = { give: null, get: null };
  let drop = {};
  let pickRes = [];       // for Windfall / Toll
  let chartPick = null;   // 'windfall' | 'toll'
  let zoom = 1;
  let toast = null, toastT = 0;
  let lastHand = null;

  const act = (m) => ctx.send({ t: 'act', m });
  const zero = () => Object.fromEntries(RES.map((r) => [r, 0]));
  const showToast = (msg, bad = false) => { toast = { msg, bad }; clearTimeout(toastT); toastT = setTimeout(() => { toast = null; render(); }, 3500); render(); };

  ctx.on('message', (m) => {
    if (m?.t === 'me') { me0 = m.me; if (s) { s.me = me0; render(); } return; }
    if (m?.t === 'pub') {
      const prev = s;
      s = { ...m.s, me: me0 }; secs = m.secs; secsAt = Date.now();
      // A finished or cancelled offer of mine takes me back to the main buttons.
      if (prev?.offer && prev.offer.from === me0?.id && !s.offer && mode === 'trade') mode = null;
      const key = `${s.phase}:${s.active}:${s.setupWant}:${s.round}`;
      if (key !== phaseKey) {
        phaseKey = key; sel = null; drop = {};
        if (!['trade', 'charts'].includes(mode) || s.active !== s.me?.id || s.phase !== 'main') mode = null;
        if (s.phase === 'crew' && s.active === s.me?.id) mode = 'bridge';
        if (s.active === s.me?.id && prev && prev.active !== s.active && navigator.vibrate) navigator.vibrate([60, 60, 60]);
      }
      // Tell the player what they just picked up.
      if (lastHand && s.me) {
        const got = RES.filter((r) => s.me.hand[r] > lastHand[r]).map((r) => `${s.me.hand[r] - lastHand[r]}${RES_INFO[r].icon}`);
        if (got.length && s.phase !== 'setup') { toast = { msg: 'You got ' + got.join(' ') }; clearTimeout(toastT); toastT = setTimeout(() => { toast = null; render(); }, 3000); }
      }
      lastHand = s.me ? { ...s.me.hand } : null;
      render();
    } else if (m?.t === 'err') showToast(m.msg, true);
    else if (m?.t === 'toast') showToast(m.msg);
  });
  ctx.send({ t: 'hello' });
  window.__saltwind = { act, state: () => s }; // for the browser test (test/play.mjs)
  setInterval(() => { const el = ctx.el.querySelector('.sw-secs'); if (el) el.textContent = timeLeft(); }, 1000);

  const timeLeft = () => {
    const t = Math.max(0, secs - Math.floor((Date.now() - secsAt) / 1000));
    return t ? `${t}s` : '';
  };

  // ---------- pieces ----------
  const resChip = (r, n, extra = {}) => h('div.sw-card', { style: { '--rc': `var(--sw-${r})` }, ...extra },
    h('div.sw-cicon', RES_INFO[r].icon), h('div.sw-cnum', n), h('div.sw-cname', RES_INFO[r].name));
  const costLine = (c) => h('span.sw-cost', formatCards(c));
  const btn = (label, on, opts = {}) => h('button.sw-btn' + (opts.cls ? '.' + opts.cls : ''), { onclick: on, disabled: !!opts.disabled }, label);
  const can = (cost) => s.me && Object.entries(cost).every(([r, n]) => s.me.hand[r] >= n);
  const stepper = (val, max, set) => h('div.sw-step',
    h('button', { onclick: () => set(Math.max(0, val - 1)), disabled: val <= 0 }, '−'),
    h('span', val),
    h('button', { onclick: () => set(Math.min(max, val + 1)), disabled: val >= max }, '+'));

  // ---------- the map ----------
  function boardFor(pick) {
    const svg = drawBoard(s, { pick, selected: sel });
    if (pick) {
      // Forgiving taps: take the nearest glowing spot.
      svg.addEventListener('click', (e) => {
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        const g = graphOf(s);
        const cands = [];
        for (const v of pick.verts || []) cands.push(['v', v, g.verts[v].x * S, g.verts[v].y * S]);
        for (const ei of pick.edges || []) { const e2 = g.edges[ei], a = g.verts[e2.a], b = g.verts[e2.b]; cands.push(['e', ei, (a.x + b.x) / 2 * S, (a.y + b.y) / 2 * S]); }
        for (const ti of pick.tiles || []) { const t = s.tiles[ti]; cands.push(['t', ti, Math.sqrt(3) * (t.q + t.r / 2) * S, 1.5 * t.r * S]); }
        let best = null, bd = (pick.tiles?.length ? 0.9 : 0.6) * S;
        for (const c of cands) { const d = Math.hypot(c[2] - p.x, c[3] - p.y); if (d < bd) { bd = d; best = c; } }
        if (best) { sel = { type: best[0], id: best[1] }; render(); }
      });
    }
    const wrap = h('div.sw-mapwrap' + (zoom > 1 ? '.sw-zoomed' : ''), h('div.sw-map', { style: { width: `${zoom * 100}%` } }, svg));
    return h('div.sw-mapbox', wrap,
      h('button.sw-zoom', { onclick: () => { zoom = zoom > 1 ? 1 : 1.8; render(); } }, zoom > 1 ? '－' : '＋'));
  }

  // ---------- screens ----------
  function render() {
    if (!s) { ctx.el.replaceChildren(h('div.sw-phone', h('p.sub', 'Loading the islands…'))); return; }
    if (!s.me) { ctx.el.replaceChildren(h('div.sw-phone', h('h2', 'Watching'), h('p.sub', 'You joined after the game started. Enjoy the show on the TV!'), boardFor(null))); return; }
    const me = s.me, mine = s.active === me.id && !!me.legal; // my hand can arrive a moment before the table
    const pl = (id) => s.players.find((p) => p.id === id);
    const act0 = pl(s.active);
    let pick = null, panel = [];

    const header = h('div.sw-head',
      h('div.sw-status', { style: { '--c': act0?.color || '#fff' } },
        s.phase === 'over' ? `${pl(s.winner).name} wins!`
          : s.phase === 'discard' ? 'Squall! Big hands drop half'
            : mine ? 'Your turn' : `${act0.name}'s turn`,
        h('span.sw-secs', timeLeft())),
      h('div.sw-mypts', me.points, h('small', `/${s.target}★`)));

    const hand = h('div.sw-hand', RES.map((r) => resChip(r, me.hand[r])));
    const cardsN = RES.reduce((a, r) => a + me.hand[r], 0);

    // Discard: anyone over the limit when a 7 comes up.
    if (s.phase === 'discard' && s.need?.[me.id]) {
      const need = s.need[me.id];
      const chosen = RES.reduce((a, r) => a + (drop[r] || 0), 0);
      panel.push(h('h3', `Drop ${need} cards`), h('p.sub', `A squall hit and you hold more than ${HAND_LIMIT}.`),
        h('div.sw-rows', RES.map((r) => h('div.sw-row', h('span', RES_INFO[r].icon, ' ', RES_INFO[r].name, h('small', ` (${me.hand[r]})`)),
          stepper(drop[r] || 0, me.hand[r], (n) => { drop[r] = n; render(); })))),
        btn(`Drop ${chosen}/${need}`, () => act({ a: 'discard', cards: { ...zero(), ...drop } }), { disabled: chosen !== need, cls: 'go' }));
    } else if (s.phase === 'over') {
      panel.push(h('p.sub', 'Final scores are on the TV.'));
    } else if (!mine) {
      panel.push(h('p.sub.sw-wait', waitingText(act0)));
      if (s.offer && s.offer.from !== me.id) panel.push(offerCard());
    } else {
      switch (s.phase) {
        case 'setup': {
          const want = s.setupWant;
          pick = { verts: want === 'hut' ? me.legal.huts : [], edges: want === 'bridge' ? me.legal.bridges : [] };
          panel.push(h('h3', want === 'hut' ? 'Place a hut' : 'Place a bridge next to it'),
            h('p.sub', want === 'hut' ? 'Tap a glowing corner. Corners touching high numbers produce more often.' : 'Tap a glowing edge.'),
            btn(sel ? (want === 'hut' ? 'Build hut here' : 'Build bridge here') : 'Tap the map first',
              () => act(want === 'hut' ? { a: 'place', v: sel.id } : { a: 'place', e: sel.id }), { disabled: !sel, cls: 'go' }));
          break;
        }
        case 'roll': {
          panel.push(btn('🎲 Roll the dice', () => act({ a: 'roll' }), { cls: 'go.big' }));
          if (me.charts.includes('vane') && !s.playedChart) panel.push(btn('🌀 Play Weathervane first', () => act({ a: 'play', chart: 'vane' })));
          break;
        }
        case 'squall': {
          pick = { tiles: s.tiles.map((_, i) => i).filter((i) => i !== s.squall) };
          panel.push(h('h3', '⛈️ Move the squall'), h('p.sub', 'It blocks an island and lets you take a card from someone next to it.'),
            btn(sel ? `Send it to the ${tileLabel(s, sel.id)}` : 'Tap an island', () => act({ a: 'squall', tile: sel.id }), { disabled: !sel, cls: 'go' }));
          break;
        }
        case 'steal':
          panel.push(h('h3', 'Take a card from…'), h('div.sw-grid', s.stealFrom.map((id) => btn(`${pl(id).name} (${pl(id).cards})`, () => act({ a: 'steal', victim: id })))));
          break;
        case 'crew':
          pick = { edges: me.legal.bridges };
          panel.push(h('h3', `🪢 Free bridges: ${s.crewLeft} left`),
            btn(sel ? 'Build bridge here' : 'Tap an edge', () => act({ a: 'build', what: 'bridge', at: sel.id }), { disabled: !sel, cls: 'go' }),
            btn('Done', () => act({ a: 'crewDone' })));
          break;
        case 'main':
          ({ pick, panel } = mainPanel(me));
          break;
      }
    }

    const toastEl = toast && h('div.sw-toast' + (toast.bad ? '.sw-bad' : ''), toast.msg);
    // Things that need an answer from me go above the map.
    const urgent = (s.phase === 'discard' && s.need?.[me.id]) || (!mine && s.offer && s.offer.from !== me.id);
    const panelEl = h('div.sw-panel', panel);
    const map = ['trade', 'charts'].includes(mode) && mine && s.phase === 'main' ? null : boardFor(pick);
    ctx.el.replaceChildren(h('div.sw-phone', header, hand,
      h('div.sw-handinfo', `${cardsN} cards`, cardsN > HAND_LIMIT ? h('b.sw-warn', ` · over ${HAND_LIMIT}, a squall would cost you half`) : '',
        ` · bank ${RES.map((r) => s.bank[r]).join('/')}`),
      toastEl, ...(urgent ? [panelEl, map] : [map, panelEl])));
  }

  function waitingText(a) {
    switch (s.phase) {
      case 'setup': return `${a.name} is placing a ${s.setupWant}.`;
      case 'roll': return `${a.name} is about to roll.`;
      case 'discard': return 'Waiting for others to drop cards.';
      case 'squall': return `${a.name} is moving the squall.`;
      case 'steal': return `${a.name} is choosing who to rob.`;
      case 'crew': return `${a.name} is building free bridges.`;
      default: return `${a.name} is building and trading. Watch for offers!`;
    }
  }

  function offerCard() {
    const o = s.offer, me = s.me;
    const from = s.players.find((p) => p.id === o.from);
    const mine = o.replies[me.id];
    const afford = Object.entries(o.get).every(([r, n]) => me.hand[r] >= n);
    return h('div.sw-offer', { style: { '--c': from.color } },
      h('h3', `${from.name} offers a trade`),
      h('div.sw-tradeline', h('div', h('small', 'You get'), h('b', formatCards(o.give))), h('div', h('small', 'You give'), h('b', formatCards(o.get)))),
      mine === true ? h('p.sub', 'You said yes. Waiting for them to pick…')
        : h('div.sw-grid',
          btn('✓ Accept', () => act({ a: 'reply', accept: true }), { disabled: !afford, cls: 'go' }),
          btn(mine === false ? '✗ Declined' : '✗ No thanks', () => act({ a: 'reply', accept: false }), { disabled: mine === false })),
      !afford && h('p.sub', 'You don\'t have what they want.'));
  }

  function mainPanel(me) {
    const left = s.players.find((p) => p.id === me.id).left;
    const panel = [];
    let pick = null;
    const buildMode = (what) => () => { mode = mode === what ? null : what; sel = null; render(); };

    if (['bridge', 'hut', 'lighthouse'].includes(mode)) {
      const spots = mode === 'bridge' ? { edges: me.legal.bridges } : mode === 'hut' ? { verts: me.legal.huts } : { verts: me.legal.lighthouses };
      pick = spots;
      const none = !(spots.edges || spots.verts).length;
      const names = { bridge: 'bridge', hut: 'hut', lighthouse: 'lighthouse' };
      panel.push(h('h3', `Build a ${names[mode]} `, costLine(COST[mode])),
        none ? h('p.sub', mode === 'hut' ? 'No free corner on your bridges. Huts need two edges of space from any other hut.' : 'Nowhere to build that.')
          : h('p.sub', 'Tap a glowing spot on the map.'),
        h('div.sw-grid',
          btn(sel ? 'Build here' : 'Tap the map', () => { act({ a: 'build', what: mode, at: sel.id }); sel = null; mode = null; }, { disabled: !sel, cls: 'go' }),
          btn('Back', buildMode(null))));
      return { pick, panel };
    }
    if (mode === 'trade') return { pick, panel: tradePanel(me) };
    if (mode === 'charts') return { pick, panel: chartsPanel(me) };

    if (s.offer?.from === me.id) panel.push(myOfferCard());
    panel.push(h('div.sw-actions',
      btn(h('span', '🌉 Bridge', costLine(COST.bridge)), buildMode('bridge'), { disabled: !can(COST.bridge) || !left.bridge }),
      btn(h('span', '🛖 Hut', costLine(COST.hut)), buildMode('hut'), { disabled: !can(COST.hut) || !left.hut }),
      btn(h('span', '🗼 Lighthouse', costLine(COST.lighthouse)), buildMode('lighthouse'), { disabled: !can(COST.lighthouse) || !left.lighthouse || !me.legal.lighthouses.length }),
      btn(h('span', '📜 Buy chart', costLine(COST.chart)), () => act({ a: 'chart' }), { disabled: !can(COST.chart) || !s.deck }),
      btn('🤝 Trade', () => { mode = 'trade'; render(); }),
      btn(`🗺️ My charts (${me.charts.length + me.newCharts.length})`, () => { mode = 'charts'; render(); }),
    ), btn('End turn ⏭', () => act({ a: 'end' }), { cls: 'end' }));
    return { pick, panel };
  }

  function myOfferCard() {
    const o = s.offer;
    const yes = s.players.filter((p) => o.replies[p.id] === true);
    const waiting = s.players.filter((p) => p.id !== s.me.id && o.replies[p.id] == null);
    return h('div.sw-offer', h('h3', 'Your offer'),
      h('div.sw-tradeline', h('div', h('small', 'You give'), h('b', formatCards(o.give))), h('div', h('small', 'You get'), h('b', formatCards(o.get)))),
      yes.length ? h('div.sw-grid', yes.map((p) => btn(`Trade with ${p.name}`, () => act({ a: 'deal', with: p.id }), { cls: 'go' })))
        : h('p.sub', waiting.length ? `Waiting on ${waiting.map((p) => p.name).join(', ')}…` : 'Nobody accepted.'),
      btn('Cancel offer', () => act({ a: 'cancelOffer' })));
  }

  function tradePanel(me) {
    const out = [h('div.sw-tabs', btn('← Back', () => { mode = null; render(); }))];
    if (s.offer?.from === me.id) { out.push(myOfferCard()); return out; }
    // Player trade.
    const g = draft.give, w = draft.get;
    out.push(h('h3', 'Offer a trade to everyone'),
      h('div.sw-rows', RES.map((r) => h('div.sw-row',
        h('span.sw-rl', RES_INFO[r].icon),
        h('div.sw-mini', 'give', stepper(g[r] || 0, me.hand[r], (n) => { g[r] = n; if (n) w[r] = 0; render(); })),
        h('div.sw-mini', 'get', stepper(w[r] || 0, 9, (n) => { w[r] = n; if (n) g[r] = 0; render(); })))) ),
      btn('Send offer', () => { act({ a: 'offer', give: { ...zero(), ...g }, get: { ...zero(), ...w } }); draft = { give: {}, get: {} }; },
        { disabled: !RES.some((r) => g[r]) || !RES.some((r) => w[r]), cls: 'go' }));
    // Bank trade.
    out.push(h('h3.sw-gap', 'Trade with the bank'),
      h('p.sub', 'Give', ' ', h('small', '(your rate shown; harbours make it cheaper)')),
      h('div.sw-pickrow', RES.map((r) => h('button.sw-rbtn' + (bank.give === r ? '.on' : ''), {
        disabled: me.hand[r] < me.rates[r], onclick: () => { bank.give = r; if (bank.get === r) bank.get = null; render(); },
      }, RES_INFO[r].icon, h('small', `${me.rates[r]}:1`)))),
      h('p.sub', 'Get'),
      h('div.sw-pickrow', RES.map((r) => h('button.sw-rbtn' + (bank.get === r ? '.on' : ''), {
        disabled: r === bank.give || !s.bank[r], onclick: () => { bank.get = r; render(); },
      }, RES_INFO[r].icon))),
      btn(bank.give && bank.get ? `Trade ${me.rates[bank.give]}${RES_INFO[bank.give].icon} for 1${RES_INFO[bank.get].icon}` : 'Pick both',
        () => { act({ a: 'bank', give: bank.give, get: bank.get }); bank = { give: null, get: null }; },
        { disabled: !bank.give || !bank.get || me.hand[bank.give] < me.rates[bank.give], cls: 'go' }));
    return out;
  }

  function chartsPanel(me) {
    const out = [h('div.sw-tabs', btn('← Back', () => { mode = null; chartPick = null; render(); }))];
    if (chartPick) {
      const need = chartPick === 'windfall' ? 2 : 1;
      out.push(h('h3', CHARTS[chartPick].icon, ' ', CHARTS[chartPick].name), h('p.sub', CHARTS[chartPick].text),
        h('div.sw-pickrow', RES.map((r) => h('button.sw-rbtn' + (pickRes.includes(r) ? '.on' : ''), {
          onclick: () => { pickRes = need === 1 ? [r] : [...pickRes, r].slice(-2); render(); },
        }, RES_INFO[r].icon, h('small', pickRes.filter((x) => x === r).length || '')))),
        h('div.sw-grid',
          btn('Play it', () => { act({ a: 'play', chart: chartPick, res: need === 1 ? pickRes[0] : pickRes }); chartPick = null; pickRes = []; mode = null; },
            { disabled: pickRes.length !== need, cls: 'go' }),
          btn('Cancel', () => { chartPick = null; pickRes = []; render(); })));
      return out;
    }
    const all = [...me.charts.map((c) => [c, false]), ...me.newCharts.map((c) => [c, true])];
    if (!all.length) out.push(h('p.sub', `No charts yet. Buy one for ${formatCards(COST.chart)}.`));
    for (const [c, fresh] of all) {
      const info = CHARTS[c];
      const playable = !fresh && c !== 'cove' && !s.playedChart;
      out.push(h('div.sw-chart', h('div.sw-chicon', info.icon), h('div', h('b', info.name), h('p.sub', info.text),
        fresh && c !== 'cove' && h('small', 'Bought this turn: playable from your next turn.')),
        c !== 'cove' && btn('Play', () => {
          if (c === 'windfall' || c === 'toll') { chartPick = c; pickRes = []; render(); }
          else { act({ a: 'play', chart: c }); mode = null; }
        }, { disabled: !playable })));
    }
    if (s.playedChart) out.push(h('p.sub', 'You already played a chart this turn.'));
    return out;
  }

  render();
}
