import { describe, expect, it } from 'vitest';
import { CRAWLER_ROWS, FLYER_ROWS, PAL, PLAYER_FRAMES, PLAYER_H, PLAYER_W, playerRows } from '../src/render/sprites';

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
});
