import { describe, expect, it } from 'vitest';
import { LAYER_RIM, RIM_MIN, floorGlowBands, rimColor } from '../src/render/rimlight';
import { LAYERS } from '../src/sim/layers';

describe('deep-layer floor glow', () => {
  it('has a rim colour for every depth layer, warm in the Scrap layer', () => {
    expect(LAYER_RIM.length).toBe(LAYERS.length);
    expect(rimColor(0)).toEqual([255, 228, 184]);
    expect(rimColor(99)).toEqual(LAYER_RIM[LAYER_RIM.length - 1]);
    expect(rimColor(-3)).toEqual(LAYER_RIM[0]);
  });

  it('lit top faces in deep layers get fading bands below the edge', () => {
    const b = floorGlowBands(0.4, 0, 2);
    expect(b.length).toBe(3);
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeLessThan(b[i - 1]);
    expect(b[0]).toBeLessThan(0.4);
  });

  it('no glow in the Scrap layer, on walls or ceilings, or for faint rims', () => {
    expect(floorGlowBands(0.4, 0, 0)).toEqual([]);
    expect(floorGlowBands(0.4, 1, 2)).toEqual([]);
    expect(floorGlowBands(0.4, 2, 3)).toEqual([]);
    expect(floorGlowBands(RIM_MIN * 0.5, 0, 1)).toEqual([]);
  });

  it('dim rims drop the faintest bands instead of drawing invisible rows', () => {
    const b = floorGlowBands(0.05, 0, 1);
    expect(b.length).toBeGreaterThan(0);
    expect(b.length).toBeLessThan(3);
    for (const a of b) expect(a).toBeGreaterThanOrEqual(0.012);
  });
});
