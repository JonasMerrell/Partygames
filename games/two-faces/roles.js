// The five masks and the moves of Two Faces. Shared by host.js and player.js.

export const ROLES = {
  patron:     { name: 'Patron',     icon: '👑', color: '#f6c95a', does: 'Fund: take 3 gold.',                       blocks: 'Blocks Beg a Favor.' },
  poisoner:   { name: 'Poisoner',   icon: '🧪', color: '#7ef0a0', does: 'Poison: pay 3, a rival loses a mask.',      blocks: '' },
  pickpocket: { name: 'Pickpocket', icon: '🗝️', color: '#c39bff', does: 'Lift: take 2 gold from a rival.',           blocks: 'Blocks Lift.' },
  seer:       { name: 'Seer',       icon: '👁️', color: '#7fd6ff', does: 'Foresee: draw 2 masks, keep the ones you like.', blocks: 'Blocks Lift.' },
  bodyguard:  { name: 'Bodyguard',  icon: '🛡️', color: '#ff7f6e', does: '',                                          blocks: 'Blocks Poison.' },
};

// claim: mask you say you have. cost: gold paid up front. target: picks a rival.
// blockedBy: masks that can block it. anyone: every rival may block (else only the target).
export const MOVES = {
  mingle:  { label: 'Mingle',       short: '+1 gold',                       gain: 1 },
  beg:     { label: 'Beg a Favor',  short: '+2 gold (a Patron can block)',  gain: 2, blockedBy: ['patron'], anyone: true },
  unmask:  { label: 'Unmask',       short: 'pay 7, a rival loses a mask',   cost: 7, target: true },
  fund:    { label: 'Fund',         short: '+3 gold',                       gain: 3, claim: 'patron' },
  poison:  { label: 'Poison',       short: 'pay 3, a rival loses a mask',   cost: 3, target: true, claim: 'poisoner', blockedBy: ['bodyguard'] },
  lift:    { label: 'Lift',         short: 'take 2 gold from a rival',      target: true, claim: 'pickpocket', blockedBy: ['pickpocket', 'seer'] },
  foresee: { label: 'Foresee',      short: 'draw 2 masks, swap any',        claim: 'seer' },
};

export const START_GOLD = 2;
export const MUST_UNMASK = 10;
