import { describe, expect, it } from 'vitest';
import { defaultSave, parseSave, SAVE_VERSION } from '../src/sim/save';
import { audioGains, cleanPref, DEFAULT_PREFS, PREFS, prefValueLabel, shakeMul, stepPref, uiScale } from '../src/sim/settings';
import { Game } from '../src/sim/game';
import { uiUnit } from '../src/ui/ui';

describe('settings screen prefs', () => {
  it('steps clamp instead of wrapping', () => {
    let p = { ...DEFAULT_PREFS, master: 9 };
    p = stepPref(p, 'master', 1);
    p = stepPref(p, 'master', 1);
    expect(p.master).toBe(10);
    p = { ...p, shake: 0 };
    expect(stepPref(p, 'shake', -1).shake).toBe(0);
    expect(stepPref(p, 'shake', 5).shake).toBe(1);
  });

  it('labels show percent for volumes and names for choices', () => {
    const p = { ...DEFAULT_PREFS, musicVol: 7, shake: 1, uiSize: 2 };
    expect(prefValueLabel(p, 'musicVol')).toBe('70%');
    expect(prefValueLabel(p, 'shake')).toBe('LOW');
    expect(prefValueLabel(p, 'uiSize')).toBe('HUGE');
  });

  it('cleanPref rejects junk and clamps range', () => {
    expect(cleanPref('master', 'loud')).toBe(DEFAULT_PREFS.master);
    expect(cleanPref('master', NaN)).toBe(DEFAULT_PREFS.master);
    expect(cleanPref('master', 99)).toBe(10);
    expect(cleanPref('shake', -3)).toBe(0);
    expect(cleanPref('uiSize', 1.4)).toBe(1);
  });

  it('gains, shake and scale map to sane numbers', () => {
    expect(audioGains({ ...DEFAULT_PREFS, master: 10 }, true).master).toBe(0);
    expect(audioGains({ ...DEFAULT_PREFS, master: 5, sfxVol: 0 }, false)).toEqual({ master: 0.5, music: 0.7, sfx: 0 });
    expect(shakeMul({ ...DEFAULT_PREFS, shake: 0 })).toBe(0);
    expect(shakeMul({ ...DEFAULT_PREFS, shake: 2 })).toBe(1);
    const scales = [0, 1, 2].map((s) => uiScale({ ...DEFAULT_PREFS, uiSize: s }));
    expect(scales[0]).toBe(1);
    expect(scales[1]).toBeGreaterThan(scales[0]);
    expect(scales[2]).toBeGreaterThan(scales[1]);
    expect(uiUnit(1280, 720, scales[2])).toBeGreaterThan(uiUnit(1280, 720, 1));
  });

  it('every pref has a row and a default in range', () => {
    for (const p of PREFS) {
      expect(DEFAULT_PREFS[p.key]).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_PREFS[p.key]).toBeLessThanOrEqual(p.max);
    }
    expect(PREFS.length).toBe(Object.keys(DEFAULT_PREFS).length);
  });

  it('a v18 save migrates to default prefs and keeps its sound toggles', () => {
    const v18 = { ...defaultSave(), v: 18, settings: { muted: true, music: false, raids: false } };
    const s = parseSave(JSON.stringify(v18));
    expect(s.v).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(20);
    expect(s.settings).toEqual({ muted: true, music: false, raids: false, ...DEFAULT_PREFS });
  });

  it('a v19 save keeps its prefs and gets ore marks off, flashes full', () => {
    const v19 = { ...defaultSave(), v: 19, settings: { muted: false, music: true, raids: true, master: 3, musicVol: 4, sfxVol: 5, shake: 1, uiSize: 2 } };
    const s = parseSave(JSON.stringify(v19));
    expect(s.settings).toEqual({ muted: false, music: true, raids: true, master: 3, musicVol: 4, sfxVol: 5, shake: 1, uiSize: 2, oreMarks: 0, flashes: 0 });
    expect(prefValueLabel(s.settings, 'oreMarks')).toBe('OFF');
    expect(prefValueLabel({ ...s.settings, flashes: 1 }, 'flashes')).toBe('REDUCED');
  });

  it('prefs round-trip through a save and junk values are clamped', () => {
    const g = new Game(defaultSave(7));
    g.stepPref('master', -1);
    g.stepPref('shake', -1);
    g.stepPref('uiSize', 1);
    const back = parseSave(JSON.stringify(g.toSave()));
    expect(back.settings.master).toBe(DEFAULT_PREFS.master - 1);
    expect(back.settings.shake).toBe(1);
    expect(back.settings.uiSize).toBe(1);
    const bad = parseSave(JSON.stringify({ ...defaultSave(), settings: { master: 1e9, sfxVol: 'x', uiSize: -2 } }));
    expect(bad.settings.master).toBe(10);
    expect(bad.settings.sfxVol).toBe(DEFAULT_PREFS.sfxVol);
    expect(bad.settings.uiSize).toBe(0);
  });
});
