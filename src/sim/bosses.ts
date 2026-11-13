/**
 * Bosses: data-driven, deterministic (seeded rng passed in), every attack telegraphed for at least 0.4 s.
 * One boss per biome, summoned with a beacon crafted at the workshop. Phase 2 below half health.
 */
import { B } from './biomes';
import type { EnemyKind } from './enemies';
import type { GearId } from './gear';
import type { Inventory, ItemId } from './tiles';
import type { World } from './world';

export type BossId = 'colossus' | 'vine_queen' | 'golem' | 'wyrm' | 'titan' | 'hollow_ai';
export type AttackKind = 'slam' | 'rain' | 'charge' | 'volley' | 'summon';

export interface BossDef {
  name: string;
  /** Biome the beacon must be used in (-1 = anywhere in the required layer). */
  biome: number;
  /** Minimum depth layer (layers.ts) to summon; the final boss lives in the Core. */
  layer?: number;
  hp: number;
  /** Half width and height in tiles. */
  halfW: number;
  h: number;
  speed: number;
  flying: boolean;
  contact: number;
  attacks: AttackKind[];
  /** Seconds between attacks (phase 2 is 35% faster). */
  cooldown: number;
  minion: EnemyKind;
  /** Summon beacon item that calls this boss, and its cost at the fabricator. */
  beacon: ItemId;
  reward: Inventory;
  /** Unique gear granted on the first win. */
  gear: GearId;
  color: string;
  accent: string;
  eye: string;
}

export const BOSSES: Record<BossId, BossDef> = {
  colossus: { name: 'Junk Colossus', biome: B.WASTES, hp: 420, halfW: 1.4, h: 3.4, speed: 2.2, flying: false, contact: 18, attacks: ['slam', 'rain', 'charge'], cooldown: 2.4, minion: 'crawler', beacon: 'beacon_colossus', reward: { crystal: 10, copper_wire: 12, metal: 15 }, gear: 'junk_hammer', color: '#7a4a3a', accent: '#c77a5e', eye: '#ff5a2a' },
  vine_queen: { name: 'Vine Queen', biome: B.JUNGLE, hp: 520, halfW: 1.2, h: 3.0, speed: 2.8, flying: false, contact: 16, attacks: ['volley', 'summon', 'charge'], cooldown: 2.2, minion: 'vine', beacon: 'beacon_vine', reward: { crystal: 12, biomass: 30, seed: 6 }, gear: 'thorn_whip', color: '#2f6a34', accent: '#7fcf5a', eye: '#ff7ab8' },
  golem: { name: 'Crystal Golem', biome: B.CRYSTAL, hp: 640, halfW: 1.5, h: 3.6, speed: 1.8, flying: false, contact: 22, attacks: ['slam', 'volley', 'rain'], cooldown: 2.6, minion: 'mite', beacon: 'beacon_golem', reward: { crystal: 25, metal: 10 }, gear: 'prism_lance', color: '#4f3a8a', accent: '#d8b8ff', eye: '#8ff4ff' },
  wyrm: { name: 'Ash Wyrm', biome: B.ASH, hp: 700, halfW: 1.3, h: 1.8, speed: 4.2, flying: true, contact: 24, attacks: ['charge', 'volley', 'rain'], cooldown: 2.0, minion: 'ember', beacon: 'beacon_wyrm', reward: { crystal: 18, copper_wire: 20 }, gear: 'ember_cannon', color: '#3a1f1a', accent: '#ff8a3c', eye: '#ffd24a' },
  hollow_ai: { name: 'The Hollow AI', biome: -1, layer: 3, hp: 2200, halfW: 1.8, h: 3.2, speed: 3.2, flying: true, contact: 30, attacks: ['volley', 'rain', 'summon', 'charge', 'volley'], cooldown: 1.8, minion: 'flyer', beacon: 'beacon_ai', reward: { core_shard: 20, crystal: 40, plasma: 20 }, gear: 'ai_crown', color: '#2a1a3a', accent: '#ff5aff', eye: '#ffffff' },
  titan: { name: 'Frost Titan', biome: B.FROST, hp: 820, halfW: 1.7, h: 4.0, speed: 1.6, flying: false, contact: 26, attacks: ['slam', 'rain', 'volley', 'summon'], cooldown: 2.5, minion: 'hulk', beacon: 'beacon_titan', reward: { crystal: 30, metal: 25 }, gear: 'frost_core', color: '#5a7390', accent: '#e6f6ff', eye: '#36e0e8' },
};
export const BOSS_IDS = Object.keys(BOSSES) as BossId[];
/** The five biome bosses (the gates count these); the Hollow AI is the final boss. */
export const BIOME_BOSSES = BOSS_IDS.filter((id) => BOSSES[id].layer === undefined);
export const FINAL_BOSS: BossId = 'hollow_ai';

/** Telegraph (warning) and active time per attack. */
export const ATTACK_TIME: Record<AttackKind, { warn: number; act: number }> = {
  slam: { warn: 0.7, act: 0.5 },
  rain: { warn: 0.6, act: 1.2 },
  charge: { warn: 0.6, act: 1.1 },
  volley: { warn: 0.5, act: 0.9 },
  summon: { warn: 0.8, act: 0.3 },
};

export const SLAM_RADIUS = 6;
export const SLAM_DMG = 22;
export const BOLT_DMG = 12;
/** Seconds a boss bolt lives. */
export const BOLT_LIFE = 3;
export const ARENA_HALF = 28;

export interface Boss {
  id: BossId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  facing: number;
  /** Arena (x range) the fight is held in; the boss never leaves it. */
  ax0: number;
  ax1: number;
  cd: number;
  attack: AttackKind | null;
  /** Seconds into the current attack (negative part = telegraph). */
  at: number;
  iframes: number;
  age: number;
  nextAttack: number;
}

export interface BossBolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

/** What a boss step asks the game to do this frame. */
export interface BossOut {
  bolts: BossBolt[];
  rain: number[];
  minions: number;
  slam: boolean;
  /** Attack that just started its telegraph (for sound and UI). */
  warn: AttackKind | null;
}

export function makeBoss(id: BossId, x: number, y: number): Boss {
  return { id, x, y, vx: 0, vy: 0, hp: BOSSES[id].hp, facing: -1, ax0: x - ARENA_HALF, ax1: x + ARENA_HALF, cd: 2, attack: null, at: 0, iframes: 0, age: 0, nextAttack: 0 };
}

export function phase(b: Boss): 1 | 2 {
  return b.hp <= BOSSES[b.id].hp / 2 ? 2 : 1;
}

function solid(world: World, x: number, y: number): boolean {
  return world.isSolid(Math.floor(x), Math.floor(y));
}

/** Advance the boss; rng is the game's seeded generator. */
export function stepBoss(b: Boss, world: World, dt: number, px: number, py: number, rng: () => number): BossOut {
  const d = BOSSES[b.id];
  const out: BossOut = { bolts: [], rain: [], minions: 0, slam: false, warn: null };
  b.age += dt;
  b.iframes = Math.max(0, b.iframes - dt);
  const toward = Math.sign(px - b.x) || b.facing;
  const p2 = phase(b) === 2;
  if (!b.attack) {
    b.facing = toward;
    b.cd -= dt;
    if (b.cd <= 0) {
      b.attack = d.attacks[b.nextAttack % d.attacks.length];
      b.nextAttack += 1 + (rng() < 0.3 ? 1 : 0);
      b.at = -ATTACK_TIME[b.attack].warn;
      out.warn = b.attack;
    }
  }
  const a = b.attack;
  if (a) {
    const prev = b.at;
    b.at += dt;
    const started = prev < 0 && b.at >= 0;
    if (a === 'charge') {
      if (b.at < 0) b.vx = 0;
      else b.vx = b.facing * d.speed * 4.5;
    } else if (a === 'slam') {
      if (started) b.vy = d.flying ? 12 : -14;
      if (b.at >= 0 && b.at < ATTACK_TIME.slam.act && b.vy >= 0 && (d.flying ? b.at > 0.3 : solid(world, b.x, b.y + 0.05))) {
        if (!out.slam && b.at > 0.12) {
          out.slam = true;
          b.at = ATTACK_TIME.slam.act;
        }
      }
      b.vx = b.at < 0 ? 0 : b.facing * d.speed;
    } else {
      b.vx = 0;
      if (started && a === 'rain') for (let i = 0; i < (p2 ? 8 : 5); i++) out.rain.push(px + (rng() - 0.5) * 14);
      if (started && a === 'summon') out.minions = p2 ? 3 : 2;
      if (a === 'volley' && b.at >= 0) {
        // Three (phase 2: five) aimed bolts over the active window.
        const n = p2 ? 5 : 3;
        const step = ATTACK_TIME.volley.act / n;
        if (Math.floor(prev / step) !== Math.floor(b.at / step) && b.at < ATTACK_TIME.volley.act) {
          const ox = b.x;
          const oy = b.y - d.h * 0.6;
          const dx = px - ox;
          const dy = py - 0.9 - oy;
          const len = Math.hypot(dx, dy) || 1;
          out.bolts.push({ x: ox, y: oy, vx: (dx / len) * 11, vy: (dy / len) * 11, life: BOLT_LIFE });
        }
      }
    }
    if (b.at >= ATTACK_TIME[a].act) {
      b.attack = null;
      b.cd = d.cooldown * (p2 ? 0.65 : 1);
    }
  } else {
    // Walk (or hover) toward the player between attacks.
    b.vx += (toward * d.speed - b.vx) * Math.min(1, 4 * dt);
  }
  // Movement: flyers hover at the player's height; walkers fall and walk, stepping over 1-tile bumps.
  if (d.flying) {
    const ty = Math.min(py - 3, py - 1.5 + Math.sin(b.age * 1.7) * 2);
    if (a !== 'slam' || b.at < 0) b.vy += (ty - b.y - b.vy * 0.5) * Math.min(1, 3 * dt);
  } else b.vy = Math.min(28, b.vy + 42 * dt);
  const nx = b.x + b.vx * dt;
  const blockedX = !d.flying && solid(world, nx + Math.sign(b.vx) * d.halfW, b.y - 0.5) && solid(world, nx + Math.sign(b.vx) * d.halfW, b.y - 1.5);
  if (!blockedX) b.x = Math.max(b.ax0, Math.min(b.ax1, nx));
  else if (!a) b.vy = -12;
  const ny = b.y + b.vy * dt;
  if (!d.flying && b.vy > 0 && solid(world, b.x, ny)) {
    b.y = Math.floor(ny);
    b.vy = 0;
  } else if (b.vy < 0 && solid(world, b.x, ny - d.h)) b.vy = 0;
  else b.y = ny;
  b.y = Math.max(2, Math.min(world.h - 3, b.y));
  return out;
}

/**
 * Where a hit from (x, y) lands on the boss body: the nearest point of its box, so hit sparks
 * spray from the surface facing the attacker. A point inside the box (a shot that just entered)
 * snaps out to the nearer side edge.
 */
export function bossContact(b: Boss, x: number, y: number): { x: number; y: number } {
  const d = BOSSES[b.id];
  const cy = Math.max(b.y - d.h, Math.min(b.y, y));
  if (Math.abs(x - b.x) >= d.halfW) return { x: b.x + Math.sign(x - b.x) * d.halfW, y: cy };
  const inside = y > b.y - d.h && y < b.y;
  return { x: inside ? b.x + (x >= b.x ? 1 : -1) * d.halfW : x, y: cy };
}

/** Does the boss body overlap a box centred at (x, y) with half size (hw, hh)? */
export function bossHits(b: Boss, x: number, y: number, hw: number, hh: number): boolean {
  const d = BOSSES[b.id];
  return Math.abs(b.x - x) < d.halfW + hw && y + hh > b.y - d.h && y - hh < b.y;
}

/** Which boss a beacon item summons. */
export function bossForBeacon(item: ItemId): BossId | null {
  for (const id of BOSS_IDS) if (BOSSES[id].beacon === item) return id;
  return null;
}
