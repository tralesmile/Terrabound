/**
 * Desktop key bindings (settings > CONTROLS). Pure data + helpers, saved in SaveData.settings.keys.
 * Arrow keys and Space always work as extra movement keys; Escape always closes and cannot be bound.
 */

export type BindId =
  | 'left'
  | 'right'
  | 'jump'
  | 'down'
  | 'dash'
  | 'interact'
  | 'inventory'
  | 'shop'
  | 'map'
  | 'heal'
  | 'recall'
  | 'ride'
  | 'tool'
  | 'settings'
  | 'mute';

export type KeyMap = Record<BindId, string>;

/** Rows of the CONTROLS panel, top to bottom, with their default KeyboardEvent.code. */
export const BINDS: readonly { id: BindId; label: string; def: string }[] = [
  { id: 'left', label: 'MOVE LEFT', def: 'KeyA' },
  { id: 'right', label: 'MOVE RIGHT', def: 'KeyD' },
  { id: 'jump', label: 'JUMP / JET', def: 'KeyW' },
  { id: 'down', label: 'DROP DOWN', def: 'KeyS' },
  { id: 'dash', label: 'DASH', def: 'ShiftLeft' },
  { id: 'interact', label: 'USE / OPEN', def: 'KeyE' },
  { id: 'inventory', label: 'INVENTORY', def: 'KeyI' },
  { id: 'shop', label: 'WORKSHOP', def: 'KeyB' },
  { id: 'map', label: 'MAP', def: 'KeyM' },
  { id: 'heal', label: 'QUICK HEAL', def: 'KeyH' },
  { id: 'recall', label: 'BEAM HOME', def: 'KeyR' },
  { id: 'ride', label: 'RIDE VEHICLE', def: 'KeyV' },
  { id: 'tool', label: 'NEXT TOOL', def: 'KeyQ' },
  { id: 'settings', label: 'SETTINGS', def: 'KeyO' },
  { id: 'mute', label: 'SOUND', def: 'KeyN' },
];

export const BIND_IDS: readonly BindId[] = BINDS.map((b) => b.id);

export const DEFAULT_KEYS: KeyMap = Object.fromEntries(BINDS.map((b) => [b.id, b.def])) as KeyMap;

/** Keys that keep a fixed job and cannot be bound. */
const RESERVED = new Set(['Escape', 'Tab', 'MetaLeft', 'MetaRight', 'ContextMenu']);

/** True for a KeyboardEvent.code that may be bound. */
export function bindable(code: string): boolean {
  return /^[A-Za-z0-9]{2,24}$/.test(code) && !RESERVED.has(code);
}

/** Sanitise untrusted saved bindings: unknown ids dropped, bad codes and duplicates reset to defaults. */
export function cleanKeys(v: unknown): KeyMap {
  const out: KeyMap = { ...DEFAULT_KEYS };
  if (!v || typeof v !== 'object') return out;
  const r = v as Record<string, unknown>;
  for (const id of BIND_IDS) {
    const c = r[id];
    if (typeof c === 'string' && bindable(c)) out[id] = c;
  }
  const seen = new Set<string>();
  for (const id of BIND_IDS) {
    if (seen.has(out[id])) return { ...DEFAULT_KEYS };
    seen.add(out[id]);
  }
  return out;
}

/** Bind `id` to `code`. A key already used by another action swaps over, so no action is ever left unbound. */
export function rebind(map: KeyMap, id: BindId, code: string): KeyMap {
  if (!bindable(code)) return map;
  const out = { ...map };
  const other = BIND_IDS.find((b) => b !== id && out[b] === code);
  if (other) out[other] = out[id];
  out[id] = code;
  return out;
}

/** The action a key code is bound to, if any. */
export function boundTo(map: KeyMap, code: string): BindId | null {
  return BIND_IDS.find((b) => map[b] === code) ?? null;
}

/** Short on-screen name for a KeyboardEvent.code ("KeyA" -> "A", "ShiftLeft" -> "L-SHIFT"). */
export function keyLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `NUM ${code.slice(6)}`;
  if (/^Arrow/.test(code)) return code.slice(5).toUpperCase();
  const side = /^(Shift|Control|Alt)(Left|Right)$/.exec(code);
  if (side) return `${side[2] === 'Left' ? 'L' : 'R'}-${side[1] === 'Control' ? 'CTRL' : side[1].toUpperCase()}`;
  return code.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
}
