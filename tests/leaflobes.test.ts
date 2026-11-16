import { describe, expect, it } from 'vitest';
import { FOLIAGE, LEAF_VARIANTS, leafLobes, leafPixels } from '../src/render/decor';
import { B, BIOME_IDS } from '../src/sim/biomes';
import { TS } from '../src/render/sprites';

describe('leaf lobes', () => {
  it('every lobe sits fully inside its tile so canopy tiles never seam', () => {
    for (const b of BIOME_IDS)
      for (let v = 0; v < LEAF_VARIANTS; v++)
        for (const [cx, cy, r] of leafLobes(b, v)) {
          expect(cx - r).toBeGreaterThanOrEqual(0);
          expect(cy - r).toBeGreaterThanOrEqual(0);
          expect(cx + r).toBeLessThan(TS);
          expect(cy + r).toBeLessThan(TS);
        }
  });

  it('interior tiles are mostly base and lobe tones, not speckle', () => {
    for (const b of BIOME_IDS) {
      const px = leafPixels(b, 0, 0);
      const f = FOLIAGE[b];
      const base = px.filter((c) => c === f.base).length;
      expect(base / px.length).toBeGreaterThan(0.25);
      // No outline inside a canopy (mask 0 = no exposed side).
      expect(px.filter((c) => c === '#14181f').length).toBe(0);
    }
  });

  it('frost snow is white on top, the interior keeps green lobes', () => {
    const top = leafPixels(B.FROST, 1, 1);
    const inner = leafPixels(B.FROST, 1, 0);
    const white = (px: (string | null)[], y0: number, y1: number): number => px.slice(y0 * TS, y1 * TS).filter((c) => c === '#f4fbff').length;
    expect(white(top, 0, 4)).toBeGreaterThan(8);
    expect(white(inner, 0, TS)).toBe(0);
    expect(inner.filter((c) => c === FOLIAGE[B.FROST].lobe).length).toBeGreaterThan(4);
  });
});
