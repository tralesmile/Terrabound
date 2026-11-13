import { describe, expect, it } from 'vitest';
import { SHELL_PLATES, coreCracks, crackPath, shellPlates } from '../src/render/bossart';

describe('Hollow AI shell', () => {
  it('all plates are on at full health and none at zero', () => {
    expect(shellPlates(1)).toEqual(new Array(SHELL_PLATES).fill(true));
    expect(shellPlates(0)).toEqual(new Array(SHELL_PLATES).fill(false));
    expect(shellPlates(0.5).filter(Boolean)).toHaveLength(SHELL_PLATES / 2);
  });

  it('plates only ever come off as health drops (never grow back mid-fight)', () => {
    let prev = shellPlates(1);
    for (let hp = 1; hp >= 0; hp -= 0.01) {
      const cur = shellPlates(hp);
      for (let i = 0; i < SHELL_PLATES; i++) if (cur[i]) expect(prev[i]).toBe(true);
      prev = cur;
    }
  });

  it('the first plates shed are not neighbours (battered, not peeled)', () => {
    const lost = shellPlates(0.6).map((on, i) => (on ? -1 : i)).filter((i) => i >= 0);
    expect(lost).toHaveLength(3);
    for (const a of lost) for (const b of lost) if (a !== b) expect(Math.min(Math.abs(a - b), SHELL_PLATES - Math.abs(a - b))).toBeGreaterThan(1);
  });

  it('cracks grow with damage and stay inside the core, outside the iris', () => {
    expect(coreCracks(1)).toBe(0);
    expect(coreCracks(0.05)).toBe(5);
    let prev = 0;
    for (let hp = 1; hp >= 0; hp -= 0.05) {
      expect(coreCracks(hp)).toBeGreaterThanOrEqual(prev);
      prev = coreCracks(hp);
    }
    for (let i = 0; i < 5; i++) for (const p of crackPath(i)) {
      expect(p.r).toBeLessThanOrEqual(1);
      expect(p.r).toBeGreaterThan(0.48);
    }
  });
});
