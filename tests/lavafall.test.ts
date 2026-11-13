import { describe, expect, it } from 'vitest';
import { B } from '../src/sim/biomes';
import { LAVAFALL, PAD_CLEAR, inLavafall, lavafallColumn, lavafallSpan } from '../src/sim/structures';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { generateWorld } from '../src/sim/world';
import { flowLiquids } from '../src/sim/liquids';
import { CODEX_IDS } from '../src/sim/explore';
import { fallShade, FALL_SPEED } from '../src/render/lavafx';

const SEEDS = [1, 2, 3, 7, 42, 99, 1234, 77777];

describe('Ash Dunes lavafalls', () => {
  it('every world has a basalt crag with a spring, a clear fall column and a catch pool', () => {
    for (const seed of SEEDS) {
      const w = generateWorld(seed);
      const falls = w.structures.filter((s) => s.kind === 'lavafall');
      expect(falls.length).toBeGreaterThanOrEqual(1);
      for (const s of falls) {
        const col = lavafallColumn(s);
        expect(w.biome[col]).toBe(B.ASH);
        expect(Math.abs(col - w.padX)).toBeGreaterThan(PAD_CLEAR);
        const h = s.y1 - s.y0;
        expect(h).toBeGreaterThanOrEqual(LAVAFALL.minH);
        expect(h).toBeLessThanOrEqual(LAVAFALL.maxH);
        // Spring on top, held by the lip (the sheer face column).
        expect(w.get(s.x0 + 3, s.y0)).toBe(T.MAGMA);
        expect(w.get(col - 1, s.y0)).toBe(T.BASALT);
        for (let y = s.y0; y < s.y1; y++) {
          expect(w.get(col, y)).toBe(T.AIR);
          expect(w.get(col - 1, y)).toBe(T.BASALT);
        }
        // Catch pool, lined below.
        for (let i = 0; i < LAVAFALL.pool; i++) {
          expect(w.get(col + i, s.y1)).toBe(T.MAGMA);
          expect(w.get(col + i, s.y1 + 1)).toBe(T.BASALT);
        }
        expect(lavafallSpan(w, s)).toEqual({ x: col, y0: s.y0, y1: s.y1 });
      }
    }
  });

  it('spring and pool hold their lava when liquids flow', () => {
    const w = generateWorld(SEEDS[0]);
    for (const s of w.structures.filter((st) => st.kind === 'lavafall')) {
      const count = (): number => {
        let n = 0;
        for (let y = s.y0 - 2; y <= s.y1 + 4; y++) for (let x = s.x0 - 4; x <= s.x1 + 4; x++) if (w.get(x, y) === T.MAGMA) n++;
        return n;
      };
      const before = count();
      expect(before).toBe(2 + LAVAFALL.pool);
      for (let t = 0; t < 60; t++) flowLiquids(w, lavafallColumn(s), s.y0 + 3, t, 20, 12);
      expect(count()).toBe(before);
    }
  });

  it('the sheet stops at a block put in its way and burns only inside its span', () => {
    const w = generateWorld(SEEDS[1]);
    const s = w.structures.find((st) => st.kind === 'lavafall')!;
    const col = lavafallColumn(s);
    expect(inLavafall(w, col + 0.5, s.y1, 0.35, 1.8)).toBe(true);
    expect(inLavafall(w, col + 2.5, s.y1 - 1, 0.35, 1.8)).toBe(false);
    expect(inLavafall(w, col + 0.5, s.y0 - 0.1, 0.35, 1.8)).toBe(false);
    w.set(col, s.y0 + 2, T.BASALT);
    expect(lavafallSpan(w, s).y1).toBe(s.y0 + 2);
    expect(inLavafall(w, col + 0.5, s.y1, 0.35, 1.8)).toBe(false);
  });

  it('standing in the fall burns the player', () => {
    const g = new Game(defaultSave());
    const s = g.world.structures.find((st) => st.kind === 'lavafall')!;
    const col = lavafallColumn(s);
    g.body.x = col + 0.5;
    g.body.y = s.y1 - 2;
    g.body.vx = g.body.vy = 0;
    const hp = g.hp;
    for (let i = 0; i < 20; i++) {
      g.body.x = col + 0.5;
      g.body.y = s.y1 - 2;
      g.body.vy = 0;
      g.step(FIXED_DT, NO_CONTROLS);
    }
    expect(g.hp).toBeLessThan(hp);
  });

  it('is a codex place', () => {
    expect(CODEX_IDS.has('poi:lavafall')).toBe(true);
  });
});

describe('lavafall sheet shading', () => {
  it('scrolls downward at FALL_SPEED art px per second', () => {
    for (let ax = 1; ax < 9; ax++) {
      for (let ay = 0; ay < 40; ay += 3) expect(fallShade(ax, ay + FALL_SPEED * 0.5, 10.5, 10)).toBe(fallShade(ax, ay, 10, 10));
    }
  });

  it('has dark crust edges and a hot core with streaks', () => {
    const seen = new Set<number>();
    for (let ay = 0; ay < 64; ay++) {
      expect(fallShade(0, ay, 3, 10)).toBe(0);
      expect(fallShade(9, ay, 3, 10)).toBe(0);
      for (let ax = 1; ax < 9; ax++) seen.add(fallShade(ax, ay, 3, 10));
    }
    expect(seen.has(2) || seen.has(3)).toBe(true);
    expect(seen.has(1)).toBe(true);
  });
});
