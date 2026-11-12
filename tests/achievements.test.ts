import { describe, expect, it } from 'vitest';
import { AWARDS, AWARD_IDS, awardProgress, checkAwards, countEvent, legacyAwards, newAwards, noteMax, sanitizeAwards } from '../src/sim/achievements';
import { Game } from '../src/sim/game';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';

describe('awards (achievements)', () => {
  it('has 30+ awards with unique ids, positive goals and all three tiers', () => {
    expect(AWARDS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(AWARD_IDS).size).toBe(AWARD_IDS.length);
    for (const d of AWARDS) {
      expect(d.goal).toBeGreaterThan(0);
      expect(d.name.length).toBeGreaterThan(2);
      expect(d.desc.length).toBeGreaterThan(5);
    }
    expect(new Set(AWARDS.map((d) => d.tier))).toEqual(new Set([1, 2, 3]));
  });

  it('every counter an award uses is fed by some event or the depth high-water mark', () => {
    const fed = newAwards();
    const evs = [
      { t: 'break', x: 0, y: 0, tile: 1 }, { t: 'enemykill', x: 0, y: 0, kind: 'crawler' }, { t: 'chest', x: 0, y: 0, items: 1 },
      { t: 'discover', id: 'a', name: 'A' }, { t: 'lore', text: 'x' }, { t: 'bossdown', id: 'colossus', first: true },
      { t: 'victory', first: true }, { t: 'bank', total: 3 }, { t: 'raidclear', n: 1, reward: {}, blueprint: null },
      { t: 'roomready', x: 0, y: 0 }, { t: 'npcarrive', kind: 'trader' }, { t: 'trade', id: 'x' }, { t: 'research', id: 'x' },
      { t: 'modbuy', id: 'x' }, { t: 'craft', id: 'x' }, { t: 'upgrade', id: 'x' }, { t: 'smelt', made: 2 },
      { t: 'plant', crop: 'glowcorn', secs: 1, wet: false }, { t: 'harvest', crop: 'glowcorn', n: 2, x: 0, y: 0 },
      { t: 'eat', item: 'fish' }, { t: 'catch', item: 'fish', n: 1 }, { t: 'fell', x: 0, y: 0, tiles: 3 }, { t: 'mount' },
      { t: 'hook', x: 0, y: 0 }, { t: 'dash' }, { t: 'weather', kind: 'meteors' }, { t: 'record', beat: 'deep', value: 1, code: 'X' },
      { t: 'death', lost: 0, medic: false },
    ];
    // Event literals are checked against GameEvent in game code; here only the switch matters.
    for (const e of evs) countEvent(fed, e as never);
    noteMax(fed, 'depth', 12.7);
    for (const d of AWARDS) expect(fed.n[d.stat] ?? 0, d.stat).toBeGreaterThan(0);
  });

  it('distinct counters count each robot and boss kind once; the merchant is not a resident', () => {
    const aw = newAwards();
    for (let i = 0; i < 3; i++) countEvent(aw, { t: 'npcarrive', kind: 'trader' });
    countEvent(aw, { t: 'npcarrive', kind: 'medic' });
    countEvent(aw, { t: 'npcarrive', kind: 'merchant' });
    countEvent(aw, { t: 'bossdown', id: 'golem', first: true });
    countEvent(aw, { t: 'bossdown', id: 'golem', first: false });
    expect(aw.n.robots).toBe(2);
    expect(aw.n.bossKinds).toBe(1);
    expect(aw.n.bosses).toBe(2);
  });

  it('checkAwards unlocks once at the goal, in list order', () => {
    const aw = newAwards();
    for (let i = 0; i < 99; i++) countEvent(aw, { t: 'break', x: 0, y: 0, tile: 1 });
    expect(checkAwards(aw)).toEqual([]);
    countEvent(aw, { t: 'break', x: 0, y: 0, tile: 1 });
    expect(checkAwards(aw).map((d) => d.id)).toEqual(['dig1']);
    expect(checkAwards(aw)).toEqual([]);
    const dig2 = AWARDS.find((d) => d.id === 'dig2');
    expect(dig2 && awardProgress(aw, dig2)).toBe(100);
    noteMax(aw, 'depth', 400);
    expect(checkAwards(aw).map((d) => d.id)).toEqual(['deep1', 'deep2', 'deep3']);
    expect(noteMax(aw, 'depth', 10)).toBe(false);
  });

  it('sanitizeAwards never throws and drops junk', () => {
    for (const bad of [null, 5, 'x', [], { n: 'x', done: 'y' }, { n: { a: -1, b: NaN, c: 'q', ok: 3.7 }, done: ['dig1', 'dig1', 'nope', 7] }]) {
      expect(() => sanitizeAwards(bad)).not.toThrow();
    }
    const s = sanitizeAwards({ n: { a: -1, b: Number.POSITIVE_INFINITY, ok: 3.7 }, done: ['dig1', 'dig1', 'nope', 7] });
    expect(s.n).toEqual({ ok: 3 });
    expect(s.done).toEqual(['dig1']);
  });

  it('a v22 save is seeded from its stats, bosses, codex and research (migration fixture)', () => {
    const v22 = { ...defaultSave(), v: 22, stats: { deepest: 160, deaths: 2, playTime: 9, banked: 150, raids: 1 }, bosses: ['colossus', 'hollow_ai'], codex: ['b0', 'b1', 'b2', 'b3', 'b4'], research: ['r1'] } as Record<string, unknown>;
    delete v22.awards;
    const s = parseSave(JSON.stringify(v22));
    expect(s.v).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(23);
    expect(s.awards.n.depth).toBe(160);
    expect(s.awards.n.bossKinds).toBe(2);
    expect(s.awards.n.victory).toBe(1);
    expect(s.awards.n.discoveries).toBe(5);
    expect(legacyAwards({}).n).toEqual({});
    // Earned on load quietly: the game unlocks them without announcing each one.
    const g = new Game(s);
    expect(g.awards.done).toEqual(expect.arrayContaining(['deep1', 'deep2', 'bank1', 'boss1', 'win', 'raid1', 'disc1', 'sci1', 'death1']));
    expect(g.drainEvents().some((e) => e.t === 'award')).toBe(false);
  });

  it('awards survive a save round trip', () => {
    const s = defaultSave();
    s.awards = { n: { mined: 120 }, done: ['dig1'] };
    const back = parseSave(serializeSave(s));
    expect(back.awards).toEqual({ n: { mined: 120 }, done: ['dig1'] });
  });

  it('the game counts its own events and announces an unlock once', () => {
    const g = new Game(defaultSave(7));
    (g.awards.n as Record<string, number>).dashes = 49;
    (g as unknown as { emit: (e: unknown) => void }).emit({ t: 'dash' });
    const ev = g.drainEvents().filter((e) => e.t === 'award');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ id: 'dash1', name: 'Blink', tier: 1 });
    (g as unknown as { emit: (e: unknown) => void }).emit({ t: 'dash' });
    expect(g.drainEvents().some((e) => e.t === 'award')).toBe(false);
  });
});
