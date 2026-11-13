import { describe, expect, it } from 'vitest';
import { MASKS, SHAPES, SLOPE_L, SLOPE_R, slopePixel, slopeShape, slopeTop, slopes } from '../src/render/autotile';
import { TS, VARIANTS, atlasCol, autotilePixels } from '../src/render/sprites';
import { T } from '../src/sim/tiles';
import { World } from '../src/sim/world';
import { boxCollides, stepUp, type Body } from '../src/sim/physics';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';

const grid =
  (rows: string[], solid: number = T.SOIL) =>
  (x: number, y: number): number => {
    const c = rows[y]?.[x];
    return c === '#' ? solid : c === 'M' ? T.METAL : T.AIR;
  };

describe('slope caps (render)', () => {
  it('a staircase corner falling right or left gets a cap', () => {
    const right = grid(['.....', '##...', '###..', '####.']);
    expect(slopeShape(right, 1, 1)).toBe(SLOPE_R);
    expect(slopeShape(right, 2, 2)).toBe(SLOPE_R);
    const left = grid(['.....', '...##', '..###', '.####']);
    expect(slopeShape(left, 3, 1)).toBe(SLOPE_L);
    expect(slopeShape(left, 2, 2)).toBe(SLOPE_L);
  });

  it('pillars, overhangs, flat ground, cliffs and built blocks stay square', () => {
    // Single pillar: open on both sides.
    expect(slopeShape(grid(['...', '.#.', '###']), 1, 1)).toBe(0);
    // Flat ground: only the top is open.
    expect(slopeShape(grid(['...', '###', '###']), 1, 1)).toBe(0);
    // Cliff: the ground does not continue one tile down on the open side.
    expect(slopeShape(grid(['....', '##..', '##..', '###.']), 1, 1)).toBe(0);
    // Overhang: open underneath.
    expect(slopeShape(grid(['....', '##..', '#...', '##..']), 1, 1)).toBe(0);
    // Built metal plates keep their square architecture.
    expect(slopeShape(grid(['....', 'M...', 'MM..', 'MMM.']), 0, 1)).toBe(0);
    expect(slopes(T.METAL)).toBe(false);
    expect(slopes(T.SOIL)).toBe(true);
  });

  it('the cut is exactly the half above the diagonal, outlined, with a lit row under it', () => {
    let cut = 0;
    for (let y = 0; y < TS; y++) {
      for (let x = 0; x < TS; x++) {
        const r = slopePixel(SLOPE_R, x, y, TS);
        const l = slopePixel(SLOPE_L, TS - 1 - x, y, TS);
        expect(l).toBe(r);
        if (r === 'x') cut++;
        expect(r === 'x').toBe(x > y);
        if (x === y) expect(r).toBe('o');
        if (x === y - 1) expect(r).toBe('l');
      }
    }
    expect(cut).toBe((TS * (TS - 1)) / 2);
    for (let x = 0; x < TS; x++) {
      expect(slopeTop(SLOPE_R, x, TS)).toBe(x);
      expect(slopeTop(SLOPE_L, x, TS)).toBe(TS - 1 - x);
    }
  });

  it('atlas has two extra shapes per variant and slope cells are transparent above the diagonal', () => {
    expect(SHAPES).toBe(MASKS + 2);
    const cols = new Set<number>();
    for (let m = 0; m < SHAPES; m++) for (let v = 0; v < VARIANTS; v++) cols.add(atlasCol(v, m));
    expect(cols.size).toBe(SHAPES * VARIANTS);
    for (const id of [T.SOIL, T.FROST, T.ASH, T.RUST]) {
      for (let v = 0; v < VARIANTS; v++) {
        const px = autotilePixels(id, v, SLOPE_R);
        expect(px[0 * TS + (TS - 1)]).toBeNull();
        expect(px[(TS - 1) * TS + 0]).not.toBeNull();
        expect(px[(TS - 1) * TS + (TS - 1)]).not.toBeNull();
        const opaque = px.filter((c) => c !== null).length;
        expect(opaque).toBe((TS * (TS + 1)) / 2);
      }
    }
  });
});

/** Open box of air over a floor row `fy`, columns x0..x1. */
function arena(w: World, x0: number, x1: number, fy: number, h = 8): void {
  for (let x = x0; x <= x1; x++) {
    for (let y = fy - h; y < fy; y++) w.set(x, y, T.AIR);
    w.set(x, fy, T.RUST);
  }
}

describe('auto-step (sim)', () => {
  const body = (x: number, y: number): Body => ({ x, y, vx: 0, vy: 0, onGround: true });

  it('climbs a one-tile ledge with headroom', () => {
    const w = new World(40, 40, 1);
    arena(w, 2, 30, 30);
    for (let x = 12; x <= 30; x++) w.set(x, 29, T.RUST);
    const b = body(12 - 0.35, 30);
    expect(stepUp(w, b, 1)).toBe(true);
    expect(b.y).toBe(29);
    expect(b.x).toBeGreaterThan(12 - 0.35);
    expect(boxCollides(w, b.x, b.y)).toBe(false);
  });

  it('refuses a two-tile wall, a low ceiling, open ground and a zero direction', () => {
    const w = new World(40, 40, 1);
    arena(w, 2, 30, 30);
    for (let x = 12; x <= 30; x++) {
      w.set(x, 29, T.RUST);
      w.set(x, 28, T.RUST);
    }
    expect(stepUp(w, body(12 - 0.35, 30), 1)).toBe(false);
    const low = new World(40, 40, 1);
    arena(low, 2, 30, 30);
    for (let x = 12; x <= 30; x++) low.set(x, 29, T.RUST);
    for (let x = 2; x <= 30; x++) low.set(x, 27, T.RUST); // ceiling two tiles over the floor
    expect(stepUp(low, body(12 - 0.35, 30), 1)).toBe(false);
    const flat = new World(40, 40, 1);
    arena(flat, 2, 30, 30);
    expect(stepUp(flat, body(10, 30), 1)).toBe(false);
    expect(stepUp(w, body(12 - 0.35, 30), 0)).toBe(false);
  });

  const ctl = (c: Partial<Controls>): Controls => ({ ...NO_CONTROLS, ...c });
  const fresh = (): { g: Game; fy: number; x0: number } => {
    const g = new Game();
    const x0 = g.world.padX + 20;
    const fy = g.world.surface[x0] - 2;
    arena(g.world, x0 - 4, x0 + 24, fy, 10);
    g.body.x = x0 + 0.5;
    g.body.y = fy;
    g.body.vx = 0;
    g.body.vy = 0;
    g.enemies.length = 0;
    return { g, fy, x0 };
  };

  it('walking right climbs a staircase without jumping, with an eased drawn height and step events', () => {
    const { g, fy, x0 } = fresh();
    for (let i = 0; i < 3; i++) for (let x = x0 + 4 + i * 3; x <= x0 + 24; x++) g.world.set(x, fy - 1 - i, T.RUST);
    let steps = 0;
    let maxLift = 0;
    for (let i = 0; i < 120; i++) {
      g.step(FIXED_DT, ctl({ moveX: 1 }));
      steps += g.events.filter((e) => e.t === 'step').length;
      g.events.length = 0;
      maxLift = Math.max(maxLift, g.stepLift);
      g.enemies.length = 0;
    }
    expect(g.body.y).toBe(fy - 3);
    expect(g.body.x).toBeGreaterThan(x0 + 11);
    expect(steps).toBe(3);
    expect(maxLift).toBeGreaterThan(0.5);
    expect(maxLift).toBeLessThanOrEqual(1);
    run(g, 0.5);
    expect(g.stepLift).toBe(0);
  });

  it('a two-tile wall still stops the walker, and standing still never steps', () => {
    const { g, fy, x0 } = fresh();
    for (let x = x0 + 3; x <= x0 + 24; x++) {
      g.world.set(x, fy - 1, T.RUST);
      g.world.set(x, fy - 2, T.RUST);
    }
    for (let i = 0; i < 90; i++) g.step(FIXED_DT, ctl({ moveX: 1 }));
    expect(g.body.y).toBe(fy);
    expect(g.body.x).toBeLessThan(x0 + 3);
    const { g: h, fy: fy2, x0: x2 } = fresh();
    h.world.set(x2 + 1, fy2 - 1, T.RUST);
    h.body.x = x2 + 1 - 0.35;
    run(h, 1);
    expect(h.body.y).toBe(fy2);
  });
});

function run(g: Game, s: number): void {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, NO_CONTROLS);
}
