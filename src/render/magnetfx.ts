/**
 * Magnet pull lines (per-frame, cosmetic): when gear widens the pickup magnet (magnet ring, scout bot), every
 * drop it is reeling in gets a faint tether to the suit with beads that slide toward the player, so the
 * accessory reads in play instead of only on the stat line. Pure helpers so tests pin the look.
 */
import { GEAR, type GearId } from '../sim/gear';
import { MAGNET_R, PICK_R } from '../sim/drops';

export interface PullDrop {
  readonly x: number;
  readonly y: number;
  readonly noPick: number;
}

/** Most drawn tethers per frame (a mined vein can spill many drops). */
export const MAX_PULL_LINES = 12;

/**
 * Drops the widened magnet is pulling right now, nearest first, with a 0-1 strength (1 at the suit).
 * Nothing when the magnet is the base radius (no gear) or the pack is full (drops would not move).
 */
export function pulledDrops(drops: readonly PullDrop[], px: number, py: number, magnet: number, packFull: boolean): { i: number; k: number }[] {
  if (packFull || magnet <= MAGNET_R) return [];
  const out: { i: number; k: number; d: number }[] = [];
  drops.forEach((d, i) => {
    if (d.noPick > 0) return;
    // Same target point as stepDrops (chest height, 0.8 tiles above the feet).
    const dist = Math.hypot(px - d.x, py - 0.8 - d.y);
    if (dist <= PICK_R || dist >= magnet) return;
    out.push({ i, k: 1 - (dist - PICK_R) / (magnet - PICK_R), d: dist });
  });
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, MAX_PULL_LINES).map(({ i, k }) => ({ i, k }));
}

/** Positions 0-1 along a tether (0 = drop, 1 = suit) of `n` beads that slide toward the suit. */
export function pullBeads(time: number, n: number, seed: number): number[] {
  const out: number[] = [];
  for (let j = 0; j < n; j++) out.push((time * 1.4 + j / n + seed * 0.37) % 1);
  return out;
}

/** Tint of the tethers: the worn gear with the widest magnet (red for the ring, cyan for the scout bot). */
export function magnetTint(worn: readonly GearId[]): string | null {
  let best: GearId | null = null;
  let r = 0;
  for (const id of worn) {
    const m = GEAR[id].mod.magnet ?? 0;
    if (m > r) {
      r = m;
      best = id;
    }
  }
  // A pet's body is grey metal; its accent (the bot's cyan eye) is the colour players link to it.
  return best ? (GEAR[best].slot === 'pet' ? GEAR[best].accent : GEAR[best].color) : null;
}
