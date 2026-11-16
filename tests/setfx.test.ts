import { describe, expect, it } from 'vitest';
import { MOTE_COUNT, MOTE_RISE, setAura } from '../src/render/setfx';
import { SETS, setStates } from '../src/sim/sets';

describe('full set aura', () => {
  it('no aura for a partial set or none', () => {
    expect(setAura([], 0)).toBeNull();
    expect(setAura(setStates({ head: 'scout_helm', feet: 'spring_boots' }), 0)).toBeNull();
  });

  it('a full set glows in its colour with rising motes', () => {
    const a = setAura(setStates({ head: 'scout_helm', feet: 'spring_boots', back: 'glider' }), 0.3);
    expect(a?.color).toBe(SETS.pathfinder.color);
    expect(a!.motes.length).toBe(MOTE_COUNT);
    const v = setAura(setStates({ body: 'plate_vest', feet: 'dash_boots' }), 0);
    expect(v?.color).toBe(SETS.vanguard.color);
  });

  it('the glow breathes in a faint band and motes rise, fade at both ends and loop', () => {
    const st = setStates({ body: 'plate_vest', feet: 'dash_boots' });
    for (let t = 0; t < 5; t += 0.13) {
      const a = setAura(st, t)!;
      expect(a.alpha).toBeGreaterThan(0.1);
      expect(a.alpha).toBeLessThan(0.3);
      for (const m of a.motes) {
        expect(m.a).toBeGreaterThanOrEqual(0);
        expect(m.a).toBeLessThanOrEqual(1);
        expect(m.dy).toBeGreaterThanOrEqual(0);
      }
    }
    const a0 = setAura(st, 0.1)!.motes[0];
    const a1 = setAura(st, 0.4)!.motes[0];
    expect(a1.dy).toBeGreaterThan(a0.dy);
    expect(setAura(st, 0.1 + MOTE_RISE)!.motes[0].dy).toBeCloseTo(a0.dy);
  });
});
