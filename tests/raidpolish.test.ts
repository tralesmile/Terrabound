import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T, TILES, ITEMS, PLACEABLE } from '../src/sim/tiles';
import { makeEnemy } from '../src/sim/enemies';
import { BLUEPRINT_EVERY, CHEW_TIME, RAID_BLUEPRINTS, blueprintDrop, blueprintRaids, chewTarget, hasBlueprint } from '../src/sim/raids';
import { REINFORCED_MULT, SHIELD_MULT, TURRET_CD, TURRET_DMG, TURRET_RANGE, chewTime, stepTurrets, syncTurrets, turretStats } from '../src/sim/defences';
import { recipeById } from '../src/sim/recipes';
import { upgradeById } from '../src/sim/upgrades';
import { BASE_KEEP } from '../src/sim/base';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { Game, NO_CONTROLS } from '../src/sim/game';

/** Open 120x60 world, pad at (60, 20), flat floor at row 20. */
function flat(): World {
  const w = new World(120, 60, 7);
  Object.assign(w, { padX: 60, padY: 20 });
  for (let y = 20; y < 60; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
  return w;
}

describe('raiders and base floors', () => {
  it('a raider standing on a floor block resting on ground does not chew down through it', () => {
    const w = flat();
    w.set(57, 19, T.METAL);
    const e = makeEnemy(1, 'crawler', 57.5, 19);
    e.raid = true;
    e.dir = 1;
    expect(chewTarget(w, e)).toBeNull();
  });
  it('a roof over open space can still be chewed from above', () => {
    const w = flat();
    // Roof at row 16 over an open room (rows 17-19 empty below it).
    w.set(57, 16, T.METAL);
    const e = makeEnemy(1, 'crawler', 57.5, 16);
    e.raid = true;
    e.dir = 1;
    expect(chewTarget(w, e)).toEqual({ x: 57, y: 16 });
  });
  it('side blocks are still chewed', () => {
    const w = flat();
    w.set(56, 19, T.METAL);
    const e = makeEnemy(1, 'crawler', 55.5, 20);
    e.raid = true;
    e.dir = 1;
    expect(chewTarget(w, e)).toEqual({ x: 56, y: 19 });
  });
});

describe('raid blueprints', () => {
  it('drop every BLUEPRINT_EVERY raids in order, and only on that raid', () => {
    expect(BLUEPRINT_EVERY).toBe(3);
    expect(blueprintDrop(0)).toBeNull();
    expect(blueprintDrop(1)).toBeNull();
    expect(blueprintDrop(3)?.id).toBe('turret_mk2');
    expect(blueprintDrop(4)).toBeNull();
    expect(blueprintDrop(6)?.id).toBe('shield');
    expect(blueprintDrop(9)?.id).toBe('turret_mk3');
    expect(blueprintDrop(12)).toBeNull();
    expect(hasBlueprint(5, 'turret_mk2')).toBe(true);
    expect(hasBlueprint(5, 'shield')).toBe(false);
    expect(RAID_BLUEPRINTS.length).toBe(3);
  });
  it('shop gates match the blueprint table', () => {
    expect(recipeById('shield')?.raids).toBe(blueprintRaids('shield'));
    const up = upgradeById('turret');
    expect(up?.needRaids?.(0)).toBe(blueprintRaids('turret_mk2'));
    expect(up?.needRaids?.(1)).toBe(blueprintRaids('turret_mk3'));
  });
  it('the turret core and shield wall cannot be bought before the blueprint, then can', () => {
    const s = defaultSave();
    s.stash = { metal: 99, copper_wire: 99, crystal: 99, circuit: 99, iron_scrap: 99, rust: 99 };
    s.upgrades.fab = 2;
    const g = new Game(s);
    expect(g.isAtBase()).toBe(true);
    expect(g.buyUpgrade('turret')).toBe(false);
    expect(g.craft('shield')).toBe(false);
    g.stats.raids = 3;
    expect(g.buyUpgrade('turret')).toBe(true);
    expect(g.upgrades.turret).toBe(1);
    expect(g.buyUpgrade('turret')).toBe(false); // Mk III needs 9
    expect(g.craft('shield')).toBe(false);
    g.stats.raids = 9;
    expect(g.craft('shield')).toBe(true);
    expect(g.carried.shield).toBe(4);
    expect(g.buyUpgrade('turret')).toBe(true);
    expect(g.upgrades.turret).toBe(2);
  });
  it('a raid clear on the third night announces the blueprint', () => {
    const s = defaultSave();
    s.stats.raids = 2;
    const g = new Game(s);
    g.raid = { plan: [], t: 0, next: 0, ids: [], total: 2 };
    g.step(1 / 30, NO_CONTROLS);
    const ev = g.drainEvents().find((e) => e.t === 'raidclear');
    expect(ev && ev.t === 'raidclear' ? ev.blueprint : undefined).toBe('Turret Mk II');
  });
  it('turret core level survives a save round trip; old saves have none', () => {
    const s = defaultSave();
    s.upgrades.turret = 2;
    expect(parseSave(serializeSave(s)).upgrades.turret).toBe(2);
    const old = JSON.parse(serializeSave(defaultSave()));
    delete old.upgrades.turret;
    expect(parseSave(JSON.stringify(old)).upgrades.turret ?? 0).toBe(0);
  });
});

describe('turret tiers and shield wall', () => {
  it('each tier adds range and damage and fires faster', () => {
    expect(turretStats(0)).toEqual({ range: TURRET_RANGE, dmg: TURRET_DMG, cd: TURRET_CD });
    const a = turretStats(1);
    const b = turretStats(2);
    expect(a.range).toBeGreaterThan(TURRET_RANGE);
    expect(b.range).toBeGreaterThan(a.range);
    expect(b.dmg).toBeGreaterThan(a.dmg);
    expect(b.cd).toBeLessThan(a.cd);
    expect(turretStats(9)).toEqual(b);
  });
  it('a Mk II turret reaches a raider a Mk I turret cannot', () => {
    const w = flat();
    w.set(60, 19, T.TURRET);
    const ts = syncTurrets(w, []);
    const e = makeEnemy(1, 'crawler', 60.5 + TURRET_RANGE + 0.8, 20);
    e.raid = true;
    expect(stepTurrets(w, ts, [e], 1, 1 / 30, 0).length).toBe(0);
    expect(stepTurrets(w, ts, [e], 1, 1 / 30, 1).length).toBe(1);
  });
  it('shield walls are solid, kept, placeable and take six times as long to chew', () => {
    expect(TILES[T.SHIELD].solid).toBe(true);
    expect(TILES[T.SHIELD].drop).toBe('shield');
    expect(ITEMS.shield.places).toBe(T.SHIELD);
    expect(PLACEABLE).toContain('shield');
    expect(BASE_KEEP.has(T.SHIELD)).toBe(true);
    expect(SHIELD_MULT).toBeGreaterThan(REINFORCED_MULT);
    expect(chewTime(T.SHIELD)).toBe(CHEW_TIME * SHIELD_MULT);
  });
});
