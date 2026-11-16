// Long Shot phone screens: a number keypad for guesses and a betting slip.
// Every other view falls through to the standard Party Hall screen.
export default function (ctx) {
  const { h } = ctx;
  injectCss();
  document.body.style.setProperty('--accent', '#ffc94d');
  ctx.on('view', (view) => {
    // The shell resets the accent after each view; put the game's gold back.
    queueMicrotask(() => { if (!view?.color) document.body.style.setProperty('--accent', '#ffc94d'); });
    if (view?.keypad && view.ask) keypad(view);
    else if (view?.bet && view.ask) betSlip(view);
    else ctx.renderView(view);
  });
  const answer = (view, value) => ctx.send({ kind: 'answer', ask: view.ask, value });

  function keypad(view) {
    const k = view.keypad;
    let digits = '';
    const shown = h('div.lsp-num');
    const go = h('button.big', { disabled: true, onclick: () => digits && answer(view, Number(digits)) }, k.submit || 'Lock in');
    const upd = () => {
      shown.textContent = !digits ? '0' : k.year ? digits : Number(digits).toLocaleString('en-US');
      shown.classList.toggle('empty', !digits);
      go.disabled = !digits;
    };
    const press = (d) => {
      if (d === 'del') digits = digits.slice(0, -1);
      else if (d === 'clr') digits = '';
      else if (digits.length < 12) digits = (digits === '0' ? '' : digits) + d;
      if (navigator.vibrate) navigator.vibrate(8);
      upd();
    };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'del'];
    ctx.el.replaceChildren(h('div.view',
      view.title && h('h2', view.title),
      h('p.view-text', k.question),
      h('div.lsp-display', shown, k.unit && h('span.lsp-unit', k.unit)),
      h('div.lsp-keys', keys.map((d) => h('button.lsp-key' + (d.length > 1 ? '.fn' : ''),
        { onclick: () => press(d) }, d === 'del' ? '⌫' : d === 'clr' ? 'C' : d))),
      go));
    upd();
  }

  function betSlip(view) {
    const b = view.bet;
    let chips = [];
    let stakeAmt = 0, stakeSlot = null;
    let mode = 'chips';
    const amounts = [10, 25, 50, 100, 250, 500].filter((a) => a < b.bank);
    if (b.bank > 0) amounts.push(b.bank);

    const root = h('div.view');
    const draw = () => {
      const list = h('div.lsp-slots', b.slots.map((s, i) => {
        const n = chips.filter((c) => c === i).length;
        const st = stakeSlot === i && stakeAmt > 0;
        return h('button.lsp-slot' + (n || st ? '.on' : '') + (s.value === null ? '.under' : ''), { onclick: () => tap(i) },
          h('span.lsp-odds', `${s.odds}:1`),
          h('span.lsp-val', s.value === null ? 'Smaller than every guess' : s.value, s.mine ? h('small', ' (yours)') : null),
          h('span.lsp-marks', ...Array.from({ length: n }, () => h('span.lsp-chip')), st ? h('span.lsp-stake', stakeAmt) : null));
      }));
      const left = 2 - chips.length;
      put(root, 
        h('h2', 'Place your bets'),
        h('p.lsp-help', 'Pick the guess closest to the answer without going over.' + (b.mult > 1 ? ' Payouts are doubled!' : '')),
        b.bank > 0 ? h('div.lsp-tabs',
          h('button' + (mode === 'chips' ? '.on' : ''), { onclick: () => { mode = 'chips'; draw(); } }, `Free chips (${left} left)`),
          h('button' + (mode === 'stake' ? '.on' : ''), { onclick: () => { mode = 'stake'; draw(); } }, 'Stake points')) : null,
        mode === 'chips'
          ? h('p.lsp-hint', left ? `Tap a guess to drop a free chip (${b.chip} pts each, never lost).` : 'Both chips placed. Tap again to move the older one.')
          : h('div.stack',
            h('p.lsp-hint', `You have ${b.bank} points. Choose an amount, then tap a guess. Lost if it misses.`),
            h('div.lsp-amts', [0, ...amounts].map((a) => h('button' + (a === stakeAmt ? '.on' : ''),
              { onclick: () => { stakeAmt = a; if (!a) stakeSlot = null; draw(); } },
              a === 0 ? 'None' : a === b.bank ? `All in (${a})` : a)))),
        list,
        h('button.big', { disabled: !chips.length && !(stakeAmt && stakeSlot !== null), onclick: submit },
          chips.length < 2 ? `Bet (${2 - chips.length} chip${chips.length === 1 ? '' : 's'} unused)` : 'Place bets'));
    };
    const tap = (i) => {
      if (mode === 'chips') {
        if (chips.length >= 2) chips.shift();
        chips.push(i);
      } else if (stakeAmt > 0) stakeSlot = i;
      if (navigator.vibrate) navigator.vibrate(10);
      draw();
    };
    const submit = () => answer(view, { chips, wager: { slot: stakeSlot ?? 0, amount: stakeSlot === null ? 0 : stakeAmt } });
    ctx.el.replaceChildren(root);
    draw();
  }

  function put(el, ...kids) {
    el.replaceChildren(...kids.filter((k) => k != null && k !== false && k !== ''));
  }

  function injectCss() {
    document.getElementById('long-shot-phone-css')?.remove();
    const css = Object.assign(document.createElement('style'), { id: 'long-shot-phone-css' });
    css.textContent = `
    .lsp-display { display: flex; align-items: baseline; justify-content: center; gap: .3em; background: var(--bg2);
      border: 2px solid var(--line); border-radius: 16px; padding: 10px 14px; min-height: 2.6em; }
    .lsp-num { font-size: 2.4em; font-weight: 900; color: var(--accent); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .lsp-num.empty { opacity: .3; }
    .lsp-unit { color: var(--dim); font-weight: 800; }
    .lsp-keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .lsp-key { background: var(--card); border: 2px solid var(--line); border-radius: 16px; padding: 16px 0; font-size: 1.6em; font-weight: 900; cursor: pointer; touch-action: manipulation; }
    .lsp-key:active { background: var(--accent); color: #120f1d; }
    .lsp-key.fn { color: var(--dim); }
    .lsp-help { margin: 0; }
    .lsp-hint { margin: 0; color: var(--dim); font-size: .95em; }
    .lsp-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .lsp-tabs button, .lsp-amts button { background: var(--card); border: 2px solid var(--line); border-radius: 12px; padding: 10px 6px; font-weight: 800; cursor: pointer; }
    .lsp-tabs button.on, .lsp-amts button.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 25%, var(--card)); }
    .lsp-amts { display: flex; flex-wrap: wrap; gap: 8px; }
    .lsp-amts button { flex: 1 0 22%; }
    .lsp-slots { display: flex; flex-direction: column; gap: 8px; }
    .lsp-slot { display: grid; grid-template-columns: 3.2em 1fr auto; gap: 10px; align-items: center; text-align: left;
      background: #12301f; border: 2px solid #ffffff22; border-radius: 14px; padding: 12px; font-weight: 800; cursor: pointer; touch-action: manipulation; }
    .lsp-slot.under { background: #2e1820; }
    .lsp-slot.on { border-color: var(--accent); }
    .lsp-odds { background: var(--accent); color: #120f1d; border-radius: 99px; text-align: center; font-weight: 900; padding: 2px 0; }
    .lsp-slot.under .lsp-odds { background: #ff6b5d; }
    .lsp-val { font-size: 1.15em; overflow-wrap: anywhere; }
    .lsp-val small { color: var(--dim); font-weight: 700; }
    .lsp-marks { display: flex; gap: 4px; }
    .lsp-chip { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); border: 3px dashed #fff9; }
    .lsp-stake { background: #fff; color: #120f1d; border-radius: 99px; padding: 0 8px; font-weight: 900; }
    `;
    document.head.append(css);
  }
}
