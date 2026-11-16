/**
 * Logic Warden laser grid: the boss projects a row of vertical beams across its arena. A long
 * telegraph shows thin guide lines where each beam will stand; then the beams fire for a moment.
 * The safe lanes sit between the beams and swap sides every cast. Pure and deterministic.
 */
import { ATTACK_TIME, phase, type Boss } from './bosses';

/** Half width of a beam in tiles. */
export const GRID_HALF = 0.55;
export const GRID_DMG = 16;
/** Tiles between beams (phase 2 packs them closer). */
export const GRID_GAP = 5;
export const GRID_GAP_P2 = 3.6;

/** Beam centre columns (tile x) for the boss's current (or next) grid cast. Pure. */
export function gridColumns(b: Boss): number[] {
  const gap = phase(b) === 2 ? GRID_GAP_P2 : GRID_GAP;
  // nextAttack moves on when a cast starts, so its parity is fixed for the whole cast and flips between casts.
  const off = (b.nextAttack % 2) * (gap / 2) + gap / 2;
  const out: number[] = [];
  for (let x = b.ax0 + off; x <= b.ax1; x += gap) out.push(x);
  return out;
}

/** Are the beams live (past the telegraph, inside the active window)? */
export function gridFiring(b: Boss): boolean {
  return b.attack === 'grid' && b.at >= 0 && b.at < ATTACK_TIME.grid.act;
}

/** Does a live beam touch a body centred at x with half width hw? */
export function gridHits(b: Boss, x: number, hw: number): boolean {
  if (!gridFiring(b)) return false;
  return gridColumns(b).some((c) => Math.abs(c - x) < GRID_HALF + hw);
}

/** Middle of the nearest safe lane to x (for hints and tests). */
export function safeLane(b: Boss, x: number): number {
  const cols = gridColumns(b);
  let best = x;
  let bestD = Infinity;
  for (let i = 0; i + 1 < cols.length; i++) {
    const m = (cols[i] + cols[i + 1]) / 2;
    if (Math.abs(m - x) < bestD) {
      bestD = Math.abs(m - x);
      best = m;
    }
  }
  return best;
}

/** Phase 2 twist: a tripwire beam skims the whole arena floor, so standing in a lane is not enough; hop it. */
export const GRID_BAR_H = 0.9;

export function gridBarActive(b: Boss): boolean {
  return phase(b) === 2 && b.attack === 'grid';
}

/** First solid row below the boss at its column: the arena floor the tripwire rides on. Pure. */
export function gridFloorY(isSolid: (x: number, y: number) => boolean, b: Boss, maxDepth = 30): number {
  const tx = Math.floor(b.x);
  const y0 = Math.max(0, Math.floor(b.y));
  for (let y = y0; y < y0 + maxDepth; y++) if (isSolid(tx, y)) return y;
  return y0 + maxDepth;
}

/** Does the live tripwire catch a body whose feet are at feetY (y grows downward) and centre at x? */
export function gridBarHits(b: Boss, floorY: number, feetY: number, x: number): boolean {
  if (!gridBarActive(b) || !gridFiring(b)) return false;
  if (x < b.ax0 || x > b.ax1) return false;
  return feetY > floorY - GRID_BAR_H;
}
