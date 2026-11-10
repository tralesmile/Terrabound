import { describe, expect, it } from 'vitest';
import { Fx } from '../src/render/fx';
import { CRAWLER_ROWS, ENEMY_ART_UNIT, ENEMY_W, FLYER_ROWS, PAL, enemyFrame, spriteDebris } from '../src/render/sprites';

const palColors = new Set(Object.values(PAL));

describe('enemy animation', () => {
  it('crawler has a 4-step scuttle and flyer a 3-frame rotor, all the same height', () => {
    expect(CRAWLER_ROWS.length).toBe(4);
    expect(FLYER_ROWS.length).toBe(3);
    for (const set of [CRAWLER_ROWS, FLYER_ROWS]) for (const f of set) expect(f.length).toBe(set[0].length);
  });
  it('frames advance with time and wrap', () => {
    const seen = new Set<string[]>();
    for (let t = 0; t < 1; t += 0.01) seen.add(enemyFrame('crawler', t));
    expect(seen.size).toBe(4);
    expect(enemyFrame('flyer', 0)).toBe(FLYER_ROWS[0]);
    expect(enemyFrame('flyer', 1 / 24 + 1e-6)).toBe(FLYER_ROWS[1]);
    expect(enemyFrame('crawler', -5)).toBe(CRAWLER_ROWS[0]);
  });
  it('crawler eye sits on the right (facing side)', () => {
    const eyeCols = CRAWLER_ROWS[0].flatMap((r) => [...r].map((ch, c) => (ch === 'e' ? c : -1)).filter((c) => c >= 0));
    expect(eyeCols.length).toBeGreaterThan(0);
    for (const c of eyeCols) expect(c).toBeGreaterThan(ENEMY_W / 2);
  });
});

describe('death shatter', () => {
  it('debris covers the sprite in palette colours and inside its bounds', () => {
    for (const rows of [CRAWLER_ROWS[0], FLYER_ROWS[0]]) {
      const pieces = spriteDebris(rows, ENEMY_W, false);
      expect(pieces.length).toBeGreaterThan(8);
      for (const p of pieces) {
        expect(palColors.has(p.color)).toBe(true);
        expect(Math.abs(p.dx)).toBeLessThanOrEqual(ENEMY_W / 2);
        expect(p.dy).toBeLessThan(0);
        expect(p.dy).toBeGreaterThanOrEqual(-rows.length);
      }
    }
  });
  it('flipping mirrors debris horizontally', () => {
    const a = spriteDebris(CRAWLER_ROWS[0], ENEMY_W, false);
    const b = spriteDebris(CRAWLER_ROWS[0], ENEMY_W, true);
    expect(b.length).toBe(a.length);
    a.forEach((p, i) => expect(b[i].dx).toBeCloseTo(-p.dx));
  });
  it('an empty sprite yields no debris', () => {
    expect(spriteDebris(['', '   '], ENEMY_W, false)).toEqual([]);
  });
  it('shatter spawns coloured debris, a ring and smoke, then everything expires', () => {
    const fx = new Fx();
    const pieces = spriteDebris(CRAWLER_ROWS[0], ENEMY_W, false);
    fx.shatter(10, 20, pieces, ENEMY_ART_UNIT, '#ff7a5a');
    expect(fx.particles.length).toBe(pieces.length + 5);
    expect(fx.rings.length).toBe(1);
    // Debris starts on the sprite, within one tile of the feet.
    for (const p of fx.particles) {
      expect(Math.abs(p.x - 10)).toBeLessThan(1);
      expect(20 - p.y).toBeLessThan(1);
    }
    // Smoke rises (negative gravity) while debris falls.
    const smoke = fx.particles.filter((p) => (p.g ?? 18) < 0);
    expect(smoke.length).toBe(5);
    for (let i = 0; i < 120; i++) fx.update(1 / 60);
    expect(fx.particles.length).toBe(0);
    expect(fx.rings.length).toBe(0);
  });
  it('respects the particle and ring caps under a kill storm', () => {
    const fx = new Fx();
    const pieces = spriteDebris(CRAWLER_ROWS[0], ENEMY_W, false);
    for (let i = 0; i < 100; i++) fx.shatter(i, 0, pieces, ENEMY_ART_UNIT, '#fff');
    expect(fx.particles.length).toBeLessThanOrEqual(400);
    expect(fx.rings.length).toBeLessThanOrEqual(16);
    for (const p of fx.particles) expect(Number.isFinite(p.x + p.y + p.vx + p.vy)).toBe(true);
  });
});
