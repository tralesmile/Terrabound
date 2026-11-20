/**
 * Hit feel per attack class (P12-A hit-feel stack): how long the frame freezes, how hard the target is
 * knocked back and up, and how much screen trauma the hit adds. One table so every weapon is tuned in one place.
 * Hit-stop freezes the whole sim (attacker and target together). Pure data, no DOM.
 */

export type HitClass = 'melee' | 'ranged' | 'blast' | 'ram' | 'summon' | 'defence';

export interface HitFeel {
  /** Hit-stop seconds (0 = no freeze; base defences never stutter the game). */
  stop: number;
  /** Horizontal knockback speed (tiles/s); enemy AI decays it fast (short-decay knockback). */
  knock: number;
  /** Upward pop for walkers (tiles/s); flyers keep their vertical speed. */
  lift: number;
  /** Screen trauma added (0..1); shake is trauma squared, so small hits stay subtle and big ones stack. */
  trauma: number;
}

export const HIT_FEEL: Record<HitClass, HitFeel> = {
  // Melee is the heaviest per hit: you are right there, the freeze sells the contact.
  melee: { stop: 0.04, knock: 9, lift: 5, trauma: 0.35 },
  // Ranged fires fast: a short tick of stop so a burst does not stutter, lighter push.
  ranged: { stop: 0.02, knock: 5.5, lift: 3, trauma: 0.15 },
  // Bombs and blasts: big freeze, big push, big shake.
  blast: { stop: 0.07, knock: 12, lift: 8, trauma: 0.5 },
  // Vehicle ram: a hefty thump.
  ram: { stop: 0.05, knock: 12, lift: 6, trauma: 0.45 },
  // Pets and guard drones fight for you: no freeze (you did not swing), small push.
  summon: { stop: 0, knock: 5, lift: 3, trauma: 0 },
  // Turrets and spikes at the base: no freeze, no shake, so a raid never stutters the game.
  defence: { stop: 0, knock: 6, lift: 4, trauma: 0 },
};
