import { describe, expect, it } from 'vitest';
import {
  HANG_H, HANG_VARIANTS, ICICLE, RCRACK, RCRACK_VARIANTS, SOOT, SOOT_VARIANTS, VINE,
  hangAt, hangKind, hangPixels, ruinCrackAt, ruinCrackPixels, sootAt, sootPixels,
} from '../src/render/ruinfx';
import { B } from '../src/sim/biomes';
import { generateWorld } from '../src/sim/world';
import { T } from '../src/sim/tiles';

describe('ruin weathering pixels', () => {
  it('every crack variant draws a crack inside the tile margin, half with a lit chip', () => {
    let chips = 0;
    for (let v = 0; v < RCRACK_VARIANTS; v++) {
      const px = ruinCrackPixels(v);
      expect(px.length).toBe(256);
      expect(px.filter((c) => c === RCRACK[0]).length).toBeGreaterThanOrEqual(6);
      if (px.includes(RCRACK[2])) chips++;
      for (let i = 0; i < 16; i++) {
        expect(px[i]).toBeNull(); // top row
        expect(px[i * 16]).toBeNull(); // left column (rounded corners stay clean)
      }
    }
    expect(chips).toBe(RCRACK_VARIANTS / 2);
  });

  it('soot streaks start at the top edge and thin out downward', () => {
    for (let v = 0; v < SOOT_VARIANTS; v++) {
      const px = sootPixels(v);
      const top = px.slice(0, 16).filter(Boolean).length;
      const bottom = px.slice(14 * 16).filter(Boolean).length;
      expect(top).toBeGreaterThanOrEqual(2);
      expect(bottom).toBeLessThanOrEqual(top);
      expect(px.every((c) => c === null || c === SOOT[0] || c === SOOT[1])).toBe(true);
    }
  });

  it('vines and icicles hang from the top row in their own palettes', () => {
    for (let v = 0; v < HANG_VARIANTS; v++) {
      const vine = hangPixels('vine', v);
      const ice = hangPixels('icicle', v);
      expect(vine.length).toBe(16 * HANG_H);
      expect(vine.slice(0, 16).some((c) => c === VINE[0])).toBe(true);
      expect(ice.slice(0, 16).some((c) => c === ICICLE[0])).toBe(true);
      expect(vine.every((c) => c === null || (VINE as readonly string[]).includes(c))).toBe(true);
      expect(ice.every((c) => c === null || (ICICLE as readonly string[]).includes(c))).toBe(true);
      expect(vine.some((c) => c === VINE[1])).toBe(true); // leaves, not a bare line
    }
  });
});

describe('ruin weathering placement', () => {
  it('biomes choose what hangs: no vines in the Ash Dunes, icicles in the Frozen Spires', () => {
    expect(hangKind(B.ASH)).toBeNull();
    expect(hangKind(B.FROST)).toBe('icicle');
    expect(hangKind(B.JUNGLE)).toBe('vine');
    expect(hangKind(B.WASTES)).toBe('vine');
  });

  it('soot needs an exposed top (except in the Ash Dunes, where everything is sooted)', () => {
    let buried = 0;
    let exposed = 0;
    let ash = 0;
    for (let x = 0; x < 400; x++) {
      if (sootAt(x, 5, false, false, B.WASTES) >= 0) buried++;
      if (sootAt(x, 5, true, true, B.WASTES) >= 0) exposed++;
      if (sootAt(x, 5, false, false, B.ASH) >= 0) ash++;
    }
    expect(buried).toBe(0);
    expect(exposed).toBeGreaterThan(200);
    expect(ash).toBe(400);
  });

  it('real ruins weather unevenly: some bricks crack, some stay clean, some undersides grow vines', () => {
    const w = generateWorld(1234);
    let ruin = 0;
    let cracked = 0;
    let hangs = 0;
    for (let y = 0; y < w.h; y++) {
      for (let x = 0; x < w.w; x++) {
        if (w.get(x, y) !== T.RUIN) continue;
        ruin++;
        if (ruinCrackAt(x, y) >= 0) cracked++;
        if (w.get(x, y + 1) === T.AIR && hangKind(w.biome[x] ?? 0) && hangAt(x, y + 1) >= 0) hangs++;
      }
    }
    expect(ruin).toBeGreaterThan(30);
    expect(cracked / ruin).toBeGreaterThan(0.25);
    expect(cracked / ruin).toBeLessThan(0.6);
    expect(hangs).toBeGreaterThan(0);
  });
});

describe('old plate grime', () => {
  it('every variant has a stain from the top; rust and cracks vary between variants', async () => {
    const { GRIME, GRIME_VARIANTS, grimePixels } = await import('../src/render/ruinfx');
    let rust = 0;
    let crack = 0;
    for (let v = 0; v < GRIME_VARIANTS; v++) {
      const px = grimePixels(v);
      expect(px.slice(16, 32).some((c) => c === GRIME[0])).toBe(true);
      if (px.includes(GRIME[2])) rust++;
      if (px.includes(GRIME[3])) crack++;
      for (let i = 0; i < 16; i++) expect(px[i]).toBeNull(); // the top seam stays visible
    }
    expect(rust).toBe(GRIME_VARIANTS / 4);
    expect(crack).toBeGreaterThanOrEqual(2);
  });

  it('most old plates are stained, not all (no new identical grid)', async () => {
    const { grimeAt } = await import('../src/render/ruinfx');
    let n = 0;
    const seen = new Set<number>();
    for (let x = 0; x < 500; x++) {
      const g = grimeAt(x, 7);
      if (g >= 0) {
        n++;
        seen.add(g);
      }
    }
    expect(n / 500).toBeGreaterThan(0.6);
    expect(n / 500).toBeLessThan(0.8);
    expect(seen.size).toBe(8);
  });
});
