import { describe, expect, it } from 'vitest';
import { copperVein, ironSeam } from '../src/sim/world';
import { valueNoise } from '../src/sim/rng';

/** Connected components (4-neighbour) of a predicate on a grid; returns each one's cells. */
function blobs(f: (x: number, y: number) => boolean, W: number, H: number): [number, number][][] {
  const seen = new Set<number>();
  const out: [number, number][][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (seen.has(y * W + x) || !f(x, y)) continue;
      const cells: [number, number][] = [];
      const st: [number, number][] = [[x, y]];
      seen.add(y * W + x);
      while (st.length) {
        const [cx, cy] = st.pop()!;
        cells.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(ny * W + nx) || !f(nx, ny)) continue;
          seen.add(ny * W + nx);
          st.push([nx, ny]);
        }
      }
      out.push(cells);
    }
  }
  return out;
}

/** Ratio of the longer to the shorter principal axis of a cell cloud. */
function elongation(cells: [number, number][]): number {
  const n = cells.length;
  const mx = cells.reduce((a, c) => a + c[0], 0) / n;
  const my = cells.reduce((a, c) => a + c[1], 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of cells) {
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
    sxy += (x - mx) * (y - my);
  }
  const tr = (sxx + syy) / n;
  const det = (sxx * syy - sxy * sxy) / (n * n);
  const d = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + d;
  const l2 = Math.max(1e-6, tr / 2 - d);
  return Math.sqrt(l1 / l2);
}

describe('shaped ore veins', () => {
  const W = 300;
  const H = 200;
  it('iron forms elongated seams, not round blobs', () => {
    const big = blobs((x, y) => ironSeam(x + 500, y + 60, 7), W, H).filter((b) => b.length >= 8);
    expect(big.length).toBeGreaterThan(40);
    const mean = big.reduce((a, b) => a + elongation(b), 0) / big.length;
    expect(mean).toBeGreaterThan(2.2);
  });
  it('copper runs in thin veins, much thinner than the old round blobs', () => {
    const thickness = (f: (x: number, y: number) => boolean): { cells: number; frac: number } => {
      let cells = 0;
      let thick = 0;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (!f(x, y)) continue;
          cells++;
          if ([f(x + 1, y), f(x - 1, y), f(x, y + 1), f(x, y - 1)].filter(Boolean).length >= 3) thick++;
        }
      }
      return { cells, frac: thick / Math.max(1, cells) };
    };
    const vein = thickness((x, y) => copperVein(x, y, 7));
    expect(vein.cells).toBeGreaterThan(500);
    expect(vein.frac).toBeLessThan(0.3);
    // Veins are long and winding: components are far more elongated than the old round blobs.
    const elong = (f: (x: number, y: number) => boolean): number => {
      const bs = blobs(f, W, H).filter((q) => q.length >= 6);
      return bs.reduce((s2, q) => s2 + elongation(q), 0) / Math.max(1, bs.length);
    };
    const veinE = elong((x, y) => copperVein(x, y, 7));
    const blobE = elong((x, y) => valueNoise(x / 2.5, y / 2.5, 10) > 0.82);
    expect(veinE).toBeGreaterThan(blobE * 1.5);
  });
  it('is deterministic per seed and differs between seeds', () => {
    const grid = (s: number): string => Array.from({ length: 2000 }, (_, i) => (ironSeam(i % 100, Math.floor(i / 100), s) ? 1 : 0)).join('');
    expect(grid(3)).toBe(grid(3));
    expect(grid(3)).not.toBe(grid(4));
  });
});
