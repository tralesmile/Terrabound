import { describe, expect, it } from 'vitest';
import { CRACK_STAGES, digCrackPixels, crackStage, digChips } from '../src/render/digfx';
import { DIG_PITCH_SPREAD, DIG_VOICE, digPitch } from '../src/platform/digvoice';
import { T } from '../src/sim/tiles';

describe('dig cracks', () => {
  it('maps progress to four stages, none before the first tick', () => {
    expect(crackStage(0)).toBe(0);
    expect(crackStage(0.01)).toBe(1);
    expect(crackStage(0.3)).toBe(2);
    expect(crackStage(0.6)).toBe(3);
    expect(crackStage(0.99)).toBe(CRACK_STAGES);
    expect(crackStage(5)).toBe(CRACK_STAGES);
    expect(crackStage(Number.NaN)).toBe(0);
  });

  it('grows monotonically: every stage keeps the pixels of the stage before', () => {
    for (const [tx, ty] of [[3, 9], [120, 44], [7, 7]]) {
      let prev = new Set<string>();
      let prevN = 0;
      for (let s = 1; s <= CRACK_STAGES; s++) {
        const px = digCrackPixels(tx, ty, s);
        const cur = new Set(px.map(([x, y]) => `${x},${y}`));
        for (const k of prev) expect(cur.has(k)).toBe(true);
        expect(cur.size).toBeGreaterThan(prevN);
        prev = cur;
        prevN = cur.size;
      }
    }
  });

  it('stays inside the tile, is deterministic, and differs between tiles', () => {
    const a = digCrackPixels(10, 20, 4);
    expect(digCrackPixels(10, 20, 4)).toEqual(a);
    expect(digCrackPixels(11, 20, 4)).not.toEqual(a);
    for (const [x, y] of a) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(16);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(16);
    }
    expect(digCrackPixels(10, 20, 0)).toEqual([]);
  });
});

describe('dig chips', () => {
  const rnd = () => 0.5;
  it('fly off the face toward the player, 1-3 per tick', () => {
    const ps = digChips(10, 5, T.RUST, '#8a5a3a', 6, 6.5, rnd);
    expect(ps.length).toBeGreaterThanOrEqual(1);
    expect(ps.length).toBeLessThanOrEqual(3);
    for (const p of ps) {
      expect(p.x).toBeLessThan(10.5);
      expect(p.vx).toBeLessThan(0);
      expect(p.size).toBe(1);
    }
  });

  it('metal adds a spark', () => {
    const dirt = digChips(10, 5, T.RUST, '#8a5a3a', 6, 6.5, rnd);
    const metal = digChips(10, 5, T.IRON, '#9aa3b8', 6, 6.5, rnd);
    expect(metal.length).toBe(dirt.length + 1);
    expect(metal.some((p) => p.color === '#fff6c8')).toBe(true);
  });
});

describe('dig voices', () => {
  it('materials sound different: metal and crystal ring higher than dirt', () => {
    expect(DIG_VOICE.metal.freq).toBeGreaterThan(DIG_VOICE.dirt.freq * 2);
    expect(DIG_VOICE.crystal.freq).toBeGreaterThan(DIG_VOICE.stone.freq * 2);
    expect(DIG_VOICE.dirt.noise).toBeGreaterThan(DIG_VOICE.metal.noise);
  });

  it('pitch varies within the spread and is clamped', () => {
    expect(digPitch(100, 0)).toBeCloseTo(100 * (1 - DIG_PITCH_SPREAD));
    expect(digPitch(100, 1)).toBeCloseTo(100 * (1 + DIG_PITCH_SPREAD));
    expect(digPitch(100, 0.5)).toBeCloseTo(100);
    expect(digPitch(100, 9)).toBeCloseTo(100 * (1 + DIG_PITCH_SPREAD));
  });
});

describe('particle tags', () => {
  it('only block-break debris passes a tag to fx.addParticles (a tag counts as a break)', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    const calls = src.match(/fx\.addParticles\([^;]*\);/g) ?? [];
    // Count top-level arguments of each addParticles call: two means a tag was passed.
    const args = (c: string): number => {
      let depth = 0;
      let n = 1;
      for (const ch of c.slice('fx.addParticles('.length, -2)) {
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        else if (ch === ',' && depth === 0) n++;
      }
      return n;
    };
    const tagged = calls.filter((c) => args(c) > 1);
    expect(calls.length).toBeGreaterThan(1);
    expect(tagged.length).toBe(1);
    expect(tagged[0]).toContain('breakDebris');
  });
});
