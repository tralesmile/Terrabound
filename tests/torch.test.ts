import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { RECIPES } from '../src/sim/recipes';
import { T, isMinable } from '../src/sim/tiles';
import { SPAWN_LIGHT_MAX, TORCH_RADIUS, generateWorld } from '../src/sim/world';

const run = (g: Game, seconds: number, c: Partial<Controls> = {}) => {
  const ctl = { ...NO_CONTROLS, ...c };
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) g.step(FIXED_DT, ctl);
};

describe('torches and light', () => {
  it('tracks torches in the world and falls off with distance', () => {
    const w = generateWorld(5);
    expect(w.lightAt(10, 100)).toBe(0);
    w.set(10, 100, T.TORCH);
    expect(w.lightAt(10.5, 100.5)).toBeCloseTo(1, 5);
    expect(w.lightAt(10.5 + TORCH_RADIUS / 2, 100.5)).toBeCloseTo(0.5, 5);
    expect(w.lightAt(10.5 + TORCH_RADIUS + 1, 100.5)).toBe(0);
    w.set(10, 100, T.AIR);
    expect(w.torches.size).toBe(0);
    expect(w.lightAt(10.5, 100.5)).toBe(0);
  });

  it('torch is non-solid but minable and drops itself', () => {
    expect(isMinable(T.TORCH)).toBe(true);
    const g = new Game();
    g.world.set(30, 60, T.TORCH);
    expect(g.world.isSolid(30, 60)).toBe(false);
    g.body.x = 30.5;
    g.body.y = 61;
    g.world.set(30, 61, T.RUST);
    run(g, 0.5, { dig: true, aim: { tx: 30, ty: 60 } });
    expect(g.world.get(30, 60)).toBe(T.AIR);
    expect(g.carried.torch).toBe(1);
  });

  it('places a torch from the pack onto a wall', () => {
    const g = new Game();
    g.body.x = 40.5;
    g.body.y = 60;
    g.world.set(41, 59, T.AIR);
    g.world.set(42, 59, T.RUST);
    g.carried.torch = 2;
    g.selected = 'torch';
    run(g, 0.3, { place: true, aim: { tx: 41, ty: 59 } });
    expect(g.world.get(41, 59)).toBe(T.TORCH);
    expect(g.carried.torch).toBe(1);
  });

  it('enemies never spawn in torch light', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = defaultSave();
      s.seedBase = seed;
      const g = new Game(s);
      g.body.y = 40;
      // Light up a whole band of the world around the player.
      for (let x = 2; x < g.world.w - 2; x += 5) for (let y = 30; y < 55; y += 5) if (g.world.get(x, y) === T.AIR) g.world.set(x, y, T.TORCH);
      for (let i = 0; i < 60; i++) {
        g.enemies = [];
        const e = g.trySpawn();
        if (e) expect(g.world.lightAt(e.x, e.y - 0.5)).toBeLessThanOrEqual(SPAWN_LIGHT_MAX);
      }
    }
  });
});

describe('crafting', () => {
  const atBase = () => {
    const g = new Game();
    g.stash = { rust: 10, iron_scrap: 5 };
    return g;
  };

  it('crafts torches at the base, paying from the stash into the pack', () => {
    const g = atBase();
    expect(g.craft('torch')).toBe(true);
    expect(g.stash.rust).toBe(8);
    expect(g.stash.iron_scrap).toBe(4);
    expect(g.carried.torch).toBe(2);
  });

  it('refuses when away from base, broke, full or unknown', () => {
    const g = atBase();
    g.body.y = 50;
    expect(g.craft('torch')).toBe(false);
    const broke = new Game();
    expect(broke.craft('torch')).toBe(false);
    const full = atBase();
    full.carried.rust = full.derived.packCap;
    expect(full.craft('torch')).toBe(false);
    expect(full.stash.rust).toBe(10);
    expect(atBase().craft('nope')).toBe(false);
  });

  it('recipe table is sane', () => {
    for (const r of RECIPES) {
      expect(r.qty).toBeGreaterThan(0);
      expect(Object.keys(r.cost).length).toBeGreaterThan(0);
    }
  });

  it('torches survive a save round trip; unknown items are dropped', () => {
    const s = defaultSave();
    s.stash = { torch: 3 };
    expect(parseSave(serializeSave(s)).stash.torch).toBe(3);
    const bad = parseSave(JSON.stringify({ v: 1, stash: { torch: 2, laser_cat: 9 } }));
    expect(bad.stash).toEqual({ torch: 2 });
  });
});

describe('kit items', () => {
  it('banking leaves crafted torches in the pack but banks loot', () => {
    const g = new Game();
    g.carried = { torch: 3, rust: 4 };
    expect(g.bank()).toBe(4);
    expect(g.carried).toEqual({ torch: 3 });
    expect(g.stash.rust).toBe(4);
    g.step(FIXED_DT, NO_CONTROLS);
    expect(g.carried.torch).toBe(3);
  });

  it('torches in a saved pack stay in the pack on load; loot is banked', () => {
    const s = defaultSave();
    s.carried = { torch: 2, iron_scrap: 5 };
    const g = new Game(s);
    expect(g.carried).toEqual({ torch: 2 });
    expect(g.stash.iron_scrap).toBe(5);
  });
});
