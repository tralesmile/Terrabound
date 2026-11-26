import { describe, expect, it } from 'vitest';
import { needsResume } from '../src/platform/audiostate';

describe('sound wake-up', () => {
  it('wakes a suspended or iOS-interrupted context, and leaves a live or closed one alone', () => {
    expect(needsResume('suspended')).toBe(true);
    expect(needsResume('interrupted')).toBe(true);
    expect(needsResume('running')).toBe(false);
    expect(needsResume('closed')).toBe(false);
  });
});
