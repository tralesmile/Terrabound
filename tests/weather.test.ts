import { describe, expect, it } from 'vitest';
import { DAY_LENGTH } from '../src/sim/daynight';
import { dayOf, eventForDay, weatherAt, weatherEnemy, weatherLight } from '../src/sim/weather';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';

/** Find a time when `kind` is active for this seed. */
function timeOf(seed: number, kind: string): number {
  for (let t = 0; t < DAY_LENGTH * 200; t += 5) if (weatherAt(seed, t) === kind) return t;
  return -1;
}

describe('weather schedule', () => {
  it('is deterministic per seed and day, day 0 is calm, and every kind happens', () => {
    expect(eventForDay(5, 0).kind).toBe('clear');
    expect(eventForDay(5, 7)).toEqual(eventForDay(5, 7));
    const seen = new Set<string>();
    for (let d = 1; d < 200; d++) seen.add(eventForDay(3, d).kind);
    expect([...seen].sort()).toEqual(['clear', 'dust', 'eclipse', 'meteors']);
    for (let t = 0; t < DAY_LENGTH * 0.9; t += 10) expect(weatherAt(3, t)).toBe('clear');
    expect(dayOf(DAY_LENGTH * 3)).toBe(3);
  });

  it('roughly half of days are clear', () => {
    let clear = 0;
    for (let d = 1; d <= 400; d++) if (eventForDay(11, d).kind === 'clear') clear++;
    expect(clear / 400).toBeGreaterThan(0.45);
    expect(clear / 400).toBeLessThan(0.65);
  });

  it('eclipse darkens and toughens; dust only dims', () => {
    expect(weatherLight('eclipse')).toBeLessThan(0.3);
    expect(weatherLight('dust')).toBeLessThan(1);
    expect(weatherEnemy('eclipse').hp).toBeGreaterThan(1);
    expect(weatherEnemy('clear')).toEqual({ hp: 1, bonus: 0 });
  });
});

describe('events in play', () => {
  it('a meteor shower drops crystals near the player and announces itself', () => {
    const g = new Game(defaultSave());
    const t = timeOf(g.world.seed, 'meteors');
    expect(t).toBeGreaterThan(0);
    const x = g.world.padX + 80;
    g.body.x = x + 0.5;
    g.body.y = g.world.surface[x];
    g.time = t;
    let meteors = 0;
    let announced = false;
    for (let i = 0; i < 60 * 30; i++) {
      g.iframes = 1; // keep the test player out of the way of direct hits
      g.step(FIXED_DT, NO_CONTROLS);
      for (const e of g.drainEvents()) {
        if (e.t === 'meteor') meteors++;
        if (e.t === 'weather' && e.kind === 'meteors') announced = true;
      }
    }
    expect(announced).toBe(true);
    expect(meteors).toBeGreaterThan(2);
    expect(g.drops.some((d) => d.item === 'crystal') || (g.carried.crystal ?? 0) > 0).toBe(true);
  });

  it('during an eclipse surface enemies spawn by day', () => {
    const g = new Game(defaultSave());
    const t = timeOf(g.world.seed, 'eclipse');
    expect(t).toBeGreaterThan(0);
    const x = g.world.padX + 90;
    for (let xx = x - 25; xx <= x + 25; xx++) {
      for (let yy = g.world.surface[x] - 8; yy < g.world.surface[x]; yy++) g.world.set(xx, yy, T.AIR);
      g.world.set(xx, g.world.surface[x], T.RUST);
    }
    g.body.x = x + 0.5;
    g.body.y = g.world.surface[x];
    g.time = t;
    g.step(FIXED_DT, NO_CONTROLS);
    expect(g.weather).toBe('eclipse');
    let spawned = 0;
    for (let i = 0; i < 40; i++) {
      g.enemies = [];
      if (g.trySpawn()) spawned++;
    }
    expect(spawned).toBeGreaterThan(3);
  });
});
