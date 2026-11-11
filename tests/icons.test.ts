import { describe, expect, it } from 'vitest';
import { ICON, ICONS } from '../src/render/icons';
import { ITEM_IDS } from '../src/sim/tiles';
import { TOOLS } from '../src/sim/game';

describe('item and tool icons', () => {
  it('every item and tool has a hand-made icon that fits 12x12 and uses only known colours', () => {
    for (const id of [...ITEM_IDS, ...TOOLS]) {
      const d = ICONS[id];
      expect(d, id).toBeDefined();
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
