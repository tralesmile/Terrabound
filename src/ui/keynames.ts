/** The button names prompts should show: the player's own key bindings, or controller buttons. Pure. */
import { keyLabel, type KeyMap } from '../sim/keys';

export interface PromptKeys {
  use: string;
  recall: string;
  jump: string;
  down: string;
}

export function promptKeys(keys: KeyMap, pad: boolean): PromptKeys {
  if (pad) return { use: 'X', recall: 'R3', jump: 'A', down: 'DOWN' };
  return { use: keyLabel(keys.interact), recall: keyLabel(keys.recall), jump: keyLabel(keys.jump), down: keyLabel(keys.down) };
}

/** Fill {use}, {recall}, {jump} and {down} in a prompt. */
export function fillKeys(text: string, k: PromptKeys): string {
  return text.replace(/\{(use|recall|jump|down)\}/g, (_, id: keyof PromptKeys) => k[id]);
}
