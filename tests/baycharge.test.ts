import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { APRON_FROM, APRON_TO, BAY_CHARGE, bayAt, bayCharge, onApron } from '../src/sim/garage';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};

/** Flat ground 70+ tiles from the pad with a garage bay placed by the player; returns bay + ground row. */
function withGarage(g: Game): { x: number; y: number; ground: number } {
  const w = g.world;
  let x = w.padX + 70;
  while (!(w.isSolid(x, w.surface[x]) && w.get(x, w.surface[x] - 1) === T.AIR)) x++;
  const y = w.surface[x];
  for (let xx = x - 20; xx <= x + 20; xx++) {
    for (let yy = y - 8; yy < y; yy++) w.set(xx, yy, T.AIR);
    w.set(xx, y, T.RUST);
  }
  g.body.x = x + 0.5;
  g.body.y = y;
  g.body.vx = g.body.vy = 0;
  g.enemies = [];
  g.carried = { garage_kit: 1 };
  g.selected = 'garage_kit';
  run(g, 0.05, { place: true, aim: { tx: x + 2, ty: y - 1 } });
  return { x: x + 2, y: y - 1, ground: y };
}

describe('garage bay charging', () => {
  it('bayAt finds the bay under its carport only (3 tiles each side, roof to floor)', () => {
    const tiles = new Map<string, number>([['10,20', 68]]);
    const w = { get: (x: number, y: number) => tiles.get(`${x},${y}`) ?? 0 };
    // Bay tile (10, 20): centre x 10.5, floor (feet) at y 21, roof row 16.
    expect(bayAt(w, 10.5, 21, 68)).toEqual({ x: 10, y: 20 });
    expect(bayAt(w, 7.0, 21, 68)).toEqual({ x: 10, y: 20 }); // 3.5 left of centre
    expect(bayAt(w, 6.9, 21, 68)).toBeNull();
    expect(bayAt(w, 14.0, 21, 68)).toEqual({ x: 10, y: 20 });
    expect(bayAt(w, 10.5, 17, 68)).toEqual({ x: 10, y: 20 }); // jumping inside
    expect(bayAt(w, 10.5, 16.5, 68)).toBeNull(); // above the roof line
    expect(bayAt(w, 10.5, 22, 68)).toBeNull(); // below the floor
    expect(bayAt(w, NaN, 21, 68)).toBeNull();
  });

  it('the apron right of the carport counts only for flyers, from 2 tiles above the floor down to it', () => {
    const tiles = new Map<string, number>([['10,20', 68]]);
    const w = { get: (x: number, y: number) => tiles.get(`${x},${y}`) ?? 0 };
    // Bay centre x 10.5: the roof ends at 14.0 (3.5 right); the apron runs to 10.5 + APRON_TO + 0.5 = 17.0.
    expect(APRON_FROM).toBe(4);
    expect(bayAt(w, 15.0, 21, 68)).toBeNull();
    expect(bayAt(w, 15.0, 21, 68, true)).toEqual({ x: 10, y: 20 });
    expect(bayAt(w, 10.5 + APRON_TO + 0.5, 21, 68, true)).toEqual({ x: 10, y: 20 });
    expect(bayAt(w, 10.5 + APRON_TO + 0.6, 21, 68, true)).toBeNull();
    expect(bayAt(w, 15.0, 19, 68, true)).toEqual({ x: 10, y: 20 }); // hovering 2 tiles up
    expect(bayAt(w, 15.0, 18.9, 68, true)).toBeNull();
    expect(bayAt(w, 6.0, 21, 68, true)).toBeNull(); // no apron on the left side
    expect(onApron(3.5, 1)).toBe(false);
    expect(onApron(3.6, 1)).toBe(true);
  });

  it('bayCharge fills at BAY_CHARGE per second up to the cap and never lowers a full battery', () => {
    expect(bayCharge(10, 240, 1)).toBe(10 + BAY_CHARGE);
    expect(bayCharge(230, 240, 1)).toBe(240);
    expect(bayCharge(300, 240, 1)).toBe(300);
    expect(bayCharge(10, 240, -1)).toBe(10);
  });

  it('standing under a field garage charges the battery and emits baycharge once per visit', () => {
    const g = new Game(defaultSave());
    const bay = withGarage(g);
    // The place step already stood us under the new roof (that announces it); events are kept since then.
    g.battery = 20;
    run(g, 1);
    expect(g.bayCharging).toEqual({ x: bay.x, y: bay.y });
    expect(g.battery).toBeGreaterThan(20 + BAY_CHARGE * 0.9);
    run(g, 1);
    expect(g.drainEvents().filter((e) => e.t === 'baycharge')).toHaveLength(1);
    run(g, 20);
    expect(g.battery).toBe(g.derived.maxBattery);
  });

  it('walking out from under the roof stops the charge; coming back announces it again', () => {
    const g = new Game(defaultSave());
    const bay = withGarage(g);
    g.battery = 20;
    run(g, 0.2);
    g.body.x = bay.x + 8.5;
    g.body.y = bay.ground;
    g.body.vx = g.body.vy = 0;
    run(g, 0.1);
    expect(g.bayCharging).toBeNull();
    const b = g.battery;
    run(g, 1);
    expect(g.battery).toBeLessThanOrEqual(b);
    g.drainEvents();
    g.body.x = bay.x + 0.5;
    g.body.vx = g.body.vy = 0;
    run(g, 0.2);
    expect(g.drainEvents().some((e) => e.t === 'baycharge')).toBe(true);
  });

  it('the pad is not a bay (it refills on its own) and no garage means no charge', () => {
    const g = new Game(defaultSave());
    run(g, 0.2);
    expect(g.isAtBase()).toBe(true);
    expect(g.bayCharging).toBeNull();
  });
});
