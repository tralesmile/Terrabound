import { describe, expect, it } from 'vitest';
import { CRACK, CRACK_DEPTH, CRACK_VARIANTS, DRIFT, DRIFT_H, DRIFT_VARIANTS, crackAt, crackPixels, driftHeight, driftPixels } from '../src/render/ashfx';
import { generateWorld } from '../src/sim/world';
import { B } from '../src/sim/biomes';
import { T } from '../src/sim/tiles';

describe('ash drift caps', () => {
  it('heights stay in range and join seamlessly from tile to tile', () => {
    for (let v = 0; v < DRIFT_VARIANTS; v++) {
      for (let x = 0; x < 16; x++) {
        const h = driftHeight(x, v);
        expect(h).toBeGreaterThanOrEqual(1);
        expect(h).toBeLessThanOrEqual(DRIFT_H);
      }
      // Last column of one variant and first of the next differ by at most the ripple + 1.
      const a = driftHeight(15, v);
      const b = driftHeight(0, (v + 1) % DRIFT_VARIANTS);
      expect(Math.abs(a - b)).toBeLessThanOrEqual(2);
    }
  });

  it('every column has a bright crest on top and the cap swells (not a flat strip)', () => {
    const heights = new Set<number>();
    for (let v = 0; v < DRIFT_VARIANTS; v++) {
      const px = driftPixels(v);
      expect(px.length).toBe(16 * DRIFT_H);
      for (let x = 0; x < 16; x++) {
        expect(px[x]).toBe(DRIFT[0]);
        heights.add(driftHeight(x, v));
      }
    }
    expect(heights.size).toBeGreaterThanOrEqual(3);
  });
});

describe('cracked ash crust', () => {
  it('crack patterns glow (hot core + melt) inside the tile margin', () => {
    for (let v = 0; v < CRACK_VARIANTS; v++) {
      const px = crackPixels(v);
      const cols = new Set(px.filter(Boolean));
      expect(cols.has(CRACK[1])).toBe(true);
      expect(cols.has(CRACK[0])).toBe(true);
      for (let i = 0; i < 16; i++) {
        expect(px[i]).toBeNull();
        expect(px[15 * 16 + i]).toBeNull();
      }
    }
  });

  it('cracks come in clusters near the surface, with calm ash between them', () => {
    expect(crackAt(10, 10, -1)).toBe(-1);
    expect(crackAt(10, 10, CRACK_DEPTH + 1)).toBe(-1);
    let hot = 0;
    let n = 0;
    let runs = 0;
    let prev = false;
    for (let x = 0; x < 2000; x++) {
      const on = crackAt(x, 40, 0) >= 0;
      n++;
      if (on) hot++;
      if (on && !prev) runs++;
      prev = on;
    }
    expect(hot / n).toBeGreaterThan(0.05);
    expect(hot / n).toBeLessThan(0.45);
    // Clustered: patches average more than one tile wide.
    expect(hot / runs).toBeGreaterThan(1.5);
    // Deterministic.
    expect(crackAt(123, 45, 1)).toBe(crackAt(123, 45, 1));
  });

  it('real Ash Dunes surfaces get some cracked tiles', () => {
    const w = generateWorld(42);
    let cracked = 0;
    let ash = 0;
    for (let x = 0; x < w.w; x++) {
      if (w.biome[x] !== B.ASH) continue;
      for (let d = 0; d <= CRACK_DEPTH; d++) {
        const y = w.surface[x] + d;
        if (w.get(x, y) !== T.ASH) continue;
        ash++;
        if (crackAt(x, y, d) >= 0) cracked++;
      }
    }
    expect(ash).toBeGreaterThan(50);
    expect(cracked).toBeGreaterThan(3);
    expect(cracked).toBeLessThan(ash * 0.5);
  });
});
