import { describe, expect, it } from 'vitest';
import { hurtColor, hurtRemap } from '../src/render/scorchfx';

describe('hurt flash tint', () => {
  it('pulls colours toward red but keeps light and dark apart', () => {
    const light = hurtColor('#e0e8f0');
    const dark = hurtColor('#202830');
    for (const c of [light, dark]) {
      const r = parseInt(c.slice(1, 3), 16);
      const g = parseInt(c.slice(3, 5), 16);
      expect(r).toBeGreaterThan(g * 1.4);
    }
    expect(parseInt(light.slice(1, 3), 16)).toBeGreaterThan(parseInt(dark.slice(1, 3), 16));
    expect(light).not.toBe('#ffffff');
  });
  it('remaps every palette key and leaves non-hex colours alone', () => {
    const out = hurtRemap({ a: '#ffffff', b: '#000000' }, { b: '#101010', c: 'rgba(0,0,0,0.5)' });
    expect(Object.keys(out).sort()).toEqual(['a', 'b', 'c']);
    expect(out.c).toBe('rgba(0,0,0,0.5)');
    expect(out.a).not.toBe('#ffffff');
  });
});
