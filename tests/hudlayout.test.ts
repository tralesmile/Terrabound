import { describe, it, expect } from 'vitest';
import { goalCardHeight, goalCardLayout, hudAnchors } from '../src/ui/hudlayout';

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

describe('slim goal card', () => {
  const u = 20;
  const fs = Math.round(u * 0.76);
  it('one line of text makes a one-row card, much shorter than the old head + text + bar card', () => {
    const l = goalCardLayout(300, u, fs, 24, 30, true);
    const h = goalCardHeight(l, 1);
    const old = Math.round(u * 0.58) * 1.25 + fs * 1.2 + u * 0.45 * 1.4 + u * 0.75;
    expect(h).toBeLessThan(old * 0.75);
    expect(h).toBeGreaterThan(fs);
  });
  it('the text column sits right of the badge and leaves room for the count', () => {
    const l = goalCardLayout(300, u, fs, 24, 30, true);
    expect(l.textX).toBeGreaterThan(l.badgeW);
    expect(l.textX + l.textW + l.countW).toBeLessThanOrEqual(300);
    const n = goalCardLayout(300, u, fs, 24, 0, false);
    expect(n.barH).toBe(0);
    expect(n.countW).toBe(0);
    expect(n.textW).toBeGreaterThan(l.textW);
  });
  it('grows a line at a time and never collapses on a tiny screen', () => {
    const l = goalCardLayout(40, u, fs, 24, 30, true);
    expect(l.textW).toBeGreaterThanOrEqual(u * 4);
    expect(goalCardHeight(l, 2) - goalCardHeight(l, 1)).toBeCloseTo(l.lineH);
    expect(goalCardHeight(l, 0)).toBe(goalCardHeight(l, 1));
  });
});
