import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYS, rebind } from '../src/sim/keys';
import { fillKeys, promptKeys } from '../src/ui/keynames';
import { tileTip } from '../src/ui/tiletip';
import { T } from '../src/sim/tiles';

describe('prompt button names', () => {
  it('follows the player\'s own bindings', () => {
    const k = promptKeys(rebind(DEFAULT_KEYS, 'interact', 'KeyF'), false);
    expect(k.use).toBe('F');
    expect(tileTip(T.CHEST, 1, 9, k)!.lines[0]).toBe('Click or F to open.');
  });

  it('shows controller buttons while a pad is in use', () => {
    const k = promptKeys(DEFAULT_KEYS, true);
    expect(tileTip(T.TERMINAL, 1, 9, k)!.lines[0]).toBe('Click or X to read the log.');
    expect(fillKeys('{recall} home, {down} to drop', k)).toBe('R3 home, DOWN to drop');
  });

  it('leaves no placeholder in any tile tip', () => {
    for (let t = 1; t < 120; t++) expect(tileTip(t, 1)?.lines.join(' ') ?? '').not.toMatch(/\{\w+\}/);
  });
});
