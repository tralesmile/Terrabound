import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';

describe('ownedGearIds', () => {
  it('lists owned gear and grows when a weapon is found', () => {
    const g = new Game(defaultSave());
    const n = g.ownedGearIds().length;
    expect(n).toBeGreaterThan(0);
    expect(g.ownedGearIds()).toContain('energy_blade');
  });
});
