// Animated "How to play" for the TV. Each game folder may have a
// tutorial.json: a list of steps, each with a title, a line of narration and a
// little scene of phones, cards and icons that animate in. See GAMES.md.
//
// step = {
//   title: 'Everyone gets the secret word',
//   text:  'Narration shown as a caption (and read aloud if speech is on).',
//   scene: [ actor, ... ],          // laid out left to right
//   flow:  true,                    // draw arrows between the actors
//   ms:    5000                     // optional; otherwise from text length
// }
// actor = one of
//   { phone: 'screen text', title, buttons: ['A','B'], tap: 0, type: 'typed answer', accent, label }
//   { tv: 'big screen text', sub }
//   { card: 'text', back: 'text after flip', color, label }
//   { icon: '🎲', label }
//   { score: '+500', color }
//   { dice: [3, 5] }
// and any actor can take fx: 'pop' | 'shake' | 'pulse' | 'glow' | 'float' and delay (ms).
import { h, sleep } from './common.js';
import * as audio from './audio.js';

const speechOk = () => 'speechSynthesis' in window && !audio.isMuted();

function actor(a, i, accent) {
  const delay = (a.delay ?? i * 450) + 'ms';
  const fx = a.fx ? '.fx-' + a.fx : '';
  let el;
  if (a.phone != null) {
    const screen = h('div.t-screen',
      a.title && h('div.t-ptitle', a.title),
      a.phone && h('div.t-ptext', a.phone),
      a.type != null && h('div.t-typed', h('span', { style: { animationDelay: `calc(${delay} + 500ms)`, '--n': a.type.length } }, a.type)),
      a.buttons && h('div.t-btns', a.buttons.map((b, k) => h('div.t-btn' + (k === a.tap ? '.t-tapped' : ''),
        { style: { animationDelay: `calc(${delay} + 1300ms)` } }, b))));
    el = h('div.t-phone', { style: a.accent ? { '--accent': a.accent } : null }, h('div.t-notch'), screen,
      a.tap != null && h('div.t-finger', { style: { animationDelay: `calc(${delay} + 1100ms)`, '--row': a.tap } }, '👆'));
  } else if (a.tv != null) {
    el = h('div.t-tv', h('div.t-tvscreen', h('div.t-tvtext', a.tv), a.sub && h('div.t-tvsub', a.sub)), h('div.t-tvstand'));
  } else if (a.card != null) {
    el = h('div.t-card' + (a.back ? '.t-flip' : ''), { style: { '--c': a.color || '#fffaf0', '--d2': `calc(${delay} + 1400ms)` } },
      h('div.t-face', a.card), a.back && h('div.t-face.t-back', a.back));
  } else if (a.icon != null) {
    el = h('div.t-icon', a.icon);
  } else if (a.score != null) {
    el = h('div.t-score', { style: { color: a.color || accent } }, a.score);
  } else if (a.dice) {
    el = h('div.t-dice', a.dice.map((d) => h('div.t-die', '⚀⚁⚂⚃⚄⚅'[d - 1] || d)));
  } else {
    el = h('div');
  }
  return h('div.t-actor' + fx, { style: { animationDelay: delay } }, el, a.label && h('div.t-label', a.label));
}

/**
 * Play a game's tutorial inside `host` (an element). Resolves when it ends
 * or is skipped; resolves false if the game has none.
 */
export async function playTutorial(host, game, { loop = false, controls = true } = {}) {
  let steps;
  try {
    const r = await fetch(`/games/${game.id}/tutorial.json?v=${game.version}`);
    if (!r.ok) return false;
    steps = await r.json();
  } catch { return false; }
  if (!Array.isArray(steps) || !steps.length) return false;

  const accent = game.color || '#7d8cff';
  const stage = h('div.t-stage');
  const caption = h('div.t-caption');
  const titleEl = h('div.t-title');
  const dots = h('div.t-dots', steps.map(() => h('span')));
  let i = 0, stopped = false, wake = null, clip = null;
  const stopAudio = () => {
    if (clip) { clip.pause(); clip.currentTime = 0; clip = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  };
  const go = (n) => { i = Math.max(0, Math.min(steps.length, n)); wake?.(); };
  const close = () => { stopped = true; wake?.(); };
  const overlay = h('div.t-overlay', { style: { '--accent': accent } },
    h('div.t-head', h('span.t-game', `${game.icon || ''} ${game.name} · How to play`),
      controls && h('div.t-ctrl',
        h('button.ghost.sm', { onclick: () => go(i - 1) }, '◀'),
        h('button.ghost.sm', { onclick: () => go(i + 1) }, '▶'),
        h('button.ghost.sm', { onclick: close }, 'Skip'))),
    titleEl, stage, caption, dots);
  host.append(overlay);

  try {
    while (!stopped) {
      if (i >= steps.length) { if (loop) i = 0; else break; }
      const s = steps[i];
      titleEl.replaceChildren(h('span', { key: i }, s.title || ''));
      titleEl.firstChild.classList.add('t-in');
      stage.replaceChildren(...(s.scene || []).flatMap((a, k, all) => {
        const el = actor(a, k, accent);
        if (s.flow && k < all.length - 1) {
          return [el, h('div.t-arrow', { style: { animationDelay: `${(a.delay ?? k * 450) + 250}ms` } }, '➜')];
        }
        return [el];
      }));
      caption.replaceChildren(h('span.t-in', s.text || ''));
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k <= i));
      audio.sfx('whoosh');
      stopAudio();
      const words = (s.text || '').split(/\s+/).length;
      const ms = s.ms || Math.max(4500, 1800 + words * 340);
      if (s.audio && !audio.isMuted()) {
        clip = new Audio(`/games/${game.id}/${s.audio}?v=${game.version}`);
        clip.play().catch(() => {});
      } else if (speechOk() && s.text) {
        const u = new SpeechSynthesisUtterance(`${s.title || ''}. ${s.text}`);
        u.rate = 1.05;
        speechSynthesis.speak(u);
      }
      const before = i;
      await new Promise((r) => { wake = r; setTimeout(r, ms); });
      wake = null;
      if (i === before && !stopped) i++;
    }
  } finally {
    stopAudio();
    overlay.remove();
  }
  return true;
}
