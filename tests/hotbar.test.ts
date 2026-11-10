import { describe, expect, it } from 'vitest';
import { PLACEABLE, visiblePlaceables } from '../src/sim/tiles';

describe('hotbar visibility', () => {
  it('shows only owned items plus the selected one, in table order', () => {
    expect(visiblePlaceables({}, 'rust')).toEqual(['rust']);
    expect(visiblePlaceables({ torch: 2, metal: 1 }, 'rust')).toEqual(['rust', 'metal', 'torch']);
    expect(visiblePlaceables({ ladder: 0 }, 'ladder')).toEqual(['ladder']);
  });
  it('never exceeds the placeable table', () => {
    const all = Object.fromEntries(PLACEABLE.map((id) => [id, 1]));
    expect(visiblePlaceables(all, 'rust')).toEqual(PLACEABLE);
  });
});
