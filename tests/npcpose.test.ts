import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T } from '../src/sim/tiles';
import { findRooms } from '../src/sim/rooms';
import { HIDE_MUL, NPC_SPEED, REACT_TIME, npcSpots, reactNpcs, roomFloor, stepNpc, type Npc } from '../src/sim/npcs';
import { npcHop } from '../src/render/sprites';
import { defaultSave } from '../src/sim/save';
import { Game, NO_CONTROLS } from '../src/sim/game';
import { DAY_LENGTH, isNight } from '../src/sim/daynight';

const FLOOR = { x0: 58, x1: 64 };
const robot = (x = 61.5): Npc => ({ kind: 'trader', x, y: 20, face: 1, to: null, wait: 0, n: 0, home: 0, pose: 'stand' });
const DAY = { night: false, raid: false };
const NIGHT = { night: true, raid: false };
const RAID = { night: true, raid: true };

function run(n: Npc, secs: number, spots: { bed: number | null; chair: number | null }, mood = DAY, player: number | null = null): Npc['pose'][] {
  const poses: Npc['pose'][] = [];
  for (let i = 0; i < secs * 30; i++) {
    stepNpc(n, FLOOR, 1 / 30, player, spots, mood);
    poses.push(n.pose);
  }
  return poses;
}

describe('robot poses', () => {
  it('sits on the chair now and then by day, facing the way the chair faces, and gets up again', () => {
    const n = robot();
    const poses = run(n, 120, { bed: null, chair: 59 });
    expect(poses).toContain('sit');
    expect(poses).toContain('stand');
    // Every sitting frame is on the chair cell, facing right.
    const m = robot();
    for (let i = 0; i < 120 * 30; i++) {
      stepNpc(m, FLOOR, 1 / 30, null, { bed: null, chair: 59 }, DAY);
      if (m.pose === 'sit') {
        expect(m.x).toBe(59.5);
        expect(m.face).toBe(1);
      }
    }
    expect(run(robot(), 120, { bed: null, chair: null })).not.toContain('sit');
  });

  it('is deterministic', () => {
    const a = robot();
    const b = robot();
    expect(run(a, 60, { bed: 58, chair: 63 })).toEqual(run(b, 60, { bed: 58, chair: 63 }));
    expect(a).toEqual(b);
  });

  it('walks to bed at night and sleeps there; wakes in the morning', () => {
    const n = robot(63.5);
    const poses = run(n, 10, { bed: 58, chair: null }, NIGHT);
    expect(n.pose).toBe('sleep');
    expect(n.x).toBe(58.5);
    expect(poses.indexOf('sleep')).toBeGreaterThan(30 * ((63.5 - 58.5) / NPC_SPEED) - 3);
    run(n, 1 / 30, { bed: 58, chair: null }, DAY);
    expect(n.pose).toBe('stand');
    // No bed: stays up all night.
    expect(run(robot(), 20, { bed: null, chair: null }, NIGHT)).not.toContain('sleep');
  });

  it('a nearby player wakes it at night, but a raid keeps it hidden', () => {
    const n = robot(58.5);
    run(n, 2, { bed: 58, chair: null }, NIGHT);
    expect(n.pose).toBe('sleep');
    run(n, 1 / 30, { bed: 58, chair: null }, NIGHT, 61);
    expect(n.pose).toBe('stand');
    expect(n.face).toBe(1);
    const h = robot(58.5);
    run(h, 2, { bed: 58, chair: null }, RAID);
    run(h, 1, { bed: 58, chair: null }, RAID, 61);
    expect(h.pose).toBe('sleep');
  });

  it('hurries to bed in a raid', () => {
    const slow = robot(64.5);
    const fast = robot(64.5);
    const tSlow = run(slow, 10, { bed: 58, chair: null }, NIGHT).indexOf('sleep');
    const tFast = run(fast, 10, { bed: 58, chair: null }, RAID).indexOf('sleep');
    expect(tFast).toBeGreaterThan(0);
    expect(tFast).toBeLessThan(tSlow / (HIDE_MUL * 0.9));
  });

  it('finds the bed head and the chair on the room floor', () => {
    const w = new World(120, 60, 7);
    Object.assign(w, { padX: 60, padY: 20 });
    for (let y = 20; y < 60; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
    for (let y = 15; y <= 19; y++) {
      w.set(56, y, T.METAL);
      w.set(64, y, T.METAL);
    }
    for (let x = 56; x <= 64; x++) w.set(x, 15, T.METAL);
    w.set(57, 19, T.BED);
    w.set(58, 19, T.BED_FOOT);
    w.set(62, 19, T.CHAIR);
    const room = findRooms(w).find((r) => r.cells.length > 0)!;
    const floor = roomFloor(w, room)!;
    expect(npcSpots(w, room, floor)).toEqual({ bed: 57, chair: 62 });
  });
});

describe('robots in the game sleep at night and hide in raids', () => {
  it('the Trader is asleep in its bed by night and the hint says it hides in a raid', () => {
    const save = defaultSave();
    save.settings.raids = false;
    const g = new Game(save);
    const w = g.world;
    const px = w.padX;
    const py = w.padY;
    for (let y = py - 5; y <= py - 1; y++) {
      w.set(px - 3, y, T.METAL);
      w.set(px + 3, y, T.METAL);
    }
    for (let x = px - 3; x <= px + 3; x++) w.set(x, py - 5, T.METAL);
    for (let y = py - 4; y <= py - 1; y++) for (let x = px - 2; x <= px + 2; x++) w.set(x, y, T.AIR);
    w.set(px - 2, py - 1, T.BED);
    w.set(px + 2, py - 1, T.TABLE);
    w.set(px + 2, py - 3, T.TORCH);
    // Stand off to the side, out of talking range.
    g.body.x = px + 12.5;
    g.body.y = py;
    let t = 0;
    while (!isNight(t) && t < DAY_LENGTH) t += 1;
    g.time = t + 1;
    for (let i = 0; i < 30 * 8; i++) g.step(1 / 30, NO_CONTROLS);
    expect(g.hasNpc('trader')).toBe(true);
    expect(g.npcs[0].pose).toBe('sleep');
    expect(g.npcs[0].x).toBe(px - 2 + 0.5);
    // Asleep: bringing loot home does not wake it to wave. By day it does.
    g.carried.rust = 3;
    g.bank();
    expect(g.npcs[0].react ?? null).toBeNull();
    g.time = 30;
    for (let i = 0; i < 30 * 2; i++) g.step(1 / 30, NO_CONTROLS);
    expect(g.npcs[0].pose).not.toBe('sleep');
    g.carried.rust = 3;
    g.bank();
    expect(g.npcs[0].react).toBe('wave');
  });
});

describe('robot reactions', () => {
  it('a wave holds the robot in place, faces you, then ends; sleepers do not wave', () => {
    const n = robot(60.5);
    n.to = 63;
    const sleeper = robot(58.5);
    sleeper.pose = 'sleep';
    reactNpcs([n, sleeper], 'wave');
    expect(n.react).toBe('wave');
    expect(sleeper.react).toBeUndefined();
    run(n, 0.5, { bed: null, chair: null }, DAY, 58);
    expect(n.x).toBe(60.5);
    expect(n.face).toBe(-1);
    expect(n.react).toBe('wave');
    run(n, REACT_TIME.wave, { bed: null, chair: null }, DAY, 58);
    expect(n.react).toBeNull();
  });

  it('a cheer gets a hiding robot out of bed; the hop stays small and ends at 0', () => {
    const n = robot(58.5);
    n.pose = 'sleep';
    reactNpcs([n], 'cheer');
    run(n, 1 / 30, { bed: 58, chair: null }, NIGHT);
    expect(n.pose).toBe('stand');
    for (const r of ['wave', 'cheer'] as const) {
      for (let t = 0; t <= REACT_TIME[r]; t += 0.05) {
        expect(npcHop(r, t)).toBeGreaterThanOrEqual(0);
        expect(npcHop(r, t)).toBeLessThanOrEqual(4);
      }
      expect(npcHop(r, 0)).toBe(0);
    }
    // After the cheer, it is night again: back to bed.
    run(n, REACT_TIME.cheer + 5, { bed: 58, chair: null }, NIGHT);
    expect(n.pose).toBe('sleep');
  });
});
