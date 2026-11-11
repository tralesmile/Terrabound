import { describe, expect, it } from 'vitest';
import { BEATS_PER_BAR, composeBar, tempo, type Mood } from '../src/platform/composer';
import { defaultSave, parseSave } from '../src/sim/save';
import { Game } from '../src/sim/game';

const base: Mood = { biome: 0, layer: 0, night: false, boss: false };

describe('procedural music', () => {
  it('is deterministic, stays inside the bar and in an audible range', () => {
    for (let biome = 0; biome < 5; biome++) {
      for (let bar = 0; bar < 16; bar++) {
        const m = { ...base, biome };
        const a = composeBar(m, bar);
        expect(a).toEqual(composeBar(m, bar));
        for (const n of a) {
          expect(n.beat).toBeGreaterThanOrEqual(0);
          expect(n.beat).toBeLessThan(BEATS_PER_BAR);
          expect(n.freq).toBeGreaterThan(20);
          expect(n.freq).toBeLessThan(10000);
          expect(n.vol).toBeLessThanOrEqual(0.2);
        }
      }
    }
  });

  it('biomes sound different; deeper is slower and lower; bosses add drums and speed up', () => {
    const notes = (m: Mood): string => composeBar(m, 3).map((n) => n.freq.toFixed(1)).join(',');
    expect(notes(base)).not.toBe(notes({ ...base, biome: 2 }));
    expect(tempo({ ...base, layer: 3 })).toBeLessThan(tempo(base));
    const bass = (m: Mood): number => composeBar(m, 0).find((n) => n.voice === 'bass')?.freq ?? 0;
    expect(bass({ ...base, layer: 2 })).toBeLessThan(bass(base));
    const boss = composeBar({ ...base, boss: true }, 0);
    expect(boss.some((n) => n.voice === 'drum')).toBe(true);
    expect(composeBar(base, 0).some((n) => n.voice === 'drum')).toBe(false);
    expect(tempo({ ...base, boss: true })).toBeGreaterThan(tempo(base));
  });

  it('the music setting is saved (v11) and defaults to on for old saves', () => {
    const g = new Game(defaultSave());
    expect(g.musicOn).toBe(true);
    g.setMusic(false);
    expect(parseSave(JSON.stringify(g.toSave())).settings.music).toBe(false);
    const v10 = { ...defaultSave(), v: 10, settings: { muted: false } };
    expect(parseSave(JSON.stringify(v10)).settings.music).toBe(true);
  });
});
