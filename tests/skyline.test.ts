import { describe, expect, it } from 'vitest';
import { SKYLINE_LAYERS, towerShape } from '../src/render/decor';

describe('skyline towers', () => {
  it('are deterministic', () => {
    expect(towerShape(17, 0)).toEqual(towerShape(17, 0));
    expect(towerShape(17, 1)).toEqual(towerShape(17, 1));
  });

  it('stay inside their footprint and height budget', () => {
    for (let layer = 0; layer < SKYLINE_LAYERS.length; layer++) {
      const L = SKYLINE_LAYERS[layer];
      for (let i = -200; i < 200; i++) {
        const s = towerShape(i, layer);
        expect(s.w).toBeGreaterThanOrEqual(L.minW);
        expect(s.w).toBeLessThanOrEqual(L.minW + L.varW);
        expect(s.top).toBeLessThanOrEqual(L.minH + L.varH + 3);
        for (const r of s.rects) {
          expect(r.w).toBeGreaterThan(0);
          expect(r.h).toBeGreaterThan(0);
          expect(r.x).toBeGreaterThanOrEqual(-0.31);
          expect(r.x + r.w).toBeLessThanOrEqual(s.w + 0.31);
          expect(r.y + r.h).toBeLessThanOrEqual(s.top + 1e-9);
        }
        for (const wn of s.windows) {
          expect(wn.x).toBeGreaterThan(0);
          expect(wn.x).toBeLessThan(s.w);
          expect(wn.y).toBeLessThan(s.rects[0].h);
        }
      }
    }
  });

  it('vary: setbacks, crowns and lit windows all appear', () => {
    let antennas = 0;
    let stubs = 0;
    let windows = 0;
    for (let i = 0; i < 100; i++) {
      const s = towerShape(i, 0);
      if (s.rects.length === 4) antennas++;
      if (s.rects.length === 3) stubs++;
      windows += s.windows.length;
    }
    expect(antennas).toBeGreaterThan(10);
    expect(stubs).toBeGreaterThan(10);
    expect(windows).toBeGreaterThan(50);
  });

  it('far layer is shorter than the near layer on average', () => {
    let near = 0;
    let far = 0;
    for (let i = 0; i < 200; i++) {
      near += towerShape(i, 0).top;
      far += towerShape(i, 1).top;
    }
    expect(far).toBeLessThan(near * 0.75);
  });
});
