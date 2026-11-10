import { describe, expect, it } from 'vitest';
import { decodeEdits, decodeFog, encodeEdits, encodeFog, MAX_EDITS } from '../src/sim/persist';
import { FogMap } from '../src/sim/explore';
import { Game } from '../src/sim/game';
import { SAVE_SOFT_LIMIT, SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { W, generateWorld } from '../src/sim/world';

const reload = (g: Game): Game => new Game(parseSave(serializeSave(g.toSave())));

describe('edit diff encoding', () => {
  it('round-trips sparse, clustered and run-length edits', () => {
    const m = new Map<number, number>([[0, 3], [1, 3], [2, 3], [7, 0], [8, 1], [500000, 22], [500001, 22]]);
    const s = encodeEdits(m);
    expect(decodeEdits(s, 600000, 30)).toEqual(m);
    expect(encodeEdits(new Map())).toBe('');
    expect(decodeEdits('', 10, 5).size).toBe(0);
  });

  it('is compact for a dug shaft', () => {
    const m = new Map<number, number>();
    for (let y = 40; y < 140; y++) for (let x = 700; x < 702; x++) m.set(y * 1400 + x, 0);
    expect(encodeEdits(m).length).toBeLessThan(1200);
  });

  it('never throws on junk and drops out-of-range entries', () => {
    for (const junk of [null, 5, {}, 'x', '...', ',,,', 'zz.zz*zz', '1.99', '-1.2', '1.2*0', '1.1*zzzzzz']) {
      expect(() => decodeEdits(junk, 1000, 30)).not.toThrow();
    }
    expect(decodeEdits('1.99', 1000, 30).size).toBe(0);
    expect(decodeEdits('zzzz.1', 1000, 30).size).toBe(0);
    expect(decodeEdits('1.1*zzzzzz', 1000, 30).size).toBe(0);
    expect(decodeEdits('1.1*zzzzzz', 1e12, 30).size).toBeLessThanOrEqual(MAX_EDITS);
  });

  it('fog round-trips and tolerates junk', () => {
    const w = generateWorld(2);
    const a = new FogMap(w);
    a.reveal(300, 100);
    a.reveal(900, 250);
    a.revealSky(w);
    const b = new FogMap(w);
    decodeFog(encodeFog(a.seen), b);
    expect(b.seen).toEqual(a.seen);
    for (const junk of [null, 'q', 'zzzzzzzz', '-3,4']) expect(() => decodeFog(junk, new FogMap(w))).not.toThrow();
  });
});

describe('persistent world', () => {
  it('dug tiles, placed walls, opened chests and the map survive a reload', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    const chest = w.structures.find((s) => s.kind === 'ruin');
    expect(chest).toBeDefined();
    let cx = -1;
    let cy = -1;
    for (let y = chest!.y0; y <= chest!.y1 && cx < 0; y++) for (let x = chest!.x0; x <= chest!.x1; x++) if (w.get(x, y) === T.CHEST) [cx, cy] = [x, y];
    w.set(cx, cy, T.AIR);
    const shaftX = w.padX + 40;
    for (let y = w.surface[shaftX]; y < w.surface[shaftX] + 30; y++) w.set(shaftX, y, T.AIR);
    w.setWall(shaftX + 1, w.padY + 5, W.PLATE);
    g.fog.reveal(shaftX, w.padY + 80);
    const g2 = reload(g);
    expect(g2.world.seed).toBe(w.seed);
    expect(g2.world.get(cx, cy)).toBe(T.AIR);
    for (let y = w.surface[shaftX]; y < w.surface[shaftX] + 30; y++) expect(g2.world.get(shaftX, y)).toBe(T.AIR);
    expect(g2.world.wall(shaftX + 1, w.padY + 5)).toBe(W.PLATE);
    expect(g2.fog.isSeen(shaftX, w.padY + 80)).toBe(true);
    // A reloaded world keeps tracking edits: a second reload still has them.
    expect(reload(g2).world.get(cx, cy)).toBe(T.AIR);
  });

  it('a fresh game has no stored world edits beyond the base', () => {
    const g = new Game(defaultSave());
    expect(g.world.edits.size).toBeLessThan(400);
  });

  it('returning to the pad keeps the world; death and NEW WORLD replace it', () => {
    const g = new Game(defaultSave());
    const seed = g.world.seed;
    const x = g.world.padX + 50;
    g.world.set(x, g.world.surface[x] + 2, T.AIR);
    g.bank();
    expect(g.world.seed).toBe(seed);
    expect(g.newDive()).toBe(true);
    expect(g.world.seed).not.toBe(seed);
    expect(g.toSave().world?.tiles.length ?? 0).toBeLessThan(4000);
    const seed2 = g.world.seed;
    g.body.y = g.world.padY + 30;
    g.hp = 0;
    g.step(1 / 60, { moveX: 0, jump: false, dig: false, place: false, aim: null });
    expect(g.world.seed).not.toBe(seed2);
  });

  it('migrates a v4 save (no world) to a fresh copy of the same seed', () => {
    const v4 = { ...defaultSave(), v: 4 } as Record<string, unknown>;
    delete v4.world;
    const s = parseSave(JSON.stringify(v4));
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.world).toBeNull();
    expect(new Game(s).world.seed).toBe(new Game(defaultSave()).world.seed);
    expect(parseSave(JSON.stringify({ ...defaultSave(), world: 'junk' })).world).toBeNull();
    expect(parseSave(JSON.stringify({ ...defaultSave(), world: { tiles: 5, fog: [] } })).world).toBeNull();
  });

  it('a huge world diff is dropped from the save instead of overflowing storage', () => {
    const s = defaultSave();
    s.world = { tiles: 'x'.repeat(SAVE_SOFT_LIMIT + 10), walls: '', fog: '' };
    const out = serializeSave(s);
    expect(out.length).toBeLessThan(SAVE_SOFT_LIMIT);
    expect(parseSave(out).world).toBeNull();
    expect(parseSave(out).seedBase).toBe(s.seedBase);
  });
});
