import { mixSeed, mulberry32 } from './rng';
import { ENEMIES, type Enemy, type EnemyKind, enemyBoxHits, enemyOverlapsBox, makeEnemy, stepEnemy } from './enemies';
import { type Body, moveX, moveY, onLadder, probeGround, unstick, BODY_H, HALF_W } from './physics';
import { defaultSave, type SaveData } from './save';
import {
  type Inventory,
  type ItemId,
  ITEMS,
  PLACEABLE,
  T,
  TILES,
  canAfford,
  invAdd,
  invCount,
  invTotal,
  isMinable,
  pay,
} from './tiles';
import { UPGRADES, derive, upgradeById, type Derived, type Levels } from './upgrades';
import { recipeById } from './recipes';
import { chestLoot } from './loot';
import { FALLER_DMG, HAZARD, type Faller, type HazardField, fallerHits, findCeiling, inGas, placeHazards, stepFaller } from './hazards';
import { captureBase, captureWalls, stampBase, stampWalls } from './base';
import { PAD_HALF, SPAWN_LIGHT_MAX, W, World, generateWorld } from './world';

export const GRAVITY = 42;
export const MAX_FALL = 28;
export const JUMP_V = 15.5;
export const FALL_SAFE = 19;
export const CLIMB_UP = 5;
export const CLIMB_DOWN = 7;
export const REACH = 4.2;
export const FIXED_DT = 1 / 60;

export interface Controls {
  /** -1..1 */
  moveX: number;
  jump: boolean;
  dig: boolean;
  place: boolean;
  /** Optional: descend ladders faster. */
  down?: boolean;
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
  | { t: 'chest'; x: number; y: number; items: number }
  | { t: 'fell'; x: number; y: number; tiles: number }
  | { t: 'hurt'; amount: number }
  | { t: 'bank'; total: number }
  | { t: 'death'; lost: number }
  | { t: 'jump' }
  | { t: 'land'; speed: number }
  | { t: 'lowbattery' }
  | { t: 'upgrade'; id: string }
  | { t: 'craft'; id: string }
  | { t: 'newdive' }
  | { t: 'swing'; dir: number }
  | { t: 'enemyhit'; x: number; y: number; dmg: number }
  | { t: 'enemykill'; x: number; y: number; kind: EnemyKind }
  | { t: 'shoot'; x: number; y: number }
  | { t: 'shothit'; x: number; y: number }
  | { t: 'drip'; x: number; y: number }
  | { t: 'splash'; x: number; y: number; kind: 'acid' | 'debris' }
  | { t: 'gas' };

export type Tool = 'drill' | 'blade' | 'pistol';
export const TOOLS: readonly Tool[] = ['drill', 'blade', 'pistol'];
export const PISTOL_DMG = 8;
export const PISTOL_CD = 0.35;
export const PISTOL_SPEED = 22;
export const PISTOL_LIFE = 0.9;
export const PISTOL_COST = 0.5;
export const HITSTOP = 0.04;

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}
export const BLADE_DMG = 12;
export const BLADE_RANGE = 2.1;
export const BLADE_CD = 0.32;
export const MAX_ENEMIES = 8;
export const IFRAMES = 0.8;

export class Game {
  world: World;
  body: Body = { x: 0, y: 0, vx: 0, vy: 0, onGround: true };
  hp = 100;
  battery = 240;
  carried: Inventory = {};
  stash: Inventory = {};
  upgrades: Levels = {};
  selected: ItemId = 'rust';
  tool: Tool = 'drill';
  enemies: Enemy[] = [];
  /** Seconds of player invulnerability after a hit. */
  iframes = 0;
  /** Remaining swing animation time (render only). */
  swing = 0;
  private rng = mulberry32(1);
  private nextEnemyId = 1;
  private spawnCd = 3;
  private bladeCd = 0;
  private pistolCd = 0;
  shots: Shot[] = [];
  fallers: Faller[] = [];
  hazards: HazardField = { emitters: [], gas: [] };
  /** True while the player stands in a gas pocket (render/HUD). */
  inGas = false;
  private debrisCd = 5;
  private gasTick = 0;
  /** Seconds of sim freeze after landing a hit (game feel). */
  hitStop = 0;
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
    let bankedTotal = 0;
    for (const id of Object.keys(carried) as ItemId[]) {
      const n = carried[id] ?? 0;
      if (ITEMS[id].kit) {
        invAdd(this.carried, id, n);
        continue;
      }
      bankedTotal += n;
      invAdd(this.stash, id, n);
    }
    this.save.stats.banked += bankedTotal;
    this.save.carried = {};
    this.world = generateWorld(this.diveSeed());
    stampBase(this.world, this.save.base);
    stampWalls(this.world, this.save.walls);
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
    this.shots = [];
    this.fallers = [];
    this.hazards = placeHazards(this.world);
    this.inGas = false;
    this.debrisCd = 5;
    this.gasTick = 0;
    const d = this.derived;
    this.body = { x: this.world.padX + 0.5, y: this.world.padY, vx: 0, vy: 0, onGround: true };
    unstick(this.world, this.body);
    this.hp = d.maxHp;
    this.battery = d.maxBattery;
    this.mining = null;
    this.enemies = [];
    this.iframes = 0;
    this.swing = 0;
    this.bladeCd = 0;
    this.spawnCd = 3;
    this.rng = mulberry32(this.diveSeed() ^ 0x5eed);
    this.runDeepest = 0;
    this.lowWarned = false;
    this.wasGround = true;
  }

  private newWorld(): void {
    this.save.base = captureBase(this.world);
    this.save.walls = captureWalls(this.world);
    this.save.runs += 1;
    this.world = generateWorld(this.diveSeed());
    stampBase(this.world, this.save.base);
    stampWalls(this.world, this.save.walls);
    this.respawn();
  }

  /** Move carried loot into the stash. Returns the number of items banked. */
  bank(): number {
    let total = 0;
    for (const id of Object.keys(this.carried) as ItemId[]) {
      const n = this.carried[id] ?? 0;
      if (n <= 0 || ITEMS[id].kit) continue;
      total += n;
      invAdd(this.stash, id, n);
      delete this.carried[id];
    }
    if (total > 0) {
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

  /** Craft at the base: pay from the stash, output goes to the pack (needs room). */
  craft(id: string): boolean {
    const r = recipeById(id);
    if (!r || !this.isAtBase() || !canAfford(this.stash, r.cost)) return false;
    if (invTotal(this.carried) + r.qty > this.derived.packCap) return false;
    pay(this.stash, r.cost);
    invAdd(this.carried, r.out, r.qty);
    this.emit({ t: 'craft', id: r.id });
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

  setTool(t: Tool): void {
    this.tool = t;
    this.mining = null;
  }

  toggleTool(): void {
    this.setTool(TOOLS[(TOOLS.indexOf(this.tool) + 1) % TOOLS.length]);
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
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }
    this.time += dt;
    this.save.stats.playTime += dt;
    const d = this.derived;
    const b = this.body;

    // Horizontal control with quick acceleration.
    const mx = Math.max(-1, Math.min(1, c.moveX));
    b.vx += (mx * d.speed - b.vx) * Math.min(1, 20 * dt);
    if (Math.abs(mx) > 0.1) this.facing = mx > 0 ? 1 : -1;

    // Jump with coyote time, input buffer and variable height.
    const grounded = probeGround(this.world, b, c.down);
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

    if (onLadder(this.world, b)) {
      // Climbing: no gravity; jump climbs, down descends, otherwise cling.
      b.vy = c.jump ? -CLIMB_UP : c.down ? CLIMB_DOWN : 0;
      b.vx *= 0.6;
      this.coyote = 0.1;
    } else {
      b.vy = Math.min(MAX_FALL, b.vy + GRAVITY * dt);
    }
    b.onGround = false;
    moveX(this.world, b, b.vx * dt);
    const impact = b.vy;
    moveY(this.world, b, b.vy * dt, c.down);
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
    if (c.dig && this.tool === 'blade') this.blade();
    if (c.dig && this.tool === 'pistol') this.firePistol(c.aim);
    if (c.dig && this.tool === 'drill' && c.aim && this.reachable(c.aim.tx, c.aim.ty)) {
      const { tx, ty } = c.aim;
      const tile = this.world.get(tx, ty);
      // Nothing in front: the drill works on a player-built back wall instead.
      const onWall = !isMinable(tile) && !TILES[tile].solid && this.world.wall(tx, ty) === W.PLATE;
      if (isMinable(tile) || onWall) {
        const def = onWall ? TILES[T.WALL] : TILES[tile];
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
            if (onWall) this.world.setWall(tx, ty, W.NONE);
            else this.world.set(tx, ty, 0);
            this.emit({ t: 'break', x: tx, y: ty, tile: onWall ? T.WALL : tile });
            if (def.drop) {
              invAdd(this.carried, def.drop, 1);
              this.emit({ t: 'pickup', item: def.drop, x: tx, y: ty });
            }
            if (tile === T.CHEST) this.openChest(tx, ty, d.packCap);
            if (tile === T.TRUNK) this.fellTree(tx, ty, d.packCap);
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
      } else if (item.placesWall !== undefined && invCount(this.carried, this.selected) > 0 && this.canPlaceWall(tx, ty)) {
        // Back walls sit behind tiles, so they may overlap the player, torches and ladders.
        this.world.setWall(tx, ty, item.placesWall);
        invAdd(this.carried, this.selected, -1);
        this.placeCd = 0.12;
        this.emit({ t: 'place', x: tx, y: ty });
      }
    }

    this.stepEnemies(dt);
    this.stepShots(dt);
    this.stepHazards(dt);

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

  private blade(): void {
    if (this.bladeCd > 0) return;
    this.bladeCd = BLADE_CD;
    this.swing = 0.18;
    const b = this.body;
    this.emit({ t: 'swing', dir: this.facing });
    for (const e of this.enemies) {
      const dx = (e.x - b.x) * this.facing;
      if (dx < -0.4 || dx > BLADE_RANGE || Math.abs(e.y - b.y) > 1.8) continue;
      this.damageEnemy(e, BLADE_DMG, this.facing);
    }
  }

  damageEnemy(e: Enemy, dmg: number, dir: number): void {
    if (e.iframes > 0 || e.hp <= 0) return;
    e.hp -= dmg;
    e.iframes = 0.15;
    e.vx = dir * 9;
    e.vy = ENEMIES[e.kind].flying ? e.vy : -5;
    this.hitStop = HITSTOP;
    this.emit({ t: 'enemyhit', x: e.x, y: e.y - 0.5, dmg });
  }

  private firePistol(aim: Controls['aim']): void {
    if (this.pistolCd > 0) return;
    const b = this.body;
    const ox = b.x;
    const oy = b.y - BODY_H * 0.55;
    let dx = this.facing;
    let dy = 0;
    if (aim) {
      dx = aim.tx + 0.5 - ox;
      dy = aim.ty + 0.5 - oy;
    }
    let len = Math.hypot(dx, dy);
    if (len < 0.3) {
      dx = this.facing;
      dy = 0;
      len = 1;
    }
    if (!this.isAtBase()) this.battery = Math.max(0, this.battery - PISTOL_COST);
    this.pistolCd = PISTOL_CD;
    this.shots.push({ x: ox, y: oy, vx: (dx / len) * PISTOL_SPEED, vy: (dy / len) * PISTOL_SPEED, life: PISTOL_LIFE });
    this.emit({ t: 'shoot', x: ox, y: oy });
  }

  /** Sweep shots in small steps so fast bolts never tunnel through walls or enemies. */
  private stepShots(dt: number): void {
    this.pistolCd = Math.max(0, this.pistolCd - dt);
    const keep: Shot[] = [];
    for (const s of this.shots) {
      s.life -= dt;
      const dist = Math.hypot(s.vx, s.vy) * dt;
      const n = Math.max(1, Math.ceil(dist / 0.2));
      let alive = s.life > 0;
      for (let i = 0; i < n && alive; i++) {
        s.x += (s.vx * dt) / n;
        s.y += (s.vy * dt) / n;
        if (this.world.isSolid(Math.floor(s.x), Math.floor(s.y))) {
          this.emit({ t: 'shothit', x: s.x, y: s.y });
          alive = false;
          break;
        }
        for (const e of this.enemies) {
          if (e.hp > 0 && enemyOverlapsBox(e, s.x, s.y + 0.1, 0.1, 0.2)) {
            this.damageEnemy(e, PISTOL_DMG, Math.sign(s.vx) || 1);
            this.emit({ t: 'shothit', x: s.x, y: s.y });
            alive = false;
            break;
          }
        }
      }
      if (alive) keep.push(s);
    }
    this.shots = keep;
  }

  private stepHazards(dt: number): void {
    if (this.isAtBase()) {
      this.fallers = [];
      this.inGas = false;
      return;
    }
    const b = this.body;
    // Acid emitters near the player start a telegraphed drip.
    for (const em of this.hazards.emitters) {
      em.cd -= dt;
      if (em.cd > 0) continue;
      em.cd = HAZARD.acidPeriod;
      if (Math.abs(em.x - b.x) > 14 || Math.abs(em.y - b.y) > 12 || this.fallers.length >= 16) continue;
      this.fallers.push({ kind: 'acid', x: em.x, y: em.y + 0.3, vy: 0, warn: HAZARD.acidWarn });
      this.emit({ t: 'drip', x: em.x, y: em.y });
    }
    // Debris drops above the player when a ceiling is nearby.
    this.debrisCd -= dt;
    if (this.debrisCd <= 0) {
      this.debrisCd = HAZARD.debrisPeriod * (0.7 + this.rng() * 0.6);
      if (this.depth >= HAZARD.debrisMinDepth && this.fallers.length < 16) {
        const x = Math.floor(b.x + (this.rng() - 0.5) * 6);
        const row = findCeiling(this.world, x, Math.floor(b.y - 2), 10);
        if (row >= 0 && !this.world.isSolid(x, row)) {
          this.fallers.push({ kind: 'debris', x: x + 0.5, y: row + 0.2, vy: 0, warn: HAZARD.debrisWarn });
        }
      }
    }
    const keep: Faller[] = [];
    for (const f of this.fallers) {
      const hit = this.iframes === 0 && fallerHits(f, b.x, b.y, HALF_W, BODY_H);
      if (hit) {
        this.hurt(FALLER_DMG[f.kind]);
        this.iframes = IFRAMES;
        this.emit({ t: 'splash', x: f.x, y: f.y, kind: f.kind });
        continue;
      }
      if (stepFaller(this.world, f, dt)) keep.push(f);
      else this.emit({ t: 'splash', x: f.x, y: f.y, kind: f.kind });
    }
    this.fallers = keep;
    // Gas: steady damage with a pulse every half second.
    this.inGas = inGas(this.hazards.gas, b.x, b.y - BODY_H / 2);
    if (this.inGas) {
      this.gasTick += dt;
      if (this.gasTick >= 0.5) {
        this.gasTick -= 0.5;
        this.hurt(HAZARD.gasDps * 0.5);
        this.emit({ t: 'gas' });
      }
    } else this.gasTick = 0;
  }

  private stepEnemies(dt: number): void {
    this.bladeCd = Math.max(0, this.bladeCd - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    const b = this.body;
    const atBase = this.isAtBase();
    for (const e of this.enemies) {
      stepEnemy(this.world, e, dt, b.x, b.y);
      if (!atBase && this.iframes === 0 && enemyOverlapsBox(e, b.x, b.y, HALF_W, BODY_H)) {
        this.hurt(ENEMIES[e.kind].contact);
        this.iframes = IFRAMES;
        b.vx = (b.x >= e.x ? 1 : -1) * 8;
        b.vy = Math.min(b.vy, -6);
      }
    }
    // Deaths and drops.
    const alive: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.hp > 0 && e.y < this.world.h + 2) {
        alive.push(e);
        continue;
      }
      if (e.hp <= 0) {
        this.emit({ t: 'enemykill', x: e.x, y: e.y - 0.5, kind: e.kind });
        if (invTotal(this.carried) < this.derived.packCap) invAdd(this.carried, 'iron_scrap', 1);
      }
    }
    this.enemies = alive;
    if (atBase) {
      this.enemies = [];
      return;
    }
    this.spawnCd -= dt;
    if (this.spawnCd <= 0) {
      this.spawnCd = 4 + this.rng() * 4;
      this.trySpawn();
    }
  }

  /** Spawn an enemy in open cave space near, but never on, the player and never inside walls. */
  trySpawn(): Enemy | null {
    if (this.enemies.length >= MAX_ENEMIES || this.depth < 8) return null;
    const kinds = (Object.keys(ENEMIES) as EnemyKind[]).filter((k) => this.depth >= ENEMIES[k].minDepth);
    const kind = kinds[Math.floor(this.rng() * kinds.length)];
    const b = this.body;
    for (let i = 0; i < 12; i++) {
      const side = this.rng() < 0.5 ? -1 : 1;
      const x = b.x + side * (9 + this.rng() * 8);
      const y = b.y + (this.rng() - 0.5) * 10;
      const e = makeEnemy(this.nextEnemyId, kind, Math.floor(x) + 0.5, Math.floor(y) + 1, this.rng() * 6.28);
      if (e.y < this.world.padY + 6 || e.y >= this.world.h - 1 || e.x < 2 || e.x >= this.world.w - 2) continue;
      if (enemyBoxHits(this.world, e)) continue;
      if (this.world.lightAt(e.x, e.y - 0.5) > SPAWN_LIGHT_MAX) continue;
      // Player-built back walls make a room safe: nothing spawns in front of them.
      if (this.world.wall(Math.floor(e.x), Math.floor(e.y - 0.05)) === W.PLATE) continue;
      if (!ENEMIES[kind].flying && !this.world.isSolid(Math.floor(e.x), Math.floor(e.y + 0.05))) continue;
      this.nextEnemyId++;
      this.enemies.push(e);
      return e;
    }
    return null;
  }

  /** Loot from a broken chest goes into the pack, as much as fits. */
  openChest(tx: number, ty: number, cap: number): number {
    const loot = chestLoot(this.world.seed, tx, ty, ty - this.world.padY);
    let got = 0;
    for (const id of Object.keys(loot) as ItemId[]) {
      const n = Math.min(loot[id] ?? 0, Math.max(0, cap - invTotal(this.carried)));
      if (n <= 0) continue;
      invAdd(this.carried, id, n);
      got += n;
      this.emit({ t: 'pickup', item: id, x: tx, y: ty });
    }
    if (got === 0) this.emit({ t: 'full' });
    this.emit({ t: 'chest', x: tx, y: ty, items: got });
    return got;
  }

  /** Cutting a trunk fells the whole connected tree: biomass for each trunk, a little for leaves. */
  fellTree(tx: number, ty: number, cap: number): number {
    const wl = this.world;
    const stack: [number, number][] = [[tx, ty - 1], [tx - 1, ty], [tx + 1, ty]];
    let trunks = 0;
    let leaves = 0;
    let guard = 0;
    while (stack.length > 0 && guard++ < 400) {
      const [x, y] = stack.pop() as [number, number];
      const t = wl.get(x, y);
      if (t !== T.TRUNK && t !== T.LEAVES) continue;
      // Only what stood above the cut falls.
      if (y > ty) continue;
      wl.set(x, y, T.AIR);
      if (t === T.TRUNK) trunks++;
      else leaves++;
      this.emit({ t: 'break', x, y, tile: t });
      stack.push([x + 1, y], [x - 1, y], [x, y - 1], [x, y + 1]);
    }
    const n = Math.min(trunks + Math.ceil(leaves / 6), Math.max(0, cap - invTotal(this.carried)));
    if (n > 0) {
      invAdd(this.carried, 'biomass', n);
      this.emit({ t: 'pickup', item: 'biomass', x: tx, y: ty });
    }
    this.emit({ t: 'fell', x: tx, y: ty, tiles: trunks + leaves });
    return n;
  }

  /** A back wall needs an open (non-solid) cell with no built wall, touching a block or another built wall. */
  canPlaceWall(x: number, y: number): boolean {
    const wl = this.world;
    if (x < 0 || y < 0 || x >= wl.w || y >= wl.h) return false;
    if (wl.isSolid(x, y) || wl.wall(x, y) === W.PLATE) return false;
    if (wl.wall(x, y) !== W.NONE) return true; // lining an existing cave wall
    const nb: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    return this.hasSolidNeighbour(x, y) || nb.some(([dx, dy]) => wl.wall(x + dx, y + dy) === W.PLATE);
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
      base: captureBase(this.world),
      walls: captureWalls(this.world),
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
