import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { VEHICLES, VEHICLE_IDS, cargoLoad, cargoOf } from '../src/sim/garage';
import { GEAR } from '../src/sim/gear';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { CARGO_BAYS, RATTLE_SPEED, VEHICLES as SPRITES, cargoHold, cargoRattle, vehicleRows } from '../src/render/sprites';
import { invTotal } from '../src/sim/tiles';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};

/** A game riding the Cargo Lifter at the pad (owned and parked under you). */
function withLifter(): Game {
  const s = defaultSave();
  s.gear.owned.push('cargo_lifter');
  s.garage.parked = { id: 'cargo_lifter', x: Number.NaN, y: Number.NaN };
  const g = new Game(s);
  const p = g.parkedVehicle()!;
  g.body.x = p.x;
  g.body.y = p.y;
  return g;
}
function riding(): Game {
  const g = withLifter();
  expect(g.toggleRide()).toBe(true);
  return g;
}

describe('Cargo Lifter', () => {
  it('is a garage-built flyer with a cargo hold; the others have none', () => {
    expect(VEHICLE_IDS).toContain('cargo_lifter');
    expect(VEHICLES.cargo_lifter.flying).toBe(true);
    expect(GEAR.cargo_lifter.garage).toBe(true);
    expect(cargoOf('cargo_lifter')).toBe(30);
    for (const id of VEHICLE_IDS.filter((v) => v !== 'cargo_lifter')) expect(cargoOf(id)).toBe(0);
    expect(cargoOf(null)).toBe(0);
    expect(cargoOf('jetpack')).toBe(0);
    // Slower and thriftier than the Sky Jet: hauling is the trade.
    expect(VEHICLES.cargo_lifter.speed).toBeLessThan(VEHICLES.sky_jet.speed);
    expect(VEHICLES.cargo_lifter.drain).toBeLessThan(VEHICLES.sky_jet.drain);
  });

  it('the pack grows by the hold only while you ride it', () => {
    const g = withLifter();
    const foot = g.derived.packCap;
    expect(g.toggleRide()).toBe(true);
    expect(g.derived.packCap).toBe(foot + 30);
    g.carried = { metal: foot + 5 };
    g.drainEvents();
    g.toggleRide();
    expect(g.derived.packCap).toBe(foot);
    // Getting out over the suit pack keeps the load (nothing is lost) and says so.
    expect(invTotal(g.carried)).toBe(foot + 5);
    expect(g.drainEvents()).toContainEqual({ t: 'dismount', over: 5 });
  });

  it('it flies: holding jump climbs like the Sky Jet', () => {
    const g = riding();
    const y = g.body.y;
    run(g, 1, { jump: true });
    expect(g.body.y).toBeLessThan(y - 3);
  });

  it('crates fill the hold only past the suit pack', () => {
    expect(cargoLoad(10, 30, 30)).toBe(0);
    expect(cargoLoad(45, 30, 30)).toBeCloseTo(0.5);
    expect(cargoLoad(99, 30, 30)).toBe(1);
    expect(cargoLoad(99, 30, 0)).toBe(0);
    const g = riding();
    const cap = g.derived.packCap - 30;
    g.carried = { metal: cap + 15 };
    expect(g.cargoFill).toBeCloseTo(0.5);
    expect(invTotal(g.carried)).toBeLessThanOrEqual(g.derived.packCap);
  });

  it('the hull draws one crate per quarter of the hold', () => {
    const crates = (rows: string[]): number => CARGO_BAYS.filter((c) => rows[9].slice(c, c + 4) === 'cddc').length;
    expect(crates(cargoHold(0))).toBe(0);
    expect(crates(cargoHold(0.1))).toBe(1);
    expect(crates(cargoHold(0.5))).toBe(2);
    expect(crates(cargoHold(1))).toBe(4);
    const rows = vehicleRows('cargo_lifter', 0, true, 1);
    for (const r of rows) expect(r.length).toBeLessThanOrEqual(SPRITES.cargo_lifter.w);
    // The empty bays are hold rows, framed by outline.
    for (const c of CARGO_BAYS) expect(cargoHold(0)[9][c - 1]).toBe('o');
  });

  it('an owned, parked Cargo Lifter survives a save round trip', () => {
    const g = withLifter();
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.gear.owned).toContain('cargo_lifter');
    expect(back.garage.parked?.id).toBe('cargo_lifter');
  });

  it('crates sit still at cruise and rattle out of step when flying fast', () => {
    for (let t = 0; t < 2; t += 0.05) expect(cargoRattle(RATTLE_SPEED - 1, t)).toEqual([0, 0, 0, 0]);
    let jolts = 0;
    let mixed = 0;
    for (let t = 0; t < 2; t += 0.05) {
      const l = cargoRattle(RATTLE_SPEED + 4, t);
      const n = l.reduce((a, b) => a + b, 0);
      jolts += n;
      if (n > 0 && n < l.length) mixed++;
    }
    expect(jolts).toBeGreaterThan(10);
    expect(mixed).toBeGreaterThan(5);
    expect(cargoRattle(Number.NaN, 1)).toEqual([0, 0, 0, 0]);
  });

  it('a rattled crate pops one row up with an empty slot under it', () => {
    const rows = cargoHold(1, [1, 0, 0, 0]);
    const c = CARGO_BAYS[0];
    expect(rows[8].slice(c, c + 4)).toBe('cddc');
    expect(rows[9].slice(c, c + 4)).toBe('CccC');
    expect(rows[10].slice(c, c + 4)).toBe('LLLL');
    expect(rows[9].slice(CARGO_BAYS[1], CARGO_BAYS[1] + 4)).toBe('cddc');
    // Lift on an empty bay draws nothing; widths never change.
    expect(cargoHold(0, [1, 1, 1, 1])).toEqual(cargoHold(0));
    for (const r of vehicleRows('cargo_lifter', 0, true, 1, [1, 1, 1, 1])) expect(r.length).toBeLessThanOrEqual(SPRITES.cargo_lifter.w);
  });
});
