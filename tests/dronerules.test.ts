import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T } from '../src/sim/tiles';
import {
  RULE_ACTS, RULE_CONDS, RULE_MAX, REPAIR_HPS, actingRole, nextAct, nextCond, sanitizeRules, listBays, stepFieldDrones, syncDrones,
  type DroneCtx, type DroneEvent, type DroneRule, type FieldDrone, type RuleFacts,
} from '../src/sim/drones';
import { parseSave, serializeSave, defaultSave, SAVE_VERSION } from '../src/sim/save';
import { Game } from '../src/sim/game';

const NONE: RuleFacts = { night: false, enemy: false, packHalf: false, hpLow: false, deep: false };

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

function run(drones: FieldDrone[], c: DroneCtx, secs: number, dt = 1 / 30): DroneEvent[] {
  const all: DroneEvent[] = [];
  for (let i = 0; i < secs / dt; i++) all.push(...stepFieldDrones(drones, c, dt));
  return all;
}

describe('drone rules', () => {
  it('first true rule wins; no true rule falls back to the role; survey ignores rules', () => {
    const rules: DroneRule[] = [
      { when: 'hp_low', then: 'repair' },
      { when: 'enemy', then: 'guard' },
    ];
    expect(actingRole('miner', rules, NONE)).toBe('miner');
    expect(actingRole('miner', rules, { ...NONE, enemy: true })).toBe('guard');
    expect(actingRole('miner', rules, { ...NONE, enemy: true, hpLow: true })).toBe('repair');
    expect(actingRole('survey', rules, { ...NONE, hpLow: true })).toBe('survey');
    expect(actingRole('hauler', undefined, { ...NONE, night: true })).toBe('hauler');
  });

  it('cycling visits every condition and action and wraps', () => {
    let c = RULE_CONDS[0];
    for (let i = 0; i < RULE_CONDS.length; i++) c = nextCond(c);
    expect(c).toBe(RULE_CONDS[0]);
    let a = RULE_ACTS[0];
    const seen = new Set<string>();
    for (let i = 0; i < RULE_ACTS.length; i++) {
      seen.add(a);
      a = nextAct(a);
    }
    expect(seen.size).toBe(RULE_ACTS.length);
  });

  it('sanitizeRules drops junk and caps at RULE_MAX without throwing', () => {
    expect(sanitizeRules(null)).toEqual([]);
    expect(sanitizeRules('x')).toEqual([]);
    const mixed = [{ when: 'night', then: 'guard' }, { when: 'nope', then: 'guard' }, 7, null, { when: 'enemy', then: 'fly' }, { when: 'deep', then: 'home' }, { when: 'hp_low', then: 'repair' }, { when: 'night', then: 'miner' }];
    expect(sanitizeRules(mixed)).toEqual([{ when: 'night', then: 'guard' }, { when: 'deep', then: 'home' }, { when: 'hp_low', then: 'repair' }]);
    expect(sanitizeRules(mixed).length).toBe(RULE_MAX);
  });

  it('an "enemy near -> guard" rule turns a miner into a shooter while the enemy is close', () => {
    const w = testWorld();
    const d = syncDrones([], listBays(w), { '2,1': 'miner' });
    const enemies = [{ id: 1, x: 41, y: 29, hp: 30 }];
    const c = ctx(w, { enemies, rules: { '2,1': [{ when: 'enemy', then: 'guard' }] }, facts: { ...NONE, enemy: true } });
    const ev = run(d, c, 6);
    expect(d[0].act).toBe('guard');
    expect(ev.some((e) => e.t === 'droneshot')).toBe(true);
    // Enemy gone: back to mining (no shots, act returns to the role).
    c.facts = NONE;
    run(d, c, 0.2);
    expect(d[0].act).toBe('miner');
  });

  it('a "go home" rule docks the drone and banks its cargo', () => {
    const w = testWorld();
    const d = syncDrones([], listBays(w), { '2,1': 'guard' });
    const c = ctx(w);
    run(d, c, 3);
    expect(d[0].mode).not.toBe('dock');
    d[0].cargo = { rust: 2 };
    c.rules = { '2,1': [{ when: 'night', then: 'home' }] };
    c.facts = { ...NONE, night: true };
    const ev = run(d, c, 8);
    expect(d[0].mode).toBe('dock');
    expect(c.stash.rust).toBe(2);
    expect(ev.some((e) => e.t === 'dronebank')).toBe(true);
  });

  it('a repair drone stays docked at full health and heals at REPAIR_HPS when hurt', () => {
    const w = testWorld();
    const d = syncDrones([], listBays(w), { '2,1': 'repair' });
    const c = ctx(w, { hp: 100, maxHp: 100 });
    run(d, c, 2);
    expect(d[0].mode).toBe('dock');
    c.hp = 50;
    const ev = run(d, c, 10);
    const healed = ev.filter((e) => e.t === 'dronerepair').reduce((n, e) => n + (e.t === 'dronerepair' ? e.hp : 0), 0);
    expect(healed).toBeGreaterThan(REPAIR_HPS * 5);
    expect(healed).toBeLessThanOrEqual(50 + 1e-9);
    expect(c.hp).toBeCloseTo(50 + healed, 6);
  });

  it('game: rules save, sanitize and a repair drone heals the player', () => {
    const g = new Game();
    const w = g.world;
    w.set(w.padX + 1, w.padY - 1, T.SOLAR);
    w.set(w.padX + 2, w.padY - 1, T.DRONE);
    g.setDroneRole('2,1', 'repair');
    expect(g.setDroneRules('2,1', [{ when: 'hp_low', then: 'repair' }, { when: 'bad' as never, then: 'guard' }])).toEqual([{ when: 'hp_low', then: 'repair' }]);
    expect(g.toSave().droneRules).toEqual({ '2,1': [{ when: 'hp_low', then: 'repair' }] });
    g.setDroneRules('2,1', []);
    expect(g.toSave().droneRules).toEqual({});
    const facts = g.ruleFacts();
    expect(facts.hpLow).toBe(false);
    g.hp = 10;
    expect(g.ruleFacts().hpLow).toBe(true);
  });
});

describe('save v13 drone rules', () => {
  it('v12 saves migrate to no rules; v13 round-trips; junk is dropped', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(13);
    const v12 = { ...defaultSave(), v: 12 } as Record<string, unknown>;
    delete v12.droneRules;
    v12.drones = { '2,1': 'guard' };
    const m = parseSave(JSON.stringify(v12));
    expect(m.droneRules).toEqual({});
    expect(m.drones).toEqual({ '2,1': 'guard' });
    const s = defaultSave();
    s.drones = { '2,1': 'repair' };
    s.droneRules = { '2,1': [{ when: 'enemy', then: 'guard' }] };
    expect(parseSave(serializeSave(s)).droneRules).toEqual({ '2,1': [{ when: 'enemy', then: 'guard' }] });
    const junk = { ...defaultSave(), droneRules: { 'x;y': [{ when: 'night', then: 'guard' }], '1,1': 'no', '2,2': [{ when: 'night', then: 'teleport' }] } };
    expect(parseSave(JSON.stringify(junk)).droneRules).toEqual({});
    expect(() => parseSave(JSON.stringify({ ...defaultSave(), droneRules: [1, 2] }))).not.toThrow();
  });
});
