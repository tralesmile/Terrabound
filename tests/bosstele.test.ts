import { describe, expect, it } from 'vitest';
import { ATTACK_TIME, BOSSES, makeBoss } from '../src/sim/bosses';
import { chargeDistance, chargeLane, charging, speedStreaks, volleyGlow, warnK } from '../src/render/bosstele';

describe('boss telegraphs', () => {
  it('the charge lane runs from the boss toward its facing and stops at the arena wall', () => {
    const b = makeBoss('vine_queen', 100, 50);
    b.facing = 1;
    const lane = chargeLane(b);
    expect(lane.x0).toBe(100);
    expect(lane.end).toBeCloseTo(Math.min(b.ax1, 100 + chargeDistance(b)));
    b.facing = -1;
    b.x = b.ax0 + 2;
    const left = chargeLane(b);
    expect(left.end).toBe(b.ax0);
    expect(left.x1).toBe(b.x);
  });

  it('the lane matches how far the sim actually dashes in open air', () => {
    const b = makeBoss('wyrm', 100, 50);
    expect(chargeDistance(b)).toBeCloseTo(BOSSES.wyrm.speed * 4.5 * ATTACK_TIME.charge.act);
  });

  it('warnK ramps 0 to 1 over only the matching wind-up', () => {
    const b = makeBoss('colossus', 100, 50);
    expect(warnK(b, 'charge')).toBe(0);
    b.attack = 'charge';
    b.at = -ATTACK_TIME.charge.warn;
    expect(warnK(b, 'charge')).toBeCloseTo(0);
    b.at = -ATTACK_TIME.charge.warn / 2;
    expect(warnK(b, 'charge')).toBeCloseTo(0.5);
    expect(warnK(b, 'volley')).toBe(0);
    b.at = 0.1;
    expect(warnK(b, 'charge')).toBe(0);
    expect(charging(b)).toBe(true);
    b.at = ATTACK_TIME.charge.act + 0.01;
    expect(charging(b)).toBe(false);
  });

  it('the volley orb swells through the wind-up and fades as the bolts fire', () => {
    const b = makeBoss('golem', 100, 50);
    expect(volleyGlow(b)).toBe(0);
    b.attack = 'volley';
    b.at = -ATTACK_TIME.volley.warn * 0.9;
    const early = volleyGlow(b);
    b.at = -0.01;
    const late = volleyGlow(b);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThanOrEqual(1);
    b.at = ATTACK_TIME.volley.act * 0.5;
    const firing = volleyGlow(b);
    expect(firing).toBeLessThan(late);
    b.at = ATTACK_TIME.volley.act;
    expect(volleyGlow(b)).toBe(0);
  });

  it('speed streaks span the body and stay a few tiles long', () => {
    for (const t of [0, 0.37, 5.1]) {
      const s = speedStreaks(t);
      expect(s).toHaveLength(6);
      for (const k of s) {
        expect(k.up).toBeGreaterThan(0);
        expect(k.up).toBeLessThan(1);
        expect(k.len).toBeGreaterThanOrEqual(1.4);
        expect(k.len).toBeLessThanOrEqual(4.6);
      }
    }
  });
});
