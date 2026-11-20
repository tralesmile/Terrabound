import { describe, expect, it } from 'vitest';
import { DUCK, duckMul, duckTau } from '../src/platform/duck';

describe('anticipation music dip', () => {
  it('is off with no warning, falls fast, holds, then recovers fully', () => {
    expect(duckMul(-1)).toBe(1);
    expect(duckMul(Number.NaN)).toBe(1);
    expect(duckMul(0)).toBe(1);
    expect(duckMul(DUCK.fall)).toBeCloseTo(DUCK.floor);
    expect(duckMul(DUCK.fall + DUCK.hold / 2)).toBe(DUCK.floor);
    const mid = duckMul(DUCK.fall + DUCK.hold + DUCK.recover / 2);
    expect(mid).toBeGreaterThan(DUCK.floor);
    expect(mid).toBeLessThan(1);
    expect(duckMul(DUCK.fall + DUCK.hold + DUCK.recover + 0.01)).toBe(1);
  });

  it('the dip lasts about as long as the 0.4 s telegraph rule', () => {
    expect(DUCK.fall + DUCK.hold).toBeGreaterThanOrEqual(0.35);
    expect(DUCK.fall + DUCK.hold).toBeLessThanOrEqual(0.5);
  });

  it('never rises above normal and smooths fast only while dipping', () => {
    for (let t = 0; t < 2; t += 0.01) expect(duckMul(t)).toBeLessThanOrEqual(1);
    expect(duckTau(0.1)).toBeLessThan(0.1);
    expect(duckTau(5)).toBe(0.4);
    expect(duckTau(-1)).toBe(0.4);
  });
});
