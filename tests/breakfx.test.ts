import { describe, expect, it } from 'vitest';
import { SPARK_COLORS, breakDebris, breakStyle, darken } from '../src/render/breakfx';
import { mulberry32 } from '../src/sim/rng';
import { T } from '../src/sim/tiles';

describe('per-material break debris', () => {
  it('maps tiles to material styles', () => {
    expect(breakStyle(T.SOIL)).toBe('dirt');
    expect(breakStyle(T.COPPER)).toBe('metal');
    expect(breakStyle(T.CRYSTAL)).toBe('crystal');
    expect(breakStyle(T.TRUNK)).toBe('wood');
    expect(breakStyle(T.LEAVES)).toBe('leaf');
    expect(breakStyle(T.BEDROCK)).toBe('stone');
  });

  it('metal throws hot sparks, dirt throws heavy clods, leaves flutter slowly', () => {
    const metal = breakDebris(5.5, 5.5, T.IRON, '#d6c7b8', mulberry32(1));
    expect(metal.some((p) => SPARK_COLORS.includes(p.color))).toBe(true);
    const dirt = breakDebris(5.5, 5.5, T.SOIL, '#935c48', mulberry32(1));
    expect(dirt.some((p) => SPARK_COLORS.includes(p.color))).toBe(false);
    expect(Math.max(...dirt.map((p) => p.g ?? 0))).toBeGreaterThan(25);
    expect(Math.max(...dirt.map((p) => p.size))).toBe(3);
    const leaf = breakDebris(5.5, 5.5, T.LEAVES, '#3a8a3a', mulberry32(1));
    for (const p of leaf) {
      expect(p.g ?? 18).toBeLessThan(5);
      expect(p.drag).toBeGreaterThan(0);
    }
    const crystal = breakDebris(5.5, 5.5, T.CRYSTAL, '#b06bff', mulberry32(1));
    expect(crystal.some((p) => p.color === '#ffffff')).toBe(true);
  });

  it('every style gives a sane particle set near the tile', () => {
    for (const t of [T.SOIL, T.METAL, T.CRYSTAL, T.TRUNK, T.LEAVES, T.BEDROCK, T.SOLAR]) {
      const ps = breakDebris(10.5, 3.5, t, '#808080', mulberry32(t));
      expect(ps.length).toBeGreaterThanOrEqual(6);
      expect(ps.length).toBeLessThanOrEqual(14);
      for (const p of ps) {
        expect(Math.abs(p.x - 10.5)).toBeLessThan(0.6);
        expect(p.life).toBeGreaterThan(0);
        expect(p.color).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('darken never produces an invalid colour', () => {
    expect(darken('#000000', 0.3)).toBe('#000000');
    expect(darken('#ffffff', 0.5)).toBe('#808080');
    expect(darken('bad', 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
