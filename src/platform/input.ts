import type { Controls } from '../sim/game';
import { inStickZone } from '../sim/settings';
import { boundTo, DEFAULT_KEYS, type BindId, type KeyMap } from '../sim/keys';
import type { Renderer } from '../render/renderer';
import type { UI, UiAction } from '../ui/ui';

interface PointerInfo {
  id: number;
  x: number;
  y: number;
  kind: 'stick' | 'aim' | 'reel';
  button: number;
  startX: number;
  startY: number;
}

/** Keyboard + mouse + touch. One third of a touch screen (left by default, right if left-handed) is a floating thumbstick; the rest aims and digs. */
export class Input {
  private keys = new Set<string>();
  private pointers = new Map<number, PointerInfo>();
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

  private down(e: PointerEvent): void {
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
      return;
    }
    if (this.ui.shopOpen) return;
    const w = this.canvas.clientWidth;
    const isTouch = e.pointerType === 'touch';
    const kind: PointerInfo['kind'] = isTouch && inStickZone(x, w, this.stickSide) ? 'stick' : 'aim';
    this.pointers.set(e.pointerId, { id: e.pointerId, x, y, kind, button: e.button, startX: x, startY: y });
    this.mouse = { x, y, has: true };
  }

  private move(e: PointerEvent): void {
    const { x, y } = this.css(e);
    if (e.pointerType === 'mouse') this.mouse = { x, y, has: true };
    const p = this.pointers.get(e.pointerId);
    if (p) {
      p.x = x;
      p.y = y;
      if (p.kind === 'aim') this.mouse = { x, y, has: true };
    }
  }

  private up(e: PointerEvent): void {
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

    let reel = false;
    for (const p of this.pointers.values()) {
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
      }
    }
    if (this.ui.screen !== 'play' || this.ui.shopOpen) {
      this.ui.reeling = false;
      return { moveX: 0, jump: false, dig: false, place: false, aim: null };
    }
    let aim: Controls['aim'] = null;
    if (aimCss) {
      const d = this.dpr();
      const t = this.renderer.screenToTile(aimCss.x * d, aimCss.y * d);
      aim = { tx: t.tx, ty: t.ty };
    }
    const dash = k.has(km.dash) || (km.dash === 'ShiftLeft' && k.has('ShiftRight')) || this.dashTap;
    this.dashTap = false;
    this.ui.reeling = reel;
    return { moveX, jump, dig, place, aim, down, dash, reel };
  }
}
