import { describe, expect, it } from 'vitest';
import { LAVA_BLOCK, SHIMMER_ROW, SHIMMER_ROWS, lavaDepthShade, lavaShade, shimmerRuns, shimmerShift } from '../src/render/lavafx';

function sample(time: number, surface: boolean): number[] {
  const out: number[] = [];
  for (let y = 0; y < 64; y += LAVA_BLOCK) for (let x = 0; x < 160; x += LAVA_BLOCK) out.push(lavaShade(x, y, time, surface));
  return out;
}

describe('lava crust', () => {
  it('shows crust, melt, veins and white-hot cracks across a pool', () => {
    const s = sample(3, false);
    for (const v of [0, 1, 2, 3]) expect(s).toContain(v);
    // Mostly melt and veins, crust a minority, cracks thin.
    const frac = (v: number) => s.filter((x) => x === v).length / s.length;
    expect(frac(3)).toBeLessThan(0.2);
    expect(frac(0)).toBeLessThan(0.35);
  });

  it('is continuous across tile edges (world art px, not per cell)', () => {
    // Neighbouring blocks across a tile seam agree as often as neighbours inside a tile.
    let seam = 0;
    let inner = 0;
    let n = 0;
    for (let y = 0; y < 160; y += 2) {
      for (let t = 0; t < 20; t++) {
        const a = lavaShade(t * 16 + 14, y, 1, false);
        const b = lavaShade(t * 16 + 16, y, 1, false);
        const c = lavaShade(t * 16 + 6, y, 1, false);
        const d = lavaShade(t * 16 + 8, y, 1, false);
        if (a === b) seam++;
        if (c === d) inner++;
        n++;
      }
    }
    expect(Math.abs(seam - inner) / n).toBeLessThan(0.15);
  });

  it('flows slowly: a short step keeps most blocks, a long one changes many', () => {
    const a = sample(5, false);
    const b = sample(5.05, false);
    const c = sample(9, false);
    const same = (p: number[], q: number[]) => p.filter((v, i) => v === q[i]).length / p.length;
    expect(same(a, b)).toBeGreaterThan(0.85);
    expect(same(a, c)).toBeLessThan(0.7);
  });

  it('surface lava has more cooled crust than deep lava', () => {
    const crust = (s: number[]) => s.filter((v) => v === 0).length;
    expect(crust(sample(2, true))).toBeGreaterThan(crust(sample(2, false)));
  });

  it('deeper lava is darker, capped', () => {
    expect(lavaDepthShade(0)).toBe(0);
    expect(lavaDepthShade(1)).toBeGreaterThan(0);
    expect(lavaDepthShade(2)).toBeGreaterThan(lavaDepthShade(1));
    expect(lavaDepthShade(10)).toBeLessThanOrEqual(0.36);
  });
});

describe('heat shimmer', () => {
  const rows = SHIMMER_ROWS / SHIMMER_ROW;
  it('wobbles by at most one art px and stops above the shimmer band', () => {
    const seen = new Set<number>();
    for (let t = 0; t < 10; t += 0.07) {
      for (let r = 0; r < rows; r++) seen.add(shimmerShift(t, r, 3));
      expect(shimmerShift(t, rows, 3)).toBe(0);
      expect(shimmerShift(t, -1, 3)).toBe(0);
    }
    expect([...seen].sort()).toEqual([-1, 0, 1]);
  });

  it('is stronger near the lava than at the top of the band', () => {
    let low = 0;
    let high = 0;
    for (let t = 0; t < 20; t += 0.05) {
      if (shimmerShift(t, 0, 0) !== 0) low++;
      if (shimmerShift(t, rows - 1, 0) !== 0) high++;
    }
    expect(low).toBeGreaterThan(high);
  });

  it('merges surface cells into horizontal runs per row', () => {
    const runs = shimmerRuns([{ tx: 5, ty: 3 }, { tx: 3, ty: 3 }, { tx: 4, ty: 3 }, { tx: 9, ty: 3 }, { tx: 4, ty: 7 }]);
    expect(runs).toEqual([{ tx: 3, ty: 3, n: 3 }, { tx: 9, ty: 3, n: 1 }, { tx: 4, ty: 7, n: 1 }]);
  });
});
