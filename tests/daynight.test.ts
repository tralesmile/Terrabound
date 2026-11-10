import { describe, expect, it } from 'vitest';
import { DAY_LENGTH, dayPhase, daylight, isNight, sunHeight } from '../src/sim/daynight';
import { FIXED_DT, Game, NIGHT_SAFE, NO_CONTROLS } from '../src/sim/game';
import { ENEMIES } from '../src/sim/enemies';
import { defaultSave } from '../src/sim/save';

/** First time >= from where isNight(t) === want, scanning in 1 s steps. */
const findTime = (want: boolean, from = 0): number => {
  for (let t = from; t < from + DAY_LENGTH * 2; t += 1) if (isNight(t) === want) return t;
  throw new Error('no such time');
};

describe('day/night', () => {
  it('starts in daylight, cycles every DAY_LENGTH and stays in range', () => {
    expect(daylight(0)).toBe(1);
    expect(isNight(0)).toBe(false);
    for (let t = 0; t < DAY_LENGTH * 3; t += 7.3) {
      expect(daylight(t)).toBeGreaterThanOrEqual(0);
      expect(daylight(t)).toBeLessThanOrEqual(1);
      expect(dayPhase(t)).toBeGreaterThanOrEqual(0);
      expect(dayPhase(t)).toBeLessThan(1);
      expect(daylight(t)).toBeCloseTo(daylight(t + DAY_LENGTH), 6);
      expect(Math.abs(sunHeight(t))).toBeLessThanOrEqual(1);
    }
    const night = findTime(true);
    expect(night).toBeGreaterThan(DAY_LENGTH * 0.25);
    expect(findTime(false, night)).toBeGreaterThan(night);
  });

  it('roughly a third of the day is night', () => {
    let n = 0;
    for (let t = 0; t < DAY_LENGTH; t++) if (isNight(t)) n++;
    expect(n / DAY_LENGTH).toBeGreaterThan(0.25);
    expect(n / DAY_LENGTH).toBeLessThan(0.5);
  });

  it('emits nightfall and dawn once each', () => {
    const g = new Game(defaultSave());
    g.time = findTime(true) - 0.5;
    for (let i = 0; i < 60; i++) g.step(FIXED_DT, NO_CONTROLS);
    expect(g.drainEvents().filter((e) => e.t === 'nightfall').length).toBe(1);
    g.time = findTime(false, g.time) - 0.5;
    for (let i = 0; i < 60; i++) g.step(FIXED_DT, NO_CONTROLS);
    expect(g.drainEvents().filter((e) => e.t === 'dawn').length).toBe(1);
  });

  it('at night only flyers spawn on the surface, and never near the pad', () => {
    const g = new Game(defaultSave());
    const x = g.world.padX + NIGHT_SAFE + 40;
    g.body.x = x + 0.5;
    g.body.y = g.world.surface[x];
    g.time = findTime(false);
    expect(g.trySpawn()).toBeNull();
    g.time = findTime(true);
    let spawned = 0;
    for (let i = 0; i < 40; i++) {
      g.enemies = [];
      const e = g.trySpawn();
      if (!e) continue;
      spawned++;
      expect(ENEMIES[e.kind].flying).toBe(true);
      expect(Math.abs(e.x - g.world.padX)).toBeGreaterThan(NIGHT_SAFE);
    }
    expect(spawned).toBeGreaterThan(5);
    g.body.x = g.world.padX + 10.5;
    g.body.y = g.world.surface[g.world.padX + 10];
    g.enemies = [];
    for (let i = 0; i < 20; i++) expect(g.trySpawn()).toBeNull();
  });
});
