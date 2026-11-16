import { describe, expect, it } from 'vitest';
import { magnetTint, MAX_PULL_LINES, pullBeads, pulledDrops } from '../src/render/magnetfx';
import { MAGNET_R } from '../src/sim/drops';
import { GEAR } from '../src/sim/gear';

const at = (x: number, y: number, noPick = 0) => ({ x, y, noPick });

describe('magnet pull lines', () => {
  it('only the widened magnet draws tethers, nearest first, stronger near the suit', () => {
    // Player feet at (0, 10): the pull target is (0, 9.2). Drops 2 and 5 tiles right of it.
    const drops = [at(5, 9.2), at(2, 9.2), at(9, 9.2), at(0.3, 9.2)];
    expect(pulledDrops(drops, 0, 10, MAGNET_R, false)).toEqual([]);
    const p = pulledDrops(drops, 0, 10, 6, false);
    // 9 tiles is past the 6-tile ring; 0.3 is inside the pickup radius (taken this frame).
    expect(p.map((q) => q.i)).toEqual([1, 0]);
    expect(p[0].k).toBeGreaterThan(p[1].k);
    for (const q of p) expect(q.k).toBeGreaterThan(0);
    for (const q of p) expect(q.k).toBeLessThanOrEqual(1);
  });

  it('no tethers to drops that cannot be picked up or when the pack is full', () => {
    expect(pulledDrops([at(2, 9.2, 0.5)], 0, 10, 6, false)).toEqual([]);
    expect(pulledDrops([at(2, 9.2)], 0, 10, 6, true)).toEqual([]);
  });

  it('caps the tethers for a burst of drops', () => {
    const many = Array.from({ length: 40 }, (_, i) => at(1 + (i % 4), 9.2));
    expect(pulledDrops(many, 0, 10, 6, false)).toHaveLength(MAX_PULL_LINES);
  });

  it('beads stay on the tether and slide toward the suit over time', () => {
    const a = pullBeads(0.1, 3, 0);
    const b = pullBeads(0.2, 3, 0);
    for (const f of [...a, ...b]) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
    expect(b[0]).toBeGreaterThan(a[0]);
  });

  it('tint follows the gear with the widest magnet', () => {
    expect(magnetTint([])).toBeNull();
    expect(magnetTint(['vital_heart'])).toBeNull();
    expect(magnetTint(['magnet_ring'])).toBe(GEAR.magnet_ring.color);
    // Scout bot pulls from 7 tiles, the ring from 6: the bot's cyan accent wins.
    expect(magnetTint(['magnet_ring', 'scout_bot'])).toBe(GEAR.scout_bot.accent);
  });
});

describe('worn gear list', () => {
  it('lists the loadout and the accessory sockets', async () => {
    const { Game } = await import('../src/sim/game');
    const { defaultSave } = await import('../src/sim/save');
    const save = defaultSave();
    save.gear.owned.push('magnet_ring');
    const g = new Game(save);
    expect(g.wornGear).not.toContain('magnet_ring');
    g.equipGear('magnet_ring');
    expect(g.wornGear).toContain('magnet_ring');
    expect(magnetTint(g.wornGear)).toBe(GEAR.magnet_ring.color);
  });
});
