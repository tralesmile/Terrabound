import { describe, expect, it } from 'vitest';
import { AWARDS, newAwards } from '../src/sim/achievements';
import { FTUE_STEPS, GOAL_STEPS, MID_STEPS, chainGoal, chainIndex, currentGoal, goalIndex } from '../src/sim/ftue';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';

const emit = (g: Game, e: unknown): void => (g as unknown as { emit: (e: unknown) => void }).emit(e);

describe('guided goals (FTUE)', () => {
  it('has 5-8 steps with unique ids, a positive goal and a touch text', () => {
    expect(FTUE_STEPS.length).toBeGreaterThanOrEqual(5);
    expect(FTUE_STEPS.length).toBeLessThanOrEqual(8);
    expect(new Set(FTUE_STEPS.map((s) => s.id)).size).toBe(FTUE_STEPS.length);
    for (const s of FTUE_STEPS) {
      expect(s.goal).toBeGreaterThan(0);
      expect(s.touch.length).toBeGreaterThan(5);
      expect(s.touch).not.toContain('{');
      // Every counter a goal reads is also used by awards, so countEvent feeds it.
      expect(AWARDS.some((a) => a.stat === s.stat)).toBe(true);
    }
  });

  it('a fresh save starts at step 1; finished steps are skipped in order', () => {
    const aw = newAwards();
    expect(goalIndex(aw)).toBe(0);
    expect(currentGoal(aw)).toMatchObject({ index: 0, have: 0 });
    aw.n.mined = 3;
    expect(currentGoal(aw)?.have).toBe(3);
    aw.n.mined = 8;
    aw.n.banked = 50; // step 3 done early
    expect(FTUE_STEPS[goalIndex(aw)]?.id).toBe('deep');
    aw.n.depth = 20;
    expect(FTUE_STEPS[goalIndex(aw)]?.id).toBe('upgrade');
    for (const s of FTUE_STEPS) aw.n[s.stat] = s.goal;
    expect(goalIndex(aw)).toBe(FTUE_STEPS.length);
    expect(currentGoal(aw)).toBeNull();
  });

  it('the game announces a finished goal once, and a veteran save shows no goal', () => {
    const g = new Game(defaultSave(3));
    expect(g.goal?.step.id).toBe('dig');
    for (let i = 0; i < 8; i++) emit(g, { t: 'break', x: 0, y: 0, tile: 1 });
    const goals = g.drainEvents().filter((e) => e.t === 'goal');
    expect(goals).toEqual([{ t: 'goal', id: 'dig', next: 1 }]);
    expect(g.goal?.step.id).toBe('deep');
    const vet = defaultSave(4);
    for (const s of FTUE_STEPS) vet.awards.n[s.stat] = s.goal;
    const v = new Game(vet);
    expect(v.goal?.step.id).toBe('circuit');
    emit(v, { t: 'break', x: 0, y: 0, tile: 1 });
    expect(v.drainEvents().some((e) => e.t === 'goal')).toBe(false);
    const done = defaultSave(5);
    for (const s of FTUE_STEPS) done.awards.n[s.stat] = s.goal;
    for (const s of MID_STEPS) done.awards.n[s.stat] = Math.max(done.awards.n[s.stat] ?? 0, s.goal);
    done.bosses = MID_STEPS.flatMap((s) => (s.boss ? [s.boss] : []));
    expect(new Game(done).goal).toBeNull();
  });

  it('the what-next chain follows layers and bosses and skips what is already done', () => {
    expect(new Set(GOAL_STEPS.map((s) => s.id)).size).toBe(GOAL_STEPS.length);
    const sv = defaultSave(6);
    for (const s of FTUE_STEPS) sv.awards.n[s.stat] = s.goal;
    expect(chainGoal(sv.awards, [])?.step.id).toBe('circuit');
    sv.awards.n.depth = 100;
    expect(chainGoal(sv.awards, [])?.step.id).toBe('colossus');
    // Boss steps are judged by the defeated list, not by the counter.
    expect(chainGoal(sv.awards, ['colossus'])?.step.id).toBe('warden');
    sv.awards.n.bossKinds = 2;
    expect(chainGoal(sv.awards, ['colossus', 'warden'])).toMatchObject({ step: { id: 'trio' }, have: 2 });
    expect(chainIndex(sv.awards, [])).toBeLessThan(chainIndex(sv.awards, ['colossus']));
  });
});
