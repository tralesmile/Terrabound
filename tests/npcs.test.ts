import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { ITEMS, ITEM_IDS, T } from '../src/sim/tiles';
import { findRooms } from '../src/sim/rooms';
import { NPC_INFO, NPC_ORDER, NPC_SPEED, TRADES, doTrade, npcLine, roomFloor, stepNpc, syncNpcs, tradeById, type Npc } from '../src/sim/npcs';
import { defaultSave } from '../src/sim/save';
import { Game, NO_CONTROLS } from '../src/sim/game';

/** Open world with a flat floor at row 20, pad at (60, 20). */
function flat(): World {
  const w = new World(120, 60, 7);
  Object.assign(w, { padX: 60, padY: 20 });
  for (let y = 20; y < 60; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
  return w;
}

/** Furnished room on the pad: inside x px-2..px+2, rows py-4..py-1. */
function home(w: World, withBed = true): void {
  const px = w.padX;
  const py = w.padY;
  for (let y = py - 5; y <= py - 1; y++) {
    w.set(px - 3, y, T.METAL);
    w.set(px + 3, y, T.METAL);
  }
  for (let x = px - 3; x <= px + 3; x++) w.set(x, py - 5, T.METAL);
  for (let y = py - 4; y <= py - 1; y++) for (let x = px - 2; x <= px + 2; x++) w.set(x, y, T.AIR);
  if (withBed) w.set(px - 2, py - 1, T.BED);
  w.set(px + 2, py - 1, T.TABLE);
  w.set(px + 2, py - 3, T.TORCH);
}

describe('trader rates', () => {
  it('every trade names real items, positive amounts, and never gives back what it takes', () => {
    const ids = new Set(TRADES.map((t) => t.id));
    expect(ids.size).toBe(TRADES.length);
    for (const t of TRADES) {
      for (const inv of [t.give, t.get]) {
        const keys = Object.keys(inv);
        expect(keys.length).toBeGreaterThan(0);
        for (const k of keys) {
          expect(ITEM_IDS).toContain(k);
          expect(ITEMS[k as keyof typeof ITEMS].kit, `${t.id}: kit items are not traded`).toBeFalsy();
          expect(inv[k as keyof typeof inv]).toBeGreaterThan(0);
        }
      }
      for (const k of Object.keys(t.get)) expect(Object.keys(t.give)).not.toContain(k);
    }
  });

  it('rust to metal is worse than a smelter (4 rust per metal), so automation still pays', () => {
    const t = tradeById('rust_metal');
    expect(t).toBeDefined();
    if (!t) return;
    expect((t.give.rust ?? 0) / (t.get.metal ?? 1)).toBeGreaterThan(4);
  });

  it('doTrade pays the posted rate or changes nothing', () => {
    const t = TRADES[0];
    const stash = { rust: 9 };
    expect(doTrade(stash, t)).toBe(true);
    expect(stash).toEqual({ rust: 1, metal: 1 });
    expect(doTrade(stash, t)).toBe(false);
    expect(stash).toEqual({ rust: 1, metal: 1 });
  });
});

describe('robots move in', () => {
  it('roomFloor is the lowest row with ground under it', () => {
    const w = flat();
    home(w);
    const r = findRooms(w)[0];
    expect(roomFloor(w, r)).toEqual({ y: 19, x0: 58, x1: 62 });
  });

  it('a valid room gets the Trader; losing the bed sends it away', () => {
    const w = flat();
    home(w);
    const a = syncNpcs(w, findRooms(w), []);
    expect(a.arrived).toEqual(['trader']);
    expect(a.npcs).toHaveLength(1);
    expect(a.npcs[0].y).toBe(20);
    expect(a.npcs[0].x).toBeGreaterThanOrEqual(58.5);
    expect(a.npcs[0].x).toBeLessThanOrEqual(62.5);
    const again = syncNpcs(w, findRooms(w), a.npcs);
    expect(again.arrived).toEqual([]);
    expect(again.npcs[0]).toEqual(a.npcs[0]);
    w.set(58, 19, T.AIR);
    const gone = syncNpcs(w, findRooms(w), again.npcs);
    expect(gone.left).toEqual(['trader']);
    expect(gone.npcs).toEqual([]);
  });

  it('no room, no robots', () => {
    const w = flat();
    home(w, false);
    expect(syncNpcs(w, findRooms(w), []).npcs).toEqual([]);
    expect(NPC_ORDER.every((k) => NPC_INFO[k].lines.length > 0)).toBe(true);
  });

  it('paces inside the floor span, deterministically, and faces a nearby player', () => {
    const run = (): number[] => {
      const n: Npc = { kind: 'trader', x: 60.5, y: 20, face: 1, to: null, wait: 0, n: 0, home: 0 };
      const xs: number[] = [];
      for (let i = 0; i < 600; i++) {
        stepNpc(n, { x0: 58, x1: 62 }, 1 / 30, null);
        expect(n.x).toBeGreaterThanOrEqual(58.5);
        expect(n.x).toBeLessThanOrEqual(62.5);
        xs.push(n.x);
      }
      return xs;
    };
    const a = run();
    expect(a).toEqual(run());
    expect(new Set(a.map((x) => x.toFixed(1))).size).toBeGreaterThan(5);
    // Moves at most NPC_SPEED per second.
    for (let i = 1; i < a.length; i++) expect(Math.abs(a[i] - a[i - 1])).toBeLessThanOrEqual(NPC_SPEED / 30 + 1e-9);
    const n: Npc = { kind: 'trader', x: 60.5, y: 20, face: 1, to: 62, wait: 0, n: 0, home: 0 };
    stepNpc(n, { x0: 58, x1: 62 }, 1 / 30, 59);
    expect(n.face).toBe(-1);
    expect(n.to).toBeNull();
  });

  it('lines rotate over time', () => {
    expect(npcLine('trader', 0)).not.toBe(npcLine('trader', 6));
  });
});

describe('the Trader in the game', () => {
  it('moves in when a home is finished, is announced, talks on E and trades from the stash', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    g.step(1 / 30, NO_CONTROLS);
    expect(g.npcs).toEqual([]);
    home(w);
    g.drainEvents();
    g.step(1 / 30, NO_CONTROLS);
    expect(g.hasNpc('trader')).toBe(true);
    expect(g.drainEvents().some((e) => e.t === 'npcarrive' && e.kind === 'trader')).toBe(true);
    // Walk up and talk.
    g.body.x = g.npcs[0].x + 0.5;
    g.body.y = g.npcs[0].y;
    g.step(1 / 30, NO_CONTROLS);
    expect(g.hintAutomation(false)).toContain('Bolt the Trader');
    expect(g.interact()).toBe(true);
    expect(g.drainEvents().some((e) => e.t === 'npctalk')).toBe(true);
    // Trade from the stash at the base.
    g.stash.rust = 8;
    expect(g.trade('rust_metal')).toBe(true);
    expect(g.stash.rust).toBe(0);
    expect(g.stash.metal ?? 0).toBeGreaterThanOrEqual(1);
    expect(g.trade('rust_metal')).toBe(false);
    expect(g.trade('nope')).toBe(false);
  });

  it('robots already home on load are not announced, and no trader means no trades', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    g.stash.rust = 50;
    expect(g.trade('rust_metal')).toBe(false);
    home(w);
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    g.drainEvents();
    g.step(1 / 30, NO_CONTROLS);
    expect(g.hasNpc('trader')).toBe(true);
    expect(g.drainEvents().some((e) => e.t === 'npcarrive')).toBe(false);
  });

  it('a click on the robot talks to it', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    home(w);
    g.body.x = w.padX - 1.5;
    g.body.y = w.padY;
    g.step(1 / 30, NO_CONTROLS);
    const n = g.npcs[0];
    g.drainEvents();
    g.step(1 / 30, { ...NO_CONTROLS, dig: true, aim: { tx: Math.floor(n.x), ty: Math.floor(n.y) - 1 } });
    expect(g.drainEvents().some((e) => e.t === 'npctalk')).toBe(true);
  });
});
