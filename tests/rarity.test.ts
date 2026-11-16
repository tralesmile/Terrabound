import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { BASE_STATS, sanitizeGear } from '../src/sim/gear';
import { PREFIXES, PREFIX_IDS, RARITY, applyPrefixes, oddsText, pickPrefix, prefixedName, rarityOf, rollReforge } from '../src/sim/rarity';

const rich = (): Game => {
  const g = new Game(defaultSave());
  g.stash = { metal: 500, iron_scrap: 500, copper_wire: 500, crystal: 500, biomass: 500 };
  return g;
};

describe('weapon rarity and prefixes', () => {
  it('every slot has prefixes in every rarity, and odds print as 60/30/10', () => {
    for (const slot of ['melee', 'ranged'] as const)
      for (const r of ['common', 'rare', 'epic'] as const) expect(PREFIX_IDS.some((p) => PREFIXES[p].slot === slot && PREFIXES[p].rarity === r)).toBe(true);
    expect(oddsText()).toBe('60% common / 30% rare / 10% epic');
    expect(rarityOf(undefined)).toBe('common');
    expect(prefixedName('Plasma axe', 'brutal')).toBe('Brutal Plasma axe');
    expect(prefixedName('Plasma axe', undefined)).toBe('Plasma axe');
  });

  it('pickPrefix follows the rarity weights, matches the slot and never repeats the avoided prefix', () => {
    expect(PREFIXES[pickPrefix('melee', 0.1, 0.5)].rarity).toBe('common');
    expect(PREFIXES[pickPrefix('melee', 0.7, 0.5)].rarity).toBe('rare');
    expect(PREFIXES[pickPrefix('ranged', 0.95, 0.5)].rarity).toBe('epic');
    const counts = { common: 0, rare: 0, epic: 0 };
    for (let i = 0; i < 3000; i++) {
      const p = rollReforge('ranged', 'rail_rifle', i, 1234);
      expect(PREFIXES[p].slot).toBe('ranged');
      counts[PREFIXES[p].rarity]++;
      const q = rollReforge('melee', 'plasma_axe', i, 99, 'sharp');
      expect(q).not.toBe('sharp');
    }
    expect(counts.common / 3000).toBeGreaterThan(0.53);
    expect(counts.common / 3000).toBeLessThan(0.67);
    expect(counts.epic / 3000).toBeGreaterThan(0.06);
    expect(counts.epic / 3000).toBeLessThan(0.14);
    // Same inputs, same roll.
    expect(rollReforge('melee', 'arc_spear', 5, 42)).toBe(rollReforge('melee', 'arc_spear', 5, 42));
  });

  it('applyPrefixes folds melee and ranged prefixes into the stats', () => {
    const s = applyPrefixes(BASE_STATS, 'godly', 'piercing');
    expect(s.meleeDmg).toBe(Math.round(12 * 1.25));
    expect(s.meleeCd).toBeCloseTo(0.28 * 0.85);
    expect(s.meleeRange).toBeCloseTo(2.5);
    expect(s.rangedDmg).toBe(Math.round(8 * 1.15));
    expect(s.pierce).toBe(true);
    const v = applyPrefixes(BASE_STATS, 'vampiric', 'bouncy');
    expect(v.leech).toBe(2);
    expect(v.bounces).toBe(1);
    // A prefix in the wrong slot is ignored.
    expect(applyPrefixes(BASE_STATS, 'heavy', 'sharp')).toEqual(BASE_STATS);
  });

  it('reforging at the base pays the visible price, sets a prefix and changes the weapon stats', () => {
    const g = rich();
    const before = g.gear.meleeDmg;
    const wire = g.stash.copper_wire ?? 0;
    expect(g.canReforge('energy_blade')).toBe(true);
    expect(g.canReforge('scout_helm')).toBe(false);
    expect(g.reforge('pulse_pistol')).toBe(true);
    expect(g.stash.copper_wire).toBe(wire - 6);
    const p = g.prefixOf('pulse_pistol');
    expect(p && PREFIXES[p].slot).toBe('ranged');
    // Reforge the blade until it rolls a damage prefix; the cached stats follow.
    let tries = 0;
    while (!PREFIXES[g.prefixOf('energy_blade') ?? 'swift'].dmg && tries++ < 40) g.reforge('energy_blade');
    expect(g.gear.meleeDmg).toBeGreaterThan(before);
    const ev = g.drainEvents().filter((e) => e.t === 'reforge');
    expect(ev.length).toBeGreaterThan(1);
    // A reforge never gives the same prefix twice in a row.
    const last = g.prefixOf('energy_blade');
    g.reforge('energy_blade');
    expect(g.prefixOf('energy_blade')).not.toBe(last);
  });

  it('cannot reforge without the materials or an unowned weapon', () => {
    const g = new Game(defaultSave());
    g.stash = {};
    expect(g.canReforge('energy_blade')).toBe(false);
    expect(g.reforge('energy_blade')).toBe(false);
    const r = rich();
    expect(r.canReforge('plasma_axe')).toBe(false);
  });

  it('prefixes survive a save round trip; v29 saves load with none; junk is dropped without throwing', () => {
    const g = rich();
    g.reforge('energy_blade');
    const s = parseSave(serializeSave(g.toSave()));
    expect(s.gear.prefix.energy_blade).toBe(g.prefixOf('energy_blade'));
    expect(s.gear.reforges).toBe(1);
    const v29 = { ...JSON.parse(serializeSave(defaultSave())), v: 29 };
    delete v29.gear.prefix;
    delete v29.gear.reforges;
    const old = parseSave(JSON.stringify(v29));
    expect(old.gear.prefix).toEqual({});
    expect(old.gear.reforges).toBe(0);
    const bad = sanitizeGear({ owned: ['energy_blade', 'pulse_pistol'], prefix: { energy_blade: 'heavy', pulse_pistol: 'rapid', plasma_axe: 'sharp', nope: 'godly', scout_helm: 7 }, reforges: -3 });
    expect(bad.prefix).toEqual({ pulse_pistol: 'rapid' });
    expect(bad.reforges).toBe(0);
    expect(() => parseSave('{"v":30,"gear":{"prefix":[1,2],"reforges":"x"}}')).not.toThrow();
  });

  it('rarity colours are distinct', () => {
    const cs = new Set(Object.values(RARITY).map((r) => r.color));
    expect(cs.size).toBe(3);
  });
});
