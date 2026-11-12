import { describe, expect, it } from 'vitest';
import { computeLight, type LightWorld } from '../src/render/lightmap';
import { RIM_MAX, RIM_MIN, computeRims, rimAlpha } from '../src/render/rimlight';
import { T } from '../src/sim/tiles';

/** '#' rock, '.' air, '~' water; surface row given (rows above it are sky where open). */
const grid = (rows: string[], surfaceRow = 0): LightWorld => ({
  w: rows[0].length,
  h: rows.length,
  surface: new Array(rows[0].length).fill(surfaceRow),
  get: (x, y) => {
    if (y < 0) return T.AIR;
    if (x < 0 || x >= rows[0].length || y >= rows.length) return T.BEDROCK;
    const c = rows[y][x];
    return c === '#' ? T.METAL : c === '~' ? T.WATER : T.AIR;
  },
});

// A cave: rock all round, an open pocket in the middle, the lamp at its centre.
const cave = [
  '###########',
  '###########',
  '##.......##',
  '##.......##',
  '##.......##',
  '###########',
  '###########',
];

describe('cave rim light', () => {
  it('faces turned toward the lamp are brighter than faces turned away, capped by RIM_MAX', () => {
    expect(rimAlpha(1, 1, 1)).toBeGreaterThan(rimAlpha(1, -1, 1));
    expect(rimAlpha(1, 1, 0)).toBeLessThanOrEqual(RIM_MAX);
    expect(rimAlpha(0, 1, 0)).toBe(0);
    // Top faces keep a little light even when side-on (light from above).
    expect(rimAlpha(1, 0, 0)).toBeGreaterThan(rimAlpha(1, 0, 1));
  });

  it('lit cave walls get rims on the faces bordering the pocket, nothing inside solid rock', () => {
    const w = grid(cave, 0);
    const g = computeLight(w, 0, 0, 11, 7, [{ x: 5, y: 3, level: 40 }], 0);
    const rims = computeRims(w, g, 0, 0, 11, 7, 5.5, 3.5);
    expect(rims.length).toBeGreaterThan(10);
    for (const r of rims) {
      expect(r.alpha).toBeGreaterThanOrEqual(RIM_MIN);
      expect(r.alpha).toBeLessThanOrEqual(RIM_MAX);
      // The face must look into the pocket.
      const nx = r.x + [0, 1, 0, -1][r.side];
      const ny = r.y + [-1, 0, 1, 0][r.side];
      expect(cave[ny][nx]).toBe('.');
    }
    // The floor under the lamp (top face of row 5) is one of the brightest rims.
    const floor = rims.find((r) => r.x === 5 && r.y === 5 && r.side === 0);
    const far = rims.find((r) => r.x === 2 && r.y === 1 && r.side === 2);
    expect(floor).toBeDefined();
    expect(floor && far ? floor.alpha > far.alpha : false).toBe(true);
  });

  it('a dark cave gives no rims (no light, no highlight)', () => {
    const w = grid(cave, 0);
    const g = computeLight(w, 0, 0, 11, 7, [], 0);
    expect(computeRims(w, g, 0, 0, 11, 7, 5.5, 3.5)).toEqual([]);
  });

  it('open sky and water never get rims (surface stays clean, liquids have their own crest)', () => {
    const rows = ['.....', '.....', '#~~~#', '#####'];
    const w = grid(rows, 2); // rows 0-1 are sky
    const g = computeLight(w, 0, 0, 5, 4, [{ x: 2, y: 1, level: 40 }], 48);
    expect(computeRims(w, g, 0, 0, 5, 4, 2.5, 1.5)).toEqual([]);
  });
});

describe('cave rim joins', () => {
  it('a flat cave floor is one continuous edge: inner faces join both neighbours, the ends do not', () => {
    const w = grid(cave, 0);
    const g = computeLight(w, 0, 0, 11, 7, [{ x: 5, y: 3, level: 40 }], 0);
    const floor = computeRims(w, g, 0, 0, 11, 7, 5.5, 3.5).filter((r) => r.y === 5 && r.side === 0).sort((a, b) => a.x - b.x);
    expect(floor.map((r) => r.x)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(floor[0].joinA).toBe(false);
    expect(floor[floor.length - 1].joinB).toBe(false);
    for (const r of floor.slice(1, -1)) expect(r.joinA && r.joinB).toBe(true);
  });
});
