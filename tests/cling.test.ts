import { describe, expect, it } from 'vitest';
import { clingPose } from '../src/render/cling';

describe('cling pose', () => {
  it('shows the climb frame on a ladder or a wall slide, never on the ground', () => {
    expect(clingPose(true, 0, false)).toBe(true);
    expect(clingPose(false, 1, false)).toBe(true);
    expect(clingPose(false, -1, false)).toBe(true);
    expect(clingPose(false, 0, false)).toBe(false);
    expect(clingPose(true, 1, true)).toBe(false);
  });
});
