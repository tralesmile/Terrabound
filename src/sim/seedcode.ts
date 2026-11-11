/** Shareable world codes: a 32-bit world seed as 7 base-32 characters plus a check character ("ABCD-EFGH"). */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function check(seed: number): string {
  // Position-weighted sum of the seed's 5-bit groups: catches any single mistyped character.
  let sum = 0;
  let s = seed >>> 0;
  for (let i = 0; i < 7; i++) {
    sum += (s & 31) * (2 * i + 1);
    s = Math.floor(s / 32);
  }
  return ALPHABET[sum % 32];
}

export function encodeSeed(seed: number): string {
  const n = seed >>> 0;
  let s = n;
  let body = '';
  for (let i = 0; i < 7; i++) {
    body = ALPHABET[s % 32] + body;
    s = Math.floor(s / 32);
  }
  const full = body + check(n);
  return `${full.slice(0, 4)}-${full.slice(4)}`;
}

/** Parse a pasted code (any case, spaces or dashes, easily confused letters tolerated). Null when invalid. */
export function decodeSeed(text: string): number | null {
  const clean = String(text ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/U/g, 'V');
  if (clean.length !== 8) return null;
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = ALPHABET.indexOf(clean[i]);
    if (d < 0) return null;
    n = n * 32 + d;
  }
  if (n > 4294967295) return null;
  return ALPHABET[ALPHABET.indexOf(clean[7])] === check(n) ? n : null;
}
