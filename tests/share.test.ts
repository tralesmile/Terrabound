import { describe, expect, it } from 'vitest';
import { shareLines } from '../src/ui/share';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';

describe('share card text', () => {
  it('shows progress and the world code so friends can play the same world', () => {
    const g = new Game(defaultSave());
    const lines = shareLines(g);
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain('Bosses 0/5');
    expect(lines[1]).toContain('Rust Wastes');
    expect(lines[2]).toContain(g.seedCode);
  });
});
