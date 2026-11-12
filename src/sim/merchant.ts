/**
 * The wandering merchant drone (P1.8 Characters): Dex lands on the pad every morning and stays
 * until the afternoon. It posts 3 offers a day, picked from a fixed pool by the world seed and the
 * day number, so the stock rotates but is never random at purchase time and every rate is shown in
 * full (no currency, no timers that pressure, nothing hidden). Pure and deterministic.
 */
import { hash2 } from './rng';
import { dayPhase } from './daynight';
import { dayOf } from './weather';
import type { Trade } from './npcs';

/** Every offer the merchant can bring. Rates beat nothing you can build cheaply; they move rare goods. */
export const MERCHANT_POOL: readonly Trade[] = [
  { id: 'm_rust_crystal', npc: 'merchant', give: { rust: 12 }, get: { crystal: 1 } },
  { id: 'm_bio_seed', npc: 'merchant', give: { biomass: 5 }, get: { seed: 3 } },
  { id: 'm_wire_circuit', npc: 'merchant', give: { copper_wire: 4 }, get: { circuit: 1 } },
  { id: 'm_crystal_glow', npc: 'merchant', give: { crystal: 3 }, get: { glowfish: 1 } },
  { id: 'm_scrap_plasma', npc: 'merchant', give: { iron_scrap: 8 }, get: { plasma: 1 } },
  { id: 'm_fish_med', npc: 'merchant', give: { fish: 4 }, get: { medkit: 1 }, toPack: true },
  { id: 'm_metal_torch', npc: 'merchant', give: { metal: 3 }, get: { torch: 6 } },
  { id: 'm_plasma_core', npc: 'merchant', give: { plasma: 2 }, get: { core_shard: 1 } },
  { id: 'm_seed_bio', npc: 'merchant', give: { seed: 4 }, get: { biomass: 5 } },
  { id: 'm_circuit_crystal', npc: 'merchant', give: { circuit: 2 }, get: { crystal: 4 } },
  // A seed packet: one of each crop seed, so a farm can start without hunting every biome's grass.
  { id: 'm_seed_packet', npc: 'merchant', give: { biomass: 6 }, get: { corn_seed: 1, root_seed: 1, berry_seed: 1 }, toPack: true },
];

/** Offers posted per day. */
export const MERCHANT_STOCK = 3;
/** Day phases (dayPhase) the drone is parked on the pad: from just after sunrise to mid-afternoon. */
export const MERCHANT_FROM = 0.03;
export const MERCHANT_TO = 0.42;

/** Today's offers: MERCHANT_STOCK distinct pool entries, in pool order. Pure. */
export function merchantStock(seed: number, day: number): Trade[] {
  const ranked = MERCHANT_POOL.map((t, i) => ({ t, k: hash2(i, day, seed ^ 0x3e7c1) }));
  ranked.sort((a, b) => a.k - b.k);
  const pick = new Set(ranked.slice(0, MERCHANT_STOCK).map((r) => r.t.id));
  return MERCHANT_POOL.filter((t) => pick.has(t.id));
}

/** Is the drone on the pad at this game time? Pure. */
export function merchantPresent(time: number): boolean {
  const p = dayPhase(time);
  return p >= MERCHANT_FROM && p < MERCHANT_TO;
}

/** Day number whose stock is on show at this time (the drone's next visit when it is away). Pure. */
export function merchantDay(time: number): number {
  return dayOf(time) + (dayPhase(time) >= MERCHANT_TO ? 1 : 0);
}
