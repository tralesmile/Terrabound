import { describe, it, expect } from 'vitest';
import { decodeSeed, encodeSeed } from '../src/sim/seedcode';
import { Game } from '../src/sim/game';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';

describe('seed codes', () => {
  it('round-trips many seeds including the extremes', () => {
    for (const n of [0, 1, 31, 32, 1337, 123456789, 4294967295, 2147483648]) {
      const c = encodeSeed(n);
      expect(c).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
      expect(decodeSeed(c)).toBe(n);
    }
  });
  it('tolerates case, spaces and look-alike letters', () => {
    const c = encodeSeed(987654321);
    expect(decodeSeed(c.toLowerCase().replace('-', ' '))).toBe(987654321);
  });
  it('rejects any single mistyped character and garbage', () => {
    const c = encodeSeed(555555).replace('-', '');
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    for (let i = 0; i < 8; i++) {
      for (const ch of alphabet) {
        if (ch === c[i]) continue;
        expect(decodeSeed(c.slice(0, i) + ch + c.slice(i + 1))).toBeNull();
      }
    }
    for (const bad of ['', 'abc', '!!!!-!!!!', 'ZZZZ-ZZZZ-ZZ', '12345678901']) expect(decodeSeed(bad)).toBeNull();
  });
});

describe('play a shared world', () => {
  it('two players entering the same code get the same world, and it survives save/load', () => {
    const a = new Game(defaultSave(1));
    const b = new Game(defaultSave(999));
    const code = a.seedCode;
    expect(b.seedCode).not.toBe(code);
    expect(b.newDive(code)).toBe(true);
    expect(b.seedCode).toBe(code);
    expect(b.world.surface[10]).toBe(a.world.surface[10]);
    const again = new Game(parseSave(serializeSave(b.toSave(0))));
    expect(again.seedCode).toBe(code);
  });
  it('rejects an invalid code without touching the world', () => {
    const g = new Game(defaultSave(5));
    const before = g.seedCode;
    expect(g.newDive('nope')).toBe(false);
    expect(g.seedCode).toBe(before);
  });
  it('migrates a v6 save with no worldSeed', () => {
    const s = parseSave(JSON.stringify({ v: 6, seedBase: 7, runs: 2 }));
    expect(s.worldSeed).toBeNull();
    expect(s.runs).toBe(2);
    expect(parseSave(JSON.stringify({ v: 7, worldSeed: 'x' })).worldSeed).toBeNull();
  });
});
