import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T, TILES, ITEMS, PLACEABLE } from '../src/sim/tiles';
import { makeEnemy } from '../src/sim/enemies';
import { CHEW_TIME, baseValue, chewTarget } from '../src/sim/raids';
import {
  REINFORCED_MULT, TURRET_CD, TURRET_DRAW, TURRET_RANGE, chewTime, machineGoal, spikeVictims, stepTurrets, syncTurrets, turretTarget,
} from '../src/sim/defences';
import { gridState } from '../src/sim/power';
import { recipeById } from '../src/sim/recipes';
import { BASE_KEEP, captureBase, stampBase } from '../src/sim/base';
import { isNight } from '../src/sim/daynight';
import { defaultSave } from '../src/sim/save';
import { Game, NO_CONTROLS } from '../src/sim/game';

/** Open 120x60 world, pad at (60, 20), flat floor at row 20. */
function flat(): World {
  const w = new World(120, 60, 7);
  Object.assign(w, { padX: 60, padY: 20 });
  for (let y = 20; y < 60; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
  return w;
}

describe('raid defences (pure)', () => {
  it('defence items are craftable, placeable, kept in the base and drop themselves', () => {
    for (const id of ['turret', 'spikes', 'reinforced'] as const) {
      expect(recipeById(id)).toBeDefined();
      expect(PLACEABLE).toContain(id);
      const tile = ITEMS[id].places;
      expect(tile).not.toBeNull();
      expect(BASE_KEEP.has(tile ?? -1)).toBe(true);
      expect(TILES[tile ?? 0].drop).toBe(id);
    }
    expect(TILES[T.REINFORCED].solid).toBe(true);
    expect(TILES[T.SPIKES].solid).toBe(false);
    expect(TILES[T.TURRET].solid).toBe(false);
  });

  it('reinforced walls take three times as long to chew', () => {
    expect(chewTime(T.METAL)).toBe(CHEW_TIME);
    expect(chewTime(T.REINFORCED)).toBe(CHEW_TIME * REINFORCED_MULT);
    expect(REINFORCED_MULT).toBe(3);
  });

  it('turrets draw from the grid', () => {
    expect(gridState(1, 0, 1, false, 0, 0, 2).demand).toBe(2 * TURRET_DRAW);
    expect(gridState(1, 0, 1, false, 0, 0, 2).ratio).toBe(1);
    expect(gridState(0, 0, 1, false, 0, 0, 2).ratio).toBe(0);
  });

  it('a turret shoots the nearest enemy in range with a clear line, raiders first', () => {
    const w = flat();
    w.set(60, 19, T.TURRET);
    const ts = syncTurrets(w, []);
    expect(ts).toHaveLength(1);
    const wild = makeEnemy(1, 'crawler', 63.5, 20);
    const raider = makeEnemy(2, 'crawler', 66.5, 20);
    raider.raid = true;
    expect(turretTarget(w, ts[0], [wild, raider])?.id).toBe(2);
    const far = makeEnemy(3, 'crawler', 60.5 + TURRET_RANGE + 2, 20);
    expect(turretTarget(w, ts[0], [far])).toBeNull();
    // A wall in between blocks the shot.
    w.set(62, 19, T.REINFORCED);
    w.set(62, 18, T.REINFORCED);
    expect(turretTarget(w, ts[0], [wild])).toBeNull();
  });

  it('turrets fire on cooldown, slower at half power, never without power', () => {
    const w = flat();
    w.set(60, 19, T.TURRET);
    const ts = syncTurrets(w, []);
    const e = makeEnemy(1, 'crawler', 64.5, 20);
    expect(stepTurrets(w, ts, [e], 0, 0.1)).toHaveLength(0);
    expect(stepTurrets(w, ts, [e], 1, 0.1)).toHaveLength(1);
    expect(ts[0].aim).toBeGreaterThan(-Math.PI / 2);
    let full = 0;
    for (let i = 0; i < 60; i++) full += stepTurrets(w, ts, [e], 1, 0.1).length;
    const ts2 = syncTurrets(w, []);
    let half = 0;
    for (let i = 0; i < 60; i++) half += stepTurrets(w, ts2, [e], 0.5, 0.1).length;
    expect(full).toBeGreaterThanOrEqual(Math.floor(6 / TURRET_CD) - 1);
    expect(half).toBeLessThan(full);
    expect(half).toBeGreaterThan(0);
    // Sync keeps an existing turret's cooldown and drops removed ones.
    expect(syncTurrets(w, ts)[0]).toBe(ts[0]);
    w.set(60, 19, T.AIR);
    expect(syncTurrets(w, ts)).toHaveLength(0);
  });

  it('spikes catch walkers standing on them, not fliers', () => {
    const w = flat();
    w.set(55, 19, T.SPIKES);
    const on = makeEnemy(1, 'crawler', 55.5, 20);
    const off = makeEnemy(2, 'crawler', 50.5, 20);
    const fly = makeEnemy(3, 'flyer', 55.5, 20);
    expect(spikeVictims(w, [on, off, fly]).map((e) => e.id)).toEqual([1]);
  });

  it('raiders do not chew spikes; turrets do not raise the base value', () => {
    const w = flat();
    w.set(55, 19, T.SPIKES);
    const r = makeEnemy(1, 'crawler', 54.5, 20);
    r.raid = true;
    r.dir = 1;
    expect(chewTarget(w, r)).toBeNull();
    w.set(56, 19, T.TURRET);
    expect(baseValue(w)).toBe(0);
  });

  it('raiders head for the nearest machine, or nothing when the base has none', () => {
    const w = flat();
    expect(machineGoal(w, 40)).toBeNull();
    w.set(55, 19, T.SOLAR);
    w.set(66, 19, T.SMELTER);
    expect(machineGoal(w, 40)?.x).toBe(55.5);
    expect(machineGoal(w, 90)?.x).toBe(66.5);
  });

  it('defence tiles survive a base capture and restore', () => {
    const w = flat();
    w.set(58, 19, T.TURRET);
    w.set(59, 19, T.SPIKES);
    w.set(61, 18, T.REINFORCED);
    const saved = captureBase(w);
    const w2 = flat();
    stampBase(w2, saved);
    expect(w2.get(58, 19)).toBe(T.TURRET);
    expect(w2.get(59, 19)).toBe(T.SPIKES);
    expect(w2.get(61, 18)).toBe(T.REINFORCED);
  });
});

describe('raid defences in the game', () => {
  it('a powered turret in the base kills raiders during a night raid', () => {
    const s = defaultSave();
    s.settings.raids = true;
    const g = new Game(s);
    const w = g.world;
    for (let i = 0; i < 3; i++) w.set(w.padX + 3 + i, w.padY - 1, T.SOLAR);
    w.set(w.padX + 6, w.padY - 1, T.SMELTER);
    w.set(w.padX - 6, w.padY - 1, T.TURRET);
    w.set(w.padX + 2, w.padY - 1, T.TURRET);
    // Daylight so the solar cells power the turrets, then force a raid.
    let t = g.time;
    while (isNight(t)) t += 1;
    g.time = t + 5;
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    for (let i = 0; i < 20; i++) g.step(1 / 30, NO_CONTROLS);
    expect(g.turrets).toHaveLength(2);
    expect(g.startRaid()).toBe(true);
    const ev = [];
    let killed = 0;
    for (let i = 0; i < 30 * 40 && g.raid; i++) {
      g.step(1 / 30, NO_CONTROLS);
      const d = g.drainEvents();
      ev.push(...d);
      killed += d.filter((e) => e.t === 'enemykill').length;
    }
    expect(ev.some((e) => e.t === 'turretshot')).toBe(true);
    expect(killed).toBeGreaterThan(0);
  }, 30000);
});
