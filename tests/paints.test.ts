import { describe, expect, it } from 'vitest';
import { AWARDS, newAwards } from '../src/sim/achievements';
import { Game } from '../src/sim/game';
import { PAINTS, PAINT_IDS, activePaint, nextPaint, sanitizePaint, unlockedPaints } from '../src/sim/paints';
import { VEHICLE_REMAP, vehicleRemap } from '../src/render/sprites';
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
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(25);
    const v24 = { ...defaultSave(), v: 24, awards: { n: { upgrades: 25 }, done: ['up2'] } } as Record<string, unknown>;
    delete v24.paint;
    const s = parseSave(JSON.stringify(v24));
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.paint).toBeNull();
    const g = new Game(s);
    expect(g.paint).toBeNull();
    expect(g.cyclePaint()?.id).toBe('gilded');
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.paint).toBe('gilded');
    expect(new Game(back).paint?.name).toBe('Gilded');
    expect(parseSave(JSON.stringify({ ...back, paint: 'nope' })).paint).toBeNull();
  });

  it('a v25 save loads with default helmet and vehicle paints; each slot cycles and saves on its own', () => {
    expect(SAVE_VERSION).toBe(28);
    const v25 = { ...defaultSave(), v: 25, paint: 'gilded', awards: { n: { upgrades: 25 }, done: ['up2', 'win'] } } as Record<string, unknown>;
    delete v25.paintHelm;
    delete v25.paintRide;
    const s = parseSave(JSON.stringify(v25));
    expect(s.v).toBe(28);
    expect([s.paint, s.paintHelm, s.paintRide]).toEqual(['gilded', null, null]);
    const g = new Game(s);
    expect(g.paintIn('helm')).toBeNull();
    expect(g.cyclePaint('helm')?.id).toBe('gilded');
    expect(g.cyclePaint('helm')?.id).toBe('hollow');
    expect(g.cyclePaint('ride')?.id).toBe('gilded');
    // Slots are independent: the suit kept its paint.
    expect(g.paint?.id).toBe('gilded');
    const back = parseSave(serializeSave(g.toSave()));
    expect([back.paint, back.paintHelm, back.paintRide]).toEqual(['gilded', 'hollow', 'gilded']);
    expect(new Game(back).ridePaint?.name).toBe('Gilded');
    // Unknown or no-longer-earned ids fall back to the default look.
    expect(parseSave(JSON.stringify({ ...back, paintRide: 'nope', paintHelm: 3 })).paintRide).toBeNull();
    const lost = new Game(parseSave(JSON.stringify({ ...back, awards: { n: {}, done: [] } })));
    expect(lost.helmPaint).toBeNull();
    expect(lost.cyclePaint('ride')).toBeNull();
  });

  it('vehicle paint recolours each hull without touching wheels or glass', () => {
    const p: [string, string] = ['#123456', '#654321'];
    expect(vehicleRemap('buggy')).toEqual(VEHICLE_REMAP.buggy);
    const b = vehicleRemap('buggy', p);
    expect([b?.a, b?.A, b?.n]).toEqual(['#123456', '#654321', VEHICLE_REMAP.buggy?.n]);
    const h = vehicleRemap('hoverbike', p);
    expect([h?.s, h?.S]).toEqual(p);
    expect(vehicleRemap('sky_jet', p)?.a).toBe('#123456');
    expect(vehicleRemap('drill_tank', p)?.L).toBe(VEHICLE_REMAP.drill_tank?.L);
  });
});
