import { describe, expect, it } from 'vitest';
import { Game, NO_CONTROLS } from '../src/sim/game';
import { MERCHANT_POOL } from '../src/sim/merchant';
import { MODS } from '../src/sim/mods';
import { MOOD_DISCOUNT, MOOD_LINES, TRADES, moodGive, moodScore, npcLine, npcMood, type Mood } from '../src/sim/npcs';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import type { World } from '../src/sim/world';

const MOODS: Mood[] = ['lonely', 'content', 'happy', 'delighted'];

/** `n` furnished homes side by side on the pad floor (3x4 interiors, shared walls); `cozy` adds decor + back walls. */
function rowHomes(w: World, n: number, cozy = false): void {
  const px = w.padX;
  const py = w.padY;
  const x0 = px - 7;
  const x1 = x0 + 4 * n;
  for (let x = x0; x <= x1; x++) w.set(x, py - 5, T.METAL);
  for (let k = 0; k <= n; k++) for (let y = py - 5; y <= py - 1; y++) w.set(x0 + 4 * k, y, T.METAL);
  for (let k = 0; k < n; k++) {
    const l = x0 + 4 * k + 1;
    for (let y = py - 4; y <= py - 1; y++) for (let x = l; x <= l + 2; x++) {
      w.set(x, y, T.AIR);
      if (cozy) w.setWall(x, y, 1);
    }
    w.set(l, py - 1, T.BED);
    w.set(l + 2, py - 1, T.TABLE);
    w.set(l + 1, py - 3, T.TORCH);
    if (cozy) {
      w.set(l + 1, py - 1, T.CHAIR);
      w.set(l, py - 3, T.POT_PLANT);
      w.set(l + 2, py - 3, T.BANNER);
    }
  }
}

function base(n: number, cozy: boolean): Game {
  const g = new Game(defaultSave());
  rowHomes(g.world, n, cozy);
  g.body.x = g.world.padX + 0.5;
  g.body.y = g.world.padY;
  g.step(1 / 30, NO_CONTROLS);
  return g;
}

describe('robot mood', () => {
  it('comes from comfort plus up to two neighbours', () => {
    expect(npcMood(0, 0)).toBe('lonely');
    expect(npcMood(1, 0)).toBe('content');
    expect(npcMood(2, 1)).toBe('content');
    expect(npcMood(2, 2)).toBe('happy');
    expect(npcMood(4, 0)).toBe('happy');
    expect(npcMood(4, 2)).toBe('delighted');
    expect(moodScore(0, 9)).toBe(2);
    // Neighbours alone never make a robot happy: the room has to be nice too.
    expect(npcMood(0, 3)).toBe('content');
  });

  it('never raises a price; happy robots knock 1, delighted 2 off the biggest stack', () => {
    for (const t of [...TRADES, ...Object.values(MODS).map((m) => ({ give: m.cost }))]) {
      for (const m of MOODS) {
        const g = moodGive(t.give, m);
        for (const [k, n] of Object.entries(g)) {
          const was = t.give[k as keyof typeof t.give] ?? 0;
          expect(n).toBeLessThanOrEqual(was);
          expect(n).toBeGreaterThanOrEqual(Math.max(1, Math.ceil(was / 2)));
        }
        if (MOOD_DISCOUNT[m] === 0) expect(g).toBe(t.give);
      }
    }
    expect(moodGive({ rust: 8 }, 'happy')).toEqual({ rust: 7 });
    expect(moodGive({ rust: 8 }, 'delighted')).toEqual({ rust: 6 });
    expect(moodGive({ fish: 3 }, 'delighted')).toEqual({ fish: 2 });
    expect(moodGive({ glowfish: 1 }, 'delighted')).toEqual({ glowfish: 1 });
    expect(moodGive({ biomass: 4, fish: 1 }, 'happy')).toEqual({ biomass: 3, fish: 1 });
  });

  it('even delighted rates never form a loop that prints goods', () => {
    const delighted = TRADES.map((t) => ({ ...t, give: moodGive(t.give, 'delighted') }));
    const single = [...delighted, ...MERCHANT_POOL].filter((t) => Object.keys(t.give).length === 1 && Object.keys(t.get).length === 1);
    const one = (inv: object): [string, number] => Object.entries(inv)[0] as [string, number];
    for (const a of single) for (const b of single) {
      const [ag, an] = one(a.give);
      const [bg, bn] = one(a.get);
      const [cg, cn] = one(b.give);
      const [dg, dn] = one(b.get);
      if (bg !== cg || dg !== ag) continue;
      expect((bn / an) * (dn / cn), `${a.id} + ${b.id}`).toBeLessThan(1);
    }
    // A delighted Trader still charges more rust per metal than a smelter (4).
    const rm = delighted.find((t) => t.id === 'rust_metal');
    expect((rm?.give.rust ?? 0) / (rm?.get.metal ?? 1)).toBeGreaterThan(4);
  });

  it('mixes a mood line into what the robot says (none while content)', () => {
    const lines = (m: Mood) => new Set(Array.from({ length: 24 }, (_, i) => npcLine('trader', i * 6, m)));
    expect([...lines('content')].some((l) => Object.values(MOOD_LINES).includes(l))).toBe(false);
    expect(lines('happy').has(MOOD_LINES.happy as string)).toBe(true);
    expect(lines('lonely').has(MOOD_LINES.lonely as string)).toBe(true);
    // Still says its own lines too.
    expect(lines('happy').size).toBeGreaterThan(2);
  });
});

describe('robot happiness in the game', () => {
  it('a bare first home is lonely but still charges the posted rate', () => {
    const g = base(1, false);
    expect(g.hasNpc('trader')).toBe(true);
    expect(g.npcMood('trader')).toBe('lonely');
    const t = TRADES.find((k) => k.id === 'rust_metal');
    if (!t) throw new Error('rust_metal');
    expect(g.tradeNow(t)).toBe(t);
    g.stash.rust = 8;
    expect(g.trade('rust_metal')).toBe(true);
    expect(g.stash.rust).toBe(0);
  });

  it('cozy homes with neighbours make robots happy: trades, chips and perks get cheaper', () => {
    const g = base(4, true);
    expect(g.npcs.length).toBe(4);
    for (const k of ['trader', 'medic', 'gunsmith', 'scientist'] as const) {
      expect(g.npcNeighbours(k)).toBe(3);
      expect(['happy', 'delighted']).toContain(g.npcMood(k));
    }
    const off = MOOD_DISCOUNT[g.npcMood('trader')];
    g.stash.rust = 8;
    expect(g.trade('rust_metal')).toBe(true);
    expect(g.stash.rust).toBe(off);
    expect(g.stash.metal).toBeGreaterThanOrEqual(1);
    // Gunsmith chip at the mood price.
    const cost = MODS.overcharge.cost;
    const price = g.npcPrice('gunsmith', cost);
    expect(price).not.toBe(cost);
    for (const [k, n] of Object.entries(price)) g.stash[k as keyof typeof price] = n;
    expect(g.canBuyMod('overcharge')).toBe(true);
    expect(g.buyMod('overcharge')).toBe(true);
    // The hint line mentions the mood now and then.
    const r = g.npcs.find((n) => n.kind === 'trader');
    if (!r) throw new Error('trader');
    g.body.x = r.x + 0.3;
    g.body.y = r.y;
    const said = new Set<string>();
    for (let i = 0; i < 4; i++) {
      g.time = i * 6;
      said.add(g.hintAutomation(false) ?? '');
    }
    expect([...said].some((s) => s.includes('cheaper') || s.includes('off my rates'))).toBe(true);
  });

  it('the merchant and robots not home stay at posted prices', () => {
    const g = base(0, false);
    expect(g.npcMood('trader')).toBe('content');
    expect(g.npcMood('merchant')).toBe('content');
    expect(g.npcPrice('gunsmith', MODS.overcharge.cost)).toBe(MODS.overcharge.cost);
  });
});

describe('mood hearts', () => {
  it('happy robots float a heart now and then; content ones show nothing', async () => {
    const { moodHeart } = await import('../src/render/renderer');
    const shown = (m: Mood) => Array.from({ length: 200 }, (_, i) => moodHeart(m, i * 0.05)).filter(Boolean).length;
    expect(shown('content')).toBe(0);
    expect(shown('happy')).toBeGreaterThan(0);
    expect(shown('happy')).toBeLessThan(200);
    expect(shown('delighted')).toBeGreaterThan(shown('happy'));
    const h = moodHeart('happy', 0.7);
    expect(h && h.rise).toBeGreaterThan(0);
    expect(moodHeart('delighted', 0)?.color).not.toBe(moodHeart('lonely', 0)?.color);
  });
});
