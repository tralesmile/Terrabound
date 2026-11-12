import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { MAX_INSET_SHARE, px, safeFrame } from '../src/ui/safearea';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};

describe('safe-area frame', () => {
  it('no insets is the whole screen', () => {
    expect(safeFrame(390, 844, { top: 0, right: 0, bottom: 0, left: 0 })).toEqual({ x: 0, y: 0, w: 390, h: 844 });
  });

  it('a notch and a home bar shrink the frame from the top and bottom', () => {
    expect(safeFrame(390, 844, { top: 47, right: 0, bottom: 34, left: 0 })).toEqual({ x: 0, y: 47, w: 390, h: 763 });
  });

  it('landscape notch insets shrink the sides', () => {
    expect(safeFrame(844, 390, { top: 0, right: 47, bottom: 21, left: 47 })).toEqual({ x: 47, y: 0, w: 750, h: 369 });
  });

  it('bad or huge reports are clamped so the UI never collapses', () => {
    const f = safeFrame(400, 800, { top: Number.NaN, right: -5, bottom: 5000, left: Infinity });
    expect(f.x).toBe(0);
    expect(f.y).toBe(0);
    expect(f.h).toBe(800 - Math.floor(800 * MAX_INSET_SHARE));
    expect(f.w).toBe(400);
  });

  it('parses computed px values', () => {
    expect(px('34px')).toBe(34);
    expect(px('')).toBe(0);
    expect(px(null)).toBe(0);
    expect(px('auto')).toBe(0);
  });
});

describe('touch REEL hold button', () => {
  it('reels the rope in while held, whatever tool is in hand, and stops when released', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    const x = w.padX + 80;
    const y = w.surface[x];
    for (let xx = x - 25; xx <= x + 25; xx++) {
      for (let yy = Math.max(1, y - 30); yy < y; yy++) w.set(xx, yy, T.AIR);
      w.set(xx, y, T.RUST);
      w.set(xx, y - 12, T.METAL);
    }
    g.body.x = x + 0.5;
    g.body.y = y;
    g.setTool('hook');
    run(g, 0.05, { dig: true, aim: { tx: x + 4, ty: y - 12 } });
    expect(g.hook).not.toBeNull();
    const len = g.hook!.len;
    run(g, 0.3);
    expect(g.hook!.len).toBeCloseTo(len, 5);
    g.setTool('drill');
    run(g, 0.5, { reel: true });
    expect(g.hook).not.toBeNull();
    expect(g.hook!.len).toBeLessThan(len - 2);
    const held = g.hook!.len;
    run(g, 0.3);
    expect(g.hook!.len).toBeCloseTo(held, 5);
  });
});
