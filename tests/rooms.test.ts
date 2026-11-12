import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T, TILES, ITEMS, PLACEABLE } from '../src/sim/tiles';
import { FURNITURE, ROOM_MAX, ROOM_MIN, findRooms, roomAt, roomHint } from '../src/sim/rooms';
import { BASE_KEEP, captureBase, stampBase } from '../src/sim/base';
import { recipeById } from '../src/sim/recipes';
import { FURNITURE_ART, screenLines } from '../src/render/furniture';
import { defaultSave } from '../src/sim/save';
import { Game, NO_CONTROLS } from '../src/sim/game';

/** Open 120x60 world, pad at (60, 20), flat floor at row 20. */
function flat(): World {
  const w = new World(120, 60, 7);
  Object.assign(w, { padX: 60, padY: 20 });
  for (let y = 20; y < 60; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
  return w;
}

/** A box of metal walls from (x0, y0) to (x1, y1) inclusive (walls on the border, open inside). */
function box(w: World, x0: number, y0: number, x1: number, y1: number): void {
  for (let x = x0; x <= x1; x++) {
    w.set(x, y0, T.METAL);
    w.set(x, y1, T.METAL);
  }
  for (let y = y0; y <= y1; y++) {
    w.set(x0, y, T.METAL);
    w.set(x1, y, T.METAL);
  }
}

describe('furniture', () => {
  it('every furniture piece is a non-solid, minable, placeable, kept, craftable item with art', () => {
    for (const t of FURNITURE) {
      const d = TILES[t];
      expect(d.solid, d.name).toBe(false);
      expect(d.minable, d.name).toBe(true);
      const id = d.drop;
      expect(id).not.toBeNull();
      if (!id) continue;
      expect(ITEMS[id].places).toBe(t);
      expect(PLACEABLE).toContain(id);
      expect(BASE_KEEP.has(t)).toBe(true);
      expect(recipeById(id)?.out).toBe(id);
      const art = FURNITURE_ART[t];
      expect(art.rows.length).toBe(16);
      for (const r of art.rows) {
        expect(r.length, `${d.name}: "${r}"`).toBe(16);
        for (const ch of r) if (ch !== ' ') expect(art.pal[ch], `${d.name} '${ch}'`).toBeDefined();
      }
    }
    expect(FURNITURE.size).toBe(6);
  });
  it('a lamp lights like a torch, and stops when removed', () => {
    const w = flat();
    w.set(60, 18, T.LAMP);
    expect(w.torches.has(18 * w.w + 60)).toBe(true);
    expect(w.lightAt(60.5, 18.5)).toBeGreaterThan(0.9);
    w.set(60, 18, T.AIR);
    expect(w.torches.size).toBe(0);
  });
  it('furniture survives a base capture and restore', () => {
    const w = flat();
    w.set(58, 19, T.BED);
    w.set(59, 19, T.TABLE);
    const saved = captureBase(w);
    const w2 = flat();
    stampBase(w2, saved);
    expect(w2.get(58, 19)).toBe(T.BED);
    expect(w2.get(59, 19)).toBe(T.TABLE);
  });
  it('the screen readout changes over time and stays inside the screen', () => {
    const a = screenLines(0, 3);
    const b = screenLines(0.8, 3);
    expect(a).not.toEqual(b);
    for (const n of [...a, ...b]) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(9);
    }
  });
});

describe('rooms', () => {
  it('an enclosed box is a room; an open one is not', () => {
    const w = flat();
    // 6 wide x 5 tall outer box at x 55..60, y 15..19 (floor is the ground row 20 is outside).
    box(w, 55, 14, 60, 19);
    const r = roomAt(w, 57, 17);
    expect(r).not.toBeNull();
    expect(r?.cells.length).toBe(4 * 4);
    expect(r?.x0).toBe(56);
    expect(r?.y1).toBe(18);
    w.set(57, 14, T.AIR); // hole in the roof: leaks to the sky
    expect(roomAt(w, 57, 17)).toBeNull();
  });
  it('doors and platforms close a room', () => {
    const w = flat();
    box(w, 55, 14, 60, 19);
    w.set(55, 18, T.DOOR);
    w.set(57, 14, T.PLATFORM);
    expect(roomAt(w, 57, 17)).not.toBeNull();
  });
  it('a pocket larger than ROOM_MAX is not a room', () => {
    const w = flat();
    box(w, 40, 5, 60, 19);
    expect((19 * 13)).toBeGreaterThan(ROOM_MAX);
    expect(roomAt(w, 50, 10)).toBeNull();
  });
  it('a valid home needs space, a light, a table and a bed', () => {
    const w = flat();
    box(w, 55, 14, 60, 19);
    let r = roomAt(w, 57, 17);
    expect(r?.valid).toBe(false);
    expect(r?.missing).toEqual(['a light', 'a table', 'a bed']);
    expect(roomHint(r ?? null)).toContain('needs a light, a table, a bed');
    w.set(56, 18, T.BED);
    w.set(57, 18, T.TABLE);
    w.set(59, 16, T.TORCH);
    r = roomAt(w, 57, 17);
    expect(r?.valid).toBe(true);
    expect(r?.comfort).toBe(0);
    w.set(58, 18, T.POT_PLANT);
    w.set(57, 16, T.SCREEN);
    w.set(56, 15, T.BANNER);
    expect(roomAt(w, 57, 17)?.comfort).toBe(3);
    expect(roomHint(roomAt(w, 57, 17))).toContain('Room ready');
    // A tiny 2x2 closet is too small even when furnished.
    const w2 = flat();
    box(w2, 55, 16, 58, 19);
    const tiny = roomAt(w2, 56, 18);
    expect(tiny?.cells.length).toBeLessThan(ROOM_MIN);
    expect(tiny?.missing).toContain('more space');
  });
  it('findRooms lists each base room once', () => {
    const w = flat();
    box(w, 53, 14, 58, 19);
    box(w, 58, 14, 63, 19);
    const rooms = findRooms(w);
    expect(rooms.length).toBe(2);
    expect(new Set(rooms.flatMap((r) => r.cells)).size).toBe(32);
  });
});

describe('rooms in the game', () => {
  it('placing the last piece of a home emits roomready and the hint says so', () => {
    const s = defaultSave();
    s.upgrades.fab = 1;
    const g = new Game(s);
    const w = g.world;
    const px = w.padX;
    const py = w.padY;
    // Room on the pad: walls at px-3 and px+3, roof 5 rows up; inside x px-2..px+2, rows py-4..py-1.
    for (let y = py - 5; y <= py - 1; y++) {
      w.set(px - 3, y, T.METAL);
      w.set(px + 3, y, T.METAL);
    }
    for (let x = px - 3; x <= px + 3; x++) w.set(x, py - 5, T.METAL);
    for (let y = py - 4; y <= py - 1; y++) for (let x = px - 2; x <= px + 2; x++) w.set(x, y, T.AIR);
    w.set(px - 2, py - 1, T.BED);
    w.set(px + 2, py - 3, T.TORCH);
    g.body.x = px + 0.5;
    g.body.y = py;
    expect(g.roomHere()?.missing).toEqual(['a table']);
    expect(g.hintAutomation(false)).toContain('needs a table');
    g.carried.table = 1;
    g.selected = 'table';
    g.drainEvents();
    g.step(1 / 30, { ...NO_CONTROLS, place: true, aim: { tx: px + 1, ty: py - 1 } } as typeof NO_CONTROLS);
    expect(w.get(px + 1, py - 1)).toBe(T.TABLE);
    expect(g.drainEvents().some((e) => e.t === 'roomready')).toBe(true);
    expect(g.hintAutomation(false)).toContain('Room ready');
  });
});
