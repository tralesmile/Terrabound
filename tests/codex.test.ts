import { describe, expect, it } from 'vitest';
import { newAwards } from '../src/sim/achievements';
import { BOSS_IDS } from '../src/sim/bosses';
import { CREW_KINDS, ENEMY_KINDS, codexCounts, codexRows, crewKey, killKey, logParts, loreKey, noteCodexEvent, readLogs, stepLog } from '../src/sim/codex';
import { countEvent } from '../src/sim/achievements';
import { CODEX, LORE } from '../src/sim/explore';
import { Game } from '../src/sim/game';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';

const blank = () => ({ codex: [] as string[], bosses: [] as string[], awards: newAwards() });

describe('codex screen data', () => {
  it('lists every place, creature, boss and log once, all unknown on a fresh save', () => {
    const rows = codexRows(blank());
    expect(rows).toHaveLength(CODEX.length + CREW_KINDS.length + ENEMY_KINDS.length + BOSS_IDS.length + LORE.length);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(codexCounts(rows)).toEqual({ found: 0, total: rows.length });
    for (const r of rows) {
      expect(r.detail.length).toBeGreaterThan(10);
      // Unknown places and creatures never leak their names.
      if (r.section !== 'logs') expect(r.title.startsWith('???')).toBe(true);
    }
  });

  it('kills and logs read are folded into award counters; logs dedupe, kills count', () => {
    const aw = newAwards();
    noteCodexEvent(aw, { t: 'enemykill', x: 0, y: 0, kind: 'mite' });
    noteCodexEvent(aw, { t: 'enemykill', x: 0, y: 0, kind: 'mite' });
    noteCodexEvent(aw, { t: 'lore', text: LORE[3] });
    noteCodexEvent(aw, { t: 'lore', text: LORE[3] });
    noteCodexEvent(aw, { t: 'lore', text: 'not a real log' });
    expect(aw.n[killKey('mite')]).toBe(2);
    expect(aw.n[loreKey(3)]).toBe(1);
    expect(Object.keys(aw.n)).toHaveLength(2);
    const rows = codexRows({ ...blank(), awards: aw });
    const mite = rows.find((r) => r.id === 'enemy:mite');
    expect(mite?.found).toBe(true);
    expect(mite?.title).toContain('x2');
    const log = rows.find((r) => r.id === 'lore:3');
    expect(log?.found).toBe(true);
    expect(LORE[3]).toContain(log?.detail ?? '-');
    expect(rows.find((r) => r.id === 'lore:4')?.title).toContain('missing');
  });

  it('places come from save.codex and bosses from save.bosses', () => {
    const rows = codexRows({ ...blank(), codex: [CODEX[0].id], bosses: ['golem'] });
    const place = rows.find((r) => r.id === CODEX[0].id);
    expect(place).toMatchObject({ found: true, title: CODEX[0].name });
    expect(place?.detail).toContain('Paid');
    expect(rows.find((r) => r.id === 'boss:golem')).toMatchObject({ found: true, title: 'Crystal Golem (boss)' });
    expect(codexCounts(rows).found).toBe(2);
  });

  it('the game notes kills and logs from its own events, and they survive a save round trip', () => {
    const g = new Game(defaultSave(7));
    const emit = (e: unknown) => (g as unknown as { emit: (e: unknown) => void }).emit(e);
    emit({ t: 'enemykill', x: 0, y: 0, kind: 'crawler' });
    emit({ t: 'lore', text: LORE[0] });
    expect(g.codexRows.find((r) => r.id === 'enemy:crawler')?.found).toBe(true);
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.awards.n[killKey('crawler')]).toBe(1);
    expect(back.awards.n[loreKey(0)]).toBe(1);
    // The plain kill counter still counts too (awards unchanged).
    expect(back.awards.n.kills).toBe(1);
  });

  it('crew: robots met through the robots award, the merchant once seen; unknown ones keep their names hidden', () => {
    const aw = newAwards();
    countEvent(aw, { t: 'npcarrive', kind: 'trader' });
    noteCodexEvent(aw, { t: 'merchant', here: false });
    let rows = codexRows({ ...blank(), awards: aw });
    expect(rows.find((r) => r.id === 'crew:trader')).toMatchObject({ found: true, title: 'Bolt the Trader' });
    expect(rows.find((r) => r.id === 'crew:merchant')?.found).toBe(false);
    expect(rows.find((r) => r.id === 'crew:medic')?.title).not.toContain('Patch');
    noteCodexEvent(aw, { t: 'merchant', here: true });
    expect(aw.n[crewKey('merchant')]).toBe(1);
    rows = codexRows({ ...blank(), awards: aw });
    expect(rows.find((r) => r.id === 'crew:merchant')?.title).toContain('Dex');
  });

  it('crew present right now count as met (older saves without the seen flag) and robots say they live here', () => {
    const rows = codexRows({ ...blank(), present: ['medic', 'merchant'] });
    expect(rows.find((r) => r.id === 'crew:medic')).toMatchObject({ found: true, title: 'Patch the Medic  (home)' });
    expect(rows.find((r) => r.id === 'crew:merchant')?.title).toBe('Dex the Merchant drone');
    expect(rows.filter((r) => r.section === 'crew')).toHaveLength(5);
  });

  it('the log reader pages read logs in story order and stops at both ends', () => {
    const aw = newAwards();
    for (const i of [7, 2, 10]) noteCodexEvent(aw, { t: 'lore', text: LORE[i] });
    expect(readLogs(aw)).toEqual([2, 7, 10]);
    expect(stepLog(aw, 2, 1)).toBe(7);
    expect(stepLog(aw, 7, 1)).toBe(10);
    expect(stepLog(aw, 10, 1)).toBeNull();
    expect(stepLog(aw, 7, -1)).toBe(2);
    expect(stepLog(aw, 2, -1)).toBeNull();
    expect(readLogs(newAwards())).toEqual([]);
    expect(logParts(0)).toEqual({ head: 'LOG 01', body: LORE[0].slice(8) });
    expect(logParts(999)).toEqual({ head: '', body: '' });
  });
});
