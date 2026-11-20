import { describe, expect, it } from 'vitest';
import { ENEMIES, makeEnemy, slamWindup, stepEnemy } from '../src/sim/enemies';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { rearScale } from '../src/render/fx';
import { generateWorld } from '../src/sim/world';
import { T } from '../src/sim/tiles';

const SLAM = ENEMIES.hulk.slam!;

/** A flat open floor at row y around x0. */
const flatWorld = () => {
  const w = generateWorld(5);
  const y = Math.floor(w.padY + 14);
  const x0 = Math.floor(w.padX) + 30;
  for (let dx = -10; dx <= 10; dx++) {
    for (let dy = 1; dy <= 6; dy++) w.set(x0 + dx, y - dy, T.AIR);
    w.set(x0 + dx, y, T.RUST);
  }
  return { w, x0, y };
};

const deepGame = () => {
  const s = defaultSave();
  s.met = Object.keys(ENEMIES) as never;
  const g = new Game(s);
  g.body.y = Math.floor(g.body.y) + 10;
  const bx = Math.floor(g.body.x);
  const by = Math.floor(g.body.y);
  for (let dx = -8; dx <= 8; dx++) {
    for (let dy = 1; dy <= 5; dy++) g.world.set(bx + dx, by - dy, T.AIR);
    g.world.set(bx + dx, by, T.RUST);
  }
  g.body.y = by;
  g.body.vy = 0;
  return g;
};

const run = (g: Game, s: number, c: Partial<Controls> = {}) => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};

describe('Frost hulk slam (anticipation)', () => {
  it('telegraphs for at least 0.4 s before it lands', () => {
    expect(SLAM.windup).toBeGreaterThanOrEqual(0.4);
    expect(SLAM.radius).toBeGreaterThanOrEqual(SLAM.range - 0.5);
  });

  it('plants its feet for the wind-up, then lands exactly once and cools down', () => {
    const { w, x0, y } = flatWorld();
    const e = makeEnemy(1, 'hulk', x0 + 0.5, y);
    let started = -1;
    let landed = -1;
    let moved = 0;
    for (let i = 0; i < 240; i++) {
      const x = e.x;
      stepEnemy(w, e, FIXED_DT, x0 + 2, y);
      if (started < 0 && e.slamT !== undefined) started = i;
      if (started >= 0 && landed < 0 && e.slamT !== undefined) moved += Math.abs(e.x - x);
      if (e.slammed) {
        if (landed < 0) landed = i;
        e.slammed = false;
      }
    }
    expect(started).toBeGreaterThanOrEqual(0);
    expect(landed).toBeGreaterThan(started);
    expect((landed - started + 1) * FIXED_DT).toBeGreaterThanOrEqual(SLAM.windup - 1e-9);
    expect(moved).toBeLessThan(1e-6);
    expect(e.slamCd).toBeGreaterThan(0);
  });

  it('does not wind up when the player is out of range or far above it', () => {
    const { w, x0, y } = flatWorld();
    const far = makeEnemy(1, 'hulk', x0 + 0.5, y);
    const above = makeEnemy(2, 'hulk', x0 + 0.5, y);
    for (let i = 0; i < 60; i++) {
      stepEnemy(w, far, FIXED_DT, x0 + 6, y);
      stepEnemy(w, above, FIXED_DT, x0 + 1, y - 4);
    }
    expect(far.slamT).toBeUndefined();
    expect(above.slamT).toBeUndefined();
  });

  it('hurts a grounded player in reach; a jump dodges it', () => {
    const g = deepGame();
    g.enemies = [makeEnemy(3, 'hulk', g.body.x + 1.8, g.body.y)];
    g.drainEvents();
    const hp = g.hp;
    run(g, SLAM.windup + 0.2);
    const ev = g.drainEvents().filter((x) => x.t === 'enemyslam');
    expect(ev.length).toBe(1);
    expect(g.hp).toBeLessThan(hp);

    const d = deepGame();
    d.enemies = [makeEnemy(4, 'hulk', d.body.x + 1.8, d.body.y)];
    d.drainEvents();
    const hp2 = d.hp;
    // Wait for the rear-up, then jump over the landing.
    for (let i = 0; i < Math.round(1 / FIXED_DT) && d.enemies[0].slamT === undefined; i++) d.step(FIXED_DT, NO_CONTROLS);
    for (let i = 0; i < Math.round(0.2 / FIXED_DT); i++) d.step(FIXED_DT, NO_CONTROLS);
    run(d, 0.15, { jump: true });
    run(d, 0.3);
    const slams = d.drainEvents().filter((x) => x.t === 'enemyslam');
    expect(slams.length).toBe(1);
    expect(slams[0].t === 'enemyslam' && slams[0].hit).toBe(false);
    expect(d.hp).toBe(hp2);
  });

  it('a teacher hulk only shoves on its first slam', () => {
    const g = deepGame();
    g['save'].met = [];
    g.enemies = [{ ...makeEnemy(5, 'hulk', g.body.x + 1.8, g.body.y), teach: true }];
    const hp = g.hp;
    run(g, SLAM.windup + 0.2);
    expect(g.hp).toBe(hp);
    expect(g.metKinds).toContain('hulk');
  });

  it('the wind-up pose rears up tall and settles when idle', () => {
    const e = makeEnemy(1, 'hulk', 0, 0);
    expect(slamWindup(e)).toBe(0);
    e.slamT = SLAM.windup / 2;
    expect(slamWindup(e)).toBeCloseTo(0.5);
    const r = rearScale(1)!;
    expect(r.sy).toBeGreaterThan(1);
    expect(r.sx).toBeLessThan(1);
    expect(rearScale(0)).toBeNull();
  });
});
