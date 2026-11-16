import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { ACC_SLOTS, BASE_STATS, GEAR, GEAR_IDS, GEAR_SLOTS, gearStats, sanitizeGear, toggleAccessory, type GearId } from '../src/sim/gear';
import { trinketPixels, BELT_ROW, PLAYER_W } from '../src/render/sprites';
import { DOLL_SLOTS, dollLayout } from '../src/ui/dollslots';
import { CHEST_ACCESSORIES, accessoryChance, chestAccessory } from '../src/sim/loot';
import { T } from '../src/sim/tiles';

const ACCS = GEAR_IDS.filter((id) => GEAR[id].slot === 'acc');

const rich = (): Game => {
  const g = new Game(defaultSave());
  g.stash = { metal: 500, iron_scrap: 500, copper_wire: 500, crystal: 500, biomass: 500 };
  return g;
};

describe('accessories', () => {
  it('there are at least 6 craftable accessories, none in the single-item slot list', () => {
    expect(ACCS.length).toBeGreaterThanOrEqual(6);
    for (const id of ACCS) {
      expect(GEAR[id].bossOnly).toBeFalsy();
      expect(Object.keys(GEAR[id].cost).length).toBeGreaterThan(0);
      expect(GEAR[id].desc.startsWith('Accessory')).toBe(true);
    }
    expect(GEAR_SLOTS).not.toContain('acc');
  });

  it('worn accessories stack their stats with the loadout', () => {
    const base = gearStats({});
    expect(gearStats({}, ['vital_heart']).maxHp).toBe(base.maxHp + 15);
    const s = gearStats({ feet: 'spring_boots' }, ['feather_charm', 'aegis_charm', 'grip_gloves']);
    expect(s.airJumps).toBe(2);
    expect(s.armor).toBeCloseTo(0.08);
    expect(s.digMul).toBeCloseTo(1.15);
    expect(gearStats({}, ['magnet_ring']).magnet).toBe(6);
    expect(gearStats({}, ['power_coil']).drainMul).toBeCloseTo(0.85);
    expect(gearStats({}, ['lamp_shard']).light).toBe(BASE_STATS.light + 2);
  });

  it('only the first ACC_SLOTS accessories count, and non-accessories in the list are ignored', () => {
    const four = ['vital_heart', 'aegis_charm', 'lamp_shard', 'grip_gloves'] as GearId[];
    expect(gearStats({}, four).digMul).toBe(1);
    expect(gearStats({}, ['plate_vest']).armor).toBe(0);
  });

  it('toggleAccessory fills the first free socket, takes a worn one off, refuses when full', () => {
    let acc: GearId[] = [];
    acc = toggleAccessory(acc, 'vital_heart')!;
    acc = toggleAccessory(acc, 'lamp_shard')!;
    expect(acc).toEqual(['vital_heart', 'lamp_shard']);
    acc = toggleAccessory(acc, 'vital_heart')!;
    expect(acc).toEqual(['lamp_shard']);
    acc = toggleAccessory(toggleAccessory(acc, 'aegis_charm')!, 'grip_gloves')!;
    expect(acc.length).toBe(ACC_SLOTS);
    expect(toggleAccessory(acc, 'magnet_ring')).toBeNull();
  });

  it('crafting wears it; a fourth accessory is owned but refused with an accfull event', () => {
    const g = rich();
    const hp0 = g.derived.maxHp;
    expect(g.craftGear('vital_heart')).toBe(true);
    expect(g.isWorn('vital_heart')).toBe(true);
    expect(g.derived.maxHp).toBe(hp0 + 15);
    g.craftGear('aegis_charm');
    g.craftGear('lamp_shard');
    expect(g.craftGear('grip_gloves')).toBe(true);
    expect(g.ownsGear('grip_gloves')).toBe(true);
    expect(g.isWorn('grip_gloves')).toBe(false);
    expect(g.drainEvents().map((e) => e.t)).toContain('accfull');
    // Take one off, then the fourth fits.
    g.equipGear('lamp_shard');
    expect(g.equipGear('grip_gloves')).toBe(true);
    expect(g.accessories).toEqual(['vital_heart', 'aegis_charm', 'grip_gloves']);
    // Taking off the heart lowers max HP and clamps current HP.
    g.hp = g.derived.maxHp;
    g.equipGear('vital_heart');
    expect(g.hp).toBe(g.derived.maxHp);
  });

  it('worn accessories survive a save round trip', () => {
    const g = rich();
    g.craftGear('feather_charm');
    g.craftGear('power_coil');
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.gear.acc).toEqual(['feather_charm', 'power_coil']);
    expect(new Game(back).gear.airJumps).toBe(1);
  });

  it('a v28 save (no acc field) loads with empty sockets; bad acc entries are dropped', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(29);
    const v28 = { ...JSON.parse(serializeSave(defaultSave())), v: 28, gear: { owned: ['energy_blade', 'pulse_pistol', 'plate_vest'], equip: { melee: 'energy_blade', ranged: 'pulse_pistol', body: 'plate_vest' } } };
    delete v28.gear.acc;
    const s = parseSave(JSON.stringify(v28));
    expect(s.gear.acc).toEqual([]);
    expect(s.gear.equip.body).toBe('plate_vest');
    const bad = sanitizeGear({ owned: ['vital_heart', 'lamp_shard', 'aegis_charm', 'grip_gloves', 'plate_vest'], acc: ['vital_heart', 'vital_heart', 'nope', 7, 'plate_vest', 'magnet_ring', 'lamp_shard', 'aegis_charm', 'grip_gloves'] });
    // Duplicates, unknown ids, non-accessories and unowned ones dropped; capped at 3.
    expect(bad.acc).toEqual(['vital_heart', 'lamp_shard', 'aegis_charm']);
    expect(() => parseSave('{"v":29,"gear":{"acc":null}}')).not.toThrow();
  });
});

describe('accessory visuals', () => {
  it('belt gems sit on the belt row, mirror when facing left, cap at 3', () => {
    const r = trinketPixels(2, 1, false);
    expect(r.length).toBe(2);
    expect(r.every((p) => p.r === BELT_ROW + 1)).toBe(true);
    const l = trinketPixels(2, 1, true);
    expect(l[0].c).toBe(PLAYER_W - 1 - r[0].c);
    expect(trinketPixels(5, 0, false).length).toBe(3);
  });

  it('doll layout: 5 worn sockets then 3 accessory sockets in one row inside the width', () => {
    const rects = dollLayout(10, 20, 300, 52);
    expect(rects.length).toBe(DOLL_SLOTS.length + ACC_SLOTS);
    const last = rects[rects.length - 1];
    expect(last.x + last.size).toBeLessThanOrEqual(310);
    expect(rects.every((r) => r.y === 20 && r.size === rects[0].size)).toBe(true);
    // The accessory group is set apart by a wider gap.
    const g1 = rects[1].x - (rects[0].x + rects[0].size);
    const g5 = rects[5].x - (rects[4].x + rects[4].size);
    expect(g5).toBeGreaterThan(g1);
    expect(rects.slice(5).every((r) => 'acc' in r.key)).toBe(true);
  });
});

describe('accessories found in chests', () => {
  it('about 10% of shallow chests and up to 30% of deep ones hold an accessory, never an owned one', () => {
    expect(accessoryChance(0)).toBeCloseTo(0.1);
    expect(accessoryChance(-20)).toBeCloseTo(0.1);
    expect(accessoryChance(1000)).toBeCloseTo(0.3);
    let shallow = 0;
    let deep = 0;
    for (let i = 0; i < 2000; i++) {
      if (chestAccessory(7, 100 + i * 3, 50, 0, [])) shallow++;
      if (chestAccessory(7, 100 + i * 3, 300, 200, [])) deep++;
    }
    expect(shallow / 2000).toBeGreaterThan(0.06);
    expect(shallow / 2000).toBeLessThan(0.14);
    expect(deep).toBeGreaterThan(shallow * 2);
    for (let i = 0; i < 300; i++) {
      const got = chestAccessory(9, i * 5, 80, 100, ['vital_heart', 'feather_charm']);
      expect(got === null || (got !== 'vital_heart' && got !== 'feather_charm')).toBe(true);
    }
    expect(chestAccessory(9, 10, 80, 100, CHEST_ACCESSORIES)).toBeNull();
    expect(chestAccessory(3, 44, 91, 50, [])).toBe(chestAccessory(3, 44, 91, 50, []));
  });

  it('the first look into a lucky chest grants and wears the accessory once', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    let spot: { x: number; y: number } | null = null;
    for (let x = 20; x < w.w - 20 && !spot; x++) {
      const y = w.padY + 30;
      if (chestAccessory(w.seed, x, y, y - w.padY, g.toSave().gear.owned)) spot = { x, y };
    }
    expect(spot).not.toBeNull();
    const { x, y } = spot!;
    w.set(x, y, T.CHEST);
    w.chests.delete(y * w.w + x);
    g.drainEvents();
    expect(g.openChestAt(x, y)).toBe(true);
    const found = g.drainEvents().find((e) => e.t === 'gearfound');
    expect(found && found.t === 'gearfound' && found.worn).toBe(true);
    const id = found && found.t === 'gearfound' ? found.id : null;
    expect(id && g.ownsGear(id) && g.isWorn(id)).toBe(true);
    g.chestOpen = null;
    g.openChestAt(x, y);
    expect(g.drainEvents().some((e) => e.t === 'gearfound')).toBe(false);
    expect(g.toSave().gear.owned.filter((o) => o === id).length).toBe(1);
  });

  it('a placed storage chest never rolls an accessory', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    for (let x = 20; x < 400; x++) {
      const y = w.padY + 30;
      w.chests.set(y * w.w + x, {});
      g.chestContents(x, y);
    }
    expect(g.toSave().gear.owned.some((id) => GEAR[id].slot === 'acc')).toBe(false);
  });
});
