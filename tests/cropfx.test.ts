import { describe, expect, it } from 'vitest';
import { CROP_ART, cropSway, ripeSparkle, sprinklerDrops, swayRects } from '../src/render/crops';

describe('crop and sprinkler fx (render, pure)', () => {
  it('sway is bounded, grows with stage and differs between neighbours', () => {
    let max0 = 0;
    let max2 = 0;
    for (let t = 0; t < 20; t += 0.05) {
      max0 = Math.max(max0, Math.abs(cropSway(t, 3, 0)));
      max2 = Math.max(max2, Math.abs(cropSway(t, 3, 2)));
    }
    expect(max2).toBeGreaterThan(max0);
    expect(max2).toBeLessThanOrEqual(1.4 * 1.3 + 1e-9);
    expect(cropSway(1, 3, 2)).not.toBeCloseTo(cropSway(1, 4, 2), 3);
  });

  it('swayRects keeps feet planted and moves the top', () => {
    const rects = CROP_ART.glowcorn[2];
    const moved = swayRects(rects, 2);
    rects.forEach((r, i) => {
      expect(moved[i][1]).toBe(r[1]);
      expect(moved[i][2]).toBe(r[2]);
      expect(Math.abs(moved[i][0] - r[0])).toBeLessThanOrEqual(2);
    });
    // The tassel (row 0) shifts; a rect near the ground (row 12+) barely moves.
    const top = rects.findIndex((r) => r[1] === 0);
    expect(moved[top][0]).not.toBe(rects[top][0]);
    expect(swayRects([[4, 14, 2, 2, '#fff']], 1.4)[0][0]).toBe(4);
  });

  it('ripe sparkle blinks briefly and stays inside the tile', () => {
    let on = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const s = ripeSparkle(i * 0.05, 7);
      if (!s) continue;
      on++;
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThan(16);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThan(16);
    }
    expect(on).toBeGreaterThan(0);
    expect(on / n).toBeLessThan(0.2);
  });

  it('sprinkler drops fan out on both sides and fade as they travel', () => {
    const d = sprinklerDrops(1.3, 5);
    expect(d.length).toBe(6);
    expect(d.some((p) => p.x < 8)).toBe(true);
    expect(d.some((p) => p.x > 8)).toBe(true);
    for (const p of d) {
      expect(p.a).toBeGreaterThanOrEqual(0);
      expect(p.a).toBeLessThanOrEqual(0.75);
      expect(Math.abs(p.x - 8)).toBeLessThanOrEqual(30);
    }
  });
});
