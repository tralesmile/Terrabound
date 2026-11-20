import { describe, expect, it } from 'vitest';
import { FALL, FALLS, disturb, stepFalling, type FallBody, type FallWarn } from '../src/sim/falling';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { generateWorld, type World } from '../src/sim/world';

/** An open shaft at column x0 from row top to floor (solid rust floor at `floor`). */
const shaft = (w: World, x0: number, top: number, floor: number) => {
  for (let y = top; y < floor; y++) for (let dx = -1; dx <= 1; dx++) w.set(x0 + dx, y, T.AIR);
  for (let dx = -1; dx <= 1; dx++) w.set(x0 + dx, floor, T.RUST);
};

const setup = () => {
  const w = generateWorld(8);
  const x0 = Math.floor(w.padX) + 40;
  const top = Math.floor(w.padY) + 20;
  shaft(w, x0, top, top + 12);
  return { w, x0, top, floor: top + 12 };
};

const runFall = (w: World, warns: FallWarn[], bodies: FallBody[], secs: number, hits: (x: number, y: number) => boolean = () => false) => {
  const all = { started: 0, landed: [] as Array<{ x: number; y: number; tile: number }>, broke: [] as Array<{ player: boolean }> };
  for (let i = 0; i < Math.round(secs / FIXED_DT); i++) {
    const r = stepFalling(w, warns, bodies, FIXED_DT, hits);
    all.started += r.started.length;
    all.landed.push(...r.landed);
    all.broke.push(...r.broke);
  }
  return all;
};

describe('falling blocks', () => {
  it('only loose tiles fall, and the telegraph is at least 0.4 s', () => {
    expect(FALLS.has(T.SAND)).toBe(true);
    expect(FALLS.has(T.ASH)).toBe(true);
    expect(FALLS.has(T.RUST)).toBe(false);
    expect(FALLS.has(T.METAL)).toBe(false);
    expect(FALL.warn).toBeGreaterThanOrEqual(0.4);
  });

  it('a disturbed loose block wobbles, then drops and comes to rest on the floor', () => {
    const { w, x0, top, floor } = setup();
    w.set(x0, top, T.SAND);
    const warns: FallWarn[] = [];
    const bodies: FallBody[] = [];
    expect(disturb(w, x0, top + 1, warns)).toBe(true);
    expect(disturb(w, x0, top + 1, warns)).toBe(false); // no double warning
    // Still in place during the wobble.
    runFall(w, warns, bodies, FALL.warn * 0.8);
    expect(w.get(x0, top)).toBe(T.SAND);
    const r = runFall(w, warns, bodies, 3);
    expect(r.started).toBe(1);
    expect(w.get(x0, top)).toBe(T.AIR);
    expect(w.get(x0, floor - 1)).toBe(T.SAND);
    expect(r.landed).toEqual([{ x: x0, y: floor - 1, tile: T.SAND }]);
  });

  it('solid ground does not fall, and nothing warns over a filled cell', () => {
    const { w, x0, top } = setup();
    w.set(x0, top, T.RUST);
    expect(disturb(w, x0, top + 1, [])).toBe(false);
    w.set(x0, top, T.SAND);
    w.set(x0, top + 1, T.METAL);
    expect(disturb(w, x0, top + 1, [])).toBe(false);
  });

  it('a column of loose blocks cascades down and piles up in order', () => {
    const { w, x0, top, floor } = setup();
    w.set(x0, top, T.ASH);
    w.set(x0, top + 1, T.SAND);
    w.set(x0, top + 2, T.SAND);
    const warns: FallWarn[] = [];
    const bodies: FallBody[] = [];
    disturb(w, x0, top + 3, warns);
    const r = runFall(w, warns, bodies, 6);
    expect(r.started).toBe(3);
    expect(w.get(x0, floor - 1)).toBe(T.SAND);
    expect(w.get(x0, floor - 2)).toBe(T.SAND);
    expect(w.get(x0, floor - 3)).toBe(T.ASH);
    expect(w.get(x0, top)).toBe(T.AIR);
  });

  it('digging the block out during its wobble cancels the fall', () => {
    const { w, x0, top } = setup();
    w.set(x0, top, T.SAND);
    const warns: FallWarn[] = [];
    disturb(w, x0, top + 1, warns);
    w.set(x0, top, T.AIR);
    const r = runFall(w, warns, [], 2);
    expect(r.started).toBe(0);
    expect(warns.length).toBe(0);
  });

  it('a block that lands on the player breaks into a pickup instead of burying them', () => {
    const { w, x0, top, floor } = setup();
    w.set(x0, top, T.SAND);
    const warns: FallWarn[] = [];
    disturb(w, x0, top + 1, warns);
    const playerTop = floor - 2; // a 2-tile-tall player standing on the floor
    const r = runFall(w, warns, [], 3, (x, y) => x === x0 && y + 1 > playerTop);
    expect(r.broke.length).toBe(1);
    expect(r.broke[0].player).toBe(true);
    expect(w.get(x0, floor - 1)).toBe(T.AIR);
  });

  it('is deterministic', () => {
    const a = setup();
    const b = setup();
    for (const s of [a, b]) {
      s.w.set(s.x0, s.top, T.SAND);
      s.w.set(s.x0, s.top + 1, T.SAND);
    }
    const wa: FallWarn[] = [];
    const wb: FallWarn[] = [];
    disturb(a.w, a.x0, a.top + 2, wa);
    disturb(b.w, b.x0, b.top + 2, wb);
    const ba: FallBody[] = [];
    const bb: FallBody[] = [];
    for (let i = 0; i < 40; i++) {
      stepFalling(a.w, wa, ba, FIXED_DT, () => false);
      stepFalling(b.w, wb, bb, FIXED_DT, () => false);
      expect(ba).toEqual(bb);
    }
  });
});

describe('falling blocks in the game', () => {
  it('drilling out the block under loose sand brings the sand down onto the player for a little damage', () => {
    const g = new Game(defaultSave());
    const bx = Math.floor(g.body.x);
    const by = Math.floor(g.world.padY) + 14;
    // A pocket: the player stands at (bx, by) on a floor; rust above the head, loose sand above that.
    for (let dx = -2; dx <= 2; dx++) {
      for (let y = by - 6; y < by; y++) g.world.set(bx + dx, y, T.AIR);
      g.world.set(bx + dx, by, T.METAL);
    }
    g.world.set(bx, by - 3, T.RUST);
    g.world.set(bx, by - 4, T.SAND);
    g.body.x = bx + 0.5;
    g.body.y = by;
    g.body.vy = 0;
    g.drainEvents();
    const hp = g.hp;
    for (let i = 0; i < Math.round(3 / FIXED_DT) && g.world.get(bx, by - 3) !== T.AIR; i++) g.step(FIXED_DT, { ...NO_CONTROLS, dig: true, aim: { tx: bx, ty: by - 3 } });
    expect(g.world.get(bx, by - 3)).toBe(T.AIR);
    for (let i = 0; i < Math.round(2 / FIXED_DT); i++) g.step(FIXED_DT, NO_CONTROLS);
    const ev = g.drainEvents();
    expect(ev.some((e) => e.t === 'fallwarn')).toBe(true);
    expect(g.world.get(bx, by - 4)).toBe(T.AIR);
    expect(g.hp).toBeLessThan(hp);
    expect(g.hp).toBeGreaterThanOrEqual(hp - FALL.dmg - 0.001);
  });
});
