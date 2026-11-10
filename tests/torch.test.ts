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
    const before = w.torches.size;
    expect(w.lightAt(10, 100)).toBe(0);
    w.set(10, 100, T.TORCH);
    expect(w.lightAt(10.5, 100.5)).toBeCloseTo(1, 5);
    expect(w.lightAt(10.5 + TORCH_RADIUS / 2, 100.5)).toBeCloseTo(0.5, 5);
    expect(w.lightAt(10.5 + TORCH_RADIUS + 1, 100.5)).toBe(0);
    w.set(10, 100, T.AIR);
    expect(w.torches.size).toBe(before);
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

describe('suit lamp', () => {
  it('raises lamp radius per level, is buyable, and survives saves', async () => {
    const { derive } = await import('../src/sim/upgrades');
    expect(derive({ lamp: 2 }).lampRadius).toBeGreaterThan(derive({}).lampRadius);
    const g = new Game();
    g.stash = { iron_scrap: 50, copper_wire: 20 };
    expect(g.buyUpgrade('lamp')).toBe(true);
    expect(g.upgrades.lamp).toBe(1);
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.upgrades.lamp).toBe(1);
    // Old saves without the lamp load fine.
    expect(parseSave(JSON.stringify({ v: 1, upgrades: { battery: 2 } })).upgrades).toEqual({ battery: 2 });
  });
});

describe('ladders and scaffold', () => {
  it('ladder is climbable, non-solid, minable; scaffold is solid', () => {
    expect(isMinable(T.LADDER)).toBe(true);
    expect(isMinable(T.SCAFFOLD)).toBe(true);
    const g = new Game();
    g.world.set(30, 60, T.LADDER);
    expect(g.world.isSolid(30, 60)).toBe(false);
    expect(g.world.isClimb(30, 60)).toBe(true);
    g.world.set(30, 61, T.SCAFFOLD);
    expect(g.world.isSolid(30, 61)).toBe(true);
  });

  it('player climbs up a ladder shaft and clings without falling', () => {
    const g = new Game();
    for (let y = 50; y <= 70; y++) {
      g.world.set(40, y, T.LADDER);
      g.world.set(39, y, T.RUST);
      g.world.set(41, y, T.RUST);
    }
    g.world.set(40, 71, T.RUST);
    g.body.x = 40.5;
    g.body.y = 70.9;
    g.body.vy = 0;
    run(g, 1, { jump: true });
    expect(g.body.y).toBeLessThan(67);
    const y = g.body.y;
    run(g, 1);
    expect(Math.abs(g.body.y - y)).toBeLessThan(0.05);
    run(g, 1, { down: true });
    expect(g.body.y).toBeGreaterThan(y + 4);
  });

  it('crafting ladder and scaffold keeps them in the pack when banking', () => {
    for (const id of ['ladder', 'scaffold']) {
      const g = new Game();
      g.stash.rust = 20;
      g.stash.iron_scrap = 5;
      g.body.x = g.world.padX + 0.5;
      g.body.y = g.world.padY;
      expect(RECIPES.some((r) => r.id === id)).toBe(true);
      expect(g.craft(id)).toBe(true);
      expect((g.carried as Record<string, number>)[id]).toBeGreaterThan(0);
      run(g, 0.5);
      expect((g.carried as Record<string, number>)[id]).toBeGreaterThan(0);
    }
  });

  it('old saves without ladder/scaffold still parse', () => {
    const s = parseSave(JSON.stringify({ ...defaultSave(), v: defaultSave().v }));
    expect(s.stash.ladder ?? 0).toBe(0);
    expect(serializeSave(s)).toBeTruthy();
  });
});
