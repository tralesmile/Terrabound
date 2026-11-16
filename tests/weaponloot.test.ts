import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { BOSSES } from '../src/sim/bosses';
import { GEAR } from '../src/sim/gear';
import { CHEST_WEAPONS, bossWeapon, chestAccessory, chestWeapon, rarityRank, weaponChance } from '../src/sim/loot';
import { PREFIXES } from '../src/sim/rarity';
import { T } from '../src/sim/tiles';

describe('rolled weapon drops', () => {
  it('chest weapons are the craftable weapons only (no starters, no boss trophies)', () => {
    expect(CHEST_WEAPONS.length).toBeGreaterThan(3);
    for (const id of CHEST_WEAPONS) {
      expect(['melee', 'ranged']).toContain(GEAR[id].slot);
      expect(GEAR[id].bossOnly).toBeFalsy();
      expect(Object.keys(GEAR[id].cost).length).toBeGreaterThan(0);
    }
    expect(CHEST_WEAPONS).not.toContain('energy_blade');
    expect(CHEST_WEAPONS).not.toContain('pulse_pistol');
  });

  it('weapon chance rises with depth and is capped', () => {
    expect(weaponChance(-5)).toBeCloseTo(0.06);
    expect(weaponChance(100)).toBeGreaterThan(weaponChance(0));
    expect(weaponChance(10000)).toBe(0.2);
  });

  it('a chest weapon is never owned, carries a prefix of its own slot, and is deterministic', () => {
    let hits = 0;
    const owned = ['plasma_axe' as const];
    for (let x = 0; x < 600; x++) {
      const w = chestWeapon(42, x, 300, 200, owned);
      expect(chestWeapon(42, x, 300, 200, owned)).toEqual(w);
      if (!w) continue;
      hits++;
      expect(owned).not.toContain(w.id);
      expect(CHEST_WEAPONS).toContain(w.id);
      expect(PREFIXES[w.prefix].slot).toBe(GEAR[w.id].slot);
    }
    expect(hits / 600).toBeGreaterThan(0.1);
    expect(hits / 600).toBeLessThan(0.3);
    expect(chestWeapon(42, 5, 300, 200, CHEST_WEAPONS)).toBeNull();
  });

  it('boss refights hone the trophy with rare-or-better prefixes until it is epic; never on the first kill', () => {
    expect(bossWeapon(7, 'junk_hammer', 3, true, undefined)).toBeNull();
    let epic = 0;
    for (let s = 0; s < 400; s++) {
      const p = bossWeapon(7, 'junk_hammer', s, false, undefined);
      expect(p).not.toBeNull();
      expect(PREFIXES[p!].slot).toBe('melee');
      expect(rarityRank(p!)).toBeGreaterThanOrEqual(1);
      if (PREFIXES[p!].rarity === 'epic') epic++;
    }
    expect(epic / 400).toBeGreaterThan(0.15);
    expect(epic / 400).toBeLessThan(0.35);
    for (let s = 0; s < 100; s++) expect(bossWeapon(7, 'junk_hammer', s, false, 'godly')).toBeNull();
    for (let s = 0; s < 100; s++) {
      const p = bossWeapon(7, 'junk_hammer', s, false, 'brutal');
      if (p) expect(PREFIXES[p].rarity).toBe('epic');
    }
  });

  it('opening a chest with a weapon grants it with its prefix, emits weaponfound and saves', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    let spot: { x: number; y: number } | null = null;
    for (let y = w.padY + 50; y < w.padY + 400 && !spot; y++)
      for (let x = 10; x < w.w - 10 && !spot; x++) {
        if (chestAccessory(w.seed, x, y, y - w.padY, g.toSave().gear.owned)) continue;
        if (chestWeapon(w.seed, x, y, y - w.padY, g.toSave().gear.owned)) spot = { x, y };
      }
    expect(spot).not.toBeNull();
    const { x, y } = spot!;
    const find = chestWeapon(w.seed, x, y, y - w.padY, g.toSave().gear.owned)!;
    w.set(x, y, T.CHEST);
    g.drainEvents();
    g.chestContents(x, y);
    const ev = g.drainEvents().find((e) => e.t === 'weaponfound');
    expect(ev).toMatchObject({ t: 'weaponfound', id: find.id, prefix: find.prefix, boss: false });
    expect(g.ownsGear(find.id)).toBe(true);
    expect(g.prefixOf(find.id)).toBe(find.prefix);
    // Not auto-equipped: the starter stays in hand.
    expect(g.toSave().gear.equip[GEAR[find.id].slot as 'melee' | 'ranged']).not.toBe(find.id);
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.gear.prefix[find.id]).toBe(find.prefix);
    // A second look into the same chest finds nothing new.
    g.chestContents(x, y);
    expect(g.drainEvents().some((e) => e.t === 'weaponfound')).toBe(false);
  });

  it('a boss refight hones the trophy weapon in the sim', () => {
    const s = defaultSave();
    s.bosses.push('colossus');
    s.gear.owned.push(BOSSES.colossus.gear);
    const g = new Game(s);
    const w = g.world;
    let x0 = -1;
    for (let x = 60; x < w.w - 60 && x0 < 0; x++) if (w.biome[x] === BOSSES.colossus.biome && w.biome[x + 40] === BOSSES.colossus.biome && Math.abs(x - w.padX) > 80) x0 = x + 20;
    const y = w.surface[x0];
    for (let x = x0 - 40; x <= x0 + 40; x++) {
      for (let yy = y - 14; yy < y; yy++) w.set(x, yy, T.AIR);
      w.set(x, y, T.RUST);
    }
    g.body.x = x0 + 0.5;
    g.body.y = y;
    g.carried = { beacon_colossus: 1 };
    g.useItem('beacon_colossus');
    expect(g.boss).not.toBeNull();
    g.drainEvents();
    g.damageBoss(9999);
    const ev = g.drainEvents().find((e) => e.t === 'weaponfound');
    expect(ev).toMatchObject({ t: 'weaponfound', id: 'junk_hammer', boss: true });
    expect(rarityRank(g.prefixOf('junk_hammer'))).toBeGreaterThanOrEqual(1);
  });
});
