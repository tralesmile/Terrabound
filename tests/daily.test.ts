import { describe, it, expect } from 'vitest';
import { dailyCode, dailySeed, utcDay } from '../src/sim/daily';
import { decodeSeed } from '../src/sim/seedcode';

const H = 3_600_000;
describe('daily dive', () => {
  it('is stable within a UTC day and rolls over exactly at 00:00 UTC', () => {
    const start = Date.UTC(2026, 10, 11);
    expect(dailyCode(start)).toBe(dailyCode(start + 24 * H - 1));
    expect(dailyCode(start + 24 * H)).not.toBe(dailyCode(start));
  });
  it('does not depend on local DST: 24 h steps are always one day', () => {
    for (const d of [Date.UTC(2026, 2, 29), Date.UTC(2026, 9, 25), Date.UTC(2026, 10, 1)]) {
      expect(utcDay(d + 24 * H)).toBe(utcDay(d) + 1);
    }
  });
  it('codes decode back to the day seed and 400 days are all distinct', () => {
    const seen = new Set<number>();
    for (let day = 20000; day < 20400; day++) {
      const seed = dailySeed(day);
      expect(decodeSeed(dailyCode(day * 86_400_000))).toBe(seed);
      seen.add(seed);
    }
    expect(seen.size).toBe(400);
  });
  it('survives garbage clocks', () => {
    expect(decodeSeed(dailyCode(NaN))).not.toBeNull();
    expect(decodeSeed(dailyCode(-5e12))).not.toBeNull();
  });
});
