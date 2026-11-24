import { describe, expect, it } from 'vitest';
import { BLAST_REACH, blastBreaks, blastHardnessAt } from '../src/sim/blastreach';
import { BOMB_RADIUS } from '../src/sim/game';

describe('blast reach', () => {
  it('the core breaks anything, the edge only soft blocks', () => {
    expect(blastBreaks(0.5, BOMB_RADIUS, 5)).toBe(true);
    expect(blastBreaks(BOMB_RADIUS * 0.95, BOMB_RADIUS, 0.35)).toBe(true);
    expect(blastBreaks(BOMB_RADIUS * 0.95, BOMB_RADIUS, 2.5)).toBe(false);
  });
  it('allowed hardness never rises with distance', () => {
    let prev = Infinity;
    for (let d = 0; d <= BOMB_RADIUS; d += 0.1) {
      const h = blastHardnessAt(d, BOMB_RADIUS);
      expect(h).toBeLessThanOrEqual(prev);
      prev = h;
    }
    expect(BLAST_REACH.edgeHardness).toBeGreaterThan(0);
  });
});
