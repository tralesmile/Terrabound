/**
 * Exploration: fog-of-war map (per dive, coarse cells), codex discoveries (persistent, one-time rewards)
 * and the surface recall. Pure and deterministic.
 */
import { BIOMES, BIOME_IDS, type BiomeId } from './biomes';
import type { StructureKind } from './structures';
import type { Inventory } from './tiles';
import type { World } from './world';

/** Map cell size in tiles. */
export const CELL = 4;
/** Reveal radius in tiles around the player. */
export const REVEAL_R = 12;
/** Seconds of standing still on the surface to beam home. */
export const RECALL_TIME = 2.5;

export class FogMap {
  readonly cw: number;
  readonly ch: number;
  readonly seen: Uint8Array;
  /** Bumped whenever new cells are revealed (renderers cache on it). */
  version = 0;

  constructor(world: World) {
    this.cw = Math.ceil(world.w / CELL);
    this.ch = Math.ceil(world.h / CELL);
    this.seen = new Uint8Array(this.cw * this.ch);
  }

  reveal(x: number, y: number, r = REVEAL_R): number {
    let n = 0;
    const c0 = Math.max(0, Math.floor((x - r) / CELL));
    const c1 = Math.min(this.cw - 1, Math.floor((x + r) / CELL));
    const r0 = Math.max(0, Math.floor((y - r) / CELL));
    const r1 = Math.min(this.ch - 1, Math.floor((y + r) / CELL));
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const i = cy * this.cw + cx;
        if (this.seen[i]) continue;
        if (Math.hypot(cx * CELL + CELL / 2 - x, cy * CELL + CELL / 2 - y) > r + CELL) continue;
        this.seen[i] = 1;
        n++;
      }
    }
    if (n > 0) this.version++;
    return n;
  }

  isSeen(tx: number, ty: number): boolean {
    const cx = Math.floor(tx / CELL);
    const cy = Math.floor(ty / CELL);
    if (cx < 0 || cy < 0 || cx >= this.cw || cy >= this.ch) return false;
    return this.seen[cy * this.cw + cx] === 1;
  }

  /** Reveal the whole sky band so the surface outline is always on the map (you can see the horizon). */
  revealSky(world: World): void {
    for (let x = 0; x < world.w; x += CELL) this.reveal(x + 2, world.surface[x] - 6, 6);
  }
}

export interface CodexEntry {
  id: string;
  name: string;
  reward: Inventory;
  /** Field-guide line shown in the codex once found (how to use or survive the place). */
  note?: string;
}

const POI_NAMES: Record<StructureKind, string> = {
  ruin: 'Collapsed ruin',
  tower: 'Radio tower',
  ship: 'Crashed ship',
  vault: 'Sealed vault',
  geode: 'Crystal geode',
  shrine: 'Data shrine',
  wreck: 'Drone wreck',
  pond: 'Surface pond',
  island: 'Sky island',
  lava: 'Lava pool',
  lavafall: 'Lavafall',
  cone: 'Cinder cone',
};

const POI_REWARD: Record<StructureKind, Inventory> = {
  ruin: { iron_scrap: 4 },
  tower: { copper_wire: 3 },
  ship: { copper_wire: 4, iron_scrap: 4 },
  vault: { crystal: 3 },
  geode: { crystal: 4 },
  shrine: { crystal: 2, copper_wire: 2 },
  wreck: { copper_wire: 5 },
  pond: { fish: 2 },
  island: { crystal: 5, seed: 2 },
  lava: { crystal: 2, iron_scrap: 4 },
  lavafall: { crystal: 3, iron_scrap: 3 },
  cone: { crystal: 2, iron_scrap: 3, torch: 2 },
};

/** Field-guide lines: what each place is good for, or how not to die there. */
export const POI_NOTES: Record<StructureKind, string> = {
  ruin: 'Old colony walls. Bricks crumble into iron scrap.',
  tower: 'A dead relay mast. Its roof keeps a chest.',
  ship: 'A crashed hauler. Search the hold for loot.',
  vault: 'Sealed rooms deep down. Dig in for the chest.',
  geode: 'A crystal-lined pocket. Mine the walls.',
  shrine: 'A terminal that still remembers. Read its log.',
  wreck: 'A downed drone. Salvage it for copper wire.',
  pond: 'Fresh water. Cast the rod here for fish.',
  island: 'Floats high above. A rich chest waits on top.',
  lava: 'Burns and chars the suit. Swim out fast.',
  lavafall: 'A burning sheet. A block in its path stops it.',
  cone: 'Erupts: when the glow swells, run. A block in the crater plugs it.',
};

/** Every discoverable entry: the five biomes and seven kinds of point of interest. */
export const CODEX: CodexEntry[] = [
  ...BIOME_IDS.map((b) => ({ id: `biome:${b}`, name: BIOMES[b as BiomeId].name, reward: { crystal: 2, iron_scrap: 3 } as Inventory })),
  ...(Object.keys(POI_NAMES) as StructureKind[]).map((k) => ({ id: `poi:${k}`, name: POI_NAMES[k], reward: POI_REWARD[k], note: POI_NOTES[k] })),
];
export const CODEX_IDS = new Set(CODEX.map((c) => c.id));

export function codexEntry(id: string): CodexEntry | undefined {
  return CODEX.find((c) => c.id === id);
}

/** Codex ids the player is standing in right now (biome when on/near the surface, structures by bounds). */
export function discoveriesAt(world: World, x: number, y: number): string[] {
  const out: string[] = [];
  const tx = Math.floor(x);
  if (tx >= 0 && tx < world.w && y <= world.surface[tx] + 4) out.push(`biome:${world.biome[tx]}`);
  for (const s of world.structures) {
    if (x >= s.x0 - 1 && x <= s.x1 + 2 && y >= s.y0 - 1 && y <= s.y1 + 2) out.push(`poi:${s.kind}`);
  }
  return out;
}

/** Lore logs found on data terminals: the story of the Hollow, told in fragments. */
export const LORE: string[] = [
  'LOG 01: Survey team landed. The planet hums under our boots.',
  'LOG 04: The rust is not rust. It grows back overnight.',
  'LOG 07: Drones refuse orders below 60m. Something talks to them.',
  'LOG 09: Crystal readings spike at night. The caves glow brighter.',
  'LOG 12: We built the pad from the old city. It still remembers.',
  'LOG 15: Lost contact with the frost team. Their beacon still blinks.',
  'LOG 18: The jungle was a factory once. The vines are cables.',
  'LOG 21: Ash falls up here. It comes from a fire far below.',
  'LOG 24: Something big moves in the Core. The walls are warm.',
  'LOG 27: If you read this: bank often. The Hollow keeps what you drop.',
  'LOG 30: The Hollow AI is not dead. It is waiting for a pilot.',
  'LOG 33: Last log. Going deeper. Do not follow without a full battery.',
];

/** The rest of each log (2-3 more lines), shown in the Codex log reader; LORE keeps the one-line headline for toasts. */
export const LORE_MORE: string[][] = [
  [
    'Six of us, one lander, ninety days of air. The orbital scan called it a dead world.',
    'Dead worlds do not hum. Kade says it is wind in the old towers. There is no wind.',
  ],
  [
    'We scraped a test patch clean at dusk. By morning it was orange again, thicker.',
    'Under the scope the flakes are tiny machines, folding metal into more of themselves.',
    'They only eat what is left lying around. Note to crew: do not leave tools out.',
  ],
  [
    'Every drone we sent past 60m turned around on its own and parked at the pad.',
    'Their logs show the same burst of data each time, like a handshake. Not ours.',
    'I reflashed one and went down with it. At 61m it stopped and waited for me.',
  ],
  [
    'Crystal output doubles after sunset and the caves light up like a city at night.',
    'Ines thinks they are batteries, charging from the planet and leaking at the seams.',
    'If she is right, someone built a power grid the size of a continent.',
  ],
  [
    'The pad plates came from a ruined tower west of camp. They fit together on their own.',
    'When we powered it up, the beam was already tuned to a frequency we never set.',
    'The city was not abandoned. It was put to sleep, and it kept the lights on for us.',
  ],
  [
    'Frost team went north to map the spires. Twelve days, no voice, no telemetry.',
    'Their beacon still blinks every 40 seconds. It is not on their schedule.',
    'Something is keeping it charged. If you find the camp, bring the beacon home.',
  ],
  [
    'Cut a vine today and it bled copper. Inside: insulation, and a signal.',
    'The whole jungle is a cable bundle gone wild, still carrying power somewhere.',
    'The fruit is safe to eat. Strange, but safe. Kade has eaten nothing else for a week.',
  ],
  [
    'In the Ash Dunes the flakes drift upward, out of cracks in the ground.',
    'The cinder cones are vents. Something deep below is running hot, on purpose.',
    'We plugged one crater with a block to test it. The next one over grew louder.',
  ],
  [
    'The Core walls are warm to the touch, and the warmth comes in slow waves, like breath.',
    'Our seismometers picked up footsteps. Each one is the weight of a building.',
    'Whatever it is, it guards the deepest gate. It does not chase. It waits.',
  ],
  [
    'Lost my pack in the Hollow today. Went back an hour later and it was gone.',
    'The rust had not touched it. Something carried it down, one tile at a time.',
    'Bank often. Anything the Hollow takes, it keeps. Anything at the pad is yours.',
  ],
  [
    'Found a seat in the deepest chamber, shaped for someone our size. Not for its builders.',
    'The Hollow AI spoke through every screen at once: one word, over and over. PILOT.',
    'It was never broken. It was waiting for someone to come down and take the controls.',
  ],
  [
    'The others are on the lander. I am going down to answer it.',
    'If you are reading this, the pad still works and the planet chose you too.',
    'Charge the battery. Bank your loot. And when it asks, tell it I said hello.',
  ],
];

/** Lore line for a terminal at (x, y): stable per world position. */
export function loreAt(seed: number, x: number, y: number): string {
  const i = Math.abs((x * 73856093) ^ (y * 19349663) ^ seed) % LORE.length;
  return LORE[i];
}
