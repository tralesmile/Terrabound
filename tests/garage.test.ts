import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, MOUNT_RANGE, NO_CONTROLS, type Controls } from '../src/sim/game';
import { VEHICLES, VEHICLE_IDS, partCost, sanitizeGarage, vehicleStats } from '../src/sim/garage';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { W } from '../src/sim/world';
import { makeEnemy } from '../src/sim/enemies';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};
const rich = (): Game => {
  const g = new Game(defaultSave());
  g.stash = { metal: 900, iron_scrap: 900, copper_wire: 900, crystal: 900 };
  return g;
};
/** Flat open ground away from the pad with a garage placed by the player. */
function withGarage(g: Game): { x: number; y: number } {
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
  return { x: x + 2, y: y - 1 };
}

describe('garage', () => {
  it('a garage kit builds a bay with a back wall and roof; E opens the garage', () => {
    const g = rich();
    const at = withGarage(g);
    expect(g.world.get(at.x, at.y)).toBe(T.GARAGE);
    expect(g.world.wall(at.x - 2, at.y - 1)).toBe(W.PLATE);
    expect(g.world.get(at.x, at.y - 4)).toBe(T.METAL);
    expect(g.interact()).toBe(true);
    expect(g.garageOpen).toEqual(at);
    g.interact();
    expect(g.garageOpen).toBeNull();
  });

  it('vehicles are built in the garage (not the workshop), paid from the stash, and parked beside the bay', () => {
    const g = rich();
    expect(g.canCraftGear('buggy')).toBe(false);
    const at = withGarage(g);
    expect(g.buildVehicle('buggy')).toBe(false); // garage not open
    g.interact();
    const metal = g.stash.metal ?? 0;
    expect(g.buildVehicle('buggy')).toBe(true);
    expect(g.stash.metal).toBe(metal - (VEHICLES.buggy.cost.metal ?? 0));
    expect(g.ownsGear('buggy')).toBe(true);
    expect(g.parkedVehicle()).toEqual({ id: 'buggy', x: at.x + 4.5, y: at.y + 1 });
    expect(g.buildVehicle('buggy')).toBe(false);
  });

  it('you must walk up to the parked vehicle to get in; getting out parks it there', () => {
    const g = rich();
    withGarage(g);
    g.interact();
    g.buildVehicle('buggy');
    g.interact();
    g.body.x -= 8;
    expect(g.toggleRide()).toBe(false);
    const p = g.parkedVehicle()!;
    g.body.x = p.x + MOUNT_RANGE - 0.5;
    expect(g.toggleRide()).toBe(true);
    expect(g.riding).toBe(true);
    expect(g.parkedVehicle()).toBeNull();
    run(g, 0.8, { moveX: 1 });
    const x = g.body.x;
    g.toggleRide();
    expect(g.parkedVehicle()?.x).toBeCloseTo(x, 3);
  });

  it('parts upgrade speed, armor and battery, capped at 3 levels', () => {
    const g = rich();
    withGarage(g);
    g.interact();
    g.buildVehicle('hoverbike');
    for (let i = 0; i < 3; i++) expect(g.upgradePart('hoverbike', 'engine')).toBe(true);
    expect(g.upgradePart('hoverbike', 'engine')).toBe(false);
    const base = vehicleStats('hoverbike', { engine: 0, armor: 0, battery: 0 });
    const up = vehicleStats('hoverbike', { engine: 3, armor: 3, battery: 3 });
    expect(up.speed).toBeGreaterThan(base.speed * 1.4);
    expect(up.armor).toBeGreaterThan(0.4);
    expect(up.drain).toBeLessThan(base.drain * 0.5);
    expect(partCost('engine', 2).crystal).toBeGreaterThan(partCost('engine', 0).crystal ?? 0);
  });

  it('the buggy rams enemies; the drill tank tunnels through rock', () => {
    const g = rich();
    const at = withGarage(g);
    g.interact();
    g.buildVehicle('buggy');
    g.interact();
    const p = g.parkedVehicle()!;
    g.body.x = p.x;
    g.toggleRide();
    const e = makeEnemy(50, 'hulk', g.body.x + 6, g.body.y);
    e.vx = 0;
    g.enemies = [e];
    const hp = e.hp;
    g.iframes = 99;
    run(g, 1.2, { moveX: 1 });
    expect(e.hp).toBeLessThan(hp);
    // Drill tank: a wall in front gets dug away while driving into it.
    const t = rich();
    withGarage(t);
    t.interact();
    t.buildVehicle('drill_tank');
    t.interact();
    const q = t.parkedVehicle()!;
    t.body.x = q.x;
    t.toggleRide();
    const wx = Math.floor(t.body.x) + 3;
    for (let yy = t.world.surface[wx] - 3; yy < t.world.surface[wx]; yy++) t.world.set(wx, yy, T.RUST);
    t.facing = 1;
    run(t, 2.5, { moveX: 1 });
    expect(t.body.x).toBeGreaterThan(wx);
    void at;
  });

  it('saves the garage (v24), parks the vehicle you are riding, and migrates old saves', () => {
    const g = rich();
    withGarage(g);
    g.interact();
    g.buildVehicle('buggy');
    g.upgradePart('buggy', 'armor');
    g.interact();
    g.body.x = g.parkedVehicle()!.x;
    g.toggleRide();
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.v).toBe(SAVE_VERSION);
    expect(back.garage.parts.buggy?.armor).toBe(1);
    expect(back.garage.parked?.id).toBe('buggy');
    // v23 save that owned a hoverbike from the old workshop: it waits beside the pad.
    const v23 = { ...defaultSave(), v: 23, gear: { owned: ['energy_blade', 'pulse_pistol', 'hoverbike'], equip: { melee: 'energy_blade', ranged: 'pulse_pistol', vehicle: 'hoverbike' } } } as Record<string, unknown>;
    delete v23.garage;
    const m = new Game(parseSave(JSON.stringify(v23)));
    const p = m.parkedVehicle();
    expect(p?.id).toBe('hoverbike');
    expect(Math.abs((p?.x ?? 0) - m.world.padX)).toBeLessThan(5);
    expect(sanitizeGarage({ parts: { buggy: { engine: 99 } }, parked: { id: 'nope', x: 1, y: 2 } }, [], false)).toEqual({ parts: { buggy: { engine: 3, armor: 0, battery: 0 } }, parked: null });
  });

  it('every vehicle has a cost and sensible stats', () => {
    for (const id of VEHICLE_IDS) {
      expect(Object.keys(VEHICLES[id].cost).length).toBeGreaterThan(0);
      expect(VEHICLES[id].speed).toBeGreaterThan(1);
    }
  });
});
