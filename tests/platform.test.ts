import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { T, isMinable } from '../src/sim/tiles';
import { RECIPES } from '../src/sim/recipes';
import { captureBase, sanitizeBase } from '../src/sim/base';
import type { Controls } from '../src/sim/game';

function run(g: Game, secs: number, c: Partial<Controls> = {}): void {
  for (let i = 0; i < secs * 60; i++) g.step(1 / 60, { moveX: 0, jump: false, down: false, place: false, mine: false, aim: null, ...c } as Controls);
}

function shaft(g: Game): void {
  for (let y = 40; y <= 70; y++) {
    g.world.set(40, y, T.AIR);
    g.world.set(39, y, T.RUST);
    g.world.set(41, y, T.RUST);
  }
  g.world.set(40, 71, T.RUST);
}

describe('one-way platforms', () => {
  it('is non-solid, minable and craftable', () => {
    expect(isMinable(T.PLATFORM)).toBe(true);
    expect(new Game().world.isSolid(0, 0)).toBe(false);
    expect(RECIPES.some((r) => r.id === 'platform')).toBe(true);
  });

  it('lands a falling player', () => {
    const g = new Game();
    shaft(g);
    g.world.set(40, 60, T.PLATFORM);
    g.body.x = 40.5;
    g.body.y = 50;
    g.body.vy = 0;
    run(g, 2);
    expect(g.body.y).toBeCloseTo(60, 1);
    expect(g.body.onGround).toBe(true);
  });

  it('can be jumped up through from below', () => {
    const g = new Game();
    shaft(g);
    g.world.set(40, 69, T.PLATFORM);
    g.body.x = 40.5;
    g.body.y = 71;
    g.body.vy = 0;
    run(g, 0.1);
    run(g, 0.3, { jump: true });
    run(g, 1.5);
    expect(g.body.y).toBeCloseTo(69, 1);
  });

  it('pressing down drops through', () => {
    const g = new Game();
    shaft(g);
    g.world.set(40, 60, T.PLATFORM);
    g.body.x = 40.5;
    g.body.y = 59.9;
    run(g, 1);
    expect(g.body.y).toBeCloseTo(60, 1);
    run(g, 1.5, { down: true });
    expect(g.body.y).toBeGreaterThan(65);
  });

  it('persists in the base and sanitizes', () => {
    const g = new Game();
    g.world.set(g.world.padX + 1, g.world.padY - 3, T.PLATFORM);
    expect(captureBase(g.world)).toContain(T.PLATFORM);
    expect(sanitizeBase([1, 3, T.PLATFORM])).toEqual([1, 3, T.PLATFORM]);
  });
});
