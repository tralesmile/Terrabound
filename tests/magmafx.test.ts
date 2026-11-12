import { describe, it, expect } from 'vitest';
import { BUBBLE_PERIOD, magmaBubble, magmaEmber, magmaPulse } from '../src/render/fx';

describe('magma surface animation', () => {
  it('pulse stays in 0..1 and moves over time', () => {
    let lo = 1;
    let hi = 0;
    for (let t = 0; t < 4; t += 0.05) {
      const p = magmaPulse(10, 20, t);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      lo = Math.min(lo, p);
      hi = Math.max(hi, p);
    }
    expect(hi - lo).toBeGreaterThan(0.8);
  });

  it('bubbles appear on some cells, swell, then pop, within the cell', () => {
    let seen = 0;
    let pops = 0;
    for (let tx = 0; tx < 40; tx++) {
      let lastR = -1;
      for (let t = 0; t < BUBBLE_PERIOD * 3; t += 0.02) {
        const b = magmaBubble(tx, 7, t);
        if (!b) { lastR = -1; continue; }
        seen++;
        expect(b.x).toBeGreaterThanOrEqual(0.2);
        expect(b.x).toBeLessThanOrEqual(0.8);
        expect(b.r).toBeGreaterThanOrEqual(0);
        expect(b.r).toBeLessThanOrEqual(1);
        if (b.pop) pops++;
        else { expect(b.r).toBeGreaterThanOrEqual(lastR); lastR = b.r; }
      }
    }
    expect(seen).toBeGreaterThan(100);
    expect(pops).toBeGreaterThan(10);
  });

  it('is deterministic and not every cell bubbles at once', () => {
    expect(magmaBubble(3, 4, 1.234)).toEqual(magmaBubble(3, 4, 1.234));
    let active = 0;
    for (let tx = 0; tx < 100; tx++) if (magmaBubble(tx, 9, 5)) active++;
    expect(active).toBeGreaterThan(2);
    expect(active).toBeLessThan(50);
  });

  it('embers rise and fade', () => {
    let found = false;
    for (let tx = 0; tx < 50 && !found; tx++) {
      for (let t = 0; t < 7; t += 0.01) {
        const a = magmaEmber(tx, 3, t);
        const b = magmaEmber(tx, 3, t + 0.05);
        if (a && b && b.up > a.up) {
          expect(b.a).toBeLessThan(a.a);
          expect(a.up).toBeLessThanOrEqual(1.6);
          found = true;
          break;
        }
      }
    }
    expect(found).toBe(true);
  });
});
