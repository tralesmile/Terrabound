import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { chargePoints } from '../src/sim/garage';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { PAD_HALF } from '../src/sim/world';

describe('field garages on the map (charge points)', () => {
  it('lists placed garages away from the pad, sorted by column', () => {
    // World 100 wide, pad column 50, reach 6: |x + 0.5 - 50.5| <= 6 means columns 44..56 are "at the pad".
    const edits = new Map<number, number>([
      [3 * 100 + 80, 68],
      [7 * 100 + 10, 68],
      [5 * 100 + 56, 68], // 6 columns right of the pad: at the pad
      [5 * 100 + 57, 68], // 7 columns: a field garage
      [4 * 100 + 30, 12], // some other placed tile
    ]);
    expect(chargePoints({ w: 100, padX: 50, edits }, 68, 6)).toEqual([
      { x: 10, y: 7 },
      { x: 57, y: 5 },
      { x: 80, y: 3 },
    ]);
  });

  it('a garage built in the field shows up, a mined one goes away', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    expect(chargePoints(w, T.GARAGE, PAD_HALF + 2)).toEqual([]);
    let x = w.padX + 70;
    while (!(w.isSolid(x, w.surface[x]) && w.get(x, w.surface[x] - 1) === T.AIR)) x++;
    const y = w.surface[x];
    for (let xx = x - 20; xx <= x + 20; xx++) {
      for (let yy = y - 8; yy < y; yy++) w.set(xx, yy, T.AIR);
      w.set(xx, y, T.RUST);
    }
    g.body.x = x + 0.5;
    g.body.y = y;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    g.carried = { garage_kit: 1 };
    g.selected = 'garage_kit';
    for (let i = 0; i < 3; i++) g.step(FIXED_DT, { ...NO_CONTROLS, place: true, aim: { tx: x + 2, ty: y - 1 } });
    expect(chargePoints(w, T.GARAGE, PAD_HALF + 2)).toEqual([{ x: x + 2, y: y - 1 }]);
    w.set(x + 2, y - 1, T.AIR);
    expect(chargePoints(w, T.GARAGE, PAD_HALF + 2)).toEqual([]);
  });
});
