import { describe, expect, it } from 'vitest';
import { buriedDecal, decalRects, hasStrata, STRATA_DEPTH, strataShade, strataWobble } from '../src/render/strata';
import { T } from '../src/sim/tiles';

describe('soil strata (render, pure)', () => {
  it('only natural ground gets bands', () => {
    expect(hasStrata(T.RUST)).toBe(true);
    expect(hasStrata(T.SOIL)).toBe(true);
    expect(hasStrata(T.METAL)).toBe(true);
    expect(hasStrata(T.CRYSTAL)).toBe(false);
    expect(hasStrata(T.PAD)).toBe(false);
  });

  it('is blank at the surface and below the strata zone', () => {
    expect(strataShade(0, 5)).toEqual({ dark: 0, seam: 0 });
    expect(strataShade(STRATA_DEPTH + 1, 5)).toEqual({ dark: 0, seam: 0 });
  });

  it('gets darker with depth and alternates bands', () => {
    const col = 40;
    const darks = Array.from({ length: 24 }, (_, i) => strataShade(i + 1, col).dark);
    expect(Math.max(...darks.slice(12))).toBeGreaterThan(Math.max(...darks.slice(0, 3)));
    // Alternation: some neighbouring rows jump by about a band step.
    const jumps = darks.slice(1).filter((d, i) => Math.abs(d - darks[i]) > 0.08).length;
    expect(jumps).toBeGreaterThanOrEqual(2);
    // Every value is a sane alpha.
    for (const d of darks) expect(d).toBeGreaterThanOrEqual(0), expect(d).toBeLessThan(0.45);
  });

  it('has seams and a wobble so bands are not ruler flat', () => {
    let seams = 0;
    for (let d = 1; d <= STRATA_DEPTH; d++) if (strataShade(d, 11).seam > 0) seams++;
    expect(seams).toBeGreaterThanOrEqual(4);
    const w = new Set(Array.from({ length: 80 }, (_, x) => strataWobble(x)));
    expect(w.size).toBeGreaterThanOrEqual(3);
    for (const v of w) expect(Math.abs(v)).toBeLessThanOrEqual(3);
  });

  it('buries rare decals only in the top rows, deterministically', () => {
    let n = 0;
    let total = 0;
    const kinds = new Set<string>();
    for (let x = 0; x < 200; x++) {
      for (let y = 0; y < 40; y++) {
        const d = buriedDecal(x, y + 100, y);
        if (y < 2 || y > 22) expect(d).toBeNull();
        else total++;
        if (d) {
          n++;
          kinds.add(d);
          expect(buriedDecal(x, y + 100, y)).toBe(d);
        }
      }
    }
    expect(n / total).toBeGreaterThan(0.01);
    expect(n / total).toBeLessThan(0.08);
    expect(kinds.size).toBe(4);
  });

  it('decal rects stay inside the tile, flipped or not', () => {
    for (const k of ['bone', 'pipe', 'pebbles', 'skull'] as const) {
      for (const flip of [false, true]) {
        for (const [x, y, w, h] of decalRects(k, flip)) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x + w).toBeLessThanOrEqual(16);
          expect(y + h).toBeLessThanOrEqual(16);
        }
      }
    }
  });
});
