import { describe, expect, it } from 'vitest';
import { BOSSES, makeBoss } from '../src/sim/bosses';
import { arenaColor, arenaFloor, arenaPulse, pulsePeriod, PULSE_SPEED } from '../src/render/arenafx';

describe('Hollow AI arena floor', () => {
  it('finds the top solid tile under air per column, skipping walls with no floor in reach', () => {
    // Floor at y=10 everywhere, a step up to y=8 at x=3, and a solid pillar at x=5 from the start row.
    const solid = (x: number, y: number) => (x === 5 ? true : x === 3 ? y >= 8 : y >= 10);
    const f = arenaFloor(solid, 0, 6, 2, 14);
    expect(f.find((c) => c.x === 0)).toEqual({ x: 0, y: 10 });
    expect(f.find((c) => c.x === 3)).toEqual({ x: 3, y: 8 });
    expect(f.some((c) => c.x === 5)).toBe(false);
    expect(arenaFloor(solid, 0, 2, 2, 4)).toEqual([]);
  });

  it('pulse crest rolls outward at PULSE_SPEED and fades with distance', () => {
    const t = 0.5;
    const r = t * PULSE_SPEED;
    expect(arenaPulse(r, t, 1)).toBeGreaterThan(0.6);
    expect(arenaPulse(r + 4, t, 1)).toBeLessThan(arenaPulse(r, t, 1));
    expect(arenaPulse(-r, t, 1)).toBeCloseTo(arenaPulse(r, t, 1));
    expect(arenaPulse(40, t, 1)).toBe(0);
    for (let x = 0; x < 30; x += 0.5) for (const ph of [1, 2] as const) {
      const k = arenaPulse(x, 1.234, ph);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
    }
  });

  it('phase 2 pulses faster and turns red', () => {
    expect(pulsePeriod(2)).toBeLessThan(pulsePeriod(1));
    const b = makeBoss('hollow_ai', 10, 10);
    expect(arenaColor(b)).toBe(BOSSES.hollow_ai.accent);
    b.hp = BOSSES.hollow_ai.hp * 0.4;
    expect(arenaColor(b)).toBe('#ff3a4a');
  });
});
