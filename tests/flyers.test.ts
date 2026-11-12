import { describe, expect, it } from 'vitest';
import { FLY_TIME, Flyers, MAX_FLYERS, PULSE_TIME, flyerPos, pulseAmount } from '../src/ui/flyers';

describe('pickup flyers', () => {
  it('starts at the pickup and ends in the slot', () => {
    const a = flyerPos(0, 100, 200, 600, 650);
    const b = flyerPos(1, 100, 200, 600, 650);
    expect(a.x).toBeCloseTo(100);
    expect(a.y).toBeCloseTo(200);
    expect(b.x).toBeCloseTo(600);
    expect(b.y).toBeCloseTo(650);
    expect(b.s).toBeLessThan(a.s);
  });

  it('arcs upward mid-flight and clamps progress', () => {
    const mid = flyerPos(0.5, 100, 400, 500, 400);
    expect(mid.y).toBeLessThan(400);
    expect(flyerPos(2, 0, 0, 10, 10)).toEqual(flyerPos(1, 0, 0, 10, 10));
    expect(flyerPos(-1, 0, 0, 10, 10)).toEqual(flyerPos(0, 0, 0, 10, 10));
  });

  it('accelerates into the slot (slow start)', () => {
    const early = flyerPos(0.2, 0, 0, 100, 0).x;
    const late = flyerPos(1, 0, 0, 100, 0).x - flyerPos(0.8, 0, 0, 100, 0).x;
    expect(early).toBeLessThan(late);
  });

  it('lands after FLY_TIME and pulses the slot', () => {
    const f = new Flyers();
    f.add('rust', 10, 10);
    expect(f.update(FLY_TIME * 0.5)).toEqual([]);
    expect(f.update(FLY_TIME)).toEqual(['rust']);
    expect(f.list.length).toBe(0);
    expect(f.pulse.get('rust')).toBeGreaterThan(0);
    f.update(PULSE_TIME + 0.01);
    expect(f.pulse.has('rust')).toBe(false);
  });

  it('routes the pulse through slotOf (items not on the hotbar pulse the bag)', () => {
    const f = new Flyers();
    f.add('fish', 0, 0);
    f.update(FLY_TIME + 0.01, () => 'inv');
    expect(f.pulse.has('inv')).toBe(true);
  });

  it('staggers a burst of the same item and caps the count', () => {
    const f = new Flyers();
    for (let i = 0; i < 3; i++) f.add('glowcorn', 0, 0);
    expect(f.list.map((x) => x.t)).toEqual([0, -0.06, -0.12]);
    for (let i = 0; i < 30; i++) f.add('rust', 0, 0);
    expect(f.list.length).toBe(MAX_FLYERS);
    expect(f.spawned).toBe(33);
  });

  it('pulse swells then settles', () => {
    expect(pulseAmount(0)).toBe(0);
    expect(pulseAmount(PULSE_TIME / 2)).toBeGreaterThan(0.1);
  });
});
