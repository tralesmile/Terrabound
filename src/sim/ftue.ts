/**
 * Guided first minutes (FTUE): an ordered chain of small goals shown as one GOAL card under the HUD.
 * Progress reads the award counters (achievements.ts), so it needs no save field and a returning
 * player who already did a step never sees it. The card hides once every step is done.
 */
import type { Awards, Counter } from './achievements';
import type { BossId } from './bosses';

export interface GoalStep {
  id: string;
  /** Short imperative, desktop and touch variants ({key} is filled by the UI). */
  text: string;
  touch: string;
  stat: Counter;
  goal: number;
  /** A boss step: done when this boss is in the defeated list (stat and goal are then unused). */
  boss?: BossId;
}

export const FTUE_STEPS: readonly GoalStep[] = [
  { id: 'dig', text: 'Click blocks to drill down', touch: 'Tap blocks to drill down', stat: 'mined', goal: 8 },
  { id: 'deep', text: 'Dig 15 m deep and look for ore', touch: 'Dig 15 m deep and look for ore', stat: 'depth', goal: 15 },
  { id: 'bank', text: 'Return to the pad to bank your loot', touch: 'Return to the pad to bank your loot', stat: 'banked', goal: 10 },
  { id: 'upgrade', text: 'Buy an upgrade at the workshop ({shop})', touch: 'Buy an upgrade: tap SHOP at the pad', stat: 'upgrades', goal: 1 },
  { id: 'chest', text: 'Find and open a chest', touch: 'Find and open a chest', stat: 'chests', goal: 1 },
  { id: 'kill', text: 'Destroy 3 enemies (blade: 2, pistol: 3)', touch: 'Destroy 3 enemies with the blade or pistol', stat: 'kills', goal: 3 },
  { id: 'craft', text: 'Craft something in the workshop', touch: 'Craft something in the workshop', stat: 'crafted', goal: 1 },
];

/** Index of the first unfinished step, or FTUE_STEPS.length when the chain is complete. */
export function goalIndex(aw: Awards): number {
  const i = FTUE_STEPS.findIndex((s) => (aw.n[s.stat] ?? 0) < s.goal);
  return i < 0 ? FTUE_STEPS.length : i;
}

/** The current goal with its progress, or null when done. */
export function currentGoal(aw: Awards): { step: GoalStep; index: number; have: number } | null {
  const i = goalIndex(aw);
  const step = FTUE_STEPS[i];
  if (!step) return null;
  return { step, index: i, have: Math.min(step.goal, aw.n[step.stat] ?? 0) };
}

/**
 * "What next?" after the first minutes: layers and bosses in the order the planet is meant to be met.
 * Same card, same rules (no timers, no penalty, nothing lost by skipping ahead): a step already done is
 * skipped, so a player who dived early just sees the next thing they have not done.
 */
export const MID_STEPS: readonly GoalStep[] = [
  { id: 'circuit', text: 'Dig down to the Circuit layer (90 m)', touch: 'Dig down to the Circuit layer (90 m)', stat: 'depth', goal: 90 },
  { id: 'colossus', text: 'Craft a Scrap beacon at the fabricator and beat the Junk Colossus', touch: 'Craft a Scrap beacon and beat the Junk Colossus', stat: 'bosses', goal: 1, boss: 'colossus' },
  { id: 'warden', text: 'Craft a Logic key and beat the Logic Warden in the Circuit layer', touch: 'Craft a Logic key and beat the Logic Warden', stat: 'bosses', goal: 1, boss: 'warden' },
  { id: 'trio', text: 'Beat a third boss: Vine Queen, Crystal Golem, Ash Wyrm or Frost Titan', touch: 'Beat a third boss: Vine Queen, Crystal Golem, Ash Wyrm or Frost Titan', stat: 'bossKinds', goal: 3 },
  { id: 'plasma', text: 'Dig down to the Plasma layer (180 m)', touch: 'Dig down to the Plasma layer (180 m)', stat: 'depth', goal: 180 },
  { id: 'core', text: 'Dig down to the Core (270 m)', touch: 'Dig down to the Core (270 m)', stat: 'depth', goal: 270 },
  { id: 'hollow', text: 'Craft a Core key and face The Hollow AI', touch: 'Craft a Core key and face The Hollow AI', stat: 'bosses', goal: 1, boss: 'hollow_ai' },
];

/** The whole guided chain: first minutes, then what next. */
export const GOAL_STEPS: readonly GoalStep[] = [...FTUE_STEPS, ...MID_STEPS];

function stepHave(s: GoalStep, aw: Awards, bosses: readonly BossId[]): number {
  if (s.boss) return bosses.includes(s.boss) ? 1 : 0;
  return Math.min(s.goal, aw.n[s.stat] ?? 0);
}

/** Index in GOAL_STEPS of the first unfinished step (GOAL_STEPS.length when everything is done). */
export function chainIndex(aw: Awards, bosses: readonly BossId[] = []): number {
  const i = GOAL_STEPS.findIndex((s) => stepHave(s, aw, bosses) < (s.boss ? 1 : s.goal));
  return i < 0 ? GOAL_STEPS.length : i;
}

/** The current step of the whole chain with its progress, or null once the planet is done. */
export function chainGoal(aw: Awards, bosses: readonly BossId[] = []): { step: GoalStep; index: number; have: number } | null {
  const index = chainIndex(aw, bosses);
  const step = GOAL_STEPS[index];
  return step ? { step, index, have: stepHave(step, aw, bosses) } : null;
}
