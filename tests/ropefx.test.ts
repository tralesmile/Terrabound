import { describe, expect, it } from 'vitest';
import { ROPE_SEGMENTS, TWANG_TIME, ropePoints, ropeSag, twangAmp } from '../src/render/ropefx';

describe('grappling rope shape', () => {
  it('a taut rope is straight', () => {
    const pts = ropePoints(0, 0, 4, -3, 5, 1);
    expect(pts).toHaveLength(ROPE_SEGMENTS + 1);
    for (const p of pts) expect(p.x * -3 - p.y * 4).toBeCloseTo(0, 6); // on the line
  });

  it('ends stay pinned to the hand and the anchor', () => {
    const pts = ropePoints(1, 2, 5, -4, 12, 0.05);
    expect(pts[0].x).toBeCloseTo(1);
    expect(pts[0].y).toBeCloseTo(2);
    expect(pts[ROPE_SEGMENTS].x).toBeCloseTo(5);
    expect(pts[ROPE_SEGMENTS].y).toBeCloseTo(-4);
  });

  it('slack sags downward, more slack sags more, capped', () => {
    expect(ropeSag(5, 5)).toBe(0);
    expect(ropeSag(5, 4)).toBe(0);
    const a = ropeSag(5, 6);
    const b = ropeSag(5, 8);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(ropeSag(5, 500)).toBeLessThanOrEqual(1.6);
    const mid = ropePoints(0, 0, 6, 0, 9, 1)[ROPE_SEGMENTS / 2];
    expect(mid.y).toBeGreaterThan(0.3); // screen +y is down
  });

  it('the attach twang rings out', () => {
    expect(Math.abs(twangAmp(0))).toBeGreaterThan(0.2);
    expect(Math.abs(twangAmp(TWANG_TIME * 0.9))).toBeLessThan(0.02);
    expect(twangAmp(TWANG_TIME)).toBe(0);
    expect(twangAmp(-1)).toBe(0);
  });

  it('a zero-length rope does not produce NaN', () => {
    for (const p of ropePoints(2, 2, 2, 2, 3, 0)) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});
