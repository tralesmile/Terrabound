import { describe, expect, it } from 'vitest';
import { hash2, mixSeed, mulberry32, valueNoise } from '../src/sim/rng';
import { T } from '../src/sim/tiles';
import { WORLD_H, WORLD_W, generateWorld, worldStats } from '../src/sim/world';
import { BODY_H, boxCollides, moveX, moveY } from '../src/sim/physics';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { derive } from '../src/sim/upgrades';

/** Put the player standing on the surface dx tiles from the pad centre (outside the base zone when |dx| > 6). */
const standOnSurface = (g: Game, dx: number) => {
  const x = g.world.padX + dx;
  g.body.x = x + 0.5;
  g.body.y = g.world.surface[x];
  g.body.vx = 0;
  g.body.vy = 0;
  g.step(FIXED_DT, NO_CONTROLS);
};

const run = (g: Game, seconds: number, c: Partial<Controls> = {}) => {
  const ctl = { ...NO_CONTROLS, ...c };
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) g.step(FIXED_DT, ctl);
};

describe('rng', () => {
  it('is deterministic and in range', () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    for (let i = 0; i < 500; i++) {
      const n = valueNoise(i * 0.37, i * 0.11, 9);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
      const h = hash2(i, -i, 3);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
    expect(mixSeed(1, 2)).not.toBe(mixSeed(1, 3));
  });
});

describe('worldgen', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const a = generateWorld(42);
    const b = generateWorld(42);
    const c = generateWorld(43);
    expect(Buffer.from(a.tiles).equals(Buffer.from(b.tiles))).toBe(true);
    expect(Buffer.from(a.tiles).equals(Buffer.from(c.tiles))).toBe(false);
  });

  it('has sane structure for many seeds', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const w = generateWorld(seed * 7919);
      const s = worldStats(w);
      const frac = s.air / (WORLD_W * WORLD_H);
      expect(frac).toBeGreaterThan(0.1); // surface air + caves
      expect(s.iron).toBeGreaterThan(20);
      expect(s.copper).toBeGreaterThan(0);
      // Bedrock floor and walls are intact.
      for (let x = 0; x < w.w; x++) expect(w.get(x, w.h - 1)).toBe(T.BEDROCK);
      for (let y = w.surface[0]; y < w.h; y++) expect(w.get(0, y)).toBe(T.BEDROCK);
      for (let y = w.surface[w.w - 1]; y < w.h; y++) expect(w.get(w.w - 1, y)).toBe(T.BEDROCK);
      // Pad exists and the spawn pocket above it is clear.
      expect(w.get(w.padX, w.padY)).toBe(T.PAD);
      for (let dy = 1; dy <= 3; dy++) expect(w.get(w.padX, w.padY - dy)).toBe(T.AIR);
    }
  });

  it('handles out of range reads without throwing', () => {
    const w = generateWorld(1);
    expect(w.get(-5, 3)).toBe(T.BEDROCK);
    expect(w.get(5, -50)).toBe(T.AIR);
    expect(w.get(5, 9999)).toBe(T.BEDROCK);
    expect(w.set(-1, 0, 1)).toBe(false);
  });
});

describe('physics', () => {
  it('lands flush on the floor and cannot tunnel at max speed', () => {
    const w = generateWorld(3);
    const b = { x: w.padX + 0.5, y: w.padY - 30, vx: 0, vy: 28, onGround: false };
    for (let i = 0; i < 300 && !b.onGround; i++) moveY(w, b, b.vy / 60);
    expect(b.onGround).toBe(true);
    expect(b.y).toBe(w.padY);
    expect(boxCollides(w, b.x, b.y)).toBe(false);
  });

  it('is stopped by walls', () => {
    const w = generateWorld(3);
    const b = { x: 1.5, y: w.padY + 40, vx: 0, vy: 0, onGround: false };
    // Carve a pocket then walk into the bedrock wall on the left.
    for (let x = 1; x < 6; x++) for (let y = -3; y <= 0; y++) w.set(x, b.y + y - 0, T.AIR);
    for (let x = 1; x < 6; x++) w.set(x, b.y, T.AIR);
    b.y = Math.floor(b.y);
    moveX(w, b, -5);
    expect(b.x).toBeCloseTo(1.35, 5);
    expect(boxCollides(w, b.x, b.y)).toBe(false);
    expect(BODY_H).toBeGreaterThan(1.5);
  });
});

describe('game', () => {
  it('starts safe at the base with full stats', () => {
    const g = new Game();
    expect(g.isAtBase()).toBe(true);
    expect(g.hp).toBe(100);
    expect(g.battery).toBe(240);
    run(g, 2);
    expect(g.isAtBase()).toBe(true);
    expect(g.body.onGround).toBe(true);
    expect(g.hp).toBe(100);
  });

  it('walks and jumps', () => {
    const g = new Game();
    const x0 = g.body.x;
    run(g, 0.5, { moveX: 1 });
    expect(g.body.x).toBeGreaterThan(x0 + 2);
    const y0 = g.body.y;
    let minY = y0;
    for (let i = 0; i < 90; i++) {
      g.step(FIXED_DT, { ...NO_CONTROLS, jump: i < 20 });
      minY = Math.min(minY, g.body.y);
    }
    expect(y0 - minY).toBeGreaterThan(1.5);
    expect(g.body.onGround).toBe(true);
  });

  it('digs a block, collects the drop and respects reach', () => {
    const g = new Game();
    standOnSurface(g, 9);
    expect(g.isAtBase()).toBe(false);
    const x = Math.floor(g.body.x) + 2;
    const ty = g.world.surface[x];
    expect(g.world.isSolid(x, ty)).toBe(true);
    // Out of reach: nothing breaks.
    const fx = Math.min(g.world.w - 3, x + 30);
    const fy = g.world.surface[fx];
    run(g, 3, { dig: true, aim: { tx: fx, ty: fy } });
    expect(g.world.get(fx, fy)).not.toBe(T.AIR);
    // In reach: breaks and drops one item.
    const before = g.world.get(x, ty);
    expect(before).not.toBe(T.AIR);
    run(g, 3, { dig: true, aim: { tx: x, ty } });
    expect(g.world.get(x, ty)).toBe(T.AIR);
    const items = Object.values(g.carried).reduce((a, b) => a + (b ?? 0), 0);
    expect(items).toBe(1);
  });

  it('never breaks bedrock or the pad', () => {
    const g = new Game();
    run(g, 5, { dig: true, aim: { tx: g.world.padX, ty: g.world.padY } });
    expect(g.world.get(g.world.padX, g.world.padY)).toBe(T.PAD);
  });

  it('refuses to mine when the pack is full', () => {
    const g = new Game();
    standOnSurface(g, 9);
    g.carried = { rust: 30 };
    const x = Math.floor(g.body.x) + 2;
    const ty = g.world.surface[x];
    const before = g.world.get(x, ty);
    run(g, 3, { dig: true, aim: { tx: x, ty } });
    expect(g.world.get(x, ty)).toBe(before);
    expect(g.drainEvents().some((e) => e.t === 'full')).toBe(true);
  });

  it('places blocks only next to solids and never inside the player', () => {
    const g = new Game();
    standOnSurface(g, 9);
    g.carried = { rust: 5 };
    const bx = Math.floor(g.body.x);
    const by = Math.floor(g.body.y) - 1;
    run(g, 0.5, { place: true, aim: { tx: bx, ty: by } }); // overlaps the player
    expect(g.world.get(bx, by)).toBe(T.AIR);
    const px = bx + 2;
    const py = g.world.surface[px] - 1; // air tile resting on the ground
    expect(g.world.get(px, py)).toBe(T.AIR);
    run(g, 0.5, { place: true, aim: { tx: px, ty: py } });
    expect(g.world.get(px, py)).toBe(T.RUST);
    expect(g.carried.rust).toBe(4);
    // Floating placement is refused.
    const fy = py - 4;
    run(g, 0.5, { place: true, aim: { tx: px, ty: fy } });
    expect(g.world.get(px, fy)).toBe(T.AIR);
  });

  it('auto-banks loot at the base', () => {
    const g = new Game();
    g.carried = { rust: 3, iron_scrap: 2 };
    run(g, 0.1);
    expect(g.carried).toEqual({});
    expect(g.stash.rust).toBe(3);
    expect(g.stats.banked).toBe(5);
  });

  it('drains battery underground, banks at base and survives death with half loot', () => {
    const g = new Game();
    g.carried = { iron_scrap: 9 };
    g.body.y = g.world.padY + 40;
    g.body.x = g.world.padX + 0.5;
    // Clear a pocket so the player is not embedded.
    for (let dy = -2; dy <= 0; dy++) g.world.set(g.world.padX, Math.floor(g.body.y) + dy, T.AIR);
    run(g, 2);
    expect(g.battery).toBeLessThan(240);
    g.hp = 0;
    const seedBefore = g.world.seed;
    run(g, 0.1);
    expect(g.stats.deaths).toBe(1);
    expect(g.stash.iron_scrap).toBe(4); // floor(9/2)
    expect(g.isAtBase()).toBe(true);
    expect(g.world.seed).not.toBe(seedBefore);
    expect(Object.keys(g.carried).length).toBe(0);
  });

  it('buys upgrades only at base with enough resources', () => {
    const g = new Game();
    expect(g.buyUpgrade('battery')).toBe(false); // cannot afford
    g.stash = { iron_scrap: 100 };
    expect(g.buyUpgrade('battery')).toBe(true);
    expect(g.derived.maxBattery).toBe(300);
    expect(g.buyUpgrade('nope')).toBe(false);
    g.body.y = g.world.padY + 20;
    expect(g.buyUpgrade('battery')).toBe(false); // not at base
  });

  it('survives absurd frame times without exploding', () => {
    const g = new Game();
    g.step(10, NO_CONTROLS);
    g.step(NaN, NO_CONTROLS);
    g.step(-1, NO_CONTROLS);
    expect(Number.isFinite(g.body.x)).toBe(true);
    expect(Number.isFinite(g.body.y)).toBe(true);
    expect(boxCollides(g.world, g.body.x, g.body.y)).toBe(false);
  });

  it('new dive requires the base', () => {
    const g = new Game();
    const s = g.world.seed;
    expect(g.newDive()).toBe(true);
    expect(g.world.seed).not.toBe(s);
    g.body.y = g.world.padY + 10;
    expect(g.newDive()).toBe(false);
  });
});

describe('save', () => {
  it('round-trips', () => {
    const s = defaultSave(99);
    s.stash = { rust: 5, iron_scrap: 7 };
    s.upgrades = { battery: 2 };
    s.stats.deepest = 33;
    const back = parseSave(serializeSave(s));
    expect(back).toEqual(s);
  });

  it('survives corrupt, hostile and legacy data', () => {
    expect(parseSave(null)).toEqual(defaultSave());
    expect(parseSave('{not json')).toEqual(defaultSave());
    expect(parseSave('42')).toEqual(defaultSave());
    const hostile = parseSave(
      JSON.stringify({ seedBase: 'x', runs: -5, stash: { rust: -3, iron_scrap: 1e30, hax: 5 }, upgrades: { battery: 999, pick: 'a' }, stats: { deepest: NaN } }),
    );
    expect(hostile.runs).toBe(0);
    expect(hostile.stash.rust).toBeUndefined();
    expect(hostile.stash.iron_scrap).toBe(1_000_000_000);
    expect((hostile.stash as Record<string, number>).hax).toBeUndefined();
    expect(hostile.upgrades.battery).toBe(8);
    expect(hostile.upgrades.pick).toBeUndefined();
    expect(hostile.stats.deepest).toBe(0);
  });

  it('banks carried loot on load so a refresh never loses a dive', () => {
    const s = defaultSave();
    s.carried = { copper_wire: 6 };
    s.stash = { copper_wire: 1 };
    const g = new Game(s);
    expect(g.stash.copper_wire).toBe(7);
    expect(g.toSave().carried).toEqual({});
  });

  it('derives stats from upgrades', () => {
    expect(derive({}).maxBattery).toBe(240);
    expect(derive({ pick: 2 }).digPower).toBeCloseTo(1.7);
  });
});
