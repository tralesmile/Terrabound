import { describe, expect, it } from 'vitest';
import { deskHints, HINT_TIME, hintAlpha, layoutHints } from '../src/ui/hintbar';

const hints = deskHints({ left: 'A', right: 'D', jump: 'W', inventory: 'I', interact: 'E' });
const measure = (s: string): number => s.length * 7;

describe('hint bar', () => {
  it('shows fully, then fades out at the end of the first stretch of play', () => {
    expect(hintAlpha(0)).toBe(1);
    expect(hintAlpha(HINT_TIME - 2)).toBeCloseTo(0.5);
    expect(hintAlpha(HINT_TIME + 5)).toBe(0);
  });

  it('centres every hint on a wide screen without overlap', () => {
    const L = layoutHints(hints, measure, 640, 1260, 16);
    expect(L.chips).toHaveLength(hints.length);
    expect(L.x + L.w / 2).toBeCloseTo(640);
    for (let i = 1; i < L.chips.length; i++) {
      const a = L.chips[i - 1];
      expect(L.chips[i].x).toBeGreaterThan(a.x + a.keyW + measure(a.label));
    }
  });

  it('drops the least important hints from the end when narrow, and survives no room at all', () => {
    const L = layoutHints(hints, measure, 200, 380, 16);
    expect(L.chips.length).toBeGreaterThan(1);
    expect(L.chips.length).toBeLessThan(hints.length);
    expect(L.w).toBeLessThanOrEqual(380);
    expect(L.chips[0].label).toBe('move');
    expect(layoutHints(hints, measure, 0, 10, 16)).toEqual({ x: 0, w: 0, chips: [] });
  });
});
