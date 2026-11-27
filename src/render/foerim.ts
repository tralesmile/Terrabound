/**
 * Creature rim light: in a dim cave a body fades into the rock, so the edge of its silhouette that
 * faces your lamp (and its top) gets a thin highlight over the darkness. Same idea as the cave rims
 * in rimlight.ts. Pure helpers first; the one draw call is at the bottom.
 */

/** Cave brightness at or above this needs no rim; it reaches full strength `RIM_RAMP` below. */
export const FOE_RIM_LIT = 0.6;
const RIM_RAMP = 0.3;
/** The lamp reaches this far at full strength, then fades to nothing at `FOE_RIM_FAR` (tiles). */
export const FOE_RIM_NEAR = 6;
export const FOE_RIM_FAR = 13;
export const FOE_RIM_MAX = 0.75;
/** Passive critters read a little softer than things that can hurt you. */
const PASSIVE_SCALE = 0.55;

/** Rim alpha from the cave light on the creature (0..1) and its distance to your lamp. Pure. */
export function foeRimAlpha(light: number, dist: number, passive: boolean): number {
  const dark = Math.max(0, Math.min(1, (FOE_RIM_LIT - light) / RIM_RAMP));
  const near = Math.max(0, Math.min(1, (FOE_RIM_FAR - dist) / (FOE_RIM_FAR - FOE_RIM_NEAR)));
  return FOE_RIM_MAX * dark * near * (passive ? PASSIVE_SCALE : 1);
}

export interface EdgePixel {
  /** Column and row in the sprite grid, as drawn on screen (already mirrored). */
  x: number;
  y: number;
  /** Top edges are the bright ones; side edges are softer. */
  top: boolean;
}

const cache = new WeakMap<readonly string[], Map<number, EdgePixel[]>>();

/**
 * Silhouette pixels facing the lamp: those with empty space above, or on the side the lamp is on.
 * `flip` mirrors the sprite, `side` is -1 (lamp to the left) or 1 (to the right). Eyes are skipped
 * (they already glow). Cached per frame.
 */
export function edgePixels(rows: readonly string[], width: number, flip: boolean, side: -1 | 1): EdgePixel[] {
  let per = cache.get(rows);
  if (!per) cache.set(rows, (per = new Map()));
  const key = (flip ? 2 : 0) + (side > 0 ? 1 : 0);
  const hit = per.get(key);
  if (hit) return hit;
  const solid = (r: number, c: number): boolean => {
    const src = flip ? width - 1 - c : c;
    const ch = rows[r]?.[src];
    return ch !== undefined && ch !== '.' && ch !== ' ';
  };
  const out: EdgePixel[] = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < width; c++) {
      if (!solid(r, c)) continue;
      if (rows[r][flip ? width - 1 - c : c] === 'e') continue;
      const top = !solid(r - 1, c);
      if (top || !solid(r, c + side)) out.push({ x: c, y: r, top });
    }
  }
  per.set(key, out);
  return out;
}

/**
 * Draw the rim for a sprite whose bottom-centre is at (fx, fy) with art pixel size `sz`.
 * `hang` draws it upside down from `fy` (a creature on the ceiling). Returns the pixels drawn.
 */
export function drawFoeRim(
  ctx: CanvasRenderingContext2D,
  pixels: readonly EdgePixel[],
  fx: number,
  fy: number,
  sz: number,
  width: number,
  height: number,
  color: readonly [number, number, number],
  alpha: number,
  hang = false,
): number {
  const x0 = fx - (width / 2) * sz;
  const px = Math.ceil(sz);
  ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  for (const p of pixels) {
    ctx.globalAlpha = p.top ? alpha : alpha * 0.7;
    const y = hang ? fy + (height - 1 - p.y) * sz : fy - (height - p.y) * sz;
    ctx.fillRect(Math.round(x0 + p.x * sz), Math.round(y), px, px);
  }
  ctx.globalAlpha = 1;
  return pixels.length;
}
