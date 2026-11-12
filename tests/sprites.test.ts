import { describe, expect, it } from 'vitest';
import { CRAWLER_ROWS, DRONE_W, FLYER_ROWS, PAL, droneRows, TRADER_W, traderRows, PLAYER_FRAMES, PLAYER_H, PLAYER_W, playerRows } from '../src/render/sprites';

describe('sprite maps', () => {
  it('player frames fit 16x24 and use known palette keys', () => {
    for (const f of PLAYER_FRAMES) {
      for (const bob of [0, 1]) {
        const rows = playerRows(f, bob);
        expect(rows.length).toBe(PLAYER_H);
        for (const r of rows) {
          expect(r.length).toBeLessThanOrEqual(PLAYER_W);
          for (const ch of r) if (ch !== ' ') expect(PAL[ch], `${f} '${ch}'`).toBeDefined();
        }
      }
    }
  });
  it('enemy frames fit 16 wide and use known palette keys', () => {
    for (const rows of [...CRAWLER_ROWS, ...FLYER_ROWS]) {
      for (const r of rows) {
        expect(r.length).toBeLessThanOrEqual(16);
        for (const ch of r) if (ch !== ' ') expect(PAL[ch]).toBeDefined();
      }
    }
  });

  it('drone frames for every job fit 16 wide, use known keys, and differ by attachment', () => {
    const acts = ['miner', 'guard', 'hauler', 'repair', 'home'];
    for (const act of acts) {
      for (const t of [0, 0.03]) {
        for (const r of droneRows(act, t)) {
          expect(r.length).toBeLessThanOrEqual(DRONE_W);
          for (const ch of r) if (ch !== ' ') expect(PAL[ch]).toBeDefined();
        }
      }
    }
    expect(droneRows('miner', 0)[0]).not.toBe(droneRows('miner', 1 / 24)[0]);
    const shapes = new Set(acts.map((a) => droneRows(a, 0).slice(8).join('|')));
    expect(shapes.size).toBe(acts.length);
  });
});

describe('vehicle sprites', () => {
  it('fit their width, use known keys and animate', async () => {
    const { VEHICLES, vehicleRows } = await import('../src/render/sprites');
    for (const id of ['hoverbike', 'sky_jet'] as const) {
      const frames = new Set<string>();
      for (const t of [0, 0.05, 0.1, 0.15]) {
        for (const boost of [false, true]) {
          const rows = vehicleRows(id, t, boost);
          frames.add(rows.join('|'));
          for (const r of rows) {
            expect(r.length, `${id} '${r}'`).toBeLessThanOrEqual(VEHICLES[id].w);
            for (const ch of r) if (ch !== ' ') expect(PAL[ch], `${id} '${ch}'`).toBeDefined();
          }
        }
      }
      expect(frames.size, id).toBeGreaterThan(1);
      expect(VEHICLES[id].top).toBeGreaterThan(0);
    }
    // Boosting lengthens the jet's exhaust.
    const flameLen = (rows: string[]): number => rows[7].slice(0, 3).replace(/ /g, '').length;
    expect(flameLen(vehicleRows('sky_jet', 0, true))).toBeGreaterThan(flameLen(vehicleRows('sky_jet', 0, false)));
  });

  it('trader frames fit TRADER_W, use known keys, walk and blink', () => {
    for (const walking of [false, true]) {
      for (const t of [0, 0.07, 0.13, 0.6, 3.1]) {
        const rows = traderRows(t, walking);
        expect(rows.length).toBe(20);
        for (const r of rows) {
          expect(r.length, `"${r}"`).toBeLessThanOrEqual(TRADER_W);
          for (const ch of r) if (ch !== ' ') expect(PAL[ch]).toBeDefined();
        }
      }
    }
    expect(traderRows(0, true).slice(17).join('|')).not.toBe(traderRows(0.13, true).slice(17).join('|'));
    expect(traderRows(3.1, false)[5]).not.toContain('b');
    expect(traderRows(0, false)[5]).toContain('b');
  });

  it('gunsmith frames fit TRADER_W, keep the walk cycle and show a visor and chip badge', async () => {
    const { gunsmithRows, robotRows, npcSitRows, GUNSMITH_REMAP } = await import('../src/render/sprites');
    for (const walking of [false, true]) {
      for (const t of [0, 0.13, 0.5, 3.1]) {
        const rows = gunsmithRows(t, walking);
        expect(rows.length).toBe(traderRows(t, walking).length);
        for (const r of rows) {
          expect(r.length).toBeLessThanOrEqual(TRADER_W);
          for (const ch of r) if (ch !== ' ') expect(ch in PAL || ch in GUNSMITH_REMAP || 'oHhbEPgSyYL'.includes(ch), `key ${ch}`).toBe(true);
        }
      }
    }
    expect(gunsmithRows(0, false)[5]).toContain('VVV');
    expect(robotRows('gunsmith', 0, false)).toEqual(gunsmithRows(0, false));
    expect(npcSitRows('gunsmith', 0)[5]).toContain('V');
  });
});

describe('scientist sprite', () => {
  it('fits TRADER_W, keeps the walk cycle, wears goggles and a bubbling flask', async () => {
    const { scientistRows, robotRows, npcSitRows, SCIENTIST_REMAP, traderRows: tr, TRADER_W: TW, PAL: P } = await import('../src/render/sprites');
    for (const walking of [false, true]) {
      for (const t of [0, 0.13, 0.5, 3.1]) {
        const rows = scientistRows(t, walking);
        expect(rows.length).toBe(tr(t, walking).length);
        for (const r of rows) {
          expect(r.length).toBeLessThanOrEqual(TW);
          for (const ch of r) if (ch !== ' ') expect(ch in P || ch in SCIENTIST_REMAP, `key ${ch}`).toBe(true);
        }
      }
    }
    expect(scientistRows(3.1, false)[5]).toContain('GG');
    expect(scientistRows(0, false)[12]).not.toBe(scientistRows(0.4, false)[12]);
    expect(robotRows('scientist', 0, false)).toEqual(scientistRows(0, false));
    expect(npcSitRows('scientist', 0)[5]).toContain('G');
  });
});
