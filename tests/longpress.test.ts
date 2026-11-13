import { describe, expect, it } from 'vitest';
import { LONG_PRESS_MS, LONG_PRESS_SLOP, longPressProgress } from '../src/platform/longpress';

describe('touch long-press on a build-bar slot', () => {
  it('fills over LONG_PRESS_MS and clamps at 1', () => {
    expect(longPressProgress(0, 0, 0)).toBe(0);
    expect(longPressProgress(LONG_PRESS_MS / 2, 0, 0)).toBeCloseTo(0.5);
    expect(longPressProgress(LONG_PRESS_MS, 0, 0)).toBe(1);
    expect(longPressProgress(LONG_PRESS_MS * 3, 2, 2)).toBe(1);
    expect(longPressProgress(-5, 0, 0)).toBe(0);
  });

  it('a finger that slides past the slop cancels it', () => {
    expect(longPressProgress(LONG_PRESS_MS, LONG_PRESS_SLOP + 1, 0)).toBe(-1);
    expect(longPressProgress(LONG_PRESS_MS, 8, 8)).toBe(1);
    expect(longPressProgress(100, 0, -30)).toBe(-1);
  });

  it('is short enough to feel responsive but longer than a tap', () => {
    expect(LONG_PRESS_MS).toBeGreaterThanOrEqual(350);
    expect(LONG_PRESS_MS).toBeLessThanOrEqual(600);
  });
});
