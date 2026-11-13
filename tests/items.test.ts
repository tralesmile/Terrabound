import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { T, invTotal } from '../src/sim/tiles';
import { addDrop, makeDrop, MAX_DROPS } from '../src/sim/drops';
import { BITE_WINDOW, FOOD, catchFor, castTarget } from '../src/sim/fishing';
import { decodeChests, encodeChests } from '../src/sim/persist';
import { stepSaplings } from '../src/sim/structures';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};
const reload = (g: Game): Game => new Game(parseSave(serializeSave(g.toSave())));

/** Flat open test area on the surface `dx` columns from the pad: rust floor, air above. */
function flat(g: Game, dx: number, width = 12): { x: number; y: number } {
  const w = g.world;
  const x0 = w.padX + dx;
  const y = w.surface[x0];
  for (let x = x0 - width; x <= x0 + width; x++) {
    for (let yy = y - 14; yy < y; yy++) w.set(x, yy, T.AIR);
    w.set(x, y, T.RUST);
  }
  g.body.x = x0 + 0.5;
  g.body.y = y;
  g.body.vx = g.body.vy = 0;
  g.enemies = [];
  return { x: x0, y };
}

describe('items on the ground', () => {
  it('fall, drift to a nearby player and are picked up; far ones stay', () => {
    const g = new Game(defaultSave());
    const { x, y } = flat(g, 60);
    g.carried = {};
    g.drops = [makeDrop('crystal', 3, x + 1.5, y - 3), makeDrop('fish', 1, x + 9.5, y - 3)];
    run(g, 2);
    expect(g.carried.crystal).toBe(3);
    expect(g.carried.fish ?? 0).toBe(0);
    const far = g.drops.find((d) => d.item === 'fish');
    expect(far).toBeDefined();
    expect(Math.abs((far?.y ?? 0) - y)).toBeLessThan(0.1); // resting on the floor
  });

  it('are left on the ground when the pack is full', () => {
    const g = new Game(defaultSave());
    const { x, y } = flat(g, 60);
    g.carried = { rust: g.derived.packCap };
    g.drops = [makeDrop('crystal', 1, x + 0.5, y - 1)];
    run(g, 1);
    expect(g.drops.length).toBe(1);
    g.carried = {};
    run(g, 1);
    expect(g.carried.crystal).toBe(1);
  });

  it('dropping from the pack throws the item and it is not instantly re-collected', () => {
    const g = new Game(defaultSave());
    flat(g, 60);
    g.carried = { biomass: 5 };
    expect(g.dropItem('biomass')).toBe(5);
    expect(g.carried.biomass ?? 0).toBe(0);
    run(g, 0.5);
    expect(g.carried.biomass ?? 0).toBe(0);
    // Walk over to where it landed to pick it up again.
    const d = g.drops.find((x) => x.item === 'biomass');
    expect(d).toBeDefined();
    run(g, 1.5);
    g.body.x = (d?.x ?? 0) + 0.2;
    run(g, 1);
    expect(g.carried.biomass).toBe(5);
  });

  it('merge nearby stacks and never exceed the cap', () => {
    const list = [makeDrop('rust', 1, 5, 5)];
    addDrop(list, makeDrop('rust', 2, 5.4, 5.2));
    expect(list.length).toBe(1);
    expect(list[0].n).toBe(3);
    for (let i = 0; i < MAX_DROPS + 40; i++) addDrop(list, makeDrop('rust', 1, i * 3, 5));
    expect(list.length).toBeLessThanOrEqual(MAX_DROPS);
  });

  it('felled trees drop seeds', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    let tx = -1;
    for (let x = 1; x < w.w - 1 && tx < 0; x++) if (w.get(x, w.surface[x] - 1) === T.TRUNK) tx = x;
    w.set(tx, w.surface[tx] - 1, T.AIR);
    g.fellTree(tx, w.surface[tx] - 1, 99);
    expect(g.drops.some((d) => d.item === 'seed')).toBe(true);
  });
});

describe('chests are containers', () => {
  it('clicking a chest opens it instead of breaking it; take one, take all, store', () => {
    const g = new Game(defaultSave());
    const { x, y } = flat(g, 60);
    const cx = x + 2;
    g.world.set(cx, y - 1, T.CHEST);
    g.carried = {};
    run(g, 0.05, { dig: true, aim: { tx: cx, ty: y - 1 } });
    expect(g.world.get(cx, y - 1)).toBe(T.CHEST);
    expect(g.chestOpen).toEqual({ x: cx, y: y - 1 });
    const inv = g.chestContents(cx, y - 1);
    const first = Object.keys(inv)[0] as keyof typeof inv;
    const n = inv[first] ?? 0;
    expect(g.takeFromChest(first)).toBe(n);
    expect(g.carried[first]).toBe(n);
    g.takeFromChest('all');
    expect(invTotal(g.chestContents(cx, y - 1))).toBe(0);
    g.carried.fish = 2;
    expect(g.putInChest('fish')).toBe(2);
    expect(g.chestContents(cx, y - 1).fish).toBe(2);
  });

  it('E opens the nearest chest in reach and closes it again; walking away closes it', () => {
    const g = new Game(defaultSave());
    const { x, y } = flat(g, 60);
    g.world.set(x + 2, y - 1, T.CHEST);
    expect(g.interact()).toBe(true);
    expect(g.chestOpen).not.toBeNull();
    g.interact();
    expect(g.chestOpen).toBeNull();
    g.interact();
    g.body.x += 9;
    run(g, 0.05);
    expect(g.chestOpen).toBeNull();
  });

  it('placed chests start empty, keep their contents across a reload, and can be picked up', () => {
    const g = new Game(defaultSave());
    const { x, y } = flat(g, 60);
    g.carried = { chest: 1, crystal: 4 };
    g.selected = 'chest';
    run(g, 0.05, { place: true, aim: { tx: x + 2, ty: y - 1 } });
    expect(g.world.get(x + 2, y - 1)).toBe(T.CHEST);
    g.openChestAt(x + 2, y - 1);
    expect(invTotal(g.chestContents(x + 2, y - 1))).toBe(0);
    g.putInChest('crystal');
    const g2 = reload(g);
    expect(g2.chestContents(x + 2, y - 1).crystal).toBe(4);
    g2.body.x = g.body.x;
    g2.body.y = g.body.y;
    g2.openChestAt(x + 2, y - 1);
    expect(g2.breakChest()).toBe(true);
    expect(g2.world.get(x + 2, y - 1)).toBe(T.AIR);
    expect(g2.drops.some((d) => d.item === 'crystal' && d.n === 4)).toBe(true);
    expect(g2.drops.some((d) => d.item === 'chest')).toBe(true);
  });

  it('chest encoding round-trips and never throws on junk', () => {
    const m = new Map([[5, { crystal: 2 }], [99, {}]]);
    expect(decodeChests(encodeChests(m), 1000)).toEqual(m);
    for (const junk of [null, 'x', '[', '[[1]]', '[[-1,{}]]', '[[5,{"crystal":-3,"nope":2}]]', 7]) expect(() => decodeChests(junk, 1000)).not.toThrow();
    expect(decodeChests('[[5,{"crystal":-3,"nope":2,"fish":1.9}]]', 1000).get(5)).toEqual({ fish: 1 });
  });
});

describe('planting', () => {
  it('a seed planted on soil grows into a tree; not on metal', () => {
    const g = new Game(defaultSave());
    const { x, y } = flat(g, 70);
    g.carried = { seed: 2 };
    g.selected = 'seed';
    g.world.set(x + 3, y, T.METAL);
    run(g, 0.05, { place: true, aim: { tx: x + 3, ty: y - 1 } });
    expect(g.world.get(x + 3, y - 1)).toBe(T.AIR);
    run(g, 0.6);
    run(g, 0.05, { place: true, aim: { tx: x + 2, ty: y - 1 } });
    expect(g.world.get(x + 2, y - 1)).toBe(T.SAPLING);
    expect(g.world.saplings.size).toBe(1);
    // Saplings persist with their timer.
    const g2 = reload(g);
    expect(g2.world.get(x + 2, y - 1)).toBe(T.SAPLING);
    expect(g2.world.saplings.size).toBe(1);
    stepSaplings(g2.world, 200);
    expect(g2.world.get(x + 2, y - 1)).toBe(T.TRUNK);
    expect(g2.world.saplings.size).toBe(0);
  });

  it('a sapling with no room waits instead of growing into rock', () => {
    const g = new Game(defaultSave());
    const { x, y } = flat(g, 70);
    const sx = x + 2;
    g.world.set(sx, y - 1, T.SAPLING);
    g.world.saplings.set((y - 1) * g.world.w + sx, 1);
    g.world.set(sx, y - 4, T.METAL);
    stepSaplings(g.world, 2);
    expect(g.world.get(sx, y - 1)).toBe(T.SAPLING);
  });
});

describe('fishing', () => {
  function pond(g: Game): { x: number; y: number } {
    const { x, y } = flat(g, 80);
    for (let xx = x + 3; xx <= x + 8; xx++) {
      for (let yy = y; yy < y + 3; yy++) g.world.set(xx, yy, T.WATER);
      g.world.set(xx, y + 3, T.METAL);
    }
    g.world.set(x + 9, y, T.RUST);
    return { x, y };
  }

  it('casts at water, bites after a delay, and a click in the window lands a catch', () => {
    const g = new Game(defaultSave());
    const { x, y } = pond(g);
    g.setTool('rod');
    g.carried = {};
    run(g, 0.05, { dig: true, aim: { tx: x + 5, ty: y - 1 } });
    run(g, 0.05);
    expect(g.fishing).not.toBeNull();
    expect(g.fishing?.y).toBe(y);
    // Wait until it bites.
    let guard = 0;
    while ((g.fishing?.bite ?? 0) <= 0 && guard++ < 600) run(g, 1 / 60);
    expect(g.fishing?.bite).toBeGreaterThan(0);
    run(g, 0.05, { dig: true, aim: { tx: x + 5, ty: y - 1 } });
    expect(g.fishing).toBeNull();
    expect(invTotal(g.carried)).toBeGreaterThan(0);
  });

  it('clicking before the bite just reels in; missing the window lets it get away', () => {
    const g = new Game(defaultSave());
    const { x, y } = pond(g);
    g.setTool('rod');
    run(g, 0.05, { dig: true, aim: { tx: x + 5, ty: y - 1 } });
    run(g, 0.05);
    run(g, 0.05, { dig: true, aim: { tx: x + 5, ty: y - 1 } });
    expect(g.fishing).toBeNull();
    expect(g.drainEvents().some((e) => e.t === 'reel')).toBe(true);
    run(g, 0.05);
    run(g, 0.05, { dig: true, aim: { tx: x + 5, ty: y - 1 } });
    run(g, 0.05);
    let guard = 0;
    while ((g.fishing?.bite ?? 0) <= 0 && guard++ < 600) run(g, 1 / 60);
    run(g, BITE_WINDOW + 0.1);
    expect(g.fishing?.bite ?? 0).toBe(0);
    expect(g.fishing).not.toBeNull();
  });

  it('cannot cast onto dry ground or out of range; switching tools breaks the line', () => {
    const g = new Game(defaultSave());
    const { x, y } = pond(g);
    expect(castTarget(g.world, g.body.x, g.body.y, x - 3, y - 1)).toBeNull();
    expect(castTarget(g.world, g.body.x, g.body.y, x + 5, y - 1)).toEqual({ x: x + 5, y });
    expect(castTarget(g.world, g.body.x - 30, g.body.y, x + 5, y - 1)).toBeNull();
    g.setTool('rod');
    run(g, 0.05, { dig: true, aim: { tx: x + 5, ty: y - 1 } });
    g.setTool('drill');
    run(g, 0.05);
    expect(g.fishing).toBeNull();
  });

  it('catches are deterministic and mostly fish', () => {
    let fish = 0;
    for (let c = 0; c < 200; c++) {
      const a = catchFor(7, c, 0, false);
      expect(a).toEqual(catchFor(7, c, 0, false));
      if (a.item === 'fish' || a.item === 'glowfish') fish++;
    }
    expect(fish).toBeGreaterThan(120);
  });

  it('eating fish heals', () => {
    const g = new Game(defaultSave());
    g.hp = 10;
    g.carried = { fish: 1 };
    expect(g.useItem('fish')).toBe(true);
    expect(g.hp).toBe(10 + (FOOD.fish?.hp ?? 0));
    expect(g.useItem('fish')).toBe(false);
    expect(g.useItem('rust')).toBe(false);
  });
});

describe('save v8', () => {
  it('migrates a v7 world diff (no chests or saplings)', () => {
    const v7 = { ...defaultSave(), v: 7, world: { tiles: '', walls: '', fog: '1' } };
    const s = parseSave(JSON.stringify(v7));
    expect(s.v).toBe(SAVE_VERSION);
    // Only the generated sky-island chests (pre-filled at worldgen) are known; nothing else was opened.
    // (The v7 world keeps the legacy size, so compare with a fresh world of that size.)
    const ref = { ...defaultSave(), worldSize: { w: 1400, h: 420 } };
    expect(new Game(s).world.chests.size).toBe(new Game(ref).world.chests.size);
  });
});
