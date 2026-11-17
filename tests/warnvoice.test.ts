import { describe, expect, it } from 'vitest';
import { ATTACK_TIME, type AttackKind } from '../src/sim/bosses';
import { warnVoice } from '../src/platform/warnvoice';

describe('boss telegraph voices', () => {
  it('every attack rises in pitch over exactly its warning time', () => {
    for (const k of Object.keys(ATTACK_TIME) as AttackKind[]) {
      const v = warnVoice(k);
      expect(v.to).toBeGreaterThan(v.from);
      expect(v.dur).toBe(ATTACK_TIME[k].warn);
      expect(v.vol).toBeGreaterThan(0);
    }
  });
  it('the grid sweeps the widest range', () => {
    const r = (k: AttackKind) => warnVoice(k).to / warnVoice(k).from;
    expect(r('grid')).toBeGreaterThan(r('volley'));
  });
});
