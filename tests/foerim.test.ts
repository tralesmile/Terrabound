import { describe, expect, it } from 'vitest';
import { FOE_RIM_FAR, FOE_RIM_LIT, FOE_RIM_MAX, edgePixels, foeRimAlpha } from '../src/render/foerim';
import { ENEMY_LOOKS, ENEMY_W, enemyFrame } from '../src/render/sprites';

describe('creature rim light', () => {
  it('shows only in dim light and only near the lamp', () => {
    expect(foeRimAlpha(FOE_RIM_LIT, 2, false)).toBe(0);
    expect(foeRimAlpha(1, 2, false)).toBe(0);
    expect(foeRimAlpha(0, FOE_RIM_FAR, false)).toBe(0);
    expect(foeRimAlpha(0, 2, false)).toBeCloseTo(FOE_RIM_MAX);
    expect(foeRimAlpha(0.45, 2, false)).toBeGreaterThan(0);
    expect(foeRimAlpha(0.45, 2, false)).toBeLessThan(FOE_RIM_MAX);
    expect(foeRimAlpha(0, 9, false)).toBeLessThan(foeRimAlpha(0, 6, false));
    expect(foeRimAlpha(0, 2, true)).toBeLessThan(foeRimAlpha(0, 2, false));
  });

  // A 4-wide shape with an eye on its left side.
  const rows = ['....', '.aa.', 'eaaa', '.a..'];

  it('lights the top and the side facing the lamp, never the eye', () => {
    const left = edgePixels(rows, 4, false, -1).map((p) => `${p.x},${p.y}`);
    expect(left).toContain('1,1');
    expect(left).toContain('1,3');
    expect(left).not.toContain('0,2');
    const right = edgePixels(rows, 4, false, 1).map((p) => `${p.x},${p.y}`);
    expect(right).toContain('3,2');
    expect(right).not.toContain('2,2');
  });

  it('mirrors with the sprite and reuses the cached list', () => {
    const flipped = edgePixels(rows, 4, true, 1).map((p) => `${p.x},${p.y}`);
    expect(flipped).not.toContain('3,2'); // the eye is on the right when mirrored
    expect(flipped).toContain('2,3');
    expect(edgePixels(rows, 4, true, 1)).toBe(edgePixels(rows, 4, true, 1));
  });

  it('every enemy frame has an edge to light and stays cheap to draw', () => {
    for (const look of Object.values(ENEMY_LOOKS)) {
      const n = edgePixels(enemyFrame(look.sprite, 0), ENEMY_W, false, 1).length;
      expect(n).toBeGreaterThan(4);
      expect(n).toBeLessThan(80);
    }
  });
});
