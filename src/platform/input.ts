import type { Controls } from '../sim/game';
import { inStickZone } from '../sim/settings';
import { boundTo, DEFAULT_KEYS, type BindId, type KeyMap } from '../sim/keys';
import type { Renderer } from '../render/renderer';
import type { UI, UiAction } from '../ui/ui';
import { PLACEABLE, type ItemId } from '../sim/tiles';
import { longPressProgress } from './longpress';
import { PAD, heldButtons, padAim, padAssist, padInUse, padPlay, stepCursor, type AimBody, type PadPlay, type PadSnapshot } from './padmap';
import { REACH } from '../sim/game';

/** What controller aiming needs to know about the player and the world. */
export interface PadWorld {
  body: () => AimBody;
  solid: (tx: number, ty: number) => boolean;
}

/** The first connected pad, preferring one the browser maps to the standard layout. */
function browserPad(): PadSnapshot | null {
  const pads = (typeof navigator.getGamepads === 'function' ? [...navigator.getGamepads()] : []).filter((g): g is Gamepad => !!g && g.connected);
  return pads.find((g) => g.mapping === 'standard') ?? pads[0] ?? null;
}

interface PointerInfo {
  id: number;
  x: number;
  y: number;
  kind: 'stick' | 'aim' | 'reel' | 'press';
  /** Long-press on a build-bar slot: item id, start time (ms), and whether it already fired. */
  press?: { id: string; t0: number; fired: boolean };
  button: number;
  /** A finger, not a mouse: the drill gets near-miss assist. */
  touch?: boolean;
  startX: number;
  startY: number;
}

/** Keyboard + mouse + touch. One third of a touch screen (left by default, right if left-handed) is a floating thumbstick; the rest aims and digs. */
export class Input {
  /** A controller is the input in use (any key, click or touch hands control back). */
  padMode = false;
  /** Menu cursor in CSS px while a controller drives menus. */
  padCursor: { x: number; y: number } | null = null;
  /** Tile the controller aimed at in the last read (for the aim box). */
  padTarget: { tx: number; ty: number } | null = null;
  padWorld: PadWorld | null = null;
  private padState: PadPlay | null = null;
  private padPrev: boolean[] = [];
  /** Buttons held across a menu opening or closing stay dead until released. */
  private padBlocked = new Set<number>();
  private padMenu = false;
  private padCursorAt: { x: number; y: number } | null = null;
  /** Down was held at the last read (riding a zipline downward). */
  downHeld = false;
  private keys = new Set<string>();
  private pointers = new Map<number, PointerInfo>();
  /** True while any mouse button or touch is held (hover tips stay quiet while digging or building). */
  get pressing(): boolean {
    return this.pointers.size > 0;
  }
  mouse = { x: 0, y: 0, has: false };
  /** Settings: 0 move stick on the left third, 1 on the right third (left-handed). */
  stickSide = 0;
  /** Settings: desktop key bindings (arrows and Space always move as well). */
  keymap: KeyMap = { ...DEFAULT_KEYS };
  /** Called when the player acts on UI. */
  onAction: (a: UiAction) => void = () => undefined;
  onAnyInput: () => void = () => undefined;

  constructor(
    private canvas: HTMLCanvasElement,
    private ui: UI,
    private renderer: Renderer,
    private dpr: () => number,
  ) {
    window.addEventListener('keydown', (e) => {
      this.leavePad();
      this.onAnyInput();
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      // CONTROLS panel waiting for a key: the next key is the new binding (Esc cancels).
      const arm = this.ui.rebinding;
      if (arm) {
        e.preventDefault();
        if (e.code === 'Escape') this.ui.rebinding = null;
        else this.onAction({ k: 'bindkey', id: arm, code: e.code });
        return;
      }
      this.keys.add(e.code);
      const bound = boundTo(this.keymap, e.code);
      const act = bound ? this.bindAction(bound) : null;
      if (act) {
        e.preventDefault();
        this.onAction(act);
      } else if (bound && this.ui.screen !== 'title') {
        // Movement keys are read every frame in read() (on the title they start the game below).
      } else if (e.code === 'Tab') {
        e.preventDefault();
        this.onAction({ k: this.ui.shopOpen ? 'close' : 'shop' });
      } else if (e.code === 'Escape') this.onAction({ k: 'close' });
      else if (e.code === 'Digit1') this.onAction({ k: 'settool', t: 'drill' });
      else if (e.code === 'Digit2') this.onAction({ k: 'settool', t: 'blade' });
      else if (e.code === 'Digit3') this.onAction({ k: 'settool', t: 'pistol' });
      else if (e.code === 'Digit4') this.onAction({ k: 'settool', t: 'rod' });
      else if (e.code === 'Digit5') this.onAction({ k: 'settool', t: 'hook' });
      else if (e.code === 'Digit6') this.onAction({ k: 'barslot', n: 0 });
      else if (e.code === 'Digit7') this.onAction({ k: 'barslot', n: 1 });
      else if (e.code === 'Digit8') this.onAction({ k: 'barslot', n: 2 });
      else if (e.code === 'Digit9') this.onAction({ k: 'barslot', n: 3 });
      else if (e.code === 'Digit0') this.onAction({ k: 'barslot', n: 4 });
      else if (e.code === 'Minus') this.onAction({ k: 'barslot', n: 5 });
      else if (this.ui.screen === 'title' && !this.ui.settingsOpen) this.onAction({ k: 'start' });
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      // Edge case: focus lost with keys held would leave the player running forever.
      this.keys.clear();
      this.pointers.clear();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e));
    canvas.addEventListener('pointerleave', () => {
      this.mouse.has = false;
    });
  }

  /** The UI action a bound key fires on press (movement binds return null: they are held, not pressed). */
  private bindAction(id: BindId): UiAction | null {
    switch (id) {
      case 'interact':
        return { k: 'interact' };
      case 'inventory':
        return { k: 'inv' };
      case 'shop':
        return { k: this.ui.shopOpen ? 'close' : 'shop' };
      case 'map':
        return { k: 'map' };
      case 'heal':
        return { k: 'heal' };
      case 'detonate':
        return { k: 'detonate' };
      case 'recall':
        return { k: 'recall' };
      case 'ride':
        return { k: 'ride' };
      case 'tool':
        return { k: 'tool' };
      case 'settings':
        return { k: 'settings' };
      case 'mute':
        return { k: 'mute' };
      default:
        return null;
    }
  }

  private css(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private leavePad(): void {
    this.padMode = false;
    this.padCursor = null;
    this.padState = null;
    this.padTarget = null;
  }

  /**
   * Poll the controller once a frame. In play it feeds read() and fires one-shot actions; in menus
   * (`menu`) the sticks move a cursor and A clicks it, so every screen works without extra code.
   * Returns true when the player has just picked the controller up.
   */
  pollPad(dt: number, menu: boolean, snap: PadSnapshot | null = browserPad()): boolean {
    if (!snap) {
      if (this.padMode) this.leavePad();
      this.padPrev = [];
      return false;
    }
    const held = heldButtons(snap);
    let started = false;
    if (!this.padMode) {
      // Only a fresh press or a pushed stick takes over, so a pad resting on the desk never does.
      const fresh = held.some((h, i) => h && !this.padPrev[i]) || padInUse({ axes: snap.axes, buttons: [] });
      if (!fresh) {
        this.padPrev = held;
        return false;
      }
      this.padMode = true;
      this.mouse.has = false;
      started = true;
    }
    if (menu !== this.padMenu) {
      held.forEach((h, i) => {
        if (h && this.padPrev[i]) this.padBlocked.add(i);
      });
      this.padMenu = menu;
    }
    for (const i of this.padBlocked) if (!held[i]) this.padBlocked.delete(i);
    const live = held.map((h, i) => h && !this.padBlocked.has(i));
    const prev = this.padPrev;
    const pressed = (i: number): boolean => live[i] && !prev[i];
    this.padPrev = held;
    if (live.some(Boolean)) this.onAnyInput();
    if (menu) this.padMenus(dt, snap, live, pressed);
    else this.padActions(snap, live, pressed);
    return started;
  }

  private padMenus(dt: number, snap: PadSnapshot, live: boolean[], pressed: (i: number) => boolean): void {
    this.padState = null;
    this.padTarget = null;
    if (this.ui.screen === 'title' && !this.ui.settingsOpen) {
      this.padCursor = null;
      if (pressed(PAD.A) || pressed(PAD.START)) this.onAction({ k: 'start' });
      return;
    }
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.padCursorAt = stepCursor(this.padCursorAt ?? { x: w / 2, y: h / 2 }, snap, live, dt, w, h);
    this.padCursor = this.padCursorAt;
    this.mouse = { ...this.padCursorAt, has: true };
    if (pressed(PAD.A)) {
      const a = this.ui.hit(this.padCursorAt.x, this.padCursorAt.y);
      if (a) this.onAction(a);
    }
    if (pressed(PAD.B) || pressed(PAD.START)) this.onAction({ k: 'close' });
    if (pressed(PAD.Y) && this.ui.invOpen) this.onAction({ k: 'inv' });
    if (pressed(PAD.BACK) && this.ui.mapOpen) this.onAction({ k: 'map' });
    if (pressed(PAD.LB)) this.onAction({ k: 'scroll', d: -1 });
    if (pressed(PAD.RB)) this.onAction({ k: 'scroll', d: 1 });
  }

  private padActions(snap: PadSnapshot, live: boolean[], pressed: (i: number) => boolean): void {
    if (this.padCursor) {
      this.padCursor = null;
      this.mouse.has = false;
    }
    this.padState = padPlay(snap, live);
    const map: [number, UiAction][] = [
      [PAD.X, { k: 'interact' }],
      [PAD.Y, { k: 'inv' }],
      [PAD.RB, { k: 'tool' }],
      [PAD.LB, { k: 'barnext' }],
      [PAD.BACK, { k: 'map' }],
      [PAD.START, { k: 'settings' }],
      [PAD.UP, { k: 'heal' }],
      [PAD.LS, { k: 'ride' }],
      [PAD.RS, { k: 'recall' }],
    ];
    for (const [i, a] of map) if (pressed(i)) this.onAction(a);
  }

  private down(e: PointerEvent): void {
    this.leavePad();
    this.onAnyInput();
    const { x, y } = this.css(e);
    if (e.pointerType === 'touch') this.ui.touch = true;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* not all browsers allow capture on synthetic events */
    }
    if (this.ui.screen === 'title') {
      // The title's cog and the settings panel take taps; anywhere else starts the game.
      const t = this.ui.hit(x, y);
      if (this.ui.settingsOpen || t?.k === 'settings') {
        if (t) this.onAction(t);
        return;
      }
      this.onAction({ k: 'start' });
      return;
    }
    const a = this.ui.hit(x, y);
    if (a && a.k === 'reel') {
      // A hold button: the rope reels in for as long as this finger stays down.
      this.pointers.set(e.pointerId, { id: e.pointerId, x, y, kind: 'reel', button: e.button, startX: x, startY: y });
      return;
    }
    if (a) {
      this.onAction(a);
      // Touch: holding a build-bar slot opens that item's actions (tap still just selects it).
      if (e.pointerType === 'touch' && a.k === 'sel' && this.ui.screen === 'play' && !this.ui.invOpen) {
        const id = PLACEABLE[a.i];
        if (id) this.pointers.set(e.pointerId, { id: e.pointerId, x, y, kind: 'press', button: e.button, startX: x, startY: y, press: { id, t0: performance.now(), fired: false } });
      }
      return;
    }
    if (this.ui.shopOpen) return;
    const w = this.canvas.clientWidth;
    const isTouch = e.pointerType === 'touch';
    const kind: PointerInfo['kind'] = isTouch && inStickZone(x, w, this.stickSide) ? 'stick' : 'aim';
    this.pointers.set(e.pointerId, { id: e.pointerId, x, y, kind, button: e.button, startX: x, startY: y, touch: isTouch });
    this.mouse = { x, y, has: true };
  }

  private move(e: PointerEvent): void {
    const { x, y } = this.css(e);
    if (e.pointerType === 'mouse') {
      if (this.padMode) this.leavePad();
      this.mouse = { x, y, has: true };
    }
    const p = this.pointers.get(e.pointerId);
    if (p) {
      p.x = x;
      p.y = y;
      if (p.kind === 'aim') this.mouse = { x, y, has: true };
    }
  }

  private up(e: PointerEvent): void {
    // iOS only lets sound wake inside some gestures: the end of a tap is one.
    this.onAnyInput();
    this.pointers.delete(e.pointerId);
    if (e.pointerType !== 'mouse') this.mouse.has = false;
  }

  /** Current virtual stick position for drawing, or null. */
  stick(): { ox: number; oy: number; x: number; y: number } | null {
    for (const p of this.pointers.values()) if (p.kind === 'stick') return { ox: p.startX, oy: p.startY, x: p.x, y: p.y };
    return null;
  }

  /** Set by the touch DASH button for one frame. */
  dashTap = false;

  read(): Controls {
    const k = this.keys;
    let moveX = 0;
    const km = this.keymap;
    if (k.has(km.left) || k.has('ArrowLeft')) moveX -= 1;
    if (k.has(km.right) || k.has('ArrowRight')) moveX += 1;
    let jump = k.has(km.jump) || k.has('ArrowUp') || k.has('Space');
    let down = k.has(km.down) || k.has('ArrowDown');
    let dig = false;
    let place = false;
    let aimCss: { x: number; y: number } | null = this.mouse.has ? { x: this.mouse.x, y: this.mouse.y } : null;

    let finger: { x: number; y: number } | null = null;
    let reel = false;
    let pressing: { id: string; k: number } | null = null;
    for (const p of this.pointers.values()) {
      if (p.kind === 'press') {
        const pr = p.press;
        if (!pr || pr.fired) continue;
        const k = longPressProgress(performance.now() - pr.t0, p.x - p.startX, p.y - p.startY);
        if (k < 0) pr.fired = true;
        else if (k >= 1) {
          pr.fired = true;
          this.onAction({ k: 'barhold', id: pr.id as ItemId });
        } else pressing = { id: pr.id, k };
        continue;
      }
      if (p.kind === 'reel') reel = true;
      else if (p.kind === 'stick') {
        const dx = p.x - p.startX;
        const dy = p.y - p.startY;
        const dead = 10;
        if (Math.abs(dx) > dead) moveX = Math.max(-1, Math.min(1, dx / 50));
        if (dy < -28) jump = true;
        if (dy > 28) down = true;
      } else {
        aimCss = { x: p.x, y: p.y };
        const placing = p.button === 2 || this.ui.placeMode;
        if (placing) place = true;
        else dig = true;
        if (!placing && p.touch) {
          const d = this.dpr();
          finger = this.renderer.screenToWorld(p.x * d, p.y * d);
        }
      }
    }
    if (this.ui.screen !== 'play' || this.ui.shopOpen) {
      this.ui.reeling = false;
      this.ui.barPress = null;
      return { moveX: 0, jump: false, dig: false, place: false, aim: null };
    }
    let aim: Controls['aim'] = null;
    let assist: Controls['assist'] = null;
    if (aimCss) {
      const d = this.dpr();
      const t = this.renderer.screenToTile(aimCss.x * d, aimCss.y * d);
      aim = { tx: t.tx, ty: t.ty };
    }
    let dash = k.has(km.dash) || (km.dash === 'ShiftLeft' && k.has('ShiftRight')) || this.dashTap;
    const pad = this.padState;
    this.padTarget = null;
    if (pad && this.padWorld) {
      if (pad.moveX !== 0) moveX = pad.moveX;
      jump ||= pad.jump;
      down ||= pad.down;
      dig ||= pad.dig;
      place ||= pad.place;
      dash ||= pad.dash;
      aim = padAim(this.padWorld.body(), pad, REACH, this.padWorld.solid);
      this.padTarget = aim;
      if (pad.dig) assist = padAssist(pad);
    }
    this.dashTap = false;
    this.ui.reeling = reel;
    this.ui.barPress = pressing;
    this.downHeld = down;
    return { moveX, jump, dig, place, aim, down, dash, reel, finger: pad ? null : finger, assist };
  }
}
