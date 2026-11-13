import { describe, expect, it } from 'vitest';
import { LORE, loreAt, loreIndexAt } from '../src/sim/explore';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { loreKey } from '../src/sim/codex';

const frame = { padY: 40, h: 400 };

describe('lore logs in story order by depth', () => {
  it('shallow terminals hold early logs and the deepest hold the last ones', () => {
    for (let x = 0; x < 40; x++) {
      expect(loreIndexAt(7, x, 80, frame)).toBeLessThanOrEqual(1);
      expect(loreIndexAt(7, x, 395, frame)).toBeGreaterThanOrEqual(LORE.length - 2);
    }
  });

  it('the average log index rises with depth', () => {
    const avg = (y: number): number => {
      let s = 0;
      for (let x = 0; x < 60; x++) s += loreIndexAt(3, x, y, frame);
      return s / 60;
    };
    let prev = -1;
    for (let y = 80; y <= 380; y += 60) {
      const a = avg(y);
      expect(a).toBeGreaterThan(prev);
      prev = a;
    }
  });

  it('a read log gives way to the nearest unread one, earlier first', () => {
    const base = loreIndexAt(5, 11, 250, frame);
    const read = new Set([base]);
    const next = loreIndexAt(5, 11, 250, frame, (i) => read.has(i));
    expect(read.has(next)).toBe(false);
    expect(Math.abs(next - base)).toBe(1);
    if (base > 0) expect(next).toBe(base - 1);
    const all = (): boolean => true;
    expect(loreIndexAt(5, 11, 250, frame, all)).toBe(base);
  });

  it('every log can be reached by reading terminals in a row', () => {
    const read = new Set<number>();
    for (let k = 0; k < LORE.length; k++) read.add(loreIndexAt(9, 30, 200, frame, (i) => read.has(i)));
    expect(read.size).toBe(LORE.length);
  });

  it('stays stable without a frame (old call shape)', () => {
    expect(LORE).toContain(loreAt(3, 100, 200));
    expect(loreAt(3, 100, 200)).toBe(loreAt(3, 100, 200));
  });

  it('the game hands out the one unread log once all the others are read', () => {
    const save = defaultSave();
    const g0 = new Game(save);
    const n: Record<string, number> = { ...g0.awards.n };
    for (let i = 0; i < LORE.length - 1; i++) n[loreKey(i)] = 1;
    const g = new Game({ ...save, awards: { ...g0.awards, n } });
    const isRead = (i: number): boolean => (g.awards.n[loreKey(i)] ?? 0) > 0;
    expect(loreAt(g.world.seed, 10, g.world.padY + 50, { padY: g.world.padY, h: g.world.h }, isRead)).toBe(LORE[LORE.length - 1]);
  });
});
