import { describe, expect, it } from 'vitest';
import { ENEMIES, makeEnemy, spawnableKinds, stepEnemy, type EnemyKind } from '../src/sim/enemies';
import { B } from '../src/sim/biomes';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { generateWorld } from '../src/sim/world';

describe('biome enemies', () => {
  it('each non-home biome has its own enemy; home only has the common ones', () => {
    const own: Record<number, EnemyKind> = { [B.JUNGLE]: 'vine', [B.CRYSTAL]: 'mite', [B.ASH]: 'ember', [B.FROST]: 'hulk' };
    expect(spawnableKinds(50, B.WASTES).sort()).toEqual(['crawler', 'flyer']);
    for (const [b, k] of Object.entries(own)) {
      const kinds = spawnableKinds(50, Number(b));
      expect(kinds).toContain(k);
      for (const other of Object.values(own)) if (other !== k) expect(kinds).not.toContain(other);
    }
    expect(spawnableKinds(0, B.JUNGLE)).toEqual([]);
    expect(spawnableKinds(0, B.ASH, true).sort()).toEqual(['ember', 'flyer']);
  });

  it('spawning in a biome produces its enemy and never inside walls', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    let x = -1;
    for (let i = 0; i < w.w && x < 0; i++) if (w.biome[i] === B.FROST && Math.abs(i - w.padX) > 60) x = i + 20;
    const y = w.padY + 40;
    // Open corridor with a floor so there is room to spawn.
    for (let dx = -20; dx <= 20; dx++) {
      for (let yy = y - 4; yy < y; yy++) w.set(x + dx, yy, T.AIR);
      w.set(x + dx, y, T.METAL);
    }
    g.body.x = x + 0.5;
    g.body.y = y;
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      g.enemies = [];
      const e = g.trySpawn();
      if (e) seen.add(e.kind);
    }
    expect(seen.has('hulk')).toBe(true);
    expect(seen.has('vine')).toBe(false);
  });

  it('kills drop the kind-specific item', () => {
    const g = new Game(defaultSave());
    g.body.y = g.world.padY + 20;
    g.carried = {};
    const e = makeEnemy(7, 'mite', g.body.x + 30, g.body.y);
    e.hp = 0;
    g.enemies = [e];
    g.step(1 / 60, { moveX: 0, jump: false, dig: false, place: false, aim: null });
    expect(g.carried.crystal).toBe(1);
  });

  it('shard mites hop at a nearby player; hulks are tanky and slow', () => {
    const w = generateWorld(1);
    const y = w.padY + 30;
    for (let x = 100; x < 120; x++) {
      for (let yy = y - 6; yy < y; yy++) w.set(x, yy, T.AIR);
      w.set(x, y, T.METAL);
    }
    const m = makeEnemy(1, 'mite', 105.5, y);
    let minY = m.y;
    for (let i = 0; i < 240; i++) {
      stepEnemy(w, m, 1 / 60, 108, y);
      minY = Math.min(minY, m.y);
    }
    expect(minY).toBeLessThan(y - 1);
    expect(ENEMIES.hulk.hp).toBeGreaterThan(ENEMIES.crawler.hp * 2);
    expect(ENEMIES.hulk.speed).toBeLessThan(ENEMIES.crawler.speed);
  });
});
