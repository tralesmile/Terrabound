import { describe, expect, it } from 'vitest';
import { diveLine, shareLines } from '../src/ui/share';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';

describe('share card text', () => {
  it('shows progress and the world code so friends can play the same world', () => {
    const g = new Game(defaultSave());
    const lines = shareLines(g);
    expect(lines.length).toBe(4);
    expect(lines[0]).toContain('Bosses 0/6');
    expect(lines[2]).toContain('Rust Wastes');
    expect(lines[3]).toContain(g.seedCode);
  });

  it('adds this dive tally and leaves out zero counts', () => {
    const g = new Game(defaultSave());
    expect(diveLine(g)).toBe('This dive 0:00');
    g.dive.time = 725;
    g.dive.mined = 340;
    g.dive.kills = 18;
    expect(diveLine(g)).toBe('This dive 12:05, 340 mined, 18 beaten');
  });
});
