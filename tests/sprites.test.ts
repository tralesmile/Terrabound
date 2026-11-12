import { describe, expect, it } from 'vitest';
import { CRAWLER_ROWS, DRONE_W, FLYER_ROWS, PAL, droneRows, PLAYER_FRAMES, PLAYER_H, PLAYER_W, playerRows } from '../src/render/sprites';

describe('sprite maps', () => {
  it('player frames fit 16x24 and use known palette keys', () => {
    for (const f of PLAYER_FRAMES) {
      for (const bob of [0, 1]) {
        const rows = playerRows(f, bob);
        expect(rows.length).toBe(PLAYER_H);
        for (const r of rows) {
          expect(r.length).toBeLessThanOrEqual(PLAYER_W);
          for (const ch of r) if (ch !== ' ') expect(PAL[ch], `${f} '${ch}'`).toBeDefined();
        }
      }
    }
  });
  it('enemy frames fit 16 wide and use known palette keys', () => {
    for (const rows of [...CRAWLER_ROWS, ...FLYER_ROWS]) {
      for (const r of rows) {
        expect(r.length).toBeLessThanOrEqual(16);
        for (const ch of r) if (ch !== ' ') expect(PAL[ch]).toBeDefined();
      }
    }
  });

  it('drone frames for every job fit 16 wide, use known keys, and differ by attachment', () => {
    const acts = ['miner', 'guard', 'hauler', 'repair', 'home'];
    for (const act of acts) {
      for (const t of [0, 0.03]) {
        for (const r of droneRows(act, t)) {
          expect(r.length).toBeLessThanOrEqual(DRONE_W);
          for (const ch of r) if (ch !== ' ') expect(PAL[ch]).toBeDefined();
        }
      }
    }
    expect(droneRows('miner', 0)[0]).not.toBe(droneRows('miner', 1 / 24)[0]);
    const shapes = new Set(acts.map((a) => droneRows(a, 0).slice(8).join('|')));
    expect(shapes.size).toBe(acts.length);
  });
});
