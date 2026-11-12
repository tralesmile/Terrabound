import { describe, it, expect } from 'vitest';
import { hudAnchors } from '../src/ui/hudlayout';

const rectsFor = (w: number, u: number, mirrored: boolean) => {
  const barW = Math.min(w * 0.45, u * 14);
  const heal = u * 1.25 * 2 + u * 0.4;
  const col = u * 5.2;
  const gear = u * 2.4;
  const a = hudAnchors(w, u, barW, heal, col, gear, mirrored);
  return {
    a,
    status: { x0: a.x, x1: a.x + a.barW + u * 0.5 + heal },
    buttons: { x0: Math.min(a.bx, a.gearX), x1: Math.max(a.bx + col, a.gearX + gear) },
  };
};

describe('HUD anchors', () => {
  it('normal layout keeps the status block left and the buttons right', () => {
    const { a, status, buttons } = rectsFor(1280, 20, false);
    expect(a.x).toBe(20);
    expect(buttons.x1).toBeCloseTo(1280 - 20);
    expect(status.x1).toBeLessThan(buttons.x0);
  });
  for (const [w, u] of [
    [390, 15],
    [390, 20],
    [844, 15],
    [1280, 20],
  ]) {
    it(`mirrored layout at ${w}px / u ${u}: buttons left, status right, no overlap, on screen`, () => {
      const { a, status, buttons } = rectsFor(w, u, true);
      expect(a.bx).toBe(u);
      expect(buttons.x1).toBeLessThan(status.x0);
      expect(status.x1).toBeLessThanOrEqual(w - u + 0.01);
      expect(a.rightLimit).toBeGreaterThan(w - u);
    });
  }
});
