import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { planHut, stampHut } from '../src/sim/prefab';
import { roomAt } from '../src/sim/rooms';
import { recipeById } from '../src/sim/recipes';

function flat(seed: number): { g: Game; x: number; y: number } {
  const g = new Game(defaultSave(seed));
  const x = g.world.padX + 40;
  let y = 0;
  while (!g.world.isSolid(x, y)) y++;
  // Level a 9-wide strip so the test never depends on terrain.
  for (let dx = -4; dx <= 4; dx++) {
    for (let yy = y - 8; yy < y; yy++) g.world.set(x + dx, yy, T.AIR);
    g.world.set(x + dx, y, T.RUST);
  }
  return { g, x, y: y - 1 };
}

describe('hut kit', () => {
  it('plans a furnished hut on flat ground and refuses rough or floating spots', () => {
    const { g, x, y } = flat(31);
    expect(planHut(g.world, x, y)).not.toBeNull();
    g.world.set(x + 1, y + 1, T.AIR); // a hole in the floor
    expect(planHut(g.world, x, y)).toBeNull();
    g.world.set(x + 1, y + 1, T.RUST);
    g.world.set(x, y - 2, T.METAL); // rock in the way
    expect(planHut(g.world, x, y)).toBeNull();
  });
  it('the stamped hut is a valid robot home (light, table, bed, closed room)', () => {
    const { g, x, y } = flat(32);
    const plan = planHut(g.world, x, y);
    expect(plan).not.toBeNull();
    stampHut(g.world, plan!);
    expect(g.world.get(x, y - 3)).toBe(T.LAMP);
    expect(g.world.get(x - 2, y)).toBe(T.TABLE);
    expect(g.world.get(x + 1, y)).toBe(T.BED);
    expect(g.world.get(x + 3, y)).toBe(T.DOOR);
    const r = roomAt(g.world, x, y - 1);
    expect(r && r.valid).toBe(true);
  });
  it('is craftable', () => {
    expect(recipeById('hut_kit')?.out).toBe('hut_kit');
  });
});

import { COMFORT_MAX, roomHint } from '../src/sim/rooms';

describe('room comfort ideas', () => {
  it('the hut is valid; an aquarium or neon in its walls adds a comfort point', () => {
    const { g, x, y } = flat(41);
    stampHut(g.world, planHut(g.world, x, y)!);
    const before = roomAt(g.world, x, y - 1)!;
    expect(before.feature).toBe(false);
    expect(before.ideas.length).toBeGreaterThan(0);
    g.world.set(x - 3, y - 3, T.AQUARIUM); // swap a wall panel for a tank
    const after = roomAt(g.world, x, y - 1)!;
    expect(after.feature).toBe(true);
    expect(after.comfort).toBe(before.comfort + 1);
    expect(after.ideas).not.toContain('an aquarium or neon');
    g.world.set(x - 3, y - 3, T.NEON_PINK);
    expect(roomAt(g.world, x, y - 1)!.feature).toBe(true);
  });
  it('the ready hint says what to add until comfort is full, then stops', () => {
    const { g, x, y } = flat(42);
    stampHut(g.world, planHut(g.world, x, y)!);
    const r = roomAt(g.world, x, y - 1)!;
    expect(roomHint(r)).toContain('add ');
    expect(roomHint({ ...r, comfort: COMFORT_MAX, ideas: [] })).not.toContain('add ');
  });
});
