/**
 * Toast presentation: a short kind (picks the icon), an optional head label and a body,
 * plus word wrapping. Pure so it can be unit tested; drawing lives in ui.ts.
 */

export type ToastKind = 'discover' | 'reward' | 'warn' | 'danger' | 'record' | 'home' | 'info';

export interface ToastParts {
  kind: ToastKind;
  /** Small caps label above the body ("DISCOVERED"), or '' for one-part toasts. */
  head: string;
  body: string;
}

const KIND_RULES: { kind: ToastKind; re: RegExp }[] = [
  { kind: 'record', re: /personal best|\brecord\b|defeated|trophy|^award\b/i },
  { kind: 'danger', re: /^raid!|approaches|signal lost|\braiders?\b|knocked/i },
  { kind: 'discover', re: /^discovered|moved in|landed|room complete|gate has opened|blueprint/i },
  { kind: 'reward', re: /^goal done|reward|\bbanked\b|\bcaught\b|\bbuilt\b|cracked|harvest|\+|repelled|\bgrew\b|fitted|installed|\btook\b/i },
  { kind: 'warn', re: /\b(low|full|cannot|not|no|first|needs?|cancelled|return to|nothing|lost|retreat|withdrew|moved out)\b/i },
  { kind: 'home', re: /\bpad\b|\bhome\b|\bbeam/i },
];

/** Heads shorter than this become a label; longer prefixes stay part of the sentence. */
const HEAD_MAX = 22;

export function toastKind(text: string): ToastKind {
  for (const r of KIND_RULES) if (r.re.test(text)) return r.kind;
  return 'info';
}

/** "Discovered: Crystal Flats" -> head DISCOVERED, body "Crystal Flats". */
export function toastParts(text: string): ToastParts {
  const kind = toastKind(text);
  const i = text.indexOf(': ');
  if (i > 0 && i <= HEAD_MAX && i < text.length - 2) {
    return { kind, head: text.slice(0, i).toUpperCase(), body: text.slice(i + 2) };
  }
  return { kind, head: '', body: text };
}

/**
 * Greedy word wrap into at most `maxLines` lines no wider than `maxW` (by `measure`).
 * The last line keeps whatever is left (the caller shrinks it to fit).
 */
export function wrapText(text: string, maxW: number, measure: (s: string) => number, maxLines = 2): string[] {
  const words = text.split(/\s+/).filter((s) => s.length > 0);
  const lines: string[] = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i];
    if (cur && measure(next) > maxW) {
      lines.push(cur);
      if (lines.length === maxLines - 1) {
        lines.push(words.slice(i).join(' '));
        return lines;
      }
      cur = words[i];
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Slide-in offset (fraction of the pill width, 1 = fully off to the left) for a toast `age` seconds old. */
export function toastSlide(age: number): number {
  const t = Math.min(1, Math.max(0, age / 0.18));
  return (1 - t) * (1 - t);
}

/** Where the toast column goes: left-aligned under the HUD text, never reaching the right-hand buttons. */
export function toastColumn(u: number, x: number, buttonsX: number, top: number): { x: number; y: number; maxW: number } {
  return { x, y: top, maxW: Math.max(u * 8, Math.min(u * 22, buttonsX - u * 1.5 - x)) };
}

/** Arrival messages (a new place, its codex gift, an award) that fold into one pill instead of stacking. */
const ARRIVAL = /^(discovered|codex reward|award):/i;

/** Seconds a fresh arrival pill keeps taking follow-up lines. */
export const MERGE_WINDOW = 1.2;
/** Follow-up lines one pill can carry. */
export const MERGE_MAX = 2;

export function isArrival(text: string): boolean {
  return ARRIVAL.test(text);
}

/**
 * Index of the pill an incoming arrival message should join, or -1 to show it on its own.
 * It joins the newest arrival pill that is still fresh and has room.
 */
export function mergeTarget(toasts: readonly { text: string; age: number; extras?: readonly unknown[] }[], text: string): number {
  if (!isArrival(text)) return -1;
  for (let i = toasts.length - 1; i >= 0; i--) {
    const t = toasts[i];
    if (!isArrival(t.text)) continue;
    if (t.age > MERGE_WINDOW || (t.extras?.length ?? 0) >= MERGE_MAX) return -1;
    return i;
  }
  return -1;
}

/** A follow-up line: "Codex reward: 2 Crystal" -> "+ 2 Crystal"; "Award: Blink! Gift in stash: 6 Torch" -> "Award: Blink! +6 Torch". */
export function extraLine(text: string): string {
  const reward = /^codex reward:\s*/i;
  if (reward.test(text)) return `+ ${text.replace(reward, '')}`;
  return text.replace(/!\s*Gift in stash:\s*/i, '! +');
}
