import { describe, expect, it } from 'vitest';
import { DEADZONE, PAD, heldButtons, padAim, padInUse, padPlay, stepCursor, stickOf, type PadSnapshot } from '../src/platform/padmap';
import { padHints } from '../src/ui/hintbar';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';

function pad(axes: number[] = [0, 0, 0, 0], down: number[] = [], values: Record<number, number> = {}): PadSnapshot {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: values[i] ?? (down.includes(i) ? 1 : 0) }));
  return { axes, buttons };
}

describe('controller mapping', () => {
  it('ignores stick drift inside the dead zone and reaches full travel at the rim', () => {
    expect(stickOf(pad([DEADZONE - 0.02, 0.05, 0, 0]), 0)).toEqual({ x: 0, y: 0 });
    expect(padInUse(pad([0.2, 0.1, -0.15, 0]))).toBe(false);
    expect(stickOf(pad([1, 0, 0, 0]), 0).x).toBeCloseTo(1);
    expect(stickOf(pad([DEADZONE + 0.01, 0, 0, 0]), 0).x).toBeLessThan(0.05);
    const diag = stickOf(pad([1, 1, 0, 0]), 0);
    expect(Math.hypot(diag.x, diag.y)).toBeCloseTo(1);
    expect(stickOf(pad([NaN, 0]), 0)).toEqual({ x: 0, y: 0 });
    expect(padInUse({ axes: [], buttons: [] })).toBe(false);
  });

  it('triggers count past their threshold, whatever "pressed" says', () => {
    expect(heldButtons(pad(undefined, [], { [PAD.RT]: 0.2 }))[PAD.RT]).toBe(false);
    expect(heldButtons(pad(undefined, [], { [PAD.RT]: 0.6 }))[PAD.RT]).toBe(true);
  });

  it('maps sticks, D-pad and face buttons to play controls', () => {
    const p = pad([-1, 0, 0, 0], [PAD.A, PAD.B], { [PAD.RT]: 1 });
    expect(padPlay(p, heldButtons(p))).toMatchObject({ moveX: -1, jump: true, dash: true, dig: true, place: false, down: false, vert: 0 });
    const d = pad(undefined, [PAD.RIGHT, PAD.DOWN, PAD.LT]);
    expect(padPlay(d, heldButtons(d))).toMatchObject({ moveX: 1, down: true, vert: 1, place: true, jump: false });
    const u = pad([0, -1, 0, 0]);
    expect(padPlay(u, heldButtons(u)).vert).toBe(-1);
  });

  const body = { x: 10.5, y: 20, h: 1.7, face: 1 };
  const rest = { right: { x: 0, y: 0 }, vert: 0, moveX: 0 };
  const open = (): boolean => false;

  it('smart aim digs under, over or ahead', () => {
    expect(padAim(body, { ...rest, vert: 1 }, 4.2, open)).toEqual({ tx: 10, ty: 20 });
    expect(padAim(body, { ...rest, vert: -1 }, 4.2, open)).toEqual({ tx: 10, ty: 17 });
    // A two-tile wall ahead: head height first, then feet once the top is gone.
    const wall = new Set(['11,18', '11,19']);
    const solid = (x: number, y: number): boolean => wall.has(`${x},${y}`);
    expect(padAim(body, rest, 4.2, solid)).toEqual({ tx: 11, ty: 18 });
    wall.delete('11,18');
    expect(padAim(body, rest, 4.2, solid)).toEqual({ tx: 11, ty: 19 });
    expect(padAim({ ...body, face: -1 }, rest, 4.2, open)).toEqual({ tx: 9, ty: 19 });
  });

  it('the right stick points anywhere within reach and never past it', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const t = padAim(body, { ...rest, right: { x: Math.cos(a), y: Math.sin(a) } }, 4.2, open);
      expect(Math.hypot(t.tx + 0.5 - body.x, t.ty + 0.5 - (body.y - body.h / 2))).toBeLessThanOrEqual(4.2);
    }
    expect(padAim(body, { ...rest, right: { x: 1, y: 0 } }, 4.2, open).tx).toBe(13);
  });

  it('the menu cursor moves with either stick or the D-pad and stays on screen', () => {
    const p = pad([1, 0, 0, 0]);
    const c = stepCursor({ x: 100, y: 100 }, p, heldButtons(p), 0.1, 800, 600);
    expect(c.x).toBeCloseTo(154);
    expect(c.y).toBe(100);
    const far = stepCursor({ x: 790, y: 5 }, pad([0, 0, 1, -1]), [], 1, 800, 600);
    expect(far).toEqual({ x: 799, y: 0 });
  });

  it('the controller hint strip names the pad buttons', () => {
    expect(padHints().map((h) => h.key)).toContain('RT');
    for (const h of padHints()) expect(h.key.length).toBeLessThanOrEqual(5);
  });
});

describe('controller block cycling', () => {
  it('the bumper walks the filled build-bar slots and wraps', () => {
    const g = new Game(defaultSave(5));
    g.carried.rust = 3;
    g.carried.torch = 2;
    const seen = [0, 1, 2, 3].map(() => (g.cycleBar(), g.selected));
    expect(new Set(seen).size).toBeGreaterThanOrEqual(2);
    expect(seen).toContain('torch');
  });
});
