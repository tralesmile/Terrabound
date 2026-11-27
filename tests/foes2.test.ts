import { describe, expect, it } from 'vitest';
import { ENEMIES, makeEnemy, spawnableKinds, stepEnemy, type Enemy, type EnemyKind } from '../src/sim/enemies';
import { SHIELD_TURN, SURFACE_PAUSE, borable, borerHarmless, clearSight, hitsShield, segmentHitsBox } from '../src/sim/enemyai';
import { FIXED_DT, Game, NO_CONTROLS, type GameEvent } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { generateWorld, type World } from '../src/sim/world';
import { T } from '../src/sim/tiles';
import { B } from '../src/sim/biomes';
import { codexRows } from '../src/sim/codex';
import { eyeOffset, fuseFlash } from '../src/render/foefx';
import { ENEMY_LOOKS, enemyFrame } from '../src/render/sprites';
import { hapticFor } from '../src/platform/haptics';

const WAVE: EnemyKind[] = ['borer', 'tick', 'sentry', 'bulwark'];

/** A flat open room at row y around x0, as generated terrain (no player edits recorded). */
const room = (w: World, x0: number, y: number) => {
  for (let dx = -12; dx <= 12; dx++) {
    for (let dy = 1; dy <= 6; dy++) w.set(x0 + dx, y - dy, T.AIR);
    w.set(x0 + dx, y, T.METAL);
  }
  w.edits.clear();
};

const flat = () => {
  const w = generateWorld(5);
  const y = Math.floor(w.padY + 20);
  const x0 = Math.floor(w.padX) + 40;
  room(w, x0, y);
  return { w, x0, y };
};

/** A game with the player standing in a deep room, every pattern already met, no random spawns. */
const deep = (met = true) => {
  const s = defaultSave();
  if (met) s.met = Object.keys(ENEMIES) as never;
  const g = new Game(s);
  const bx = Math.floor(g.body.x) + 40;
  const by = Math.floor(g.body.y) + 20;
  room(g.world, bx, by);
  g.body.x = bx + 0.5;
  g.body.y = by;
  g.body.vy = 0;
  return { g, bx, by };
};

const run = (g: Game, seconds: number, each?: (events: GameEvent[]) => void) => {
  const all: GameEvent[] = [];
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) {
    (g as unknown as { spawnCd: number }).spawnCd = 99;
    g.step(FIXED_DT, { ...NO_CONTROLS });
    const ev = g.drainEvents();
    all.push(...ev);
    each?.(ev);
  }
  return all;
};

describe('second enemy wave: spawn rules', () => {
  it('each kind waits for its depth and then appears in every biome', () => {
    for (const k of WAVE) {
      expect(spawnableKinds(ENEMIES[k].minDepth - 1, B.WASTES)).not.toContain(k);
      for (const b of Object.values(B)) expect(spawnableKinds(ENEMIES[k].minDepth, b as number)).toContain(k);
      expect(spawnableKinds(200, B.WASTES, true)).not.toContain(k);
    }
    // The first dive stays simple: nothing new above 18 m.
    expect(WAVE.every((k) => ENEMIES[k].minDepth >= 18)).toBe(true);
  });

  it('every biome now has at least five hostile kinds deep down', () => {
    for (const b of Object.values(B)) expect(spawnableKinds(80, b as number).length).toBeGreaterThanOrEqual(5);
  });

  it('every attack telegraphs for at least 0.4 s', () => {
    expect(ENEMIES.sentry.beam!.lock).toBeGreaterThanOrEqual(0.4);
    expect(ENEMIES.tick.fuse!.fuse).toBeGreaterThanOrEqual(0.4);
    expect(SURFACE_PAUSE).toBeGreaterThanOrEqual(0.4);
    expect(SHIELD_TURN).toBeGreaterThanOrEqual(0.4);
  });

  it('each has its own silhouette, a codex entry and a visible eye', () => {
    const shapes = new Set(WAVE.map((k) => enemyFrame(ENEMY_LOOKS[k].sprite, 0).join('|')));
    expect(shapes.size).toBe(4);
    const rows = codexRows({ codex: [], bosses: [], awards: { n: Object.fromEntries(WAVE.map((k) => [`kill:${k}`, 1])), done: [] } as never });
    for (const k of WAVE) expect(rows.find((r) => r.id === `enemy:${k}`)?.found).toBe(true);
    for (const k of Object.keys(ENEMIES) as EnemyKind[]) {
      const r = eyeOffset(k, 0, 1);
      const l = eyeOffset(k, 0, -1);
      expect(r, k).not.toBeNull();
      expect(l!.x).toBeCloseTo(-r!.x);
    }
  });
});

describe('rock borer', () => {
  it('tunnels through natural rock to reach the player without breaking it', () => {
    const { w, x0, y } = flat();
    for (let dy = 1; dy <= 6; dy++) for (let dx = 3; dx <= 6; dx++) w.set(x0 + dx, y - dy, T.METAL);
    w.edits.clear();
    const e = makeEnemy(1, 'borer', x0 + 9.5, y);
    let wasBuried = false;
    for (let i = 0; i < 400; i++) {
      stepEnemy(w, e, FIXED_DT, x0 + 0.5, y);
      wasBuried ||= e.buried === true;
    }
    expect(wasBuried).toBe(true);
    expect(e.x).toBeLessThan(x0 + 3);
    expect(w.get(x0 + 4, y - 1)).toBe(T.METAL);
  });

  it('is stopped by anything the player built', () => {
    const { w, x0, y } = flat();
    for (let dy = 1; dy <= 7; dy++) w.set(x0 + 3, y - dy, T.SCAFFOLD);
    for (let dy = 1; dy <= 7; dy++) w.set(x0 + 4, y - dy, T.METAL);
    expect(borable(w, x0 + 4, y - 1)).toBe(false);
    const e = makeEnemy(1, 'borer', x0 + 8.5, y);
    for (let i = 0; i < 400; i++) stepEnemy(w, e, FIXED_DT, x0 + 0.5, y);
    expect(e.x).toBeGreaterThan(x0 + 5);
  });

  it('pauses, harmless, when it breaks out; shots cannot reach it in the rock but the blade can', () => {
    const { g, bx, by } = deep();
    for (let dy = 1; dy <= 6; dy++) for (let dx = 4; dx <= 8; dx++) g.world.set(bx + dx, by - dy, T.METAL);
    g.world.edits.clear();
    const e = makeEnemy(1, 'borer', bx + 6.5, by - 0.2);
    e.buried = true;
    g.enemies = [e];
    g.damageEnemy(e, 5, -1, 'ranged');
    g.damageEnemy(e, 5, -1, 'defence');
    expect(e.hp).toBe(ENEMIES.borer.hp);
    g.damageEnemy(e, 5, -1, 'melee');
    expect(e.hp).toBe(ENEMIES.borer.hp - 5);
    expect(borerHarmless(e)).toBe(true);
    let paused = 0;
    const ev = run(g, 4, () => {
      if ((e.surfaceT ?? 0) > 0) paused++;
    });
    expect(ev.some((x) => x.t === 'surface')).toBe(true);
    expect(paused * FIXED_DT).toBeGreaterThanOrEqual(0.4);
  });
});

describe('lens sentry', () => {
  const setup = (met = true) => {
    const { g, bx, by } = deep(met);
    const e: Enemy = makeEnemy(2, 'sentry', bx + 7.5, by);
    g.enemies = [e];
    return { g, bx, by, e };
  };

  it('aims, locks and hits a player who stands still', () => {
    const { g, e } = setup();
    const hp = g.hp;
    const ev = run(g, 1.3);
    expect(ev.some((x) => x.t === 'beamaim')).toBe(true);
    expect(ev.find((x) => x.t === 'beamfire')).toMatchObject({ hit: true });
    expect(g.hp).toBeLessThan(hp);
    expect(e.beamCd).toBeGreaterThan(0);
  });

  it('misses a player who leaves the line after it locks', () => {
    const { g, by, e } = setup();
    const d = ENEMIES.sentry.beam!;
    run(g, d.track + 0.1);
    expect(e.aimT).toBeGreaterThanOrEqual(d.track);
    const hp = g.hp;
    const lift = () => {
      g.body.y = by - 3.5; // held clear above the locked line
      g.body.vy = 0;
    };
    lift();
    const ev = run(g, d.lock, lift);
    expect(ev.find((x) => x.t === 'beamfire')).toMatchObject({ hit: false });
    expect(g.hp).toBe(hp);
  });

  it('never aims through a block, and losing sight cancels the shot', () => {
    const { g, bx, by, e } = setup();
    run(g, 0.2);
    expect(e.aimT).toBeDefined();
    for (let dy = 1; dy <= 6; dy++) g.world.set(bx + 4, by - dy, T.METAL);
    expect(clearSight(g.world, e.x, e.y - 0.5, g.body.x, g.body.y - 0.9)).toBe(false);
    const ev = run(g, 2);
    expect(ev.some((x) => x.t === 'beamfire' || x.t === 'beamaim')).toBe(false);
    expect(e.aimT).toBeUndefined();
  });

  it('segment test knows a hit from a near miss', () => {
    expect(segmentHitsBox(0, 5, 10, 5, 5, 6, 0.4, 1.8)).toBe(true);
    expect(segmentHitsBox(0, 2, 10, 2, 5, 6, 0.4, 1.8)).toBe(false);
  });
});

describe('fuse tick', () => {
  it('lights up close, explodes, hurts, and leaves no loot or kill', () => {
    const { g, bx, by } = deep();
    g.enemies = [makeEnemy(3, 'tick', bx + 1.6, by)];
    const hp = g.hp;
    const ev = run(g, 1.4);
    expect(ev.some((x) => x.t === 'fuselit')).toBe(true);
    expect(ev.find((x) => x.t === 'tickburst')).toMatchObject({ hit: true });
    expect(ev.some((x) => x.t === 'enemykill')).toBe(false);
    expect(g.enemies).toHaveLength(0);
    expect(g.drops).toHaveLength(0);
    expect(g.hp).toBeLessThan(hp);
  });

  it('misses a player who backs off, and killing it first stops the blast and pays loot', () => {
    const a = deep();
    a.g.enemies = [makeEnemy(4, 'tick', a.bx + 1.6, a.by)];
    run(a.g, 0.2);
    a.g.body.x = a.bx - 4;
    expect(run(a.g, 1).find((x) => x.t === 'tickburst')).toMatchObject({ hit: false });

    const b = deep();
    const e = makeEnemy(5, 'tick', b.bx + 1.6, b.by);
    b.g.enemies = [e];
    run(b.g, 0.2);
    b.g.damageEnemy(e, 99, 1, 'melee');
    const ev = run(b.g, 1.2);
    expect(ev.some((x) => x.t === 'enemykill')).toBe(true);
    expect(ev.some((x) => x.t === 'tickburst')).toBe(false);
  });

  it('a teaching tick only shoves with its first blast', () => {
    const { g, bx, by } = deep(false);
    g.enemies = [{ ...makeEnemy(6, 'tick', bx + 1.6, by), teach: true }];
    const hp = g.hp;
    const ev = run(g, 1.4);
    expect(ev.some((x) => x.t === 'teachtouch')).toBe(true);
    expect(g.hp).toBe(hp);
  });

  it('blinks while the fuse burns', () => {
    expect(fuseFlash(undefined, 0.75)).toBe(false);
    const seen = new Set([0.05, 0.15, 0.25, 0.35].map((t) => fuseFlash(t, 0.75)));
    expect(seen.size).toBe(2);
  });
});

describe('bulwark shield', () => {
  it('blocks blade and bolts from the front, not from behind, and never blasts', () => {
    const { g, bx, by } = deep();
    const e = makeEnemy(7, 'bulwark', bx + 3.5, by);
    e.dir = -1; // facing the player on its left
    g.enemies = [e];
    const hit = (dir: number, cls: 'melee' | 'ranged' | 'blast') => {
      e.iframes = 0;
      const hp = e.hp;
      g.damageEnemy(e, 5, dir, cls);
      return hp - e.hp;
    };
    expect(hit(1, 'melee')).toBe(0);
    expect(hit(1, 'ranged')).toBe(0);
    expect(g.drainEvents().filter((x) => x.t === 'shieldblock')).toHaveLength(2);
    expect(hit(-1, 'melee')).toBe(5);
    expect(hit(1, 'blast')).toBe(5);
    expect(hitsShield(1, -1)).toBe(true);
    expect(hitsShield(1, 1)).toBe(false);
  });

  it('turns slowly: a player who jumps over has a window on its back', () => {
    const { w, x0, y } = flat();
    const e = makeEnemy(8, 'bulwark', x0 + 0.5, y);
    e.dir = 1;
    let frames = 0;
    while (e.dir === 1 && frames < 600) {
      stepEnemy(w, e, FIXED_DT, x0 - 2, y);
      frames++;
    }
    expect(frames * FIXED_DT).toBeGreaterThanOrEqual(SHIELD_TURN - FIXED_DT);
    expect(frames * FIXED_DT).toBeLessThan(SHIELD_TURN + 0.1);
  });

  it('taps land in the hand', () => {
    expect(hapticFor({ t: 'shieldblock', x: 0, y: 0, dir: 1 })).not.toBeNull();
  });
});
