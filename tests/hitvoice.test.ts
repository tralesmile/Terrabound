import { describe, expect, it } from 'vitest';
import { BOSS_IDS } from '../src/sim/bosses';
import { bossHitVoice } from '../src/platform/hitvoice';

describe('boss hit voices', () => {
  it('every boss has its own audible voice', () => {
    const keys = new Set<string>();
    for (const id of BOSS_IDS) {
      const v = bossHitVoice(id, 12);
      expect(v.freq).toBeGreaterThan(40);
      expect(v.freq).toBeLessThan(4000);
      expect(v.vol).toBeGreaterThan(0);
      expect(v.vol).toBeLessThan(0.25);
      expect(v.dur).toBeGreaterThan(0.03);
      keys.add(`${v.type}|${Math.round(v.freq)}`);
    }
    expect(keys.size).toBe(BOSS_IDS.length);
  });

  it('crystal rings high, metal clanks, heavier hits are lower and louder but capped', () => {
    expect(bossHitVoice('golem', 10).freq).toBeGreaterThan(bossHitVoice('colossus', 10).freq);
    expect(bossHitVoice('golem', 10).ring).toBeGreaterThan(0);
    const light = bossHitVoice('colossus', 5);
    const heavy = bossHitVoice('colossus', 40);
    expect(heavy.freq).toBeLessThan(light.freq);
    expect(heavy.vol).toBeGreaterThan(light.vol);
    expect(bossHitVoice('colossus', 9999)).toEqual(heavy);
    expect(bossHitVoice('colossus', -5).freq).toBe(bossHitVoice('colossus', 0).freq);
  });
});
