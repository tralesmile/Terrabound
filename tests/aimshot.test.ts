import { describe, expect, it } from 'vitest';
import { Game, NO_CONTROLS, FIXED_DT } from '../src/sim/game';
import { T } from '../src/sim/tiles';
import { defaultSave } from '../src/sim/save';
import { Haptics, rumbleStrength } from '../src/platform/haptics';

/** A game with a clear gallery and one flyer up and to the right of the player. */
function range(): Game {
  const g = new Game(defaultSave());
  g.body.x += 200;
  const bx = Math.floor(g.body.x);
  const by = Math.floor(g.body.y);
  for (let y = by - 10; y < by; y++) for (let x = bx - 12; x <= bx + 12; x++) g.world.set(x, y, T.AIR);
  g.enemies = [{ id: 77, kind: 'flyer', x: g.body.x + 6, y: g.body.y - 2.5, vx: 0, vy: 0, hp: 14, dir: -1, iframes: 0, age: 0, phase: 0 }];
  g.tool = 'pistol';
  return g;
}
const aim = (g: Game) => ({ tx: Math.floor(g.body.x) + 6, ty: Math.floor(g.body.y) - 1 });

describe('aim assist in the sim', () => {
  it('a finger shot beside an enemy locks and flies at it; a mouse shot is left alone', () => {
    const touch = range();
    const e = touch.enemies[0];
    touch.step(FIXED_DT, { ...NO_CONTROLS, dig: true, aim: aim(touch), finger: { x: e.x + 0.8, y: e.y + 0.9 } });
    expect(touch.lock?.id).toBe(77);
    expect(touch.shots[0].vy).toBeLessThan(0);
    const mouse = range();
    mouse.step(FIXED_DT, { ...NO_CONTROLS, dig: true, aim: aim(mouse) });
    expect(mouse.lock).toBeNull();
  });
  it('a resting controller shoots level when nothing is in the cone, not at its feet', () => {
    const g = range();
    g.enemies = [];
    g.facing = 1;
    g.step(FIXED_DT, { ...NO_CONTROLS, dig: true, aim: { tx: Math.floor(g.body.x + 0.9), ty: Math.floor(g.body.y - 0.1) }, assist: { cone: 0.85, level: true } });
    expect(g.shots.length).toBe(1);
    expect(Math.abs(g.shots[0].vy)).toBeLessThan(1e-6);
    expect(g.shots[0].vx).toBeGreaterThan(0);
  });
  it('the lock clears once the pistol is put away', () => {
    const g = range();
    g.step(FIXED_DT, { ...NO_CONTROLS, dig: true, aim: aim(g), assist: { cone: 0.85, level: true } });
    expect(g.lock).not.toBeNull();
    g.tool = 'drill';
    g.step(FIXED_DT, NO_CONTROLS);
    expect(g.lock).toBeNull();
  });
});

describe('controller rumble', () => {
  it('uses the pad motors when a controller is in play, the phone only on touch', () => {
    const buzz: number[] = [];
    const rumble: [number, number][] = [];
    const h = new Haptics(() => buzz.push(1) > 0, (ms, s) => rumble.push([ms, s]));
    h.pad = true;
    h.fire({ t: 'death' } as never, 1000);
    expect(rumble).toEqual([[200, 1]]);
    expect(buzz.length).toBe(0);
    h.pad = false;
    expect(h.fire({ t: 'death' } as never, 5000)).toBeNull();
    h.touch = true;
    h.fire({ t: 'death' } as never, 9000);
    expect(buzz.length).toBe(1);
    h.enabled = false;
    h.pad = true;
    h.fire({ t: 'death' } as never, 13000);
    expect(rumble.length).toBe(1);
    expect(rumbleStrength(6)).toBeLessThan(0.3);
  });
});
