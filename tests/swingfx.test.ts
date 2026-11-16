import { describe, expect, it } from 'vitest';
import { swingStyle } from '../src/render/swingfx';
import { RARITY } from '../src/sim/rarity';

describe('melee swing trail style', () => {
  it('a plain weapon draws its own colour and accent, no glow or sparkles', () => {
    const s = swingStyle('#ff7a3c', '#ffd24a', 'common', RARITY.common.color);
    expect(s.layers.map((l) => l.color)).toEqual(['#ff7a3c', '#ffd24a']);
    expect(s.sparkles).toBe(0);
  });

  it('rare and epic add a wider rarity glow behind, epic the widest with the most sparkles', () => {
    const r = swingStyle('#ff7a3c', '#ffd24a', 'rare', RARITY.rare.color);
    const e = swingStyle('#ff7a3c', '#ffd24a', 'epic', RARITY.epic.color);
    expect(r.layers[0].color).toBe(RARITY.rare.color);
    expect(e.layers[0].color).toBe(RARITY.epic.color);
    expect(e.layers[0].width).toBeGreaterThan(r.layers[0].width);
    expect(r.layers[0].width).toBeGreaterThan(r.layers[1].width);
    expect(e.sparkles).toBeGreaterThan(r.sparkles);
    expect(r.sparkles).toBeGreaterThan(0);
  });

  it('the common rarity colour is near white, not a disabled-looking grey', () => {
    const n = parseInt(RARITY.common.color.slice(1), 16);
    expect(Math.min((n >> 16) & 255, (n >> 8) & 255, n & 255)).toBeGreaterThan(220);
  });
});
