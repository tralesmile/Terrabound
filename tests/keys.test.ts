import { describe, it, expect } from 'vitest';
import { BINDS, BIND_IDS, bindable, boundTo, cleanKeys, DEFAULT_KEYS, keyLabel, rebind } from '../src/sim/keys';
import { defaultSave, parseSave, SAVE_VERSION } from '../src/sim/save';
import { Game } from '../src/sim/game';

describe('key bindings', () => {
  it('defaults are unique and match the classic layout', () => {
    expect(new Set(Object.values(DEFAULT_KEYS)).size).toBe(BINDS.length);
    expect(DEFAULT_KEYS.left).toBe('KeyA');
    expect(DEFAULT_KEYS.jump).toBe('KeyW');
    expect(DEFAULT_KEYS.interact).toBe('KeyE');
  });

  it('rebinding to a used key swaps, so nothing is left unbound', () => {
    const m = rebind(DEFAULT_KEYS, 'jump', 'KeyE');
    expect(m.jump).toBe('KeyE');
    expect(m.interact).toBe('KeyW');
    expect(new Set(Object.values(m)).size).toBe(BINDS.length);
    expect(boundTo(m, 'KeyE')).toBe('jump');
    expect(boundTo(m, 'KeyW')).toBe('interact');
  });

  it('reserved keys cannot be bound', () => {
    expect(bindable('Escape')).toBe(false);
    expect(bindable('Tab')).toBe(false);
    expect(bindable('')).toBe(false);
    expect(rebind(DEFAULT_KEYS, 'jump', 'Escape')).toEqual(DEFAULT_KEYS);
    expect(bindable('Space')).toBe(true);
  });

  it('junk or duplicate saved bindings fall back safely', () => {
    expect(cleanKeys(undefined)).toEqual(DEFAULT_KEYS);
    expect(cleanKeys('nope')).toEqual(DEFAULT_KEYS);
    expect(cleanKeys({ jump: 42, left: 'Escape', bogus: 'KeyZ' })).toEqual(DEFAULT_KEYS);
    expect(cleanKeys({ jump: 'Space' }).jump).toBe('Space');
    // Two actions on one key would make one unreachable: reset everything.
    expect(cleanKeys({ jump: 'KeyA' })).toEqual(DEFAULT_KEYS);
  });

  it('short key labels', () => {
    expect(keyLabel('KeyA')).toBe('A');
    expect(keyLabel('Digit7')).toBe('7');
    expect(keyLabel('ShiftLeft')).toBe('L-SHIFT');
    expect(keyLabel('ControlRight')).toBe('R-CTRL');
    expect(keyLabel('ArrowUp')).toBe('UP');
    expect(keyLabel('Space')).toBe('SPACE');
    expect(keyLabel('BracketLeft')).toBe('BRACKET LEFT');
  });

  it('a v21 save gets default bindings (migration)', () => {
    const v21 = { ...defaultSave(), v: 21 } as Record<string, unknown>;
    const se = { ...(v21.settings as Record<string, unknown>) };
    delete se.keys;
    v21.settings = se;
    const s = parseSave(JSON.stringify(v21));
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.settings.keys).toEqual(DEFAULT_KEYS);
  });

  it('bindings round-trip through a save and reset', () => {
    const g = new Game(defaultSave(3));
    g.rebindKey('left', 'KeyJ');
    g.rebindKey('right', 'KeyL');
    const back = parseSave(JSON.stringify(g.toSave()));
    expect(back.settings.keys.left).toBe('KeyJ');
    expect(back.settings.keys.right).toBe('KeyL');
    expect(g.resetKeys()).toEqual(DEFAULT_KEYS);
    for (const id of BIND_IDS) expect(typeof g.keys[id]).toBe('string');
  });
});
