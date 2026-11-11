import { describe, expect, it } from 'vitest';
import { CELL, CODEX, FogMap, RECALL_TIME, discoveriesAt } from '../src/sim/explore';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { generateWorld } from '../src/sim/world';

const run = (g: Game, seconds: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};

/** Put the player on open surface ground `dx` columns from the pad. */
const onSurface = (g: Game, dx: number): void => {
  const x = g.world.padX + dx;
  g.body.x = x + 0.5;
  g.body.y = g.world.surface[x];
  g.body.vx = g.body.vy = 0;
  g.body.onGround = true;
  for (let y = g.world.surface[x] - 3; y < g.world.surface[x]; y++) for (let k = -1; k <= 1; k++) g.world.set(x + k, y, 0);
};

describe('fog map', () => {
  it('reveals around a point, counts new cells once, and knows the sky band from the start', () => {
    const w = generateWorld(3);
    const fog = new FogMap(w);
    expect(fog.isSeen(100, 200)).toBe(false);
    const n = fog.reveal(100, 200);
    expect(n).toBeGreaterThan(10);
    expect(fog.reveal(100, 200)).toBe(0);
    expect(fog.isSeen(100, 200)).toBe(true);
    expect(fog.isSeen(100 + 40, 200)).toBe(false);
    fog.revealSky(w);
    for (let x = 0; x < w.w; x += 37) expect(fog.isSeen(x, w.surface[x] - 4)).toBe(true);
    expect(fog.isSeen(-5, 0)).toBe(false);
    expect(fog.cw).toBe(Math.ceil(w.w / CELL));
  });

  it('a game reveals the map as the player moves', () => {
    const g = new Game(defaultSave());
    const before = g.fog.version;
    onSurface(g, 60);
    run(g, 0.1);
    expect(g.fog.version).toBeGreaterThan(before);
    expect(g.fog.isSeen(Math.floor(g.body.x), Math.floor(g.body.y))).toBe(true);
  });
});

describe('codex', () => {
  it('has fourteen unique entries, each with a reward', () => {
    expect(CODEX.length).toBe(14);
    expect(new Set(CODEX.map((c) => c.id)).size).toBe(14);
    for (const c of CODEX) expect(Object.values(c.reward).reduce((a, n) => a + (n ?? 0), 0)).toBeGreaterThan(0);
  });

  it('discovering pays once into the stash and survives a save round trip', () => {
    const g = new Game(defaultSave());
    g.stash = {};
    expect(g.discover('poi:vault')).toBe(true);
    expect(g.stash.crystal).toBe(3);
    expect(g.discover('poi:vault')).toBe(false);
    expect(g.stash.crystal).toBe(3);
    expect(g.discover('nope')).toBe(false);
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.codex).toContain('poi:vault');
    expect(new Game(back).discover('poi:vault')).toBe(false);
  });

  it('the home biome is discovered right after landing', () => {
    const g = new Game(defaultSave());
    run(g, 0.5);
    expect(g.codex).toContain('biome:0');
  });

  it('structures are discovered by walking into them', () => {
    const w = generateWorld(2);
    const s = w.structures.find((x) => x.kind === 'ruin');
    expect(s).toBeDefined();
    if (!s) return;
    expect(discoveriesAt(w, (s.x0 + s.x1) / 2, s.y1 - 1)).toContain('poi:ruin');
    expect(discoveriesAt(w, w.padX, w.padY + 200)).toEqual([]);
  });
});

describe('save v4', () => {
  it('migrates a v3 save (no codex) and drops junk ids', () => {
    const v3 = { ...defaultSave(), v: 3 } as Record<string, unknown>;
    delete v3.codex;
    const s = parseSave(JSON.stringify(v3));
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.codex).toEqual([]);
    const junk = parseSave(JSON.stringify({ ...defaultSave(), codex: ['biome:1', 'biome:1', 5, 'x', null, 'poi:ship'] }));
    expect(junk.codex).toEqual(['biome:1', 'poi:ship']);
    expect(parseSave(JSON.stringify({ ...defaultSave(), codex: 'oops' })).codex).toEqual([]);
  });
});

describe('surface recall', () => {
  it('beams home after standing still for RECALL_TIME', () => {
    const g = new Game(defaultSave());
    onSurface(g, 80);
    run(g, 0.2);
    expect(g.canRecall()).toBe(true);
    expect(g.startRecall()).toBe(true);
    run(g, RECALL_TIME + 0.1);
    expect(g.isAtBase()).toBe(true);
    expect(g.drainEvents().some((e) => e.t === 'recall')).toBe(true);
  });

  it('moving cancels it; it is not offered underground or at the pad', () => {
    const g = new Game(defaultSave());
    expect(g.canRecall()).toBe(false);
    onSurface(g, 80);
    run(g, 0.2);
    g.startRecall();
    run(g, 0.5, { moveX: 1 });
    expect(g.recallT).toBe(0);
    expect(g.drainEvents().some((e) => e.t === 'recallcancel')).toBe(true);
    g.body.y = g.world.padY + 30;
    expect(g.canRecall()).toBe(false);
  });
});
