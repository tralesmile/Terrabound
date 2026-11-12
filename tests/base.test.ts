import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { parseSave, serializeSave, defaultSave, SAVE_VERSION } from '../src/sim/save';
import { sanitizeBase, BASE_HALF, BASE_ROWS } from '../src/sim/base';
import { T } from '../src/sim/tiles';

const V1_FIXTURE = JSON.stringify({
  v: 1,
  seedBase: 99,
  runs: 3,
  stash: { rust: 12, iron_scrap: 2 },
  carried: {},
  upgrades: { pick: 1 },
  stats: { deepest: 10, deaths: 1, playTime: 300, banked: 40 },
  settings: { muted: true },
});

describe('save v2 base', () => {
  it('migrates a v1 save: keeps data, adds an empty base', () => {
    const s = parseSave(V1_FIXTURE);
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.seedBase).toBe(99);
    expect(s.stash.rust).toBe(12);
    expect(s.upgrades.pick).toBe(1);
    expect(s.settings.muted).toBe(true);
    expect(s.base).toEqual([]);
  });

  it('sanitizes hostile base data without throwing', () => {
    expect(sanitizeBase('x')).toEqual([]);
    expect(sanitizeBase([99, 1, T.RUST, 0, 0, T.RUST, 0, 1, T.BEDROCK, 0, 1, 1.5, 'a', 1, 2])).toEqual([]);
    expect(sanitizeBase([1, 1, T.RUST, 1, 1, T.METAL])).toEqual([1, 1, T.RUST]);
    expect(sanitizeBase(new Array(100000).fill(1)).length).toBeLessThanOrEqual(3 * (BASE_HALF * 2 + 1) * BASE_ROWS);
    expect(() => parseSave('{"v":2,"base":{"a":1}}')).not.toThrow();
  });

  it('round-trips through serialize/parse', () => {
    const s = defaultSave();
    s.base = [0, 1, T.METAL, 2, 3, T.TORCH];
    expect(parseSave(serializeSave(s)).base).toEqual(s.base);
  });

  it('built tiles survive a new dive and a reload', () => {
    const g = new Game(parseSave(V1_FIXTURE));
    const w = g.world;
    w.set(w.padX + 3, w.padY - 1, T.METAL);
    w.set(w.padX - 2, w.padY - 4, T.SCAFFOLD);
    expect(g.newDive()).toBe(true);
    expect(g.world.get(g.world.padX + 3, g.world.padY - 1)).toBe(T.METAL);
    expect(g.world.get(g.world.padX - 2, g.world.padY - 4)).toBe(T.SCAFFOLD);
    const g2 = new Game(parseSave(serializeSave(g.toSave())));
    expect(g2.world.get(g2.world.padX + 3, g2.world.padY - 1)).toBe(T.METAL);
  });

  it('does not stamp over terrain and ignores tiles outside the base strip', () => {
    const g = new Game();
    const w = g.world;
    w.set(w.padX + BASE_HALF + 3, w.padY - 1, T.METAL);
    w.set(w.padX, w.padY - BASE_ROWS - 2, T.METAL);
    expect(g.toSave().base).toEqual([]);
  });
});

describe('wide base strip (run 25)', () => {
  it('is wide enough for four 3-wide robot rooms side by side and two floors', () => {
    expect(BASE_HALF * 2 + 1).toBeGreaterThanOrEqual(4 * 4 + 1);
    expect(BASE_ROWS).toBeGreaterThanOrEqual(10);
  });

  it('keeps built tiles anywhere in the strip but never natural terrain', async () => {
    const { captureBase, isBuilt } = await import('../src/sim/base');
    const { baseValue, chewTarget } = await import('../src/sim/raids');
    const g = new Game();
    const w = g.world;
    const nx = w.padX + BASE_HALF - 1;
    const ny = w.padY - 2;
    // A natural hill block (written straight into the tile array, as worldgen does) is not base.
    for (let k = 0; k < 12; k++) w.tiles[(ny - (k % 6)) * w.w + nx - Math.floor(k / 6)] = T.RUST;
    expect(isBuilt(w, nx, ny)).toBe(false);
    expect(captureBase(w)).toEqual([]);
    expect(baseValue(w)).toBe(0);
    const e = { id: 1, kind: 'crawler' as const, x: nx - 1.5, y: ny + 1, vx: 0, vy: 0, hp: 24, dir: 1, iframes: 0, age: 0, phase: 0, raid: true };
    expect(chewTarget(w, e)).toBeNull();
    // A built block at the far edge of the strip is kept.
    w.set(w.padX - BASE_HALF, w.padY - BASE_ROWS, T.METAL);
    expect(captureBase(w)).toEqual([-BASE_HALF, BASE_ROWS, T.METAL]);
    expect(sanitizeBase([BASE_HALF, BASE_ROWS, T.METAL, BASE_HALF + 1, 1, T.METAL])).toEqual([BASE_HALF, BASE_ROWS, T.METAL]);
  });

  it('a new world does not inherit the old world hills', () => {
    const g = new Game();
    const w = g.world;
    w.tiles[(w.padY - 3) * w.w + w.padX + 12] = T.RUST;
    w.set(w.padX - 3, w.padY - 1, T.METAL);
    const s = g.toSave();
    expect(s.base).toEqual([-3, 1, T.METAL]);
  });
});

describe('findRooms in the wide strip', () => {
  it('finds a room far from the pad and stays fast over open sky', async () => {
    const { findRooms } = await import('../src/sim/rooms');
    const g = new Game();
    const w = g.world;
    const x0 = w.padX + 10;
    const py = w.padY;
    for (let x = x0; x <= x0 + 4; x++) for (let y = py - 5; y <= py - 1; y++) w.set(x, y, x === x0 || x === x0 + 4 || y === py - 5 ? T.METAL : T.AIR);
    w.set(x0 + 1, py - 1, T.BED);
    w.set(x0 + 3, py - 1, T.TABLE);
    w.set(x0 + 2, py - 4, T.TORCH);
    const t0 = performance.now();
    let rooms = findRooms(w);
    for (let k = 0; k < 20; k++) rooms = findRooms(w);
    const ms = (performance.now() - t0) / 21;
    expect(rooms.filter((r) => r.valid)).toHaveLength(1);
    expect(ms).toBeLessThan(2);
  });
});
