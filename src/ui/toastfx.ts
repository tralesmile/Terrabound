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
  { kind: 'record', re: /personal best|record|defeated|trophy/i },
  { kind: 'danger', re: /^raid!|approaches|signal lost|raiders|knocked/i },
  { kind: 'discover', re: /^discovered|moved in|landed|room complete|gate has opened|blueprint/i },
  { kind: 'reward', re: /reward|banked|caught|built|cracked|harvest|\+|repelled|grew|fitted|installed|took/i },
  { kind: 'warn', re: /low|full|cannot|not |no |first|needs|cancel|return to|nothing|lost|retreat|withdrew|moved out/i },
  { kind: 'home', re: /pad|home|beam/i },
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
