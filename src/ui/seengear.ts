/** Persisted "seen gear" ids so NEW dots survive a reload. Pure parse/serialise; never throws. */

export function parseSeen(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    return new Set(v.filter((x): x is string => typeof x === 'string').slice(0, 500));
  } catch {
    return null;
  }
}

export function serializeSeen(seen: Set<string>): string {
  return JSON.stringify([...seen].sort());
}
