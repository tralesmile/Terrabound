import { describe, expect, it } from 'vitest';
import { GLOW_KEYS, ambientColor, layerAmbient, litRemap } from '../src/render/ambient';
import { PAL } from '../src/render/sprites';

describe('layer ambient on creatures and robots', () => {
  it('lights the body but keeps glowing eyes and lights their own colour', () => {
    const a = layerAmbient(1);
    const own = { c: '#d9663a', E: '#ff3a3a' };
    const lit = litRemap(PAL, own, a);
    expect(lit.c).toBe(ambientColor('#d9663a', a));
    expect(lit.c).not.toBe('#d9663a');
    expect(lit.E).toBe('#ff3a3a');
    for (const k of GLOW_KEYS) expect(lit[k]).toBe((own as Record<string, string>)[k] ?? PAL[k]);
    // Every palette key the sprite might use is covered.
    for (const k of Object.keys(PAL)) expect(lit[k]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('is a no-op on the surface and in the Scrap layer', () => {
    const own = { c: '#d9663a' };
    expect(litRemap(PAL, own, layerAmbient(0))).toBe(own);
    expect(litRemap(PAL, own, null)).toBe(own);
  });

  it('memoised colours match a fresh mix and stay stable across calls', () => {
    const a = layerAmbient(3);
    const first = ambientColor('#4a5568', a);
    expect(ambientColor('#4a5568', a)).toBe(first);
    expect(ambientColor('#4a5568', layerAmbient(2))).not.toBe(first);
    expect(ambientColor('rgba(1,2,3,0.5)', a)).toBe('rgba(1,2,3,0.5)');
  });
});
