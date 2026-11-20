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
    case 'enemyslam':
      return e.hit ? 60 : 20;
    case 'bossspawn':
      return [40, 60, 40];
    default:
      return null;
  }
}

/** Minimum gap between two vibrations (ms); a bigger pattern may cut in early. */
export const HAPTIC_GAP = 70;

export class Haptics {
  enabled = true;
  /** Only phones and tablets vibrate (set from the input mode). */
  touch = false;
  private last = -1e9;
  private lastLen = 0;
  constructor(private readonly vibrate: ((p: number | number[]) => boolean) | null) {}

  /** Fire the pattern for this event if allowed. Returns the pattern sent (for tests), or null. */
  fire(e: GameEvent, now: number): number | number[] | null {
    if (!this.enabled || !this.touch || !this.vibrate) return null;
    const p = hapticFor(e);
    if (p === null) return null;
    const len = Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p;
    // Rate limit: small buzzes queue behind each other; a stronger one may interrupt.
    if (now - this.last < HAPTIC_GAP && len <= this.lastLen) return null;
    this.last = now;
    this.lastLen = len;
    try {
      this.vibrate(p);
    } catch {
      return null;
    }
    return p;
  }
}
