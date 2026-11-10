import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { legacyWalls, sanitizeWalls } from '../src/sim/base';
import { T } from '../src/sim/tiles';
import { W, generateWorld } from '../src/sim/world';

const run = (g: Game, seconds: number, c: Partial<Controls> = {}) => {
  const ctl = { ...NO_CONTROLS, ...c };
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) g.step(FIXED_DT, ctl);
};

/** A v2 save that stored back walls as T.WALL tiles in the base strip. */
const V2_FIXTURE = JSON.stringify({
  v: 2,
  seedBase: 42,
  runs: 5,
  stash: { rust: 3 },
  carried: {},
  upgrades: {},
  stats: { deepest: 20, deaths: 0, playTime: 100, banked: 10 },
  settings: { muted: false },
  base: [0, 1, T.METAL, 1, 2, T.WALL, -2, 3, T.WALL, 2, 1, T.DOOR],
});

describe('back-wall layer: generation', () => {
  it('lines everything at or below the surface with natural walls, and nothing above', () => {
    for (const seed of [1, 7, 99]) {
      const w = generateWorld(seed);
      for (let x = 0; x < w.w; x += 7) {
        const s = w.surface[x];
        for (let y = 0; y < w.h; y += 3) {
          const wl = w.wall(x, y);
          if (y < s) expect(wl).toBe(W.NONE);
          else expect([W.CAVE_RUST, W.CAVE_ROCK]).toContain(wl);
        }
      }
    }
  });
  it('caves keep their wall, so underground is never flat black', () => {
    const w = generateWorld(3);
    let caveCells = 0;
    for (let y = 0; y < w.h; y++) {
      for (let x = 0; x < w.w; x++) {
        if (y > w.surface[x] + 8 && w.get(x, y) === T.AIR) {
          caveCells++;
          expect(w.wall(x, y)).not.toBe(W.NONE);
        }
      }
    }
    expect(caveCells).toBeGreaterThan(100);
  });
  it('is deterministic and out-of-range reads are safe', () => {
    expect(generateWorld(5).walls).toEqual(generateWorld(5).walls);
    const w = generateWorld(5);
    expect(w.wall(-1, 5)).toBe(W.NONE);
    expect(w.wall(5, w.h + 3)).toBe(W.NONE);
    expect(w.setWall(-1, 0, W.PLATE)).toBe(false);
  });
});

describe('back-wall layer: building', () => {
  const atBase = () => {
    const g = new Game();
    g.carried.wall = 5;
    g.selected = 'wall';
    return g;
  };

  it('places behind the player without touching the tile layer', () => {
    const g = atBase();
    const tx = Math.floor(g.body.x);
    const ty = g.world.padY - 1; // just above the pad, overlapping the player's feet
    run(g, 0.2, { place: true, aim: { tx, ty } });
    expect(g.world.wall(tx, ty)).toBe(W.PLATE);
    expect(g.world.get(tx, ty)).toBe(T.AIR);
    expect(g.carried.wall).toBe(4);
    expect(g.world.isSolid(tx, ty)).toBe(false);
  });

  it('extends from other built walls, but not into thin air or twice in one cell', () => {
    const g = atBase();
    const x = g.world.padX;
    const y = g.world.padY - 1;
    expect(g.canPlaceWall(x, y - 4)).toBe(false); // floating in the sky
    g.world.setWall(x, y - 3, W.PLATE);
    expect(g.canPlaceWall(x, y - 4)).toBe(true); // touches a built wall
    expect(g.canPlaceWall(x, y - 3)).toBe(false); // already built
    expect(g.canPlaceWall(x, g.world.padY)).toBe(false); // solid pad tile
    expect(g.canPlaceWall(-1, 0)).toBe(false);
  });

  it('torches and ladders go in front of a built wall', () => {
    const g = atBase();
    const tx = Math.floor(g.body.x) + 2;
    const ty = g.world.padY - 1;
    g.world.setWall(tx, ty, W.PLATE);
    g.carried.torch = 1;
    g.selected = 'torch';
    run(g, 0.2, { place: true, aim: { tx, ty } });
    expect(g.world.get(tx, ty)).toBe(T.TORCH);
    expect(g.world.wall(tx, ty)).toBe(W.PLATE);
  });

  it('the drill removes a built wall and returns it; natural cave walls stay', () => {
    const g = atBase();
    const tx = Math.floor(g.body.x) + 1;
    const ty = g.world.padY - 2;
    g.world.setWall(tx, ty, W.PLATE);
    g.carried.wall = 0;
    g.tool = 'drill';
    run(g, 1, { dig: true, aim: { tx, ty } });
    expect(g.world.wall(tx, ty)).toBe(W.NONE);
    // Banked at the base (kit items stay in the pack).
    expect(g.carried.wall).toBe(1);

    const deep = new Game();
    const bx = Math.floor(deep.body.x);
    const by = deep.world.padY + 20;
    deep.body.y = by;
    for (let dy = -3; dy <= -1; dy++) for (let dx = -1; dx <= 2; dx++) deep.world.set(bx + dx, by + dy, T.AIR);
    deep.world.set(bx, by, T.METAL);
    deep.world.set(bx + 1, by, T.METAL);
    const natural = deep.world.wall(bx + 1, by - 2);
    expect(natural).not.toBe(W.NONE);
    run(deep, 1, { dig: true, aim: { tx: bx + 1, ty: by - 2 } });
    expect(deep.world.wall(bx + 1, by - 2)).toBe(natural);
  });

  it('enemies never spawn in front of a built wall', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const s = defaultSave();
      s.seedBase = seed;
      const g = new Game(s);
      g.body.y = 60;
      for (let y = 30; y < 90; y++) for (let x = 1; x < g.world.w - 1; x++) g.world.setWall(x, y, W.PLATE);
      for (let i = 0; i < 80; i++) {
        g.enemies = [];
        expect(g.trySpawn()).toBeNull();
      }
    }
  });
});

describe('back-wall layer: saves', () => {
  it(`migrates v2 back-wall tiles into the wall layer (save v${SAVE_VERSION})`, () => {
    const s = parseSave(V2_FIXTURE);
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.base).toEqual([0, 1, T.METAL, 2, 1, T.DOOR]);
    expect(s.walls).toEqual([1, 2, W.PLATE, -2, 3, W.PLATE]);
    expect(s.stash.rust).toBe(3);
    const g = new Game(s);
    expect(g.world.wall(g.world.padX + 1, g.world.padY - 2)).toBe(W.PLATE);
    expect(g.world.get(g.world.padX + 1, g.world.padY - 2)).toBe(T.AIR);
  });

  it('v1 saves get an empty wall list; v3 round-trips', () => {
    expect(parseSave('{"v":1}').walls).toEqual([]);
    const d = defaultSave();
    d.walls = [0, 1, W.PLATE, 3, 4, W.PLATE];
    expect(parseSave(serializeSave(d)).walls).toEqual(d.walls);
  });

  it('hostile wall data never throws and keeps only built walls in range', () => {
    expect(sanitizeWalls('nope')).toEqual([]);
    expect(sanitizeWalls([0, 1, W.CAVE_ROCK, 0, 0, W.PLATE, 99, 1, W.PLATE, 1, 1, W.PLATE, 1, 1, W.PLATE])).toEqual([1, 1, W.PLATE]);
    expect(legacyWalls({ a: 1 })).toEqual([]);
    expect(() => parseSave('{"v":3,"walls":{"x":1}}')).not.toThrow();
    expect(() => parseSave('{"v":3,"walls":[1e308,null,"a"]}')).not.toThrow();
  });

  it('built walls survive a new dive and a reload', () => {
    const g = new Game();
    const w = g.world;
    w.setWall(w.padX + 2, w.padY - 3, W.PLATE);
    expect(g.newDive()).toBe(true);
    expect(g.world.wall(g.world.padX + 2, g.world.padY - 3)).toBe(W.PLATE);
    const g2 = new Game(parseSave(serializeSave(g.toSave())));
    expect(g2.world.wall(g2.world.padX + 2, g2.world.padY - 3)).toBe(W.PLATE);
  });
});
