/**
 * Touch drill assist: a thumb is wider than a tile. When the tapped tile has nothing to drill, a near
 * miss snaps to the block beside the finger, and a tap beyond reach digs the first block on the line
 * toward the finger. Pure; the sim only asks for it when a touch drill is aiming.
 */

export const DIG_ASSIST = {
  /** A block within this many tiles of the finger point counts as a near miss. Under half a tile, so
   * a finger resting in the middle of a hole it just dug never creeps into the next block. */
  slack: 0.35,
  /** Sample spacing along the far-tap line, in tiles. */
  step: 0.2,
} as const;

export interface AssistInput {
  /** Body centre, in tiles. */
  cx: number;
  cy: number;
  /** Finger point in tile units (fractional). */
  fx: number;
  fy: number;
  reach: (tx: number, ty: number) => boolean;
  /** Something the drill works on at all (the exact tile is kept when this is true). */
  usable: (tx: number, ty: number) => boolean;
  /** A solid block the assist may move the aim to. */
  target: (tx: number, ty: number) => boolean;
}

function nearMiss(a: AssistInput, tx: number, ty: number): { tx: number; ty: number } | null {
  let best: { tx: number; ty: number } | null = null;
  let bestD: number = DIG_ASSIST.slack;
  for (let y = ty - 1; y <= ty + 1; y++) {
    for (let x = tx - 1; x <= tx + 1; x++) {
      if ((x === tx && y === ty) || !a.target(x, y) || !a.reach(x, y)) continue;
      const d = Math.hypot(Math.max(x - a.fx, 0, a.fx - x - 1), Math.max(y - a.fy, 0, a.fy - y - 1));
      if (d <= bestD) {
        best = { tx: x, ty: y };
        bestD = d;
      }
    }
  }
  return best;
}

function alongLine(a: AssistInput): { tx: number; ty: number } | null {
  const dx = a.fx - a.cx;
  const dy = a.fy - a.cy;
  const len = Math.hypot(dx, dy);
  if (!(len > 0)) return null;
  for (let d = DIG_ASSIST.step; d <= len; d += DIG_ASSIST.step) {
    const tx = Math.floor(a.cx + (dx / len) * d);
    const ty = Math.floor(a.cy + (dy / len) * d);
    if (!a.target(tx, ty)) continue;
    // The first block on the line: dig it if it is in reach, never through it.
    return a.reach(tx, ty) ? { tx, ty } : null;
  }
  return null;
}

/** The tile a touch drill should work on, given the finger point. */
export function assistDig(a: AssistInput): { tx: number; ty: number } {
  const tx = Math.floor(a.fx);
  const ty = Math.floor(a.fy);
  const exact = { tx, ty };
  if (a.reach(tx, ty)) return a.usable(tx, ty) ? exact : (nearMiss(a, tx, ty) ?? exact);
  return alongLine(a) ?? exact;
}
