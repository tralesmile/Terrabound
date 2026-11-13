import { describe, expect, it } from 'vitest';
import { BOSSES, makeBoss, phase } from '../src/sim/bosses';
import { CHIP_DRAIN, CHIP_HOLD, PHASE_NOTCH, newChip, stepChip } from '../src/ui/bossbar';

const run = (s: ReturnType<typeof newChip>, hp: number, secs: number, dt = 1 / 60) => {
  let t = 0;
  while (t < secs - 1e-9) {
    s = stepChip(s, hp, dt);
    t += dt;
  }
  return s;
};

describe('boss bar damage chip', () => {
  it('holds at the old health right after a hit, then drains down to the new health', () => {
    let s = newChip(1);
    s = stepChip(s, 0.8, 1 / 60);
    expect(s.chip).toBe(1);
    s = run(s, 0.8, CHIP_HOLD * 0.8);
    expect(s.chip).toBe(1);
    s = run(s, 0.8, CHIP_HOLD * 0.3 + 0.1);
    expect(s.chip).toBeLessThan(1);
    expect(s.chip).toBeGreaterThan(0.8);
    s = run(s, 0.8, 0.2 / CHIP_DRAIN + 0.1);
    expect(s.chip).toBeCloseTo(0.8);
    expect(s.hold).toBe(0);
  });

  it('a new hit while draining restarts the hold, and the chip never drops below health', () => {
    let s = run(stepChip(newChip(1), 0.7, 1 / 60), 0.7, CHIP_HOLD + 0.1);
    const mid = s.chip;
    s = stepChip(s, 0.6, 1 / 60);
    expect(s.hold).toBeCloseTo(CHIP_HOLD);
    expect(s.chip).toBeCloseTo(mid);
    for (let i = 0; i < 400; i++) {
      s = stepChip(s, 0.6, 1 / 60);
      expect(s.chip).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('a heal or a fresh fight snaps the chip up to health', () => {
    let s = run(stepChip(newChip(1), 0.2, 1 / 60), 0.2, 0.1);
    s = stepChip(s, 1, 1 / 60);
    expect(s).toEqual({ chip: 1, last: 1, hold: 0 });
  });

  it('the bar notch sits exactly where the sim turns the boss enraged', () => {
    const b = makeBoss('golem', 100, 50);
    b.hp = BOSSES.golem.hp * (PHASE_NOTCH + 0.01);
    expect(phase(b)).toBe(1);
    b.hp = BOSSES.golem.hp * PHASE_NOTCH;
    expect(phase(b)).toBe(2);
    expect(CHIP_DRAIN).toBeGreaterThan(0);
  });
});
