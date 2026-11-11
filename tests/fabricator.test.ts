import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { RECIPES } from '../src/sim/recipes';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { automationHint } from '../src/sim/power';

describe('fabricator upgrade path', () => {
  it('locks machine recipes until the fabricator is upgraded', () => {
    const g = new Game();
    g.stash = { metal: 20, crystal: 5, copper_wire: 10, iron_scrap: 20, rust: 20 };
    expect(g.craft('solar')).toBe(false);
    expect(g.craft('smelter')).toBe(false);
    expect(g.buyUpgrade('fab')).toBe(true);
    expect(g.craft('solar')).toBe(true);
    expect(g.craft('miner')).toBe(false);
    expect(g.buyUpgrade('fab')).toBe(true);
    expect(g.craft('miner')).toBe(true);
    expect(g.craft('smelter')).toBe(true);
    expect(g.buyUpgrade('fab')).toBe(false);
  });
  it('gates every machine recipe and keeps basics free', () => {
    for (const id of ['solar', 'battery', 'miner', 'smelter']) expect(RECIPES.find((r) => r.id === id)?.fab).toBeGreaterThan(0);
    expect(RECIPES.find((r) => r.id === 'torch')?.fab ?? 0).toBe(0);
  });
  it('persists the fabricator level and old saves load at level 0', () => {
    const s = defaultSave();
    s.upgrades = { fab: 2 };
    expect(parseSave(serializeSave(s))?.upgrades.fab).toBe(2);
    expect(parseSave(serializeSave(defaultSave()))?.upgrades.fab ?? 0).toBe(0);
  });
  it('hints at the fabricator before machines can be made', () => {
    expect(automationHint({ solars: 0, miners: 0 }, { iron_scrap: 6, rust: 10 }, 0, false, 0)).toMatch(/Fabricator/);
    expect(automationHint({ solars: 0, miners: 0 }, { metal: 2, crystal: 1 }, 0, false, 1)).toMatch(/Solar/);
  });
});
