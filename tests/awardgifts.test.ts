import { describe, expect, it } from 'vitest';
import { AWARDS, awardGift, giftText } from '../src/sim/achievements';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { ITEMS, invCount, type ItemId } from '../src/sim/tiles';

describe('award gifts', () => {
  it('every award pays a small positive gift of real items', () => {
    for (const d of AWARDS) {
      const g = awardGift(d);
      const keys = Object.keys(g) as ItemId[];
      expect(keys.length).toBeGreaterThan(0);
      for (const k of keys) {
        expect(ITEMS[k]).toBeDefined();
        expect(g[k]).toBeGreaterThan(0);
        expect(g[k]).toBeLessThanOrEqual(50);
      }
    }
  });

  it('higher tiers pay more and silver/gold add gold circuits', () => {
    const dig1 = AWARDS.find((d) => d.id === 'dig1')!;
    const dig2 = AWARDS.find((d) => d.id === 'dig2')!;
    const dig3 = AWARDS.find((d) => d.id === 'dig3')!;
    expect(awardGift(dig1)).toEqual({ torch: 6 });
    expect(awardGift(dig2).torch).toBeGreaterThan(6);
    expect(awardGift(dig2).circuit).toBe(1);
    expect(awardGift(dig3).circuit).toBe(3);
    expect(awardGift(AWARDS.find((d) => d.id === 'kill1')!)).toEqual({ medkit: 1 });
  });

  it('reads as one short line', () => {
    expect(giftText({ torch: 6, circuit: 1 })).toBe('6 Torch, 1 Gold circuit');
    expect(giftText({})).toBe('');
  });

  it('an unlock puts the gift in the stash once and announces it', () => {
    const g = new Game(defaultSave(7));
    const before = invCount(g.stash, 'torch');
    (g.awards.n as Record<string, number>).dashes = 49;
    const emit = (e: unknown) => (g as unknown as { emit: (e: unknown) => void }).emit(e);
    emit({ t: 'dash' });
    const ev = g.drainEvents().filter((e) => e.t === 'award');
    expect(ev[0]).toMatchObject({ id: 'dash1', gift: { torch: 6 } });
    expect(invCount(g.stash, 'torch')).toBe(before + 6);
    emit({ t: 'dash' });
    expect(invCount(g.stash, 'torch')).toBe(before + 6);
  });

  it('awards earned before gifts existed load quietly with no gift', () => {
    const s = defaultSave(7);
    s.awards = { n: { mined: 150 }, done: [] };
    const g0 = new Game(defaultSave(7));
    const g = new Game(s);
    expect(g.awards.done).toContain('dig1');
    expect(invCount(g.stash, 'torch')).toBe(invCount(g0.stash, 'torch'));
  });
});
