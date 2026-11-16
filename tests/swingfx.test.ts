import { describe, expect, it } from 'vitest';
import { boltHalo, crescent, SWING_SPAN, SWING_TAIL, swingStyle, swingSweep } from '../src/render/swingfx';
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

describe('player bolt halo', () => {
  it('a plain gun glows in the bolt colour; rare and epic glow wider in the rarity colour', () => {
    expect(boltHalo('#ffd24a', 'common', RARITY.common.color)).toEqual({ color: '#ffd24a', radius: 1.1 });
    const r = boltHalo('#ffd24a', 'rare', RARITY.rare.color);
    const e = boltHalo('#ffd24a', 'epic', RARITY.epic.color);
    expect(r.color).toBe(RARITY.rare.color);
    expect(e.color).toBe(RARITY.epic.color);
    expect(e.radius).toBeGreaterThan(r.radius);
    expect(r.radius).toBeGreaterThan(1.1);
    // The halo appends a 2-digit alpha, so colours must be 7-char hex.
    for (const c of [r.color, e.color]) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('swing smear sweep', () => {
  it('sweeps over the head from up-ahead to down-ahead, the tail growing from the start', () => {
    const a = swingSweep(0, 1);
    expect(a.head).toBeCloseTo(a.tail);
    const mid = swingSweep(0.5, 1);
    expect(mid.head - mid.tail).toBeCloseTo(SWING_SPAN / 2);
    const end = swingSweep(1, 1);
    expect(end.head - end.tail).toBeCloseTo(SWING_TAIL);
    expect(end.head - a.head).toBeCloseTo(SWING_SPAN);
    // Starts above the horizon ahead (negative y) and ends below it, always in front (cos > 0).
    expect(Math.sin(a.head)).toBeLessThan(0);
    expect(Math.sin(end.head)).toBeGreaterThan(0);
    for (const s of [a, mid, end]) expect(Math.cos(s.head)).toBeGreaterThan(0);
  });

  it('facing left mirrors the sweep across the vertical', () => {
    for (const k of [0, 0.3, 1]) {
      const r = swingSweep(k, 1);
      const l = swingSweep(k, -1);
      expect(Math.cos(l.head)).toBeCloseTo(-Math.cos(r.head));
      expect(Math.sin(l.head)).toBeCloseTo(Math.sin(r.head));
    }
    expect(swingSweep(2, 1)).toEqual(swingSweep(1, 1));
  });

  it('the crescent is thick at the blade and tapers to a point at the tail', () => {
    const sw = swingSweep(0.8, 1);
    const n = 10;
    const pts = crescent(0, 0, sw, 50, 12, n);
    expect(pts.length).toBe(2 * 2 * (n + 1));
    const r = (i: number) => Math.hypot(pts[2 * i], pts[2 * i + 1]);
    // outer edge all at 50
    for (let i = 0; i <= n; i++) expect(r(i)).toBeCloseTo(50);
    // inner edge runs head -> tail: first inner point (head) is 12 in, last (tail) is on the rim
    expect(r(n + 1)).toBeCloseTo(38);
    expect(r(2 * n + 1)).toBeCloseTo(50);
  });
});
