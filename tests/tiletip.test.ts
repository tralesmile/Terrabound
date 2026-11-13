import { describe, expect, it } from 'vitest';
import { T, TILES } from '../src/sim/tiles';
import { TILE_TIP_DWELL, TileDwell, tileTip } from '../src/ui/tiletip';

describe('world block tooltips', () => {
  it('names every tile except air and never throws', () => {
    expect(tileTip(T.AIR, 1)).toBeNull();
    expect(tileTip(9999, 1)).toBeNull();
    for (let t = 1; t < TILES.length; t++) {
      const tip = tileTip(t, 1);
      expect(tip?.title).toBe(TILES[t].name);
      expect(tip!.lines.length).toBeGreaterThan(0);
    }
  });

  it('gives dig time from the drill power and names the drop', () => {
    const rust = tileTip(T.RUST, 1)!;
    expect(rust.lines.at(-1)).toBe('Dig 0.3 s  ->  Rust');
    const copper = tileTip(T.COPPER, 2)!;
    expect(copper.lines.at(-1)).toBe(`Dig ${(TILES[T.COPPER].hardness / 2).toFixed(1)} s  ->  Copper wire`);
    expect(tileTip(T.LEAVES, 4)!.lines.at(-1)).toBe('Dig <0.1 s');
  });

  it('explains machines and marks unbreakable blocks; liquids have no dig line', () => {
    const pad = tileTip(T.PAD, 1)!;
    expect(pad.lines).toEqual(['Home base: stand here to bank loot and heal.', 'Unbreakable']);
    expect(tileTip(T.SMELTER, 1)!.lines[0]).toContain('rust into metal');
    const water = tileTip(T.WATER, 1)!;
    expect(water.lines.some((l) => l.startsWith('Dig') || l === 'Unbreakable')).toBe(false);
  });

  it('shows only after the mouse rests on one tile, and resets on a move or a press', () => {
    const d = new TileDwell();
    const a = { x: 3, y: 4 };
    expect(d.update(TILE_TIP_DWELL * 0.6, a, false)).toBe(false);
    expect(d.update(TILE_TIP_DWELL * 0.6, a, false)).toBe(true);
    expect(d.update(0.016, { x: 4, y: 4 }, false)).toBe(false);
    expect(d.update(TILE_TIP_DWELL, { x: 4, y: 4 }, false)).toBe(true);
    expect(d.update(0.016, { x: 4, y: 4 }, true)).toBe(false);
    expect(d.update(0.016, { x: 4, y: 4 }, false)).toBe(false);
    expect(d.update(0.1, null, false)).toBe(false);
  });
});
