import { describe, expect, it } from 'vitest';
import { AWARDS, newAwards } from '../src/sim/achievements';
import { Game } from '../src/sim/game';
import { PAINTS, PAINT_IDS, activePaint, nextPaint, sanitizePaint, unlockedPaints } from '../src/sim/paints';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';

const withDone = (...ids: string[]) => ({ ...newAwards(), done: ids });

describe('suit paints', () => {
  it('every gold award unlocks exactly one paint, and every paint names a gold award', () => {
    const gold = AWARDS.filter((a) => a.tier === 3).map((a) => a.id).sort();
    expect(PAINTS.map((p) => p.award).sort()).toEqual(gold);
    expect(new Set(PAINT_IDS).size).toBe(PAINTS.length);
    for (const p of PAINTS) {
      expect(p.c1).toMatch(/^#[0-9a-f]{6}$/);
      expect(p.c2).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('only earned paints can be worn; the cycle is default -> earned paints -> default', () => {
    const none = newAwards();
    expect(unlockedPaints(none)).toEqual([]);
    expect(nextPaint(none, null)).toBeNull();
    expect(activePaint(none, 'gilded')).toBeNull();
    const aw = withDone('up2', 'win', 'dig1');
    expect(unlockedPaints(aw).map((p) => p.id)).toEqual(['gilded', 'hollow']);
    expect(nextPaint(aw, null)).toBe('gilded');
    expect(nextPaint(aw, 'gilded')).toBe('hollow');
    expect(nextPaint(aw, 'hollow')).toBeNull();
    // A saved paint that is no longer earned (or unknown) restarts the cycle.
    expect(nextPaint(aw, 'magma')).toBe('gilded');
    expect(activePaint(aw, 'hollow')?.name).toBe('Hollow');
    expect(activePaint(aw, 'magma')).toBeNull();
  });

  it('sanitises saved paints', () => {
    expect(sanitizePaint('magma')).toBe('magma');
    expect(sanitizePaint('rainbow')).toBeNull();
    expect(sanitizePaint(7)).toBeNull();
    expect(sanitizePaint(undefined)).toBeNull();
  });

  it('a v24 save loads with the default look (migration fixture) and a chosen paint round-trips', () => {
    expect(SAVE_VERSION).toBe(25);
    const v24 = { ...defaultSave(), v: 24, awards: { n: { upgrades: 25 }, done: ['up2'] } } as Record<string, unknown>;
    delete v24.paint;
    const s = parseSave(JSON.stringify(v24));
    expect(s.v).toBe(25);
    expect(s.paint).toBeNull();
    const g = new Game(s);
    expect(g.paint).toBeNull();
    expect(g.cyclePaint()?.id).toBe('gilded');
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.paint).toBe('gilded');
    expect(new Game(back).paint?.name).toBe('Gilded');
    expect(parseSave(JSON.stringify({ ...back, paint: 'nope' })).paint).toBeNull();
  });
});
