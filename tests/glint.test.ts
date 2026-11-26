import { describe, expect, it } from 'vitest';
import { GLINT, glintColor, glintPhase, glintsAt, tracked } from '../src/render/glint';
import { T } from '../src/sim/tiles';

describe('ore glints', () => {
  it('only ore the light just reaches glints: never in the dark, never in plain light', () => {
    expect(glintsAt(T.COPPER, 0)).toBe(false);
    expect(glintsAt(T.COPPER, GLINT.minLevel)).toBe(true);
    expect(glintsAt(T.COPPER, GLINT.maxLevel + 1)).toBe(false);
    expect(glintsAt(T.RUST, 10)).toBe(false);
  });

  it('every glinting ore has a colour', () => {
    for (const t of [T.IRON, T.COPPER, T.CRYSTAL, T.CIRCUIT_ORE, T.PLASMA_ORE, T.CORE_ORE]) expect(glintColor(t)).toMatch(/^#/);
  });

  it('flashes briefly, and more often for the tracked material', () => {
    const lit = (isTracked: boolean): number => {
      let n = 0;
      for (let i = 0; i < 3000; i++) if (glintPhase(12, 40, i / 100, isTracked) > 0) n++;
      return n / 3000;
    };
    expect(lit(false)).toBeGreaterThan(0.08);
    expect(lit(false)).toBeLessThan(0.2);
    expect(lit(true)).toBeGreaterThan(lit(false) * 2);
    expect(Math.max(...Array.from({ length: 400 }, (_, i) => glintPhase(3, 3, i / 100, false)))).toBeLessThanOrEqual(1);
  });

  it('knows which tiles drop a wanted material', () => {
    expect(tracked(T.CRYSTAL, new Set(['crystal']))).toBe(true);
    expect(tracked(T.IRON, new Set(['crystal']))).toBe(false);
    expect(tracked(T.IRON, new Set())).toBe(false);
  });
});
