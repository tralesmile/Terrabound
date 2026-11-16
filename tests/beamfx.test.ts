import { describe, expect, it } from 'vitest';
import { ARRIVE_T, arrivalBeam, beamMotes, chargeBeam } from '../src/render/beamfx';

describe('beam-home effects', () => {
  it('charging column is off at rest and widens, brightens and tightens its ring as recall progresses', () => {
    expect(chargeBeam(0).alpha).toBe(0);
    const a = chargeBeam(0.2);
    const b = chargeBeam(0.9);
    expect(b.alpha).toBeGreaterThan(a.alpha);
    expect(b.half).toBeGreaterThan(a.half);
    expect(b.height).toBeGreaterThan(a.height);
    expect(b.ring).toBeLessThan(a.ring);
    expect(chargeBeam(5).alpha).toBeLessThanOrEqual(1);
  });

  it('arrival pillar slams in wide, narrows and fades by ARRIVE_T while the ring rolls out', () => {
    const slam = arrivalBeam(0.05);
    const mid = arrivalBeam(ARRIVE_T / 2);
    expect(slam.alpha).toBeGreaterThan(0.8);
    expect(mid.alpha).toBeLessThan(slam.alpha);
    expect(mid.half).toBeLessThan(slam.half);
    expect(mid.ring).toBeGreaterThan(slam.ring);
    expect(arrivalBeam(ARRIVE_T).alpha).toBe(0);
    expect(arrivalBeam(-1).alpha).toBe(0);
  });

  it('motes rise inside the beam height and loop', () => {
    const m = beamMotes(1.3, 10, 7);
    expect(m).toHaveLength(7);
    for (const h of m) {
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(10);
    }
    expect(beamMotes(1.3 + 1 / 0.9, 10, 7)[0]).toBeCloseTo(m[0], 6);
  });
});
