import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, PAD_V, padUnder, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { ITEMS, PLACEABLE, T, TILES } from '../src/sim/tiles';
import { RECIPES } from '../src/sim/recipes';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};

/** Flat open ground 80 columns from the pad with a jump pad at `dx` from the player. */
function field(g: Game, padDx = 0): { x: number; y: number } {
  const w = g.world;
  const x = w.padX + 80;
  const y = w.surface[x];
  for (let xx = x - 14; xx <= x + 14; xx++) {
    for (let yy = y - 24; yy < y; yy++) w.set(xx, yy, T.AIR);
    w.set(xx, y, T.RUST);
  }
  w.set(x + padDx, y, T.JUMP_PAD);
  g.body.x = x + 0.5;
  g.body.y = y;
  g.body.vx = g.body.vy = 0;
  g.body.onGround = true;
  g.enemies = [];
  g.hp = g.derived.maxHp;
  return { x, y };
}

describe('jump pad', () => {
  it('is a solid placeable kit made at the fabricator', () => {
    expect(TILES[T.JUMP_PAD].solid).toBe(true);
    expect(TILES[T.JUMP_PAD].drop).toBe('jump_pad');
    expect(ITEMS.jump_pad.places).toBe(T.JUMP_PAD);
    expect(PLACEABLE).toContain('jump_pad');
    const r = RECIPES.find((x) => x.out === 'jump_pad');
    expect(r?.cost).toEqual({ metal: 2, copper_wire: 2 });
  });

  it('padUnder finds a pad under either foot only when standing on it', () => {
    const g = new Game(defaultSave());
    const { x, y } = field(g);
    expect(padUnder(g.world, x + 0.5, y)).toEqual({ x, y });
    // One foot over the pad's edge still counts.
    expect(padUnder(g.world, x + 1.2, y)).toEqual({ x, y });
    expect(padUnder(g.world, x + 2.5, y)).toBeNull();
    // In the air above it: no.
    expect(padUnder(g.world, x + 0.5, y - 0.5)).toBeNull();
  });

  it('stepping on a pad launches about 12 tiles up without holding jump, and the landing does not hurt', () => {
    const g = new Game(defaultSave());
    const { y } = field(g);
    const hp = g.hp;
    run(g, FIXED_DT);
    expect(g.body.vy).toBeLessThan(-PAD_V * 0.9);
    expect(g.drainEvents().some((e) => e.t === 'pad')).toBe(true);
    let top = g.body.y;
    // Walk off the pad sideways while airborne so the landing is on plain ground.
    for (let i = 0; i < 240; i++) {
      run(g, FIXED_DT, { moveX: 1 });
      top = Math.min(top, g.body.y);
    }
    expect(y - top).toBeGreaterThan(10);
    expect(y - top).toBeLessThan(15);
    expect(g.body.onGround).toBe(true);
    expect(g.hp).toBe(hp);
    expect(g.padLaunch).toBe(false);
  });

  it('holding down stands on the pad without launching', () => {
    const g = new Game(defaultSave());
    const { y } = field(g);
    run(g, 0.3, { down: true });
    expect(g.body.y).toBeCloseTo(y, 1);
    expect(g.drainEvents().some((e) => e.t === 'pad')).toBe(false);
  });

  it('an ordinary fall from the same height still hurts (the cushion is only after a launch)', () => {
    const g = new Game(defaultSave());
    const { y } = field(g, 8);
    g.body.y = y - 13;
    g.body.onGround = false;
    const hp = g.hp;
    run(g, 2);
    expect(g.body.onGround).toBe(true);
    expect(g.hp).toBeLessThan(hp);
  });
});
