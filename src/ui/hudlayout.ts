/**
 * Where the two HUD blocks go: the status block (bars, quick heal, depth line, buffs, toasts)
 * and the button column (sound, map, home, shop...). Left-handed touch play (move stick on
 * the right) mirrors them so the buttons sit away from the stick thumb. Pure for tests.
 */
export interface HudAnchors {
  /** Left edge of the status block. */
  x: number;
  /** Left edge of the button column. */
  bx: number;
  /** Left edge of the small cog button beside the first column button. */
  gearX: number;
  /** Right limit for status text and toasts. */
  rightLimit: number;
  /** HP / battery bar width (shrinks when mirrored on a narrow screen so the heal slot still fits). */
  barW: number;
}

export function hudAnchors(w: number, u: number, barW: number, healW: number, colW: number, gearW: number, mirrored: boolean): HudAnchors {
  if (!mirrored) {
    const bx = w - colW - u;
    return { x: u, bx, gearX: bx - gearW - u * 0.5, rightLimit: bx, barW };
  }
  const bx = u;
  const gearX = bx + colW + u * 0.5;
  // The status block hugs the right edge, quick-heal slot included, but never slides under the cog.
  const x = Math.max(gearX + gearW + u * 0.5, w - u - barW - healW - u * 0.5);
  return { x, bx, gearX, rightLimit: w + u * 0.5, barW: Math.max(u * 4, Math.min(barW, w - u - healW - u * 0.5 - x)) };
}
