import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T, TILES, ITEMS, PLACEABLE } from '../src/sim/tiles';
import { WALL_MOUNTED, mountOk, roomAt, COMFORT_MAX } from '../src/sim/rooms';
import { BASE_KEEP } from '../src/sim/base';
import { recipeById } from '../src/sim/recipes';
import { computeLight } from '../src/render/lightmap';
import { iconDef } from '../src/render/icons';
import { TILE_COLORS } from '../src/render/sprites';
import { defaultSave } from '../src/sim/save';
import { Game, NO_CONTROLS, CLIMB_UP, LIFT_MUL, type Controls } from '../src/sim/game';

function flat(): World {
  const w = new World(120, 60, 7);
  Object.assign(w, { padX: 60, padY: 20 });
  for (let y = 20; y < 60; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
  return w;
}

function box(w: World, x0: number, y0: number, x1: number, y1: number, t: number = T.METAL): void {
  for (let x = x0; x <= x1; x++) {
    w.set(x, y0, t);
    w.set(x, y1, t);
  }
  for (let y = y0; y <= y1; y++) {
    w.set(x0, y, t);
    w.set(x1, y, t);
  }
}

/** A cleared 9x5 pocket above the pad with the player standing at its left. */
function pocket(): Game {
  const g = new Game(defaultSave());
  const w = g.world;
  for (let y = w.padY - 6; y <= w.padY - 1; y++) for (let x = w.padX - 4; x <= w.padX + 4; x++) {
    w.set(x, y, T.AIR);
    w.setWall(x, y, 0);
  }
  g.body.x = w.padX - 3 + 0.5;
  g.body.y = w.padY;
  g.step(1 / 30, NO_CONTROLS);
  return g;
}

function place(g: Game, id: 'screen' | 'banner' | 'lift' | 'window', tx: number, ty: number): void {
  g.carried[id] = (g.carried[id] ?? 0) + 1;
  g.selected = id;
  g.step(1 / 30, { ...NO_CONTROLS, place: true, aim: { tx, ty } } as Controls);
  for (let i = 0; i < 20; i++) g.step(1 / 30, NO_CONTROLS);
}

describe('window and lift content', () => {
  it('both are placeable, kept, craftable, coloured and have icons', () => {
    for (const [t, id] of [[T.WINDOW, 'window'], [T.LIFT, 'lift']] as const) {
      expect(TILES[t].drop).toBe(id);
      expect(ITEMS[id].places).toBe(t);
      expect(PLACEABLE).toContain(id);
      expect(BASE_KEEP.has(t)).toBe(true);
      expect(recipeById(id)?.out).toBe(id);
      expect(TILE_COLORS[t]).toBeDefined();
      const icon = iconDef(id);
      expect(icon.rows.length).toBe(12);
      for (const r of icon.rows) {
        expect(r.length, `${id}: "${r}"`).toBe(12);
        for (const ch of r) if (ch !== ' ' && ch !== 'o' && ch !== 'w') expect(icon.pal[ch], `${id} '${ch}'`).toBeDefined();
      }
    }
    expect(TILES[T.WINDOW].solid).toBe(true);
    expect(TILES[T.LIFT].solid).toBe(false);
    expect(TILES[T.LIFT].climb).toBe(true);
  });
});

describe('windows', () => {
  it('close a room like a wall and add one comfort for the view (capped)', () => {
    const w = flat();
    box(w, 50, 14, 57, 20);
    const before = roomAt(w, 52, 18);
    expect(before?.view).toBe(false);
    w.set(50, 16, T.WINDOW);
    w.set(50, 17, T.WINDOW);
    const r = roomAt(w, 52, 18);
    expect(r).not.toBeNull();
    expect(r?.cells.length).toBe(before?.cells.length);
    expect(r?.view).toBe(true);
    expect(r?.comfort).toBe((before?.comfort ?? 0) + 1);
    // Full decor plus a view never passes the cap.
    for (const [x, t] of [[51, T.SCREEN], [52, T.POT_PLANT], [53, T.BANNER], [54, T.CHAIR]] as const) w.set(x, 19, t);
    expect(roomAt(w, 55, 18)?.comfort).toBe(COMFORT_MAX);
  });

  it('let light through where a metal wall would not', () => {
    const w = flat();
    // Deep underground column: a light source behind a 1-tile wall at x=30.
    for (let x = 25; x <= 35; x++) w.set(x, 40, T.AIR);
    const src = [{ x: 27, y: 40, level: 40 }];
    w.set(30, 40, T.METAL);
    const dark = computeLight(w, 20, 35, 20, 10, src, 0);
    w.set(30, 40, T.WINDOW);
    const lit = computeLight(w, 20, 35, 20, 10, src, 0);
    const k = (40 - 35) * 20 + (33 - 20);
    expect(lit.levels[k]).toBeGreaterThan(dark.levels[k]);
  });
});

describe('wall-mounted furniture', () => {
  it('screens and banners need a back wall, or a block above or beside; floors alone are not enough', () => {
    const w = flat();
    expect(WALL_MOUNTED.has(T.SCREEN) && WALL_MOUNTED.has(T.BANNER)).toBe(true);
    expect(mountOk(w, 50, 19, T.SCREEN)).toBe(false); // only the floor below
    expect(mountOk(w, 50, 19, T.LAMP)).toBe(true); // floor pieces are unaffected
    w.setWall(50, 19, 3);
    expect(mountOk(w, 50, 19, T.SCREEN)).toBe(true);
    expect(mountOk(w, 52, 18, T.BANNER)).toBe(false);
    w.set(52, 17, T.METAL);
    expect(mountOk(w, 52, 18, T.BANNER)).toBe(true); // hangs from a ceiling block
    w.set(55, 18, T.METAL);
    expect(mountOk(w, 54, 18, T.BANNER)).toBe(true); // or a side wall
  });

  it('in the game: a screen on a bare floor is refused with a hint, on a back wall it goes up', () => {
    const g = pocket();
    const w = g.world;
    const tx = w.padX + 1;
    const ty = w.padY - 1;
    g.drainEvents();
    place(g, 'screen', tx, ty);
    const events = g.drainEvents().map((e) => e.t);
    expect(w.get(tx, ty)).toBe(T.AIR);
    expect(g.carried.screen).toBe(1);
    expect(events).toContain('nomount');
    w.setWall(tx, ty, 3);
    place(g, 'screen', tx, ty);
    expect(w.get(tx, ty)).toBe(T.SCREEN);
  });
});

describe('lift shafts', () => {
  it('stack into the air from the one below and ride 3x ladder speed', () => {
    const g = pocket();
    const w = g.world;
    const x = w.padX - 1;
    // Shaft from the floor up 5 cells: each new piece hangs on the one below (no wall beside it).
    for (let y = w.padY - 1; y >= w.padY - 5; y--) place(g, 'lift', x, y);
    for (let y = w.padY - 5; y <= w.padY - 1; y++) expect(w.get(x, y), `row ${y}`).toBe(T.LIFT);
    expect(g.onLift()).toBe(false);
    g.body.x = x + 0.5;
    g.step(1 / 30, NO_CONTROLS);
    expect(g.onLift()).toBe(true);
    g.step(1 / 30, { ...NO_CONTROLS, jump: true });
    expect(g.body.vy).toBeCloseTo(-CLIMB_UP * LIFT_MUL);
    const y0 = g.body.y;
    for (let i = 0; i < 10; i++) g.step(1 / 30, { ...NO_CONTROLS, jump: true });
    expect(y0 - g.body.y).toBeGreaterThan(3);
  });

  it('a shaft closes the rooms beside it like a door', () => {
    const w = flat();
    box(w, 50, 14, 58, 20);
    for (let y = 15; y <= 19; y++) w.set(54, y, T.LIFT);
    const left = roomAt(w, 52, 18);
    const right = roomAt(w, 56, 18);
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(left?.cells.length).toBe(3 * 5);
    expect(left?.cells).not.toContain(18 * w.w + 56);
  });
});
