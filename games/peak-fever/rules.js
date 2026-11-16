// Peak Fever rules, kept free of any DOM so they can be tested on their own.
//
// Eleven peaks, numbered 2 to 12 by the dice sum that climbs them. A turn:
// roll four dice, split them into two pairs, and move a climber up the peak
// for each pair's sum. You have three climbers per turn. Keep rolling, or make
// camp to bank how far they got. A roll you can't use at all is an avalanche:
// the turn's climbing is lost. Reach a summit and make camp to plant your
// flag there, which closes that peak for everyone. Three flags wins.

export const PEAKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const HEIGHT = { 2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13, 8: 11, 9: 9, 10: 7, 11: 5, 12: 3 };
export const CLIMBERS = 3;
export const FLAGS_TO_WIN = 3;

/** Fresh game state. */
export function newGame(ids) {
  return {
    camps: Object.fromEntries(PEAKS.map((c) => [c, {}])), // peak -> { playerId: step }
    flags: {},                                           // peak -> playerId
    temp: {},                                            // peak -> step, this turn only
  };
}

export const roll = (rand = Math.random) => [0, 0, 0, 0].map(() => 1 + Math.floor(rand() * 6));

/** Where `pid` stands on `peak` right now, counting this turn's climber. */
export function pos(s, pid, peak) {
  return s.temp[peak] ?? s.camps[peak][pid] ?? 0;
}

function canClimb(s, pid, peak, temp) {
  if (s.flags[peak] != null) return false;
  const here = temp[peak] ?? s.camps[peak][pid] ?? 0;
  if (here >= HEIGHT[peak]) return false;
  return peak in temp || Object.keys(temp).length < CLIMBERS;
}

function climb(s, pid, peak, temp) {
  temp[peak] = (temp[peak] ?? s.camps[peak][pid] ?? 0) + 1;
}

/**
 * Every legal move for a roll, as arrays of peaks to climb (one entry per
 * step, so [7, 7] climbs 7 twice). If both pairs of a split can be used they
 * must both be used. An empty list means an avalanche.
 */
export function moves(s, pid, dice) {
  const [a, b, c, d] = dice;
  const splits = [[a + b, c + d], [a + c, b + d], [a + d, b + c]];
  const out = new Map();
  const add = (m) => { const k = [...m].sort((x, y) => x - y).join('+'); if (!out.has(k)) out.set(k, [...m].sort((x, y) => x - y)); };
  for (const [x, y] of splits) {
    const t = { ...s.temp };
    if (canClimb(s, pid, x, t)) {
      climb(s, pid, x, t);
      if (canClimb(s, pid, y, t)) { add([x, y]); continue; }
    }
    // Only one of the two fits: offer each that does on its own.
    if (canClimb(s, pid, x, { ...s.temp })) add([x]);
    if (canClimb(s, pid, y, { ...s.temp })) add([y]);
  }
  return [...out.values()].sort((m, n) => n.length - m.length || m[0] - n[0] || (m[1] ?? 0) - (n[1] ?? 0));
}

/** Split a roll into the two pairs that make a move, for showing on screen. */
export function pairsFor(dice, move) {
  const idx = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
  const [x, y] = move;
  for (const [i, j, k, l] of idx) {
    const p = dice[i] + dice[j], q = dice[k] + dice[l];
    if (y == null ? (p === x || q === x) : ((p === x && q === y) || (p === y && q === x))) {
      return p === x ? [[i, j], [k, l]] : [[k, l], [i, j]];
    }
  }
  return [[0, 1], [2, 3]];
}

export function apply(s, pid, move) {
  for (const peak of move) climb(s, pid, peak, s.temp);
}

/** Peaks whose summit this turn's climbers are standing on. */
export const summits = (s) => Object.keys(s.temp).map(Number).filter((p) => s.temp[p] >= HEIGHT[p]);

export const flagsOf = (s, pid) => PEAKS.filter((p) => s.flags[p] === pid).length;

/** Make camp: bank the turn. Returns the peaks newly flagged. */
export function bank(s, pid) {
  const planted = [];
  for (const [k, step] of Object.entries(s.temp)) {
    const peak = Number(k);
    s.camps[peak][pid] = step;
    if (step >= HEIGHT[peak]) {
      s.flags[peak] = pid;
      planted.push(peak);
      for (const other of Object.keys(s.camps[peak])) if (Number(other) !== pid) delete s.camps[peak][other];
    }
  }
  s.temp = {};
  return planted;
}

/** Avalanche: the turn's climbing is lost. */
export function bust(s) { s.temp = {}; }

/** Chance that a roll can be used, given the peaks a move may go to. */
export function safeChance(s, pid) {
  let ok = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) for (let d = 1; d <= 6; d++) {
    if (moves(s, pid, [a, b, c, d]).length) ok++;
  }
  return ok / 1296;
}
