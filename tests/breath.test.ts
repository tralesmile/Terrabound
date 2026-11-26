import { describe, expect, it } from 'vitest';
import { BREATH, breathLabel, scrubbing, stepBreath, swimVy } from '../src/sim/breath';
import { FIXED_DT, Game, NO_CONTROLS, SINK, SWIM_UP, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';

/** A walled shaft 40 tiles below the pad holding a 7-deep pool; returns the surface row. */
const pool = (g: Game): number => {
  const x = g.world.padX + 60;
  const y = g.world.padY + 40;
  for (let yy = y - 12; yy <= y; yy++) {
    for (let xx = x - 3; xx <= x + 3; xx++) g.world.set(xx, yy, Math.abs(xx - x) === 3 || yy === y ? T.METAL : yy > y - 8 ? T.WATER : T.AIR);
  }
  g.body.x = x + 0.5;
  g.body.y = y - 3;
  g.body.vx = g.body.vy = 0;
  g.enemies = [];
  return y - 7;
};
const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) {
    g.enemies = [];
    g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
  }
};

describe('breath', () => {
  it('spends breath under water and gets it back faster in air', () => {
    expect(stepBreath(0, true, 1)).toBe(1);
    expect(stepBreath(BREATH.hold, true, 5)).toBe(BREATH.hold);
    expect(stepBreath(3, false, 0.5)).toBeCloseTo(3 - 0.5 * BREATH.recover);
    expect(stepBreath(0.1, false, 1)).toBe(0);
    expect(scrubbing(BREATH.hold, true)).toBe(true);
    expect(scrubbing(BREATH.hold, false)).toBe(false);
    expect(scrubbing(1, true)).toBe(false);
  });

  it('labels the held breath, then the real battery cost', () => {
    expect(breathLabel(0, 1)).toBe('HOLDING BREATH 3s');
    expect(breathLabel(BREATH.hold, 0.7)).toBe('SCRUBBERS ON  BAT -0.8/s');
  });

  it('dives with down, strokes with jump, floats a dry helmet and sinks a wet one', () => {
    const s = { gravity: 30, up: SWIM_UP, sink: SINK };
    let dive = 0;
    let wet = 0;
    let dry = SINK;
    for (let i = 0; i < 120; i++) {
      dive = swimVy(dive, { jump: false, down: true }, true, false, FIXED_DT, s);
      wet = swimVy(wet, { jump: false, down: false }, true, false, FIXED_DT, s);
      dry = swimVy(dry, { jump: false, down: false }, false, false, FIXED_DT, s);
    }
    expect(dive).toBeCloseTo(BREATH.diveSpeed);
    expect(wet).toBeCloseTo(SINK);
    expect(dry).toBeCloseTo(BREATH.settle);
    expect(swimVy(0, { jump: true, down: false }, true, false, FIXED_DT, s)).toBeLessThan(0);
    // A shallow helmet bobs back up by itself.
    expect(swimVy(SINK, { jump: false, down: false }, true, true, 0.5, s)).toBeCloseTo(-BREATH.buoySpeed);
  });

  it('the scrubbers cost battery only after the held breath, and announce themselves once', () => {
    const g = new Game(defaultSave());
    pool(g);
    run(g, 1, { down: true });
    expect(g.headUnder).toBe(true);
    expect(g.scrubbersOn).toBe(false);
    run(g, BREATH.hold, { down: true });
    expect(g.scrubbersOn).toBe(true);
    const events = g.drainEvents().filter((e) => e.t === 'scrubbers');
    expect(events).toHaveLength(1);
    const b0 = g.battery;
    run(g, 2, { down: true });
    const wetCost = b0 - g.battery;
    // The same 2 s hanging dry above the pool cost only the normal dive drain.
    const dry = new Game(defaultSave());
    pool(dry);
    for (let x = dry.world.padX + 58; x <= dry.world.padX + 62; x++) for (let y = dry.world.padY + 33; y < dry.world.padY + 40; y++) dry.world.set(x, y, T.AIR);
    const d0 = dry.battery;
    run(dry, 2);
    expect(wetCost - (d0 - dry.battery)).toBeCloseTo(BREATH.drain * 2 * g.gear.drainMul, 1);
  });

  it('a floating suit holds its helmet above the water and breathes', () => {
    const g = new Game(defaultSave());
    const surface = pool(g);
    run(g, 1.5, { jump: true });
    run(g, 6);
    expect(g.headUnder).toBe(false);
    expect(g.scrubbersOn).toBe(false);
    expect(g.breathSpent).toBe(0);
    expect(g.body.y).toBeLessThan(surface + 3);
    // Stable: it never flickers out of the water or dunks the visor while hands are off.
    for (let i = 0; i < 240; i++) {
      run(g, FIXED_DT);
      expect(g.inLiquid).toBe(T.WATER);
      expect(g.headUnder).toBe(false);
    }
  });

  it('a body dropped into a two-deep pool stays in the water', () => {
    const g = new Game(defaultSave());
    const x = g.world.padX + 60;
    const y = g.world.padY + 40;
    for (let yy = y - 8; yy <= y + 1; yy++) for (let xx = x - 3; xx <= x + 3; xx++) g.world.set(xx, yy, Math.abs(xx - x) === 3 || yy === y + 1 ? T.METAL : yy >= y - 1 ? T.WATER : T.AIR);
    g.body.x = x + 0.5;
    g.body.y = y + 0.9;
    g.body.vx = g.body.vy = 0;
    run(g, 1.5);
    for (let i = 0; i < 120; i++) {
      run(g, FIXED_DT);
      expect(g.inLiquid).toBe(T.WATER);
    }
  });
});
