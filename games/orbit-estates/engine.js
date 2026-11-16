// Orbit Estates rules. The engine knows nothing about screens: everything it
// shows or asks goes through `io` (host.js on the TV, or the simulator in
// tools/sim-orbit-estates.mjs), so the whole game can be tested headless.
import {
  BOARD, GROUPS, CARDS, N, OWNABLE, groupLots, START_CASH, PASS_BONUS, QUARANTINE, BAIL, TOKENS,
} from './board.js';

const TURN_TIME = 75;      // seconds for a menu choice before the default kicks in
const BUY_TIME = 40;
const AUCTION_TIME = 20;
const TRADE_TIME = 45;
const MAX_TRADES_PER_TURN = 3;

export const money = (n) => `₡${n}`;
const lotLabel = (i) => {
  const s = BOARD[i];
  return `${s.group ? GROUPS[s.group].emoji : s.kind === 'pad' ? '🛬' : s.icon} ${s.name}`;
};

export class Game {
  constructor(io, players, opts = {}) {
    this.io = io;
    this.players = players.map((p, k) => ({
      id: p.id, name: p.name, color: p.color, token: TOKENS[k % TOKENS.length],
      cash: START_CASH, pos: 0, jailed: false, jailTries: 0, passes: 0, bankrupt: false, out: 0,
    }));
    this.lots = new Map(OWNABLE.map((i) => [i, { owner: null, level: 0, mortgaged: false }]));
    this.deck = shuffle(CARDS.map((_, k) => k));
    this.passHeld = 0;
    this.limitMs = opts.limitMs || 0;
    this.startedAt = io.now();
    this.lastRound = false;
    this.turnOf = null;
    this.dice = [1, 1];
    this.round = 1;
    this.feed = [];
    this.maxRounds = opts.maxRounds || Infinity;
    this.outCount = 0;
  }

  // ---------- queries ----------
  get active() { return this.players.filter((p) => !p.bankrupt); }
  get(id) { return this.players.find((p) => p.id === id); }
  owned(p) { return OWNABLE.filter((i) => this.lots.get(i).owner === p.id); }
  ownsGroup(pid, g) { return groupLots(g).every((i) => this.lots.get(i).owner === pid); }
  groupBuilt(g) { return groupLots(g).some((i) => this.lots.get(i).level > 0); }
  countKind(pid, kind) { return OWNABLE.filter((i) => BOARD[i].kind === kind && this.lots.get(i).owner === pid).length; }

  rent(i, roll) {
    const s = BOARD[i], L = this.lots.get(i);
    if (!L.owner || L.mortgaged) return 0;
    if (s.kind === 'pad') return 25 * 2 ** (this.countKind(L.owner, 'pad') - 1);
    if (s.kind === 'plant') return roll * (this.countKind(L.owner, 'plant') === 2 ? 10 : 4);
    if (L.level) return s.rents[L.level];
    return s.rents[0] * (this.ownsGroup(L.owner, s.group) ? 2 : 1);
  }

  unmortgageCost(i) { return Math.ceil(BOARD[i].price * 0.55); }

  canBuild(p, i) {
    const s = BOARD[i], L = this.lots.get(i);
    if (s.kind !== 'lot' || L.owner !== p.id || L.level >= 5) return false;
    const g = groupLots(s.group);
    if (!this.ownsGroup(p.id, s.group) || g.some((j) => this.lots.get(j).mortgaged)) return false;
    return L.level === Math.min(...g.map((j) => this.lots.get(j).level)) && p.cash >= GROUPS[s.group].dome;
  }
  canSell(p, i) {
    const s = BOARD[i], L = this.lots.get(i);
    if (s.kind !== 'lot' || L.owner !== p.id || !L.level) return false;
    return L.level === Math.max(...groupLots(s.group).map((j) => this.lots.get(j).level));
  }
  canMortgage(p, i) {
    const s = BOARD[i], L = this.lots.get(i);
    return L.owner === p.id && !L.mortgaged && !(s.group && this.groupBuilt(s.group));
  }
  tradeable(p) { return this.owned(p).filter((i) => !(BOARD[i].group && this.groupBuilt(BOARD[i].group))); }

  /** Cash the player could raise by selling every dome and mortgaging every lot. */
  liquid(p) {
    let v = p.cash;
    for (const i of this.owned(p)) {
      const s = BOARD[i], L = this.lots.get(i);
      if (L.level) v += L.level * GROUPS[s.group].dome / 2;
      if (!L.mortgaged) v += s.price / 2;
    }
    return v;
  }
  worth(p) {
    if (p.bankrupt) return 0;
    let v = p.cash;
    for (const i of this.owned(p)) {
      const s = BOARD[i], L = this.lots.get(i);
      v += L.mortgaged ? s.price / 2 : s.price;
      if (L.level) v += L.level * GROUPS[s.group].dome;
    }
    return v;
  }
  timeLeft() { return this.limitMs ? Math.max(0, this.limitMs - (this.io.now() - this.startedAt)) : null; }

  log(text, who) {
    this.feed.unshift({ text, color: who?.color });
    this.feed.length = Math.min(this.feed.length, 8);
    this.io.log?.(text, who);
  }
  async show(ms = 0) { this.io.update(); if (ms) await this.io.pause(ms); }

  // ---------- the game ----------
  async play() {
    this.log('Welcome aboard. First pilot to the Launch Dock rolls!');
    let k = 0;
    while (this.active.length > 1) {
      const p = this.players[k];
      if (!p.bankrupt) {
        await this.turn(p);
      }
      k = (k + 1) % this.players.length;
      if (k === 0) {
        this.round++;
        if (this.lastRound || this.round > this.maxRounds) break;
      }
      if (this.limitMs && !this.lastRound && this.timeLeft() === 0) {
        this.lastRound = true;
        if (k === 0) break;
        this.log('⏰ Time is up! This is the last round.');
        await this.io.announce?.('⏰ Last round!', 'Time is up. Everyone gets one more turn, then we count the money.');
      }
    }
    return this.standings();
  }

  standings() {
    // Solvent pilots by net worth, then the bankrupt ones, last to fall first.
    const key = (p) => (p.bankrupt ? [1, -p.out] : [0, -this.worth(p)]);
    return [...this.players].sort((a, b) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1])
      .map((p) => ({ ...p, worth: this.worth(p) }));
  }

  async turn(p) {
    this.turnOf = p.id;
    this.tradesThisTurn = 0;
    this.io.sfx?.('ding');
    await this.io.waitFor?.(p, 20);
    await this.show(400);
    let doubles = 0;
    if (p.jailed) {
      const r = await this.quarantineTurn(p);
      if (r === 'stay' || p.bankrupt) return this.endTurn(p);
      if (r === 'moved') return this.afterMoves(p);
    }
    for (;;) {
      if (!(await this.menu(p, 'pre'))) return this.endTurn(p);
      const [a, b] = await this.roll(p);
      if (a === b) doubles++;
      if (doubles === 3) {
        this.log(`${p.name} rolled three doubles. Customs is suspicious!`, p);
        await this.toQuarantine(p);
        return this.endTurn(p);
      }
      await this.moveBy(p, a + b);
      await this.land(p, a + b);
      if (p.bankrupt || p.jailed || a !== b) break;
      this.log(`${p.name} rolled doubles and goes again.`, p);
      await this.show(600);
    }
    return this.afterMoves(p);
  }

  async afterMoves(p) {
    if (!p.bankrupt) await this.menu(p, 'post');
    this.endTurn(p);
  }
  endTurn() { this.turnOf = null; this.io.update(); }

  async roll(p) {
    const a = 1 + Math.floor(this.io.random() * 6), b = 1 + Math.floor(this.io.random() * 6);
    this.dice = [a, b];
    await this.io.rollDice?.(a, b);
    this.log(`${p.name} rolled ${a} + ${b}${a === b ? ' (doubles!)' : ''}.`, p);
    await this.show(300);
    return [a, b];
  }

  // ---------- movement ----------
  async moveBy(p, n) {
    for (let k = 0; k < n; k++) {
      p.pos = (p.pos + 1) % N;
      if (p.pos === 0) this.passStart(p);
      this.io.step?.();
      await this.show(170);
    }
  }
  async moveTo(p, to) {
    while (p.pos !== to) await this.moveBy(p, 1);
  }
  async moveBack(p, n) {
    for (let k = 0; k < n; k++) {
      p.pos = (p.pos - 1 + N) % N;
      this.io.step?.();
      await this.show(170);
    }
  }
  passStart(p) {
    p.cash += PASS_BONUS;
    this.log(`${p.name} docks at Launch and collects ${money(PASS_BONUS)}.`, p);
    this.io.sfx?.('ding');
  }
  async toQuarantine(p) {
    p.pos = QUARANTINE; p.jailed = true; p.jailTries = 0;
    this.io.sfx?.('buzz');
    this.log(`${p.name} is sent to Quarantine.`, p);
    await this.show(1200);
  }

  async quarantineTurn(p) {
    const opts = [{ label: '🎲 Roll for doubles', value: 'roll' }];
    if (p.passes) opts.unshift({ label: '🎫 Use your clearance pass', value: 'pass' });
    if (p.cash >= BAIL) opts.unshift({ label: `💸 Pay ${money(BAIL)} and walk out`, value: 'pay' });
    const c = await this.io.choose(p, {
      title: 'You are in Quarantine',
      text: `Try ${3 - p.jailTries} more time${p.jailTries === 2 ? '' : 's'} for doubles, or get out now and roll normally.`,
      choices: opts,
    }, 'roll', TURN_TIME);
    if (c === 'pass' && p.passes) {
      p.passes--; this.returnPass(1); p.jailed = false;
      this.log(`${p.name} flashes a clearance pass and leaves Quarantine.`, p);
      return 'free';
    }
    if (c === 'pay' && p.cash >= BAIL) {
      p.cash -= BAIL; p.jailed = false;
      this.log(`${p.name} pays ${money(BAIL)} to leave Quarantine.`, p);
      return 'free';
    }
    const [a, b] = await this.roll(p);
    if (a === b) {
      p.jailed = false;
      this.log(`${p.name} rolled doubles and is cleared!`, p);
      await this.moveBy(p, a + b);
      await this.land(p, a + b);
      return 'moved';
    }
    p.jailTries++;
    if (p.jailTries < 3) {
      this.log(`${p.name} stays in Quarantine.`, p);
      return 'stay';
    }
    this.log(`${p.name} has waited long enough and must pay ${money(BAIL)}.`, p);
    if (!(await this.pay(p, BAIL, null, 'the Quarantine fee'))) return 'stay';
    p.jailed = false;
    await this.moveBy(p, a + b);
    await this.land(p, a + b);
    return 'moved';
  }

  returnPass(n) {
    this.passHeld -= n;
    const k = CARDS.findIndex((c) => c.do === 'pass');
    for (let j = 0; j < n; j++) if (!this.deck.includes(k)) this.deck.push(k);
  }

  // ---------- landing ----------
  async land(p, roll, mult = 1) {
    const s = BOARD[p.pos];
    await this.show(250);
    switch (s.kind) {
      case 'lot': case 'pad': case 'plant': {
        const L = this.lots.get(p.pos);
        if (!L.owner) return this.offer(p, p.pos);
        if (L.owner === p.id) return this.log(`${p.name} is home at ${s.name}.`, p);
        const owner = this.get(L.owner);
        if (L.mortgaged) return this.log(`${s.name} is mortgaged, so ${p.name} pays no rent.`, p);
        const due = this.rent(p.pos, roll) * mult;
        this.log(`${p.name} owes ${owner.name} ${money(due)} rent for ${s.name}.`, p);
        await this.pay(p, due, owner, `rent on ${s.name}`);
        return;
      }
      case 'card': return this.drawCard(p, roll);
      case 'tax':
        this.log(`${p.name} pays the ${s.name}: ${money(s.amount)}.`, p);
        return this.pay(p, s.amount, null, `the ${s.name}`);
      case 'inspection': return this.toQuarantine(p);
      case 'quarantine': return this.log(`${p.name} waves at the folks in Quarantine.`, p);
      case 'lounge': return this.log(`${p.name} floats around the Drift Lounge. Nothing happens.`, p);
      default: return undefined;
    }
  }

  async offer(p, i) {
    const s = BOARD[i];
    let buy = 'auction';
    if (p.cash >= s.price) {
      this.io.focus?.(i, `${p.token} ${p.name} is deciding on ${s.name}`);
      buy = await this.io.choose(p, {
        title: s.name,
        text: `${deedText(s)}\nYou have ${money(p.cash)}.`,
        color: s.group ? GROUPS[s.group].color : undefined,
        choices: [{ label: `Buy it for ${money(s.price)}`, value: 'buy' }, { label: '🔨 Put it up for auction', value: 'auction' }],
      }, 'auction', BUY_TIME);
    }
    if (buy === 'buy' && p.cash >= s.price) {
      p.cash -= s.price;
      this.lots.get(i).owner = p.id;
      this.io.sfx?.('win');
      this.log(`${p.name} bought ${s.name} for ${money(s.price)}.`, p);
      await this.show(800);
      return;
    }
    await this.auction(i);
  }

  async auction(i) {
    const s = BOARD[i];
    const bidders = this.active.filter((p) => p.cash >= 10);
    if (!bidders.length) return;
    this.log(`🔨 ${s.name} goes up for auction!`);
    const bids = await this.io.auction(i, bidders, AUCTION_TIME);
    let best = 0, winners = [];
    for (const p of bidders) {
      const b = Math.min(Math.floor(Number(bids.get(p.id)) || 0), p.cash);
      if (b > best) { best = b; winners = [p]; } else if (b === best && b > 0) winners.push(p);
    }
    if (!best) {
      this.log(`Nobody bid on ${s.name}. It stays with the station.`);
      await this.show(1500);
      return;
    }
    const w = winners[Math.floor(this.io.random() * winners.length)];
    w.cash -= best;
    this.lots.get(i).owner = w.id;
    this.io.sfx?.('win');
    this.log(`${w.name} wins ${s.name} for ${money(best)}${winners.length > 1 ? ' (a tie, settled by coin flip)' : ''}.`, w);
    await this.io.auctionResult?.(i, bidders.map((p) => ({ p, bid: Math.min(Number(bids.get(p.id)) || 0, p.cash) })), w, best);
    await this.show(600);
  }

  async drawCard(p, roll) {
    let k = this.deck.shift();
    const c = CARDS[k];
    if (c.do !== 'pass') this.deck.push(k);
    const amount = c.n && ['collect', 'pay'].includes(c.do) ? ` ${money(c.n)}.` : '';
    this.log(`📡 ${p.name}: ${c.text}${amount}`, p);
    await this.io.card?.(p, c.text + amount);
    switch (c.do) {
      case 'collect': p.cash += c.n; this.io.sfx?.('ding'); break;
      case 'pay': await this.pay(p, c.n, null, 'a Transmission'); break;
      case 'goto': await this.moveTo(p, c.to); if (c.to) await this.land(p, roll); break;
      case 'back': await this.moveBack(p, c.n); await this.land(p, roll); break;
      case 'quarantine': await this.toQuarantine(p); break;
      case 'pass': p.passes++; this.passHeld++; break;
      case 'repairs': {
        let due = 0;
        for (const i of this.owned(p)) {
          const L = this.lots.get(i);
          due += L.level === 5 ? c.spire : L.level * c.dome;
        }
        if (due) { this.log(`${p.name}'s audit bill is ${money(due)}.`, p); await this.pay(p, due, null, 'the dome audit'); }
        else this.log(`${p.name} has no domes, so the audit is free.`, p);
        break;
      }
      case 'fromEach':
        for (const o of this.active) if (o !== p) { if (p.bankrupt) break; await this.pay(o, c.n, p, `${p.name}'s anniversary`); }
        break;
      case 'toEach':
        for (const o of this.active) if (o !== p) { if (p.bankrupt) break; await this.pay(p, c.n, o, 'the campaign party'); }
        break;
      case 'nearest': {
        let to = p.pos;
        do { to = (to + 1) % N; } while (BOARD[to].kind !== c.kind);
        await this.moveTo(p, to);
        const L = this.lots.get(to);
        if (c.kind === 'plant' && L.owner && L.owner !== p.id && !L.mortgaged) {
          const due = roll * 10;
          this.log(`${p.name} owes ${this.get(L.owner).name} ${money(due)} for the power surge.`, p);
          await this.pay(p, due, this.get(L.owner), `power at ${BOARD[to].name}`);
        } else await this.land(p, roll, c.kind === 'pad' ? 2 : 1);
        break;
      }
      default: break;
    }
    await this.show(400);
  }

  // ---------- money ----------
  /** Pay `amount` to `to` (a player, or null for the station). Returns false if it bankrupts `p`. */
  async pay(p, amount, to, why) {
    if (amount <= 0) return true;
    if (p.cash < amount) {
      const ok = await this.raise(p, amount, to, why);
      if (!ok) return false;
    }
    p.cash -= amount;
    if (to && !to.bankrupt) to.cash += amount;
    this.io.sfx?.('pop');
    this.io.update();
    return true;
  }

  async raise(p, amount, to, why) {
    if (this.liquid(p) < amount) {
      this.log(`${p.name} can't cover ${money(amount)} for ${why}!`, p);
      await this.bankrupt(p, to);
      return false;
    }
    this.io.sfx?.('buzz');
    while (p.cash < amount) {
      const opts = this.fundOptions(p);
      const choice = await this.io.choose(p, {
        title: `You owe ${money(amount)}`,
        text: `For ${why}. You have ${money(p.cash)}. Sell domes or mortgage lots to raise ${money(amount - p.cash)} more.`,
        buzz: true, color: '#ff5d73',
        choices: [...opts, { label: '🏳️ Declare bankruptcy', value: 'bankrupt' }],
      }, opts[0].value, TURN_TIME);
      if (choice === 'bankrupt') { await this.bankrupt(p, to); return false; }
      this.applyFund(p, choice) || this.applyFund(p, opts[0].value);
    }
    return true;
  }

  fundOptions(p) {
    const out = [];
    for (const i of this.owned(p)) {
      if (this.canSell(p, i)) out.push({ label: `Sell a dome on ${lotLabel(i)} (+${money(GROUPS[BOARD[i].group].dome / 2)})`, value: `sell:${i}` });
    }
    for (const i of this.owned(p)) {
      if (this.canMortgage(p, i)) out.push({ label: `Mortgage ${lotLabel(i)} (+${money(BOARD[i].price / 2)})`, value: `mort:${i}` });
    }
    return out;
  }

  applyFund(p, v) {
    const [op, s] = String(v).split(':'); const i = Number(s);
    if (!this.lots.has(i)) return false;
    const L = this.lots.get(i);
    if (op === 'sell' && this.canSell(p, i)) {
      L.level--; p.cash += GROUPS[BOARD[i].group].dome / 2;
      this.log(`${p.name} sold a dome on ${BOARD[i].name}.`, p);
    } else if (op === 'mort' && this.canMortgage(p, i)) {
      L.mortgaged = true; p.cash += BOARD[i].price / 2;
      this.log(`${p.name} mortgaged ${BOARD[i].name}.`, p);
    } else if (op === 'unmort' && L.owner === p.id && L.mortgaged && p.cash >= this.unmortgageCost(i)) {
      L.mortgaged = false; p.cash -= this.unmortgageCost(i);
      this.log(`${p.name} paid off the mortgage on ${BOARD[i].name}.`, p);
    } else if (op === 'build' && this.canBuild(p, i)) {
      L.level++; p.cash -= GROUPS[BOARD[i].group].dome;
      this.io.sfx?.('pop');
      this.log(L.level === 5 ? `${p.name} raised a Spire on ${BOARD[i].name}!` : `${p.name} built dome ${L.level} on ${BOARD[i].name}.`, p);
    } else return false;
    this.io.update();
    return true;
  }

  async bankrupt(p, to) {
    for (const i of this.owned(p)) {
      const L = this.lots.get(i);
      if (L.level) { p.cash += L.level * GROUPS[BOARD[i].group].dome / 2; L.level = 0; }
    }
    const lots = this.owned(p);
    if (to && !to.bankrupt) {
      to.cash += Math.max(0, p.cash);
      for (const i of lots) this.lots.get(i).owner = to.id;
      to.passes += p.passes;
      this.log(`💥 ${p.name} is bankrupt! ${to.name} takes everything.`, p);
    } else {
      for (const i of lots) Object.assign(this.lots.get(i), { owner: null, level: 0, mortgaged: false });
      this.returnPass(p.passes);
      this.log(`💥 ${p.name} is bankrupt! Their lots go back to the station.`, p);
    }
    p.cash = 0; p.passes = 0; p.bankrupt = true; p.jailed = false; p.out = ++this.outCount;
    this.io.sfx?.('lose');
    await this.io.announce?.(`💥 ${p.name} is bankrupt`, to && !to.bankrupt ? `${to.name} takes everything they had.` : 'Their lots go back to the station.');
    await this.show(500);
  }

  // ---------- the turn menu ----------
  /** Returns false only if the player went bankrupt. */
  async menu(p, phase) {
    for (;;) {
      if (p.bankrupt) return false;
      const go = phase === 'pre' ? { label: '🎲 Roll the dice', value: 'go' } : { label: '✅ End my turn', value: 'go' };
      const opts = [go];
      if (this.owned(p).some((i) => this.canBuild(p, i))) opts.push({ label: '🏗️ Build domes', value: 'build' });
      if (this.owned(p).length) opts.push({ label: '💳 Mortgage or sell', value: 'bank' });
      if (this.tradesThisTurn < MAX_TRADES_PER_TURN && this.active.length > 1) opts.push({ label: '🤝 Propose a trade', value: 'trade' });
      this.io.focus?.(null, phase === 'pre' ? `${p.token} ${p.name}'s turn` : `${p.token} ${p.name} is wrapping up`);
      const c = await this.io.choose(p, {
        title: phase === 'pre' ? 'Your turn!' : 'Anything else?',
        text: `You have ${money(p.cash)}${this.lastRound ? '\n⏰ Last round!' : ''}`,
        buzz: phase === 'pre',
        choices: opts,
      }, 'go', TURN_TIME);
      if (c === 'go' || c == null) return true;
      if (c === 'build') await this.buildMenu(p);
      if (c === 'bank') await this.bankMenu(p);
      if (c === 'trade') await this.tradeMenu(p);
    }
  }

  async buildMenu(p) {
    for (;;) {
      const opts = this.owned(p).filter((i) => this.canBuild(p, i)).map((i) => {
        const L = this.lots.get(i), g = GROUPS[BOARD[i].group];
        return { label: `${lotLabel(i)}: ${L.level === 4 ? 'Spire' : `dome ${L.level + 1}`} for ${money(g.dome)} (rent ${money(BOARD[i].rents[L.level + 1])})`, value: `build:${i}` };
      });
      if (!opts.length) return;
      const c = await this.io.choose(p, {
        title: 'Build domes',
        text: `You have ${money(p.cash)}. Build evenly across a district; five domes become a Spire.`,
        choices: [...opts, { label: '✔️ Done building', value: 'done' }],
      }, 'done', TURN_TIME);
      if (c === 'done' || c == null || !this.applyFund(p, c)) return;
      await this.show(300);
    }
  }

  async bankMenu(p) {
    for (;;) {
      const opts = this.fundOptions(p);
      for (const i of this.owned(p)) {
        if (this.lots.get(i).mortgaged && p.cash >= this.unmortgageCost(i)) {
          opts.push({ label: `Pay off ${lotLabel(i)} (−${money(this.unmortgageCost(i))})`, value: `unmort:${i}` });
        }
      }
      if (!opts.length) return;
      const c = await this.io.choose(p, {
        title: 'Mortgage or sell',
        text: `You have ${money(p.cash)}. Mortgaged lots pay no rent. Paying one off costs its mortgage plus 10%.`,
        choices: [...opts, { label: '✔️ Done', value: 'done' }],
      }, 'done', TURN_TIME);
      if (c === 'done' || c == null || !this.applyFund(p, c)) return;
    }
  }

  async tradeMenu(p) {
    this.tradesThisTurn++;
    const others = this.active.filter((o) => o !== p);
    const pid = await this.io.choose(p, {
      title: 'Trade with who?',
      choices: [...others.map((o) => ({ label: `${o.token} ${o.name} (${money(o.cash)}, ${this.owned(o).length} lots)`, value: o.id })),
        { label: '✖️ Never mind', value: 'cancel' }],
    }, 'cancel', TURN_TIME);
    const o = others.find((x) => x.id === pid);
    if (!o) return;
    const deedChoice = (i) => ({ label: `${lotLabel(i)}${this.lots.get(i).mortgaged ? ' (mortgaged)' : ''}`, value: i });
    const mine = this.tradeable(p), theirs = this.tradeable(o);
    const give = mine.length ? await this.io.multi(p, {
      title: `Offer ${o.name} which lots?`, text: 'Lots in a district with domes can\'t be traded. Pick none to offer only cash.',
      choices: mine.map(deedChoice), multi: { min: 0, max: mine.length, submit: 'Next' },
    }, TURN_TIME) : [];
    const get = theirs.length ? await this.io.multi(p, {
      title: `Ask ${o.name} for which lots?`, text: 'Pick none to ask only for cash.',
      choices: theirs.map(deedChoice), multi: { min: 0, max: theirs.length, submit: 'Next' },
    }, TURN_TIME) : [];
    const giveCash = p.cash >= 10 ? await this.io.number(p, {
      title: 'Add cash from you?', text: `You have ${money(p.cash)}.`,
      number: { min: 0, max: Math.floor(p.cash / 10) * 10, step: 10, value: 0, submit: 'Next' },
    }, 0, TURN_TIME) : 0;
    const getCash = o.cash >= 10 ? await this.io.number(p, {
      title: `Ask ${o.name} for cash?`, text: `They have ${money(o.cash)}.`,
      number: { min: 0, max: Math.floor(o.cash / 10) * 10, step: 10, value: 0, submit: 'Send offer' },
    }, 0, TURN_TIME) : 0;
    const deal = {
      from: p, to: o,
      give: (give || []).map(Number).filter((i) => mine.includes(i)),
      get: (get || []).map(Number).filter((i) => theirs.includes(i)),
      giveCash: clampCash(giveCash, p.cash), getCash: clampCash(getCash, o.cash),
    };
    if (!deal.give.length && !deal.get.length && !deal.giveCash && !deal.getCash) return;
    if (!deal.give.length && !deal.get.length) {
      this.log(`${p.name}'s cash-for-cash offer makes no sense. Cancelled.`, p);
      return;
    }
    const line = (lots, cash) => [...lots.map((i) => lotLabel(i)), cash ? money(cash) : null].filter(Boolean).join(', ') || 'nothing';
    const summary = `${p.name} gives: ${line(deal.give, deal.giveCash)}\n${o.name} gives: ${line(deal.get, deal.getCash)}`;
    this.log(`🤝 ${p.name} offers ${o.name} a trade.`, p);
    this.io.trade?.(deal);
    this.io.show?.(p, { title: 'Offer sent', text: summary, wait: `Waiting for ${o.name}…` });
    const ans = await this.io.choose(o, {
      title: `${p.name} wants to trade`,
      text: `You give: ${line(deal.get, deal.getCash)}\nYou get: ${line(deal.give, deal.giveCash)}`,
      buzz: true,
      choices: [{ label: '✅ Accept', value: 'yes' }, { label: '❌ Decline', value: 'no' }],
    }, 'no', TRADE_TIME);
    this.io.trade?.(null);
    // Anything could have changed while they thought about it.
    const valid = ans === 'yes' && p.cash >= deal.giveCash && o.cash >= deal.getCash
      && deal.give.every((i) => this.tradeable(p).includes(i)) && deal.get.every((i) => this.tradeable(o).includes(i));
    if (!valid) {
      this.log(`${o.name} ${ans === 'yes' ? 'accepted, but the deal no longer works' : 'declined the trade'}.`, o);
      this.io.sfx?.('buzz');
      await this.show(1200);
      return;
    }
    p.cash += deal.getCash - deal.giveCash;
    o.cash += deal.giveCash - deal.getCash;
    for (const i of deal.give) this.lots.get(i).owner = o.id;
    for (const i of deal.get) this.lots.get(i).owner = p.id;
    this.io.sfx?.('win');
    this.log(`🤝 Deal! ${summary.replace('\n', '; ')}`, p);
    await this.show(1500);
  }
}

export function deedText(s) {
  if (s.kind === 'pad') return `Rent ₡25 with 1 pad, ₡50 with 2, ₡100 with 3, ₡200 with all 4.`;
  if (s.kind === 'plant') return `Rent is 4× the roll, or 10× if you own both plants.`;
  const r = s.rents;
  return `${GROUPS[s.group].name} district. Rent ${money(r[0])} (double with the whole district), domes ${r.slice(1, 5).map(money).join(' / ')}, Spire ${money(r[5])}. Domes cost ${money(GROUPS[s.group].dome)}.`;
}

const clampCash = (v, max) => Math.max(0, Math.min(Math.floor(Number(v) || 0), max));
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
