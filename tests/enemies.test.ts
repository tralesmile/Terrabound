import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, MAX_ENEMIES, type Controls } from '../src/sim/game';
import { ENEMIES, enemyBoxHits, makeEnemy, stepEnemy } from '../src/sim/enemies';
import { defaultSave } from '../src/sim/save';
import { generateWorld } from '../src/sim/world';

const run = (g: Game, seconds: number, c: Partial<Controls> = {}) => {
  const ctl = { ...NO_CONTROLS, ...c };
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) g.step(FIXED_DT, ctl);
};

const deepGame = (seed = 1) => {
  const s = defaultSave();
  s.seedBase = seed;
  const g = new Game(s);
  g.body.y = 40;
  return g;
};

/** Carve an open corridor with a floor so test shots and enemies are not stuck in rock. */
const openCorridor = (g: Game, len = 14) => {
  g.body.y = Math.floor(g.body.y);
  const bx = Math.floor(g.body.x);
  for (let dx = -2; dx <= len; dx++) {
    for (let dy = -4; dy <= -1; dy++) g.world.set(bx + dx, g.body.y + dy, 0);
    g.world.set(bx + dx, g.body.y, 1);
  }
};

describe('enemies', () => {
  it('spawns only in open space, away from the player, over many seeds', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const g = deepGame(seed);
      for (let i = 0; i < 40; i++) {
        g.enemies = [];
        const e = g.trySpawn();
        if (!e) continue;
        expect(enemyBoxHits(g.world, e)).toBe(false);
        expect(Math.abs(e.x - g.body.x)).toBeGreaterThanOrEqual(9);
      }
    }
  });

  it('never exceeds the enemy cap and never spawns near the surface', () => {
    const g = deepGame();
    for (let i = 0; i < 200; i++) g.trySpawn();
    expect(g.enemies.length).toBeLessThanOrEqual(MAX_ENEMIES);
    const shallow = new Game();
    shallow.body.y = 2;
    expect(shallow.trySpawn()).toBeNull();
  });

  it('is deterministic for the same seed', () => {
    const snap = () => {
      const g = deepGame(7);
      run(g, 20);
      return JSON.stringify(g.enemies.map((e) => [e.kind, e.x.toFixed(3), e.y.toFixed(3), e.hp]));
    };
    expect(snap()).toBe(snap());
  });

  it('crawlers stay in the world and keep finite state over a long simulation', () => {
    const w = generateWorld(3);
    const e = makeEnemy(1, 'crawler', w.padX + 0.5, 30.99);
    for (let i = 0; i < 60 * 120; i++) {
      stepEnemy(w, e, FIXED_DT, 5, 30);
      expect(Number.isFinite(e.x + e.y + e.vx + e.vy)).toBe(true);
    }
    expect(e.y).toBeLessThan(w.h);
  });

  it('flyers chase the player and avoid walls', () => {
    const w = generateWorld(3);
    const e = makeEnemy(1, 'flyer', 100, 20);
    for (let i = 0; i < 600; i++) stepEnemy(w, e, FIXED_DT, 100, 25);
    expect(enemyBoxHits(w, e)).toBe(false);
  });

  it('blade damages, knocks back and kills enemies, dropping scrap', () => {
    const g = deepGame();
    g.setTool('blade');
    const e = makeEnemy(99, 'crawler', g.body.x + 1.2, g.body.y);
    g.enemies = [e];
    g.facing = 1;
    g.hp = 100;
    run(g, 0.05, { dig: true });
    expect(e.hp).toBeLessThan(ENEMIES.crawler.hp);
    const before = g.carried.iron_scrap ?? 0;
    e.x = g.body.x + 1.2;
    e.iframes = 0;
    e.hp = 1;
    run(g, 0.5, { dig: true });
    expect(g.enemies.find((x) => x.id === 99)).toBeUndefined();
    expect(g.carried.iron_scrap ?? 0).toBe(before + 1);
  });

  it('contact damage respects i-frames', () => {
    const g = deepGame();
    g.enemies = [makeEnemy(5, 'crawler', g.body.x, g.body.y)];
    const hp = g.hp;
    run(g, 0.1);
    expect(g.hp).toBe(hp - ENEMIES.crawler.contact);
    g.enemies[0].x = g.body.x;
    g.enemies[0].y = g.body.y;
    run(g, 0.05);
    expect(g.hp).toBeGreaterThanOrEqual(hp - ENEMIES.crawler.contact - 0.001);
  });

  it('tool switching stops digging with the blade', () => {
    const g = deepGame();
    g.setTool('blade');
    const tx = Math.floor(g.body.x) + 1;
    const ty = Math.floor(g.body.y) - 1;
    g.world.set(tx, ty, 1);
    run(g, 1, { dig: true, aim: { tx, ty } });
    expect(g.world.get(tx, ty)).toBe(1);
    g.toggleTool();
    expect(g.tool).toBe('pistol');
    g.toggleTool();
    expect(g.tool).toBe('drill');
  });

  it('pistol bolt hits an enemy in line and is consumed', () => {
    const g = deepGame();
    g.setTool('pistol');
    openCorridor(g);
    g.enemies = [makeEnemy(7, 'crawler', g.body.x + 6, g.body.y - 0.01)];
    g.facing = 1;
    run(g, 0.6, { dig: true, aim: { tx: Math.floor(g.body.x) + 6, ty: Math.floor(g.body.y) - 1 } });
    expect(g.enemies[0].hp).toBeLessThan(ENEMIES.crawler.hp);
    expect(g.shots.length).toBeLessThanOrEqual(1);
  });

  it('pistol bolts stop at walls and never tunnel through a thin one', () => {
    const g = deepGame();
    g.setTool('pistol');
    openCorridor(g);
    const wx = Math.floor(g.body.x) + 3;
    const wy = Math.floor(g.body.y) - 1;
    for (let y = wy - 3; y <= wy + 1; y++) g.world.set(wx, y, 1);
    const e = makeEnemy(8, 'crawler', wx + 3, g.body.y - 0.01);
    g.enemies = [e];
    run(g, 1.2, { dig: true, aim: { tx: wx + 3, ty: wy } });
    expect(e.hp).toBe(ENEMIES.crawler.hp);
    expect(g.shots.length).toBeLessThanOrEqual(3);
  });

  it('pistol has a cooldown, costs battery and hit-stop freezes briefly', () => {
    const g = deepGame();
    g.setTool('pistol');
    openCorridor(g);
    const bat = g.battery;
    run(g, 0.2, { dig: true });
    expect(g.shots.length).toBe(1);
    expect(g.battery).toBeLessThan(bat);
    g.enemies = [makeEnemy(9, 'crawler', g.body.x + 1, g.body.y)];
    g.damageEnemy(g.enemies[0], 1, 1);
    const t = g.time;
    g.step(FIXED_DT, NO_CONTROLS);
    expect(g.time).toBe(t);
  });

  it('enemies vanish at the base', () => {
    const g = new Game();
    g.enemies = [makeEnemy(1, 'flyer', g.body.x + 3, g.body.y - 1)];
    run(g, 0.1);
    expect(g.enemies.length).toBe(0);
  });
});
