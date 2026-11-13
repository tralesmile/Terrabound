import { describe, expect, it } from 'vitest';
import { WHEEL_STEP_PX, vehicleRows, wheelSpinTime } from '../src/render/sprites';

const frame = (dist: number) => vehicleRows('buggy', wheelSpinTime(dist), false).join('\n');

describe('wheel spin follows the ground', () => {
  it('a parked or stopped vehicle keeps its wheel frame', () => {
    expect(frame(0)).toBe(frame(0));
    expect(wheelSpinTime(-3)).toBe(0);
    expect(frame(2.01)).toBe(frame(2.01));
  });

  it('the wheel frame changes every few art px rolled', () => {
    const step = WHEEL_STEP_PX / 16;
    expect(frame(step * 0.5)).not.toBe(frame(step * 1.5));
    expect(frame(step * 0.5)).toBe(frame(step * 2.5));
    // Treads too.
    const tank = (d: number) => vehicleRows('drill_tank', wheelSpinTime(d), false).join('\n');
    expect(tank(step * 0.5)).not.toBe(tank(step * 1.5));
  });

  it('twice the speed turns the wheels twice as often', () => {
    const flips = (speed: number) => {
      let n = 0;
      let last = frame(0);
      for (let t = 0; t < 2; t += 1 / 60) {
        const f = frame(speed * t);
        if (f !== last) n++;
        last = f;
      }
      return n;
    };
    const slow = flips(2);
    expect(slow).toBeGreaterThan(5);
    expect(flips(4)).toBeGreaterThanOrEqual(slow * 2 - 1);
  });
});
