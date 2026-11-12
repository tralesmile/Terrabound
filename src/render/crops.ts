/** Crop and sprinkler tile art (farming.ts), drawn with rects on a 16x16 grid. Cosmetic only. */
import { cropAt, type CropId } from '../sim/farming';

type R = [number, number, number, number, string];

const STEM = '#4f9a3a';
const LEAF = '#7fd35a';
const LEAF_D = '#3f7a2e';

/** Rect lists per crop and stage (x, y, w, h, colour) in 16ths of a tile, feet on row 16. */
export const CROP_ART: Record<CropId, readonly (readonly R[])[]> = {
  glowcorn: [
    [[7, 12, 2, 4, STEM], [4, 11, 3, 2, LEAF], [9, 10, 3, 2, LEAF]],
    [[7, 5, 2, 11, STEM], [3, 9, 4, 2, LEAF], [9, 7, 4, 2, LEAF], [4, 13, 3, 2, LEAF_D], [9, 12, 3, 2, LEAF_D], [6, 3, 4, 2, LEAF]],
    [[7, 2, 2, 14, STEM], [3, 10, 4, 2, LEAF_D], [9, 9, 4, 2, LEAF_D], [6, 0, 4, 3, '#d8e88a'],
      [3, 5, 3, 5, '#ffe36a'], [4, 6, 1, 3, '#fff6b0'], [10, 4, 3, 5, '#ffe36a'], [11, 5, 1, 3, '#fff6b0']],
  ],
  rustroot: [
    [[7, 13, 2, 3, STEM], [5, 12, 2, 2, LEAF], [9, 12, 2, 2, LEAF]],
    [[6, 9, 1, 7, STEM], [9, 9, 1, 7, STEM], [3, 8, 4, 3, LEAF], [9, 7, 4, 3, LEAF], [6, 6, 4, 3, LEAF_D]],
    [[6, 7, 1, 7, STEM], [9, 7, 1, 7, STEM], [2, 5, 5, 3, LEAF], [9, 4, 5, 3, LEAF], [5, 2, 6, 3, LEAF_D],
      [4, 13, 8, 3, '#d8704a'], [5, 13, 3, 1, '#f0a07a'], [6, 12, 4, 1, '#b8583a']],
  ],
  frostberry: [
    [[7, 13, 2, 3, '#5a8aa0'], [5, 12, 2, 2, '#a8e0f0'], [9, 12, 2, 2, '#a8e0f0']],
    [[7, 10, 2, 6, '#5a8aa0'], [3, 8, 10, 5, '#5ab0a8'], [4, 7, 8, 2, '#8ad8c8'], [5, 12, 6, 2, '#3a7a78']],
    [[7, 10, 2, 6, '#5a8aa0'], [2, 6, 12, 7, '#4aa098'], [3, 5, 10, 2, '#8ad8c8'], [4, 11, 8, 2, '#2f6a68'],
      [4, 7, 2, 2, '#7ac8ff'], [9, 6, 2, 2, '#7ac8ff'], [6, 9, 2, 2, '#9ad8ff'], [11, 9, 2, 2, '#7ac8ff'], [4, 7, 1, 1, '#e6f6ff'], [9, 6, 1, 1, '#e6f6ff']],
  ],
};

export const SPRINKLER_ART: readonly R[] = [
  [7, 6, 2, 10, '#6a7890'], [6, 14, 4, 2, '#3d4152'], [4, 4, 8, 3, '#5aa6ff'], [5, 3, 6, 1, '#9fd8ff'], [3, 5, 1, 1, '#9fd8ff'], [12, 5, 1, 1, '#9fd8ff'],
];

export const POT_ART: readonly R[] = [
  [5, 1, 1, 2, '#d8dde8'], [6, 0, 1, 1, '#d8dde8'], [9, 2, 1, 2, '#d8dde8'], [10, 1, 1, 1, '#d8dde8'],
  [2, 6, 12, 1, '#c9d0e4'], [3, 7, 10, 6, '#6a7890'], [3, 7, 10, 1, '#8a9ab8'], [4, 8, 2, 3, '#9aa4b4'],
  [1, 8, 2, 1, '#3d4152'], [13, 8, 2, 1, '#3d4152'], [4, 5, 8, 1, '#d8a04a'],
  [4, 13, 2, 3, '#3d4152'], [10, 13, 2, 3, '#3d4152'], [6, 14, 4, 2, '#ff8a3a'], [7, 14, 2, 1, '#ffd27a'],
];

/** Draw a crop tile (or sprinkler) at (dx, dy) with tile size ts; false when `t` is neither. */
export function drawCropTile(ctx: CanvasRenderingContext2D, t: number, dx: number, dy: number, ts: number, wet: boolean, sprinkler: boolean, pot = false): boolean {
  const u = ts / 16;
  let rects: readonly R[] | null = null;
  if (pot) rects = POT_ART;
  else if (sprinkler) rects = SPRINKLER_ART;
  else {
    const c = cropAt(t);
    if (!c) return false;
    rects = CROP_ART[c.crop][c.stage];
  }
  // Damp soil line under watered crops so players can see the sprinkler reaches.
  if (wet && !sprinkler) {
    ctx.fillStyle = 'rgba(70,140,220,0.55)';
    ctx.fillRect(dx + u, dy + 15 * u, 14 * u, u);
  }
  for (const [x, y, w, h, col] of rects) {
    ctx.fillStyle = col;
    ctx.fillRect(dx + x * u, dy + y * u, w * u, h * u);
  }
  return true;
}
