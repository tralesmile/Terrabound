import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { RECORDS_MAX, clock, newRecord, noteBoss, noteDepth, noteLoot, recordLine, sanitizeRecords, startAttempt, type WorldRecord } from '../src/sim/records';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { dailyCode } from '../src/sim/daily';
import { encodeSeed } from '../src/sim/seedcode';

const code = (n: number): string => encodeSeed(1000 + n * 7919);

describe('world records (pure)', () => {
  it('startAttempt moves the code to the front, counts tries, resets the live attempt and trims', () => {
    const list: WorldRecord[] = [];
    for (let i = 0; i < RECORDS_MAX + 3; i++) startAttempt(list, code(i));
    expect(list.length).toBe(RECORDS_MAX);
    expect(list[0].code).toBe(code(RECORDS_MAX + 2));
    const r = startAttempt(list, code(RECORDS_MAX));
    r.curLoot = 9;
    r.curTime = 50;
    const again = startAttempt(list, code(RECORDS_MAX));
    expect(again).toBe(r);
    expect(list[0]).toBe(r);
    expect(r.runs).toBe(3); // once in the loop, twice here
    expect(r.curLoot).toBe(0);
    expect(r.curTime).toBe(0);
  });

  it('depth: first best is silent, passing it later cheers once', () => {
    const r = newRecord(code(1));
    expect(noteDepth(r, 40.7)).toBeNull();
    expect(r.deepest).toBe(40);
    expect(noteDepth(r, 30)).toBeNull();
    expect(noteDepth(r, 41.2)).toBe('deep');
    expect(r.deepest).toBe(41);
  });

  it('loot: best single attempt; the cheer comes once when the live attempt passes it', () => {
    const r = newRecord(code(2));
    expect(noteLoot(r, 20)).toBeNull();
    expect(r.loot).toBe(20);
    r.curLoot = 0; // new attempt
    expect(noteLoot(r, 15)).toBeNull();
    expect(noteLoot(r, 10)).toBe('loot');
    expect(r.loot).toBe(25);
    expect(noteLoot(r, 5)).toBeNull(); // already past it this attempt
    expect(r.loot).toBe(30);
    expect(noteLoot(r, 0)).toBeNull();
  });

  it('boss: fastest kill wins; slower kills change nothing', () => {
    const r = newRecord(code(3));
    r.curTime = 200;
    expect(noteBoss(r)).toBeNull();
    expect(r.boss).toBe(200);
    r.curTime = 250;
    expect(noteBoss(r)).toBeNull();
    expect(r.boss).toBe(200);
    r.curTime = 150.4;
    expect(noteBoss(r)).toBe('boss');
    expect(r.boss).toBe(150);
    expect(clock(150)).toBe('2:30');
    expect(recordLine(r)).toContain('boss in 2:30');
  });

  it('sanitizeRecords never throws and drops junk, bad codes and duplicates', () => {
    expect(sanitizeRecords(null)).toEqual([]);
    expect(sanitizeRecords({})).toEqual([]);
    const good = { ...newRecord(code(4)), deepest: 99.9, loot: -3, curTime: Infinity };
    const out = sanitizeRecords([good, good, { code: '!!!' }, 5, null, { code: code(5), deepest: 'x' }]);
    expect(out.map((r) => r.code)).toEqual([code(4), code(5)]);
    expect(out[0].deepest).toBe(99);
    expect(out[0].loot).toBe(0);
    expect(out[0].curTime).toBe(0);
    expect(sanitizeRecords(Array.from({ length: 30 }, (_, i) => newRecord(code(i)))).length).toBe(RECORDS_MAX);
  });
});

describe('world records in the game', () => {
  it('a Daily Dive starts an attempt; random worlds have no record', () => {
    const g = new Game(defaultSave(3));
    expect(g.worldRecord()).toBeNull();
    const today = dailyCode(Date.UTC(2026, 10, 12));
    expect(g.newDive(today)).toBe(true);
    const r = g.worldRecord();
    expect(r?.code).toBe(today);
    expect(r?.runs).toBe(1);
    for (let i = 0; i < 30; i++) g.step(FIXED_DT, NO_CONTROLS);
    expect(r!.curTime).toBeCloseTo(30 * FIXED_DT, 5);
    expect(g.newDive()).toBe(true); // random world again
    expect(g.worldRecord()).toBeNull();
  });

  it('banking on a shared world adds to the attempt and cheers when passing the best', () => {
    const g = new Game(defaultSave(3));
    const c = code(8);
    g.newDive(c);
    g.carried.rust = 5;
    g.bank();
    g.drainEvents();
    expect(g.worldRecord()?.loot).toBe(5);
    g.newDive(c); // second try
    g.carried.rust = 6;
    g.bank();
    const ev = g.drainEvents().filter((e) => e.t === 'record');
    expect(ev).toEqual([{ t: 'record', beat: 'loot', value: 6, code: c }]);
    expect(g.worldRecord()?.runs).toBe(2);
  });

  it('records round-trip through a save; a v17 save loads with none', () => {
    const g = new Game(defaultSave(3));
    g.newDive(code(9));
    g.carried.rust = 4;
    g.bank();
    const r = new Game(parseSave(serializeSave(g.toSave())));
    expect(r.worldRecord()?.loot).toBe(4);
    expect(r.worldRecord()?.code).toBe(code(9));
    const old = { ...defaultSave(), v: 17 } as Record<string, unknown>;
    delete old.records;
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(18);
    expect(parseSave(JSON.stringify(old)).records).toEqual([]);
  });
});
