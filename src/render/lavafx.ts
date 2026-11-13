/**
 * Molten lava (per-frame, cosmetic). Pure helpers so tests can pin the look:
 * a flowing crust pattern in world art px (continuous across tiles, so a pool reads as one
 * body of molten rock, not a stack of striped cells), darker red with depth, and a heat
 * shimmer that wobbles the picture above a surface in thin rows.
 */

/** Size in art px of one crust block (whole art px so it stays crisp). */
export const LAVA_BLOCK = 2;

/**
 * Shade of the lava at world art px (ax, ay) at `time`: 0 cooled crust, 1 base melt,
 * 2 hot vein, 3 white-hot crack. Ridged sines drift slowly so the crust plates flow.
 * Surface cells cool faster, so they show more crust.
 */
export function lavaShade(ax: number, ay: number, time: number, surface: boolean): 0 | 1 | 2 | 3 {
  const x = ax;
  const y = ay;
  const w =
    Math.sin(x * 0.13 + y * 0.21 + time * 0.6) +
    Math.sin(x * 0.07 - y * 0.17 - time * 0.45 + Math.sin(y * 0.11 + time * 0.3) * 1.5) +
    0.6 * Math.sin(x * 0.29 + y * 0.05 + time * 0.9);
  const r = Math.abs(w);
  if (r < 0.22) return 3;
  if (r < 0.6) return 2;
  if (r > (surface ? 1.55 : 1.95)) return 0;
  return 1;
}

/** Darkening alpha for a lava cell `depth` cells below the surface (deep lava glows a darker red). */
export function lavaDepthShade(depth: number): number {
  return Math.min(0.36, Math.max(0, depth) * 0.12);
}

/** Art px rows of heat shimmer above a lava surface. */
export const SHIMMER_ROWS = 24;
/** Height of one shimmer row in art px. */
export const SHIMMER_ROW = 2;

/**
 * Horizontal wobble (whole art px: -1, 0 or 1) of shimmer row `row` (0 = just above the surface)
 * at `time`, for the run of lava starting at tile column `tx`. Strongest near the lava and fading
 * out with height; always 0 at or above SHIMMER_ROWS.
 */
export function shimmerShift(time: number, row: number, tx: number): -1 | 0 | 1 {
  const rows = SHIMMER_ROWS / SHIMMER_ROW;
  if (row < 0 || row >= rows) return 0;
  const fade = 1 - row / rows;
  const v = Math.sin(time * 5.3 - row * 0.9 + tx * 0.7) * 0.7 + Math.sin(time * 8.1 + row * 1.7) * 0.3;
  const a = v * (0.4 + 0.9 * fade);
  return a > 0.5 ? 1 : a < -0.5 ? -1 : 0;
}

/** Merge surface lava cells (tile x, screen dx, dy) on the same row into horizontal runs. */
export function shimmerRuns(cells: { tx: number; ty: number }[]): { tx: number; ty: number; n: number }[] {
  const sorted = [...cells].sort((a, b) => a.ty - b.ty || a.tx - b.tx);
  const out: { tx: number; ty: number; n: number }[] = [];
  for (const c of sorted) {
    const last = out[out.length - 1];
    if (last && last.ty === c.ty && last.tx + last.n === c.tx) last.n++;
    else out.push({ tx: c.tx, ty: c.ty, n: 1 });
  }
  return out;
}

/** Downward speed of the lavafall streaks in art px per second. */
export const FALL_SPEED = 40;
/** Width in art px of a lavafall sheet (it hugs the crag face, the rest of the tile is air). */
export const FALL_W = 10;

/**
 * Shade of a lavafall sheet at art px (ax across, ay down from the lip) at `time`, for a sheet `width`
 * art px wide: 0 cooled crust (the two edges always), 1 base melt, 2 hot streak, 3 white-hot.
 * Long vertical streaks scroll down at FALL_SPEED: the value depends on time only through ay - speed*t.
 */
export function fallShade(ax: number, ay: number, time: number, width: number): 0 | 1 | 2 | 3 {
  if (ax <= 0 || ax >= width - 1) return 0;
  const v = ay - time * FALL_SPEED;
  const s = Math.sin(ax * 1.3 + Math.sin(v * 0.07) * 1.4) + 0.6 * Math.sin(ax * 2.9 - v * 0.035 + 1.7);
  if (s > 1.15) return 3;
  if (s > 0.45) return 2;
  if (s < -1.1) return 0;
  return 1;
}

/**
 * Ragged edges of a lavafall sheet: how many art px (0-2) each side is pulled in on row `ay`.
 * The ripple travels down with the pour (depends on time only through ay - FALL_SPEED * t).
 */
export function fallEdges(ay: number, time: number): [number, number] {
  const v = ay - time * FALL_SPEED;
  return [Math.round(1 + Math.sin(v * 0.21)), Math.round(1 + Math.sin(v * 0.17 + 2))];
}
