/**
 * Back-wall ambient occlusion (Terraria / Core Keeper style contact shadow): an air cell with a
 * back wall gets a soft dark band along each side that touches a solid block, and a small corner
 * shadow where only a diagonal neighbour is solid. Baked into the cached chunks, so it costs
 * nothing per frame. Pure (no DOM) so the shape is testable; the renderer paints the result.
 */
import { TILES } from '../sim/tiles';

export interface AoWorld {
  get(x: number, y: number): number;
}

/** One shade rectangle in art px inside a 16 px tile. */
export interface AoRect {
  x: number;
  y: number;
  w: number;
  h: number;
  alpha: number;
}

/** Band depth in art px and the alpha of each row from the face inward. */
export const AO_STEPS: readonly number[] = [0.38, 0.25, 0.14, 0.06];
/** Top faces (a ceiling above) cast a slightly stronger shadow than floors or walls. */
const CEIL = 1.2;
const FLOOR = 0.7;

function occluder(t: number): boolean {
  const d = TILES[t];
  return !!d?.solid && !d.clear;
}

/** Shade rects for the air cell (x, y), in art px of a `ts` px tile; empty when nothing touches it. */
export function aoRects(world: AoWorld, x: number, y: number, ts = 16): AoRect[] {
  const up = occluder(world.get(x, y - 1));
  const rt = occluder(world.get(x + 1, y));
  const dn = occluder(world.get(x, y + 1));
  const lf = occluder(world.get(x - 1, y));
  const out: AoRect[] = [];
  const n = AO_STEPS.length;
  for (let i = 0; i < n; i++) {
    const a = AO_STEPS[i];
    if (up) out.push({ x: 0, y: i, w: ts, h: 1, alpha: Math.min(0.5, a * CEIL) });
    if (dn) out.push({ x: 0, y: ts - 1 - i, w: ts, h: 1, alpha: a * FLOOR });
    // Side bands skip the rows a top/bottom band already covers, so corners do not double up.
    const y0 = up ? n : 0;
    const y1 = dn ? ts - n : ts;
    if (lf) out.push({ x: i, y: y0, w: 1, h: y1 - y0, alpha: a });
    if (rt) out.push({ x: ts - 1 - i, y: y0, w: 1, h: y1 - y0, alpha: a });
  }
  // Inner corners: a solid diagonal with both sides open leaves a small soft square.
  const corner = (dx: number, dy: number, sideA: boolean, sideB: boolean): void => {
    if (sideA || sideB || !occluder(world.get(x + dx, y + dy))) return;
    const cx = dx < 0 ? 0 : ts - 2;
    const cy = dy < 0 ? 0 : ts - 2;
    out.push({ x: cx, y: cy, w: 2, h: 2, alpha: AO_STEPS[1] });
    out.push({ x: dx < 0 ? cx : cx + 1, y: dy < 0 ? cy : cy + 1, w: 1, h: 1, alpha: AO_STEPS[1] });
  };
  corner(-1, -1, up, lf);
  corner(1, -1, up, rt);
  corner(-1, 1, dn, lf);
  corner(1, 1, dn, rt);
  return out;
}
