/**
 * Robot NPCs (P1.8 Characters). A robot moves into a valid room (rooms.ts) in the base and lives
 * there: it paces along the room's floor and can be talked to. The Trader swaps surplus loot for
 * scarce parts at fixed, fully visible rates (no randomness, no hidden prices, no currency).
 * Who lives where is derived from the world each frame, so there is nothing extra to save. Pure.
 */
import { hash2 } from './rng';
import { T, TILES, canAfford, invAdd, pay, type Inventory } from './tiles';
import type { Room } from './rooms';
import type { World } from './world';

export type NpcKind = 'trader';

export interface NpcInfo {
  name: string;
  title: string;
  /** Lines said when you walk up (cycled, deterministic). */
  lines: readonly string[];
}

export const NPC_INFO: Record<NpcKind, NpcInfo> = {
  trader: {
    name: 'Bolt',
    title: 'Trader',
    lines: [
      'Fair rates, posted plain. No haggling, no tricks.',
      'Rust in, metal out. That is the whole business.',
      'Fish? I know a buyer who pays in crystal.',
      'A room with a bed! You have no idea how rare that is.',
    ],
  },
};

/** Order robots move in: the first valid room gets the first kind. */
export const NPC_ORDER: readonly NpcKind[] = ['trader'];

export interface Trade {
  id: string;
  give: Inventory;
  get: Inventory;
}

/** The Trader's posted rates. Fixed forever, so the player can plan; worse than a powered smelter. */
export const TRADES: readonly Trade[] = [
  { id: 'rust_metal', give: { rust: 8 }, get: { metal: 1 } },
  { id: 'scrap_wire', give: { iron_scrap: 6 }, get: { copper_wire: 2 } },
  { id: 'bio_wire', give: { biomass: 6 }, get: { copper_wire: 1 } },
  { id: 'fish_crystal', give: { fish: 3 }, get: { crystal: 1 } },
  { id: 'glow_crystal', give: { glowfish: 1 }, get: { crystal: 2 } },
  { id: 'metal_circuit', give: { metal: 6 }, get: { circuit: 1 } },
  { id: 'crystal_plasma', give: { crystal: 5 }, get: { plasma: 1 } },
];

export function tradeById(id: string): Trade | undefined {
  return TRADES.find((t) => t.id === id);
}

/** Swap from the stash at the posted rate. Returns false (and changes nothing) when it cannot pay. */
export function doTrade(stash: Inventory, trade: Trade): boolean {
  if (!canAfford(stash, trade.give)) return false;
  pay(stash, trade.give);
  for (const [k, n] of Object.entries(trade.get)) invAdd(stash, k as keyof Inventory, n ?? 0);
  return true;
}

export interface Npc {
  kind: NpcKind;
  /** Feet position in tiles (x is the centre). */
  x: number;
  y: number;
  /** -1 or 1. */
  face: number;
  /** Walking target x, or null while standing. */
  to: number | null;
  /** Seconds left standing still. */
  wait: number;
  /** Decisions made so far (feeds the deterministic hash). */
  n: number;
  /** Top-left cell of its room, used to notice when the room changes. */
  home: number;
}

export const NPC_SPEED = 1.6;

/** Where a robot can stand in a room: the lowest row's cells that have solid ground under them. */
export function roomFloor(world: World, room: Room): { y: number; x0: number; x1: number } | null {
  let best: { y: number; x0: number; x1: number } | null = null;
  for (const i of room.cells) {
    const cx = i % world.w;
    const cy = Math.floor(i / world.w);
    if (!TILES[world.get(cx, cy + 1)].solid && world.get(cx, cy + 1) !== T.PLATFORM) continue;
    if (!best || cy > best.y) best = { y: cy, x0: cx, x1: cx };
    else if (cy === best.y) {
      best.x0 = Math.min(best.x0, cx);
      best.x1 = Math.max(best.x1, cx);
    }
  }
  return best;
}

function homeKey(world: World, room: Room): number {
  return room.y0 * world.w + room.x0;
}

/**
 * Who lives in the base given the current valid rooms: keeps robots already home, moves in new ones,
 * sends away robots whose room is gone. Returns the new list and which kinds arrived or left. Pure.
 */
export function syncNpcs(world: World, rooms: readonly Room[], npcs: readonly Npc[]): { npcs: Npc[]; arrived: NpcKind[]; left: NpcKind[] } {
  const valid = rooms.filter((r) => r.valid);
  const out: Npc[] = [];
  const arrived: NpcKind[] = [];
  const left: NpcKind[] = [];
  NPC_ORDER.forEach((kind, k) => {
    const room = valid[k];
    const prev = npcs.find((n) => n.kind === kind);
    if (!room) {
      if (prev) left.push(kind);
      return;
    }
    const floor = roomFloor(world, room);
    if (!floor) {
      if (prev) left.push(kind);
      return;
    }
    const key = homeKey(world, room);
    if (prev && prev.home === key) {
      // Same room: stay, but keep the feet on the (possibly rebuilt) floor.
      out.push({ ...prev, y: floor.y + 1, x: Math.max(floor.x0 + 0.5, Math.min(floor.x1 + 0.5, prev.x)) });
      return;
    }
    if (!prev) arrived.push(kind);
    out.push({ kind, x: (floor.x0 + floor.x1 + 1) / 2, y: floor.y + 1, face: 1, to: null, wait: 1.5, n: 0, home: key });
  });
  return { npcs: out, arrived, left };
}

/** Pace along the floor: stand 1.5-4 s, walk to a fresh spot, repeat. Stands still to face a nearby player. Pure. */
export function stepNpc(npc: Npc, floor: { x0: number; x1: number }, dt: number, playerX: number | null): void {
  const lo = floor.x0 + 0.5;
  const hi = floor.x1 + 0.5;
  if (playerX !== null) {
    npc.to = null;
    npc.face = playerX >= npc.x ? 1 : -1;
    return;
  }
  if (npc.to === null) {
    npc.wait -= dt;
    if (npc.wait > 0) return;
    npc.n++;
    npc.to = hi > lo ? lo + hash2(npc.n, 17, 0x7a3e) * (hi - lo) : null;
    if (npc.to === null) npc.wait = 2;
    return;
  }
  const d = npc.to - npc.x;
  npc.face = d >= 0 ? 1 : -1;
  const s = NPC_SPEED * dt;
  if (Math.abs(d) <= s) {
    npc.x = npc.to;
    npc.to = null;
    npc.wait = 1.5 + hash2(npc.n, 31, 0x7a3e) * 2.5;
  } else npc.x += Math.sign(d) * s;
}

/** The line a robot says now (changes every 6 s of game time). Pure. */
export function npcLine(kind: NpcKind, time: number): string {
  const lines = NPC_INFO[kind].lines;
  return lines[Math.floor(Math.max(0, time) / 6) % lines.length];
}
