// Orbit Estates: the ring station's 32 spaces, its districts and the
// Transmission deck. Money is in credits (₡).

export const START_CASH = 1500;
export const PASS_BONUS = 200;
export const QUARANTINE = 8;
export const BAIL = 50;

// District colour groups. `dome` is the price of one dome; five domes on a
// lot become a Spire.
export const GROUPS = {
  rust:   { name: 'Scrapyard', color: '#a5643f', emoji: '🟫', dome: 50 },
  ice:    { name: 'Icefront',  color: '#5ec8f2', emoji: '🟦', dome: 50 },
  moss:   { name: 'Greenhouse', color: '#6fd35a', emoji: '🟩', dome: 100 },
  ember:  { name: 'Foundry',   color: '#ff8a3d', emoji: '🟧', dome: 100 },
  nebula: { name: 'Nebula Mile', color: '#d45ae0', emoji: '🟪', dome: 150 },
  solar:  { name: 'Sunward',   color: '#ffd23d', emoji: '🟨', dome: 150 },
  crown:  { name: 'Crown',     color: '#e8434f', emoji: '🟥', dome: 200 },
};

const lot = (name, group, price, rents) => ({ kind: 'lot', name, group, price, rents });
const pad = (name) => ({ kind: 'pad', name, price: 200 });
const plant = (name, icon) => ({ kind: 'plant', name, icon, price: 150 });

// rents: [bare lot, 1 dome, 2, 3, 4, Spire]. A bare lot pays double when one
// pilot owns the whole district.
export const BOARD = [
  { kind: 'start', name: 'Launch Dock', icon: '🚀' },
  lot('Slag Alley', 'rust', 60, [4, 20, 60, 170, 300, 440]),
  { kind: 'card', name: 'Transmission', icon: '📡' },
  lot('Rivet Lane', 'rust', 60, [5, 25, 70, 190, 330, 470]),
  pad('Pad Alpha'),
  lot('Frost Wharf', 'ice', 100, [6, 30, 90, 260, 390, 540]),
  lot('Comet Quay', 'ice', 100, [6, 30, 90, 260, 390, 540]),
  lot('Glacier Steps', 'ice', 120, [8, 40, 110, 300, 440, 600]),

  { kind: 'quarantine', name: 'Quarantine', icon: '🧪' },
  lot('Algae Terraces', 'moss', 140, [10, 50, 150, 440, 620, 760]),
  plant('Fusion Plant', '⚡'),
  lot('Spore Gardens', 'moss', 140, [10, 50, 150, 440, 620, 760]),
  pad('Pad Beta'),
  lot('Fern Dome', 'moss', 160, [12, 60, 180, 500, 700, 880]),
  lot('Cinder Market', 'ember', 180, [14, 70, 200, 560, 760, 940]),
  lot('Kiln Street', 'ember', 180, [14, 70, 200, 560, 760, 940]),

  { kind: 'lounge', name: 'Drift Lounge', icon: '🛋️' },
  lot('Forge Plaza', 'ember', 200, [16, 80, 220, 610, 820, 1000]),
  { kind: 'card', name: 'Transmission', icon: '📡' },
  lot('Aurora Arcade', 'nebula', 220, [18, 90, 250, 700, 870, 1050]),
  pad('Pad Gamma'),
  lot('Prism Boulevard', 'nebula', 220, [18, 90, 250, 700, 870, 1050]),
  lot('Starlight Rise', 'nebula', 240, [20, 100, 300, 750, 920, 1100]),
  plant('Ice Mine', '⛏️'),

  { kind: 'inspection', name: 'Customs Sweep', icon: '🚨' },
  lot('Sunspire Row', 'solar', 260, [22, 110, 330, 800, 970, 1150]),
  lot('Flare Court', 'solar', 260, [22, 110, 330, 800, 970, 1150]),
  lot('Corona Square', 'solar', 280, [24, 120, 360, 850, 1030, 1200]),
  pad('Pad Delta'),
  lot('Eclipse Terrace', 'crown', 350, [35, 175, 500, 1100, 1300, 1500]),
  { kind: 'tax', name: 'Ring Levy', icon: '🧾', amount: 100 },
  lot('Zenith Crown', 'crown', 400, [50, 200, 600, 1400, 1700, 2000]),
];

export const N = BOARD.length;
export const OWNABLE = BOARD.map((s, i) => (s.price ? i : -1)).filter((i) => i >= 0);
export const groupLots = (g) => OWNABLE.filter((i) => BOARD[i].group === g);
export const indexOf = (name) => BOARD.findIndex((s) => s.name === name);

// The Transmission deck. Every card is a short broadcast from somewhere on the ring.
export const CARDS = [
  { text: 'Solar wind at your back! Ride it to the Launch Dock.', do: 'goto', to: 0 },
  { text: 'Your hydroponic tomatoes took first prize at the ring fair.', do: 'collect', n: 50 },
  { text: 'A micrometeor dinged your hull. Repairs cost', do: 'pay', n: 50 },
  { text: 'Dome safety audit: pay ₡25 per dome and ₡100 per Spire you own.', do: 'repairs', dome: 25, spire: 100 },
  { text: 'Catch the express tether to the next Shuttle Pad. If someone owns it, pay them double.', do: 'nearest', kind: 'pad' },
  { text: 'Customs found undeclared space cheese in your luggage. Straight to Quarantine!', do: 'quarantine' },
  { text: 'Emergency clearance pass. Use it to walk out of Quarantine. Keep it until you need it.', do: 'pass' },
  { text: 'Thruster misfire! Drift back 3 spaces.', do: 'back', n: 3 },
  { text: 'It\'s your launch-day anniversary. Every pilot sends you ₡20.', do: 'fromEach', n: 20 },
  { text: 'You were voted Ring Council speaker. Pay every pilot ₡25 for the campaign party.', do: 'toEach', n: 25 },
  { text: 'Your asteroid claim struck nickel. Dividend:', do: 'collect', n: 100 },
  { text: 'Sightseeing loop! Advance to Corona Square.', do: 'goto', to: indexOf('Corona Square') },
  { text: 'Take the scenic route to Frost Wharf.', do: 'goto', to: indexOf('Frost Wharf') },
  { text: 'The cargo exchange overcharged you last cycle. Refund:', do: 'collect', n: 75 },
  { text: 'Your oxygen bill came due.', do: 'pay', n: 80 },
  { text: 'Power surge! Head to the next plant. If someone owns it, pay them 10× your roll.', do: 'nearest', kind: 'plant' },
];

export const TOKENS = ['🚀', '🛸', '🛰️', '🤖', '👾', '☄️', '🌙', '🐙'];
