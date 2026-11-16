// Airlock phone screen. During a round the host sends a view with an
// `airlock` field: your card, the people in your module, chief votes and the
// cards people have shown you. Everything else is a standard view.
import { ROLES, TEAMS } from './roles.js';

export default function (ctx) {
  const { h } = ctx;
  injectCss();
  ctx.el.classList.add('al-game');
  const card = (role) => ctx.asset(`cards/${role}.svg`);
  const teamCard = (team) => ctx.asset(`cards/team-${team}.svg`);
  const KEY = `airlock.seen.${ctx.me.id}`;
  let dismissed = 0;
  try { dismissed = Number(sessionStorage.getItem(KEY)) || 0; } catch {}
  let tick = null;
  let peek = false;
  let sheet = null;       // { id, name } of the person you're about to show something to
  let scanning = false;
  let last = null;

  ctx.on('view', (view) => {
    clearInterval(tick);
    if (view?.airlock) {
      // Keep an open share/scan sheet across live updates, unless that person left.
      if (sheet && !view.airlock.mates.some((m) => m.id === sheet.id)) sheet = null;
      if (scanning && !view.airlock.powerLeft) scanning = false;
      last = view; drawRound(view.airlock);
    } else {
      sheet = null; scanning = false; last = null; ctx.renderView(view); if (view?.me?.role) ctx.el.append(myCardFooter(view.me.role)); }
  });

  function myCardFooter(role) {
    let open = false;
    const img = h('img.al-pcard.hidden', { src: card(role) });
    const btn = h('button.ghost.sm', { onclick: () => { open = !open; img.classList.toggle('hidden', !open); btn.textContent = open ? 'Hide my card' : 'My card'; } }, 'My card');
    return h('div.al-foot', btn, img);
  }

  function drawRound(a) {
    const role = ROLES[a.role];
    const team = TEAMS[role.team];
    const clock = h('span.al-clock');
    const upd = () => {
      const left = Math.max(0, Math.round((a.endsAt - Date.now()) / 1000));
      clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      clock.classList.toggle('urgent', left <= 10);
    };
    upd(); tick = setInterval(upd, 500);

    const iAmChief = a.chief === ctx.me.id;
    const chiefName = iAmChief ? 'You' : a.mates.find((m) => m.chief)?.name || '?';

    const mine = h('button.al-mycard', { onclick: () => { peek = !peek; redraw(); } },
      h('img', { src: peek ? card(a.role) : card('back') }),
      h('div',
        h('b', peek ? role.name : 'Your card'),
        h('span', peek ? role.goal : 'Tap to peek. Keep your screen hidden!')));

    const rows = a.mates.map((m) => h('div.al-row',
      h('span.al-name', { style: { color: m.color } }, m.chief ? '★ ' : '', m.name,
        m.votes ? h('small', ` ${m.votes} vote${m.votes === 1 ? '' : 's'}`) : null),
      h('button.al-btn' + (m.shown ? '.done' : ''), { onclick: () => { sheet = m; redraw(); } }, m.shownCard ? 'Shown ✓' : m.shown ? 'Colour ✓' : 'Show'),
      h('button.al-btn.vote' + (a.vote === m.id ? '.on' : ''), {
        onclick: () => ctx.send({ a: 'vote', for: m.id }),
      }, a.vote === m.id ? 'Backed' : 'Back')));

    const seen = a.seen.length ? a.seen.map((s) => h('button.al-seen', { onclick: () => popup(s, true) },
      h('img', { src: s.what === 'card' ? card(s.role) : teamCard(s.team) }),
      h('span', h('b', s.name), h('br'),
        s.what === 'card' ? `${ROLES[s.role].name} (${TEAMS[s.team].name})` : `${TEAMS[s.team].name} colour`,
        s.scan ? ' · scanned' : ''))) : [h('p.al-dim', 'Nobody has shown you anything yet.')];

    ctx.el.replaceChildren(h('div.al-phone', { style: { '--accent': '#9aa6ff' } },
      h('div.al-head',
        h('div', h('b', a.roomName), h('span.al-dim', ` · Round ${a.round}/${a.rounds}`)),
        clock),
      h('div.al-chief', '★ Chief: ', h('b', chiefName),
        iAmChief ? h('span.al-dim', ' · you pick who leaves') : null,
        a.myVotes ? h('span.al-dim', ` · ${a.myVotes} back${a.myVotes === 1 ? 's' : ''} you`) : null),
      a.flash ? h('div.al-flash', a.flash) : null,
      mine,
      a.powerLeft ? h('button.big.al-power', { onclick: () => { scanning = true; redraw(); } },
        a.role === 'scanner' ? 'Use scanner: see one card secretly' : 'Lurk: peek at one card secretly') : null,
      h('h3', 'In your module'),
      a.mates.length ? h('div.al-rows', rows) : h('p.al-dim', 'Nobody else is here.'),
      h('button.al-btn.vote.self' + (a.vote === ctx.me.id ? '.on' : ''), { onclick: () => ctx.send({ a: 'vote', for: ctx.me.id }) },
        a.vote === ctx.me.id ? 'You back yourself as chief' : 'Back yourself as chief'),
      h('p.al-dim.al-tip', 'A player backed by more than half the module becomes chief.'),
      h('h3', 'Shown to you'),
      h('div.al-seenlist', seen)));

    if (sheet) ctx.el.append(shareSheet(sheet));
    else if (scanning) ctx.el.append(scanSheet(a));
    else {
      const fresh = a.seen[0];
      if (fresh && fresh.seq > dismissed) popup(fresh, false, a);
    }
  }

  function redraw() { if (last) { clearInterval(tick); drawRound(last.airlock); } }

  function overlay(...kids) {
    return h('div.al-over', { onclick: (e) => { if (e.target === e.currentTarget) close(); } }, h('div.al-sheet', ...kids));
  }
  function close() { sheet = null; scanning = false; redraw(); }

  function shareSheet(m) {
    const send = (what) => { ctx.send({ a: 'show', to: m.id, what }); sheet = null; redraw(); };
    return overlay(
      h('h2', `Show ${m.name}…`),
      h('p.al-dim', 'Hold your phone so only they can see it.'),
      h('button.big', { onclick: () => send('card') }, 'My whole card'),
      h('button.big.al-alt', { onclick: () => send('team') }, 'Just my colour'),
      h('button.ghost', { onclick: close }, 'Cancel'));
  }

  function scanSheet(a) {
    return overlay(
      h('h2', 'Pick someone to scan'),
      h('p.al-dim', 'You see their card. They are not told. One use per game.'),
      h('div.choices', a.mates.map((m) => h('button.choice', {
        onclick: () => { ctx.send({ a: 'power', target: m.id }); scanning = false; redraw(); },
      }, m.name))),
      h('button.ghost', { onclick: close }, 'Cancel'));
  }

  function popup(s, manual, a) {
    const back = !manual && a?.mates.find((m) => m.id === s.from);
    let el = null;
    const done = () => {
      if (manual) return el.remove();
      dismissed = Math.max(dismissed, s.seq);
      try { sessionStorage.setItem(KEY, String(dismissed)); } catch {}
      redraw();
    };
    const showBack = (what) => { ctx.send({ a: 'show', to: s.from, what }); done(); };
    el = h('div.al-over', { onclick: (e) => { if (manual && e.target === e.currentTarget) el.remove(); } },
      h('div.al-sheet.al-reveal',
        h('h2', s.scan ? `You scanned ${s.name}` : `${s.name} shows you`),
        h('img.al-pcard', { src: s.what === 'card' ? card(s.role) : teamCard(s.team) }),
        h('p', s.what === 'card' ? `${ROLES[s.role].name}, ${TEAMS[s.team].name}` : `Their colour: ${TEAMS[s.team].name}`),
        back && !back.shownCard ? h('div.row',
          h('button.al-btn', { onclick: () => showBack('card') }, 'Show my card back'),
          h('button.al-btn', { onclick: () => showBack('team') }, 'Colour back')) : null,
        h('button.big', { onclick: done }, 'OK')));
    ctx.el.append(el);
    if (!manual && navigator.vibrate) navigator.vibrate([60, 40, 60]);
  }
}

function injectCss() {
  if (document.getElementById('airlock-phone-css')) return;
  const css = Object.assign(document.createElement('style'), { id: 'airlock-phone-css' });
  css.textContent = `
  .al-game .view-img { max-height: 46vh; width: auto; align-self: center; }
  .al-phone { display: flex; flex-direction: column; gap: 12px; }
  .al-head { display: flex; justify-content: space-between; align-items: center; font-size: 1.1em; }
  .al-clock { font-weight: 900; font-size: 1.5em; font-variant-numeric: tabular-nums; }
  .al-clock.urgent { color: var(--err); }
  .al-dim { color: var(--dim); }
  .al-tip { font-size: .8em; margin: 0; }
  .al-chief { background: var(--bg2); border-radius: 12px; padding: 8px 12px; }
  .al-chief b { color: #ffd34d; }
  .al-flash { background: #ffd34d; color: #120f1d; font-weight: 800; padding: 8px 12px; border-radius: 12px; }
  .al-mycard { display: flex; gap: 14px; align-items: center; text-align: left; background: var(--card);
    border: 2px solid var(--line); border-radius: 16px; padding: 10px; cursor: pointer; }
  .al-mycard img { width: 76px; flex: none; }
  .al-mycard b { display: block; font-size: 1.2em; }
  .al-mycard span { font-size: .85em; color: var(--dim); }
  .al-phone h3 { margin: 10px 0 0; font-size: 1em; color: var(--dim); text-transform: uppercase; letter-spacing: .08em; }
  .al-rows { display: flex; flex-direction: column; gap: 8px; }
  .al-row { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; background: var(--card);
    border-radius: 14px; padding: 8px 8px 8px 14px; }
  .al-name { font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .al-name small { color: var(--dim); font-weight: 700; }
  .al-btn { background: var(--accent); color: #120f1d; border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
  .al-btn.done { background: var(--bg2); color: var(--dim); }
  .al-btn.vote { background: var(--bg2); color: var(--fg); border: 2px solid #ffd34d55; }
  .al-btn.vote.on { background: #ffd34d; color: #120f1d; }
  .al-btn.self { width: 100%; }
  .al-power { background: #ffd34d; }
  .al-seenlist { display: flex; flex-direction: column; gap: 8px; }
  .al-seen { display: flex; gap: 12px; align-items: center; text-align: left; background: var(--card); border: 0;
    border-radius: 14px; padding: 8px; cursor: pointer; }
  .al-seen img { width: 44px; }
  .al-over { position: fixed; inset: 0; background: #000b; display: flex; align-items: flex-end; justify-content: center; z-index: 10;
    padding: 16px; animation: pop .2s ease-out; }
  .al-sheet { background: var(--bg2); border: 2px solid var(--line); border-radius: 22px; padding: 20px; width: 100%; max-width: 480px;
    display: flex; flex-direction: column; gap: 12px; max-height: 90vh; overflow: auto; }
  .al-sheet.al-reveal { align-items: center; text-align: center; }
  .al-sheet p { margin: 0; font-size: 1.2em; font-weight: 800; }
  .al-alt { background: var(--card) !important; color: var(--fg) !important; }
  .al-pcard { width: min(62vw, 240px); }
  .al-foot { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 18px; }
  `;
  document.head.append(css);
}
