import { describe, expect, it } from 'vitest';
import { newDive, tripChips, tripSince } from '../src/sim/divereport';
import { Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { BANK_CARD_LIFE, BANK_CARD_RANGE, bankCardAge, bankCardFade, bankCardLayout } from '../src/ui/bankcard';

describe('trip banked card', () => {
  it('a trip is the dive since the last bank, never negative', () => {
    const start = { ...newDive(), mined: 10, kills: 2, time: 30 };
    const now = { ...newDive(), mined: 25, kills: 2, chests: 1, time: 95 };
    const t = tripSince(now, start, 41.8, 12);
    expect(t).toMatchObject({ banked: 12, depth: 41, mined: 15, kills: 0, chests: 1, time: 65 });
    expect(tripSince(start, now, -3, -1)).toMatchObject({ banked: 0, depth: 0, mined: 0, time: 0 });
  });

  it('chips lead with a boss, skip empty stats and cap at max', () => {
    const t = { banked: 5, depth: 60, mined: 30, kills: 4, chests: 1, discoveries: 2, bosses: 1, time: 10 };
    expect(tripChips(t)).toEqual(['1 boss down', '60 m deep', '30 mined', '4 beaten']);
    expect(tripChips({ ...t, bosses: 0, depth: 1, mined: 0, kills: 0 })).toEqual(['1 chest', '2 places found']);
    expect(tripChips(t, 2)).toHaveLength(2);
  });

  it('fades in, holds, fades out and is gone at its life', () => {
    expect(bankCardFade(0).alpha).toBe(0);
    expect(bankCardFade(0.1).slide).toBeLessThan(1);
    expect(bankCardFade(1.5)).toEqual({ slide: 1, alpha: 1 });
    expect(bankCardFade(BANK_CARD_LIFE - 0.2).alpha).toBeLessThan(0.5);
    expect(bankCardFade(BANK_CARD_LIFE).alpha).toBe(0);
  });

  it('sits above the bar, centred, and wraps chips inside a phone', () => {
    const u = 13;
    const L = bankCardLayout(390, u, 700, 160, [90, 80, 70, 100]);
    expect(L.y + L.h).toBeLessThanOrEqual(700);
    expect(Math.abs(L.x + L.w / 2 - 195)).toBeLessThan(0.01);
    expect(L.x).toBeGreaterThanOrEqual(u);
    for (const c of L.chips) {
      expect(c.x).toBeGreaterThanOrEqual(L.x);
      expect(c.x + c.w).toBeLessThanOrEqual(L.x + L.w + 0.01);
      expect(c.y + c.h).toBeLessThanOrEqual(L.y + L.h);
    }
    const rows = new Set(L.chips.map((c) => Math.round(c.y)));
    expect(rows.size).toBeGreaterThan(1);
    const wide = bankCardLayout(1280, 16, 580, 200, [90, 80, 70, 100]);
    expect(new Set(wide.chips.map((c) => Math.round(c.y))).size).toBe(1);
    // Sliding in starts lower and lands at rest.
    expect(bankCardLayout(1280, 16, 580, 200, [90], 0).y).toBeGreaterThan(bankCardLayout(1280, 16, 580, 200, [90], 1).y);
  });

  it('banking at the pad emits the trip and starts a new one', () => {
    const g = new Game(defaultSave(7));
    for (let i = 0; i < 5; i++) g.step(1 / 30, NO_CONTROLS);
    g.drainEvents();
    const emit = (e: unknown): void => (g as unknown as { emit: (e: unknown) => void }).emit(e);
    emit({ t: 'break', x: 0, y: 0, id: 1 });
    emit({ t: 'break', x: 0, y: 0, id: 1 });
    emit({ t: 'enemykill', kind: 'crawler', x: 0, y: 0 });
    g.tripDeep = 37;
    g.carried = { iron_scrap: 6 };
    expect(g.bank()).toBe(6);
    const bank = g.drainEvents().find((e) => e.t === 'bank');
    expect(bank && bank.t === 'bank' ? bank.trip : null).toMatchObject({ banked: 6, mined: 2, kills: 1, depth: 37 });
    g.carried = { iron_scrap: 2 };
    g.bank();
    const again = g.drainEvents().find((e) => e.t === 'bank');
    expect(again && again.t === 'bank' ? again.trip : null).toMatchObject({ banked: 2, mined: 0, kills: 0, depth: 0 });
  });

  it('walking off on a new trip fades the card out instead of carrying it into the next biome', () => {
    expect(bankCardAge(0.5, BANK_CARD_RANGE - 1)).toBe(0.5);
    const far = bankCardAge(0.5, BANK_CARD_RANGE + 5);
    expect(far).toBeGreaterThan(0.5);
    expect(far).toBeLessThan(BANK_CARD_LIFE);
    expect(bankCardFade(far).alpha).toBeGreaterThan(0.9);
    expect(bankCardFade(far + 0.7).alpha).toBe(0);
    expect(bankCardAge(4, BANK_CARD_RANGE + 5)).toBe(4);
  });
});
