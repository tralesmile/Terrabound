/**
 * What an item is, in words: the hover tooltip over item cells and items lying in the world, and the
 * inventory's detail line. Pure (no canvas) so tests can check every item has one.
 */
import { BIOMES, type BiomeId } from '../sim/biomes';
import { BOSSES, bossForBeacon } from '../sim/bosses';
import { FOOD } from '../sim/fishing';
import { LAYERS } from '../sim/layers';
import type { Tool } from '../sim/game';
import { GEAR, type GearId } from '../sim/gear';
import { ITEMS, PLACEABLE, type ItemId } from '../sim/tiles';

export interface ItemTip {
  title: string;
  /** Short lines under the title (what it does, how to use it). */
  lines: string[];
  /** Title colour: gear and boss items stand out. */
  color: string;
}

const TOOL_TIPS: Record<Tool, ItemTip> = {
  drill: { title: 'Drill', lines: ['Hold click on a block to dig it.', 'Upgrade it at the workshop to dig harder rock.'], color: '#ffcf4a' },
  blade: { title: 'Energy blade', lines: ['Click to swing: strong up close.'], color: '#ffcf4a' },
  pistol: { title: 'Pulse pistol', lines: ['Click to shoot where you aim.'], color: '#ffcf4a' },
  rod: { title: 'Fishing rod', lines: ['Cast into water or lava, reel in when it bites.'], color: '#ffcf4a' },
  hook: { title: 'Grappling hook', lines: ['Click a ceiling or wall to latch on and swing.'], color: '#ffcf4a' },
};

const isTool = (id: string): id is Tool => id in TOOL_TIPS;
const isGear = (id: string): id is GearId => id in GEAR;

/** What the item does, as one line (also the inventory detail text). */
export function itemUse(id: ItemId): string {
  const food = FOOD[id];
  const bossFor = bossForBeacon(id);
  if (bossFor) {
    const b = BOSSES[bossFor];
    // The final boss lives in a deep layer, not a surface biome.
    const where = b.layer !== undefined ? `the ${LAYERS[b.layer]?.name ?? 'deep'} layer` : `the ${BIOMES[b.biome as BiomeId]?.name ?? 'right biome'}`;
    return `Summons the ${b.name}. Use it in ${where}, away from the pad.`;
  }
  if (food) return `Eat: +${food.hp} HP${food.battery ? `, +${food.battery} battery` : ''}`;
  const def = ITEMS[id];
  if (def.places !== null || def.placesWall !== undefined) return 'Build with it (right click / BUILD mode)';
  return 'Material: spend it at the workshop';
}

/** Tooltip for an item, tool or gear id; `count` adds "x N" to the title. */
export function itemTip(id: ItemId | Tool | GearId, count?: number | null): ItemTip {
  const n = count && count > 1 ? `  x${count}` : '';
  if (isTool(id)) return TOOL_TIPS[id];
  if (isGear(id) && !(id in ITEMS)) {
    const g = GEAR[id];
    return { title: g.name + n, lines: [g.desc], color: '#9ff6a0' };
  }
  const item = id as ItemId;
  const def = ITEMS[item];
  if (!def) return { title: String(id), lines: [], color: '#ffffff' };
  const lines = [itemUse(item)];
  if (PLACEABLE.includes(item) && def.places !== null) lines.push('Hold it on the build bar, then right click a spot.');
  return { title: def.name + n, lines, color: bossForBeacon(item) ? '#ff9a3c' : '#ffffff' };
}
