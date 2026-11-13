import { describe, it, expect } from 'vitest';
import { GHOST_AFTER, GHOST_FADE, ghostText, toastGhost } from '../src/ui/toastfx';

describe('old toasts fold to a ghost line', () => {
  it('stays a full pill until GHOST_AFTER, then folds over GHOST_FADE', () => {
    expect(toastGhost(0)).toBe(0);
    expect(toastGhost(GHOST_AFTER)).toBe(0);
    expect(toastGhost(GHOST_AFTER + GHOST_FADE / 2)).toBeCloseTo(0.5);
    expect(toastGhost(GHOST_AFTER + GHOST_FADE)).toBe(1);
    expect(toastGhost(99)).toBe(1);
  });
  it('a default 2.4 s toast never ghosts', () => {
    expect(GHOST_AFTER).toBeGreaterThan(2.4);
  });
  it('the ghost line keeps the head as a short prefix', () => {
    expect(ghostText('Discovered: Crystal Flats')).toBe('Discovered: Crystal Flats');
    expect(ghostText('Banked 12 items')).toBe('Banked 12 items');
  });
});
