import { describe, expect, it } from 'vitest';
import type { Inventory } from '../src/sim/tiles';
import { Game, NO_CONTROLS } from '../src/sim/game';
import { T, ITEMS, TILES, isMinable } from '../src/sim/tiles';
import { RECIPES } from '../src/sim/recipes';
import { BATTERY_CAP, SMELT_RUST, SMELT_TIME, gridState, stepGrid, newPower, scanMachines, stepSmelting, stepMining, MINE_TIME, MINER_DRAW } from '../src/sim/power';
import { captureBase, sanitizeBase, stampBase } from '../src/sim/base';

describe('base power and smelter', () => {
  it('has content wired: items, tiles, recipes, minable, persisted in the base', () => {
    for (const id of ['solar', 'smelter'] as const) {
      expect(ITEMS[id].kit).toBe(true);
      expect(RECIPES.some((r) => r.out === id)).toBe(true);
    }
    expect(isMinable(T.SOLAR) && isMinable(T.SMELTER)).toBe(true);
    expect(TILES[T.SOLAR].drop).toBe('solar');
    expect(sanitizeBase([1, 1, T.SOLAR, 2, 1, T.SMELTER])).toEqual([1, 1, T.SOLAR, 2, 1, T.SMELTER]);
  });

  it('grid: solar scales with daylight, ratio is capped, idle smelters draw nothing', () => {
    expect(gridState(1, 1, 1, true).ratio).toBe(1);
    expect(gridState(1, 2, 1, true).ratio).toBeCloseTo(4 / 6);
    expect(gridState(2, 1, 0, true).working).toBe(false);
    expect(gridState(2, 1, 1, false).demand).toBe(0);
    expect(gridState(0, 0, 1, true).ratio).toBe(0);
  });

  it('smelting turns rust into metal at the expected rate and never goes negative', () => {
    const stash: Inventory = { rust: SMELT_RUST * 2 };
    const p = gridState(1, 1, 1, true);
    let prog = 0;
    let made = 0;
    for (let i = 0; i < SMELT_TIME * 2 * 10 + 5; i++) {
      const r = stepSmelting(stash, p, prog, 0.1);
      prog = r.progress;
      made += r.made;
    }
    expect(made).toBe(2);
    expect(stash.rust).toBe(0);
    expect(stash.metal).toBe(2);
    const empty = stepSmelting({ rust: 1 }, p, 0, 100);
    expect(empty.made).toBe(0);
    expect(empty.progress).toBeLessThanOrEqual(SMELT_TIME);
  });

  it('a built solar + smelter in the game makes metal from stash rust', () => {
    const g = new Game();
    g.world.set(g.world.padX + 1, g.world.padY - 1, T.SOLAR);
    g.world.set(g.world.padX + 2, g.world.padY - 1, T.SMELTER);
    expect(scanMachines(g.world)).toEqual({ solars: 1, smelters: 1, batteries: 0, miners: 0 });
    g.stash.rust = 8;
    g.stash.metal = 0;
    let smelts = 0;
    for (let i = 0; i < 60 * 20; i++) {
      g.step(1 / 60, NO_CONTROLS);
      for (const e of g.drainEvents()) if (e.t === 'smelt') smelts += e.made;
    }
    expect(smelts).toBe(2);
    expect(g.stash.metal).toBe(2);
    expect(g.stash.rust).toBe(0);
    expect(g.power.solars).toBe(1);
  });

  it('machines survive a base capture and stamp', () => {
    const g = new Game();
    g.world.set(g.world.padX, g.world.padY - 2, T.SMELTER);
    const base = captureBase(g.world);
    const g2 = new Game();
    stampBase(g2.world, base);
    expect(g2.world.get(g2.world.padX, g2.world.padY - 2)).toBe(T.SMELTER);
    expect(newPower().working).toBe(false);
  });
});

describe('battery', () => {
  it('has content wired and persists in the base', () => {
    expect(ITEMS.battery.kit).toBe(true);
    expect(RECIPES.some((r) => r.out === 'battery')).toBe(true);
    expect(TILES[T.BATTERY].drop).toBe('battery');
    expect(isMinable(T.BATTERY)).toBe(true);
    expect(sanitizeBase([1, 1, T.BATTERY])).toEqual([1, 1, T.BATTERY]);
  });

  it('charges from surplus solar, never above capacity', () => {
    let st = stepGrid(2, 0, 1, 1, false, 0, 1);
    expect(st.charge).toBe(8);
    for (let i = 0; i < 100; i++) st = stepGrid(2, 0, 1, 1, false, st.charge, 1);
    expect(st.charge).toBe(BATTERY_CAP);
    expect(st.cap).toBe(BATTERY_CAP);
  });

  it('powers the smelter at night until empty, then stops', () => {
    let st = stepGrid(1, 1, 1, 0, true, 10, 1);
    expect(st.working).toBe(true);
    expect(st.ratio).toBe(1);
    expect(st.charge).toBeCloseTo(7);
    for (let i = 0; i < 5; i++) st = stepGrid(1, 1, 1, 0, true, st.charge, 1);
    expect(st.charge).toBe(0);
    expect(st.working).toBe(false);
  });

  it('partial battery power gives a partial ratio; removing batteries clamps charge', () => {
    const st = stepGrid(0, 1, 1, 1, true, 1.5, 1);
    expect(st.ratio).toBeCloseTo(0.5);
    expect(stepGrid(0, 0, 0, 1, false, 50, 1).charge).toBe(0);
  });

  it('in the game a battery lets the smelter run through the night', () => {
    const g = new Game();
    const x = g.world.padX;
    const y = g.world.padY - 1;
    g.world.set(x + 1, y, T.SOLAR);
    g.world.set(x + 2, y, T.SMELTER);
    g.world.set(x + 3, y, T.BATTERY);
    g.stash.rust = 0;
    for (let i = 0; i < 60 * 30; i++) g.step(1 / 60, NO_CONTROLS);
    expect(g.power.charge).toBeGreaterThan(0);
    g.stash.rust = 8;
    g.stash.metal = 0;
    let made = 0;
    for (let i = 0; i < 60 * 20; i++) {
      g.step(1 / 60, NO_CONTROLS);
      for (const e of g.drainEvents()) if (e.t === 'smelt') made += e.made;
    }
    expect(made).toBe(2);
  });
});

describe('miner rig', () => {
  it('has content wired: item, tile, recipe, persisted in the base', () => {
    expect(ITEMS.miner.kit).toBe(true);
    expect(RECIPES.some((r) => r.out === 'miner')).toBe(true);
    expect(isMinable(T.MINER)).toBe(true);
    expect(TILES[T.MINER].drop).toBe('miner');
    expect(sanitizeBase([1, 1, T.MINER])).toEqual([1, 1, T.MINER]);
  });

  it('draws power from the shared grid and slows everything when underpowered', () => {
    expect(gridState(1, 0, 1, false, 1).demand).toBe(MINER_DRAW);
    expect(gridState(1, 0, 1, false, 1).ratio).toBe(1);
    expect(gridState(0, 0, 1, false, 1).ratio).toBe(0);
    expect(gridState(1, 0, 1, false, 4).ratio).toBeCloseTo(4 / (4 * MINER_DRAW));
  });

  it('mines rust at the expected rate with an iron scrap every 4th unit, and does nothing unpowered', () => {
    const stash: Inventory = {};
    const p = gridState(1, 0, 1, false, 1);
    let prog = 0;
    let count = 0;
    for (let i = 0; i < MINE_TIME * 8 * 10 + 3; i++) {
      const r = stepMining(stash, p, prog, count, 0.1);
      prog = r.progress;
      count = r.count;
    }
    expect(count).toBe(8);
    expect(stash.rust).toBe(6);
    expect(stash.iron_scrap).toBe(2);
    const dead = stepMining({}, gridState(0, 0, 0, false, 1), 0, 0, 100);
    expect(dead.made).toBe(0);
  });

  it('a built solar + miner in the game fills the stash and survives a base capture', () => {
    const g = new Game();
    g.world.set(g.world.padX + 1, g.world.padY - 1, T.SOLAR);
    g.world.set(g.world.padX + 2, g.world.padY - 1, T.MINER);
    const before = g.stash.rust ?? 0;
    for (let i = 0; i < 30 * (MINE_TIME * 3) ; i++) g.step(1 / 30, NO_CONTROLS);
    expect((g.stash.rust ?? 0) + (g.stash.iron_scrap ?? 0)).toBeGreaterThan(before);
    expect(captureBase(g.world)).toContain(T.MINER);
  });
});
