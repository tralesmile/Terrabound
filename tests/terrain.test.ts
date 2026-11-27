import { describe, expect, it } from 'vitest';
import { DETAIL_RATE, TONES, detailAt, detailRects, hasTerrainVariety, patchNoise, toneAt } from '../src/render/terrain';
import { T } from '../src/sim/tiles';

describe('terrain variety', () => {
  it('only natural ground and rock get it: never ores, liquids or built blocks', () => {
    for (const t of [T.RUST, T.SOIL, T.SAND, T.BASALT, T.CORE_ROCK]) expect(hasTerrainVariety(t)).toBe(true);
    for (const t of [T.AIR, T.IRON, T.COPPER, T.CIRCUIT_ORE, T.PANEL, T.BRICK, T.PAD, T.WATER, T.CHEST]) expect(hasTerrainVariety(t)).toBe(false);
  });
  it('noise is smooth, in range and deterministic', () => {
    for (let x = 0; x < 200; x++) {
      const a = patchNoise(x / 4, 7.3, 9, 5, 1);
      const b = patchNoise((x + 1) / 4, 7.3, 9, 5, 1);
      expect(a >= 0 && a <= 1).toBe(true);
      expect(Math.abs(a - b)).toBeLessThan(0.1);
    }
    expect(patchNoise(3.3, 4.4, 9, 5, 1)).toBe(patchNoise(3.3, 4.4, 9, 5, 1));
  });
  it('every tone shows up in a wide area and most ground is not at an extreme', () => {
    const n = TONES.map(() => 0);
    for (let y = 0; y < 100; y++) for (let x = 0; x < 300; x++) n[toneAt(x + 0.125, y + 0.125)]++;
    const share = n.map((v) => v / 30000);
    for (const s of share) expect(s).toBeGreaterThan(0.04);
    expect(share[0] + share[3]).toBeLessThan(0.5);
  });
  it('tones form patches: quarter-tile neighbours usually match', () => {
    let same = 0;
    for (let i = 0; i < 4000; i++) if (toneAt(i / 4, 11.125) === toneAt((i + 1) / 4, 11.125)) same++;
    expect(same / 4000).toBeGreaterThan(0.6);
  });
  it('details are rare, varied and stay inside their tile, mirrored or not', () => {
    const kinds = new Map<string, number>();
    for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) {
      const k = detailAt(x, y);
      if (k) kinds.set(k, (kinds.get(k) ?? 0) + 1);
    }
    const total = [...kinds.values()].reduce((a, b) => a + b, 0);
    expect(kinds.size).toBe(5);
    expect(total / 40000).toBeLessThan(DETAIL_RATE * 1.25);
    expect(total / 40000).toBeGreaterThan(DETAIL_RATE * 0.75);
    for (const k of ['stone', 'slab', 'crack', 'pocket', 'grit'] as const) for (const flip of [false, true]) for (const [x, y, w, h] of detailRects(k, flip)) {
      expect(x >= 0 && y >= 0 && x + w <= 16 && y + h <= 16).toBe(true);
    }
  });
});
