import { describe, expect, it } from 'vitest';
import { COLLAPSE, isCollapseDepth, pickCollapse, roofAt, stepCollapse, type CollapseWarn } from '../src/sim/collapse';
import { LAYERS } from '../src/sim/layers';
import { generateWorld, type World } from '../src/sim/world';
import { stepFalling, type FallBody } from '../src/sim/falling';
import { T } from '../src/sim/tiles';

const rock = LAYERS[2].rock;
/** A cave 7 tall and 21 wide with a plasma-rock roof at row `roof` and a rust floor under it. */
const cave = (): { w: World; x0: number; roof: number; floor: number } => {
  const w = generateWorld(8);
  const x0 = Math.floor(w.padX) + 40;
  const roof = Math.floor(w.padY) + 30;
  for (let x = x0 - 12; x <= x0 + 12; x++) {
    w.set(x, roof, rock);
    for (let y = roof + 1; y <= roof + 7; y++) w.set(x, y, T.AIR);
    w.set(x, roof + 8, T.RUST);
  }
  return { w, x0, roof, floor: roof + 8 };
};

describe('ceiling collapse', () => {
  it('only starts in the Plasma layer and deeper', () => {
    expect(isCollapseDepth(COLLAPSE.minDepth - 1)).toBe(false);
    expect(isCollapseDepth(COLLAPSE.minDepth)).toBe(true);
  });

  it('finds layer-rock roofs with room under them, never ore or low ceilings', () => {
    const { w, x0, roof } = cave();
    expect(roofAt(w, x0, roof + 6)).toBe(roof);
    w.set(x0, roof, T.IRON);
    expect(roofAt(w, x0, roof + 6)).toBe(-1);
    w.set(x0 + 1, roof, rock);
    // standing high: a ceiling only 2 tiles over open air has no room to step aside
    expect(roofAt(w, x0 + 1, roof + 2)).toBe(roof);
    w.set(x0 + 1, roof + 2, T.RUST);
    expect(roofAt(w, x0 + 1, roof + 6)).toBe(-1);
  });

  it('is deterministic for a given rng and stays within reach', () => {
    const { w, x0, roof } = cave();
    let n = 0;
    const rng = () => ((n = (n * 7 + 3) % 11) / 11);
    const a = pickCollapse(w, rng, x0, roof + 6);
    n = 0;
    const b = pickCollapse(w, rng, x0, roof + 6);
    expect(a).toEqual(b);
    expect(a && Math.abs(a.x - x0)).toBeLessThanOrEqual(COLLAPSE.reach + 1);
  });

  it('telegraphs for a full second, then drops and lands as rubble', () => {
    const { w, x0, roof, floor } = cave();
    const warns: CollapseWarn[] = [{ x: x0, y: roof, t: COLLAPSE.warn }];
    expect(stepCollapse(w, warns, COLLAPSE.warn - 0.1)).toEqual([]);
    const drop = stepCollapse(w, warns, 0.2);
    expect(drop).toEqual([{ x: x0, y: roof, tile: rock }]);
    w.set(x0, roof, T.AIR);
    const bodies: FallBody[] = [{ x: x0, y: roof, vy: 0, tile: rock }];
    let landed = 0;
    for (let i = 0; i < 240 && bodies.length; i++) landed += stepFalling(w, [], bodies, 1 / 60, () => false).landed.length;
    expect(landed).toBe(1);
    expect(w.get(x0, floor - 1)).toBe(rock);
  });

  it('cancels when the roof is dug away or propped during the telegraph', () => {
    const { w, x0, roof } = cave();
    const warns: CollapseWarn[] = [{ x: x0, y: roof, t: 0.1 }];
    w.set(x0, roof, T.AIR);
    expect(stepCollapse(w, warns, 0.2)).toEqual([]);
    w.set(x0, roof, rock);
    w.set(x0, roof + 1, T.RUST);
    warns.push({ x: x0, y: roof, t: 0.1 });
    expect(stepCollapse(w, warns, 0.2)).toEqual([]);
  });
});
