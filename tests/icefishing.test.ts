import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { ITEMS, T, TILES } from '../src/sim/tiles';
import { B } from '../src/sim/biomes';
import { FOOD, catchFor, castTarget } from '../src/sim/fishing';
import { freezePond } from '../src/sim/structures';
import { POI_NOTES } from '../src/sim/explore';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};

/** A frozen pond beside the player: rust floor, 6 columns of water 3 deep, the top row frozen. */
function icePond(g: Game): { x: number; y: number } {
  const w = g.world;
  const x = w.padX + 80;
  const y = w.surface[x];
  for (let xx = x - 12; xx <= x + 12; xx++) {
    for (let yy = y - 14; yy < y; yy++) w.set(xx, yy, T.AIR);
    w.set(xx, y, T.RUST);
  }
  for (let xx = x + 3; xx <= x + 8; xx++) {
    for (let yy = y; yy < y + 3; yy++) w.set(xx, yy, T.WATER);
    w.set(xx, y + 3, T.METAL);
  }
  expect(freezePond(w, x + 3, x + 8, y)).toBe(6);
  g.body.x = x + 0.5;
  g.body.y = y;
  g.body.vx = g.body.vy = 0;
  g.enemies = [];
  return { x, y };
}

describe('ice fishing', () => {
  it('pond ice is a solid, see-through block that drops nothing', () => {
    const ice = TILES[T.ICE];
    expect(ice.name).toBe('Pond ice');
    expect(ice.solid).toBe(true);
    expect(ice.clear).toBe(true);
    expect(ice.drop).toBeNull();
    expect(ITEMS.icefin.name).toBe('Icefin');
    // Icefin beats a plain fish.
    expect(FOOD.icefin?.hp ?? 0).toBeGreaterThan(FOOD.fish?.hp ?? 0);
  });

  it('Frozen Spires ponds freeze over at worldgen; other ponds stay open', () => {
    let frozen = 0;
    let open = 0;
    for (const seed of [1337, 7, 42, 99]) {
      const g = new Game(defaultSave(seed));
      const w = g.world;
      for (const s of w.structures) {
        if (s.kind !== 'pond') continue;
        const mid = Math.round((s.x0 + s.x1) / 2);
        const top = w.get(mid, s.y0);
        if (w.biome[mid] === B.FROST) {
          expect(top).toBe(T.ICE);
          expect(w.get(mid, s.y0 + 1)).toBe(T.WATER);
          frozen++;
        } else {
          expect(top).toBe(T.WATER);
          open++;
        }
      }
    }
    expect(frozen).toBeGreaterThan(0);
    expect(open).toBeGreaterThan(0);
  });

  it('casting at the ice targets the water under it, flagged as ice', () => {
    const g = new Game(defaultSave());
    const { x, y } = icePond(g);
    expect(castTarget(g.world, g.body.x, g.body.y, x + 5, y - 1)).toEqual({ x: x + 5, y: y + 1, ice: true });
    expect(castTarget(g.world, g.body.x, g.body.y, x + 5, y)).toEqual({ x: x + 5, y: y + 1, ice: true });
    // Ice over dry ground is just a block.
    g.world.set(x - 4, y, T.ICE);
    expect(castTarget(g.world, g.body.x, g.body.y, x - 4, y - 1)).toBeNull();
  });

  it('catches under the ice are deterministic and mostly icefin or fish', () => {
    let icefin = 0;
    let fish = 0;
    for (let c = 0; c < 200; c++) {
      const a = catchFor(7, c, 0, false, true);
      expect(a).toEqual(catchFor(7, c, 0, false, true));
      if (a.item === 'icefin') icefin++;
      if (a.item === 'fish') fish++;
      expect(a.item).not.toBe('glowfish');
    }
    expect(icefin).toBeGreaterThan(50);
    expect(icefin + fish).toBeGreaterThan(120);
    // Open water never gives icefin.
    for (let c = 0; c < 200; c++) expect(catchFor(7, c, 0, false).item).not.toBe('icefin');
  });

  it('a full ice-fishing loop: cast through the ice, wait for a bite, land a catch from the ice table', () => {
    const g = new Game(defaultSave());
    const { x, y } = icePond(g);
    g.setTool('rod');
    g.carried = {};
    run(g, 0.05, { dig: true, aim: { tx: x + 5, ty: y - 1 } });
    run(g, 0.05);
    expect(g.fishing?.ice).toBe(true);
    expect(g.fishing?.y).toBe(y + 1);
    let guard = 0;
    while ((g.fishing?.bite ?? 0) <= 0 && guard++ < 900) run(g, 1 / 60);
    expect(g.fishing?.bite ?? 0).toBeGreaterThan(0);
    const want = catchFor(g.world.seed, g.fishing?.cast ?? 0, g.depth, false, true);
    run(g, 0.02, { dig: true, aim: { tx: x + 5, ty: y - 1 } });
    expect(g.fishing).toBeNull();
    expect(g.carried[want.item] ?? 0).toBeGreaterThan(0);
    // The ice was not broken by fishing.
    expect(g.world.get(x + 5, y)).toBe(T.ICE);
  });

  it('the pond field-guide note tells players about ice fishing', () => {
    expect(POI_NOTES.pond).toMatch(/ice/i);
  });
});
