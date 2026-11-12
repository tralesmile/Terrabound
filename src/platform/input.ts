import type { Controls } from '../sim/game';
import { inStickZone } from '../sim/settings';
import type { Renderer } from '../render/renderer';
import type { UI, UiAction } from '../ui/ui';

interface PointerInfo {
  id: number;
  x: number;
  y: number;
  kind: 'stick' | 'aim';
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
      this.keys.add(e.code);
      if (e.code === 'KeyB' || e.code === 'Tab') {
        e.preventDefault();
        this.onAction({ k: this.ui.shopOpen ? 'close' : 'shop' });
      } else if (e.code === 'KeyM') this.onAction({ k: 'map' });
      else if (e.code === 'KeyN') this.onAction({ k: 'mute' });
      else if (e.code === 'KeyR') this.onAction({ k: 'recall' });
      else if (e.code === 'KeyH') this.onAction({ k: 'heal' });
      else if (e.code === 'Escape') this.onAction({ k: 'close' });
      else if (e.code === 'KeyO') this.onAction({ k: 'settings' });
      else if (e.code === 'KeyQ') this.onAction({ k: 'tool' });
      else if (e.code === 'Digit1') this.onAction({ k: 'settool', t: 'drill' });
      else if (e.code === 'Digit2') this.onAction({ k: 'settool', t: 'blade' });
      else if (e.code === 'Digit3') this.onAction({ k: 'settool', t: 'pistol' });
      else if (e.code === 'Digit4') this.onAction({ k: 'settool', t: 'rod' });
      else if (e.code === 'Digit5') this.onAction({ k: 'settool', t: 'hook' });
      else if (e.code === 'Digit6') this.onAction({ k: 'sel', i: 0 });
      else if (e.code === 'Digit7') this.onAction({ k: 'sel', i: 1 });
      else if (e.code === 'Digit8') this.onAction({ k: 'sel', i: 2 });
      else if (e.code === 'Digit9') this.onAction({ k: 'sel', i: 3 });
      else if (e.code === 'Digit0') this.onAction({ k: 'sel', i: 4 });
      else if (e.code === 'KeyV') this.onAction({ k: 'ride' });
      else if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault();
        this.onAction({ k: 'inv' });
      } else if (e.code === 'KeyE') this.onAction({ k: 'interact' });
      else if (e.code === 'Digit0') this.onAction({ k: 'sel', i: 6 });
      else if (e.code === 'Minus') this.onAction({ k: 'sel', i: 7 });
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
    if (k.has('KeyA') || k.has('ArrowLeft')) moveX -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) moveX += 1;
    let jump = k.has('KeyW') || k.has('ArrowUp') || k.has('Space');
    let down = k.has('KeyS') || k.has('ArrowDown');
    let dig = false;
    let place = false;
    let aimCss: { x: number; y: number } | null = this.mouse.has ? { x: this.mouse.x, y: this.mouse.y } : null;

    for (const p of this.pointers.values()) {
      if (p.kind === 'stick') {
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
    if (this.ui.screen !== 'play' || this.ui.shopOpen) return { moveX: 0, jump: false, dig: false, place: false, aim: null };
    let aim: Controls['aim'] = null;
    if (aimCss) {
      const d = this.dpr();
      const t = this.renderer.screenToTile(aimCss.x * d, aimCss.y * d);
      aim = { tx: t.tx, ty: t.ty };
    }
    const dash = k.has('ShiftLeft') || k.has('ShiftRight') || this.dashTap;
    this.dashTap = false;
    return { moveX, jump, dig, place, aim, down, dash };
  }
}
