import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { Game } from '../src/sim/game';
import { LEGACY_WORLD, WORLD_H, WORLD_W, biggerWorldPitch, isLegacySize } from '../src/sim/worldsize';
import { B, bandScale, biomeLayout } from '../src/sim/biomes';

describe('world size', () => {
  it('new saves make big worlds (owner: "the world seems small")', () => {
    expect(WORLD_W).toBeGreaterThanOrEqual(2 * LEGACY_WORLD.w);
    expect(WORLD_H).toBeGreaterThan(LEGACY_WORLD.h);
    const g = new Game(defaultSave());
    expect(g.world.w).toBe(WORLD_W);
    expect(g.world.h).toBe(WORLD_H);
  });

  it('a v27 save with a world in progress keeps its 1400 x 420 world (edits are stored by tile index)', () => {
    const old = JSON.parse(serializeSave(defaultSave())) as Record<string, unknown>;
    old.v = 27;
    delete old.worldSize;
    old.world = { tiles: '', walls: '', fog: '', chests: '', saplings: '' };
    const s = parseSave(JSON.stringify(old));
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.worldSize).toEqual({ w: 1400, h: 420 });
    const g = new Game(s);
    expect(g.world.w).toBe(1400);
    expect(g.world.h).toBe(420);
  });

  it('a v27 save without a world in progress upgrades to the big size, and round-trips', () => {
    const old = JSON.parse(serializeSave(defaultSave())) as Record<string, unknown>;
    old.v = 27;
    delete old.worldSize;
    old.world = null;
    expect(parseSave(JSON.stringify(old)).worldSize).toEqual({ w: WORLD_W, h: WORLD_H });
    const s = parseSave(serializeSave(defaultSave()));
    expect(parseSave(serializeSave(s)).worldSize).toEqual({ w: WORLD_W, h: WORLD_H });
  });

  it('junk sizes are clamped, never thrown on', () => {
    const raw = JSON.parse(serializeSave(defaultSave())) as Record<string, unknown>;
    raw.worldSize = { w: 'big', h: 1e9 };
    expect(() => parseSave(JSON.stringify(raw))).not.toThrow();
    const s = parseSave(JSON.stringify(raw));
    expect(s.worldSize.w).toBe(WORLD_W);
    expect(s.worldSize.h).toBeLessThanOrEqual(2000);
  });

  it('biome bands are 1.5x wider in a big world and unchanged in a legacy one', () => {
    expect(bandScale(1400)).toBe(1);
    expect(bandScale(2800)).toBe(1.5);
    const run = (l: Uint8Array): number => {
      // Width of the first band left of the home Wastes.
      let x = Math.floor(l.length / 2);
      while (l[x] === B.WASTES) x--;
      const id = l[x];
      let n = 0;
      while (x >= 0 && l[x] === id) {
        n++;
        x--;
      }
      return n;
    };
    expect(run(biomeLayout(5, 2800))).toBeGreaterThanOrEqual(300);
    expect(run(biomeLayout(5, 1400))).toBeLessThanOrEqual(280);
  });

  it('legacy worlds get a clear pitch for a bigger world; current worlds get none', () => {
    expect(isLegacySize(LEGACY_WORLD)).toBe(true);
    expect(isLegacySize({ w: WORLD_W, h: WORLD_H })).toBe(false);
    expect(biggerWorldPitch({ w: WORLD_W, h: WORLD_H })).toBeNull();
    const pitch = biggerWorldPitch(LEGACY_WORLD) ?? '';
    expect(pitch).toContain('2x as wide');
    expect(pitch).toContain('stash, base and upgrades');
  });

  it('a legacy-world game offers the bigger world and NEW WORLD (at the pad) moves it to the current size', () => {
    const old = JSON.parse(serializeSave(defaultSave())) as Record<string, unknown>;
    old.v = 27;
    delete old.worldSize;
    old.world = { tiles: '', walls: '', fog: '', chests: '', saplings: '' };
    const g = new Game(parseSave(JSON.stringify(old)));
    expect(g.legacyWorld).toBe(true);
    expect(g.worldSize).toEqual({ w: 1400, h: 420 });
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    expect(g.newDive()).toBe(true);
    expect(g.legacyWorld).toBe(false);
    expect(g.world.w).toBe(WORLD_W);
    expect(parseSave(serializeSave(g.toSave())).worldSize).toEqual({ w: WORLD_W, h: WORLD_H });
  });
});
