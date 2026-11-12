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

/** Robots that live in rooms, plus the merchant drone that visits the pad (merchant.ts). */
export type NpcKind = 'trader' | 'medic' | 'gunsmith' | 'scientist' | 'merchant';

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
  medic: {
    name: 'Patch',
    title: 'Medic',
    lines: [
      'While I live here, I patch you up: you keep 3/4 of your pack when you fall.',
      'Medkits for the road. Biomass and fish, nothing fancy.',
      'Eat a medkit before the big ones. The bosses, I mean.',
      'Two homes in one base. Bolt finally has a neighbour.',
    ],
  },
  gunsmith: {
    name: 'Rook',
    title: 'Gunsmith',
    lines: [
      'One chip per weapon. Swap them for free whenever you are home.',
      'Ricochet chip. Shoot round corners. You are welcome.',
      'A leech chip keeps you standing in a long fight.',
      'Three homes! This base is turning into a proper town.',
    ],
  },
  scientist: {
    name: 'Nova',
    title: 'Scientist',
    lines: [
      'Bring me samples and I will make you better. Permanently.',
      'Every perk is priced on the board. Science is not a slot machine.',
      'Cell density first. Then we talk about core theory.',
      'Four homes. We are a research colony now.',
    ],
  },
  merchant: {
    name: 'Dex',
    title: 'Merchant drone',
    lines: [
      'Fresh stock every morning. Everything priced on the crate.',
      'I fly the whole Hollow. Somebody always needs plasma.',
      'Gone by afternoon, back tomorrow with new goods.',
    ],
  },
};

/** Order robots move in: the first valid room gets the first kind. */
export const NPC_ORDER: readonly NpcKind[] = ['trader', 'medic', 'gunsmith', 'scientist']; // the merchant never moves in

export interface Trade {
  id: string;
  /** Who posts this rate; the row only works while that robot lives in the base. */
  npc: NpcKind;
  give: Inventory;
  get: Inventory;
  /** Goods go into the pack (field kit like medkits) instead of the stash. */
  toPack?: boolean;
  /** Cozy rate: only posted while the robot's room has at least this comfort (rooms.ts). */
  cozy?: number;
}

/** Comfort a robot's room needs before it posts its cozy rate. */
export const COZY = 3;

/** The Trader's posted rates. Fixed forever, so the player can plan; worse than a powered smelter. */
export const TRADES: readonly Trade[] = [
  { id: 'rust_metal', npc: 'trader', give: { rust: 8 }, get: { metal: 1 } },
  { id: 'scrap_wire', npc: 'trader', give: { iron_scrap: 6 }, get: { copper_wire: 2 } },
  { id: 'bio_wire', npc: 'trader', give: { biomass: 6 }, get: { copper_wire: 1 } },
  { id: 'fish_crystal', npc: 'trader', give: { fish: 3 }, get: { crystal: 1 } },
  { id: 'glow_crystal', npc: 'trader', give: { glowfish: 1 }, get: { crystal: 2 } },
  { id: 'metal_circuit', npc: 'trader', give: { metal: 6 }, get: { circuit: 1 } },
  { id: 'crystal_plasma', npc: 'trader', give: { crystal: 5 }, get: { plasma: 1 } },
  { id: 'cozy_crystal', npc: 'trader', give: { fish: 2 }, get: { crystal: 1 }, cozy: COZY },
  { id: 'med_fish', npc: 'medic', give: { biomass: 4, fish: 1 }, get: { medkit: 1 }, toPack: true },
  { id: 'med_crystal', npc: 'medic', give: { biomass: 3, crystal: 2 }, get: { medkit: 1 }, toPack: true },
  { id: 'cozy_med', npc: 'medic', give: { biomass: 2, fish: 1 }, get: { medkit: 1 }, toPack: true, cozy: COZY },
];

/**
 * Robot happiness: how a robot feels about its home, from its room's comfort (0..4) plus up to
 * two robot neighbours. Happy robots knock a little off their posted rates; an unhappy robot never
 * charges more than the posted price. Derived, nothing saved.
 */
export type Mood = 'lonely' | 'content' | 'happy' | 'delighted';

/** Mood score from comfort and how many other robots live in the base. Pure. */
export function moodScore(comfort: number, neighbours: number): number {
  return Math.max(0, comfort) + Math.min(2, Math.max(0, neighbours));
}

export function npcMood(comfort: number, neighbours: number): Mood {
  const s = moodScore(comfort, neighbours);
  return s <= 0 ? 'lonely' : s <= 3 ? 'content' : s <= 5 ? 'happy' : 'delighted';
}

/** Items knocked off the biggest stack a robot asks for, per mood (0 below happy: never a penalty). */
export const MOOD_DISCOUNT: Record<Mood, number> = { lonely: 0, content: 0, happy: 1, delighted: 2 };

export const MOOD_LABEL: Record<Mood, string> = { lonely: 'Lonely', content: 'Content', happy: 'Happy', delighted: 'Delighted' };

/** What the robot says about its home, mixed into its lines (none while merely content). */
export const MOOD_LINES: Record<Mood, string | null> = {
  lonely: 'Bare walls and nobody next door. Decor or a neighbour would cheer me up.',
  content: null,
  happy: 'I like it here. My rates are one cheaper for you.',
  delighted: 'Best home in the Hollow! Two off my rates, friend.',
};

/**
 * The price a robot asks given its mood: the biggest stack in `give` drops by the mood discount,
 * never below half of it (rounded up) and never below 1. Same object back when nothing changes. Pure.
 */
export function moodGive(give: Inventory, mood: Mood): Inventory {
  const d = MOOD_DISCOUNT[mood];
  if (d <= 0) return give;
  let key: keyof Inventory | null = null;
  let max = 0;
  for (const [k, n] of Object.entries(give)) if ((n ?? 0) > max) [key, max] = [k as keyof Inventory, n ?? 0];
  if (!key || max < 2) return give;
  const n = Math.max(Math.ceil(max / 2), max - d);
  return n === max ? give : { ...give, [key]: n };
}

/** Share of each pack stack kept on death: half normally, three quarters while the Medic lives in the base. */
export function deathKeep(n: number, medic: boolean): number {
  return medic ? Math.floor((n * 3) / 4) : Math.floor(n / 2);
}

/** Whether a posted rate works now: its robot lives here and, for cozy rates, its room is comfy enough. Pure. */
export function tradeOpen(trade: Trade, home: boolean, comfort: number): boolean {
  return home && comfort >= (trade.cozy ?? 0);
}

export function tradeById(id: string): Trade | undefined {
  return TRADES.find((t) => t.id === id);
}

/** Swap from the stash at the posted rate (goods to `pack` when the trade says so). Returns false (and changes nothing) when it cannot pay. */
export function doTrade(stash: Inventory, trade: Trade, pack: Inventory = stash): boolean {
  if (!canAfford(stash, trade.give)) return false;
  pay(stash, trade.give);
  const to = trade.toPack ? pack : stash;
  for (const [k, n] of Object.entries(trade.get)) invAdd(to, k as keyof Inventory, n ?? 0);
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
  /** What the robot is doing in place: standing (default), sitting on a chair, or asleep in bed. */
  pose?: NpcPose;
  /** A short reaction playing now (wave when you bring loot home, cheer when a raid is beaten). */
  react?: NpcReact | null;
  /** Seconds left of the reaction. */
  reactT?: number;
}

export type NpcReact = 'wave' | 'cheer';

/** How long each reaction plays, in seconds. */
export const REACT_TIME: Record<NpcReact, number> = { wave: 1.6, cheer: 3 };

/** Start a reaction on every robot. Sleepers do not wake up to wave, but a beaten raid gets everyone up. Pure. */
export function reactNpcs(npcs: Npc[], react: NpcReact): void {
  for (const n of npcs) {
    if (react === 'wave' && n.pose === 'sleep') continue;
    n.react = react;
    n.reactT = REACT_TIME[react];
  }
}

export type NpcPose = 'stand' | 'sit' | 'sleep';

/** Furniture a robot uses in its room: tile x of the bed head and of a chair on the floor row (null when missing). */
export interface NpcSpots {
  bed: number | null;
  chair: number | null;
}

/** What the world asks of the robots now. */
export interface NpcMood {
  night: boolean;
  raid: boolean;
}

/** Chance (0..1) that a robot picks the chair as its next spot when it has one. */
export const SIT_CHANCE = 0.4;
/** Robots hurry to bed this much faster when a raid starts. */
export const HIDE_MUL = 2.2;

/** The bed (left half or single) and chair standing on the floor row of a room. Pure. */
export function npcSpots(world: World, room: Room, floor: { y: number; x0: number; x1: number }): NpcSpots {
  let bed: number | null = null;
  let chair: number | null = null;
  for (let x = floor.x0; x <= floor.x1; x++) {
    const t = world.get(x, floor.y);
    if (t === T.BED && bed === null) bed = x;
    else if (t === T.CHAIR && chair === null) chair = x;
  }
  void room;
  return { bed, chair };
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
  const valid = rooms.filter((r) => r.valid && roomFloor(world, r) !== null);
  const out: Npc[] = [];
  const arrived: NpcKind[] = [];
  const left: NpcKind[] = [];
  // Robots keep their own room while it stays a home (a new room never makes anyone move house).
  const taken = new Set<number>();
  const kept = new Map<NpcKind, Room>();
  for (const kind of NPC_ORDER) {
    const prev = npcs.find((n) => n.kind === kind);
    const room = prev ? valid.find((r) => homeKey(world, r) === prev.home) : undefined;
    if (room) {
      kept.set(kind, room);
      taken.add(homeKey(world, room));
    }
  }
  const free = valid.filter((r) => !taken.has(homeKey(world, r)));
  for (const kind of NPC_ORDER) {
    const prev = npcs.find((n) => n.kind === kind);
    const own = kept.get(kind);
    const room = own ?? free.shift();
    if (!room) {
      if (prev) left.push(kind);
      continue;
    }
    const floor = roomFloor(world, room);
    if (!floor) continue;
    if (own && prev) {
      // Same room: stay, but keep the feet on the (possibly rebuilt) floor.
      out.push({ ...prev, y: floor.y + 1, x: Math.max(floor.x0 + 0.5, Math.min(floor.x1 + 0.5, prev.x)) });
      continue;
    }
    if (!prev) arrived.push(kind);
    out.push({ kind, x: (floor.x0 + floor.x1 + 1) / 2, y: floor.y + 1, face: 1, to: null, wait: 1.5, n: 0, home: homeKey(world, room), pose: 'stand' });
  }
  return { npcs: out, arrived, left };
}

/**
 * Pace along the floor: stand 1.5-4 s, walk to a fresh spot (sometimes the chair, where it sits a
 * while), repeat. At night it sleeps in its bed; in a raid it hurries there and hides. A nearby
 * player wakes it (it stands and faces you) unless a raid is on. Pure.
 */
export function stepNpc(
  npc: Npc,
  floor: { x0: number; x1: number },
  dt: number,
  playerX: number | null,
  spots: NpcSpots = { bed: null, chair: null },
  mood: NpcMood = { night: false, raid: false },
): void {
  const lo = floor.x0 + 0.5;
  const hi = floor.x1 + 0.5;
  if (npc.react && (npc.reactT ?? 0) > 0) {
    // Reacting: stand (or stay seated) in place and face the player until it is over.
    npc.reactT = (npc.reactT ?? 0) - dt;
    if (npc.reactT <= 0) npc.react = null;
    npc.to = null;
    if (npc.pose !== 'sit') npc.pose = 'stand';
    if (playerX !== null && npc.pose !== 'sit') npc.face = playerX >= npc.x ? 1 : -1;
    return;
  }
  const rest = (mood.raid || mood.night) && spots.bed !== null;
  if (playerX !== null && !(mood.raid && rest)) {
    if (npc.pose === 'sit') return;
    npc.pose = 'stand';
    npc.to = null;
    npc.face = playerX >= npc.x ? 1 : -1;
    return;
  }
  if (rest && spots.bed !== null) {
    if (npc.pose === 'sleep') return;
    const bx = spots.bed + 0.5;
    npc.pose = 'stand';
    npc.to = bx;
    if (walk(npc, bx, NPC_SPEED * (mood.raid ? HIDE_MUL : 1) * dt)) {
      npc.to = null;
      npc.pose = 'sleep';
    }
    return;
  }
  if (npc.pose === 'sleep') {
    // Morning (or the raid is over): get up and stretch a moment.
    npc.pose = 'stand';
    npc.to = null;
    npc.wait = 1;
  }
  if (npc.to === null) {
    npc.wait -= dt;
    if (npc.wait > 0) return;
    if (npc.pose === 'sit') npc.pose = 'stand';
    npc.n++;
    if (spots.chair !== null && hash2(npc.n, 53, 0x7a3e) < SIT_CHANCE && Math.abs(npc.x - (spots.chair + 0.5)) > 0.01) {
      npc.to = spots.chair + 0.5;
    } else npc.to = hi > lo ? lo + hash2(npc.n, 17, 0x7a3e) * (hi - lo) : null;
    if (npc.to === null) npc.wait = 2;
    return;
  }
  const target = npc.to;
  if (walk(npc, target, NPC_SPEED * dt)) {
    npc.to = null;
    if (spots.chair !== null && Math.abs(target - (spots.chair + 0.5)) < 0.01) {
      // Sit facing the way the chair faces (its back is on the left).
      npc.pose = 'sit';
      npc.face = 1;
      npc.wait = 4 + hash2(npc.n, 71, 0x7a3e) * 4;
    } else npc.wait = 1.5 + hash2(npc.n, 31, 0x7a3e) * 2.5;
  }
}

/** Step towards x by at most `step`; true once there. */
function walk(npc: Npc, x: number, step: number): boolean {
  const d = x - npc.x;
  if (Math.abs(d) <= step) {
    npc.x = x;
    return true;
  }
  npc.face = d >= 0 ? 1 : -1;
  npc.x += Math.sign(d) * step;
  return false;
}

/** The line a robot says now (changes every 6 s of game time); every third line is about its mood. Pure. */
export function npcLine(kind: NpcKind, time: number, mood: Mood = 'content'): string {
  const lines = NPC_INFO[kind].lines;
  const i = Math.floor(Math.max(0, time) / 6);
  const m = MOOD_LINES[mood];
  if (m && i % 3 === 0) return m;
  return lines[i % lines.length];
}
