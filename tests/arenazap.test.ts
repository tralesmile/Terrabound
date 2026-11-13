import { describe, expect, it } from 'vitest';
import { BOSSES, makeBoss } from '../src/sim/bosses';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { floorBelow, stepZap, zapHits, zapRadius, zapsNow, ZAP_HALF, ZAP_REST, ZAP_REACH, ZAP_SPEED, ZAP_WARN } from '../src/sim/arenazap';

const flat = (_x: number, y: number) => y >= 20;

function enraged() {
  const b = makeBoss('hollow_ai', 100, 17);
  b.hp = BOSSES.hollow_ai.hp * 0.4;
  return b;
}

describe('Hollow AI floor zaps', () => {
  it('only the Hollow AI zaps, and only in phase 2', () => {
    const calm = makeBoss('hollow_ai', 100, 17);
    expect(zapsNow(calm)).toBe(false);
    for (let i = 0; i < 300; i++) expect(stepZap(calm, 1 / 60, flat)).toBeNull();
    expect(calm.zap).toBeNull();
    const golem = makeBoss('golem', 100, 20);
    golem.hp = 1;
    expect(zapsNow(golem)).toBe(false);
    expect(zapsNow(enraged())).toBe(true);
  });

  it('telegraphs for ZAP_WARN, then the crest rolls out at ZAP_SPEED from the floor under the boss', () => {
    const b = enraged();
    let warns = 0;
    let t = 0;
    while (!b.zap && t < 5) {
      if (stepZap(b, 0.05, flat) === 'warn') warns++;
      t += 0.05;
    }
    expect(warns).toBe(1);
    const z = b.zap!;
    expect(z.y0).toBe(20);
    expect(z.x0).toBe(100);
    expect(z.t).toBeCloseTo(-ZAP_WARN);
    expect(zapRadius(z)).toBe(-1);
    stepZap(b, ZAP_WARN + 0.5, flat);
    expect(zapRadius(b.zap!)).toBeCloseTo(0.5 * ZAP_SPEED);
  });

  it('hurts a grounded player once as the crest passes; a jump or another floor dodges it', () => {
    const b = enraged();
    b.zap = { t: 0.5, x0: 100, y0: 20, hit: false };
    const r = 0.5 * ZAP_SPEED;
    expect(zapHits(b.zap, 100 + r + ZAP_HALF + 0.3, 20, true)).toBe(false);
    expect(zapHits(b.zap, 100 - r, 20, false)).toBe(false);
    expect(zapHits(b.zap, 100 - r, 12, true)).toBe(false);
    expect(zapHits(b.zap, 100 - r, 20, true)).toBe(true);
    expect(zapHits(b.zap, 100 + r, 20, true)).toBe(false);
    expect(zapHits({ t: -0.2, x0: 100, y0: 20, hit: false }, 100, 20, true)).toBe(false);
    expect(zapHits(null, 100, 20, true)).toBe(false);
  });

  it('waves end after crossing the arena and repeat every ZAP_REST', () => {
    const b = enraged();
    const starts: number[] = [];
    for (let i = 0; i < 1200; i++) {
      if (stepZap(b, 0.01, flat) === 'warn') starts.push(i * 0.01);
      if (b.zap) expect(zapRadius(b.zap)).toBeLessThanOrEqual(ZAP_REACH + 1);
    }
    expect(starts.length).toBeGreaterThanOrEqual(2);
    const gap = starts[1] - starts[0];
    expect(gap).toBeCloseTo(ZAP_WARN + ZAP_REACH / ZAP_SPEED + ZAP_REST, 1);
    expect(gap).toBeLessThan(6);
  });

  it('floorBelow finds the first floor row under a point', () => {
    const step = (x: number, y: number) => (x >= 5 ? y >= 8 : y >= 10);
    expect(floorBelow(step, 2.5, 3)).toBe(10);
    expect(floorBelow(step, 6.5, 3)).toBe(8);
    expect(floorBelow(() => false, 0, 3, 5)).toBe(8);
  });
});

describe('floor zaps in a fight', () => {
  it('a grounded player under the crest takes damage and hops; an airborne one does not', () => {
    const run = (air: boolean) => {
      const g = new Game(defaultSave());
      g.step(FIXED_DT, NO_CONTROLS);
      const x = g.world.padX + 60;
      g.body.x = x + 0.5;
      g.body.y = g.world.surface[x];
      g.body.onGround = !air;
      g.body.vy = air ? -6 : 0;
      g.boss = makeBoss('hollow_ai', g.body.x + 14, g.body.y - 4);
      g.boss.hp = BOSSES.hollow_ai.hp * 0.4;
      g.boss.zapCd = 99;
      // Crest exactly under the player (it moves ~0.18 tiles in one step, well inside the band).
      g.boss.zap = { t: 0.5, x0: g.body.x + 0.5 * ZAP_SPEED, y0: g.body.y, hit: false };
      const hp = g.hp;
      g.drainEvents();
      g.step(FIXED_DT, NO_CONTROLS);
      return { lost: hp - g.hp, hit: g.drainEvents().some((e) => e.t === 'zaphit') };
    };
    const ground = run(false);
    expect(ground.hit).toBe(true);
    expect(ground.lost).toBeGreaterThan(0);
    const air = run(true);
    expect(air.hit).toBe(false);
  });
});

describe('floor zap art', () => {
  it('charging pool swells under the boss; the crest band rides the radius with a fading wake', async () => {
    const { zapGlow, zapArc } = await import('../src/render/arenafx');
    const early = { t: -ZAP_WARN, x0: 0, y0: 0, hit: false };
    const late = { t: -0.05, x0: 0, y0: 0, hit: false };
    expect(zapGlow(2, early)).toBe(0);
    expect(zapGlow(2, late)).toBeGreaterThan(0.8);
    const z = { t: 1, x0: 0, y0: 0, hit: false };
    const r = ZAP_SPEED;
    expect(zapGlow(r, z)).toBe(1);
    expect(zapGlow(-r, z)).toBe(1);
    expect(zapGlow(r + 3, z)).toBe(0);
    expect(zapGlow(r - 2.5, z)).toBeLessThan(0.6);
    expect(zapGlow(r - 8, z)).toBe(0);
    for (let d = 0; d < 40; d += 0.25) {
      expect(zapGlow(d, z)).toBeGreaterThanOrEqual(0);
      expect(zapGlow(d, z)).toBeLessThanOrEqual(1);
    }
    const arc = zapArc(42, 1.4);
    expect(arc[0]).toEqual({ dx: 0, dy: 0 });
    expect(arc[arc.length - 1].dy).toBeCloseTo(-1.4);
    expect(arc.every((p) => Math.abs(p.dx) <= 0.35)).toBe(true);
    expect(zapArc(42, 1.4)).toEqual(arc);
  });
});
