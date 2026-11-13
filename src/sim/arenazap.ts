/**
 * Floor zaps (Hollow AI, phase 2): the arena circuit charges under the boss for ZAP_WARN seconds
 * (telegraph), then an electric wave rolls outward along the floor both ways. Standing on the floor
 * when the crest passes hurts; jumping (or flying) over it dodges. Pure and deterministic.
 */
import { ARENA_HALF, BOSSES, phase, type Boss } from './bosses';

/** Telegraph before the wave leaves (s). */
export const ZAP_WARN = 0.9;
/** Crest speed along the floor (tiles/s). */
export const ZAP_SPEED = 11;
/** Half width of the crest band that hurts (tiles). */
export const ZAP_HALF = 0.8;
/** Rest after a wave runs out before the next telegraph (s). */
export const ZAP_REST = 1.1;
export const ZAP_DMG = 14;
/** A wave runs out this far from its start (past the arena edge from the middle). */
export const ZAP_REACH = ARENA_HALF + 4;
/** Only a player within this many tiles of the wave's floor height is on its floor. */
export const ZAP_FLOOR_SPAN = 4;

export interface Zap {
  /** Seconds since the wave left (negative = telegraph). */
  t: number;
  /** Where it starts (tile x) and the floor height under the boss then. */
  x0: number;
  y0: number;
  /** Already hurt the player (one hit per wave). */
  hit: boolean;
}

/** Insulator pads: tile offsets from the arena centre where the floor never conducts. */
export const SAFE_PAD_OFFSETS = [-11, 11] as const;
/** Pad width (tiles). */
export const SAFE_PAD_W = 3;

/** Safe pads of a zapping boss's arena as [x0, x1) tile spans (none for other bosses). Pure. */
export function safePads(b: Boss): [number, number][] {
  if (BOSSES[b.id].floorZaps !== true) return [];
  const c = Math.round((b.ax0 + b.ax1) / 2);
  return SAFE_PAD_OFFSETS.map((o) => [c + o - 1, c + o - 1 + SAFE_PAD_W] as [number, number]);
}

/** Is tile column / x position on a safe pad? */
export function onSafePad(pads: [number, number][], x: number): boolean {
  for (const [a, z] of pads) if (x >= a && x < z) return true;
  return false;
}

/** Does this boss zap its floor (and is it angry enough yet)? */
export function zapsNow(b: Boss): boolean {
  return BOSSES[b.id].floorZaps === true && phase(b) === 2;
}

/** Crest distance from the start, or -1 while still charging. */
export function zapRadius(z: Zap): number {
  return z.t < 0 ? -1 : z.t * ZAP_SPEED;
}

/** First floor row under (x, y): the top of the first solid tile with air above, scanning down. */
export function floorBelow(isSolid: (x: number, y: number) => boolean, x: number, y: number, depth = 20): number {
  const tx = Math.floor(x);
  const y0 = Math.floor(y);
  for (let ty = y0; ty < y0 + depth; ty++) if (isSolid(tx, ty) && !isSolid(tx, ty - 1)) return ty;
  return y0 + depth;
}

/**
 * Advance the floor zaps. Returns 'warn' on the frame a new telegraph starts. `b.zap` is the wave
 * in flight (or charging); `b.zapCd` counts down the rest before the next one. A wave in flight
 * always finishes.
 */
export function stepZap(b: Boss, dt: number, isSolid: (x: number, y: number) => boolean): 'warn' | null {
  if (b.zap) {
    b.zap.t += dt;
    if (zapRadius(b.zap) > ZAP_REACH) {
      b.zap = null;
      b.zapCd = ZAP_REST;
    }
  }
  if (!zapsNow(b)) return null;
  b.zapCd -= dt;
  if (b.zap || b.zapCd > 0) return null;
  b.zap = { t: -ZAP_WARN, x0: b.x, y0: floorBelow(isSolid, b.x, b.y - 1), hit: false };
  return 'warn';
}

/** Does the wave hurt a player at feet (px, py) this frame? Standing on a safe pad never does. Marks the wave as spent when it does. */
export function zapHits(z: Zap | null, px: number, py: number, onGround: boolean, pads: [number, number][] = []): boolean {
  if (!z || z.hit || z.t < 0 || !onGround) return false;
  if (onSafePad(pads, px)) return false;
  if (Math.abs(py - z.y0) > ZAP_FLOOR_SPAN) return false;
  if (Math.abs(Math.abs(px - z.x0) - zapRadius(z)) > ZAP_HALF) return false;
  z.hit = true;
  return true;
}
