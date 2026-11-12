import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T, TILES } from '../src/sim/tiles';
import { PATH_NODES, clearLine, findPath } from '../src/sim/dronepath';
import { listBays, stepFieldDrones, syncDrones, type DroneCtx } from '../src/sim/drones';

/** Open 80x60 world with a rock floor from row 30 and a wall at x = 36 from the top to row 27 (gap at rows 28-29). */
function walled(): World {
  const w = new World(80, 60, 1);
  Object.assign(w, { padY: 20 });
  for (let y = 30; y < 60; y++) for (let x = 0; x < 80; x++) w.set(x, y, T.RUST);
  for (let y = 0; y <= 27; y++) w.set(36, y, T.RUST);
  w.set(42, 19, T.DRONE);
  return w;
}

const solidAt = (w: World, x: number, y: number): boolean => TILES[w.get(Math.floor(x), Math.floor(y))].solid;

describe('drone pathing (bounded A*)', () => {
  it('clearLine sees the wall', () => {
    const w = walled();
    expect(clearLine(w, 30.5, 10.5, 40.5, 10.5)).toBe(false);
    expect(clearLine(w, 30.5, 10.5, 35.5, 12.5)).toBe(true);
  });

  it('routes around a wall through open, adjacent cells without cutting corners', () => {
    const w = walled();
    const p = findPath(w, 40.5, 10.5, 30.5, 10.5);
    expect(p).not.toBeNull();
    const path = p ?? [];
    let prev = { x: 40.5, y: 10.5 };
    for (const q of path) {
      expect(solidAt(w, q.x, q.y)).toBe(false);
      const dx = Math.round(q.x - prev.x);
      const dy = Math.round(q.y - prev.y);
      expect(Math.max(Math.abs(dx), Math.abs(dy))).toBe(1);
      if (dx !== 0 && dy !== 0) {
        expect(solidAt(w, prev.x + dx, prev.y)).toBe(false);
        expect(solidAt(w, prev.x, prev.y + dy)).toBe(false);
      }
      prev = q;
    }
    expect(Math.floor(prev.x)).toBe(30);
    expect(Math.floor(prev.y)).toBe(10);
    // A detour (over the top or through the gap), never the 10-cell straight line through the wall.
    expect(path.length).toBeGreaterThan(12);
  });

  it('is deterministic', () => {
    const w = walled();
    expect(findPath(w, 40.5, 10.5, 30.5, 10.5)).toEqual(findPath(w, 40.5, 10.5, 30.5, 10.5));
  });

  it('gives up (null) on a sealed goal within the node cap', () => {
    const w = walled();
    for (let y = 8; y <= 12; y++) for (let x = 8; x <= 12; x++) w.set(x, y, x === 10 && y === 10 ? T.AIR : T.RUST);
    expect(findPath(w, 20.5, 10.5, 10.5, 10.5)).toBeNull();
    expect(findPath(w, 20.5, 10.5, 10.5, 10.5, PATH_NODES * 10)).toBeNull();
  });

  it('a solid goal ends next to it, and a start inside a block steps out first', () => {
    const w = walled();
    w.set(44, 15, T.RUST);
    const p = findPath(w, 30.5, 20.5, 44.5, 15.5) ?? [];
    const last = p[p.length - 1];
    expect(Math.abs(Math.floor(last.x) - 44)).toBeLessThanOrEqual(1);
    expect(Math.abs(Math.floor(last.y) - 15)).toBeLessThanOrEqual(1);
    const out = findPath(w, 44.5, 15.5, 30.5, 20.5) ?? [];
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]).toEqual({ x: 44.5, y: 14.5 });
  });

  it('a buried start returns null', () => {
    const w = walled();
    expect(findPath(w, 5.5, 45.5, 5.5, 10.5)).toBeNull();
  });
});

describe('field drones fly around rock', () => {
  function ctx(world: World, over: Partial<DroneCtx> = {}): DroneCtx {
    return { world, px: 30.5, py: 30, atBase: false, powered: true, enemies: [], carried: {}, stash: {}, ...over };
  }

  it('a guard drone reaches the player behind a wall without entering rock', () => {
    const w = walled();
    const drones = syncDrones([], listBays(w), { '2,1': 'guard' });
    const c = ctx(w);
    let inRock = 0;
    for (let i = 0; i < 30 * 6; i++) {
      stepFieldDrones(drones, c, 1 / 30);
      const d = drones[0];
      if (Math.hypot(d.x - 42.5, d.y - 19.3) > 1 && solidAt(w, d.x, d.y)) inRock++;
    }
    expect(inRock).toBe(0);
    const d = drones[0];
    expect(Math.hypot(d.x - 29.3, d.y - 27.4)).toBeLessThan(0.3);
  });

  it('and flies home around it too, docking at the bay', () => {
    const w = walled();
    const drones = syncDrones([], listBays(w), { '2,1': 'guard' });
    const c = ctx(w);
    for (let i = 0; i < 30 * 6; i++) stepFieldDrones(drones, c, 1 / 30);
    c.powered = false;
    let inRock = 0;
    for (let i = 0; i < 30 * 6; i++) {
      stepFieldDrones(drones, c, 1 / 30);
      const d = drones[0];
      if (Math.hypot(d.x - 42.5, d.y - 19.3) > 1 && solidAt(w, d.x, d.y)) inRock++;
    }
    expect(inRock).toBe(0);
    expect(drones[0].mode).toBe('dock');
  });

  it('in a one-tile tunnel the follow spot tucks in at the shoulder instead of the rock above', () => {
    const w = walled();
    // Roof the floor at row 28 near the player: only rows 29 is open (player stands in a crawlway).
    for (let x = 20; x <= 34; x++) w.set(x, 28, T.RUST);
    const drones = syncDrones([], listBays(w), { '2,1': 'guard' });
    drones[0].x = 31.5;
    drones[0].y = 29.5;
    drones[0].mode = 'follow';
    const c = ctx(w);
    for (let i = 0; i < 30 * 2; i++) stepFieldDrones(drones, c, 1 / 30);
    expect(solidAt(w, drones[0].x, drones[0].y)).toBe(false);
  });
});
