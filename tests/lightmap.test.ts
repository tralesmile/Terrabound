import { describe, expect, it } from 'vitest';
import {
  AIR_COST,
  LEVEL_CAP,
  LIGHT_MAX,
  SKY_LEVEL,
  SOLID_COST,
  TORCH_LEVEL,
  brightness,
  computeLight,
  frameSources,
  isSky,
  levelAt,
  levelForRadius,
  type LightWorld,
} from '../src/render/lightmap';
import { T } from '../src/sim/tiles';
import { TORCH_RADIUS, SPAWN_LIGHT_MAX, generateWorld } from '../src/sim/world';

/** '#' rock, '.' air; surface row given (rows above it are sky where open). */
const grid = (rows: string[], surfaceRow = 0): LightWorld => ({
  w: rows[0].length,
  h: rows.length,
  surface: new Array(rows[0].length).fill(surfaceRow),
  get: (x, y) => (y < 0 ? T.AIR : x < 0 || x >= rows[0].length || y >= rows.length ? T.BEDROCK : rows[y][x] === '#' ? T.METAL : T.AIR),
});

const solidRows = (w: number, h: number) => Array.from({ length: h }, () => '#'.repeat(w));

describe('light map flood fill', () => {
  it('a torch in an open room falls off by AIR_COST per tile (Manhattan)', () => {
    const rows = Array.from({ length: 21 }, () => '.'.repeat(21));
    const g = computeLight(grid(rows, 99), 0, 0, 21, 21, [{ x: 10, y: 10, level: TORCH_LEVEL }], 0);
    expect(levelAt(g, 10, 10)).toBe(TORCH_LEVEL);
    expect(levelAt(g, 13, 10)).toBe(TORCH_LEVEL - 3 * AIR_COST);
    expect(levelAt(g, 12, 12)).toBe(TORCH_LEVEL - 4 * AIR_COST);
    expect(levelAt(g, 0, 0)).toBe(0);
  });

  it('rock absorbs light much faster than air', () => {
    const rows = solidRows(15, 3);
    rows[1] = '.......########';
    const g = computeLight(grid(rows, 99), 0, 0, 15, 3, [{ x: 0, y: 1, level: 40 }], 0);
    expect(levelAt(g, 6, 1)).toBe(40 - 6 * AIR_COST);
    expect(levelAt(g, 7, 1)).toBe(40 - 6 * AIR_COST - SOLID_COST);
    expect(levelAt(g, 9, 1)).toBe(0);
  });

  it('light goes around thick walls rather than through them; thin ones bleed', () => {
    const rows = ['...........', '...#####...', '...#####...', '...#####...', '...........'];
    const g = computeLight(grid(rows, 99), 0, 0, 11, 5, [{ x: 1, y: 2, level: 60 }], 0);
    // Through: 3 air + 5 rock = 52 -> 8. Around (2 up, 8 across, 2 down) = 48 -> 12.
    expect(levelAt(g, 9, 2)).toBe(60 - 12 * AIR_COST);
    const thin = ['.....', '..#..', '.....'];
    const t = computeLight(grid(thin, 99), 0, 0, 5, 3, [{ x: 0, y: 1, level: 40 }], 0);
    expect(levelAt(t, 4, 1)).toBe(40 - 3 * AIR_COST - SOLID_COST);
  });

  it('open sky is full bright and seeps a few tiles into the ground only', () => {
    const rows = solidRows(10, 20);
    for (let y = 0; y < 5; y++) rows[y] = '.'.repeat(10);
    const g = computeLight(grid(rows, 5), 0, 0, 10, 20, [], SKY_LEVEL);
    expect(brightness(levelAt(g, 4, 2))).toBe(1);
    expect(brightness(levelAt(g, 4, 5))).toBe(1); // first ground row is lit
    expect(levelAt(g, 4, 5 + Math.ceil(SKY_LEVEL / SOLID_COST))).toBe(0);
  });

  it('caves below the surface are not sky, even when open', () => {
    const w = grid(['..', '..', '#.', '..'], 2);
    expect(isSky(w, 0, 1)).toBe(true);
    expect(isSky(w, 1, 3)).toBe(false);
    expect(isSky(w, 0, -3)).toBe(true);
    expect(isSky(w, -1, 1)).toBe(false);
  });

  it('caps hostile source levels and ignores sources outside the region', () => {
    const rows = Array.from({ length: 5 }, () => '.....');
    const g = computeLight(grid(rows, 99), 0, 0, 5, 5, [{ x: 2, y: 2, level: 1e9 }, { x: -50, y: 2, level: 50 }, { x: NaN, y: 1, level: 10 }], -5);
    expect(levelAt(g, 2, 2)).toBe(LEVEL_CAP);
    expect(Array.from(g.levels).every((v) => v >= 0 && v <= LEVEL_CAP)).toBe(true);
  });

  it('a brighter later path wins over a dimmer earlier one', () => {
    const rows = Array.from({ length: 1 }, () => '..........');
    const g = computeLight(grid(rows, 99), 0, 0, 10, 1, [{ x: 0, y: 0, level: 20 }, { x: 9, y: 0, level: 40 }], 0);
    expect(levelAt(g, 5, 0)).toBe(Math.max(20 - 5 * AIR_COST, 40 - 4 * AIR_COST));
  });
});

describe('light sources and the sim', () => {
  it('a lamp of radius r fades out after r open tiles but is bright at the player', () => {
    expect(levelForRadius(6.5)).toBe(26);
    const src = frameSources([], 100, { x: 5, y: 5, radius: 6.5 }, { x: 50, y: 30 });
    expect(src[0].level).toBeGreaterThanOrEqual(LIGHT_MAX);
  });

  it('the area the sim keeps spawn-safe around a torch renders clearly lit', () => {
    // Sim: light = 1 - d / TORCH_RADIUS; spawns refused above SPAWN_LIGHT_MAX.
    const safeRadius = Math.floor(TORCH_RADIUS * (1 - SPAWN_LIGHT_MAX));
    const rows = Array.from({ length: 31 }, () => '.'.repeat(31));
    const g = computeLight(grid(rows, 99), 0, 0, 31, 31, [{ x: 15, y: 15, level: TORCH_LEVEL }], 0);
    expect(brightness(levelAt(g, 15 + safeRadius, 15))).toBeGreaterThan(0.5);
  });

  it('frameSources lists every torch at its tile', () => {
    const src = frameSources([3 + 10 * 7, 9], 10, { x: 0, y: 0, radius: 1 }, { x: 5, y: 5 });
    expect(src.slice(0, 2)).toEqual([
      { x: 3, y: 7, level: TORCH_LEVEL },
      { x: 9, y: 0, level: TORCH_LEVEL },
    ]);
  });

  it('a real world viewport computes fast and deep rock stays dark', () => {
    const w = generateWorld(4);
    const t0 = performance.now();
    let g = computeLight(w, w.padX - 40, w.padY - 20, 80, 60, [], SKY_LEVEL);
    for (let i = 0; i < 20; i++) g = computeLight(w, w.padX - 40, w.padY - 20, 80, 60, [], SKY_LEVEL);
    const ms = (performance.now() - t0) / 21;
    expect(ms).toBeLessThan(8);
    expect(brightness(levelAt(g, w.padX, w.padY - 5))).toBe(1);
    expect(levelAt(g, w.padX, w.padY + 30)).toBe(0);
  });

  it('world.version bumps on tile and wall edits (light cache key)', () => {
    const w = generateWorld(2);
    const v = w.version;
    w.set(5, 50, T.AIR);
    w.setWall(5, 50, 3);
    expect(w.version).toBe(v + 2);
    w.set(-1, 0, T.AIR);
    expect(w.version).toBe(v + 2);
  });
});
