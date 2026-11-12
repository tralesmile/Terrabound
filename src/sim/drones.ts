import { BASE_HALF, BASE_ROWS } from './base';
import { ITEMS, T, TILES, invAdd, type Inventory, type ItemId } from './tiles';
import type { World } from './world';

/**
 * Field drones (P1.8 "Programmable drones", slice 1). Every drone bay in the base launches one drone
 * with a role the player picks by pressing E at the bay:
 * - survey: the old abstract job (no body in the world; hauls copper and crystal over time, works offline),
 * - miner: follows the player, drills exposed ore near them and flies the load home (safe from death),
 * - guard: follows the player and shoots enemies in range,
 * - hauler: when the pack is getting full away from base, takes a load from it and banks it.
 * Pure and deterministic: no randomness, only the dt it is given.
 */
export type DroneRole = 'survey' | 'miner' | 'guard' | 'hauler' | 'repair';
export const DRONE_ROLES: readonly DroneRole[] = ['survey', 'miner', 'guard', 'hauler', 'repair'];

export const ROLE_INFO: Record<DroneRole, { name: string; color: string; desc: string }> = {
  survey: { name: 'Survey', color: '#8ad8ff', desc: 'flies off-map for copper and crystal (works offline)' },
  miner: { name: 'Miner', color: '#ffb03a', desc: 'drills ore near you and flies it home' },
  guard: { name: 'Guard', color: '#ff5a6a', desc: 'follows you and shoots enemies' },
  hauler: { name: 'Hauler', color: '#7dff9a', desc: 'carries loot from your pack to the base' },
  repair: { name: 'Repair', color: '#5affd8', desc: 'follows you and patches your suit' },
};

/**
 * Drone rules (slice 2): up to RULE_MAX "IF condition THEN action" lines per bay, checked top to
 * bottom; the first true one decides what the drone does right now, otherwise it does its role.
 */
export type RuleCond = 'night' | 'enemy' | 'pack_half' | 'hp_low' | 'deep';
export type RuleAct = 'miner' | 'guard' | 'hauler' | 'repair' | 'home';
export interface DroneRule {
  when: RuleCond;
  then: RuleAct;
}
export const RULE_MAX = 3;
export const RULE_CONDS: readonly RuleCond[] = ['night', 'enemy', 'pack_half', 'hp_low', 'deep'];
export const RULE_ACTS: readonly RuleAct[] = ['guard', 'repair', 'hauler', 'miner', 'home'];
export const COND_INFO: Record<RuleCond, string> = {
  night: 'it is night',
  enemy: 'enemy near me',
  pack_half: 'pack half full',
  hp_low: 'my health < 40%',
  deep: 'deeper than 60 m',
};
export const ACT_INFO: Record<RuleAct, { name: string; color: string }> = {
  miner: { name: 'mine', color: '#ffb03a' },
  guard: { name: 'guard', color: '#ff5a6a' },
  hauler: { name: 'haul', color: '#7dff9a' },
  repair: { name: 'repair', color: '#5affd8' },
  home: { name: 'go home', color: '#8a90a2' },
};
/** Enemy within this many tiles of the player makes the "enemy" condition true. */
export const ENEMY_NEAR = 8;
export const HP_LOW = 0.4;
export const DEEP_AT = 60;
/** Hit points per second a repair drone restores while it is beside you. */
export const REPAIR_HPS = 2.5;

export function nextCond(c: RuleCond): RuleCond {
  return RULE_CONDS[(RULE_CONDS.indexOf(c) + 1) % RULE_CONDS.length];
}
export function nextAct(a: RuleAct): RuleAct {
  return RULE_ACTS[(RULE_ACTS.indexOf(a) + 1) % RULE_ACTS.length];
}

/** Facts the rule conditions read; the game fills them every frame. */
export interface RuleFacts {
  night: boolean;
  enemy: boolean;
  packHalf: boolean;
  hpLow: boolean;
  deep: boolean;
}

export function condTrue(c: RuleCond, f: RuleFacts): boolean {
  switch (c) {
    case 'night':
      return f.night;
    case 'enemy':
      return f.enemy;
    case 'pack_half':
      return f.packHalf;
    case 'hp_low':
      return f.hpLow;
    case 'deep':
      return f.deep;
  }
}

/** What a drone does right now: the first true rule's action, else its role. Pure. */
export function actingRole(role: DroneRole, rules: readonly DroneRule[] | undefined, f: RuleFacts): RuleAct | 'survey' {
  if (role === 'survey') return 'survey';
  for (const r of (rules ?? []).slice(0, RULE_MAX)) if (condTrue(r.when, f)) return r.then;
  return role;
}

/** Keeps only well-formed rules (max RULE_MAX). Used by the save loader and the editor. Never throws. */
export function sanitizeRules(v: unknown): DroneRule[] {
  if (!Array.isArray(v)) return [];
  const out: DroneRule[] = [];
  for (const r of v) {
    if (out.length >= RULE_MAX) break;
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    if (typeof o.when !== 'string' || typeof o.then !== 'string') continue;
    if (!(RULE_CONDS as readonly string[]).includes(o.when) || !(RULE_ACTS as readonly string[]).includes(o.then)) continue;
    out.push({ when: o.when as RuleCond, then: o.then as RuleAct });
  }
  return out;
}

/** Tiles a miner drone will drill: ore only, never building blocks or the base. */
export const DRONE_ORES: ReadonlySet<number> = new Set([T.IRON, T.COPPER, T.CRYSTAL, T.CIRCUIT_ORE, T.PLASMA_ORE, T.CORE_ORE]);

export const DRONE_SPEED = 11;
/** Search radius around the player for a miner's next ore tile. */
export const MINER_SCAN = 7;
export const MINER_CARGO = 4;
/** Seconds of drilling per ore tile (drones are slower than the player, they work in parallel). */
export const DRONE_DRILL = 1.6;
export const GUARD_RANGE = 6;
export const GUARD_DMG = 5;
export const GUARD_CD = 0.9;
/** The hauler launches when the pack holds at least this many non-kit items. */
export const HAUL_AT = 8;
export const HAUL_LOAD = 6;
/** Beyond this distance a drone jumps ahead along its path instead of flying the whole way (keeps up with deep dives). */
export const DRONE_LEASH = 30;

export type DroneMode = 'dock' | 'follow' | 'drill' | 'home';

export interface FieldDrone {
  /** Bay position relative to the pad ("dx,dy"), the key its role is saved under. */
  key: string;
  role: DroneRole;
  bayX: number;
  bayY: number;
  x: number;
  y: number;
  mode: DroneMode;
  cargo: Inventory;
  target: { x: number; y: number } | null;
  work: number;
  cd: number;
  /** What it is doing this frame (role or a rule's action); for drawing and the panel. */
  act: RuleAct;
}

export interface Bay {
  key: string;
  x: number;
  y: number;
}

/** Drone bays in the base strip, in a fixed scan order. */
export function listBays(world: World): Bay[] {
  const out: Bay[] = [];
  for (let dy = 1; dy <= BASE_ROWS; dy++) {
    for (let dx = -BASE_HALF; dx <= BASE_HALF; dx++) {
      if (world.get(world.padX + dx, world.padY - dy) === T.DRONE) out.push({ key: `${dx},${dy}`, x: world.padX + dx, y: world.padY - dy });
    }
  }
  return out;
}

export function nextRole(r: DroneRole): DroneRole {
  return DRONE_ROLES[(DRONE_ROLES.indexOf(r) + 1) % DRONE_ROLES.length];
}

/** Role saved for a bay (unknown keys default to survey, the original behaviour). */
export function roleOf(roles: Record<string, DroneRole>, key: string): DroneRole {
  return roles[key] ?? 'survey';
}

/** Keep one field drone per non-survey bay: existing drones keep their state, new ones start docked. */
export function syncDrones(drones: FieldDrone[], bays: Bay[], roles: Record<string, DroneRole>): FieldDrone[] {
  const out: FieldDrone[] = [];
  for (const b of bays) {
    const role = roleOf(roles, b.key);
    if (role === 'survey') continue;
    const old = drones.find((d) => d.key === b.key);
    if (old && old.role === role) {
      old.bayX = b.x;
      old.bayY = b.y;
      out.push(old);
      continue;
    }
    out.push({ key: b.key, role, bayX: b.x, bayY: b.y, x: b.x + 0.5, y: b.y + 0.3, mode: 'dock', cargo: old?.cargo ?? {}, target: null, work: 0, cd: 0, act: role });
  }
  return out;
}

/** How many bays still do the abstract survey job (they alone draw power for it and work offline). */
export function surveyBays(bays: Bay[], roles: Record<string, DroneRole>): number {
  return bays.filter((b) => roleOf(roles, b.key) === 'survey').length;
}

export interface DroneTarget {
  id: number;
  x: number;
  y: number;
  hp: number;
}

export interface DroneCtx {
  world: World;
  /** Player feet and a point at chest height. */
  px: number;
  py: number;
  atBase: boolean;
  powered: boolean;
  enemies: readonly DroneTarget[];
  carried: Inventory;
  stash: Inventory;
  /** Rules per bay key and the facts they read (both optional: no rules means plain roles). */
  rules?: Record<string, DroneRule[]>;
  facts?: RuleFacts;
  /** Player health, for repair drones. */
  hp?: number;
  maxHp?: number;
}

export type DroneEvent =
  | { t: 'dronemine'; x: number; y: number; item: ItemId; tile: number }
  | { t: 'droneshot'; x: number; y: number; tx: number; ty: number; id: number }
  | { t: 'dronebank'; n: number; role: DroneRole }
  | { t: 'dronetake'; n: number }
  | { t: 'dronerepair'; hp: number };

function total(inv: Inventory): number {
  let n = 0;
  for (const k in inv) n += inv[k as ItemId] ?? 0;
  return n;
}

/** Pack items a hauler may take (kit items stay with the player, see LESSONS: auto-bank eats crafted items). */
function haulable(carried: Inventory): number {
  let n = 0;
  for (const k in carried) if (!ITEMS[k as ItemId].kit) n += carried[k as ItemId] ?? 0;
  return n;
}

/** Fly toward (tx, ty); returns true on arrival. Long gaps are shortened to the leash first. */
function fly(d: FieldDrone, tx: number, ty: number, dt: number): boolean {
  let dx = tx - d.x;
  let dy = ty - d.y;
  let dist = Math.hypot(dx, dy);
  if (dist > DRONE_LEASH) {
    const k = (dist - DRONE_LEASH) / dist;
    d.x += dx * k;
    d.y += dy * k;
    dx = tx - d.x;
    dy = ty - d.y;
    dist = DRONE_LEASH;
  }
  const step = DRONE_SPEED * dt;
  if (dist <= step || dist < 0.05) {
    d.x = tx;
    d.y = ty;
    return true;
  }
  d.x += (dx / dist) * step;
  d.y += (dy / dist) * step;
  return false;
}

/** True if a tile touches air or a non-solid tile (so the drone can reach a face of it). */
function exposed(world: World, x: number, y: number): boolean {
  return !TILES[world.get(x - 1, y)].solid || !TILES[world.get(x + 1, y)].solid || !TILES[world.get(x, y - 1)].solid || !TILES[world.get(x, y + 1)].solid;
}

/** Nearest exposed ore to the player within MINER_SCAN, ties broken by scan order (deterministic). Skips tiles other drones claimed. */
export function findOre(world: World, px: number, py: number, taken: readonly { x: number; y: number }[] = []): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bd = Infinity;
  const cx = Math.floor(px);
  const cy = Math.floor(py - 1);
  for (let y = cy - MINER_SCAN; y <= cy + MINER_SCAN; y++) {
    for (let x = cx - MINER_SCAN; x <= cx + MINER_SCAN; x++) {
      if (!DRONE_ORES.has(world.get(x, y)) || !exposed(world, x, y)) continue;
      if (taken.some((t) => t.x === x && t.y === y)) continue;
      const dd = (x + 0.5 - px) ** 2 + (y + 0.5 - (py - 1)) ** 2;
      if (dd < bd && dd <= MINER_SCAN * MINER_SCAN) {
        bd = dd;
        best = { x, y };
      }
    }
  }
  return best;
}

function followPoint(i: number, ctx: DroneCtx): { x: number; y: number } {
  const side = i % 2 === 0 ? -1 : 1;
  return { x: ctx.px + side * (1.2 + 0.5 * (i >> 1)), y: ctx.py - 2.6 - 0.4 * (i >> 1) };
}

/** Advance every field drone one step. Mutates drones, world (drilled ore), carried and stash. Returns events for the game to apply. */
export function stepFieldDrones(drones: FieldDrone[], ctx: DroneCtx, dt: number): DroneEvent[] {
  const ev: DroneEvent[] = [];
  const dockX = (d: FieldDrone) => d.bayX + 0.5;
  const dockY = (d: FieldDrone) => d.bayY + 0.3;
  const noFacts: RuleFacts = { night: false, enemy: false, packHalf: false, hpLow: false, deep: false };
  drones.forEach((d, i) => {
    d.cd = Math.max(0, d.cd - dt);
    const act = actingRole(d.role, ctx.rules?.[d.key], ctx.facts ?? noFacts);
    if (act === 'survey') return;
    if (act !== d.act) {
      // Switching jobs drops a half-drilled target (cargo stays aboard).
      if (d.mode === 'drill') d.mode = 'follow';
      d.target = null;
      d.work = 0;
      d.act = act;
    }
    // Unpowered, player at base, or a "go home" rule: everyone heads home and unloads.
    const goHome = !ctx.powered || ctx.atBase || act === 'home';
    if (d.mode === 'home' || (goHome && d.mode !== 'dock')) {
      d.mode = 'home';
      d.target = null;
      if (fly(d, dockX(d), dockY(d), dt)) {
        const n = total(d.cargo);
        if (n > 0) {
          for (const k in d.cargo) invAdd(ctx.stash, k as ItemId, d.cargo[k as ItemId] ?? 0);
          d.cargo = {};
          ev.push({ t: 'dronebank', n, role: d.role });
        }
        d.mode = 'dock';
      }
      return;
    }
    if (d.mode === 'dock') {
      d.x = dockX(d);
      d.y = dockY(d);
      if (goHome) return;
      if (act === 'hauler' && haulable(ctx.carried) < HAUL_AT) return;
      if (act === 'repair' && (ctx.hp ?? 0) >= (ctx.maxHp ?? 0)) return;
      d.mode = 'follow';
    }
    if (act === 'repair') {
      const p = followPoint(i, ctx);
      const there = fly(d, p.x, p.y, dt);
      const missing = (ctx.maxHp ?? 0) - (ctx.hp ?? 0);
      if (there && missing > 0) {
        const hp = Math.min(missing, REPAIR_HPS * dt);
        ctx.hp = (ctx.hp ?? 0) + hp;
        ev.push({ t: 'dronerepair', hp });
      }
      return;
    }
    if (act === 'hauler') {
      const p = followPoint(i, ctx);
      if (fly(d, p.x, p.y, dt)) {
        let n = 0;
        // Take the biggest stacks first (stable order by item table) up to one load.
        const ids = (Object.keys(ctx.carried) as ItemId[]).filter((k) => !ITEMS[k].kit && (ctx.carried[k] ?? 0) > 0);
        ids.sort((a, b) => (ctx.carried[b] ?? 0) - (ctx.carried[a] ?? 0));
        for (const k of ids) {
          const take = Math.min(HAUL_LOAD - n, ctx.carried[k] ?? 0);
          if (take <= 0) break;
          invAdd(ctx.carried, k, -take);
          invAdd(d.cargo, k, take);
          n += take;
        }
        if (n > 0) ev.push({ t: 'dronetake', n });
        d.mode = 'home';
      }
      return;
    }
    if (act === 'guard') {
      const p = followPoint(i, ctx);
      fly(d, p.x, p.y, dt);
      if (d.cd > 0) return;
      let best: DroneTarget | null = null;
      let bd = GUARD_RANGE;
      for (const e of ctx.enemies) {
        if (e.hp <= 0) continue;
        const dist = Math.hypot(e.x - d.x, e.y - 0.4 - d.y);
        if (dist <= bd) {
          bd = dist;
          best = e;
        }
      }
      if (best) {
        ev.push({ t: 'droneshot', x: d.x, y: d.y, tx: best.x, ty: best.y - 0.4, id: best.id });
        d.cd = GUARD_CD;
      }
      return;
    }
    // Miner.
    if (total(d.cargo) >= MINER_CARGO) {
      d.mode = 'home';
      return;
    }
    if (d.mode === 'drill' && d.target) {
      const t = d.target;
      if (!DRONE_ORES.has(ctx.world.get(t.x, t.y)) || Math.hypot(t.x + 0.5 - ctx.px, t.y + 0.5 - ctx.py) > MINER_SCAN + 3) {
        // The player took it, or walked away: pick again.
        d.target = null;
        d.mode = 'follow';
      } else if (fly(d, t.x + 0.5, t.y - 0.2, dt)) {
        d.work += dt;
        if (d.work >= DRONE_DRILL) {
          const tile = ctx.world.get(t.x, t.y);
          const item = TILES[tile].drop;
          ctx.world.set(t.x, t.y, T.AIR);
          if (item) {
            invAdd(d.cargo, item, 1);
            ev.push({ t: 'dronemine', x: t.x, y: t.y, item, tile });
          }
          d.work = 0;
          d.target = null;
          d.mode = 'follow';
        }
        return;
      } else return;
    }
    const taken = drones.filter((o) => o !== d && o.target).map((o) => o.target as { x: number; y: number });
    const ore = findOre(ctx.world, ctx.px, ctx.py, taken);
    if (ore) {
      d.target = ore;
      d.mode = 'drill';
      d.work = 0;
      return;
    }
    const p = followPoint(i, ctx);
    fly(d, p.x, p.y, dt);
  });
  return ev;
}
