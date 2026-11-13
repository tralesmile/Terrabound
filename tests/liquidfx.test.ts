import { describe, expect, it } from 'vitest';
import { acidBubble, surfaceGlint, waveOffsets } from '../src/render/liquidfx';

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

describe('liquid levels in the picture', () => {
  it('the depth ramp runs from bright shallows to dark deep water, in order', async () => {
    const { depthRamp } = await import('../src/render/liquidfx');
    const r = depthRamp([70, 165, 235, 0.5], [14, 42, 110, 0.86], 12);
    expect(r).toHaveLength(12);
    expect(r[0]).toBe('rgba(70,165,235,0.50)');
    expect(r[11]).toBe('rgba(14,42,110,0.86)');
  });
  it('liquid over air or a part-filled cell of itself falls (drawn as a stream); a resting one does not', async () => {
    const { liquidFalling, streamWidth } = await import('../src/render/liquidfx');
    const { World } = await import('../src/sim/world');
    const { T } = await import('../src/sim/tiles');
    const w = new World(5, 6, 1);
    for (let x = 0; x < 5; x++) w.set(x, 5, T.METAL);
    w.set(1, 2, T.WATER);
    expect(liquidFalling(w, 1, 2, T.WATER)).toBe(true);
    w.set(1, 3, T.WATER);
    w.fill[3 * 5 + 1] = 5;
    expect(liquidFalling(w, 1, 2, T.WATER)).toBe(true);
    w.set(1, 4, T.WATER);
    expect(liquidFalling(w, 1, 4, T.WATER)).toBe(false);
    expect(streamWidth(1)).toBe(5);
    expect(streamWidth(16)).toBe(16);
    expect(streamWidth(0)).toBeGreaterThanOrEqual(4);
  });
  it('caustic dapples stay inside the tile and are faint', async () => {
    const { causticDapples } = await import('../src/render/liquidfx');
    for (let t = 0; t < 5; t += 0.3) {
      for (const d of causticDapples(t, 7, 3)) {
        expect(d.x).toBeGreaterThanOrEqual(0);
        expect(d.x + d.w).toBeLessThanOrEqual(16);
        expect(d.y).toBeLessThan(16);
        expect(d.a).toBeLessThan(0.2);
      }
    }
  });
  it('lavafall edges ripple 0-2 px and travel down with the pour', async () => {
    const { fallEdges, FALL_SPEED } = await import('../src/render/lavafx');
    for (let ay = 0; ay < 60; ay += 2) for (const e of fallEdges(ay, 0.4)) expect(e >= 0 && e <= 2).toBe(true);
    expect(fallEdges(10, 0)).toEqual(fallEdges(10 + FALL_SPEED, 1));
  });
});

describe('pour streams', () => {
  it('bridge up to three air cells to the next packet of the same liquid, never through solid', async () => {
    const { streamGap } = await import('../src/render/liquidfx');
    const { World } = await import('../src/sim/world');
    const { T } = await import('../src/sim/tiles');
    const w = new World(3, 10, 1);
    w.set(1, 1, T.WATER);
    w.set(1, 4, T.WATER);
    expect(streamGap(w, 1, 1, T.WATER)).toBe(2);
    w.set(1, 3, T.METAL);
    expect(streamGap(w, 1, 1, T.WATER)).toBe(0);
    w.set(1, 3, T.AIR);
    w.set(1, 4, T.MAGMA);
    expect(streamGap(w, 1, 1, T.WATER)).toBe(0);
  });
});

describe('stream splash', () => {
  it('throws droplets out to both sides and above the surface, fading as they fly', async () => {
    const { splashDrops } = await import('../src/render/liquidfx');
    for (const t of [0.1, 0.5, 1.3]) {
      const d = splashDrops(t, 7, 8);
      expect(d).toHaveLength(4);
      expect(d.some((p) => p.x < 0)).toBe(true);
      expect(d.some((p) => p.x > 0)).toBe(true);
      for (const p of d) {
        expect(p.y).toBeLessThanOrEqual(0);
        expect(Math.abs(p.x)).toBeGreaterThanOrEqual(4);
        expect(p.a).toBeGreaterThanOrEqual(0);
        expect(p.a).toBeLessThanOrEqual(0.9);
      }
    }
    expect(splashDrops(0.3, 7, 16)).toHaveLength(6);
  });

  it('finds the pool under the lowest stream cell only', async () => {
    const { streamLanding } = await import('../src/render/liquidfx');
    const { World } = await import('../src/sim/world');
    const { T } = await import('../src/sim/tiles');
    const w = new World(8, 12, 1);
    for (let x = 0; x < 8; x++) for (let y = 0; y < 12; y++) w.set(x, y, T.AIR);
    for (let x = 0; x < 8; x++) w.set(x, 11, T.BEDROCK);
    for (let x = 0; x < 8; x++) w.set(x, 10, T.WATER);
    w.set(3, 4, T.WATER);
    w.set(3, 5, T.WATER);
    w.fill[5 * 8 + 3] = 8;
    w.set(5, 7, T.WATER);
    w.set(5, 8, T.BEDROCK);
    expect(streamLanding(w, 3, 5, T.WATER)).toBe(10);
    expect(streamLanding(w, 3, 4, T.WATER)).toBeNull();
    expect(streamLanding(w, 5, 7, T.WATER)).toBeNull();
  });
});
