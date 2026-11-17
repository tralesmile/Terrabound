import { describe, expect, it } from 'vitest';
import { parseSeen, serializeSeen } from '../src/ui/seengear';

describe('seen gear persistence', () => {
  it('round-trips ids', () => {
    const s = new Set(['b', 'a']);
    expect([...parseSeen(serializeSeen(s))!]).toEqual(['a', 'b']);
  });
  it('treats missing or corrupt data as unknown, never throws', () => {
    expect(parseSeen(null)).toBeNull();
    expect(parseSeen('{bad')).toBeNull();
    expect(parseSeen('{"a":1}')).toBeNull();
    expect([...parseSeen('["x",3,null]')!]).toEqual(['x']);
  });
});
