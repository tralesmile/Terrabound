import { describe, expect, it } from 'vitest';
import { HAPTIC_GAP, Haptics, hapticFor } from '../src/platform/haptics';
import { DEFAULT_PREFS, PREFS, cleanPrefs } from '../src/sim/settings';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';

describe('haptics', () => {
  it('maps the moments that matter and ignores the rest', () => {
    expect(hapticFor({ t: 'hurt', amount: 30 })).toBeGreaterThan(hapticFor({ t: 'hurt', amount: 2 }) as number);
    expect(hapticFor({ t: 'enemyhit', x: 0, y: 0, dmg: 5, cls: 'blast' })).toBeGreaterThan(hapticFor({ t: 'enemyhit', x: 0, y: 0, dmg: 5, cls: 'ranged' }) as number);
    expect(hapticFor({ t: 'enemyhit', x: 0, y: 0, dmg: 5, cls: 'defence' })).toBeNull();
    expect(Array.isArray(hapticFor({ t: 'bank', total: 3, trip: {} as never }))).toBe(true);
    expect(hapticFor({ t: 'pickup', item: 'rust', x: 0, y: 0 })).toBeNull();
  });

  it('only vibrates on touch with the setting on, and rate-limits small buzzes', () => {
    const sent: Array<number | number[]> = [];
    const h = new Haptics((p) => {
      sent.push(p);
      return true;
    });
    const brk = { t: 'break', x: 0, y: 0, tile: 1 } as const;
    expect(h.fire(brk, 0)).toBeNull(); // not touch
    h.touch = true;
    expect(h.fire(brk, 0)).toBe(6);
    expect(h.fire(brk, 10)).toBeNull(); // too soon
    expect(h.fire({ t: 'hurt', amount: 30 }, 20)).toBe(45); // a stronger one cuts in
    expect(h.fire(brk, 20 + HAPTIC_GAP + 1)).toBe(6);
    h.enabled = false;
    expect(h.fire(brk, 10_000)).toBeNull();
    expect(sent.length).toBe(3);
  });

  it('is a no-op without navigator.vibrate and never throws', () => {
    const none = new Haptics(null);
    none.touch = true;
    expect(none.fire({ t: 'boom', x: 0, y: 0 } as never, 0)).toBeNull();
    const bad = new Haptics(() => {
      throw new Error('blocked');
    });
    bad.touch = true;
    expect(bad.fire({ t: 'death', lost: 0, medic: false, report: {} as never }, 0)).toBeNull();
  });

  it('VIBRATION is a settings row, on by default; v31 saves migrate with it on', () => {
    expect(PREFS.some((p) => p.key === 'haptics')).toBe(true);
    expect(DEFAULT_PREFS.haptics).toBe(1);
    expect(cleanPrefs({}).haptics).toBe(1);
    expect(cleanPrefs({ haptics: 0 }).haptics).toBe(0);
    expect(cleanPrefs({ haptics: 7 }).haptics).toBe(1);
    const v31 = { ...JSON.parse(serializeSave(defaultSave())), v: 31 };
    delete v31.settings.haptics;
    const s = parseSave(JSON.stringify(v31));
    expect(SAVE_VERSION).toBe(32);
    expect(s.settings.haptics).toBe(1);
    const off = defaultSave();
    off.settings.haptics = 0;
    expect(parseSave(serializeSave(off)).settings.haptics).toBe(0);
  });
});
