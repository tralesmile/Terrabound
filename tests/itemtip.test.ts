import { describe, expect, it } from 'vitest';
import { itemTip, itemUse } from '../src/ui/itemtip';
import { ITEM_IDS } from '../src/sim/tiles';
import { GEAR_IDS } from '../src/sim/gear';
import { TOOLS } from '../src/sim/game';
import { dropAt, makeDrop } from '../src/sim/drops';

describe('item tooltips', () => {
  it('every item, tool and gear piece has a title and at least one line', () => {
    for (const id of [...ITEM_IDS, ...TOOLS, ...GEAR_IDS]) {
      const t = itemTip(id);
      expect(t.title.length, id).toBeGreaterThan(1);
      expect(t.lines.length, id).toBeGreaterThan(0);
      for (const l of t.lines) expect(l.length, id).toBeGreaterThan(5);
    }
  });
  it('names the stack size and says what food does', () => {
    expect(itemTip('rust', 12).title).toBe('Rust  x12');
    expect(itemTip('rust', 1).title).toBe('Rust');
    const food = ITEM_IDS.find((id) => itemUse(id).startsWith('Eat'));
    expect(food).toBeDefined();
  });
  it('a dropped item is found under its floating icon, not a tile away', () => {
    const drops = [makeDrop('crystal', 2, 10.5, 20, 0, 0), makeDrop('rust', 1, 14.5, 20, 0, 0)];
    expect(dropAt(drops, 10.5, 19.5)?.item).toBe('crystal');
    expect(dropAt(drops, 14.6, 19.6)?.item).toBe('rust');
    expect(dropAt(drops, 12.5, 19.5)).toBeNull();
  });
});
