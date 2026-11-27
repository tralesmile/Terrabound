/**
 * Behaviours for the second enemy wave (P12-B): the tunnelling borer, the beam sentry, the fuse tick and
 * the shielded bulwark. Each has a telegraph of at least 0.4 s and one clear counter. Pure and
 * deterministic: no DOM, no randomness.
 */
import type { World } from './world';
import { T, TILES, isMinable } from './tiles';
import type { Enemy } from './enemies';

export interface BeamDef {
  /** Starts aiming when the player is this close and in clear sight (tiles). */
  range: number;
  /** Seconds the aim line follows the player. */
  track: number;
  /** Seconds the line stays locked before it fires (the dodge window, at least 0.4 s). */
  lock: number;
  dmg: number;
  /** Seconds before it can aim again. */
  cd: number;
}

export interface FuseDef {
  /** Lights its fuse when the player is this close (tiles). */
  trigger: number;
  /** Fuse seconds (at least 0.4 s). */
  fuse: number;
  /** The blast hurts a player this close (tiles). */
  radius: number;
  dmg: number;
}

/** How long a borer pauses, harmless, after it breaks out of the rock. */
export const SURFACE_PAUSE = 0.45;
/** A borer only hunts a player this close; further off it lies still. */
export const BORE_RANGE = 14;
/** Seconds a shielded enemy needs to turn around, which is the window to hit its back. */
export const SHIELD_TURN = 0.8;
/** How far past the locked point the beam reaches (tiles). */
const BEAM_OVERSHOOT = 4;
/** Height of the player's chest above the feet, where sentries aim. */
const CHEST_UP = 0.9;
/** Height of a sentry's lens above its feet. */
export const EYE_UP = 0.55;

/** Natural rock a borer can swim through: never anything the player placed, machines, chests, pad or bedrock. */
export function borable(world: World, x: number, y: number): boolean {
  if (x < 1 || y < 1 || x >= world.w - 1 || y >= world.h - 1) return false;
  const t = world.get(x, y);
  const d = TILES[t];
  if (!d.solid) return !d.enemyBlock;
  if (world.edits.has(y * world.w + x)) return false;
  return isMinable(t) && t !== T.PAD && t !== T.CHEST;
}

function boxAll(x: number, y: number, halfW: number, h: number, pred: (tx: number, ty: number) => boolean): boolean {
  for (let ty = Math.floor(y - h); ty <= Math.floor(y - 1e-9); ty++) for (let tx = Math.floor(x - halfW); tx <= Math.floor(x + halfW - 1e-9); tx++) if (!pred(tx, ty)) return false;
  return true;
}

/** True when any solid block overlaps the borer's body (it is inside the rock: dust only, no bite). */
export function inRock(world: World, x: number, y: number, halfW: number, h: number): boolean {
  return !boxAll(x, y, halfW, h, (tx, ty) => !world.isSolid(tx, ty));
}

/** True when rock the borer can enter is right beside or below it. */
function nearRock(world: World, e: Enemy, halfW: number, h: number): boolean {
  const rock = (tx: number, ty: number) => world.isSolid(tx, ty) && borable(world, tx, ty);
  const my = Math.floor(e.y - h / 2);
  return rock(Math.floor(e.x - halfW - 0.2), my) || rock(Math.floor(e.x + halfW + 0.2), my) || rock(Math.floor(e.x), Math.floor(e.y + 0.2)) || rock(Math.floor(e.x), Math.floor(e.y - h - 0.2));
}

/**
 * Move a borer: it swims toward the player through natural rock; in open air away from rock it falls
 * like any walker. Anything the player built stops it, so a wall is a real defence.
 */
export function stepBorer(world: World, e: Enemy, halfW: number, h: number, speed: number, dt: number, px: number, py: number): void {
  const was = e.buried === true;
  e.surfaceT = Math.max(0, (e.surfaceT ?? 0) - dt);
  const dx = px - e.x;
  const dy = py - 0.3 - e.y;
  const dist = Math.hypot(dx, dy);
  const hunting = dist < BORE_RANGE && dist > 0.2;
  const knock = Math.abs(e.vx) > speed * 1.5;
  if (e.surfaceT > 0) {
    e.vx = 0;
    e.vy = 0;
  } else if (knock) {
    e.vx *= Math.max(0, 1 - 6 * dt);
    e.vy = 0;
  } else if (was || nearRock(world, e, halfW, h)) {
    e.vx = hunting ? (dx / dist) * speed : 0;
    e.vy = hunting ? (dy / dist) * speed : 0;
  } else {
    e.vx = hunting ? Math.sign(dx) * speed : 0;
    e.vy = Math.min(24, e.vy + 42 * dt);
  }
  const free = (x: number, y: number) => boxAll(x, y, halfW, h, (tx, ty) => borable(world, tx, ty));
  const steps = Math.max(1, Math.ceil((Math.max(Math.abs(e.vx), Math.abs(e.vy)) * dt) / 0.2));
  for (let i = 0; i < steps; i++) {
    const sx = (e.vx * dt) / steps;
    const sy = (e.vy * dt) / steps;
    if (free(e.x + sx, e.y)) e.x += sx;
    else e.vx = 0;
    // Falling through open air stops on any floor; only a hunting dive goes into it.
    const lands = !was && sy > 0 && !(hunting && dy > 0.8) && world.isSolid(Math.floor(e.x), Math.floor(e.y + sy));
    if (!lands && free(e.x, e.y + sy)) e.y += sy;
    else {
      if (lands) e.y = Math.floor(e.y + sy);
      e.vy = 0;
    }
  }
  e.buried = inRock(world, e.x, e.y, halfW, h);
  if (was && !e.buried) {
    e.surfaceT = SURFACE_PAUSE;
    e.surfaced = true;
  }
  if (Math.abs(e.vx) > 0.2) e.dir = e.vx > 0 ? 1 : -1;
}

/** True while a borer cannot bite: inside the rock or just breaking out. */
export function borerHarmless(e: Enemy): boolean {
  return e.buried === true || (e.surfaceT ?? 0) > 0;
}

/** First point where the line from (x0,y0) toward (x1,y1), up to `len` tiles, meets a solid block. */
export function beamEnd(world: World, x0: number, y0: number, x1: number, y1: number, len: number): { x: number; y: number; d: number } {
  const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / dist;
  const uy = (y1 - y0) / dist;
  for (let d = 0.2; d <= len; d += 0.2) {
    if (world.isSolid(Math.floor(x0 + ux * d), Math.floor(y0 + uy * d))) return { x: x0 + ux * d, y: y0 + uy * d, d };
  }
  return { x: x0 + ux * len, y: y0 + uy * len, d: len };
}

export function clearSight(world: World, x0: number, y0: number, x1: number, y1: number): boolean {
  const d = Math.hypot(x1 - x0, y1 - y0);
  return beamEnd(world, x0, y0, x1, y1, d).d >= d - 0.25;
}

/** True when the segment passes through the box (bottom-centre x,y). */
export function segmentHitsBox(x0: number, y0: number, x1: number, y1: number, x: number, y: number, halfW: number, h: number): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.15));
  for (let i = 0; i <= n; i++) {
    const px = x0 + ((x1 - x0) * i) / n;
    const py = y0 + ((y1 - y0) * i) / n;
    if (Math.abs(px - x) <= halfW && py <= y && py >= y - h) return true;
  }
  return false;
}

/**
 * Sentry aim cycle. Returns true while it is planted. `aim` follows the player for `track` seconds,
 * stays put for `lock` seconds, then the landing frame sets `fired` for the game to resolve.
 * Breaking line of sight while it is still tracking cancels the shot.
 */
export function stepBeam(world: World, e: Enemy, d: BeamDef, dt: number, px: number, py: number): boolean {
  e.beamCd = Math.max(0, (e.beamCd ?? 0) - dt);
  const ex = e.x;
  const ey = e.y - EYE_UP;
  const ty = py - CHEST_UP;
  const sees = () => Math.hypot(px - ex, ty - ey) <= d.range && clearSight(world, ex, ey, px, ty);
  if (e.aimT === undefined) {
    if (e.beamCd > 0 || !sees()) return false;
    e.aimT = 0;
    e.aimX = px;
    e.aimY = ty;
  }
  const tracking = e.aimT < d.track;
  e.aimT += dt;
  if (tracking) {
    if (!sees()) {
      e.aimT = undefined;
      return false;
    }
    e.aimX = px;
    e.aimY = ty;
    e.dir = px > e.x ? 1 : -1;
  }
  if (e.aimT >= d.track + d.lock) {
    e.aimT = undefined;
    e.beamCd = d.cd;
    e.fired = true;
  }
  return true;
}

/** The aim line of a sentry for drawing and for the shot: lens to the first wall past the locked point. */
export function beamLine(world: World, e: Enemy): { x0: number; y0: number; x1: number; y1: number } {
  const x0 = e.x;
  const y0 = e.y - EYE_UP;
  const ax = e.aimX ?? x0 + e.dir;
  const ay = e.aimY ?? y0;
  const end = beamEnd(world, x0, y0, ax, ay, Math.hypot(ax - x0, ay - y0) + BEAM_OVERSHOOT);
  return { x0, y0, x1: end.x, y1: end.y };
}

/** Fuse progress. Returns true while the fuse burns (planted); the last frame sets `burst`. */
export function stepFuse(e: Enemy, d: FuseDef, dt: number, near: boolean): boolean {
  if (e.fuseT === undefined) {
    if (!near) return false;
    e.fuseT = 0;
  }
  e.fuseT += dt;
  if (e.fuseT >= d.fuse) e.burst = true;
  return true;
}

/**
 * Shield facing: it turns toward the player only after the player has stayed behind it for SHIELD_TURN
 * seconds. Returns true while it is lined up to turn (it stands still).
 */
export function stepShieldTurn(e: Enemy, dt: number, px: number, near: boolean): boolean {
  const behind = near && Math.abs(px - e.x) > 0.35 && Math.sign(px - e.x) !== e.dir;
  if (!behind) {
    e.turnT = 0;
    return false;
  }
  e.turnT = (e.turnT ?? 0) + dt;
  if (e.turnT >= SHIELD_TURN) {
    e.dir = -e.dir;
    e.turnT = 0;
  }
  return true;
}

/** True when a hit knocking toward `dir` lands on the shield: it came from the side the enemy faces. */
export function hitsShield(faceDir: number, dir: number): boolean {
  return dir !== 0 && Math.sign(dir) === -Math.sign(faceDir);
}
