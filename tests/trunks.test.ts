import { describe, expect, it } from 'vitest';
import { TRUNK_BRANCH_L, TRUNK_BRANCH_R, TRUNK_ROOT, trunkKind, trunkPixels } from '../src/render/decor';
import { B } from '../src/sim/biomes';

const TS = 16;
const filled = (px: (string | null)[], y: number): number => px.slice(y * TS, y * TS + TS).filter((c) => c !== null).length;

describe('tree trunks', () => {
  it('the root tile flares wider at the ground than the plain bark column', () => {
    const plain = trunkPixels(B.JUNGLE, 0, 0);
    const root = trunkPixels(B.JUNGLE, 0, TRUNK_ROOT);
    // Plain trunk: outline at x 4 and 11 plus bark 5..10 = 8 px per row.
    expect(filled(plain, 15)).toBe(8);
    expect(filled(root, 15)).toBeGreaterThanOrEqual(14);
    expect(filled(root, 0)).toBe(8); // the top joins the trunk above unchanged
  });

  it('branch stubs poke out on their own side only, with a leaf tuft (cable tip in the wastes)', () => {
    const r = trunkPixels(B.JUNGLE, 1, TRUNK_BRANCH_R);
    const l = trunkPixels(B.JUNGLE, 1, TRUNK_BRANCH_L);
    const side = (px: (string | null)[], x0: number, x1: number): number => px.filter((c, i) => c !== null && i % TS >= x0 && i % TS <= x1).length;
    expect(side(r, 12, 15)).toBeGreaterThan(10);
    expect(side(r, 0, 3)).toBe(0);
    expect(side(l, 0, 3)).toBeGreaterThan(10);
    expect(side(l, 12, 15)).toBe(0);
    expect(trunkPixels(B.WASTES, 0, TRUNK_BRANCH_R).includes('#36e0e8')).toBe(true);
  });

  it('trunkKind: root on ground, branch only mid-trunk toward open air, else a plain variant', () => {
    expect(trunkKind(3, true, true, false, true, true, 0.1)).toBe(TRUNK_ROOT);
    expect(trunkKind(3, false, true, true, true, true, 0.1)).toBe(TRUNK_BRANCH_R);
    expect(trunkKind(3, false, true, true, true, true, 0.3)).toBe(TRUNK_BRANCH_L);
    expect(trunkKind(3, false, true, true, true, false, 0.1)).toBe(1); // right side blocked
    expect(trunkKind(2, false, false, true, true, true, 0.1)).toBe(0); // top of the trunk: no stub
    expect(trunkKind(2, false, true, true, true, true, 0.5)).toBe(0);
  });
});
