import { describe, expect, it } from 'vitest';
import { assistDig, type AssistInput } from '../src/sim/digassist';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';

/** Solid tiles as "x,y"; body centre at (10.5, 10.5), reach 4.2 tiles. */
function field(solid: string[], fx: number, fy: number, extra: string[] = []): AssistInput {
  const s = new Set(solid);
  const e = new Set(extra);
  const cx = 10.5;
  const cy = 10.5;
  return {
    cx,
    cy,
    fx,
    fy,
    reach: (x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 4.2,
    usable: (x, y) => s.has(`${x},${y}`) || e.has(`${x},${y}`),
    target: (x, y) => s.has(`${x},${y}`),
  };
}

describe('touch drill assist', () => {
  it('keeps the tapped tile when it has something to drill', () => {
    expect(assistDig(field(['12,11', '12,12'], 12.5, 11.95))).toEqual({ tx: 12, ty: 11 });
    expect(assistDig(field(['12,12'], 12.5, 11.95, ['12,11']))).toEqual({ tx: 12, ty: 11 });
  });

  it('snaps a near miss to the block beside the finger', () => {
    expect(assistDig(field(['12,12'], 12.5, 11.8))).toEqual({ tx: 12, ty: 12 });
  });

  it('picks the closer of two near blocks', () => {
    expect(assistDig(field(['12,12', '13,11'], 12.8, 11.9))).toEqual({ tx: 12, ty: 12 });
    expect(assistDig(field(['12,12', '13,11'], 12.9, 11.8))).toEqual({ tx: 13, ty: 11 });
  });

  it('does not creep: a finger in the middle of an empty cell stays there', () => {
    expect(assistDig(field(['12,12', '13,11', '11,11'], 12.5, 11.5))).toEqual({ tx: 12, ty: 11 });
  });

  it('digs toward a finger beyond reach, first block on the line', () => {
    expect(assistDig(field(['13,10', '14,10'], 22.5, 10.5))).toEqual({ tx: 13, ty: 10 });
  });

  it('never digs past a first block that is out of reach, or through nothing', () => {
    expect(assistDig(field(['16,10'], 22.5, 10.5))).toEqual({ tx: 22, ty: 10 });
    expect(assistDig(field([], 22.5, 10.5))).toEqual({ tx: 22, ty: 10 });
  });

  it('does not snap to a block outside reach', () => {
    expect(assistDig(field(['15,10'], 14.5 - 0.0, 10.5))).toEqual({ tx: 14, ty: 10 });
  });
});

describe('touch drill in the game', () => {
  function stage(): { g: Game; x: number; y: number } {
    const g = new Game(defaultSave(5));
    for (let i = 0; i < 60; i++) g.step(FIXED_DT, NO_CONTROLS);
    // A clean air pocket around the player with one rock two tiles to the right, away from the pad.
    const x = g.world.padX + 40;
    const y = g.world.padY - 12;
    for (let ty = y - 4; ty <= y + 3; ty++) for (let tx = x - 5; tx <= x + 5; tx++) g.world.set(tx, ty, ty >= y ? T.BEDROCK : T.AIR);
    g.world.set(x + 2, y - 1, T.RUST);
    g.world.edits.delete((y - 1) * g.world.w + x + 2);
    g.body.x = x + 0.5;
    g.body.y = y;
    g.tool = 'drill';
    return { g, x, y };
  }
  const press = (tx: number, ty: number, finger: Controls['finger']): Controls => ({ ...NO_CONTROLS, dig: true, aim: { tx, ty }, finger });

  it('drills the block a finger just missed, and a mouse does not', () => {
    const a = stage();
    a.g.step(FIXED_DT, press(a.x + 2, a.y - 2, null));
    expect(a.g.mining).toBeNull();
    const b = stage();
    b.g.step(FIXED_DT, press(b.x + 2, b.y - 2, { x: b.x + 2.5, y: b.y - 1.2 }));
    expect(b.g.mining).toMatchObject({ tx: b.x + 2, ty: b.y - 1 });
  });

  it('never snaps onto a block the player built', () => {
    const { g, x, y } = stage();
    g.world.set(x + 2, y - 1, T.RUST); // an edit: player-built
    g.step(FIXED_DT, press(x + 2, y - 2, { x: x + 2.5, y: y - 1.2 }));
    expect(g.mining).toBeNull();
  });
});
