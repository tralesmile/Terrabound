import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type GameEvent } from '../src/sim/game';
import { ENEMIES, HOP_PERIOD, HOP_WINDUP, hopWindup, makeEnemy, stepEnemy, type EnemyKind } from '../src/sim/enemies';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { TEACH, TEACH_RANGE, firstMeet, sanitizeMet, shouldTeach } from '../src/sim/teach';
import { crouchSquash } from '../src/render/fx';
import { generateWorld } from '../src/sim/world';

const run = (g: Game, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) g.step(FIXED_DT, NO_CONTROLS);
};

const deepGame = (met: EnemyKind[] = []) => {
  const s = defaultSave();
  s.met = met;
  const g = new Game(s);
  g.body.y = g.world.padY + 10;
  return g;
};

const KINDS = Object.keys(ENEMIES) as EnemyKind[];

describe('enemy pattern teaching', () => {
  it('every enemy kind has a short lesson line', () => {
    for (const k of KINDS) {
      expect(TEACH[k].length).toBeGreaterThan(10);
      expect(TEACH[k].length).toBeLessThanOrEqual(80);
    }
  });

  it('sanitizeMet drops junk and duplicates and never throws', () => {
    expect(sanitizeMet(['mite', 'mite', 'nope', 3, null, 'hulk'])).toEqual(['mite', 'hulk']);
    expect(sanitizeMet('mite')).toEqual([]);
    expect(sanitizeMet(undefined)).toEqual([]);
    expect(shouldTeach(['mite'], 'mite')).toBe(false);
    expect(shouldTeach(['mite'], 'crawler')).toBe(true);
  });

  it('firstMeet picks the nearest unmet teacher in range and ignores raiders and met kinds', () => {
    const a = { ...makeEnemy(1, 'crawler', 5, 0), teach: true };
    const b = { ...makeEnemy(2, 'mite', 3, 0), teach: true };
    const far = { ...makeEnemy(3, 'hulk', TEACH_RANGE + 1, 0), teach: true };
    const raid = { ...makeEnemy(4, 'vine', 1, 0), teach: true, raid: true };
    expect(firstMeet([], [a, b, far, raid], 0, 0)?.id).toBe(2);
    expect(firstMeet(['mite'], [a, b, far], 0, 0)?.id).toBe(1);
    expect(firstMeet([], [far, raid], 0, 0)).toBeNull();
    expect(firstMeet([], [makeEnemy(5, 'crawler', 1, 0)], 0, 0)).toBeNull();
  });

  it('a wild spawn of an unmet kind teaches; a second one of the same kind and met kinds do not', () => {
    const g = deepGame();
    let first = null;
    for (let i = 0; i < 400 && !first; i++) first = g.trySpawn();
    expect(first).not.toBeNull();
    expect(first!.teach).toBe(true);
    const kind = first!.kind;
    for (let i = 0; i < 400; i++) {
      const e = g.trySpawn();
      if (e && e.kind === kind) {
        expect(e.teach ?? false).toBe(false);
        break;
      }
      if (e) g.enemies = g.enemies.filter((o) => o.id !== e.id);
    }
    const vet = deepGame([...KINDS]);
    let e = null;
    for (let i = 0; i < 400 && !e; i++) e = vet.trySpawn();
    expect(e).not.toBeNull();
    expect(e!.teach ?? false).toBe(false);
  });

  it("a teacher's first touch shoves without damage, then the next touch hurts", () => {
    const g = deepGame();
    g.drainEvents();
    g.enemies = [{ ...makeEnemy(5, 'crawler', g.body.x, g.body.y), teach: true }];
    const hp = g.hp;
    run(g, 0.1);
    expect(g.hp).toBe(hp);
    expect(g.metKinds).toContain('crawler');
    expect(g.enemies[0].teach).toBe(false);
    const ev = g.drainEvents();
    expect(ev.some((x: GameEvent) => x.t === 'teach' && x.kind === 'crawler')).toBe(true);
    expect(ev.some((x: GameEvent) => x.t === 'teachtouch' && x.kind === 'crawler')).toBe(true);
    // After the i-frames run out, the same enemy hurts for real.
    run(g, 1);
    g.enemies[0].x = g.body.x;
    g.enemies[0].y = g.body.y;
    const hp2 = g.hp;
    run(g, 0.1);
    expect(g.hp).toBeLessThan(hp2);
  });

  it('first sight names the pattern once per kind, and the met list survives a save', () => {
    const g = deepGame();
    g.drainEvents();
    g.enemies = [{ ...makeEnemy(9, 'mite', g.body.x + 5, g.body.y - 4), teach: true }];
    run(g, 0.05);
    const n = g.drainEvents().filter((x) => x.t === 'teach').length;
    expect(n).toBe(1);
    run(g, 0.5);
    expect(g.drainEvents().filter((x) => x.t === 'teach').length).toBe(0);
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.met).toContain('mite');
  });

  it('v30 saves migrate to v31 with no kinds met', () => {
    const v30 = { ...JSON.parse(serializeSave(defaultSave())), v: 30 };
    delete v30.met;
    const s = parseSave(JSON.stringify(v30));
    expect(SAVE_VERSION).toBe(31);
    expect(s.v).toBe(31);
    expect(s.met).toEqual([]);
    expect(parseSave(JSON.stringify({ ...v30, met: 'junk' })).met).toEqual([]);
  });
});

describe('hopper crouch telegraph', () => {
  it('only hoppers crouch, and only in the last HOP_WINDUP seconds of each cycle', () => {
    expect(hopWindup('crawler', 1.5, 0)).toBe(0);
    expect(hopWindup('mite', 0.2, 0)).toBe(0);
    expect(hopWindup('mite', HOP_PERIOD - HOP_WINDUP - 0.01, 0)).toBe(0);
    expect(hopWindup('mite', HOP_PERIOD - HOP_WINDUP / 2, 0)).toBeCloseTo(0.5);
    expect(hopWindup('mite', HOP_PERIOD - 0.001, 0)).toBeGreaterThan(0.99);
    expect(HOP_WINDUP).toBeGreaterThanOrEqual(0.4);
  });

  it('the leap fires right as the crouch completes (the telegraph is honest)', () => {
    const w = generateWorld(3);
    const y = Math.floor(w.padY + 14);
    const x0 = Math.floor(w.padX);
    for (let dx = -6; dx <= 6; dx++) {
      for (let dy = 1; dy <= 6; dy++) w.set(x0 + dx, y - dy, 0);
      w.set(x0 + dx, y, 1);
    }
    const e = makeEnemy(1, 'mite', x0 + 0.5, y);
    let peak = 0;
    let leapt = false;
    for (let i = 0; i < 300 && !leapt; i++) {
      const before = hopWindup('mite', e.age, e.phase);
      stepEnemy(w, e, FIXED_DT, x0 + 3, y);
      if (e.vy < -5) {
        leapt = true;
        peak = before;
      }
    }
    expect(leapt).toBe(true);
    expect(peak).toBeGreaterThan(0.9);
  });

  it('crouch squash widens and lowers about the feet, and is null at rest', () => {
    expect(crouchSquash(0)).toBeNull();
    const c = crouchSquash(1)!;
    expect(c.sx).toBeGreaterThan(1);
    expect(c.sy).toBeLessThan(1);
  });
});
