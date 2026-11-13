import { describe, expect, it } from 'vitest';
import { noiseGrid, valueNoise } from '../src/sim/rng';

describe('noiseGrid', () => {
  it('matches valueNoise exactly on the integer grid, for every scale worldgen uses', () => {
    for (const [sx, sy, seed] of [[5, 5, 11], [9, 9, 1], [4, 14, 5], [20, 12, 19], [2.5, 2.5, 9], [3, 3, 4], [4, 4, 23]]) {
      const g = noiseGrid(seed, sx, sy, 300, 200);
      for (let y = 0; y < 200; y += 3) for (let x = 0; x < 300; x += 7) expect(g(x, y)).toBe(valueNoise(x / sx, y / sy, seed));
      expect(g(299, 199)).toBe(valueNoise(299 / sx, 199 / sy, seed));
    }
  });
});
