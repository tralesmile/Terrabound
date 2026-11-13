import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { generateWorld } from '../src/sim/world';
import { mulberry32 } from '../src/sim/rng';
import { ERUPT, bombHits, coneLive, craterOf, landingOf, launchBombs, launchMarked, nearestCone, nextGap, stepBomb } from '../src/sim/eruptions';

const cones = (w: ReturnType<typeof generateWorld>) => w.structures.filter((s) => s.kind === 'cone');

describe('cinder cone eruptions (pure)', () => {
  const w = generateWorld(42);
  const cone = cones(w)[0];

  it('finds the nearest live cone within reach and ignores far or plugged ones', () => {
    expect(cone).toBeDefined();
    const c = craterOf(cone);
    expect(nearestCone(w, c.x + 5, c.y)).toBe(cone);
    expect(nearestCone(w, c.x + ERUPT.near + 40, c.y) === cone).toBe(false);
    const w2 = generateWorld(42);
    const c2 = cones(w2)[0];
    w2.set(craterOf(c2).x, craterOf(c2).y, T.BASALT);
    expect(coneLive(w2, c2)).toBe(false);
    expect(nearestCone(w2, craterOf(c2).x, craterOf(c2).y) === c2).toBe(false);
  });

  it('launches 4-6 bombs upward from the crater, fanned to both sides', () => {
    const rng = mulberry32(5);
    for (let k = 0; k < 20; k++) {
      const bs = launchBombs(cone, rng);
      expect(bs.length).toBeGreaterThanOrEqual(ERUPT.minBombs);
      expect(bs.length).toBeLessThanOrEqual(ERUPT.maxBombs);
      expect(bs.some((b) => b.vx > 0)).toBe(true);
      expect(bs.some((b) => b.vx < 0)).toBe(true);
      for (const b of bs) expect(b.vy).toBeLessThanOrEqual(-ERUPT.minUp);
    }
  });

  it('bombs arc up, fall back and land on the ground without breaking it', () => {
    const before = Array.from(w.tiles);
    const bs = launchBombs(cone, mulberry32(9));
    for (const b of bs) {
      let peak = b.y;
      let t = 0;
      while (!stepBomb(w, b, FIXED_DT)) {
        peak = Math.min(peak, b.y);
        t += FIXED_DT;
        expect(t).toBeLessThan(ERUPT.maxLife + 0.1);
      }
      expect(peak).toBeLessThan(craterOf(cone).y - 2);
      expect(Math.abs(b.x - (craterOf(cone).x + 0.5))).toBeLessThan(15);
    }
    expect(Array.from(w.tiles)).toEqual(before);
  });

  it('every bomb carries a landing mark that matches where it really lands', () => {
    const bs = launchMarked(w, cone, mulberry32(11));
    for (const b of bs) {
      expect(b.lx).toBeDefined();
      const pred = { x: b.lx ?? 0, y: b.ly ?? 0 };
      while (!stepBomb(w, b, 1 / 60));
      expect(Math.abs(b.x - pred.x)).toBeLessThan(0.01);
      expect(Math.abs(b.y - pred.y)).toBeLessThan(0.01);
      // The mark sits on top of ground: solid below the landing cell's row.
      expect(landingOf(w, { ...b, x: pred.x, y: pred.y - 3, vx: 0, vy: 0, life: 0 }).y).toBeCloseTo(pred.y, 0);
    }
  });

  it('gaps between eruptions stay in range and the hit box is fair', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const g = nextGap(rng);
      expect(g).toBeGreaterThanOrEqual(ERUPT.minGap);
      expect(g).toBeLessThanOrEqual(ERUPT.maxGap);
    }
    expect(bombHits({ x: 10, y: 9 }, 10, 10, 1.8)).toBe(true);
    expect(bombHits({ x: 12, y: 9 }, 10, 10, 1.8)).toBe(false);
    expect(bombHits({ x: 10, y: 6 }, 10, 10, 1.8)).toBe(false);
  });
});

describe('cinder cone eruptions in the game', () => {
  function nearCone(): { g: Game; cx: number; cy: number } {
    const g = new Game(defaultSave());
    const cone = g.world.structures.find((s) => s.kind === 'cone');
    if (!cone) throw new Error('default world has no cone');
    const c = craterOf(cone);
    // Stand on the ground a few tiles past the cone's foot.
    const px = cone.x1 + 4;
    g.body.x = px + 0.5;
    g.body.y = g.world.surface[px] - 0.01;
    g.body.vx = g.body.vy = 0;
    return { g, cx: c.x, cy: c.y };
  }

  it('a near cone rumbles first (telegraph), then erupts, and the bombs come down', () => {
    const { g } = nearCone();
    g.eruptCd = 0.05;
    const seen: string[] = [];
    let rumbleAt = -1;
    let eruptAt = -1;
    let maxBombs = 0;
    let marked = false;
    for (let t = 0; t < 10; t += FIXED_DT) {
      g.step(FIXED_DT, NO_CONTROLS);
      for (const e of g.drainEvents()) {
        if (e.t === 'rumble' && rumbleAt < 0) rumbleAt = t;
        if (e.t === 'erupt' && eruptAt < 0) eruptAt = t;
        if (e.t === 'bombhit') seen.push(e.t);
      }
      maxBombs = Math.max(maxBombs, g.lavaBombs.length);
      if (g.lavaBombs.length && g.lavaBombs.every((b) => b.lx !== undefined)) marked = true;
      if (rumbleAt >= 0 && eruptAt < 0) expect(g.rumbleState()?.k ?? -1).toBeGreaterThanOrEqual(0);
    }
    expect(rumbleAt).toBeGreaterThanOrEqual(0);
    expect(eruptAt - rumbleAt).toBeGreaterThanOrEqual(ERUPT.rumbleT - 0.1);
    expect(maxBombs).toBeGreaterThanOrEqual(ERUPT.minBombs);
    expect(marked).toBe(true);
    expect(seen.length).toBeGreaterThanOrEqual(ERUPT.minBombs);
    expect(g.lavaBombs.length).toBe(0);
    expect(g.eruptCd).toBeGreaterThan(ERUPT.minGap - 10);
  });

  it('a bomb that lands on the player burns them and knocks them away', () => {
    const { g } = nearCone();
    const b = g.body;
    g.lavaBombs = [{ x: b.x + 0.3, y: b.y - 4, vx: 0, vy: 2, life: 0 }];
    const hp = g.hp;
    let sizzle = false;
    for (let i = 0; i < 40 && g.lavaBombs.length; i++) {
      g.step(FIXED_DT, NO_CONTROLS);
      for (const e of g.drainEvents()) if (e.t === 'sizzle') sizzle = true;
    }
    expect(g.hp).toBeLessThan(hp);
    expect(sizzle).toBe(true);
    expect(g.scorch).toBeGreaterThan(0);
  });

  it('a plugged cone never erupts, and a far player is never targeted', () => {
    const { g, cx, cy } = nearCone();
    g.world.set(cx, cy, T.BASALT);
    g.eruptCd = 0.05;
    for (let t = 0; t < 4; t += FIXED_DT) {
      g.step(FIXED_DT, NO_CONTROLS);
      expect(g.drainEvents().some((e) => e.t === 'rumble')).toBe(false);
    }
    const far = new Game(defaultSave());
    far.eruptCd = 0.05;
    for (let t = 0; t < 2; t += FIXED_DT) far.step(FIXED_DT, NO_CONTROLS);
    expect(far.rumble).toBeNull();
  });
});
