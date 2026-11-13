import { describe, it, expect } from 'vitest';
import { extraLine, isArrival, mergeTarget, MERGE_MAX, MERGE_WINDOW } from '../src/ui/toastfx';

describe('arrival toast merging', () => {
  it('treats discoveries, codex gifts and awards as arrival messages only', () => {
    expect(isArrival('Discovered: Crystal Flats')).toBe(true);
    expect(isArrival('Codex reward: 2 Crystal')).toBe(true);
    expect(isArrival('Award: Blink! Gift in stash: 6 Torch')).toBe(true);
    expect(isArrival('Banked 12 items')).toBe(false);
    expect(isArrival('Battery low')).toBe(false);
  });
  it('folds a codex gift into the fresh discovery pill', () => {
    const toasts = [{ text: 'Banked 3 items', age: 0 }, { text: 'Discovered: Crystal Flats', age: 0 }];
    expect(mergeTarget(toasts, 'Codex reward: 2 Crystal')).toBe(1);
  });
  it('never merges ordinary messages, and never into ordinary pills', () => {
    expect(mergeTarget([{ text: 'Discovered: X', age: 0 }], 'Banked 3 items')).toBe(-1);
    expect(mergeTarget([{ text: 'Banked 3 items', age: 0 }], 'Discovered: X')).toBe(-1);
  });
  it('starts a new pill once the host is stale or full', () => {
    expect(mergeTarget([{ text: 'Discovered: X', age: MERGE_WINDOW + 0.1 }], 'Award: Scout! Gift in stash: 1 Crystal')).toBe(-1);
    const full = Array.from({ length: MERGE_MAX }, () => ({ text: 'x', color: '#fff' }));
    expect(mergeTarget([{ text: 'Discovered: X', age: 0, extras: full }], 'Discovered: Y')).toBe(-1);
  });
  it('shortens follow-up lines', () => {
    expect(extraLine('Codex reward: 2 Crystal, 1 Torch')).toBe('+ 2 Crystal, 1 Torch');
    expect(extraLine('Award: Blink! Gift in stash: 6 Torch')).toBe('Award: Blink! +6 Torch');
  });
});
