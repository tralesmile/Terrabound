/**
 * Controller mapping (W3C "standard" layout). Pure: a snapshot of sticks and buttons in, movement,
 * held actions, one-shot presses and an aim tile out. The browser polling lives in input.ts.
 */

export interface PadSnapshot {
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

export const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 } as const;
const BUTTONS = 16;

/** Sticks rest inside this radius (worn sticks drift). */
export const DEADZONE = 0.25;
/** Triggers count as held past this travel. */
export const TRIGGER = 0.35;

export interface Stick {
  x: number;
  y: number;
}

/** Radial dead zone, rescaled so motion starts at 0 just outside it and reaches 1 at the rim. */
export function stickOf(pad: PadSnapshot, i: 0 | 2): Stick {
  const x = pad.axes[i] ?? 0;
  const y = pad.axes[i + 1] ?? 0;
  const m = Math.hypot(x, y);
  if (!(m > DEADZONE)) return { x: 0, y: 0 };
  const k = Math.min(1, (m - DEADZONE) / (1 - DEADZONE)) / m;
  return { x: x * k, y: y * k };
}

export function heldButtons(pad: PadSnapshot): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < BUTTONS; i++) {
    const b = pad.buttons[i];
    out.push(!!b && (i === PAD.LT || i === PAD.RT ? b.value > TRIGGER : b.pressed));
  }
  return out;
}

/** True when the player is touching the pad at all (switches the game to controller mode). */
export function padInUse(pad: PadSnapshot): boolean {
  const l = stickOf(pad, 0);
  const r = stickOf(pad, 2);
  return l.x !== 0 || l.y !== 0 || r.x !== 0 || r.y !== 0 || heldButtons(pad).some(Boolean);
}

export interface PadPlay {
  moveX: number;
  jump: boolean;
  down: boolean;
  dig: boolean;
  place: boolean;
  dash: boolean;
  /** -1, 0 or 1: the vertical direction held on the left stick or D-pad (aims up or down). */
  vert: number;
  right: Stick;
}

export function padPlay(pad: PadSnapshot, held: readonly boolean[]): PadPlay {
  const l = stickOf(pad, 0);
  const moveX = held[PAD.LEFT] ? -1 : held[PAD.RIGHT] ? 1 : l.x;
  const vert = held[PAD.DOWN] || l.y > 0.6 ? 1 : l.y < -0.6 ? -1 : 0;
  return { moveX, jump: held[PAD.A], down: vert > 0, dig: held[PAD.RT], place: held[PAD.LT], dash: held[PAD.B], vert, right: stickOf(pad, 2) };
}

export interface AimBody {
  x: number;
  /** Feet. */
  y: number;
  h: number;
  face: number;
}

/**
 * The tile a controller aims at. The right stick points anywhere within `reach`. With it at rest
 * the aim is smart: down digs under your feet, up digs overhead, otherwise the tile ahead (head
 * height first, then feet, so holding the trigger and walking clears a tunnel you fit through).
 */
export function padAim(body: AimBody, p: Pick<PadPlay, 'right' | 'vert' | 'moveX'>, reach: number, solid: (tx: number, ty: number) => boolean): { tx: number; ty: number } {
  const cy = body.y - body.h / 2;
  const r = p.right;
  const m = Math.hypot(r.x, r.y);
  if (m > 0) {
    // Gentle tilts stay close; full tilt goes to the edge of reach (never inside your own tile).
    // The 1.75 margin covers snapping to a tile centre (up to 0.71 further out).
    const d = 1 + m * (reach - 1.75);
    return { tx: Math.floor(body.x + (r.x / m) * d), ty: Math.floor(cy + (r.y / m) * d) };
  }
  const col = Math.floor(body.x);
  if (p.vert > 0) return { tx: col, ty: Math.floor(body.y + 0.05) };
  if (p.vert < 0) return { tx: col, ty: Math.floor(body.y - body.h - 0.4) };
  const ahead = Math.floor(body.x + body.face * 0.9);
  const head = Math.floor(body.y - body.h + 0.1);
  const feet = Math.floor(body.y - 0.1);
  for (let ty = head; ty <= feet; ty++) if (solid(ahead, ty)) return { tx: ahead, ty };
  return { tx: ahead, ty: feet };
}

/** Cursor speed in menus, as a share of the screen's short side per second. */
export const CURSOR_SPEED = 0.9;

/** Move the menu cursor with either stick or the D-pad, kept on screen. */
export function stepCursor(c: Stick, pad: PadSnapshot, held: readonly boolean[], dt: number, w: number, h: number): Stick {
  const l = stickOf(pad, 0);
  const r = stickOf(pad, 2);
  const dx = l.x + r.x + (held[PAD.RIGHT] ? 0.6 : 0) - (held[PAD.LEFT] ? 0.6 : 0);
  const dy = l.y + r.y + (held[PAD.DOWN] ? 0.6 : 0) - (held[PAD.UP] ? 0.6 : 0);
  const v = Math.min(w, h) * CURSOR_SPEED * dt;
  return { x: Math.max(0, Math.min(w - 1, c.x + Math.max(-1, Math.min(1, dx)) * v)), y: Math.max(0, Math.min(h - 1, c.y + Math.max(-1, Math.min(1, dy)) * v)) };
}
