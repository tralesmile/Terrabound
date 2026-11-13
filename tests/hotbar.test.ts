import { describe, expect, it } from 'vitest';
import { PLACEABLE, hotbarOrder, moveInHotbar, visiblePlaceables } from '../src/sim/tiles';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';

describe('arrangeable build bar', () => {
  it('default order is PLACEABLE order and covers every placeable once', () => {
    expect(hotbarOrder()).toEqual(PLACEABLE);
    const custom = hotbarOrder(['torch', 'rust', 'torch', 'bogus']);
    expect(custom.slice(0, 2)).toEqual(['torch', 'rust']);
    expect(custom.length).toBe(PLACEABLE.length);
    expect(new Set(custom).size).toBe(PLACEABLE.length);
  });

  it('visible bar follows the arranged order', () => {
    const inv = { rust: 3, torch: 2, ladder: 1 };
    expect(visiblePlaceables(inv, 'rust')).toEqual(['rust', 'torch', 'ladder']);
    expect(visiblePlaceables(inv, 'rust', ['ladder', 'torch'])).toEqual(['ladder', 'torch', 'rust']);
  });

  it('moving swaps with the next shown neighbour, skipping unowned placeables', () => {
    const inv = { rust: 3, torch: 2, ladder: 1 };
    // metal sits between rust and torch in PLACEABLE but is not owned, so torch swaps straight with rust.
    const next = moveInHotbar([], inv, 'rust', 'torch', -1);
    expect(visiblePlaceables(inv, 'rust', next)).toEqual(['torch', 'rust', 'ladder']);
    const back = moveInHotbar(next, inv, 'rust', 'torch', 1);
    expect(visiblePlaceables(inv, 'rust', back)).toEqual(['rust', 'torch', 'ladder']);
  });

  it('moving past either end or moving an unshown item changes nothing', () => {
    const inv = { rust: 3, torch: 2 };
    expect(moveInHotbar([], inv, 'rust', 'rust', -1)).toEqual(PLACEABLE);
    expect(moveInHotbar([], inv, 'rust', 'torch', 1)).toEqual(PLACEABLE);
    expect(moveInHotbar([], inv, 'rust', 'bed', 1)).toEqual(PLACEABLE);
  });

  it('the selected placeable shows even with none carried and can be moved', () => {
    const inv = { torch: 2 };
    expect(visiblePlaceables(inv, 'door')).toEqual(['torch', 'door']);
    const next = moveInHotbar([], inv, 'door', 'door', -1);
    expect(visiblePlaceables(inv, 'door', next)).toEqual(['door', 'torch']);
  });
});

describe('save v27 build bar order', () => {
  it('a v26 save (no hotbar field) loads with the default order', () => {
    const v26 = JSON.stringify({ v: 26, seedBase: 5, runs: 2, stash: { rust: 4 }, paint: null, paintHelm: null, paintRide: null });
    const s = parseSave(v26);
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.v).toBe(27);
    expect(s.hotbar).toEqual([]);
    expect(s.stash.rust).toBe(4);
  });

  it('round-trips an arranged order and drops junk', () => {
    const s = defaultSave();
    s.hotbar = ['torch', 'ladder'];
    expect(parseSave(serializeSave(s)).hotbar).toEqual(['torch', 'ladder']);
    const bad = JSON.stringify({ v: 27, hotbar: ['torch', 'torch', 7, 'not_an_item', 'iron', 'ladder'] });
    expect(parseSave(bad).hotbar).toEqual(['torch', 'ladder']);
    expect(parseSave(JSON.stringify({ v: 27, hotbar: 'torch' })).hotbar).toEqual([]);
  });
});

describe('game build bar', () => {
  it('moveHotbar reorders the bar and persists in the save', async () => {
    const { Game } = await import('../src/sim/game');
    const g = new Game(defaultSave());
    g.carried = { rust: 5, torch: 3 };
    g.selected = 'rust';
    expect(g.moveHotbar('torch', -1)).toBe(true);
    expect(visiblePlaceables(g.carried, g.selected, g.hotbar)).toEqual(['torch', 'rust']);
    expect(g.moveHotbar('torch', -1)).toBe(false);
    const again = new Game(parseSave(serializeSave(g.toSave())));
    expect(visiblePlaceables({ rust: 1, torch: 1 }, 'rust', again.hotbar)).toEqual(['torch', 'rust']);
  });

  it('cycling the held block follows the arranged order', async () => {
    const { Game } = await import('../src/sim/game');
    const s = defaultSave();
    s.hotbar = ['ladder', 'torch'];
    const g = new Game(s);
    g.selected = 'ladder';
    g.cycleSelected();
    expect(g.selected).toBe('torch');
  });
});
