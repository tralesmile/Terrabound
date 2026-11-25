import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { cablesNear, cablesOf, runClear, stepRide, zipOffer, ZIP, type Ride } from '../src/sim/zipline';
import { T } from '../src/sim/tiles';
import { hudButtons, type HudButtonState } from '../src/ui/hudbuttons';

function grid(): { get(x: number, y: number): number; isSolid(x: number, y: number): boolean; put(x: number, y: number, t: number): void } {
  const m = new Map<string, number>();
  return {
    get: (x, y) => m.get(`${x},${y}`) ?? T.AIR,
    isSolid(x, y) { return this.get(x, y) === T.METAL; },
    put: (x, y, t) => void m.set(`${x},${y}`, t),
  };
}

describe('zipline', () => {
  it('strings a cable between two anchors with a clear run', () => {
    const w = grid();
    w.put(10, 40, T.ZIP);
    w.put(10, 20, T.ZIP);
    expect(cablesNear(w, 0, 0, 30, 50)).toEqual([{ a: { x: 10, y: 20 }, b: { x: 10, y: 40 } }]);
  });

  it('needs room for the rider, and respects length limits', () => {
    const w = grid();
    const a = { x: 10, y: 40 };
    const b = { x: 20, y: 40 };
    expect(runClear(w, a, b)).toBe(true);
    w.put(15, 39, T.METAL); // head height
    expect(runClear(w, a, b)).toBe(false);
    const close = [a, { x: 10, y: 40 - ZIP.minLen + 1 }];
    const far = [a, { x: 10, y: 40 - ZIP.reach - 1 }];
    expect(cablesOf(w, close)).toHaveLength(0);
    expect(cablesOf(w, far)).toHaveLength(0);
  });

  it('chains a row of anchors and rides up by default, down when holding down', () => {
    const w = grid();
    for (const y of [60, 45, 28]) w.put(10, y, T.ZIP);
    // Standing in the middle anchor's cell (feet at the cell floor).
    expect(zipOffer(w, 10.5, 46)?.to).toEqual({ x: 10, y: 28 });
    expect(zipOffer(w, 10.5, 46, true)?.to).toEqual({ x: 10, y: 60 });
    expect(zipOffer(w, 14, 46)).toBeNull();
  });

  it('offers nothing from a lone anchor', () => {
    const w = grid();
    w.put(10, 40, T.ZIP);
    expect(zipOffer(w, 10.5, 41)).toBeNull();
  });

  it('carries the rider to the far end at the riding speed, and drops them if the cable breaks', () => {
    const w = grid();
    w.put(10, 40, T.ZIP);
    w.put(10, 20, T.ZIP);
    const ride: Ride = { from: { x: 10, y: 40 }, to: { x: 10, y: 20 }, s: 0, check: 0 };
    let p = stepRide(w, ride, 0.1);
    expect(p?.y).toBeCloseTo(40.5 + ZIP.hang - ZIP.speed * 0.1);
    for (let i = 0; i < 40 && p && !p.done; i++) p = stepRide(w, ride, 0.1);
    expect(p?.done).toBe(true);
    expect(p?.y).toBeCloseTo(21);
    const again: Ride = { from: { x: 10, y: 40 }, to: { x: 10, y: 20 }, s: 0, check: 0 };
    w.put(10, 20, T.AIR);
    expect(stepRide(w, again, 0.1)).toBeNull();
  });

  it('gives touch players a ride button only when a ride is on offer', () => {
    const s: HudButtonState = { muted: false, musicOn: true, recall: 0, canRecall: false, atBase: false, hasBays: false, canAfford: false, touch: true, placeMode: false, canMount: false, riding: false, hooked: false, reeling: false, dash: false };
    expect(hudButtons({ ...s, zip: true }).map((b) => b.action)).toContain('zip');
    expect(hudButtons(s).map((b) => b.action)).not.toContain('zip');
  });
});

describe('zipline in the game', () => {
  /** A 1-column-clear shaft 24 deep with an anchor at the bottom and one at the top; the player stands at the bottom. */
  function rig(): { g: Game; x: number; top: number; bot: number } {
    const g = new Game(defaultSave());
    const w = g.world;
    const x = w.padX + 80;
    const bot = w.surface[x] + 30;
    const top = bot - 24;
    for (let xx = x - 2; xx <= x + 2; xx++) {
      for (let y = top - 4; y <= bot; y++) w.set(xx, y, xx === x ? T.AIR : T.METAL);
      w.set(xx, bot + 1, T.METAL);
    }
    w.set(x, bot, T.ZIP);
    w.set(x, top, T.ZIP);
    g.enemies = [];
    Object.assign(g.body, { x: x + 0.5, y: bot + 1, vx: 0, vy: 0 });
    return { g, x, top, bot };
  }
  const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
    for (let i = 0; i < Math.round(s / FIXED_DT); i++) {
      g.enemies = [];
      g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
    }
  };

  it('USE at the bottom anchor climbs the whole shaft and takes no fall damage', () => {
    const { g, top } = rig();
    run(g, 0.2);
    const hp = g.hp;
    expect(g.interact()).toBe(true);
    run(g, 1.0);
    expect(g.body.y).toBeLessThan(top + 14);
    run(g, 1.5);
    // Hangs at the top instead of falling back down the shaft.
    expect(g.zip).not.toBeNull();
    expect(g.body.y).toBeCloseTo(top + 1);
    expect(g.hp).toBe(hp);
    run(g, 0.05, { moveX: 1 });
    expect(g.zip).toBeNull();
  });

  it('jump hops off mid-cable', () => {
    const { g, top } = rig();
    run(g, 0.2);
    g.startZip();
    run(g, 0.4);
    run(g, 0.05, { jump: true });
    expect(g.zip).toBeNull();
    expect(g.body.y).toBeGreaterThan(top + 5);
  });

  it('mining the far anchor drops the rider', () => {
    const { g, x, top } = rig();
    run(g, 0.2);
    g.startZip();
    run(g, 0.3);
    g.world.set(x, top, T.AIR);
    run(g, 0.2);
    expect(g.zip).toBeNull();
  });
});
