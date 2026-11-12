import { describe, expect, it } from 'vitest';
import { AO_STEPS, aoRects } from '../src/render/ao';
import { T } from '../src/sim/tiles';

/** '#' rock, '.' air, 'o' glass window (clear, casts no shadow). */
const grid = (rows: string[]) => ({
  get: (x: number, y: number): number => {
    if (y < 0 || x < 0 || y >= rows.length || x >= rows[0].length) return T.AIR;
    const c = rows[y][x];
    return c === '#' ? T.METAL : c === 'o' ? T.WINDOW : T.AIR;
  },
});

/** Sum of shade alpha painted on one art pixel. */
const shadeAt = (rects: ReturnType<typeof aoRects>, px: number, py: number): number =>
  rects.filter((r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h).reduce((a, r) => a + r.alpha, 0);

describe('back-wall ambient occlusion', () => {
  it('open air with no solid neighbours gets no shade', () => {
    expect(aoRects(grid(['...', '...', '...']), 1, 1)).toEqual([]);
  });

  it('a ceiling casts a band that fades with depth and is darker than a floor band', () => {
    const ceil = aoRects(grid(['###', '...', '...']), 1, 1);
    const floor = aoRects(grid(['...', '...', '###']), 1, 1);
    expect(shadeAt(ceil, 8, 0)).toBeGreaterThan(shadeAt(ceil, 8, 1));
    expect(shadeAt(ceil, 8, 1)).toBeGreaterThan(shadeAt(ceil, 8, 2));
    expect(shadeAt(ceil, 8, AO_STEPS.length)).toBe(0);
    expect(shadeAt(ceil, 8, 0)).toBeGreaterThan(shadeAt(floor, 8, 15));
    expect(shadeAt(floor, 8, 15)).toBeGreaterThan(0);
  });

  it('side walls shade their edge column; corners of two bands never double up', () => {
    const r = aoRects(grid(['##.', '#..', '...']), 1, 1);
    expect(shadeAt(r, 0, 8)).toBeCloseTo(AO_STEPS[0]);
    expect(shadeAt(r, 15, 8)).toBe(0);
    // The top-left corner pixel is covered by the ceiling band only.
    expect(shadeAt(r, 0, 0)).toBeLessThanOrEqual(0.5);
    for (const q of r) expect(q.alpha).toBeLessThanOrEqual(0.5);
  });

  it('a lone diagonal block leaves a small inner-corner shadow only in its corner', () => {
    const r = aoRects(grid(['#..', '...', '...']), 1, 1);
    expect(shadeAt(r, 0, 0)).toBeGreaterThan(0);
    expect(shadeAt(r, 15, 15)).toBe(0);
    expect(shadeAt(r, 8, 8)).toBe(0);
  });

  it('clear blocks (windows) do not cast a shadow', () => {
    expect(aoRects(grid(['ooo', 'o.o', 'ooo']), 1, 1)).toEqual([]);
  });
});
