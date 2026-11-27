import { describe, expect, it } from 'vitest';
import { ONE_HAND, classifyTouch, stickDig, type DigBody } from '../src/platform/onehand';
import { Game } from '../src/sim/game';
import { SAVE_VERSION, defaultSave, parseSave } from '../src/sim/save';
import { ONE_HAND_SIDE, cleanPref, prefValueLabel, touchHint } from '../src/sim/settings';
import { T } from '../src/sim/tiles';

describe('one-hand touch gestures', () => {
  it('a moving finger is the stick, a resting one drills after the hold time', () => {
    expect(classifyTouch(0, 0, 0)).toBe('pending');
    expect(classifyTouch(ONE_HAND.holdMs - 1, 5, 5)).toBe('pending');
    expect(classifyTouch(ONE_HAND.holdMs, 5, 5)).toBe('aim');
    expect(classifyTouch(10, ONE_HAND.drag + 1, 0)).toBe('stick');
    expect(classifyTouch(1000, 0, -ONE_HAND.drag - 1)).toBe('stick');
  });
});

describe('pushing the stick into rock', () => {
  // Standing on row 10 at column 5: head row 8, feet row 9.
  const body: DigBody = { x: 5.7, y: 10, h: 1.8 };
  const run = (blocks: string[], dx: number, dy: number, kept: string[] = []) => {
    const set = new Set(blocks);
    return stickDig(body, dx, dy, (x, y) => set.has(`${x},${y}`), (x, y) => set.has(`${x},${y}`) && !kept.includes(`${x},${y}`));
  };

  it('needs a real push', () => {
    expect(run(['6,8', '6,9'], ONE_HAND.push, 0)).toBeNull();
  });
  it('takes the head block first, then the feet block in a tunnel', () => {
    expect(run(['6,7', '6,8', '6,9'], 60, 0)).toEqual({ tx: 6, ty: 8 });
    expect(run(['6,7', '6,9'], 60, 0)).toEqual({ tx: 6, ty: 9 });
  });
  it('leaves a one-tile ledge with room above for walking to climb', () => {
    expect(run(['6,9'], 60, 0)).toBeNull();
    expect(run(['6,9', '5,7'], 60, 0)).toEqual({ tx: 6, ty: 9 }); // low ceiling: no climb, so dig
  });
  it('digs down and up when that is the stronger push', () => {
    expect(run(['5,10', '6,9'], 20, 70)).toEqual({ tx: 5, ty: 10 });
    expect(run(['5,7'], -20, -70)).toEqual({ tx: 5, ty: 7 });
    expect(run([], 0, 70)).toBeNull();
  });
  it('never picks a block it is not allowed to drill, and does not drill past it', () => {
    expect(run(['6,8', '6,9'], 60, 0, ['6,8'])).toBeNull();
  });
});

describe('what the stick may drill', () => {
  it('only natural ground in reach with the drill in hand', () => {
    const g = new Game(defaultSave());
    const x = Math.floor(g.body.x) + 2;
    const y = Math.floor(g.body.y) - 1;
    g.world.tiles[y * g.world.w + x] = T.RUST; // natural: written without an edit record
    expect(g.stickDiggable(x, y)).toBe(true);
    g.setTool('blade');
    expect(g.stickDiggable(x, y)).toBe(false);
    g.setTool('drill');
    g.world.set(x, y, T.METAL); // placed or changed by the player
    expect(g.stickDiggable(x, y)).toBe(false);
    expect(g.stickDiggable(x + 40, y)).toBe(false);
  });
});

describe('one-hand setting', () => {
  it('is a third touch layout with its own label and hint', () => {
    expect(cleanPref('stickSide', ONE_HAND_SIDE)).toBe(2);
    expect(cleanPref('stickSide', 9)).toBe(2);
    expect(prefValueLabel({ ...defaultSave().settings, stickSide: 2 }, 'stickSide')).toBe('ONE HAND');
    expect(touchHint(2)).toContain('push into rock');
    expect(touchHint(0)).toContain('Left thumb');
  });
  it('survives a save, and a v33 left-handed save keeps its layout', () => {
    const s = defaultSave();
    s.settings.stickSide = 2;
    expect(parseSave(JSON.stringify(s)).settings.stickSide).toBe(2);
    const v33 = parseSave(JSON.stringify({ v: 33, settings: { stickSide: 1 } }));
    expect(v33.settings.stickSide).toBe(1);
    expect(v33.v).toBe(SAVE_VERSION);
  });
});
