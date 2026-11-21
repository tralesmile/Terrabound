/**
 * Hut kit (build slice): one item stamps a small furnished home on flat ground. Seven wide, five tall:
 * panel walls, a brick roof, a window, a two-tile door, plate back walls, a lamp, a table and a bunk bed,
 * so it is a valid robot home the moment it lands. Pure planning (no side effects) so it can be tested.
 */
import { T } from './tiles';
import { W, type World } from './world';

export const HUT_HALF = 3;
export const HUT_H = 5;

export interface HutCell {
  x: number;
  y: number;
  tile: number;
}

/** Tiles a hut may be built over (nothing solid, no machines): plants, leaves, torches and air. */
const CLEARABLE: ReadonlySet<number> = new Set<number>([T.AIR, T.PLANT, T.LEAVES, T.SAPLING, T.TORCH]);

/**
 * Cells for a hut standing on the ground below (x, y): `y` is the floor row (the row of the aimed air cell),
 * so the seven cells under it must be solid and every cell of the footprint must be clear. Null when it does not fit.
 */
export function planHut(world: World, x: number, y: number): { tiles: HutCell[]; walls: { x: number; y: number }[] } | null {
  for (let dx = -HUT_HALF; dx <= HUT_HALF; dx++) {
    if (!world.isSolid(x + dx, y + 1)) return null;
    for (let dy = -(HUT_H - 1); dy <= 0; dy++) if (!CLEARABLE.has(world.get(x + dx, y + dy))) return null;
  }
  const tiles: HutCell[] = [];
  const put = (dx: number, dy: number, tile: number): void => {
    tiles.push({ x: x + dx, y: y + dy, tile });
  };
  for (let dx = -HUT_HALF; dx <= HUT_HALF; dx++) put(dx, -(HUT_H - 1), T.BRICK);
  for (let dy = -(HUT_H - 2); dy <= 0; dy++) put(-HUT_HALF, dy, dy === -2 ? T.WINDOW : T.PANEL);
  put(HUT_HALF, -1, T.DOOR);
  put(HUT_HALF, 0, T.DOOR);
  for (let dy = -(HUT_H - 2); dy <= -2; dy++) put(HUT_HALF, dy, T.PANEL);
  put(0, -(HUT_H - 2), T.LAMP);
  put(-2, 0, T.TABLE);
  put(-1, 0, T.TABLE_END);
  put(1, 0, T.BED);
  put(2, 0, T.BED_FOOT);
  const walls: { x: number; y: number }[] = [];
  for (let dx = -(HUT_HALF - 1); dx <= HUT_HALF - 1; dx++) for (let dy = -(HUT_H - 2); dy <= 0; dy++) walls.push({ x: x + dx, y: y + dy });
  return { tiles, walls };
}

/** Stamp a planned hut into the world (back walls are the panel style). */
export function stampHut(world: World, plan: NonNullable<ReturnType<typeof planHut>>): void {
  for (const w of plan.walls) world.setWall(w.x, w.y, W.PANEL);
  for (const c of plan.tiles) world.set(c.x, c.y, c.tile);
}
