import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { HAZARD, fallerHits, findCeiling, inGas, placeHazards, stepFaller } from '../src/sim/hazards';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { generateWorld } from '../src/sim/world';

const run = (g: Game, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) g.step(FIXED_DT, NO_CONTROLS);
};

/** Carve an open box and put the player in it, deep enough for every hazard. */
function cave(g: Game, cx: number, cy: number): void {
  for (let x = cx - 8; x <= cx + 8; x++) for (let y = cy - 8; y <= cy; y++) g.world.set(x, y, T.AIR);
  for (let x = cx - 9; x <= cx + 9; x++) {
    g.world.set(x, cy + 1, T.METAL);
    g.world.set(x, cy - 9, T.METAL);
  }
  g.body.x = cx + 0.5;
  g.body.y = cy + 1;
  g.body.vx = 0;
  g.body.vy = 0;
  g.hazards = { emitters: [], gas: [] };
  g.enemies = [];
  g.iframes = 0;
}

describe('hazard placement', () => {
  it('is deterministic and keeps the base clear', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const w = generateWorld(seed);
      const a = placeHazards(w);
      const b = placeHazards(generateWorld(seed));
      expect(a).toEqual(b);
      for (const e of a.emitters) {
        expect(e.y - w.padY).toBeGreaterThanOrEqual(HAZARD.acidMinDepth);
        expect(w.isSolid(Math.floor(e.x), e.y - 1)).toBe(true);
        expect(w.get(Math.floor(e.x), e.y)).toBe(T.AIR);
      }
      for (const g of a.gas) expect(g.y - w.padY).toBeGreaterThanOrEqual(HAZARD.gasMinDepth);
    }
  });

  it('places some hazards across seeds', () => {
    let em = 0;
    for (let seed = 1; seed <= 8; seed++) em += placeHazards(generateWorld(seed)).emitters.length;
    expect(em).toBeGreaterThan(0);
  });
});

describe('fallers', () => {
  it('hang during the warning, then fall and land on solid ground', () => {
    const w = generateWorld(3);
    for (let y = 60; y < 70; y++) w.set(20, y, T.AIR);
    w.set(20, 70, T.METAL);
    const f = { kind: 'acid' as const, x: 20.5, y: 60.3, vy: 0, warn: 0.5 };
    for (let i = 0; i < 20; i++) stepFaller(w, f, FIXED_DT);
    expect(f.y).toBe(60.3);
    expect(fallerHits(f, 20.5, 61, 0.35, 1.8)).toBe(false);
    let alive = true;
    for (let i = 0; i < 200 && alive; i++) alive = stepFaller(w, f, FIXED_DT);
    expect(alive).toBe(false);
    expect(f.y).toBeGreaterThanOrEqual(70);
  });

  it('findCeiling finds the air row under rock or -1', () => {
    const w = generateWorld(3);
    for (let y = 50; y < 60; y++) w.set(30, y, T.AIR);
    w.set(30, 49, T.METAL);
    expect(findCeiling(w, 30, 58, 10)).toBe(50);
    expect(findCeiling(w, 30, 58, 3)).toBe(-1);
  });

  it('acid hurts the player once, respecting i-frames', () => {
    const g = new Game();
    cave(g, 80, 70);
    g.fallers.push({ kind: 'acid', x: g.body.x, y: g.body.y - 6, vy: 0, warn: 0 });
    const hp = g.hp;
    run(g, 1.5);
    expect(g.hp).toBe(hp - HAZARD.acidDmg);
    expect(g.fallers.length).toBe(0);
  });

  it('a warning marker alone never hurts', () => {
    const g = new Game();
    cave(g, 80, 70);
    g.fallers.push({ kind: 'debris', x: g.body.x, y: g.body.y - 1, vy: 0, warn: 0.5 });
    const hp = g.hp;
    run(g, 0.4);
    expect(g.hp).toBe(hp);
  });

  it('debris spawns telegraphed above the player in a cave and can be dodged', () => {
    const g = new Game();
    cave(g, 80, 70);
    run(g, 20);
    const sawDebris = g.events.some((e) => e.t === 'splash' && e.kind === 'debris');
    expect(sawDebris).toBe(true);
  });

  it('no hazards at the base', () => {
    const g = new Game();
    g.fallers.push({ kind: 'acid', x: g.body.x, y: g.body.y - 3, vy: 0, warn: 0 });
    run(g, 1);
    expect(g.fallers.length).toBe(0);
    expect(g.hp).toBe(g.derived.maxHp);
  });
});

describe('gas', () => {
  it('inGas is a circle test', () => {
    expect(inGas([{ x: 10, y: 10, r: 2 }], 11, 10)).toBe(true);
    expect(inGas([{ x: 10, y: 10, r: 2 }], 13, 10)).toBe(false);
  });

  it('drains hp while inside and stops outside', () => {
    const g = new Game();
    cave(g, 80, 70);
    g.hazards.gas.push({ x: g.body.x, y: g.body.y - 1, r: 3 });
    const hp = g.hp;
    run(g, 2);
    expect(g.inGas).toBe(true);
    expect(hp - g.hp).toBeGreaterThanOrEqual(HAZARD.gasDps * 1.5);
    g.hazards.gas = [];
    const after = g.hp;
    run(g, 1);
    expect(g.inGas).toBe(false);
    expect(g.hp).toBe(after);
  });

  it('new dives regenerate hazards from the seed', () => {
    const s = defaultSave();
    s.seedBase = 9;
    const g = new Game(s);
    expect(g.hazards.emitters.length).toBeGreaterThan(0);
  });
});
