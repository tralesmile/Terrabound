import { describe, expect, it } from 'vitest';
import { BOSSES, bossContact, makeBoss } from '../src/sim/bosses';
import { hitSparkSpec, sparkVelocities } from '../src/render/hitspark';
import { mulberry32 } from '../src/sim/rng';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';

describe('boss hit sparks', () => {
  it('contact point lies on the boss box face toward the attacker', () => {
    const b = { x: 10, y: 20, id: 'colossus' } as Parameters<typeof bossContact>[0];
    const d = BOSSES.colossus;
    const left = bossContact(b, 4, 18);
    expect(left).toEqual({ x: 10 - d.halfW, y: 18 });
    const right = bossContact(b, 15, 30);
    expect(right).toEqual({ x: 10 + d.halfW, y: 20 });
    // Inside (a shot that just entered from the right) snaps to the right edge.
    expect(bossContact(b, 10.3, 19).x).toBeCloseTo(10 + d.halfW);
    // Straight above: stays above the centre, clamped to the top.
    expect(bossContact(b, 10.2, 5)).toEqual({ x: 10.2, y: 20 - d.h });
  });

  it('spec uses the boss accent and eye, and scales with damage (capped)', () => {
    const s = hitSparkSpec('golem', 8);
    expect(s.colors[0]).toBe(BOSSES.golem.accent);
    expect(s.colors).toContain(BOSSES.golem.eye);
    expect(s.colors).toContain('#ffffff');
    expect(hitSparkSpec('golem', 80).n).toBeGreaterThan(s.n);
    expect(hitSparkSpec('golem', 9999).n).toBeLessThanOrEqual(14);
    expect(hitSparkSpec('golem', 0).n).toBeGreaterThanOrEqual(5);
  });

  it('sparks fly back toward the attacker side, mostly upward', () => {
    const r = mulberry32(7);
    for (const dir of [1, -1]) {
      const v = sparkVelocities(dir, 200, 6, r);
      expect(v.every((q) => Math.sign(q.vx) === dir)).toBe(true);
      expect(v.filter((q) => q.vy < 0).length).toBeGreaterThan(120);
    }
  });

  it('a hit on the boss emits the contact point and direction from the attacker', () => {
    const g = new Game(defaultSave());
    g.step(FIXED_DT, NO_CONTROLS);
    g.boss = makeBoss('colossus', g.body.x + 5, g.body.y);
    g.drainEvents();
    g.damageBoss(12);
    const e = g.drainEvents().find((q) => q.t === 'bosshit');
    expect(e).toBeDefined();
    if (e && e.t === 'bosshit') {
      expect(e.dir).toBe(-1);
      expect(e.hx).toBeCloseTo(g.boss!.x - BOSSES.colossus.halfW);
      expect(e.id).toBe('colossus');
    }
  });
});
