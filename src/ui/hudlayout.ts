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

/** Slim GOAL card geometry: one row (step badge, text, count) plus a hairline progress bar. Pure for tests. */
export interface GoalCardLayout {
  pad: number;
  /** Badge ("2/7") box, left of the text. */
  badgeW: number;
  /** Left edge of the text column, relative to the card. */
  textX: number;
  /** Width available to the wrapped step text. */
  textW: number;
  /** Width reserved on the right for the count ("3/8"), 0 when uncounted. */
  countW: number;
  /** Progress bar thickness along the bottom edge, 0 when uncounted. */
  barH: number;
  lineH: number;
}

export function goalCardLayout(maxW: number, u: number, bodyFs: number, badgeTextW: number, countTextW: number, counted: boolean): GoalCardLayout {
  const pad = u * 0.42;
  const badgeW = badgeTextW + u * 0.6;
  const textX = u * 0.18 + pad + badgeW + pad;
  const countW = counted ? countTextW + pad : 0;
  const textW = Math.max(u * 4, maxW - textX - countW - pad);
  return { pad, badgeW, textX, textW, countW, barH: counted ? Math.max(2, u * 0.2) : 0, lineH: bodyFs * 1.2 };
}

/** Card height for `lines` wrapped text lines. */
export function goalCardHeight(l: GoalCardLayout, lines: number): number {
  return Math.max(1, lines) * l.lineH + l.pad * 1.3 + l.barH;
}
