import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T } from '../src/sim/tiles';
import { ENEMIES, makeEnemy, spawnableKinds, stepEnemy, type Enemy } from '../src/sim/enemies';
import { LURK, ambushHarmless, ceilingPerch } from '../src/sim/ambush';
import { Game, NO_CONTROLS, FIXED_DT } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { B } from '../src/sim/biomes';

const DT = 1 / 60;
/** A hall: floor on row 30, ceiling rows 0..21. */
function hall(): World {
  const w = new World(60, 40, 3);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) w.set(x, y, y >= 30 || y < 22 ? T.RUST : T.AIR);
  return w;
}
const hang = (x = 20.5): Enemy => ({ ...makeEnemy(1, 'lurker', x, 22 + ENEMIES.lurker.h), hang: true });
const run = (w: World, e: Enemy, t: number, px: number, py = 30): void => {
  for (let i = 0; i < Math.round(t / DT); i++) stepEnemy(w, e, DT, px, py);
};

describe('ceiling lurker', () => {
  it('hangs still while nobody is under it', () => {
    const w = hall();
    const e = hang();
    run(w, e, 3, 30);
    expect(e.hang).toBe(true);
    expect(e.y).toBeCloseTo(22 + ENEMIES.lurker.h, 5);
    expect(ambushHarmless(e)).toBe(true);
  });
  it('shakes for at least 0.4 s before it drops, then lands stunned and harmless', () => {
    const w = hall();
    const e = hang();
    expect(LURK.shake).toBeGreaterThanOrEqual(0.4);
    run(w, e, LURK.shake - 0.05, 20.5);
    expect(e.hang).toBe(true);
    expect(e.dropT).toBeGreaterThan(0);
    run(w, e, 0.15, 20.5);
    expect(e.hang).toBeFalsy();
    expect(ambushHarmless(e)).toBe(false);
    let landed = false;
    for (let i = 0; i < 90 && !landed; i++) {
      stepEnemy(w, e, DT, 20.5, 30);
      landed = (e.stunT ?? 0) > 0;
    }
    expect(landed).toBe(true);
    expect(e.y).toBeCloseTo(30, 1);
    expect(ambushHarmless(e)).toBe(true);
    run(w, e, LURK.stun + 0.5, 26);
    expect(ambushHarmless(e)).toBe(false);
    expect(e.x).toBeGreaterThan(20.6);
  });
  it('once it shakes, stepping aside does not stop the drop', () => {
    const w = hall();
    const e = hang();
    run(w, e, 0.1, 20.5);
    run(w, e, LURK.shake, 26);
    expect(e.hang).toBeFalsy();
  });
  it('ignores a player behind a floor or far below, and falls if its perch is dug away or it is hit', () => {
    const w = hall();
    for (let x = 15; x < 26; x++) w.set(x, 26, T.RUST);
    const a = hang();
    run(w, a, 1, 20.5);
    expect(a.dropT).toBeUndefined();
    const b = hang();
    for (let x = 18; x < 24; x++) w.set(x, 21, T.AIR);
    run(w, b, 0.1, 40);
    expect(b.hang).toBeFalsy();
    const c = hang(40.5);
    c.hp -= 1;
    run(w, c, 0.05, 10);
    expect(c.hang).toBeFalsy();
  });
  it('finds a perch only under a ceiling with room to fall', () => {
    const w = hall();
    expect(ceilingPerch(w, 20, 28)).toBe(22);
    for (let x = 0; x < 60; x++) w.set(x, 24, T.RUST);
    expect(ceilingPerch(w, 20, 23)).toBeNull();
    expect(ceilingPerch(w, 20, 29, 3)).toBeNull();
  });
  it('spawns from 16 m down in every biome', () => {
    for (const biome of Object.values(B)) {
      expect(spawnableKinds(16, biome as number)).toContain('lurker');
      expect(spawnableKinds(15, biome as number)).not.toContain('lurker');
    }
  });
  it('the game only ever spawns it hanging from a ceiling, and it bites on the way down', () => {
    const g = new Game(defaultSave());
    const bx = Math.floor(g.body.x) + 200;
    const by = Math.floor(g.world.padY) + 40;
    for (let y = by - 8; y <= by + 2; y++) for (let x = bx - 30; x <= bx + 30; x++) g.world.set(x, y, y >= by || y < by - 7 ? T.RUST : T.AIR);
    Object.assign(g.body, { x: bx + 0.5, y: by, vx: 0, vy: 0 });
    let seen = 0;
    for (let i = 0; i < 600 && seen < 3; i++) {
      g.enemies = [];
      const e = g.trySpawn();
      if (e?.kind !== 'lurker') continue;
      seen++;
      expect(e.hang).toBe(true);
      expect(g.world.isSolid(Math.floor(e.x), Math.floor(e.y - ENEMIES.lurker.h - 0.1))).toBe(true);
    }
    expect(seen).toBeGreaterThan(0);
    g.enemies = [{ ...makeEnemy(900, 'lurker', bx + 0.5, by - 7 + ENEMIES.lurker.h), hang: true }];
    (g as unknown as { spawnCd: number }).spawnCd = 999;
    const hp = g.hp;
    for (let i = 0; i < 120; i++) g.step(FIXED_DT, NO_CONTROLS);
    expect(g.hp).toBeLessThan(hp);
  });
});
