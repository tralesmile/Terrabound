import { describe, expect, it } from 'vitest';
import { HEAT, heatColor, heatDigMul, heatDrainMul, stepHeat } from '../src/sim/drillheat';

describe('drill heat', () => {
  it('builds while drilling, caps at 1, and cools faster than it heats', () => {
    let h = 0;
    for (let i = 0; i < 80; i++) h = stepHeat(h, true, 0.1);
    expect(h).toBe(1);
    let steps = 0;
    while (h > 0) {
      h = stepHeat(h, false, 0.1);
      steps++;
    }
    expect(steps * 0.1).toBeLessThanOrEqual(HEAT.fall + 0.11);
    expect(HEAT.fall).toBeLessThan(HEAT.rise);
  });
  it('a hot drill digs faster but drains more battery, a cold one is neutral', () => {
    expect(heatDigMul(0)).toBe(1);
    expect(heatDrainMul(0)).toBe(1);
    expect(heatDigMul(1)).toBeCloseTo(1.35);
    expect(heatDrainMul(1)).toBeCloseTo(1.6);
    // The trade: extra speed per extra drain is below 1, so overheating is never free value.
    expect(HEAT.speed / HEAT.drain).toBeLessThan(1);
  });
  it('the beam goes from cyan to orange', () => {
    expect(heatColor(0)).toEqual([54, 224, 232]);
    expect(heatColor(1)).toEqual([255, 140, 40]);
  });
});
