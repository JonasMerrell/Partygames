// Hollowmere art: the twelve heirs (drawn as little SVG portraits), the
// trap cards, and the codicil. Shared by the TV (host.js) and phones (player.js).

export const HEIRS = [
  { id: 'fitch', name: 'Colonel Fitch', color: '#d64541', skin: '#f1c7a1', hat: 'cap', acc: ['mustache'] },
  { id: 'ashby', name: 'Lady Ashby', color: '#9b59b6', skin: '#f6d5b8', hair: 'bob', hairColor: '#6b3e26', hat: 'feather', acc: ['pearls'] },
  { id: 'quill', name: 'Dr. Quill', color: '#16a085', skin: '#e0b48a', hair: 'sides', hairColor: '#8a8a8a', acc: ['glasses', 'bowtie'] },
  { id: 'vane', name: 'Miss Vane', color: '#e67e22', skin: '#fbe0c8', hair: 'bob', hairColor: '#1d1d1d', acc: ['lips'] },
  { id: 'crumb', name: 'Reverend Crumb', color: '#5d6d7e', skin: '#f0cfae', hair: 'sides', hairColor: '#f2f2f2', acc: ['collar'] },
  { id: 'rue', name: 'Madame Rue', color: '#d4ac0d', skin: '#b97d52', hat: 'turban', acc: ['earrings'] },
  { id: 'wilbur', name: 'Cousin Wilbur', color: '#27ae60', skin: '#f5cfa8', hair: 'messy', hairColor: '#d35400', hat: 'flat', acc: ['freckles'] },
  { id: 'ida', name: 'Baroness Ida', color: '#e84393', skin: '#f3d0c0', hair: 'bun', hairColor: '#b8b8b8', hat: 'tiara', acc: ['pearls'] },
  { id: 'gale', name: 'Captain Gale', color: '#2e86de', skin: '#d9a679', hair: 'long', hairColor: '#3b2314', hat: 'captain', acc: [] },
  { id: 'dust', name: 'Professor Dust', color: '#95a5a6', skin: '#edc9a3', hair: 'sides', hairColor: '#dddddd', acc: ['monocle', 'beard'] },
  { id: 'agnes', name: 'Nanny Agnes', color: '#a0522d', skin: '#f0c8a8', hair: 'bun', hairColor: '#5a3a22', acc: ['glasses'] },
  { id: 'percival', name: 'Sir Percival', color: '#6c5ce7', skin: '#f2d2b6', hat: 'top', acc: ['goatee', 'bowtie'] },
];
export const HEIR = Object.fromEntries(HEIRS.map((x) => [x.id, x]));

// Cards. Each trap card springs that trap; a codicil rewrites the will.
export const CARDS = {
  bookcase: { name: 'Toppling Bookcase', room: 'Library', icon: '📚', verb: 'was flattened by a falling bookcase' },
  chandelier: { name: 'Chandelier', room: 'Ballroom', icon: '🕯️', verb: 'was crowned by the chandelier' },
  orchid: { name: 'Hungry Orchid', room: 'Conservatory', icon: '🌺', verb: 'was swallowed by the Hungry Orchid' },
  trapdoor: { name: 'Trapdoor', room: 'Study', icon: '🕳️', verb: 'dropped through the trapdoor' },
  armour: { name: 'Suit of Armour', room: 'Great Hall', icon: '🛡️', verb: 'was clobbered by a suit of armour' },
  dumbwaiter: { name: 'Dumbwaiter', room: 'Kitchen', icon: '🧺', verb: 'was whisked away down the dumbwaiter' },
  clock: { name: 'Grandfather Clock', room: 'Foyer', icon: '🕰️', verb: 'was bonked by the pendulum' },
  codicil: { name: 'Codicil', room: null, icon: '📜', verb: '' },
};

let uid = 0;
/** An SVG portrait of an heir as a string. `out` greys it and crosses it out. */
export function portrait(heir, size = 64, out = false) {
  const id = 'hm' + (++uid);
  const s = heir.skin, hc = heir.hairColor || '#333', c = heir.color;
  const p = [];
  p.push(`<defs><clipPath id="${id}"><circle cx="50" cy="50" r="46"/></clipPath></defs>`);
  p.push(`<circle cx="50" cy="50" r="47" fill="${c}"/>`);
  p.push(`<g clip-path="url(#${id})">`);
  p.push(`<rect x="0" y="0" width="100" height="100" fill="#000" opacity=".18"/>`);
  // hair behind the head
  if (heir.hair === 'long') p.push(`<path d="M30 45 Q28 80 36 86 L64 86 Q72 80 70 45 Z" fill="${hc}"/>`);
  if (heir.hair === 'bob') p.push(`<path d="M29 50 Q27 22 50 22 Q73 22 71 50 L71 64 L29 64 Z" fill="${hc}"/>`);
  if (heir.hair === 'bun') p.push(`<circle cx="50" cy="22" r="10" fill="${hc}"/>`);
  // body
  p.push(`<path d="M14 104 Q16 72 50 70 Q84 72 86 104 Z" fill="${c}" stroke="#1a1426" stroke-width="2.5"/>`);
  if (heir.acc.includes('collar')) p.push(`<path d="M40 72 L50 82 L60 72 Z" fill="#222"/><rect x="46" y="72" width="8" height="5" fill="#fff"/>`);
  if (heir.acc.includes('bowtie')) p.push(`<path d="M40 74 L50 78 L40 83 Z M60 74 L50 78 L60 83 Z" fill="#1a1426"/>`);
  if (heir.acc.includes('pearls')) p.push([42, 46, 50, 54, 58].map((x, i) => `<circle cx="${x}" cy="${74 + (i === 2 ? 2 : i % 4 ? 1.2 : 0)}" r="2.2" fill="#fff8e7"/>`).join(''));
  // neck + head
  p.push(`<rect x="44" y="58" width="12" height="14" fill="${s}"/>`);
  p.push(`<ellipse cx="50" cy="45" rx="18" ry="21" fill="${s}" stroke="#1a1426" stroke-width="2"/>`);
  // hair on top
  if (heir.hair === 'bob') p.push(`<path d="M32 42 Q34 24 50 24 Q66 24 68 42 Q58 34 50 36 Q40 34 32 42 Z" fill="${hc}"/>`);
  if (heir.hair === 'bun') p.push(`<path d="M32 40 Q36 26 50 26 Q64 26 68 40 Q60 32 50 33 Q40 32 32 40 Z" fill="${hc}"/>`);
  if (heir.hair === 'sides') p.push(`<path d="M31 46 Q30 34 35 32 L37 46 Z M69 46 Q70 34 65 32 L63 46 Z" fill="${hc}"/>`);
  if (heir.hair === 'messy') p.push(`<path d="M32 40 L34 28 L40 32 L44 24 L50 30 L56 23 L60 31 L66 27 L68 40 Q50 32 32 40 Z" fill="${hc}"/>`);
  if (heir.hair === 'long') p.push(`<path d="M32 44 Q32 25 50 25 Q68 25 68 44 Q60 32 50 34 Q40 32 32 44 Z" fill="${hc}"/>`);
  // face
  p.push(`<circle cx="43" cy="46" r="2.4" fill="#1a1426"/><circle cx="57" cy="46" r="2.4" fill="#1a1426"/>`);
  p.push(`<circle cx="39" cy="54" r="3" fill="#ff7b7b" opacity=".35"/><circle cx="61" cy="54" r="3" fill="#ff7b7b" opacity=".35"/>`);
  if (heir.acc.includes('lips')) p.push(`<path d="M45 57 Q50 61 55 57 Q50 59 45 57 Z" fill="#c0392b" stroke="#c0392b" stroke-width="1.5"/>`);
  else p.push(`<path d="M45 57 Q50 61 55 57" fill="none" stroke="#1a1426" stroke-width="2" stroke-linecap="round"/>`);
  if (heir.acc.includes('freckles')) p.push([[40, 51], [43, 53], [57, 53], [60, 51]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#a0522d"/>`).join(''));
  if (heir.acc.includes('mustache')) p.push(`<path d="M41 55 Q46 50 50 54 Q54 50 59 55 Q54 54 50 56 Q46 54 41 55 Z" fill="#5a3a22" stroke="#5a3a22" stroke-width="1.5"/>`);
  if (heir.acc.includes('beard')) p.push(`<path d="M33 50 Q34 70 50 72 Q66 70 67 50 Q62 62 50 62 Q38 62 33 50 Z" fill="#e8e8e8"/>`);
  if (heir.acc.includes('goatee')) p.push(`<path d="M46 61 Q50 70 54 61 Z" fill="#3b2314"/><path d="M42 55 Q50 51 58 55" stroke="#3b2314" stroke-width="2.5" fill="none"/>`);
  if (heir.acc.includes('glasses')) p.push(`<g fill="none" stroke="#1a1426" stroke-width="2"><circle cx="43" cy="46" r="5.5"/><circle cx="57" cy="46" r="5.5"/><path d="M48.5 46 L51.5 46"/></g>`);
  if (heir.acc.includes('monocle')) p.push(`<circle cx="57" cy="46" r="6" fill="#fff" fill-opacity=".25" stroke="#d4ac0d" stroke-width="2"/><path d="M62 49 Q66 60 64 70" stroke="#d4ac0d" fill="none" stroke-width="1.2"/>`);
  if (heir.acc.includes('earrings')) p.push(`<circle cx="32" cy="52" r="2.5" fill="#f5d76e"/><circle cx="68" cy="52" r="2.5" fill="#f5d76e"/>`);
  // hats
  const hat = {
    cap: `<path d="M31 34 Q32 18 50 18 Q68 18 69 34 Z" fill="#3d5a3d" stroke="#1a1426" stroke-width="2"/><path d="M28 34 L74 34 L76 38 L26 38 Z" fill="#222"/><circle cx="50" cy="27" r="3" fill="#f5d76e"/>`,
    feather: `<ellipse cx="50" cy="30" rx="30" ry="6" fill="#4a235a" stroke="#1a1426" stroke-width="2"/><path d="M36 30 Q38 14 50 14 Q62 14 64 30 Z" fill="#4a235a" stroke="#1a1426" stroke-width="2"/><path d="M62 22 Q80 6 86 12 Q76 14 64 26 Z" fill="#f5d76e"/>`,
    turban: `<path d="M30 40 Q28 16 50 15 Q72 16 70 40 Q60 33 50 34 Q40 33 30 40 Z" fill="#f7e9c3" stroke="#1a1426" stroke-width="2"/><path d="M34 34 Q50 22 66 34" stroke="#d9c79a" stroke-width="3" fill="none"/><circle cx="50" cy="28" r="4" fill="#c0392b" stroke="#f5d76e" stroke-width="1.5"/>`,
    flat: `<path d="M30 36 Q30 22 50 21 Q72 22 72 34 L78 37 Q60 40 30 36 Z" fill="#7f6a4f" stroke="#1a1426" stroke-width="2"/>`,
    tiara: `<path d="M38 30 L41 22 L45 28 L50 18 L55 28 L59 22 L62 30 Z" fill="#f5d76e" stroke="#b7950b" stroke-width="1.5"/><circle cx="50" cy="24" r="2" fill="#e84393"/>`,
    captain: `<path d="M32 33 Q33 20 50 19 Q67 20 68 33 Z" fill="#fff" stroke="#1a1426" stroke-width="2"/><path d="M28 33 L72 33 L70 38 L30 38 Z" fill="#1f3a5f"/><path d="M44 26 L56 26" stroke="#f5d76e" stroke-width="3"/>`,
    top: `<rect x="36" y="6" width="28" height="22" fill="#1a1426"/><rect x="36" y="22" width="28" height="4" fill="#9b2335"/><ellipse cx="50" cy="29" rx="22" ry="4" fill="#1a1426"/>`,
  }[heir.hat];
  if (hat) p.push(hat);
  p.push('</g>');
  p.push(`<circle cx="50" cy="50" r="47" fill="none" stroke="#1a1426" stroke-width="4"/>`);
  if (out) p.push(`<circle cx="50" cy="50" r="47" fill="#14111f" opacity=".55"/><path d="M24 24 L76 76 M76 24 L24 76" stroke="#ff5d73" stroke-width="7" stroke-linecap="round"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" class="portrait">${p.join('')}</svg>`;
}
