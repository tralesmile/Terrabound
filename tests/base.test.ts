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
