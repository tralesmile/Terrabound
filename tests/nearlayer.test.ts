import { describe, it, expect } from 'vitest';
import { NEAR_LAYER, SKYLINE_LAYERS, nearPieces } from '../src/render/decor';
import { BIOME_IDS, B } from '../src/sim/biomes';

describe('near foliage parallax layer', () => {
  it('scrolls faster than every skyline layer but slower than the world', () => {
    for (const L of SKYLINE_LAYERS) expect(NEAR_LAYER.par).toBeGreaterThan(L.par);
    expect(NEAR_LAYER.par).toBeLessThan(1);
  });
  it('is deterministic and stays low', () => {
    for (const b of BIOME_IDS) {
      for (let i = -50; i < 200; i++) {
        const a = nearPieces(i, b);
        expect(nearPieces(i, b)).toEqual(a);
        for (const p of a) {
          expect(p.h).toBeGreaterThan(0);
          expect(p.h).toBeLessThanOrEqual(NEAR_LAYER.maxH);
          expect(p.w).toBeGreaterThan(0);
          expect(p.x).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
  it('leaves gaps so the layer reads as clumps', () => {
    let empty = 0;
    for (let i = 0; i < 200; i++) if (nearPieces(i, B.WASTES).length === 0) empty++;
    expect(empty).toBeGreaterThan(30);
    expect(empty).toBeLessThan(120);
  });
  it('each biome has its own silhouette vocabulary', () => {
    const kinds = (b: number): Set<string> => new Set(Array.from({ length: 200 }, (_, i) => nearPieces(i, b).map((p) => p.k)).flat());
    expect(kinds(B.CRYSTAL)).toEqual(new Set(['spike']));
    expect(kinds(B.WASTES).has('block')).toBe(true);
    expect(kinds(B.JUNGLE).has('hump')).toBe(true);
    expect(kinds(B.JUNGLE).has('block')).toBe(false);
  });
});
