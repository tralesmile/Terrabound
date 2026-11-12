import { describe, expect, it } from 'vitest';
import { GLYPHS, glyphPixels, hasGlyph } from '../src/render/glyphs';
import { SOFT_FLASH_MAX, softFlash } from '../src/render/fx';
import { T, TILES } from '../src/sim/tiles';

describe('colour-blind ore and hazard marks', () => {
  it('every ore and every damaging liquid has a mark', () => {
    for (const t of [T.IRON, T.COPPER, T.CIRCUIT_ORE, T.PLASMA_ORE, T.CORE_ORE, T.ACID_POOL, T.MAGMA]) expect(hasGlyph(t)).toBe(true);
    expect(hasGlyph(T.WATER)).toBe(false);
    expect(hasGlyph(T.RUST)).toBe(false);
  });

  it('marks are 5x5, non-empty and all different shapes', () => {
    const seen = new Set<string>();
    for (const [id, g] of Object.entries(GLYPHS)) {
      expect(g.glyph.length).toBe(5);
      for (const row of g.glyph) expect(row).toMatch(/^[.#]{5}$/);
      expect(glyphPixels(g.glyph).length).toBeGreaterThanOrEqual(4);
      const key = g.glyph.join('/');
      expect(seen.has(key), `tile ${id} repeats a shape`).toBe(false);
      seen.add(key);
      expect(TILES[Number(id)]).toBeDefined();
    }
  });

  it('reduced flashes cap the full-screen flash', () => {
    expect(softFlash(0.6, false)).toBe(0.6);
    expect(softFlash(0.6, true)).toBeLessThanOrEqual(SOFT_FLASH_MAX);
    expect(softFlash(0.1, true)).toBeCloseTo(0.05);
  });
});
