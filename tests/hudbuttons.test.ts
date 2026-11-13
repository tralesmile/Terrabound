import { describe, it, expect } from 'vitest';
import { hudButtons, hudGridPos, type HudButtonState } from '../src/ui/hudbuttons';

const base: HudButtonState = { muted: false, musicOn: true, recall: 0, canRecall: false, atBase: false, hasBays: false, canAfford: false, touch: false, placeMode: false, canMount: false, riding: false, hooked: false, reeling: false, dash: false };

describe('HUD glyph buttons', () => {
  it('deep in a dive on desktop: only sound and map', () => {
    expect(hudButtons(base).map((b) => b.action)).toEqual(['mute', 'map']);
  });
  it('the sound glyph follows the sound state', () => {
    expect(hudButtons(base)[0].glyph).toBe('music');
    expect(hudButtons({ ...base, musicOn: false })[0].glyph).toBe('sound');
    expect(hudButtons({ ...base, muted: true })[0].glyph).toBe('mute');
  });
  it('home shows when recall is possible; beaming replaces it with a charge fill', () => {
    expect(hudButtons({ ...base, canRecall: true }).map((b) => b.glyph)).toContain('home');
    const beam = hudButtons({ ...base, canRecall: true, recall: 0.4 }).find((b) => b.action === 'recall');
    expect(beam?.glyph).toBe('beam');
    expect(beam?.fill).toBeCloseTo(0.4);
    expect(beam?.label).toBe('Beam 40%');
    expect(hudButtons({ ...base, canRecall: true, recall: 0.4 }).filter((b) => b.action === 'recall')).toHaveLength(1);
  });
  it('at the base: drones only with bays, shop always, badge only when an upgrade is affordable', () => {
    const a = hudButtons({ ...base, atBase: true });
    expect(a.map((b) => b.action)).toEqual(['mute', 'map', 'shop']);
    expect(a[2].badge).toBe(false);
    const b = hudButtons({ ...base, atBase: true, hasBays: true, canAfford: true });
    expect(b.map((x) => x.action)).toEqual(['mute', 'map', 'drones', 'shop']);
    expect(b[3].badge).toBe(true);
  });
  it('touch-only buttons (mode, reel, dash) never show on desktop', () => {
    const s = { ...base, hooked: true, dash: true };
    expect(hudButtons(s).some((b) => ['mode', 'reel', 'dash'].includes(b.action))).toBe(false);
    const t = hudButtons({ ...s, touch: true, placeMode: true, reeling: true });
    expect(t.find((b) => b.action === 'mode')?.glyph).toBe('build');
    expect(t.find((b) => b.action === 'reel')?.label).toBe('Reeling');
    expect(t.some((b) => b.action === 'dash')).toBe(true);
  });
  it('ride toggles to get off while riding', () => {
    expect(hudButtons({ ...base, canMount: true }).find((b) => b.action === 'ride')?.glyph).toBe('ride');
    expect(hudButtons({ ...base, canMount: true, riding: true }).find((b) => b.action === 'ride')?.glyph).toBe('getoff');
  });
  it('every button has a distinct action and a label', () => {
    const all = hudButtons({ ...base, touch: true, canRecall: true, atBase: true, hasBays: true, canMount: true, hooked: true, dash: true });
    expect(new Set(all.map((b) => b.action)).size).toBe(all.length);
    expect(all.every((b) => b.label.length > 0)).toBe(true);
  });
  it('grid: cog then sound on the first row, two wide, rows stacked with the gap', () => {
    expect(hudGridPos(0, 40, 10)).toEqual({ dx: 0, dy: 0 });
    expect(hudGridPos(1, 40, 10)).toEqual({ dx: 50, dy: 0 });
    expect(hudGridPos(2, 40, 10)).toEqual({ dx: 0, dy: 50 });
    expect(hudGridPos(5, 40, 10)).toEqual({ dx: 50, dy: 100 });
  });
});
