import { describe, expect, it } from 'vitest';
import { PET_BUBBLE_PERIOD, PET_BUBBLE_RISE, petSwimPose, petWater } from '../src/render/petfx';

describe('pet swimming pose', () => {
  it('classifies dry, surface and under water', () => {
    expect(petWater(false, false)).toBe('dry');
    expect(petWater(false, true)).toBe('dry');
    expect(petWater(true, false)).toBe('surface');
    expect(petWater(true, true)).toBe('under');
  });

  it('is neutral out of water', () => {
    for (let t = 0; t < 5; t += 0.37) expect(petSwimPose(t, 'dry', 1)).toEqual({ bob: 0, tilt: 0, paddle: 0, bubble: null, wake: false });
  });

  it('under water leans toward the facing side, paddles and bobs in whole art px', () => {
    const frames = new Set<number>();
    const bobs = new Set<number>();
    for (let t = 0; t < 4; t += 0.05) {
      const r = petSwimPose(t, 'under', 1);
      const l = petSwimPose(t, 'under', -1);
      expect(r.tilt).toBeGreaterThan(0);
      expect(l.tilt).toBeLessThan(0);
      expect(Number.isInteger(r.bob)).toBe(true);
      expect(Math.abs(r.bob)).toBeLessThanOrEqual(2);
      expect(r.wake).toBe(false);
      frames.add(r.paddle);
      bobs.add(r.bob);
    }
    expect(frames.size).toBe(2);
    expect(bobs.size).toBeGreaterThan(1);
  });

  it('leaks a bubble that rises and fades, with a gap between bubbles', () => {
    let gaps = 0;
    let prevDy = 0;
    for (let t = 0; t < PET_BUBBLE_PERIOD; t += 0.02) {
      const b = petSwimPose(t, 'under', 1).bubble;
      if (!b) {
        gaps++;
        continue;
      }
      expect(b.dy).toBeLessThanOrEqual(prevDy === 0 ? -3 : prevDy);
      expect(b.dy).toBeGreaterThanOrEqual(-3 - PET_BUBBLE_RISE);
      expect(b.alpha).toBeGreaterThan(0);
      expect(b.alpha).toBeLessThanOrEqual(1);
      prevDy = b.dy;
    }
    expect(gaps).toBeGreaterThan(0);
  });

  it('at the surface paddles level with a wake and no bubbles', () => {
    for (let t = 0; t < 3; t += 0.1) {
      const p = petSwimPose(t, 'surface', 1);
      expect(p.tilt).toBe(0);
      expect(p.wake).toBe(true);
      expect(p.bubble).toBeNull();
    }
  });
});
