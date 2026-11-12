import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { B } from '../src/sim/biomes';
import { CROPS, CROP_IDS, GRASS_SEED_CHANCE, STAGE_TIME, WET_MUL, cropAt, cropOfSeed, grassSeed, harvestYield, isWatered, plantCrop, ripeIn, stepCrops } from '../src/sim/farming';
import { FOOD } from '../src/sim/fishing';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { ITEMS, PLACEABLE, T, TILES } from '../src/sim/tiles';
import { World } from '../src/sim/world';
import { RECIPES } from '../src/sim/recipes';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};
const reload = (g: Game): Game => new Game(parseSave(serializeSave(g.toSave())));

/** Flat surface strip `dx` columns from the pad: rust floor, air above; the player stands in the middle. */
function flat(g: Game, dx: number, width = 12): { x: number; y: number } {
  const w = g.world;
  const x0 = w.padX + dx;
  const y = w.surface[x0];
  for (let x = x0 - width; x <= x0 + width; x++) {
    for (let yy = y - 14; yy < y; yy++) w.set(x, yy, T.AIR);
    w.set(x, y, T.RUST);
  }
  g.body.x = x0 + 0.5;
  g.body.y = y;
  g.body.vx = g.body.vy = 0;
  return { x: x0, y };
}

function field(): { w: World; y: number } {
  const w = new World(60, 30, 3);
  for (let y = 20; y < 30; y++) for (let x = 0; x < 60; x++) w.set(x, y, T.SOIL);
  return { w, y: 19 };
}

describe('crop data', () => {
  it('three crops, each with a kit seed that plants its sprout, edible produce and 3 distinct stage tiles', () => {
    expect(CROP_IDS.length).toBe(3);
    const tiles = new Set<number>();
    for (const id of CROP_IDS) {
      const d = CROPS[id];
      expect(ITEMS[d.seed].kit).toBe(true);
      expect(ITEMS[d.seed].places).toBe(d.tiles[0]);
      expect(PLACEABLE).toContain(d.seed);
      expect(cropOfSeed(d.seed)).toBe(id);
      expect(ITEMS[d.produce].kit).toBeFalsy();
      expect(FOOD[d.produce]?.hp).toBeGreaterThan(0);
      d.tiles.forEach((t, stage) => {
        tiles.add(t);
        expect(cropAt(t)).toEqual({ crop: id, stage });
        expect(TILES[t].solid).toBe(false);
        expect(TILES[t].minable).toBe(true);
      });
    }
    expect(tiles.size).toBe(9);
    expect(RECIPES.some((r) => r.out === 'sprinkler')).toBe(true);
    // Produce heals less than a medkit, so medkits stay worth buying.
    for (const id of CROP_IDS) expect(FOOD[CROPS[id].produce]?.hp ?? 0).toBeLessThan(FOOD.medkit?.hp ?? 0);
  });
});

describe('growing', () => {
  it('dry crops ripen in two stages; watered ones twice as fast', () => {
    const { w, y } = field();
    plantCrop(w, 5, y, 'glowcorn');
    plantCrop(w, 40, y, 'glowcorn');
    w.set(42, y, T.SPRINKLER);
    expect(isWatered(w, 5, y)).toBe(false);
    expect(isWatered(w, 40, y)).toBe(true);
    expect(ripeIn(w, 5, y)).toBeCloseTo(STAGE_TIME * 2);
    expect(ripeIn(w, 40, y)).toBeCloseTo((STAGE_TIME * 2) / WET_MUL);
    for (let t = 0; t < STAGE_TIME + 1; t += 0.5) stepCrops(w, 0.5);
    expect(w.get(40, y)).toBe(T.CORN_3); // watered: ripe after one dry stage time
    expect(w.get(5, y)).toBe(T.CORN_2);
    for (let t = 0; t < STAGE_TIME + 1; t += 0.5) stepCrops(w, 0.5);
    expect(w.get(5, y)).toBe(T.CORN_3);
    expect(w.crops.size).toBe(0); // ripe crops wait to be cut, no timers left
  });

  it('a pond beside the field waters it; a sprinkler reaches 4 columns', () => {
    const { w, y } = field();
    w.set(10, y + 1, T.WATER);
    expect(isWatered(w, 12, y)).toBe(true);
    expect(isWatered(w, 20, y)).toBe(false);
    w.set(30, y, T.SPRINKLER);
    expect(isWatered(w, 34, y)).toBe(true);
    expect(isWatered(w, 35, y)).toBe(false);
  });

  it('cutting a crop removes its timer; a stray timer on a non-crop is dropped', () => {
    const { w, y } = field();
    plantCrop(w, 5, y, 'rustroot');
    expect(w.crops.size).toBe(1);
    w.set(5, y, T.AIR);
    expect(w.crops.size).toBe(0);
    w.crops.set(y * w.w + 7, 3);
    stepCrops(w, 1);
    expect(w.crops.size).toBe(0);
  });
});

describe('harvest and seeds', () => {
  it('ripe crops give 2-3 produce and 1-2 seeds; unripe ones their seed back', () => {
    for (const id of CROP_IDS) {
      const d = CROPS[id];
      expect(harvestYield(d.tiles[0], 3, 3, 1)).toEqual([{ item: d.seed, n: 1 }]);
      expect(harvestYield(d.tiles[1], 3, 3, 1)).toEqual([{ item: d.seed, n: 1 }]);
      let produce = 0;
      for (let x = 0; x < 200; x++) {
        const got = harvestYield(d.tiles[2], x, 5, 9);
        expect(got[0].item).toBe(d.produce);
        expect(got[0].n).toBeGreaterThanOrEqual(2);
        expect(got[0].n).toBeLessThanOrEqual(3);
        expect(got[1].item).toBe(d.seed);
        expect(got[1].n).toBeGreaterThanOrEqual(1);
        produce += got[0].n;
      }
      expect(produce / 200).toBeGreaterThan(2.2);
    }
    expect(harvestYield(T.RUST, 1, 1, 1)).toEqual([]);
  });

  it('wild grass drops a seed for its biome about 30% of the time, deterministically', () => {
    let n = 0;
    for (let x = 0; x < 1000; x++) if (grassSeed(B.WASTES, x, 7, 5)) n++;
    expect(n / 1000).toBeGreaterThan(GRASS_SEED_CHANCE - 0.06);
    expect(n / 1000).toBeLessThan(GRASS_SEED_CHANCE + 0.06);
    const first = (b: number) => {
      for (let x = 0; x < 100; x++) {
        const s = grassSeed(b, x, 7, 5);
        if (s) return s;
      }
      return null;
    };
    expect(first(B.JUNGLE)).toBe('corn_seed');
    expect(first(B.CRYSTAL)).toBe('corn_seed');
    expect(first(B.FROST)).toBe('berry_seed');
    expect(first(B.ASH)).toBe('root_seed');
    expect(grassSeed(B.WASTES, 12, 7, 5)).toBe(grassSeed(B.WASTES, 12, 7, 5));
  });
});

describe('farming in the game', () => {
  it('plant on soil (not metal), it grows, persists, and cutting it ripe fills the pack', () => {
    const g = new Game(defaultSave());
    const { x, y } = flat(g, 70);
    g.carried = { corn_seed: 2 };
    g.selected = 'corn_seed';
    g.world.set(x + 3, y, T.METAL);
    run(g, 0.05, { place: true, aim: { tx: x + 3, ty: y - 1 } });
    expect(g.world.get(x + 3, y - 1)).toBe(T.AIR);
    run(g, 0.6);
    g.drainEvents();
    run(g, 0.05, { place: true, aim: { tx: x + 2, ty: y - 1 } });
    expect(g.world.get(x + 2, y - 1)).toBe(T.CORN_1);
    expect(g.carried.corn_seed).toBe(1);
    const ev = g.drainEvents().find((e) => e.t === 'plant');
    expect(ev && ev.t === 'plant' && ev.secs).toBe(STAGE_TIME * 2);
    // Survives a save and keeps growing after it.
    const g2 = reload(g);
    expect(g2.world.get(x + 2, y - 1)).toBe(T.CORN_1);
    expect(g2.world.crops.size).toBe(1);
    stepCrops(g2.world, STAGE_TIME + 1);
    stepCrops(g2.world, STAGE_TIME + 1);
    expect(g2.world.get(x + 2, y - 1)).toBe(T.CORN_3);
    // Cut it with the drill.
    flat(g2, 70);
    g2.world.set(x + 2, y - 1, T.CORN_3);
    g2.tool = 'drill';
    g2.carried = {};
    run(g2, 0.5, { dig: true, aim: { tx: x + 2, ty: y - 1 } });
    expect(g2.world.get(x + 2, y - 1)).toBe(T.AIR);
    expect(g2.carried.glowcorn ?? 0).toBeGreaterThanOrEqual(2);
    expect(g2.carried.corn_seed ?? 0).toBeGreaterThanOrEqual(1);
    expect(g2.drainEvents().some((e) => e.t === 'harvest')).toBe(true);
  });

  it('old saves whose sapling diff has no crops still load their saplings', () => {
    const g = new Game(defaultSave());
    const { x, y } = flat(g, 70);
    g.world.set(x + 1, y - 1, T.SAPLING);
    g.world.saplings.set((y - 1) * g.world.w + x + 1, 50);
    plantCrop(g.world, x + 4, y - 1, 'frostberry');
    const g2 = reload(g);
    expect(g2.world.saplings.size).toBe(1);
    expect(g2.world.crops.size).toBe(1);
    expect(g2.world.get(x + 4, y - 1)).toBe(T.BERRY_1);
  });

  it('eating produce heals', () => {
    const g = new Game(defaultSave());
    g.carried = { rustroot: 1 };
    g.hp = 10;
    expect(g.useItem('rustroot')).toBe(true);
    expect(g.hp).toBeGreaterThan(10);
  });
});

describe('cooking and meal buffs', () => {
  it('meal recipes need a cooking pot in the base, take farm produce, and every meal gives a buff', async () => {
    const { MEAL_BUFF, BUFFS } = await import('../src/sim/farming');
    const meals = RECIPES.filter((r) => r.pot);
    expect(meals.length).toBe(3);
    for (const r of meals) {
      expect(MEAL_BUFF[r.out]).toBeDefined();
      expect(BUFFS[MEAL_BUFF[r.out] as keyof typeof BUFFS].desc.length).toBeGreaterThan(5);
      expect(ITEMS[r.out].kit).toBe(true);
      expect(Object.keys(r.cost).some((k) => CROP_IDS.some((c) => CROPS[c].produce === k))).toBe(true);
    }
    const g = new Game(defaultSave());
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.step(1 / 30, NO_CONTROLS);
    g.stash.rustroot = 4;
    g.stash.biomass = 2;
    expect(g.hasPot()).toBe(false);
    expect(g.craft('stew')).toBe(false);
    g.world.set(g.world.padX + 3, g.world.padY - 1, T.POT);
    expect(g.hasPot()).toBe(true);
    expect(g.craft('stew')).toBe(true);
    expect(g.carried.stew).toBe(1);
    expect(g.stash.rustroot).toBe(2);
    // A pot outside the base strip does not count.
    g.world.set(g.world.padX + 3, g.world.padY - 1, T.AIR);
    g.world.set(g.world.padX + 40, g.world.padY - 1, T.POT);
    expect(g.hasPot()).toBe(false);
  });

  it('a stew makes you sturdy for 3 minutes: hits hurt 25% less, then it wears off', async () => {
    const { BUFF_TIME, STURDY_TAKEN } = await import('../src/sim/farming');
    const hitFor = (g: Game): number => {
      g.hp = 100;
      (g as unknown as { hurt(n: number): void }).hurt(20);
      return 100 - g.hp;
    };
    const g = new Game(defaultSave());
    const plain = hitFor(g);
    g.carried = { stew: 1 };
    expect(g.useItem('stew')).toBe(true);
    expect(g.buffs.sturdy).toBe(BUFF_TIME);
    expect(hitFor(g)).toBeCloseTo(plain * STURDY_TAKEN);
    run(g, 1);
    expect(g.buffs.sturdy).toBeLessThan(BUFF_TIME);
    g.buffs.sturdy = 0.5;
    run(g, 1);
    expect(g.buffs.sturdy).toBeUndefined();
    expect(hitFor(g)).toBeCloseTo(plain);
  });

  it('a tart makes you run faster; chowder slows deep battery drain', async () => {
    const { SWIFT_SPEED, CHARGED_DRAIN } = await import('../src/sim/farming');
    const runDist = (swift: boolean): number => {
      const g = new Game(defaultSave());
      const { x } = flat(g, 70, 30);
      g.body.x = x - 20 + 0.5;
      if (swift) g.buffs.swift = 100;
      run(g, 1.5, { moveX: 1 });
      return g.body.x;
    };
    const a = runDist(false);
    const b = runDist(true);
    expect(b).toBeGreaterThan(a);
    expect(SWIFT_SPEED).toBeGreaterThan(1);
    expect(CHARGED_DRAIN).toBeLessThan(1);
  });
});
