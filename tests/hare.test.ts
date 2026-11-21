import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { ENEMIES, makeEnemy, spawnableKinds, stepEnemy } from '../src/sim/enemies';
import { shouldTeach } from '../src/sim/teach';
import { FOOD } from '../src/sim/fishing';
import { ITEMS } from '../src/sim/tiles';

describe('scrap hare (wildlife)', () => {
  it('is passive: never spawns as an enemy, never teaches, never hurts', () => {
    expect(ENEMIES.hare.passive).toBe(true);
    expect(ENEMIES.hare.contact).toBe(0);
    for (const depth of [0, 20, 100]) expect(spawnableKinds(depth, 0, false)).not.toContain('hare');
    expect(spawnableKinds(0, 0, true)).not.toContain('hare');
    expect(shouldTeach([], 'hare')).toBe(false);
  });
  it('drops meat that heals', () => {
    expect(ENEMIES.hare.drop).toBe('hare_meat');
    expect(ITEMS.hare_meat.name).toBe('Hare meat');
    expect(FOOD.hare_meat?.hp).toBeGreaterThan(0);
  });
  it('runs away from the player when close', () => {
    const g = new Game(defaultSave(21));
    const x = g.world.padX + 30;
    let y = 0;
    while (!g.world.isSolid(x, y)) y++;
    const e = makeEnemy(1, 'hare', x + 0.5, y, 0);
    for (let i = 0; i < 20; i++) stepEnemy(g.world, e, 0.05, e.x - 3, e.y); // player 3 tiles to its left
    expect(e.dir).toBe(1);
    expect(e.vx).toBeGreaterThan(0);
  });
  it('daytime surface spawns hares, capped at three, never near the pad', () => {
    const g = new Game(defaultSave(22));
    g.body.x = g.world.padX + 40;
    g.body.y = g.world.padY - 1;
    let n = 0;
    for (let i = 0; i < 40; i++) if (g.trySpawnWild()) n++;
    const hares = g.enemies.filter((e) => e.kind === 'hare');
    expect(hares.length).toBeLessThanOrEqual(3);
    for (const h of hares) expect(Math.abs(h.x - g.world.padX)).toBeGreaterThan(8);
    expect(n).toBe(hares.length);
  });
});

describe('biome wildlife', () => {
  it('hog, goat and skink are passive and drop meat that heals', () => {
    for (const k of ['hog', 'goat', 'lizard'] as const) {
      expect(ENEMIES[k].passive).toBe(true);
      expect(ENEMIES[k].contact).toBe(0);
      expect(shouldTeach([], k)).toBe(false);
      expect(spawnableKinds(10, 0, false)).not.toContain(k);
      expect(FOOD[ENEMIES[k].drop!]?.hp).toBeGreaterThan(0);
    }
    expect(FOOD.prime_meat?.hp).toBeGreaterThan(FOOD.hare_meat?.hp ?? 99);
  });
  it('each biome spawns its own critter', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 40 && seen.size < 3; seed++) {
      const g = new Game(defaultSave(seed));
      for (let i = 0; i < 30; i++) {
        g.body.x = g.world.padX + ((i * 37) % 400) - 200;
        g.body.y = g.world.padY - 1;
        g.enemies.length = 0;
        const e = g.trySpawnWild();
        if (e) seen.add(e.kind);
      }
    }
    expect(seen.has('hare')).toBe(true);
    expect(seen.size).toBeGreaterThan(1);
  });
});
