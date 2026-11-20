import { describe, expect, it } from 'vitest';
import { CAM_LEAD, easeLead, leadTarget } from '../src/render/camlead';
import { STRETCH_TIME, stretchScale } from '../src/render/fx';

describe('camera lead', () => {
  it('looks ahead in the direction of travel, capped, and centres when standing still', () => {
    expect(leadTarget(0, 0, true)).toEqual({ x: 0, y: 0 });
    expect(leadTarget(4, 0, true).x).toBeCloseTo(4 * CAM_LEAD.x);
    expect(leadTarget(-4, 0, true).x).toBeCloseTo(-4 * CAM_LEAD.x);
    expect(leadTarget(100, 0, true).x).toBe(CAM_LEAD.maxX);
    expect(leadTarget(-100, 0, true).x).toBe(-CAM_LEAD.maxX);
  });

  it('a run at top speed leads by a visible but modest amount', () => {
    // Base run speed is 7 tiles/s (upgrades.ts), boots add up to a few more.
    const top = Math.abs(leadTarget(7, 0, true).x);
    expect(top).toBeGreaterThan(1);
    expect(top).toBeLessThanOrEqual(CAM_LEAD.maxX);
  });

  it('only a real fall leads downward (not a jump, not a short hop down)', () => {
    expect(leadTarget(0, -10, false).y).toBe(0);
    expect(leadTarget(0, CAM_LEAD.fallFrom - 1, false).y).toBe(0);
    expect(leadTarget(0, 20, true).y).toBe(0);
    expect(leadTarget(0, 15, false).y).toBeGreaterThan(1);
    expect(leadTarget(0, 1000, false).y).toBe(CAM_LEAD.maxY);
  });

  it('eases toward the target without overshoot, the same at 30 and 120 fps', () => {
    const target = { x: 2, y: 1 };
    let a = { x: 0, y: 0 };
    let b = { x: 0, y: 0 };
    for (let i = 0; i < 15; i++) a = easeLead(a, target, 1 / 30);
    for (let i = 0; i < 60; i++) b = easeLead(b, target, 1 / 120);
    expect(a.x).toBeCloseTo(b.x, 5);
    expect(a.x).toBeGreaterThan(1.5);
    expect(a.x).toBeLessThanOrEqual(2);
    // A turn-around does not whip the view across in one frame.
    const turned = easeLead({ x: 2, y: 0 }, { x: -2, y: 0 }, 1 / 60);
    expect(turned.x).toBeGreaterThan(1.7);
  });
});

describe('take-off stretch', () => {
  it('is tall and thin at the jump and settles to (1, 1)', () => {
    const s = stretchScale(STRETCH_TIME);
    expect(s.sy).toBeGreaterThan(1.1);
    expect(s.sx).toBeLessThan(0.9);
    expect(stretchScale(0)).toEqual({ sx: 1, sy: 1 });
    expect(stretchScale(STRETCH_TIME / 2).sy).toBeLessThan(s.sy);
  });
});
