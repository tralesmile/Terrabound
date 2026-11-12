/**
 * Guided first minutes (FTUE): an ordered chain of small goals shown as one GOAL card under the HUD.
 * Progress reads the award counters (achievements.ts), so it needs no save field and a returning
 * player who already did a step never sees it. The card hides once every step is done.
 */
import type { Awards, Counter } from './achievements';

export interface GoalStep {
  id: string;
  /** Short imperative, desktop and touch variants ({key} is filled by the UI). */
  text: string;
  touch: string;
  stat: Counter;
  goal: number;
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
