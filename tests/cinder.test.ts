import { describe, expect, it } from 'vitest';
import { B } from '../src/sim/biomes';
import { CONE, PAD_CLEAR, coneCrater } from '../src/sim/structures';
import { T } from '../src/sim/tiles';
import { W, generateWorld } from '../src/sim/world';
import { flowLiquids } from '../src/sim/liquids';
import { CODEX_IDS, discoveriesAt } from '../src/sim/explore';
import { CONE_PUFFS, PUFF_LIFE, conePuff } from '../src/render/ashfx';

const SEEDS = [1, 2, 3, 7, 42, 99, 1234, 77777];

describe('Ash Dunes cinder cones', () => {
  it('worlds grow basalt cones with a magma crater held by two rims, in the Ash Dunes, away from the pad', () => {
    let total = 0;
    for (const seed of SEEDS) {
      const w = generateWorld(seed);
      const cones = w.structures.filter((s) => s.kind === 'cone');
      total += cones.length;
      for (const s of cones) {
        const c = coneCrater(s);
        expect(w.biome[c.x]).toBe(B.ASH);
        expect(Math.abs(c.x - w.padX)).toBeGreaterThan(PAD_CLEAR);
        const r = (s.x1 - s.x0) / 2;
        expect(r).toBeGreaterThanOrEqual(CONE.minR);
        expect(r).toBeLessThanOrEqual(CONE.maxR);
        const h = s.y1 - s.y0;
        expect(h).toBeGreaterThanOrEqual(CONE.minH);
        expect(h).toBeLessThanOrEqual(CONE.maxH);
        expect(w.get(c.x, c.y)).toBe(T.MAGMA);
        expect(w.get(c.x - 1, c.y)).toBe(T.BASALT);
        expect(w.get(c.x + 1, c.y)).toBe(T.BASALT);
        expect(w.get(c.x, c.y + 1)).toBe(T.BASALT);
        expect(w.get(c.x, c.y - 1)).toBe(T.AIR);
        // A cone, not a box: the flanks are lower than the apex and every column has a back wall.
        expect(w.surface[s.x0]).toBeGreaterThan(w.surface[c.x - 1]);
        expect(w.surface[s.x1]).toBeGreaterThan(w.surface[c.x + 1]);
        for (let x = s.x0; x <= s.x1; x++) {
          for (let y = w.surface[x] + (x === c.x ? 1 : 0); y < s.y1; y++) expect(w.wall(x, y)).toBe(W.CAVE_ROCK);
        }
      }
      // Never overlaps another structure's footprint.
      for (const s of cones) {
        for (const o of w.structures) {
          if (o === s || o.kind === 'vault' || o.kind === 'geode' || o.kind === 'shrine' || o.kind === 'wreck' || o.kind === 'island') continue;
          expect(o.x1 < s.x0 || o.x0 > s.x1, `${o.kind} overlaps cone at ${s.x0}`).toBe(true);
        }
      }
    }
    expect(total).toBeGreaterThanOrEqual(SEEDS.length);
  });

  it('the crater keeps its magma when liquids flow', () => {
    const w = generateWorld(SEEDS[1]);
    const cones = w.structures.filter((s) => s.kind === 'cone');
    expect(cones.length).toBeGreaterThan(0);
    for (const s of cones) {
      const c = coneCrater(s);
      for (let i = 0; i < 200; i++) flowLiquids(w, c.x, c.y, i);
      expect(w.get(c.x, c.y)).toBe(T.MAGMA);
      expect(w.get(c.x, c.y - 1)).toBe(T.AIR);
      expect(w.get(s.x0 - 1, w.surface[s.x0 - 1] - 1)).not.toBe(T.MAGMA);
    }
  });

  it('is a codex place found by standing on it', () => {
    expect(CODEX_IDS.has('poi:cone')).toBe(true);
    const w = generateWorld(SEEDS[0]);
    const s = w.structures.find((st) => st.kind === 'cone');
    expect(s).toBeDefined();
    if (!s) return;
    expect(discoveriesAt(w, s.x0 + 1, w.surface[s.x0 + 1])).toContain('poi:cone');
  });
});

describe('cinder cone smoke plume', () => {
  it('puffs rise, swell and lean downwind, and fade in and out (no pop)', () => {
    const early = conePuff(0, 0.05 * PUFF_LIFE, 0);
    const late = conePuff(0, 0.9 * PUFF_LIFE, 0);
    expect(late.y).toBeGreaterThan(early.y);
    expect(late.r).toBeGreaterThan(early.r);
    expect(late.x).toBeGreaterThan(early.x);
    expect(conePuff(0, 0, 0).a).toBeLessThan(0.05);
    expect(conePuff(0, 0.999 * PUFF_LIFE, 0).a).toBeLessThan(0.05);
  });

  it('the plume is continuous: at any time most puffs are visible', () => {
    for (let t = 0; t < 10; t += 0.37) {
      let vis = 0;
      for (let k = 0; k < CONE_PUFFS; k++) if (conePuff(k, t, 17).a > 0.05) vis++;
      expect(vis).toBeGreaterThanOrEqual(CONE_PUFFS - 2);
    }
  });
});
