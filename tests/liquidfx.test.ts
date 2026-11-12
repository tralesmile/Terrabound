import { describe, expect, it } from 'vitest';
import { acidBubble, causticBand, depthShade, surfaceGlint, waveOffsets } from '../src/render/liquidfx';

describe('liquid fx (render, pure)', () => {
  it('crest offsets stay in 0..2, use every level and move over time', () => {
    const seen = new Set<number>();
    let changes = 0;
    let prev = waveOffsets(0, 7).join();
    for (let t = 0; t < 10; t += 0.1) {
      const o = waveOffsets(t, 7);
      expect(o).toHaveLength(4);
      for (const v of o) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(2);
        seen.add(v);
      }
      if (o.join() !== prev) changes++;
      prev = o.join();
    }
    expect([...seen].sort()).toEqual([0, 1, 2]);
    expect(changes).toBeGreaterThan(20);
  });

  it('crest is a travelling wave: neighbour columns differ by at most 1 px most of the time', () => {
    let jumps = 0;
    let total = 0;
    for (let t = 0; t < 10; t += 0.1) {
      const row = [...waveOffsets(t, 3), ...waveOffsets(t, 4)];
      for (let i = 1; i < row.length; i++) {
        total++;
        if (Math.abs((row[i] ?? 0) - (row[i - 1] ?? 0)) > 1) jumps++;
      }
    }
    expect(jumps / total).toBeLessThan(0.2);
  });

  it('glints sit on the tile, fade in and out and are absent part of the time', () => {
    let off = 0;
    for (let t = 0; t < 30; t += 0.05) {
      const g = surfaceGlint(t, 5);
      if (!g) { off++; continue; }
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.x).toBeLessThanOrEqual(14);
      expect(g.a).toBeGreaterThanOrEqual(0);
      expect(g.a).toBeLessThanOrEqual(1);
    }
    expect(off).toBeGreaterThan(100);
  });

  it('depth shade grows with depth and is capped', () => {
    expect(depthShade(0)).toBe(0);
    expect(depthShade(1)).toBeLessThan(depthShade(2));
    expect(depthShade(3)).toBeLessThan(depthShade(4));
    expect(depthShade(40)).toBeLessThanOrEqual(0.42);
  });

  it('caustics only show 1-3 cells down and fit inside the tile', () => {
    expect(causticBand(1, 2, 0)).toBeNull();
    expect(causticBand(1, 2, 4)).toBeNull();
    for (let t = 0; t < 10; t += 0.2) {
      for (const d of [1, 2, 3]) {
        const c = causticBand(t, 9, d);
        expect(c).not.toBeNull();
        if (!c) continue;
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w).toBeLessThanOrEqual(16);
      }
    }
  });

  it('acid bubbles rise from the bottom to the top and swell before popping', () => {
    const ys: number[] = [];
    let big = false;
    for (let t = 0; t < 6; t += 0.02) {
      const b = acidBubble(t, 4, 9);
      if (!b) continue;
      ys.push(b.y);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.r).toBeLessThanOrEqual(16);
      if (b.r === 2) big = true;
    }
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(13);
    expect(Math.min(...ys)).toBeLessThanOrEqual(3);
    expect(big).toBe(true);
  });
});
