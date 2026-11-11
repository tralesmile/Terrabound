import { describe, expect, it } from 'vitest';
import { ICON, iconDef } from '../src/render/icons';
import { GEAR_IDS } from '../src/sim/gear';
import { ITEM_IDS } from '../src/sim/tiles';
import { TOOLS } from '../src/sim/game';

describe('item and tool icons', () => {
  it('every item, tool and gear piece has an icon that fits 12x12 and uses only known colours', () => {
    const fallback = iconDef('__none__');
    for (const id of [...ITEM_IDS, ...TOOLS, ...GEAR_IDS]) {
      const d = iconDef(id);
      expect(d, id).not.toBe(fallback);
      expect(d.rows.length, id).toBeLessThanOrEqual(ICON);
      for (const row of d.rows) {
        expect(row.length, `${id}: "${row}"`).toBeLessThanOrEqual(ICON);
        for (const ch of row) if (ch !== ' ') expect(ch === 'o' || ch === 'w' || ch in d.pal, `${id} uses '${ch}'`).toBe(true);
      }
    }
  });
});

describe('tile table', () => {
  it('has one definition per tile id, in order', async () => {
    const { T, TILES } = await import('../src/sim/tiles');
    const ids = Object.values(T).sort((a, b) => a - b);
    expect(ids).toEqual(ids.map((_, i) => i));
    expect(TILES.length).toBe(ids.length);
    expect(TILES[T.SAPLING].name).toBe('Sapling');
  });
});
