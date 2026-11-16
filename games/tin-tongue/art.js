// Tin Tongue's art: a boxy cel-shaded robot drawn as inline SVG, so it can take
// a team colour. mood: 'idle' | 'talk' | 'glitch' | 'happy'.
export function robot(color = '#ffb84d', mood = 'idle') {
  const eye = mood === 'glitch'
    ? '<path d="M70 92l16 16M86 92l-16 16M114 92l16 16M130 92l-16 16" stroke="#ff5d73" stroke-width="7" stroke-linecap="round"/>'
    : mood === 'happy'
      ? '<path d="M68 104q10-14 20 0M112 104q10-14 20 0" stroke="#14111f" stroke-width="7" fill="none" stroke-linecap="round"/>'
      : '<circle cx="78" cy="100" r="11" fill="#14111f"/><circle cx="122" cy="100" r="11" fill="#14111f"/>'
        + '<circle cx="82" cy="96" r="4" fill="#fff"/><circle cx="126" cy="96" r="4" fill="#fff"/>';
  const mouth = mood === 'talk'
    ? '<rect x="80" y="124" width="40" height="16" rx="5" fill="#14111f"/><rect x="86" y="128" width="28" height="4" rx="2" fill="#5df08a"/>'
    : mood === 'glitch'
      ? '<path d="M76 132l8-6 8 6 8-6 8 6 8-6 8 6" stroke="#14111f" stroke-width="6" fill="none" stroke-linejoin="round"/>'
      : mood === 'happy'
        ? '<path d="M78 124q22 22 44 0z" fill="#14111f"/>'
        : '<rect x="80" y="128" width="40" height="8" rx="4" fill="#14111f"/>';
  const sparks = mood === 'glitch'
    ? '<path d="M18 60l14 6-8 6 16 8M182 56l-14 8 8 4-16 10" stroke="#ffe14d" stroke-width="5" fill="none" stroke-linejoin="round"/>'
    : '';
  return `<svg class="tt-bot tt-${mood}" viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <line x1="100" y1="44" x2="100" y2="16" stroke="#14111f" stroke-width="6"/>
  <circle class="tt-bulb" cx="100" cy="14" r="10" fill="${mood === 'glitch' ? '#ff5d73' : '#5df08a'}" stroke="#14111f" stroke-width="5"/>
  <rect x="20" y="84" width="18" height="34" rx="6" fill="${color}" stroke="#14111f" stroke-width="5"/>
  <rect x="162" y="84" width="18" height="34" rx="6" fill="${color}" stroke="#14111f" stroke-width="5"/>
  <rect x="36" y="44" width="128" height="112" rx="22" fill="${color}" stroke="#14111f" stroke-width="6"/>
  <path d="M42 64q0-14 14-14h88q14 0 14 14v6H42z" fill="#fff" opacity=".28"/>
  <rect x="54" y="78" width="92" height="44" rx="14" fill="#f4f1ff" stroke="#14111f" stroke-width="5"/>
  ${eye}${mouth}
  <rect x="62" y="160" width="76" height="52" rx="12" fill="${color}" stroke="#14111f" stroke-width="6"/>
  <rect x="76" y="172" width="48" height="12" rx="4" fill="#14111f"/>
  <circle cx="84" cy="198" r="5" fill="#ff5d73"/><circle cx="100" cy="198" r="5" fill="#ffe14d"/><circle cx="116" cy="198" r="5" fill="#4dd8ff"/>
  <circle cx="52" cy="140" r="4" fill="#14111f"/><circle cx="148" cy="140" r="4" fill="#14111f"/>
  ${sparks}
</svg>`;
}

// Styles shared by the TV and phone. Injected once per page.
export function injectCss(id, text) {
  document.getElementById(id)?.remove();
  const css = Object.assign(document.createElement('style'), { id });
  css.textContent = text;
  document.head.append(css);
}

export const BOT_CSS = `
  .tt-bot { display: block; filter: drop-shadow(0 10px 0 rgba(0,0,0,.35)); }
  .tt-bot .tt-bulb { animation: tt-blink 1.6s steps(2) infinite; }
  .tt-talk { animation: tt-bob .45s ease-in-out infinite alternate; }
  .tt-glitch { animation: tt-shake .08s linear infinite; }
  .tt-happy { animation: tt-hop .5s ease-out infinite alternate; }
  @keyframes tt-blink { 50% { opacity: .35; } }
  @keyframes tt-bob { to { transform: translateY(-6px) rotate(-1.5deg); } }
  @keyframes tt-shake { 25% { transform: translate(-4px, 2px); } 75% { transform: translate(4px, -2px); } }
  @keyframes tt-hop { to { transform: translateY(-14px); } }
`;
