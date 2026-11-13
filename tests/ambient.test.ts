import { describe, expect, it } from 'vitest';
import { ambientColor, ambientRemap, layerAmbient } from '../src/render/ambient';

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h: string) => { const [r, g, b] = rgb(h); return 0.3 * r + 0.59 * g + 0.11 * b; };

describe('layer ambient on the player sprite', () => {
  it('Scrap layer and the surface get no tint', () => {
    expect(layerAmbient(0)).toBeNull();
    expect(layerAmbient(-1)).toBeNull();
    expect(ambientColor('#d0482c', layerAmbient(0))).toBe('#d0482c');
  });

  it('deep layers shift the warm suit toward their light colour', () => {
    const suit = '#d0482c';
    const [r0, g0] = rgb(suit);
    const circuit = rgb(ambientColor(suit, layerAmbient(1)));
    expect(circuit[1] - circuit[0]).toBeGreaterThan(g0 - r0); // greener relative to red
    const core = rgb(ambientColor(suit, layerAmbient(3)));
    expect(core[2]).toBeGreaterThan(rgb(suit)[2]); // bluer
    expect(layerAmbient(9)).toEqual(layerAmbient(3));
  });

  it('keeps shading order and the tint is subtle (no colour jumps more than ~45%)', () => {
    const a = layerAmbient(2);
    const light = ambientColor('#e07050', a);
    const dark = ambientColor('#702818', a);
    expect(lum(light)).toBeGreaterThan(lum(dark));
    for (const h of ['#e07050', '#702818', '#ffffff', '#101010']) {
      const before = rgb(h);
      const after = rgb(ambientColor(h, a));
      for (let j = 0; j < 3; j++) expect(Math.abs(after[j] - before[j])).toBeLessThanOrEqual(0.45 * 255);
    }
  });

  it('remap covers every palette key and leaves the remap alone with no ambient', () => {
    const pal = { s: '#d0482c', h: '#cccccc', x: '#000000' };
    const remap = { s: '#3050d0' };
    expect(ambientRemap(pal, remap, null)).toBe(remap);
    const out = ambientRemap(pal, remap, layerAmbient(1));
    expect(Object.keys(out).sort()).toEqual(['h', 's', 'x']);
    expect(out.s).toBe(ambientColor('#3050d0', layerAmbient(1)));
    expect(out.x).toBe(ambientColor('#000000', layerAmbient(1)));
  });
});
