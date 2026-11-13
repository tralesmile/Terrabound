import { describe, expect, it } from 'vitest';
import { PAD_PAL, padDeckRows, padLight, padRun } from '../src/render/padfx';

describe('landing pad deck art', () => {
  it('finds a tile position in its run', () => {
    const pads = new Set([3, 4, 5, 6, 7]);
    expect(padRun((dx) => pads.has(3 + dx))).toEqual({ i: 0, n: 5 });
    expect(padRun((dx) => pads.has(5 + dx))).toEqual({ i: 2, n: 5 });
    expect(padRun((dx) => pads.has(7 + dx))).toEqual({ i: 4, n: 5 });
    expect(padRun(() => false)).toEqual({ i: 0, n: 1 });
  });

  it('draws 16x16 rows with known palette keys and a bright lip', () => {
    for (let i = 0; i < 9; i++) {
      const rows = padDeckRows(i, 9);
      expect(rows).toHaveLength(16);
      for (const r of rows) {
        expect(r).toHaveLength(16);
        for (const ch of r) expect(PAD_PAL[ch]).toBeDefined();
      }
      expect(rows[0]).toBe('l'.repeat(16));
      expect(rows[1]).toBe('c'.repeat(16));
    }
  });

  it('puts hazard chevrons only on the end tiles, leaning opposite ways', () => {
    const count = (rows: string[], ch: string): number => rows.join('').split(ch).length - 1;
    const left = padDeckRows(0, 9);
    const right = padDeckRows(8, 9);
    expect(count(left, 'y')).toBeGreaterThan(20);
    expect(count(right, 'y')).toBeGreaterThan(20);
    expect(left[4]).toBe([...right[4]].reverse().join(''));
    for (let i = 1; i < 8; i++) expect(count(padDeckRows(i, 9), 'y')).toBe(0);
  });

  it('draws a landing ring across the centre three tiles only', () => {
    const ring = (i: number): number => padDeckRows(i, 9).join('').split('r').length - 1;
    expect(ring(3)).toBeGreaterThan(8);
    expect(ring(4)).toBeGreaterThan(8);
    expect(ring(5)).toBeGreaterThan(8);
    expect(ring(2)).toBe(0);
    expect(ring(6)).toBe(0);
  });

  it('chases runway lights from both ends toward the centre', () => {
    // At some time early in the cycle the ends are lit while the centre is dim; later the centre lights.
    let endsFirst = false;
    let centreLater = false;
    for (let t = 0; t < 1.6; t += 0.02) {
      const e = padLight(t, 0, 9);
      const c = padLight(t, 4, 9);
      if (e > 0.6 && c < 0.2) endsFirst = true;
      if (c > 0.6 && t > 0.5) centreLater = true;
      expect(padLight(t, 1, 9)).toBeCloseTo(padLight(t, 7, 9), 6);
      expect(e).toBeGreaterThanOrEqual(0.15);
      expect(e).toBeLessThanOrEqual(1);
    }
    expect(endsFirst).toBe(true);
    expect(centreLater).toBe(true);
  });
});
