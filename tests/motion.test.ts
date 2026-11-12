import { describe, expect, it } from 'vitest';
import { LAND_SQUASH_TIME, landSquash, swimTilt, vehicleTilt } from '../src/render/renderer';
import { PLAYER_H, playerRows, poseFrame, strokeAngle } from '../src/render/sprites';
import { Fx } from '../src/render/fx';

describe('swim pose', () => {
  it('leans head-first toward the swim direction and never flips upside down', () => {
    expect(swimTilt(0, -3)).toBeCloseTo(0);
    expect(swimTilt(4, 0)).toBeCloseTo(Math.PI / 2);
    expect(swimTilt(-4, 0)).toBeCloseTo(-Math.PI / 2);
    expect(swimTilt(0.1, 5)).toBeLessThanOrEqual(2);
    expect(swimTilt(-0.1, 5)).toBeGreaterThanOrEqual(-2);
  });
  it('kicks the legs (two frames) and strokes the arm faster while moving', () => {
    const frames = new Set([0, 0.06, 0.12, 0.18].map((t) => poseFrame({ facing: 1, walking: false, t, airborne: true, swim: { moving: true } }).frame));
    expect(frames).toEqual(new Set(['kickA', 'kickB']));
    for (const f of ['kickA', 'kickB', 'sit'] as const) expect(playerRows(f)).toHaveLength(PLAYER_H);
    const sweep = (moving: boolean): number => {
      let lo = Infinity;
      let hi = -Infinity;
      for (let t = 0; t < 2; t += 0.01) {
        lo = Math.min(lo, strokeAngle(t, moving));
        hi = Math.max(hi, strokeAngle(t, moving));
      }
      return hi - lo;
    };
    expect(sweep(true)).toBeGreaterThan(sweep(false) * 2);
  });
  it('a seated rider uses the sit frame, even in the air', () => {
    expect(poseFrame({ facing: 1, walking: true, t: 0.3, airborne: true, seated: true }).frame).toBe('sit');
  });
});

describe('vehicle body language', () => {
  it('tilts to the slope under the wheels, clamped', () => {
    expect(vehicleTilt(10, 10)).toBe(0);
    expect(vehicleTilt(10, 11)).toBeGreaterThan(0.25);
    expect(vehicleTilt(11, 10)).toBeLessThan(-0.25);
    // A wall is not a ramp: the same tilt as a one-tile step.
    expect(vehicleTilt(9, 0)).toBe(vehicleTilt(1, 0));
  });
  it('a hard landing squashes the suspension, then springs back to rest', () => {
    expect(landSquash(0)).toBe(0);
    const peak = Math.max(...Array.from({ length: 20 }, (_, i) => landSquash(LAND_SQUASH_TIME * (1 - i / 20))));
    expect(peak).toBeGreaterThan(0.05);
    expect(peak).toBeLessThanOrEqual(0.12);
  });
  it('ground vehicles kick dust and the drill tank throws sparks; parked or slow ones do not', () => {
    const fx = new Fx();
    fx.vehicleTrail(0.5, 'drill_tank', 10, 20, 1, 6, 0, true, '#884');
    expect(fx.particles.length).toBeGreaterThan(10);
    expect(fx.particles.some((p) => p.color === '#ffcf4a' || p.color === '#ff8a3c')).toBe(true);
    const still = new Fx();
    still.vehicleTrail(0.5, 'buggy', 10, 20, 1, 0.5, 0, true, '#884');
    still.vehicleTrail(0.5, null, 10, 20, 1, 9, 0, true, '#884');
    expect(still.particles).toHaveLength(0);
  });
});
