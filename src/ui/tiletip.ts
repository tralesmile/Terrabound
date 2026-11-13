/**
 * What a block or machine in the world is, in words: the desktop hover tooltip when the mouse rests
 * on a tile. Pure (no canvas) so tests can check every tile has a name and the dig line is right.
 */
import { isCropTile } from '../sim/farming';
import { ITEMS, T, TILES } from '../sim/tiles';
import type { ItemTip } from './itemtip';

/** Seconds the mouse must rest on one tile before its tip shows (keeps mining and building quiet). */
export const TILE_TIP_DWELL = 0.5;

/** One extra line for tiles that do something (machines, base furniture, world features). */
const NOTES: Partial<Record<number, string>> = {
  [T.PAD]: 'Home base: stand here to bank loot and heal.',
  [T.BEDROCK]: 'The bottom of the world.',
  [T.GATE]: 'Opens when the boss of this layer falls.',
  [T.CHEST]: 'Click or E to open.',
  [T.TERMINAL]: 'Click or E to read the log.',
  [T.WATER]: 'Swim with W. Fish here with the rod.',
  [T.ACID_POOL]: 'Burns while you swim in it.',
  [T.MAGMA]: 'Burns hard. Cools to basalt next to water.',
  [T.SOLAR]: 'Charges the base battery by day.',
  [T.SMELTER]: 'Turns rust into metal while powered.',
  [T.BATTERY]: 'Stores power for the night.',
  [T.MINER]: 'Digs ore by itself while powered.',
  [T.DRONE]: 'Sends a drone to mine nearby blocks.',
  [T.TURRET]: 'Shoots raiders near the base while powered.',
  [T.SPIKES]: 'Hurts enemies that walk over it.',
  [T.SHIELD]: 'Hardest wall there is.',
  [T.SAPLING]: 'Grows into a tree on soil.',
  [T.SPRINKLER]: 'Waters crops next to it.',
  [T.POT]: 'Unlocks meal recipes at the workshop.',
  [T.GARAGE]: 'Click or E to build and deploy vehicles.',
  [T.ICE]: 'Fish through it with the rod.',
  [T.JUMP_PAD]: 'Step on it to launch high.',
  [T.LIFT]: 'Climb it like a ladder, fast.',
  [T.PLATFORM]: 'Jump up through it, press S to drop.',
  [T.DOOR]: 'You walk through, enemies cannot.',
  [T.WINDOW]: 'Lets light in.',
  [T.LADDER]: 'Climb with W and S.',
};

/** Tooltip for tile `t`; `digPower` is the drill's current power (seconds = hardness / power). */
export function tileTip(t: number, digPower: number): ItemTip | null {
  const def = TILES[t];
  if (!def || t === T.AIR) return null;
  const lines: string[] = [];
  const note = NOTES[t];
  if (note) lines.push(note);
  else if (isCropTile(t)) lines.push(def.name.startsWith('Ripe') ? 'Ripe: dig it to harvest.' : 'Growing. Keep it watered.');
  if (def.liquid) {
    // Liquids flow; nothing to dig.
  } else if (!Number.isFinite(def.hardness)) lines.push('Unbreakable');
  else {
    const s = def.hardness / Math.max(0.01, digPower);
    const drop = def.drop ? ITEMS[def.drop]?.name : null;
    lines.push(`Dig ${s < 0.1 ? '<0.1' : s.toFixed(1)} s${drop ? `  ->  ${drop}` : ''}`);
  }
  const glows = def.glow && !def.liquid;
  return { title: def.name, lines, color: glows ? '#9fe8ff' : NOTES[t] ? '#ffcf4a' : '#ffffff' };
}

/** Tracks how long the mouse has rested on one tile; returns true once it has dwelt long enough. */
export class TileDwell {
  private key = -1;
  private held = 0;
  update(dt: number, tile: { x: number; y: number } | null, busy: boolean): boolean {
    if (!tile || busy) {
      this.key = -1;
      this.held = 0;
      return false;
    }
    const k = tile.y * 100000 + tile.x;
    if (k !== this.key) {
      this.key = k;
      this.held = 0;
    }
    this.held += dt;
    return this.held >= TILE_TIP_DWELL;
  }
}
