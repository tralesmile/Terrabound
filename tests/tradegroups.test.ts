import { describe, expect, it } from 'vitest';
import { Game, NO_CONTROLS } from '../src/sim/game';
import { MOD_IDS } from '../src/sim/mods';
import { NPC_ORDER, TRADES } from '../src/sim/npcs';
import { RESEARCH_IDS } from '../src/sim/research';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { entryNpc, tradeEntries } from '../src/ui/ui';

function homes(g: Game, n: number): void {
  const w = g.world;
  const x0 = w.padX - 9;
  const py = w.padY;
  for (let x = x0; x <= x0 + 4 * n; x++) w.set(x, py - 5, T.METAL);
  for (let k = 0; k <= n; k++) for (let y = py - 5; y <= py - 1; y++) w.set(x0 + 4 * k, y, T.METAL);
  for (let k = 0; k < n; k++) {
    const l = x0 + 4 * k + 1;
    for (let y = py - 4; y <= py - 1; y++) for (let x = l; x <= l + 2; x++) w.set(x, y, T.AIR);
    w.set(l, py - 1, T.BED);
    w.set(l + 2, py - 1, T.TABLE);
    w.set(l + 1, py - 3, T.TORCH);
  }
  g.step(1 / 30, NO_CONTROLS);
}

describe('TRADE tab groups', () => {
  it('folds robots that have not moved in to one header each', () => {
    const g = new Game(defaultSave());
    g.step(1 / 30, NO_CONTROLS);
    const e = tradeEntries(g);
    const heads = e.filter((x) => typeof x !== 'string' && 'header' in x);
    expect(heads.map((h) => entryNpc(h))).toEqual([...NPC_ORDER, 'merchant']);
    // Only headers plus the merchant's stock (never folded).
    expect(e.length).toBe(NPC_ORDER.length + 1 + g.tradeList().filter((t) => t.npc === 'merchant').length);
    const trader = heads[0] as { hidden: number; rows: number };
    expect(trader.hidden).toBe(trader.rows);
    expect(trader.rows).toBe(TRADES.filter((t) => t.npc === 'trader').length);
  });

  it('unfolds each robot under its own header once it lives here', () => {
    const g = new Game(defaultSave());
    homes(g, 4);
    expect(NPC_ORDER.every((k) => g.hasNpc(k))).toBe(true);
    const e = tradeEntries(g);
    expect(e.length).toBe(NPC_ORDER.length + 1 + g.tradeList().length + MOD_IDS.length + RESEARCH_IDS.length);
    // Every row sits after its own header: owners run in contiguous blocks starting with a header.
    let current = '';
    for (const x of e) {
      if (typeof x !== 'string' && 'header' in x) {
        current = x.header;
        expect(x.hidden).toBe(0);
      } else expect(entryNpc(x)).toBe(current);
    }
  });
});
