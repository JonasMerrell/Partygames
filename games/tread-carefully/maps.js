// Tread Carefully: the six arenas. Each is drawn as the top-left quarter
// (14 x 8 tiles, the last row is the middle row) and mirrored into a fair
// 28 x 15 arena. Tiles:
//   #  wall          x  crate (breaks)     .  floor
//   ~  lava (tanks can't cross, shells fly over)
//   b  bush (hides tanks, shells pass)    T  teleporter pad (pairs with its mirror)
//   L  street lamp (solid, lights the dark)
//   S  spawn point   H  hill spot (Hold the Hill)

export const COLS = 28, ROWS = 15, TILE = 16;

export const MAPS = [
  {
    id: 'meadow', name: 'Meadow Crossroads', theme: 'meadow',
    blurb: 'Stone walls and wooden crates on a sunny field.',
    quarter: [
      '##############',
      '#S......x.....',
      '#.###.......S.',
      '#.#.....##....',
      '#.......#.....',
      '#...x.......xx',
      '#.....###.....',
      '#..x......H...',
    ],
  },
  {
    id: 'frostbite', name: 'Frostbite Flats', theme: 'frost',
    blurb: 'Slippery ice. Tanks slide, so brake early.',
    ice: true,
    quarter: [
      '##############',
      '#S............',
      '#..xx.....#...',
      '#..x...S..#...',
      '#.........x...',
      '#.###.........',
      '#.....xx....##',
      '#.....xx..H...',
    ],
  },
  {
    id: 'magma', name: 'Magma Keep', theme: 'magma',
    blurb: 'Lava rivers block tanks, but shells fly right over.',
    quarter: [
      '##############',
      '#S....~~......',
      '#.....~~...S..',
      '#..#..~~..#...',
      '#..#......#...',
      '#..x...~~~~...',
      '#......~...x..',
      '#.##.H.~......',
    ],
  },
  {
    id: 'orbital', name: 'Orbital Deck', theme: 'orbital',
    blurb: 'Teleporter pads fling tanks and shells across the deck.',
    quarter: [
      '##############',
      '#S.....#......',
      '#......#...S..',
      '#..xx..#......',
      '#..........##.',
      '#.##..........',
      '#.....x..#....',
      '#.T......#.H..',
    ],
  },
  {
    id: 'night', name: 'Night Block', theme: 'night',
    blurb: 'Lights out downtown. Only lamps and headlights show the way.',
    dark: true,
    quarter: [
      '##############',
      '#S..........L.',
      '#.####..####..',
      '#.####..####S.',
      '#.......x.....',
      '#.xx..L.......',
      '#.####..###...',
      '#.####..###.H.',
    ],
  },
  {
    id: 'overgrowth', name: 'Overgrowth', theme: 'jungle',
    blurb: 'Tall bushes hide tanks. Shots go straight through them.',
    quarter: [
      '##############',
      '#S...bbb......',
      '#....bbb...S..',
      '#.#.....##....',
      '#.#..x..##.bb.',
      '#bb.......bb..',
      '#bb...##......',
      '#....x##..H...',
    ],
  },
];

// Tile codes
export const FLOOR = 0, WALL = 1, CRATE = 2, LAVA = 3, BUSH = 4, PAD = 5, LAMP = 6;
const CODE = { '#': WALL, x: CRATE, '.': FLOOR, '~': LAVA, b: BUSH, T: PAD, L: LAMP, S: FLOOR, H: FLOOR };

export function expand(def) {
  const q = def.quarter;
  const rows = [];
  for (let y = 0; y < ROWS; y++) {
    const src = q[y < 8 ? y : ROWS - 1 - y];
    rows.push(src + [...src].reverse().join(''));
  }
  return rows;
}

export function buildMap(def) {
  const rows = expand(def);
  const grid = new Uint8Array(COLS * ROWS);
  const crateHp = new Uint8Array(COLS * ROWS);
  const spawns = [], hills = [], pads = [], lamps = [];
  const seen = new Set();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = rows[y][x];
    const i = y * COLS + x;
    grid[i] = CODE[ch] ?? FLOOR;
    if (grid[i] === CRATE) crateHp[i] = 2;
    const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
    if (ch === 'S') spawns.push({ x: cx, y: cy });
    if (ch === 'H' && !seen.has(i)) { seen.add(i); hills.push({ x: cx, y: cy }); }
    if (ch === 'T') pads.push({ x: cx, y: cy, tx: x, ty: y });
    if (ch === 'L') lamps.push({ x: cx, y: cy });
  }
  // Each pad links to the pad mirrored through the centre.
  for (const p of pads) {
    const m = pads.find((o) => o.tx === COLS - 1 - p.tx && o.ty === ROWS - 1 - p.ty);
    p.to = m || p;
  }
  return { id: def.id, name: def.name, theme: def.theme, ice: !!def.ice, dark: !!def.dark, grid, crateHp, spawns, hills, pads, lamps };
}
