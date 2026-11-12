import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T, type Inventory } from '../src/sim/tiles';
import {
  DRONE_DRILL, DRONE_ROLES, GUARD_CD, GUARD_RANGE, HAUL_AT, HAUL_LOAD, MINER_CARGO,
  findOre, listBays, nextRole, stepFieldDrones, surveyBays, syncDrones,
  type DroneCtx, type DroneEvent, type DroneRole, type DroneTarget, type FieldDrone,
} from '../src/sim/drones';
import { parseSave, serializeSave, defaultSave, SAVE_VERSION } from '../src/sim/save';
import { Game, NO_CONTROLS } from '../src/sim/game';

/** Open 80x60 world, pad at (40, 20), rock floor from row 30 down; one bay at the base. */
function testWorld(): World {
  const w = new World(80, 60, 1);
  Object.assign(w, { padY: 20 });
  for (let y = 30; y < 60; y++) for (let x = 0; x < 80; x++) w.set(x, y, T.RUST);
  w.set(42, 19, T.DRONE);
  return w;
}

function ctx(world: World, over: Partial<DroneCtx> = {}): DroneCtx {
  return { world, px: 40.5, py: 30, atBase: false, powered: true, enemies: [], carried: {}, stash: {}, ...over };
}

function fleet(world: World, role: DroneRole): FieldDrone[] {
  return syncDrones([], listBays(world), { '2,1': role });
}

function run(drones: FieldDrone[], c: DroneCtx, secs: number, dt = 1 / 30): DroneEvent[] {
  const all: DroneEvent[] = [];
  for (let i = 0; i < secs / dt; i++) all.push(...stepFieldDrones(drones, c, dt));
  return all;
}

describe('field drone roles and bays', () => {
  it('lists bays by offset from the pad and cycles roles through every role', () => {
    const w = testWorld();
    expect(listBays(w)).toEqual([{ key: '2,1', x: 42, y: 19 }]);
    let r: DroneRole = 'survey';
    const seen = new Set<DroneRole>();
    for (let i = 0; i < DRONE_ROLES.length; i++) {
      seen.add(r);
      r = nextRole(r);
    }
    expect(r).toBe('survey');
    expect(seen.size).toBe(DRONE_ROLES.length);
  });

  it('survey bays launch no field drone; other roles launch exactly one per bay', () => {
    const w = testWorld();
    const bays = listBays(w);
    expect(syncDrones([], bays, {})).toEqual([]);
    expect(surveyBays(bays, {})).toBe(1);
    const d = syncDrones([], bays, { '2,1': 'miner' });
    expect(d.length).toBe(1);
    expect(surveyBays(bays, { '2,1': 'miner' })).toBe(0);
    // Re-sync keeps the same object (state survives the periodic scan).
    expect(syncDrones(d, bays, { '2,1': 'miner' })[0]).toBe(d[0]);
    w.set(42, 19, T.AIR);
    expect(syncDrones(d, listBays(w), { '2,1': 'miner' })).toEqual([]);
  });
});

describe('miner drone', () => {
  it('finds only exposed ore near the player', () => {
    const w = testWorld();
    w.set(44, 33, T.IRON); // buried
    expect(findOre(w, 40.5, 30)).toBeNull();
    w.set(43, 30, T.COPPER); // top row of the floor: exposed to air
    expect(findOre(w, 40.5, 30)).toEqual({ x: 43, y: 30 });
    w.set(43, 30, T.METAL); // building material is never drilled
    expect(findOre(w, 40.5, 30)).toBeNull();
  });

  it('drills ore, fills its cargo, flies home and banks into the stash', () => {
    const w = testWorld();
    for (let x = 36; x < 36 + MINER_CARGO; x++) w.set(x, 30, T.IRON);
    const d = fleet(w, 'miner');
    const c = ctx(w);
    const ev = run(d, c, MINER_CARGO * (DRONE_DRILL + 1.5) + 8);
    expect(ev.filter((e) => e.t === 'dronemine').length).toBe(MINER_CARGO);
    for (let x = 36; x < 36 + MINER_CARGO; x++) expect(w.get(x, 30)).toBe(T.AIR);
    expect(c.stash.iron_scrap).toBe(MINER_CARGO);
    expect(ev.some((e) => e.t === 'dronebank' && e.n === MINER_CARGO)).toBe(true);
    expect(d[0].mode === 'dock' || d[0].mode === 'follow').toBe(true);
  });

  it('is deterministic', () => {
    const a = testWorld();
    const b = testWorld();
    for (const w of [a, b]) for (let x = 34; x < 46; x += 2) w.set(x, 30, T.CRYSTAL);
    const da = fleet(a, 'miner');
    const db = fleet(b, 'miner');
    run(da, ctx(a), 9);
    run(db, ctx(b), 9);
    expect(da).toEqual(db);
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
  });
});

describe('guard drone', () => {
  it('shoots the nearest live enemy in range with a cooldown', () => {
    const w = testWorld();
    const d = fleet(w, 'guard');
    const near: DroneTarget = { id: 1, x: 42, y: 30, hp: 10 };
    const far: DroneTarget = { id: 2, x: 40 + GUARD_RANGE + 8, y: 30, hp: 10 };
    const c = ctx(w, { enemies: [near, far] });
    run(d, c, 3); // fly out from the bay
    const ev = run(d, c, GUARD_CD * 3 + 0.05);
    const shots = ev.filter((e) => e.t === 'droneshot');
    expect(shots.length).toBeGreaterThanOrEqual(3);
    expect(shots.length).toBeLessThanOrEqual(4);
    expect(shots.every((s) => s.t === 'droneshot' && s.id === 1)).toBe(true);
    near.hp = 0;
    expect(run(d, c, 2).filter((e) => e.t === 'droneshot').length).toBe(0);
  });
});

describe('hauler drone', () => {
  it('waits until the pack fills, takes one load of loot (never kit) and banks it', () => {
    const w = testWorld();
    const d = fleet(w, 'hauler');
    const carried: Inventory = { rust: HAUL_AT - 2, torch: 5 };
    const c = ctx(w, { carried });
    run(d, c, 3);
    expect(d[0].mode).toBe('dock');
    carried.rust = HAUL_AT + 2;
    const ev = run(d, c, 12);
    expect(ev.some((e) => e.t === 'dronetake' && e.n === HAUL_LOAD)).toBe(true);
    expect(carried.torch).toBe(5);
    expect(c.stash.rust).toBe(HAUL_LOAD);
    expect(carried.rust).toBe(HAUL_AT + 2 - HAUL_LOAD);
  });
});

describe('drone power and base', () => {
  it('without power drones stay docked and never drill', () => {
    const w = testWorld();
    w.set(41, 30, T.IRON);
    const d = fleet(w, 'miner');
    run(d, ctx(w, { powered: false }), 6);
    expect(d[0].mode).toBe('dock');
    expect(w.get(41, 30)).toBe(T.IRON);
  });

  it('when the player is at the base, drones come home and unload', () => {
    const w = testWorld();
    const d = fleet(w, 'miner');
    d[0].mode = 'follow';
    d[0].x = 30;
    d[0].y = 28;
    d[0].cargo = { crystal: 2 };
    const c = ctx(w, { atBase: true });
    run(d, c, 4);
    expect(d[0].mode).toBe('dock');
    expect(c.stash.crystal).toBe(2);
  });
});

describe('drone roles in saves and the game', () => {
  it('v11 saves migrate with every bay on survey; bad roles are dropped; roles round-trip', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(12);
    const old = { ...defaultSave(), v: 11 } as Record<string, unknown>;
    delete old.drones;
    expect(parseSave(JSON.stringify(old)).drones).toEqual({});
    const bad = { ...defaultSave(), drones: { '2,1': 'guard', '3,1': 'laser', 'x': 'miner', '4,1': 'survey', '5,2': 7 } };
    expect(parseSave(JSON.stringify(bad)).drones).toEqual({ '2,1': 'guard' });
    expect(parseSave(JSON.stringify([1, 2])).drones).toEqual({});
    const s = { ...defaultSave(), drones: { '-3,2': 'hauler' as DroneRole } };
    expect(parseSave(serializeSave(s)).drones).toEqual({ '-3,2': 'hauler' });
  });

  it('pressing E at a bay cycles its role, launches a field drone, and saves the role', () => {
    const g = new Game();
    const w = g.world;
    w.set(w.padX + 1, w.padY - 1, T.SOLAR);
    w.set(w.padX + 2, w.padY - 1, T.DRONE);
    g.body.x = w.padX + 1.5;
    g.body.y = w.padY;
    g.drainEvents();
    expect(g.interact()).toBe(true);
    expect(g.droneRole('2,1')).toBe('miner');
    expect(g.drainEvents().some((e) => e.t === 'dronerole')).toBe(true);
    expect(g.drones.length).toBe(1);
    expect(g.toSave().drones).toEqual({ '2,1': 'miner' });
    // A non-survey bay no longer makes survey loads.
    const wire = g.stash.copper_wire ?? 0;
    for (let i = 0; i < 30 * 40; i++) g.step(1 / 30, NO_CONTROLS);
    expect(g.stash.copper_wire ?? 0).toBe(wire);
    // Cycling back to survey removes the field drone.
    g.setDroneRole('2,1', 'survey');
    expect(g.drones.length).toBe(0);
    expect(g.toSave().drones).toEqual({});
  });
});

describe('drone bay by tap', () => {
  it('a press on a bay (touch tap or click) cycles its role and the hint names it', () => {
    const g = new Game();
    const w = g.world;
    w.set(w.padX + 2, w.padY - 1, T.DRONE);
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    expect(g.hintAutomation(true)).toContain('Survey');
    g.step(1 / 60, { ...NO_CONTROLS, dig: true, aim: { tx: w.padX + 2, ty: w.padY - 1 } });
    g.step(1 / 60, NO_CONTROLS);
    expect(g.droneRole('2,1')).toBe('miner');
    expect(g.hintAutomation(true)).toContain('Miner');
    expect(g.hintAutomation(true)).toContain('Tap the bay');
  });
});
