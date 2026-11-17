/** localStorage wrapper that never throws (private mode, blocked storage, quota exceeded all degrade to memory). */

const KEY = 'terrabound.save';

let memory: string | null = null;
let persistent = true;

export function loadRaw(): string | null {
  try {
    const v = globalThis.localStorage?.getItem(KEY) ?? null;
    return v ?? memory;
  } catch {
    persistent = false;
    return memory;
  }
}

export function saveRaw(value: string): boolean {
  memory = value;
  try {
    globalThis.localStorage?.setItem(KEY, value);
    persistent = true;
    return true;
  } catch {
    persistent = false;
    return false;
  }
}

export function isPersistent(): boolean {
  return persistent;
}

const SEEN_KEY = 'terrabound.seen';

/** Small side store for UI-only state (seen-gear ids); never throws. */
export function loadSeenRaw(): string | null {
  try {
    return globalThis.localStorage?.getItem(SEEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveSeenRaw(value: string): void {
  try {
    globalThis.localStorage?.setItem(SEEN_KEY, value);
  } catch {
    /* UI-only convenience: losing it just re-flags NEW dots */
  }
}
