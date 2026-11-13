import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T } from '../src/sim/tiles';
import { isNight } from '../src/sim/daynight';
import { makeEnemy, stepEnemy } from '../src/sim/enemies';
import {
  RAID_MAX, RAID_MIN_VALUE, baseValue, chewTarget, raidPlan, raidReward, raidSize, raidTarget,
} from '../src/sim/raids';
import { defaultSave, parseSave, serializeSave, SAVE_VERSION } from '../src/sim/save';
import { Game, NO_CONTROLS } from '../src/sim/game';

/** Open 120x60 world, pad at (60, 20), flat floor at row 20. */
function flat(): World {
  const w = new World(120, 60, 7);
  Object.assign(w, { padX: 60, padY: 20 });
  for (let y = 20; y < 60; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
  return w;
}

describe('raid rules (pure)', () => {
  it('base value counts machines double and plain blocks a sixth', () => {
    const w = flat();
    expect(baseValue(w)).toBe(0);
    w.set(61, 19, T.SOLAR);
    w.set(62, 19, T.SMELTER);
    expect(baseValue(w)).toBe(4);
    for (let i = 0; i < 6; i++) w.set(55 + i, 18, T.METAL);
    expect(baseValue(w)).toBe(5);
    // Outside the base strip it does not count.
    w.set(80, 19, T.SOLAR);
    expect(baseValue(w)).toBe(5);
  });

  it('wave size starts at the threshold, grows with value and nights, and is capped', () => {
    expect(raidSize(RAID_MIN_VALUE - 1, 0)).toBe(0);
    expect(raidSize(RAID_MIN_VALUE, 0)).toBe(2);
    expect(raidSize(RAID_MIN_VALUE + 6, 0)).toBe(4);
    expect(raidSize(RAID_MIN_VALUE + 6, 4)).toBe(6);
    expect(raidSize(999, 999)).toBe(RAID_MAX);
  });

  it('the plan is seeded, spaced out, and mixes walkers and fliers', () => {
    const a = raidPlan(42, 3, 6);
    expect(a).toEqual(raidPlan(42, 3, 6));
    expect(a.length).toBe(6);
    for (let i = 1; i < a.length; i++) expect(a[i].at).toBeGreaterThan(a[i - 1].at);
    expect(a.some((s) => s.kind === 'flyer' || s.kind === 'ember')).toBe(true);
    expect(a.some((s) => s.kind === 'crawler' || s.kind === 'mite')).toBe(true);
    expect(new Set(a.map((s) => s.side)).size).toBeGreaterThanOrEqual(1);
    expect(raidPlan(42, 4, 6)).not.toEqual(a);
  });

  it('rewards grow with the wave', () => {
    expect(raidReward(4)).toEqual({ metal: 4, copper_wire: 2, crystal: 1 });
    expect((raidReward(8).metal ?? 0)).toBeGreaterThan(raidReward(4).metal ?? 0);
  });

  it('raiders go for a nearby exposed player, else the pad', () => {
    const e = makeEnemy(1, 'crawler', 50.5, 20);
    expect(raidTarget(e, 53, 20, 60, 20, false)).toEqual({ x: 53, y: 20 });
    expect(raidTarget(e, 53, 20, 60, 20, true)).toEqual({ x: 60.5, y: 20 });
    expect(raidTarget(e, 90, 20, 60, 20, false)).toEqual({ x: 60.5, y: 20 });
  });

  it('chews only base blocks it touches, never the pad or outside the strip', () => {
    const w = flat();
    const e = makeEnemy(1, 'crawler', 56.5, 20);
    e.dir = 1;
    expect(chewTarget(w, e)).toBeNull();
    w.set(57, 19, T.METAL);
    expect(chewTarget(w, e)).toEqual({ x: 57, y: 19 });
    const far = makeEnemy(2, 'crawler', 40.5, 20);
    far.dir = 1;
    w.set(41, 19, T.METAL);
    expect(chewTarget(w, far)).toBeNull();
  });

  it('a raider crawler marches on the pad and hops a step instead of turning back', () => {
    const w = flat();
    // A one-tile step at x = 50.
    for (let x = 50; x < 120; x++) w.set(x, 19, T.RUST);
    const e = makeEnemy(1, 'crawler', 40.5, 20);
    e.raid = true;
    for (let i = 0; i < 30 * 12; i++) stepEnemy(w, e, 1 / 30, 60.5, 19);
    expect(e.x).toBeGreaterThan(55);
    // A patrolling crawler auto-steps a one-tile ledge, but turns back at a two-tile wall.
    const p = makeEnemy(2, 'crawler', 40.5, 20);
    p.dir = 1;
    for (let i = 0; i < 30 * 10; i++) stepEnemy(w, p, 1 / 30, 100, 0);
    expect(p.x).toBeGreaterThan(50);
    const w2 = flat();
    for (let x = 50; x < 120; x++) for (let y = 18; y < 20; y++) w2.set(x, y, T.RUST);
    const q = makeEnemy(3, 'crawler', 40.5, 20);
    q.dir = 1;
    for (let i = 0; i < 30 * 12; i++) stepEnemy(w2, q, 1 / 30, 100, 0);
    expect(q.x).toBeLessThan(50);
  });
});

/** Game at the pad with a raid-worthy base, clock just before nightfall. */
function raidGame(raids = true): Game {
  const s = defaultSave();
  s.settings.raids = raids;
  const g = new Game(s);
  const w = g.world;
  w.set(w.padX + 3, w.padY - 1, T.SOLAR);
  w.set(w.padX + 4, w.padY - 1, T.SMELTER);
  let t = g.time;
  while (!isNight(t)) t += 1;
  g.time = t - 0.5;
  g.body.x = w.padX + 0.5;
  g.body.y = w.padY;
  g.drainEvents();
  return g;
}

function stepFor(g: Game, secs: number): ReturnType<Game['drainEvents']> {
  const ev = [];
  for (let i = 0; i < secs * 30; i++) {
    g.step(1 / 30, NO_CONTROLS);
    ev.push(...g.drainEvents());
  }
  return ev;
}

describe('night raids in the game', () => {
  it('nightfall at home starts a raid; raiders survive at the pad; clearing pays the stash', () => {
    const g = raidGame();
    const ev = stepFor(g, 1);
    const start = ev.find((e) => e.t === 'raidstart');
    expect(start).toBeDefined();
    expect(g.raid).not.toBeNull();
    stepFor(g, 2);
    const raiders = g.enemies.filter((e) => e.raid);
    expect(raiders.length).toBeGreaterThan(0);
    const metal = g.stash.metal ?? 0;
    // Kill every raider as it arrives.
    let clear: ReturnType<Game['drainEvents']>[number] | undefined;
    for (let i = 0; i < 30 * 30 && !clear; i++) {
      for (const e of g.enemies) if (e.raid) e.hp = 0;
      g.step(1 / 30, NO_CONTROLS);
      clear = g.drainEvents().find((e) => e.t === 'raidclear');
    }
    expect(clear).toBeDefined();
    expect(g.raid).toBeNull();
    expect(g.stash.metal ?? 0).toBeGreaterThan(metal);
    expect(g.stats.raids).toBe(1);
  }, 30000);

  it('raiders reaching the base knock blocks loose as items (nothing destroyed for good)', () => {
    const g = raidGame();
    const w = g.world;
    stepFor(g, 1);
    expect(g.raid).not.toBeNull();
    // Drop a raider right next to a base block.
    const r = g.enemies.find((e) => e.raid) ?? (stepFor(g, 2), g.enemies.find((e) => e.raid));
    expect(r).toBeDefined();
    if (!r) return;
    r.kind = 'crawler';
    w.set(w.padX - 5, w.padY - 1, T.METAL);
    r.x = w.padX - 6 + 0.5;
    r.y = w.padY;
    r.dir = 1;
    const ev = stepFor(g, 3);
    const chew = ev.find((e) => e.t === 'raidchew');
    expect(chew).toBeDefined();
    expect(w.get(w.padX - 5, w.padY - 1)).not.toBe(T.METAL);
    expect(g.drops.some((d) => d.item === 'metal')).toBe(true);
  }, 30000);

  it('no raid when raids are off, the base is bare, or the player is out diving', () => {
    const off = raidGame(false);
    expect(stepFor(off, 1).some((e) => e.t === 'raidstart')).toBe(false);
    const bare = new Game(defaultSave());
    let t = bare.time;
    while (!isNight(t)) t += 1;
    bare.time = t - 0.5;
    expect(stepFor(bare, 1).some((e) => e.t === 'raidstart')).toBe(false);
    const away = raidGame();
    away.body.x = away.world.padX + 80;
    away.body.y = away.world.surface[Math.floor(away.body.x)];
    expect(stepFor(away, 1).some((e) => e.t === 'raidstart')).toBe(false);
  }, 30000);

  it('switching raids off mid-raid sends the raiders away; dawn does too', () => {
    const g = raidGame();
    stepFor(g, 3);
    expect(g.enemies.some((e) => e.raid)).toBe(true);
    g.setRaids(false);
    expect(g.raid).toBeNull();
    expect(g.enemies.some((e) => e.raid)).toBe(false);
    expect(g.toSave().settings.raids).toBe(false);
    const h = raidGame();
    stepFor(h, 3);
    let t = h.time;
    while (isNight(t)) t += 1;
    h.time = t - 0.2;
    const ev = stepFor(h, 1);
    expect(ev.some((e) => e.t === 'raidend')).toBe(true);
    expect(h.enemies.some((e) => e.raid)).toBe(false);
  }, 30000);
});

describe('save v14 raid settings', () => {
  it('v13 saves migrate to raids on and zero raids; the opt-out round-trips', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(14);
    const v13 = { ...defaultSave(), v: 13, settings: { muted: false, music: true }, stats: { deepest: 5, deaths: 1, playTime: 9, banked: 3 } };
    const m = parseSave(JSON.stringify(v13));
    expect(m.settings.raids).toBe(true);
    expect(m.stats.raids).toBe(0);
    expect(m.stats.deepest).toBe(5);
    const s = defaultSave();
    s.settings.raids = false;
    s.stats.raids = 3;
    const r = parseSave(serializeSave(s));
    expect(r.settings.raids).toBe(false);
    expect(r.stats.raids).toBe(3);
    expect(() => parseSave('{"settings": 5, "stats": "x"}')).not.toThrow();
  });
});
