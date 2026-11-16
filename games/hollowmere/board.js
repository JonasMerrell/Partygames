// The Hollowmere floor plan. '#' wall, '.' doorway, 'E' front door,
// letters are rooms. Traps arm the tiles listed under each card.
export const MAP = [
  '#####################',
  '#LLLLLL#BBBBBBB#CCCC#',
  '#LLLLLL#BBBBBBB#CCCC#',
  '#LLLLLL.BBBBBBB.CCCC#',
  '#LLLLLL#BBBBBBB#CCCC#',
  '###.#######.#####.###',
  '#HHHHHHHHHHHHHHHHHHH#',
  '#HHHHHHHHHHHHHHHHHHH#',
  '####.####FFF####.####',
  '#SSSSSS##FFF##KKKKKK#',
  '#SSSSSS##FFF##KKKKKK#',
  '#SSSSSS##FFF##KKKKKK#',
  '##########E##########',
];
export const W = MAP[0].length, H = MAP.length;
export const EXIT = [10, 12];

export const ROOMS = {
  L: { name: 'Library', at: [3.5, -0.25] },
  B: { name: 'Ballroom', at: [11.5, -0.25] },
  C: { name: 'Conservatory', at: [18, -0.25] },
  H: { name: 'Great Hall', at: [10.5, 7.8], inside: true },
  F: { name: 'Foyer', at: [10.5, 8.75], inside: true },
  S: { name: 'Study', at: [3.5, 13.45] },
  K: { name: 'Kitchen', at: [17, 13.45] },
};

export const TRAP_TILES = {
  bookcase: [[2, 1], [3, 1], [4, 1], [5, 1]],
  chandelier: [[10, 2], [11, 2], [12, 2], [10, 3], [11, 3], [12, 3]],
  orchid: [[18, 1], [19, 1], [19, 2]],
  trapdoor: [[3, 10], [4, 10]],
  armour: [[6, 6], [6, 7], [14, 6], [14, 7]],
  dumbwaiter: [[19, 10], [19, 11], [18, 11]],
  clock: [[9, 11], [10, 11], [11, 11]],
};

const trapAtTile = {};
for (const [t, tiles] of Object.entries(TRAP_TILES)) for (const [x, y] of tiles) trapAtTile[x + ',' + y] = t;
export const trapAt = (x, y) => trapAtTile[x + ',' + y] || null;
export const cell = (x, y) => MAP[y]?.[x] || '#';
export const walkable = (x, y) => cell(x, y) !== '#';

// Starting tiles, far from the front door.
export const STARTS = [
  [2, 3], [5, 4], [1, 2], [8, 1], [14, 1], [9, 4], [13, 4], [16, 3], [17, 4], [1, 9], [6, 11], [15, 9], [17, 9],
];

export const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
