import { describe, expect, it } from 'vitest';
import { clock, diveTitle, foldDive, newDive, reportRows } from '../src/sim/divereport';
import { Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';

describe('dive report', () => {
  it('folds the events that matter and ignores the rest', () => {
    const r = newDive();
    foldDive(r, { t: 'break' } as never);
    foldDive(r, { t: 'break' } as never);
    foldDive(r, { t: 'enemykill' } as never);
    foldDive(r, { t: 'bank', total: 12 } as never);
    foldDive(r, { t: 'bank', total: -3 } as never);
    foldDive(r, { t: 'bossdown', id: 'colossus', first: true } as never);
    foldDive(r, { t: 'dash' } as never);
    expect(r).toMatchObject({ mined: 2, kills: 1, banked: 12, bosses: 1, chests: 0 });
  });

  it('rows always show depth and time and leave out zero tallies', () => {
    const r = newDive();
    expect(reportRows(r).map((x) => x[0])).toEqual(['Deepest', 'Time']);
    r.mined = 40;
    r.lost = 5;
    r.depth = 42.7;
    const rows = reportRows(r);
    expect(rows).toContainEqual(['Deepest', '42 m']);
    expect(rows).toContainEqual(['Blocks mined', '40']);
    expect(rows[rows.length - 1]).toEqual(['Items lost', '5']);
    expect(rows.length).toBeLessThanOrEqual(10);
  });

  it('titles a dive by the deepest layer reached, a boss beats all', () => {
    const r = newDive();
    expect(diveTitle(r)).toBe('Surface scout');
    r.depth = 100;
    expect(diveTitle(r)).toBe('Circuit delver');
    r.depth = 290;
    expect(diveTitle(r)).toBe('Core diver');
    r.bosses = 1;
    expect(diveTitle(r)).toBe('Boss breaker');
  });

  it('clock formats minutes and hours', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(65.9)).toBe('1:05');
    expect(clock(3725)).toBe('1:02:05');
    expect(clock(-4)).toBe('0:00');
  });

  it('dying emits the report with time, depth, losses and a record flag, then the tally resets', () => {
    const g = new Game(defaultSave(7));
    for (let i = 0; i < 30; i++) g.step(1 / 30, NO_CONTROLS);
    (g as unknown as { emit: (e: unknown) => void }).emit({ t: 'enemykill', kind: 'crawler', x: 0, y: 0 });
    g.runDeepest = 33;
    g.carried = { iron_scrap: 10 };
    g.body.y = g.world.padY + 30;
    for (let dy = -2; dy <= 0; dy++) g.world.set(Math.floor(g.body.x), Math.floor(g.body.y) + dy, 0);
    g.hp = 0;
    g.step(1 / 30, NO_CONTROLS);
    const death = g.drainEvents().find((e) => e.t === 'death');
    expect(death).toBeTruthy();
    if (!death || death.t !== 'death') return;
    expect(death.report.time).toBeGreaterThan(0.9);
    expect(death.report.depth).toBeGreaterThanOrEqual(33);
    expect(death.report.kills).toBe(1);
    expect(death.report.lost).toBeGreaterThan(0);
    expect(death.report.best).toBe(true);
    expect(g.dive.kills).toBe(0);
    expect(g.dive.time).toBeLessThan(0.1);
  });
});
