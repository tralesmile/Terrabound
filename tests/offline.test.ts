import { describe, expect, it } from 'vitest';
import { OFFLINE_CAP, awaySeconds, simulateOffline } from '../src/sim/offline';
import { Game } from '../src/sim/game';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';

const fresh = { progressSmelt: 0, progressMine: 0, mineCount: 0, charge: 0, time: 0 };
const rig = { solars: 4, smelters: 1, batteries: 1, miners: 1 };

describe('awaySeconds', () => {
  it('is clock-skew safe and capped', () => {
    expect(awaySeconds(0, 1e12)).toBe(0);
    expect(awaySeconds(2000, 1000)).toBe(0); // saved in the future
    expect(awaySeconds(1000, NaN)).toBe(0);
    expect(awaySeconds(1000, 1000 + 120_000)).toBe(120);
    expect(awaySeconds(1000, 1000 + 30 * 24 * 3600 * 1000)).toBe(OFFLINE_CAP);
  });
});

describe('simulateOffline', () => {
  it('mines and smelts, and more time never gives less', () => {
    const a = simulateOffline({ rust: 100 }, rig, fresh, 600);
    const b = simulateOffline({ rust: 100 }, rig, fresh, 3600);
    expect(a.rust).toBeGreaterThan(0);
    expect(b.metal).toBeGreaterThanOrEqual(a.metal);
    expect(b.rust).toBeGreaterThanOrEqual(a.rust);
  });
  it('does nothing without machines and never exceeds the cap', () => {
    const none = { solars: 0, smelters: 0, batteries: 0, miners: 0 };
    expect(simulateOffline({}, none, fresh, 3600).rust).toBe(0);
    const s: Record<string, number> = {};
    const r = simulateOffline(s, rig, fresh, 1e9);
    expect(r.seconds).toBe(OFFLINE_CAP);
  });
});

describe('save v6', () => {
  it('migrates a v5 save with no away stamp', () => {
    const old = JSON.stringify({ ...defaultSave(), v: 5, away: undefined });
    const s = parseSave(old);
    expect(s.away).toEqual({ savedAt: 0, time: 0, charge: 0 });
    expect(parseSave('{"away":{"savedAt":"x","time":-5,"charge":1e99}}').away.charge).toBeLessThanOrEqual(1e6);
  });
  it('applies an absence once and only for real time away', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    for (const [dx, dy, t] of [[0, 1, T.SOLAR], [1, 1, T.SOLAR], [2, 1, T.MINER]] as const) w.set(w.padX + dx, w.padY - dy, t);
    const saved = g.toSave(1_000_000);
    const g2 = new Game(parseSave(serializeSave(saved)));
    expect(g2.applyOffline(1_000_000 + 30_000)).toBeNull(); // under a minute
    const g3 = new Game(parseSave(serializeSave(saved)));
    const r = g3.applyOffline(1_000_000 + 3600_000);
    expect(r).not.toBeNull();
    expect(g3.applyOffline(1_000_000 + 7200_000)).toBeNull(); // stamp consumed
  });
});
