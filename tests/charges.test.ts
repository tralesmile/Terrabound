import { describe, expect, it } from 'vitest';
import { CHARGE, igniteWithin, stepFuses, type Fuse } from '../src/sim/charges';
import { makeEnemy } from '../src/sim/enemies';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { recipeById } from '../src/sim/recipes';
import { defaultSave } from '../src/sim/save';
import { ITEMS, PLACEABLE, T } from '../src/sim/tiles';

const gameWithRow = (n: number, gap: number) => {
  const g = new Game(defaultSave());
  const x0 = Math.floor(g.world.padX) + 40;
  const y = Math.floor(g.world.padY) + 30;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -3; dx <= n * gap + 3; dx++) g.world.set(x0 + dx, y + dy, T.AIR);
  for (let i = 0; i < n; i++) g.world.set(x0 + i * gap, y, T.CHARGE);
  return { g, x0, y };
};
const run = (g: Game, secs: number) => {
  for (let i = 0; i < Math.round(secs / FIXED_DT); i++) g.step(FIXED_DT, NO_CONTROLS);
};

describe('placed charges', () => {
  it('is a craftable placeable block', () => {
    expect(ITEMS.charge.places).toBe(T.CHARGE);
    expect(PLACEABLE).toContain('charge');
    expect(recipeById('charge')?.out).toBe('charge');
  });
  it('igniteWithin lights only charges in range and removes the tile', () => {
    const tiles = new Map<string, number>([['5,5', T.CHARGE], ['9,5', T.CHARGE]]);
    const w = { get: (x: number, y: number) => tiles.get(`${x},${y}`) ?? 0, set: (x: number, y: number, t: number) => void tiles.set(`${x},${y}`, t) };
    const fuses: Fuse[] = [];
    expect(igniteWithin(w, fuses, 5.5, 5.5, 2)).toBe(1);
    expect(w.get(5, 5)).toBe(T.AIR);
    expect(w.get(9, 5)).toBe(T.CHARGE);
    expect(fuses).toHaveLength(1);
  });
  it('fuses fire after the fuse time and are removed', () => {
    const f: Fuse[] = [{ x: 1, y: 1, t: CHARGE.fuse }];
    expect(stepFuses(f, CHARGE.fuse / 2)).toHaveLength(0);
    expect(stepFuses(f, CHARGE.fuse)).toHaveLength(1);
    expect(f).toHaveLength(0);
  });
  it('a blast beside a row of charges sets off the whole chain, one after another', () => {
    const { g, x0, y } = gameWithRow(4, 2);
    g.explode(x0 - 1.5, y + 0.5, 5, 2.2, true);
    expect(g.fuses.length).toBeGreaterThanOrEqual(1);
    run(g, 0.2);
    expect(g.world.get(x0 + 6, y)).toBe(T.CHARGE); // far end not yet lit
    run(g, 2);
    for (let i = 0; i < 4; i++) expect(g.world.get(x0 + i * 2, y)).toBe(T.AIR);
    expect(g.fuses).toHaveLength(0);
  });
  it('charges too far apart do not chain, and are never lost as pickups when lit', () => {
    const { g, x0, y } = gameWithRow(2, 8);
    const before = g.drops.length;
    g.explode(x0 - 1.5, y + 0.5, 5, 2.2, true);
    run(g, 2);
    expect(g.world.get(x0 + 8, y)).toBe(T.CHARGE);
    expect(g.drops.length).toBe(before);
  });
  it('is deterministic', () => {
    const a = gameWithRow(5, 2);
    const b = gameWithRow(5, 2);
    a.g.explode(a.x0 - 1.5, a.y + 0.5, 5, 2.2, true);
    b.g.explode(b.x0 - 1.5, b.y + 0.5, 5, 2.2, true);
    run(a.g, 1);
    run(b.g, 1);
    expect(Array.from(a.g.world.tiles)).toEqual(Array.from(b.g.world.tiles));
  });
});

describe('detonator', () => {
  it('lights every charge in reach, costs battery, and ignores far ones', () => {
    const { g, x0, y } = gameWithRow(3, 3);
    g.world.set(x0 + 200, y, T.CHARGE);
    g.body.x = x0 + 4;
    g.body.y = y + 1;
    g.battery = 50;
    const near = g.detonate();
    expect(near).toBe(3);
    expect(g.battery).toBe(50 - CHARGE.detonateCost);
    expect(g.world.get(x0 + 200, y)).toBe(T.CHARGE);
    expect(g.detonate()).toBe(0);
    expect(g.battery).toBe(50 - CHARGE.detonateCost);
  });
  it('an enemy walking into a charge trips it as a trap, and a far one does not', () => {
    const { g, x0, y } = gameWithRow(1, 1);
    g.enemies.length = 0;
    const mk = (x: number) => ({ ...makeEnemy(900, 'crawler', x, y + 1) });
    g.enemies.push(mk(x0 + 20.5));
    g.step(FIXED_DT, NO_CONTROLS);
    expect(g.fuses.length).toBe(0);
    expect(g.world.get(x0, y)).toBe(T.CHARGE);
    g.enemies.length = 0;
    g.enemies.push(mk(x0 + 0.5));
    g.step(FIXED_DT, NO_CONTROLS);
    expect(g.world.get(x0, y)).toBe(T.AIR);
  });
});

describe('pressure plate', () => {
  it('is craftable and lights charges when the player steps on it', () => {
    expect(ITEMS.pressure_plate.places).toBe(T.PLATE);
    expect(recipeById('pressure_plate')?.out).toBe('pressure_plate');
    const { g, x0, y } = gameWithRow(1, 1);
    g.world.set(x0 + 3, y + 1, T.RUST);
    g.world.set(x0 + 3, y, T.PLATE);
    g.body.x = x0 + 3.5; g.body.y = y + 1; g.body.vx = 0; g.body.vy = 0;
    run(g, 0.05);
    expect(g.world.get(x0, y)).toBe(T.AIR);
  });
  it('does nothing when nothing stands on it', () => {
    const { g, x0, y } = gameWithRow(1, 1);
    g.world.set(x0 + 5, y, T.PLATE);
    g.body.x = x0 + 12.5; g.body.y = y + 1;
    run(g, 0.05);
    expect(g.world.get(x0, y)).toBe(T.CHARGE);
  });
});
