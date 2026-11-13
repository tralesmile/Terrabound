import { describe, expect, it } from 'vitest';
import { BOLT_LIFE, TRAIL_N, TRAIL_STEP, boltTrail } from '../src/render/bosstele';

describe('boss bolt trails', () => {
  it('trail dots run back opposite the velocity, shrinking and fading to the tail', () => {
    const t = boltTrail({ x: 10, y: 5, vx: 11, vy: 0, life: BOLT_LIFE - 1 });
    expect(t.length).toBe(TRAIL_N);
    for (const [i, p] of t.entries()) {
      expect(p.x).toBeCloseTo(10 - (i + 1) * TRAIL_STEP);
      expect(p.y).toBeCloseTo(5);
      if (i > 0) {
        expect(p.r).toBeLessThan(t[i - 1].r);
        expect(p.a).toBeLessThan(t[i - 1].a);
      }
    }
  });

  it('a fresh bolt has no trail behind the muzzle yet; it grows in quickly', () => {
    expect(boltTrail({ x: 0, y: 0, vx: 0, vy: 11, life: BOLT_LIFE })).toEqual([]);
    const young = boltTrail({ x: 0, y: 0, vx: 0, vy: 11, life: BOLT_LIFE - 0.05 });
    expect(young.length).toBeGreaterThan(0);
    expect(young.length).toBeLessThan(TRAIL_N);
    for (const p of young) expect(p.y).toBeLessThan(0);
  });

  it('a stopped bolt draws no trail and alpha stays in range', () => {
    expect(boltTrail({ x: 0, y: 0, vx: 0, vy: 0, life: 1 })).toEqual([]);
    for (const p of boltTrail({ x: 0, y: 0, vx: -3, vy: 4, life: 1 })) {
      expect(p.a).toBeGreaterThan(0);
      expect(p.a).toBeLessThanOrEqual(1);
    }
  });
});
