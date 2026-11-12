/**
 * Colour-blind assist: every ore and natural hazard gets a distinct shape mark so the player
 * never has to tell iron from copper (or acid from water) by hue alone. Marks are 5x5 pixel
 * grids in art px, drawn centred on the tile with a dark outline (settings: ORE MARKS).
 */
import { T } from '../sim/tiles';

/** Rows of a 5x5 glyph; '#' is lit. */
export type Glyph = readonly [string, string, string, string, string];

export const GLYPHS: Readonly<Record<number, { glyph: Glyph; color: string }>> = {
  // Ores: plain geometric shapes, each one unique.
  [T.IRON]: { glyph: ['.....', '#####', '.....', '#####', '.....'], color: '#e8ecf4' }, // =
  [T.COPPER]: { glyph: ['.....', '.#.#.', '.....', '.#.#.', '.....'], color: '#ffe0c0' }, // ::
  [T.CIRCUIT_ORE]: { glyph: ['..#..', '..#..', '#####', '..#..', '..#..'], color: '#d8ffe8' }, // +
  [T.PLASMA_ORE]: { glyph: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], color: '#ffe0ff' }, // x
  [T.CORE_ORE]: { glyph: ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'], color: '#ffd0ff' }, // diamond
  // Hazards: warning shapes.
  [T.ACID_POOL]: { glyph: ['..#..', '..#..', '..#..', '.....', '..#..'], color: '#f4ffb0' }, // !
  [T.MAGMA]: { glyph: ['..#..', '.#.#.', '#...#', '#...#', '#####'], color: '#fff0c0' }, // triangle
};

/** Lit pixels of a glyph as [x, y] pairs. */
export function glyphPixels(g: Glyph): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  g.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') out.push([x, y]);
  });
  return out;
}

export function hasGlyph(tile: number): boolean {
  return GLYPHS[tile] !== undefined;
}

/** Draw a tile's mark centred in a tile of ts px (u = ts / 16 px per art px). */
export function drawGlyph(ctx: CanvasRenderingContext2D, tile: number, dx: number, dy: number, ts: number): void {
  const g = GLYPHS[tile];
  if (!g) return;
  const u = ts / 16;
  const px = glyphPixels(g.glyph);
  // Whole art px only: tiles are drawn at 1 px per art px into cached chunks, so half-pixel
  // offsets would blur the mark into a grey smudge.
  const ox = dx + 5 * u;
  const oy = dy + 5 * u;
  ctx.fillStyle = 'rgba(8,8,14,0.9)';
  for (const [x, y] of px) ctx.fillRect(ox + (x - 1) * u, oy + (y - 1) * u, 3 * u, 3 * u);
  ctx.fillStyle = g.color;
  for (const [x, y] of px) ctx.fillRect(ox + x * u, oy + y * u, u, u);
}
