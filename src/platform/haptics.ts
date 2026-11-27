/**
 * Haptics (P12-A mobile feel): short vibrations on phones for the moments that should land in the hand:
 * taking a hit, landing a hit, breaking a block, banking loot. Behind the VIBRATION setting, touch only,
 * rate-limited so a burst of events never buzzes continuously. The pattern table is pure; Haptics wraps
 * navigator.vibrate and is a no-op where it does not exist (desktop, iOS Safari).
 */
import type { GameEvent } from '../sim/game';

/** Vibration pattern (ms, or on/off ms list) per event, or null for none. Pure. */
export function hapticFor(e: GameEvent): number | number[] | null {
  switch (e.t) {
    case 'hurt':
      return e.amount >= 15 ? 45 : 25;
    case 'enemyhit':
      return e.cls === 'blast' || e.cls === 'ram' ? 30 : e.cls === 'melee' || e.cls === undefined ? 14 : e.cls === 'ranged' ? 8 : null;
    case 'enemykill':
      return 22;
    case 'break':
      return 6;
    case 'boom':
      return 50;
    case 'bank':
      return [18, 40, 18];
    case 'death':
      return [60, 50, 90];
    case 'tickburst':
      return e.hit ? 60 : 20;
    case 'shieldblock':
      return 10;
    case 'enemyslam':
      return e.hit ? 60 : 20;
    case 'bossspawn':
      return [40, 60, 40];
    default:
      return null;
  }
}

/** Motor strength 0..1 for a pattern this long: light taps stay gentle, deaths and bosses thump. */
export function rumbleStrength(ms: number): number {
  return Math.min(1, 0.2 + ms / 120);
}

/** Play on the first connected controller that has motors (a no-op elsewhere). */
export function padRumble(ms: number, strength: number): void {
  type Motors = { playEffect?: (type: 'dual-rumble', p: { duration: number; strongMagnitude: number; weakMagnitude: number }) => Promise<unknown> };
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
  for (const g of navigator.getGamepads()) {
    const m = (g as unknown as { vibrationActuator?: Motors } | null)?.vibrationActuator;
    if (!m?.playEffect) continue;
    m.playEffect('dual-rumble', { duration: Math.max(20, ms), strongMagnitude: strength * strength, weakMagnitude: strength }).catch(() => {});
    return;
  }
}

/** Minimum gap between two vibrations (ms); a bigger pattern may cut in early. */
export const HAPTIC_GAP = 70;

export class Haptics {
  enabled = true;
  /** Only phones and tablets vibrate (set from the input mode). */
  touch = false;
  /** A controller is in use: the same patterns drive its rumble motors instead. */
  pad = false;
  private last = -1e9;
  private lastLen = 0;
  constructor(
    private readonly vibrate: ((p: number | number[]) => boolean) | null,
    private readonly rumble: ((ms: number, strength: number) => void) | null = null,
  ) {}

  /** Fire the pattern for this event if allowed. Returns the pattern sent (for tests), or null. */
  fire(e: GameEvent, now: number): number | number[] | null {
    const out = this.pad ? this.rumble : this.touch ? this.vibrate : null;
    if (!this.enabled || !out) return null;
    const p = hapticFor(e);
    if (p === null) return null;
    const len = Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p;
    // Rate limit: small buzzes queue behind each other; a stronger one may interrupt.
    if (now - this.last < HAPTIC_GAP && len <= this.lastLen) return null;
    this.last = now;
    this.lastLen = len;
    try {
      if (this.pad) this.rumble?.(len, rumbleStrength(len));
      else this.vibrate?.(p);
    } catch {
      return null;
    }
    return p;
  }
}
