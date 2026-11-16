import { describe, expect, it } from 'vitest';
import { inBox } from '../src/ui/ui';

describe('hotbar strip hit box', () => {
  it('holds points inside and on the edges, nothing outside, and a null box holds nothing', () => {
    const b = { x: 100, y: 600, w: 500, h: 80 };
    expect(inBox(b, 100, 600)).toBe(true);
    expect(inBox(b, 600, 680)).toBe(true);
    expect(inBox(b, 350, 640)).toBe(true);
    expect(inBox(b, 99, 640)).toBe(false);
    expect(inBox(b, 350, 681)).toBe(false);
    expect(inBox(null, 0, 0)).toBe(false);
  });
});
