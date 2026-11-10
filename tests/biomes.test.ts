import { describe, expect, it } from 'vitest';
import { B, BIOME_IDS, HOME_HALF, biomeLayout } from '../src/sim/biomes';
import { PAD_CLEAR } from '../src/sim/structures';
import { chestLoot } from '../src/sim/loot';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T, TILES, invTotal } from '../src/sim/tiles';
import { WORLD_W, generateWorld } from '../src/sim/world';

const SEEDS = [1, 2, 3, 7, 42, 99, 1234, 77777];

describe('biomes', () => {
  it('home is Rust Wastes and every biome appears in every world', () => {
    for (const seed of SEEDS) {
      const lay = biomeLayout(seed, WORLD_W);
      const cx = Math.floor(WORLD_W / 2);
      for (let x = cx - HOME_HALF; x <= cx + HOME_HALF; x++) expect(lay[x]).toBe(B.WASTES);
      for (const id of BIOME_IDS) expect(lay.includes(id)).toBe(true);
    }
  });

  it('layout is deterministic and differs between seeds', () => {
    expect(biomeLayout(5, WORLD_W)).toEqual(biomeLayout(5, WORLD_W));
    const a = biomeLayout(1, WORLD_W).join('');
    expect(SEEDS.some((s) => biomeLayout(s, WORLD_W).join('') !== a)).toBe(true);
  });

  it('crust matches the biome', () => {
    const w = generateWorld(3);
    const crust: Record<number, number> = { [B.WASTES]: T.RUST, [B.JUNGLE]: T.SOIL, [B.CRYSTAL]: T.SAND, [B.ASH]: T.ASH, [B.FROST]: T.FROST };
    let checked = 0;
    for (let x = 30; x < w.w - 30; x += 11) {
      const t = w.get(x, w.surface[x] + 1);
      if (t === T.RUIN || t === T.METAL || t === T.CRYSTAL || t === T.IRON || t === T.AIR || t === T.PAD) continue;
      expect(t).toBe(crust[w.biome[x]]);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });
});

describe('world shape', () => {
  it('the ground around the pad is walkable (no step over 1 tile within 20 columns)', () => {
    for (const seed of SEEDS) {
      const w = generateWorld(seed);
      for (let x = w.padX - 20; x < w.padX + 20; x++) expect(Math.abs(w.surface[x] - w.surface[x + 1])).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    expect(generateWorld(11).tiles).toEqual(generateWorld(11).tiles);
  });
});

describe('structures and loot places', () => {
  it('surface structures keep clear of the pad, come regularly and each holds a chest', () => {
    for (const seed of SEEDS) {
      const w = generateWorld(seed);
      const surf = w.structures.filter((s) => s.kind === 'ruin' || s.kind === 'tower' || s.kind === 'ship');
      expect(surf.length).toBeGreaterThanOrEqual(10);
      const xs = surf.map((s) => s.x0).sort((a, b) => a - b);
      for (const s of surf) {
        expect(s.x1 < w.padX - PAD_CLEAR || s.x0 > w.padX + PAD_CLEAR).toBe(true);
        let chests = 0;
        for (let y = s.y0 - 1; y <= s.y1; y++) for (let x = s.x0 - 1; x <= s.x1 + 1; x++) if (w.get(x, y) === T.CHEST) chests++;
        expect(chests).toBeGreaterThanOrEqual(1);
      }
      for (let i = 1; i < xs.length; i++) if (xs[i] < w.padX - 40 || xs[i - 1] > w.padX + 40) expect(xs[i] - xs[i - 1]).toBeLessThan(140);
    }
  });

  it('places sealed vaults and crystal geodes underground', () => {
    for (const seed of SEEDS) {
      const w = generateWorld(seed);
      expect(w.structures.filter((s) => s.kind === 'vault').length).toBeGreaterThanOrEqual(8);
      expect(w.structures.filter((s) => s.kind === 'geode').length).toBeGreaterThanOrEqual(6);
      for (const s of w.structures) {
        expect(s.x0).toBeGreaterThan(0);
        expect(s.x1).toBeLessThan(w.w - 1);
        expect(s.y1).toBeLessThan(w.h - 2);
      }
    }
  });

  it('chest loot is deterministic, never empty, richer when deep', () => {
    const a = chestLoot(5, 100, 80, 10);
    expect(a).toEqual(chestLoot(5, 100, 80, 10));
    let shallow = 0;
    let deep = 0;
    for (let i = 0; i < 200; i++) {
      const s = chestLoot(9, i * 13, 60 + i, 5);
      const d = chestLoot(9, i * 13, 60 + i, 80);
      expect(invTotal(s)).toBeGreaterThan(0);
      shallow += s.crystal ?? 0;
      deep += d.crystal ?? 0;
    }
    expect(deep).toBeGreaterThan(shallow);
  });

  it('breaking a chest fills the pack up to its capacity', () => {
    const g = new Game(defaultSave());
    g.carried = {};
    const got = g.openChest(10, g.world.padY + 5, 30);
    expect(got).toBeGreaterThan(0);
    expect(invTotal(g.carried)).toBe(got);
    g.carried = { rust: 29 };
    g.openChest(11, g.world.padY + 5, 30);
    expect(invTotal(g.carried)).toBe(30);
  });
});

describe('trees and plants', () => {
  it('grow on solid ground, never next to the pad, and jungles are lush', () => {
    const w = generateWorld(42);
    let jungleTrees = 0;
    for (let x = 1; x < w.w - 1; x++) {
      for (let y = 1; y < w.padY + 30; y++) {
        const t = w.get(x, y);
        if (t === T.TRUNK && w.get(x, y + 1) !== T.TRUNK && TILES[w.get(x, y + 1)].solid) {
          expect(Math.abs(x - w.padX)).toBeGreaterThan(10);
          if (w.biome[x] === B.JUNGLE) jungleTrees++;
        }
        if (t === T.PLANT && y < w.surface[x]) expect(Math.abs(x - w.padX)).toBeGreaterThan(9);
      }
    }
    expect(jungleTrees).toBeGreaterThan(15);
  });

  it('cutting a trunk fells the whole tree above it for biomass', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    let tx = -1;
    let ty = -1;
    for (let x = 1; x < w.w - 1 && tx < 0; x++) {
      const s = w.surface[x];
      if (w.get(x, s - 1) === T.TRUNK && w.get(x, s - 3) === T.TRUNK) {
        tx = x;
        ty = s - 1;
      }
    }
    expect(tx).toBeGreaterThan(0);
    g.carried = {};
    w.set(tx, ty, T.AIR);
    const got = g.fellTree(tx, ty, 99);
    expect(got).toBeGreaterThanOrEqual(2);
    expect(g.carried.biomass).toBe(got);
    for (let y = ty - 14; y < ty; y++) expect(w.get(tx, y)).not.toBe(T.TRUNK);
  });
});

describe('workshop stash line', () => {
  it('lists only owned items, capped at 8', async () => {
    const { stashLine } = await import('../src/ui/ui');
    expect(stashLine({})).toEqual([]);
    expect(stashLine({ rust: 3, crystal: 1, iron_scrap: 0 })).toEqual(['rust', 'crystal']);
    const all = Object.fromEntries(['rust', 'metal', 'iron_scrap', 'copper_wire', 'crystal', 'biomass', 'torch', 'ladder', 'scaffold', 'platform'].map((k) => [k, 1]));
    expect(stashLine(all).length).toBe(8);
  });

  it('biomass crafts torches', async () => {
    const { recipeById } = await import('../src/sim/recipes');
    expect(recipeById('biotorch')?.cost.biomass).toBe(3);
  });
});

describe('world change log (render cache invalidation)', () => {
  it('records tile and wall changes, starts empty, and flags overflow instead of growing forever', () => {
    const w = generateWorld(4);
    expect(w.changes.length).toBe(0);
    w.set(5, 60, T.AIR);
    w.setWall(6, 60, 0);
    expect(w.changes).toEqual([60 * w.w + 5, 60 * w.w + 6]);
    for (let i = 0; i < 5000; i++) w.set(10 + (i % 50), 70, T.RUST);
    expect(w.changes.length).toBeLessThanOrEqual(4096);
    expect(w.changesOverflow).toBe(true);
  });
});
