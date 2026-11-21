import { describe, expect, it } from 'vitest';
import { GEAR } from '../src/sim/gear';

describe('hunting weapon set', () => {
  it('is craftable (no boss or garage), and each fills a distinct role', () => {
    for (const id of ['hunter_knife', 'twin_blaster', 'hunting_rifle'] as const) {
      expect(GEAR[id].bossOnly).toBeFalsy();
      expect(GEAR[id].garage).toBeFalsy();
      expect(Object.keys(GEAR[id].cost).length).toBeGreaterThan(0);
    }
    const k = GEAR.hunter_knife.mod;
    expect(k.meleeCd).toBeLessThan(GEAR.arc_spear.mod.meleeCd ?? 1);
    expect(k.meleeRange).toBeLessThan(GEAR.arc_spear.mod.meleeRange ?? 0);
    expect(GEAR.twin_blaster.mod.rangedCd).toBeLessThan(0.3);
    expect(GEAR.twin_blaster.mod.rangedDmg).toBeLessThan(GEAR.scatter_gun.mod.rangedDmg ?? 0);
    expect(GEAR.hunting_rifle.mod.ranged).toBe('rail');
    expect(GEAR.hunting_rifle.mod.rangedDmg).toBeGreaterThan(GEAR.rail_rifle.mod.rangedDmg ?? 99);
    expect(GEAR.hunting_rifle.mod.rangedCd).toBeGreaterThan(GEAR.rail_rifle.mod.rangedCd ?? 0);
  });
});
