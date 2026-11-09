import { mixSeed } from './rng';
import { type Body, moveX, moveY, probeGround, unstick, BODY_H, HALF_W } from './physics';
import { defaultSave, type SaveData } from './save';
import {
  type Inventory,
  type ItemId,
  ITEMS,
  PLACEABLE,
  TILES,
  canAfford,
  invAdd,
  invCount,
  invTotal,
  isMinable,
  pay,
} from './tiles';
import { UPGRADES, derive, upgradeById, type Derived, type Levels } from './upgrades';
import { PAD_HALF, World, generateWorld } from './world';

export const GRAVITY = 42;
export const MAX_FALL = 28;
export const JUMP_V = 15.5;
export const FALL_SAFE = 19;
export const REACH = 4.2;
export const FIXED_DT = 1 / 60;

export interface Controls {
  /** -1..1 */
  moveX: number;
  jump: boolean;
  dig: boolean;
  place: boolean;
  /** Tile under the pointer, or null. */
  aim: { tx: number; ty: number } | null;
}

export const NO_CONTROLS: Controls = { moveX: 0, jump: false, dig: false, place: false, aim: null };

export type GameEvent =
  | { t: 'dig'; x: number; y: number }
  | { t: 'break'; x: number; y: number; tile: number }
  | { t: 'pickup'; item: ItemId; x: number; y: number }
  | { t: 'place'; x: number; y: number }
  | { t: 'full' }
  | { t: 'hurt'; amount: number }
  | { t: 'bank'; total: number }
  | { t: 'death'; lost: number }
  | { t: 'jump' }
  | { t: 'land'; speed: number }
  | { t: 'lowbattery' }
  | { t: 'upgrade'; id: string }
  | { t: 'newdive' };

export class Game {
  world: World;
  body: Body = { x: 0, y: 0, vx: 0, vy: 0, onGround: true };
  hp = 100;
  battery = 240;
  carried: Inventory = {};
  stash: Inventory = {};
  upgrades: Levels = {};
  selected: ItemId = 'rust';
  mining: { tx: number; ty: number; progress: number } | null = null;
  facing = 1;
  time = 0;
  runDeepest = 0;
  events: GameEvent[] = [];
  private save: SaveData;
  private coyote = 0;
  private jumpBuf = 0;
  private prevJump = false;
  private placeCd = 0;
  private digTick = 0;
  private fullCd = 0;
  private lowWarned = false;
  private wasGround = true;

  constructor(save: SaveData = defaultSave()) {
    this.save = structuredClone(save);
    this.stash = { ...save.stash };
    this.upgrades = { ...save.upgrades };
    // Crash/refresh safety: loot carried at last save is banked, never lost.
    const carried = { ...save.carried };
    const bankedTotal = invTotal(carried);
    for (const id of Object.keys(carried) as ItemId[]) invAdd(this.stash, id, carried[id] ?? 0);
    this.save.stats.banked += bankedTotal;
    this.save.carried = {};
    this.world = generateWorld(this.diveSeed());
    this.respawn();
  }

  get derived(): Derived {
    return derive(this.upgrades);
  }

  get depth(): number {
    return Math.max(0, this.body.y - this.world.padY);
  }

  get muted(): boolean {
    return this.save.settings.muted;
  }

  setMuted(m: boolean): void {
    this.save.settings.muted = m;
  }

  get stats(): SaveData['stats'] {
    return this.save.stats;
  }

  get runs(): number {
    return this.save.runs;
  }

  private diveSeed(): number {
    return mixSeed(this.save.seedBase, this.save.runs);
  }

  isAtBase(): boolean {
    const b = this.body;
    return (
      Math.abs(b.x - (this.world.padX + 0.5)) <= PAD_HALF + 2 &&
      b.y <= this.world.padY + 0.05 &&
      b.y >= this.world.padY - 6
    );
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  private emit(e: GameEvent): void {
    if (this.events.length < 256) this.events.push(e);
  }

  private respawn(): void {
    const d = this.derived;
    this.body = { x: this.world.padX + 0.5, y: this.world.padY, vx: 0, vy: 0, onGround: true };
    unstick(this.world, this.body);
    this.hp = d.maxHp;
    this.battery = d.maxBattery;
    this.mining = null;
    this.runDeepest = 0;
    this.lowWarned = false;
    this.wasGround = true;
  }

  private newWorld(): void {
    this.save.runs += 1;
    this.world = generateWorld(this.diveSeed());
    this.respawn();
  }

  /** Move carried loot into the stash. Returns the number of items banked. */
  bank(): number {
    const total = invTotal(this.carried);
    if (total > 0) {
      for (const id of Object.keys(this.carried) as ItemId[]) invAdd(this.stash, id, this.carried[id] ?? 0);
      this.carried = {};
      this.save.stats.banked += total;
      this.emit({ t: 'bank', total });
    }
    this.save.stats.deepest = Math.max(this.save.stats.deepest, Math.floor(this.runDeepest));
    return total;
  }

  newDive(): boolean {
    if (!this.isAtBase()) return false;
    this.bank();
    this.newWorld();
    this.emit({ t: 'newdive' });
    return true;
  }

  buyUpgrade(id: string): boolean {
    const def = upgradeById(id);
    if (!def || !this.isAtBase()) return false;
    const level = this.upgrades[def.id] ?? 0;
    if (level >= def.maxLevel) return false;
    const cost = def.cost(level);
    if (!canAfford(this.stash, cost)) return false;
    pay(this.stash, cost);
    this.upgrades[def.id] = level + 1;
    this.emit({ t: 'upgrade', id: def.id });
    return true;
  }

  upgradeCost(id: string): Inventory | null {
    const def = upgradeById(id);
    if (!def) return null;
    const level = this.upgrades[def.id] ?? 0;
    return level >= def.maxLevel ? null : def.cost(level);
  }

  selectPlaceable(index: number): void {
    const id = PLACEABLE[((index % PLACEABLE.length) + PLACEABLE.length) % PLACEABLE.length];
    this.selected = id;
  }

  cycleSelected(): void {
    this.selectPlaceable(PLACEABLE.indexOf(this.selected) + 1);
  }

  private die(): void {
    let lost = 0;
    for (const id of Object.keys(this.carried) as ItemId[]) {
      const n = this.carried[id] ?? 0;
      const keep = Math.floor(n / 2);
      lost += n - keep;
      invAdd(this.stash, id, keep);
    }
    this.carried = {};
    this.save.stats.deaths += 1;
    this.save.stats.deepest = Math.max(this.save.stats.deepest, Math.floor(this.runDeepest));
    this.emit({ t: 'death', lost });
    this.newWorld();
  }

  private hurt(amount: number): void {
    this.hp -= amount;
    this.emit({ t: 'hurt', amount });
  }

  private reachable(tx: number, ty: number): boolean {
    const cx = this.body.x;
    const cy = this.body.y - BODY_H / 2;
    const dx = tx + 0.5 - cx;
    const dy = ty + 0.5 - cy;
    return dx * dx + dy * dy <= REACH * REACH;
  }

  step(dt: number, c: Controls): void {
    if (!(dt > 0) || dt > 0.25) dt = Math.min(Math.max(dt || 0, 0), 0.25); // clamp tab-switch spikes
    if (dt === 0) return;
    this.time += dt;
    this.save.stats.playTime += dt;
    const d = this.derived;
    const b = this.body;

    // Horizontal control with quick acceleration.
    const mx = Math.max(-1, Math.min(1, c.moveX));
    b.vx += (mx * d.speed - b.vx) * Math.min(1, 20 * dt);
    if (Math.abs(mx) > 0.1) this.facing = mx > 0 ? 1 : -1;

    // Jump with coyote time, input buffer and variable height.
    const grounded = probeGround(this.world, b);
    this.coyote = grounded ? 0.1 : this.coyote - dt;
    this.jumpBuf = c.jump && !this.prevJump ? 0.12 : this.jumpBuf - dt;
    if (this.jumpBuf > 0 && this.coyote > 0) {
      b.vy = -JUMP_V;
      this.coyote = 0;
      this.jumpBuf = 0;
      this.emit({ t: 'jump' });
    }
    if (!c.jump && b.vy < -6) b.vy = -6;
    this.prevJump = c.jump;

    b.vy = Math.min(MAX_FALL, b.vy + GRAVITY * dt);
    b.onGround = false;
    moveX(this.world, b, b.vx * dt);
    const impact = b.vy;
    moveY(this.world, b, b.vy * dt);
    if (b.onGround && !this.wasGround) {
      this.emit({ t: 'land', speed: impact });
      if (impact > FALL_SAFE) this.hurt((impact - FALL_SAFE) * 6);
    }
    this.wasGround = b.onGround;

    this.runDeepest = Math.max(this.runDeepest, this.depth);

    // Mining.
    this.placeCd = Math.max(0, this.placeCd - dt);
    this.fullCd = Math.max(0, this.fullCd - dt);
    let mining = false;
    if (c.dig && c.aim && this.reachable(c.aim.tx, c.aim.ty)) {
      const { tx, ty } = c.aim;
      const tile = this.world.get(tx, ty);
      if (isMinable(tile)) {
        const def = TILES[tile];
        const blockedByPack = def.drop !== null && invTotal(this.carried) >= d.packCap;
        if (blockedByPack) {
          if (this.fullCd === 0) {
            this.emit({ t: 'full' });
            this.fullCd = 1;
          }
        } else {
          mining = true;
          if (!this.mining || this.mining.tx !== tx || this.mining.ty !== ty) this.mining = { tx, ty, progress: 0 };
          this.mining.progress += (dt * d.digPower) / def.hardness;
          this.digTick -= dt;
          if (this.digTick <= 0) {
            this.digTick = 0.14;
            this.emit({ t: 'dig', x: tx, y: ty });
          }
          if (this.mining.progress >= 1) {
            this.world.set(tx, ty, 0);
            this.emit({ t: 'break', x: tx, y: ty, tile });
            if (def.drop) {
              invAdd(this.carried, def.drop, 1);
              this.emit({ t: 'pickup', item: def.drop, x: tx, y: ty });
            }
            this.mining = null;
          }
        }
      }
    }
    if (!mining) this.mining = null;

    // Placing blocks (must touch existing solid, must not trap the player).
    if (c.place && c.aim && this.placeCd === 0 && this.reachable(c.aim.tx, c.aim.ty)) {
      const { tx, ty } = c.aim;
      const item = ITEMS[this.selected];
      if (
        item.places !== null &&
        invCount(this.carried, this.selected) > 0 &&
        this.world.get(tx, ty) === 0 &&
        this.hasSolidNeighbour(tx, ty) &&
        !this.overlapsPlayer(tx, ty)
      ) {
        this.world.set(tx, ty, item.places);
        invAdd(this.carried, this.selected, -1);
        this.placeCd = 0.12;
        this.emit({ t: 'place', x: tx, y: ty });
      }
    }

    // Base services, battery and survival.
    if (this.isAtBase()) {
      this.battery = d.maxBattery;
      this.hp = Math.min(d.maxHp, this.hp + 40 * dt);
      this.lowWarned = false;
      this.bank();
    } else if (this.depth > 1.5) {
      this.battery = Math.max(0, this.battery - dt);
      if (this.battery < d.maxBattery * 0.2 && !this.lowWarned) {
        this.lowWarned = true;
        this.emit({ t: 'lowbattery' });
      }
      if (this.battery === 0) this.hp -= 8 * dt;
    }
    if (this.hp <= 0) this.die();
  }

  private hasSolidNeighbour(x: number, y: number): boolean {
    return (
      this.world.isSolid(x + 1, y) || this.world.isSolid(x - 1, y) || this.world.isSolid(x, y + 1) || this.world.isSolid(x, y - 1)
    );
  }

  private overlapsPlayer(tx: number, ty: number): boolean {
    const b = this.body;
    return tx + 1 > b.x - HALF_W && tx < b.x + HALF_W && ty + 1 > b.y - BODY_H && ty < b.y;
  }

  toSave(): SaveData {
    return {
      ...this.save,
      stash: { ...this.stash },
      carried: { ...this.carried },
      upgrades: { ...this.upgrades },
      stats: { ...this.save.stats },
      settings: { ...this.save.settings },
    };
  }

  /** Cheapest affordable upgrade hint for UI badges. */
  affordableUpgrades(): string[] {
    return UPGRADES.filter((u) => {
      const lv = this.upgrades[u.id] ?? 0;
      return lv < u.maxLevel && canAfford(this.stash, u.cost(lv));
    }).map((u) => u.id);
  }
}
