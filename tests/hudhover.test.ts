import { describe, expect, it } from 'vitest';
import { hoverLabel } from '../src/ui/hudbuttons';

const rects = [
  { x: 1000, y: 10, w: 44, h: 44, label: 'Settings' },
  { x: 1048, y: 10, w: 44, h: 44, label: 'Map (M)' },
];

describe('HUD hover labels', () => {
  it('names the button under the mouse, drawn just left of it and centred on it', () => {
    const t = hoverLabel(rects, { x: 1060, y: 30 }, false, 80);
    expect(t).toEqual({ label: 'Map (M)', right: 1042, cy: 32 });
  });
  it('shows nothing off the buttons, on touch, or without a mouse', () => {
    expect(hoverLabel(rects, { x: 500, y: 30 }, false, 80)).toBeNull();
    expect(hoverLabel(rects, { x: 1060, y: 30 }, true, 80)).toBeNull();
    expect(hoverLabel(rects, null, false, 80)).toBeNull();
  });
  it('keeps a long label on screen when the buttons sit near the left edge', () => {
    const t = hoverLabel([{ x: 20, y: 0, w: 44, h: 44, label: 'Shop (upgrade ready)' }], { x: 30, y: 5 }, false, 200);
    expect(t?.right).toBe(204);
  });
});
