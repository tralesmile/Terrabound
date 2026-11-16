import { describe, expect, it } from 'vitest';
import { bayArc, chargeMotes, dockCable } from '../src/render/bayfx';

describe('garage bay charge effects', () => {
  it('the arc starts and ends exactly at its endpoints and flickers between frames', () => {
    const a = bayArc(0, 0, 100, 0, 1, 8, 6);
    expect(a).toHaveLength(9);
    expect(a[0]).toEqual([0, 0]);
    expect(a[8][0]).toBeCloseTo(100);
    expect(a[8][1]).toBeCloseTo(0);
    const b = bayArc(0, 0, 100, 0, 1.2, 8, 6);
    expect(a.slice(1, -1).some((p, i) => Math.abs(p[1] - b[i + 1][1]) > 0.01)).toBe(true);
  });

  it('the arc stays within jitter + sag of the straight line', () => {
    // Horizontal 100 px: sag is at most 0.12 * 100 = 12 px, jitter at most amp = 6 px.
    for (const [, y] of bayArc(0, 0, 100, 0, 3.3, 10, 6)) expect(Math.abs(y)).toBeLessThanOrEqual(18 + 1e-9);
  });

  it('motes rise off the suit and fade in and out', () => {
    const m = chargeMotes(0.37, 4);
    expect(m).toHaveLength(4);
    for (const p of m) {
      expect(p.dy).toBeLessThan(-0.5);
      expect(p.a).toBeGreaterThanOrEqual(0);
      expect(p.a).toBeLessThanOrEqual(1);
    }
  });

  it('the dock cable hangs between its ends and its pulse runs 0-1', () => {
    const { pts, pulse } = dockCable(0, 0, 100, 0, 2.3, 8);
    expect(pts).toHaveLength(9);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[8][0]).toBeCloseTo(100);
    expect(pts[8][1]).toBeCloseTo(0);
    // Sag is 0.22 * span = 22 px at the middle, below (screen y grows down).
    expect(pts[4][1]).toBeCloseTo(22);
    expect(pulse).toBeGreaterThanOrEqual(0);
    expect(pulse).toBeLessThan(1);
  });
});
