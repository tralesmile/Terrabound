/**
 * One-handed touch play: one thumb does everything. A touch that moves becomes the move stick
 * (anywhere on screen), a touch that stays put drills or fires where it is, and holding the stick
 * hard into rock drills it, since there is no second thumb for that. Pure.
 */

export const ONE_HAND = {
  /** A finger that travels this far (CSS px) before the hold time is a move stick. */
  drag: 16,
  /** A finger resting this long (ms) starts drilling or firing under itself. */
  holdMs: 180,
  /** Stick travel (CSS px) that counts as pushing into a block. */
  push: 30,
} as const;

/** What a not-yet-decided touch has become. */
export function classifyTouch(heldMs: number, dx: number, dy: number): 'stick' | 'aim' | 'pending' {
  if (Math.hypot(dx, dy) > ONE_HAND.drag) return 'stick';
  return heldMs >= ONE_HAND.holdMs ? 'aim' : 'pending';
}

export interface DigBody {
  x: number;
  /** Feet. */
  y: number;
  h: number;
}

/**
 * The block a pushed stick drills, or null. Down digs under the feet and up digs overhead. Sideways
 * takes the head-height block first, then the one at the feet, but leaves a one-tile ledge with room
 * above it alone, because walking climbs that by itself. `diggable` excludes anything the player built.
 */
export function stickDig(
  body: DigBody,
  dx: number,
  dy: number,
  solid: (tx: number, ty: number) => boolean,
  diggable: (tx: number, ty: number) => boolean,
): { tx: number; ty: number } | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) <= ONE_HAND.push) return null;
  const col = Math.floor(body.x);
  const head = Math.floor(body.y - body.h + 0.1);
  const feet = Math.floor(body.y - 0.1);
  const pick = (tx: number, ty: number): { tx: number; ty: number } | null => (diggable(tx, ty) ? { tx, ty } : null);
  if (ay > ax) return pick(col, dy > 0 ? Math.floor(body.y + 0.05) : Math.floor(body.y - body.h - 0.4));
  const ahead = Math.floor(body.x + Math.sign(dx) * 0.9);
  for (let ty = head; ty < feet; ty++) if (solid(ahead, ty)) return pick(ahead, ty);
  if (!solid(ahead, feet)) return null;
  // Room to climb: the body fits one tile higher, here and over the ledge.
  const climbs = !solid(ahead, head - 1) && !solid(ahead, feet - 1) && !solid(col, head - 1);
  return climbs ? null : pick(ahead, feet);
}
