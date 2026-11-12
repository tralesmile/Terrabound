/** Data-driven enemies with deterministic AI. No DOM, no Math.random: all randomness comes from the seeded rng passed in. */
import type { World } from './world';
import type { ItemId } from './tiles';
import { B } from './biomes';

export type EnemyKind = 'crawler' | 'flyer' | 'vine' | 'mite' | 'ember' | 'hulk';

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number;
  contact: number;
  halfW: number;
  h: number;
  flying: boolean;
  /** Minimum depth (tiles below the pad) where it may spawn. */
  minDepth: number;
  /** Spawns only when the player is in this surface biome's columns. Undefined = anywhere. */
  biome?: number;
  /** Item dropped on death (default iron scrap). */
  drop?: ItemId;
  /** Ground enemy that leaps toward the player every few seconds. */
  hop?: boolean;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  crawler: { name: 'Scrap crawler', hp: 24, speed: 2.2, contact: 12, halfW: 0.4, h: 0.7, flying: false, minDepth: 8 },
  flyer: { name: 'Drone wisp', hp: 14, speed: 3, contact: 8, halfW: 0.3, h: 0.5, flying: true, minDepth: 14 },
  vine: { name: 'Vine stalker', hp: 30, speed: 3.0, contact: 12, halfW: 0.4, h: 0.7, flying: false, minDepth: 8, biome: B.JUNGLE, drop: 'biomass' },
  mite: { name: 'Shard mite', hp: 16, speed: 3.2, contact: 9, halfW: 0.3, h: 0.5, flying: false, minDepth: 8, biome: B.CRYSTAL, drop: 'crystal', hop: true },
  ember: { name: 'Ember wisp', hp: 18, speed: 3.8, contact: 10, halfW: 0.3, h: 0.5, flying: true, minDepth: 10, biome: B.ASH, drop: 'copper_wire' },
  hulk: { name: 'Frost hulk', hp: 60, speed: 1.4, contact: 18, halfW: 0.55, h: 0.95, flying: false, minDepth: 12, biome: B.FROST },
};

/** Kinds allowed at this depth in this biome (biome kinds only in their biome). */
export function spawnableKinds(depth: number, biome: number, flyingOnly = false): EnemyKind[] {
  return (Object.keys(ENEMIES) as EnemyKind[]).filter((k) => {
    const d = ENEMIES[k];
    if (flyingOnly && !d.flying) return false;
    if (!flyingOnly && depth < d.minDepth) return false;
    return d.biome === undefined || d.biome === biome;
  });
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  /** Bottom-centre. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  dir: number;
  /** Seconds of invulnerability left after a hit. */
  iframes: number;
  age: number;
  /** Phase offset for the flyer hover. */
  phase: number;
  /** Night raider (raids.ts): marches on its target instead of patrolling, climbs walls by hopping. */
  raid?: boolean;
  /** Seconds spent chewing the base block in front of it. */
  chew?: number;
}

/** Invulnerability after an enemy is hit (also the length of the hit flash and squash). */
export const ENEMY_HIT_IFRAMES = 0.15;

const EPS = 1e-9;
const G = 42;

export function enemyBoxHits(world: World, e: Enemy): boolean {
  const d = ENEMIES[e.kind];
  const x0 = Math.floor(e.x - d.halfW);
  const x1 = Math.floor(e.x + d.halfW - EPS);
  const y0 = Math.floor(e.y - d.h);
  const y1 = Math.floor(e.y - EPS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (world.blocksEnemy(tx, ty)) return true;
  return false;
}

export function makeEnemy(id: number, kind: EnemyKind, x: number, y: number, phase = 0): Enemy {
  return { id, kind, x, y, vx: 0, vy: 0, hp: ENEMIES[kind].hp, dir: 1, iframes: 0, age: 0, phase };
}

function moveAxis(world: World, e: Enemy, dx: number, dy: number): { hitX: boolean; hitY: boolean } {
  let hitX = false;
  let hitY = false;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.25));
  for (let i = 0; i < steps; i++) {
    e.x += dx / steps;
    if (enemyBoxHits(world, e)) {
      e.x -= dx / steps;
      hitX = true;
    }
    e.y += dy / steps;
    if (enemyBoxHits(world, e)) {
      e.y -= dy / steps;
      hitY = true;
    }
  }
  return { hitX, hitY };
}

/** Advance one enemy. `px`,`py` is the player's feet position. */
export function stepEnemy(world: World, e: Enemy, dt: number, px: number, py: number): void {
  const d = ENEMIES[e.kind];
  e.age += dt;
  e.iframes = Math.max(0, e.iframes - dt);
  if (d.flying) {
    const dx = px - e.x;
    const dy = py - 0.9 + Math.sin(e.age * 3 + e.phase) * 0.8 - e.y;
    const dist = Math.hypot(dx, dy);
    const chase = (e.raid || dist < 12) && dist > 0.01;
    const tvx = chase ? (dx / dist) * d.speed : Math.sin(e.age + e.phase) * d.speed * 0.4;
    const tvy = chase ? (dy / dist) * d.speed : Math.cos(e.age * 1.3 + e.phase) * d.speed * 0.3;
    const k = Math.min(1, 4 * dt);
    e.vx += (tvx - e.vx) * k;
    e.vy += (tvy - e.vy) * k;
    const r = moveAxis(world, e, e.vx * dt, e.vy * dt);
    if (r.hitX) e.vx = -e.vx * 0.5;
    if (r.hitY) e.vy = -e.vy * 0.5;
    if (Math.abs(e.vx) > 0.2) e.dir = e.vx > 0 ? 1 : -1;
    return;
  }
  // Crawler: patrol, turn at walls and ledges, chase when the player is level and near.
  const near = e.raid ? Math.abs(px - e.x) > 0.3 : Math.abs(px - e.x) < 7 && Math.abs(py - e.y) < 2.5;
  if (near) e.dir = px > e.x ? 1 : -1;
  const knock = Math.abs(e.vx) > d.speed * 1.5;
  if (!knock) e.vx = e.dir * d.speed * (near ? 1.2 : 0.7);
  else e.vx *= Math.max(0, 1 - 6 * dt);
  e.vy = Math.min(28, e.vy + G * dt);
  const grounded = world.isSolid(Math.floor(e.x), Math.floor(e.y + 0.05));
  // Hoppers leap at a nearby player on a fixed rhythm (phase keeps a pack out of sync).
  if (d.hop && grounded && near && Math.floor((e.age + e.phase) / 1.6) !== Math.floor((e.age + e.phase - dt) / 1.6)) e.vy = -11;
  const r = moveAxis(world, e, e.vx * dt, e.vy * dt);
  if (r.hitY) e.vy = 0;
  if (e.raid) {
    // Raiders never turn back: they hop up steps and walls in their way and walk off ledges.
    if (r.hitX && grounded) e.vy = -11;
    return;
  }
  if (r.hitX) {
    e.dir = -e.dir;
    e.vx = 0;
  } else if (grounded && !knock) {
    const ahead = Math.floor(e.x + e.dir * (d.halfW + 0.3));
    if (!world.isSolid(ahead, Math.floor(e.y + 0.05))) e.dir = -e.dir;
  }
}

export function enemyOverlapsBox(e: Enemy, x: number, y: number, halfW: number, h: number): boolean {
  const d = ENEMIES[e.kind];
  return Math.abs(e.x - x) < d.halfW + halfW && e.y > y - h && e.y - d.h < y;
}
