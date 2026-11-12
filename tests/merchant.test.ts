import { describe, expect, it } from 'vitest';
import { MERCHANT_FROM, MERCHANT_POOL, MERCHANT_STOCK, MERCHANT_TO, merchantDay, merchantPresent, merchantStock } from '../src/sim/merchant';
import { DAY_LENGTH, dayPhase, isNight } from '../src/sim/daynight';
import { dayOf } from '../src/sim/weather';
import { ITEMS } from '../src/sim/tiles';
import { TRADES } from '../src/sim/npcs';
import { defaultSave } from '../src/sim/save';
import { Game, NO_CONTROLS } from '../src/sim/game';
import { DRONE_W, MERCHANT_CRATE } from '../src/render/sprites';

/** A game time on `day` at day phase `p`. */
function at(day: number, p: number): number {
  // dayPhase(t) = t / DAY_LENGTH + 0.1 (mod 1) and dayOf(t) = floor(t / DAY_LENGTH + 0.1).
  return (day + p - 0.1) * DAY_LENGTH;
}

describe('merchant stock', () => {
  it('the pool names real items, ids are unique and never clash with robot rates', () => {
    const ids = new Set([...TRADES, ...MERCHANT_POOL].map((t) => t.id));
    expect(ids.size).toBe(TRADES.length + MERCHANT_POOL.length);
    for (const t of MERCHANT_POOL) {
      expect(t.npc).toBe('merchant');
      for (const inv of [t.give, t.get]) for (const [k, n] of Object.entries(inv)) {
        expect(ITEMS[k as keyof typeof ITEMS]).toBeDefined();
        expect(n).toBeGreaterThan(0);
      }
      for (const k of Object.keys(t.give)) expect(t.get[k as keyof typeof t.get]).toBeUndefined();
    }
  });

  it('no pair of posted rates makes a loop that prints goods (A -> B -> A always loses)', () => {
    const single = [...TRADES, ...MERCHANT_POOL].filter((t) => Object.keys(t.give).length === 1 && Object.keys(t.get).length === 1);
    const one = (inv: object): [string, number] => Object.entries(inv)[0] as [string, number];
    for (const a of single) for (const b of single) {
      const [ag, an] = one(a.give);
      const [bg, bn] = one(a.get);
      const [cg, cn] = one(b.give);
      const [dg, dn] = one(b.get);
      if (bg !== cg || dg !== ag) continue;
      expect((bn / an) * (dn / cn), `${a.id} + ${b.id}`).toBeLessThan(1);
    }
  });

  it('posts a fixed number of distinct offers a day, the same for the same seed and day', () => {
    for (let d = 0; d < 30; d++) {
      const s = merchantStock(42, d);
      expect(s.length).toBe(MERCHANT_STOCK);
      expect(new Set(s.map((t) => t.id)).size).toBe(MERCHANT_STOCK);
      expect(merchantStock(42, d)).toEqual(s);
    }
  });

  it('rotates: many different line-ups, and every offer shows up within 60 days', () => {
    const lineups = new Set<string>();
    const seen = new Set<string>();
    for (let d = 0; d < 60; d++) {
      const s = merchantStock(7, d);
      lineups.add(s.map((t) => t.id).join());
      for (const t of s) seen.add(t.id);
    }
    expect(lineups.size).toBeGreaterThan(10);
    expect(seen.size).toBe(MERCHANT_POOL.length);
    // Different worlds get different line-ups on the same day.
    expect([...Array(10).keys()].some((d) => merchantStock(7, d).map((t) => t.id).join() !== merchantStock(8, d).map((t) => t.id).join())).toBe(true);
  });
});

describe('merchant visits', () => {
  it('is on the pad from just after sunrise to mid-afternoon, never at night', () => {
    expect(merchantPresent(at(2, (MERCHANT_FROM + MERCHANT_TO) / 2))).toBe(true);
    expect(merchantPresent(at(2, MERCHANT_TO + 0.01))).toBe(false);
    expect(merchantPresent(at(2, 0.75))).toBe(false);
    for (let t = 0; t < DAY_LENGTH * 3; t += 2) if (merchantPresent(t)) expect(isNight(t)).toBe(false);
  });

  it('shows the next visit\'s stock while away', () => {
    expect(merchantDay(at(4, 0.2))).toBe(4);
    expect(merchantDay(at(4, 0.6))).toBe(5);
    expect(dayOf(at(4, 0.6))).toBe(4);
    expect(dayPhase(at(4, 0.6))).toBeCloseTo(0.6);
  });

  it('crate rows fit the drone sprite width', () => {
    for (const r of MERCHANT_CRATE) expect(r.length).toBeLessThanOrEqual(DRONE_W);
  });
});

describe('the merchant in the game', () => {
  it('trades while parked, refuses when away, and announces landing (not on load)', () => {
    const save = defaultSave();
    save.settings.raids = false;
    const g = new Game(save);
    const w = g.world;
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    g.time = at(1, 0.2);
    g.step(1 / 30, NO_CONTROLS);
    expect(g.drainEvents().some((e) => e.t === 'merchant')).toBe(false);
    expect(g.hasNpc('merchant')).toBe(true);
    const list = g.tradeList();
    expect(list.length).toBe(TRADES.length + MERCHANT_STOCK);
    const offer = list[list.length - 1];
    for (const [k, n] of Object.entries(offer.give)) g.stash[k as keyof typeof g.stash] = n;
    expect(g.trade(offer.id)).toBe(true);
    // Talk: stand by the drone and press E.
    const p = g.merchantPos();
    g.body.x = p.x;
    g.step(1 / 30, NO_CONTROLS);
    expect(g.merchantNear()).toBe(true);
    expect(g.hintAutomation(false)).toContain('Dex');
    g.drainEvents();
    expect(g.interact()).toBe(true);
    expect(g.drainEvents().some((e) => e.t === 'npctalk' && e.kind === 'merchant')).toBe(true);
    // Afternoon: it flies off (announced) and its rows stop working.
    g.time = at(1, MERCHANT_TO + 0.01);
    g.step(1 / 30, NO_CONTROLS);
    expect(g.drainEvents().some((e) => e.t === 'merchant' && !e.here)).toBe(true);
    for (const [k, n] of Object.entries(offer.give)) g.stash[k as keyof typeof g.stash] = n;
    const away = g.tradeList().find((t) => t.npc === 'merchant')!;
    for (const [k, n] of Object.entries(away.give)) g.stash[k as keyof typeof g.stash] = n;
    expect(g.trade(away.id)).toBe(false);
    // Next morning: lands again, announced.
    g.time = at(2, 0.05);
    g.step(1 / 30, NO_CONTROLS);
    expect(g.drainEvents().some((e) => e.t === 'merchant' && e.here)).toBe(true);
  });
});
