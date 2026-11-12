/**
 * Garage: vehicles are built and upgraded only in a garage you place in the world, then deployed as parked
 * vehicles that you walk up to and enter. Pure data and helpers (no DOM, no randomness).
 */
import type { GearId } from './gear';
import type { Inventory } from './tiles';

export type VehicleId = 'buggy' | 'hoverbike' | 'drill_tank' | 'sky_jet';
export const VEHICLE_IDS: VehicleId[] = ['buggy', 'hoverbike', 'drill_tank', 'sky_jet'];

export type PartId = 'engine' | 'armor' | 'battery';
export const PART_IDS: PartId[] = ['engine', 'armor', 'battery'];
export const MAX_PART = 3;

export interface VehicleDef {
  name: string;
  desc: string;
  cost: Inventory;
  /** Ground speed multiplier over walking. */
  speed: number;
  jump: number;
  flying: boolean;
  /** Battery per second while riding away from the pad. */
  drain: number;
  /** Damage dealt to enemies rammed at speed (0 = none). */
  ram: number;
  /** Digs the tiles in front while driving. */
  drill: boolean;
  /** No fall damage while riding. */
  soft: boolean;
}

export const VEHICLES: Record<VehicleId, VehicleDef> = {
  buggy: { name: 'Dune buggy', desc: 'Fast ground car, climbs bumps, rams enemies', cost: { metal: 12, iron_scrap: 10, copper_wire: 6 }, speed: 2.3, jump: 1.15, flying: false, drain: 0.6, ram: 22, drill: false, soft: true },
  hoverbike: { name: 'Hoverbike', desc: 'Light and quick, high jumps, no fall damage', cost: { metal: 14, copper_wire: 8, crystal: 4 }, speed: 1.9, jump: 1.25, flying: false, drain: 0.5, ram: 0, drill: false, soft: true },
  drill_tank: { name: 'Drill tank', desc: 'Slow, armored, digs through blocks as it drives', cost: { metal: 18, iron_scrap: 14, copper_wire: 8, crystal: 4 }, speed: 1.25, jump: 0.9, flying: false, drain: 1.2, ram: 10, drill: true, soft: true },
  sky_jet: { name: 'Sky Jet', desc: 'A small plane: fly anywhere, jump climbs, S dives', cost: { metal: 20, copper_wire: 12, crystal: 8 }, speed: 2.2, jump: 1, flying: true, drain: 4.8, ram: 0, drill: false, soft: true },
};

export const PARTS: Record<PartId, { name: string; desc: string }> = {
  engine: { name: 'Engine', desc: '+15% speed per level' },
  armor: { name: 'Armor', desc: '-15% damage taken while riding per level' },
  battery: { name: 'Battery', desc: '-25% battery drain per level' },
};

/** Cost of the next level of a part (grows with level). */
export function partCost(part: PartId, level: number): Inventory {
  const k = level + 1;
  if (part === 'engine') return { copper_wire: 4 * k, crystal: 2 * k };
  if (part === 'armor') return { metal: 6 * k, iron_scrap: 4 * k };
  return { copper_wire: 3 * k, crystal: 3 * k };
}

export type PartLevels = Record<PartId, number>;

export interface GarageSave {
  /** Upgrade levels per vehicle. */
  parts: Partial<Record<VehicleId, PartLevels>>;
  /** Where the deployed vehicle is parked (one at a time), or null. */
  parked: { id: VehicleId; x: number; y: number } | null;
}

export function defaultGarage(): GarageSave {
  return { parts: {}, parked: null };
}

export function partsOf(g: GarageSave, id: VehicleId): PartLevels {
  return g.parts[id] ?? { engine: 0, armor: 0, battery: 0 };
}

/** Effective numbers for a vehicle with its parts. */
export function vehicleStats(id: VehicleId, p: PartLevels): VehicleDef & { armor: number } {
  const d = VEHICLES[id];
  return { ...d, speed: d.speed * (1 + 0.15 * p.engine), drain: d.drain * Math.max(0.25, 1 - 0.25 * p.battery), armor: Math.min(0.45, 0.15 * p.armor) };
}

export function isVehicle(id: string): id is VehicleId {
  return id in VEHICLES;
}

/** Never throws: unknown vehicles and bad levels dropped, parked position must be finite. */
/** Parked at NaN, NaN means "beside the pad" (resolved by the game once the world exists). */
export function sanitizeGarage(v: unknown, owned: readonly GearId[], migrate: boolean): GarageSave {
  const out = defaultGarage();
  const r = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  if (r.parts && typeof r.parts === 'object') {
    for (const id of VEHICLE_IDS) {
      const lv = (r.parts as Record<string, unknown>)[id];
      if (!lv || typeof lv !== 'object') continue;
      const l = lv as Record<string, unknown>;
      const n = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(MAX_PART, Math.floor(x))) : 0);
      out.parts[id] = { engine: n(l.engine), armor: n(l.armor), battery: n(l.battery) };
    }
  }
  const p = r.parked as Record<string, unknown> | null | undefined;
  if (p && typeof p.id === 'string' && isVehicle(p.id) && owned.includes(p.id as GearId) && typeof p.x === 'number' && typeof p.y === 'number' && (Number.isFinite(p.x) || Number.isNaN(p.x))) {
    out.parked = { id: p.id, x: p.x as number, y: p.y as number };
  } else if (migrate) {
    // Migration from saves without a garage: an owned vehicle waits beside the pad.
    const first = VEHICLE_IDS.find((id) => owned.includes(id as GearId));
    if (first) out.parked = { id: first, x: Number.NaN, y: Number.NaN };
  }
  return out;
}
