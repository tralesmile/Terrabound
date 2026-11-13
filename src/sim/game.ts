import { activePaint, nextPaint, type PaintDef, type PaintSlot } from './paints';
import { CREW_KINDS, codexRows, noteCodexEvent, type CodexRow } from './codex';
import { currentGoal, FTUE_STEPS, goalIndex } from './ftue';
import { awardGift, checkAwards, countEvent, newAwards, noteMax, sanitizeAwards, type Awards, type Tier } from './achievements';
import { stepPref, type PrefKey, type Prefs } from './settings';
import { DEFAULT_KEYS, rebind, type BindId, type KeyMap } from './keys';
import { decodeSeed, encodeSeed } from './seedcode';
import { noteBoss, noteDepth, noteLoot, startAttempt, type RecordBeat, type WorldRecord } from './records';
import { hash2, mixSeed, mulberry32 } from './rng';
import { ENEMIES, ENEMY_HIT_IFRAMES, type Enemy, type EnemyKind, enemyBoxHits, enemyOverlapsBox, makeEnemy, spawnableKinds, stepEnemy } from './enemies';
import { type Body, moveX, moveY, onLadder, probeGround, unstick, BODY_H, HALF_W } from './physics';
import { defaultSave, type SaveData } from './save';
import {
  type Inventory,
  type ItemId,
  ITEMS,
  PLACEABLE,
  T,
  TILES,
  canAfford,
  invAdd,
  invCount,
  invTotal,
  isMinable,
  pay,
} from './tiles';
import { UPGRADES, derive, upgradeById, type Derived, type Levels } from './upgrades';
import { recipeById } from './recipes';
import { chestLoot } from './loot';
import { SOIL_TILES, growTime, inLavafall, stepSaplings } from './structures';
import { addDrop, makeDrop, stepDrops, type Drop } from './drops';
import { BIOME_BOSSES, FINAL_BOSS, ARENA_HALF, ATTACK_TIME, BOLT_DMG, BOSSES, SLAM_DMG, SLAM_RADIUS, bossForBeacon, bossHits, makeBoss, stepBoss, type AttackKind, type Boss, type BossBolt, type BossId } from './bosses';
import { BIOMES, type BiomeId } from './biomes';
import { LAYERS, layerAt, openGates } from './layers';
import { METEOR_RATE, weatherAt, weatherEnemy, type WeatherKind } from './weather';
import { MAX_PART, VEHICLES, defaultGarage, isVehicle, partCost, partsOf, vehicleStats, type PartId, type PartLevels, type VehicleId } from './garage';
import { GEAR, gearStats, sanitizeGear, type GearId, type GearSlot, type GearStats } from './gear';
import { FOOD, bestHeal, type Fishing, catchFor, castTarget, biteDelay, BITE_WINDOW, CAST_RANGE } from './fishing';
import { daylight } from './daynight';
import { awaySeconds, simulateOffline, OFFLINE_MIN, type OfflineResult } from './offline';
import { automationHint, stepGrid, newPower, scanMachines, stepSmelting, stepMining, stepDrones, SMELT_RUST, type PowerState } from './power';
import { DRONE_ROLES, ENEMY_NEAR, HP_LOW, DEEP_AT, RULE_MAX, ROLE_INFO, sanitizeRules, type DroneRule, listBays, nextRole, roleOf, stepFieldDrones, surveyBays, syncDrones, type DroneEvent, type DroneRole, type FieldDrone, GUARD_DMG } from './drones';
import { LIQUID_HZ, coolMagma, flowLiquids, isLiquid } from './liquids';
import { isNight, DAY_LENGTH } from './daynight';
import { SPIKE_DMG, SPIKE_TICK, turretStats, chewTime, machineGoal, spikeVictims, stepTurrets, syncTurrets, type Turret } from './defences';
import { findRooms, mountOk, roomHint, type Room } from './rooms';
import { RESEARCH, applyResearch, researchMissing, type ResearchId } from './research';
import { MODS, applyMods, bounce, fitMod, type ModId, type ModSlot } from './mods';
import { BUFF_TIME, CHARGED_DRAIN, MEAL_BUFF, STURDY_TAKEN, SWIFT_SPEED, hasPotIn, stepBuffs, type Buffs, GARDENER_MOODS, cropAt, cropOfSeed, grassSeed, growCrops, harvestYield, isCropTile, isWatered, plantCrop, ripeIn, stepCrops, type CropId } from './farming';
import { NPC_INFO, NPC_ORDER, TRADES, deathKeep, doTrade, moodGive, npcLine, npcMood, type Mood, npcSpots, reactNpcs, roomFloor, stepNpc, syncNpcs, tradeOpen, type Npc, type NpcKind, type Trade } from './npcs';
import { merchantDay, merchantPresent, merchantStock } from './merchant';
import { placement, removeTile } from './wide';
import { blueprintDrop, RAID_WARN, warnDue, RAID_ENTRY, baseValue, chewTarget, raidPlan, raidReward, raidSize, raidTarget, unstickEnemy, type Raid } from './raids';
import { applyDiff, captureDiff } from './persist';
import { FogMap, RECALL_TIME, codexEntry, discoveriesAt, loreAt } from './explore';
import { FALLER_DMG, HAZARD, type Faller, type HazardField, fallerHits, findCeiling, inGas, placeHazards, stepFaller } from './hazards';
import { BASE_HALF, BASE_ROWS, captureBase, captureWalls, stampBase, stampWalls } from './base';
import { PAD_HALF, SPAWN_LIGHT_MAX, W, World, generateWorld } from './world';

export const GRAVITY = 42;
export const MAX_FALL = 28;
export const JUMP_V = 15.5;
export const FALL_SAFE = 19;
/** Swimming: max stroke speed up, max sink speed, acid damage per second. */
export const SWIM_UP = 7;
export const SINK = 3;
export const LEAP_V = 14;
/** Acid damage per second; the value lives on the tile (TILES[T.ACID_POOL].dps). */
export const ACID_DPS = 24;
export const CLIMB_UP = 5;
export const CLIMB_DOWN = 7;
/** Lift shafts ride this many times faster than ladders. */
export const LIFT_MUL = 3;
export const REACH = 4.2;
export const FIXED_DT = 1 / 60;
/** Columns around the pad where nothing spawns at night. */
export const NIGHT_SAFE = 30;

export interface Controls {
  /** -1..1 */
  moveX: number;
  jump: boolean;
  dig: boolean;
  place: boolean;
  /** Optional: descend ladders faster. */
  down?: boolean;
  /** Tile under the pointer, or null. */
  aim: { tx: number; ty: number } | null;
  /** Dash (needs dash boots). */
  dash?: boolean;
  /** Reel the grappling rope in (touch REEL hold button; desktop reels by holding dig). */
  reel?: boolean;
}

export const NO_CONTROLS: Controls = { moveX: 0, jump: false, dig: false, place: false, aim: null };

export type GameEvent =
  | { t: 'dig'; x: number; y: number }
  | { t: 'break'; x: number; y: number; tile: number }
  | { t: 'pickup'; item: ItemId; x: number; y: number }
  | { t: 'place'; x: number; y: number }
  | { t: 'full' }
  | { t: 'chest'; x: number; y: number; items: number }
  | { t: 'discover'; id: string; name: string }
  | { t: 'recallstart' }
  | { t: 'recallcancel' }
  | { t: 'recall' }
  | { t: 'nightfall' }
  | { t: 'raidstart'; n: number; side: number }
  | { t: 'raidchew'; x: number; y: number; tile: number }
  | { t: 'raidclear'; n: number; reward: Inventory; blueprint: string | null }
  | { t: 'raidend' }
  | { t: 'roomready'; x: number; y: number }
  | { t: 'npcarrive'; kind: NpcKind }
  | { t: 'npcleave'; kind: NpcKind }
  | { t: 'npctalk'; kind: NpcKind }
  | { t: 'merchant'; here: boolean }
  | { t: 'trade'; id: string }
  | { t: 'modbuy'; id: ModId }
  | { t: 'research'; id: ResearchId }
  | { t: 'leech'; x: number; y: number; n: number }
  | { t: 'ricochet'; x: number; y: number }
  | { t: 'raidwarn'; n: number; side: number; secs: number }
  | { t: 'turretshot'; x: number; y: number; tx: number; ty: number }
  | { t: 'spikehit'; x: number; y: number }
  | { t: 'lore'; text: string }
  | { t: 'eat'; item: ItemId }
  | { t: 'cast'; x: number; y: number }
  | { t: 'bite' }
  | { t: 'catch'; item: ItemId; n: number }
  | { t: 'reel' }
  | { t: 'nosoil' }
  | { t: 'nomount' }
  | { t: 'craftgear'; id: GearId }
  | { t: 'mount' }
  | { t: 'garage' }
  | { t: 'deploy'; id: VehicleId }
  | { t: 'part'; id: VehicleId; part: PartId; level: number }
  | { t: 'novehicle'; reason: string }
  | { t: 'dismount' }
  | { t: 'hook'; x: number; y: number }
  | { t: 'unhook' }
  | { t: 'dash' }
  | { t: 'boom'; x: number; y: number }
  | { t: 'bossspawn'; id: BossId }
  | { t: 'bosswarn'; kind: AttackKind }
  | { t: 'bossslam'; x: number; y: number }
  | { t: 'bosshit'; x: number; y: number; dmg: number }
  | { t: 'bossdown'; id: BossId; first: boolean }
  | { t: 'bossgone' }
  | { t: 'nosummon'; reason: string }
  | { t: 'gateopen' }
  | { t: 'weather'; kind: WeatherKind }
  | { t: 'meteor'; x: number; y: number }
  | { t: 'zap'; x: number; y: number; tx: number; ty: number }
  | { t: 'victory'; first: boolean }
  | { t: 'grow' }
  | { t: 'plant'; crop: CropId; secs: number; wet: boolean }
  | { t: 'harvest'; crop: CropId; n: number; x: number; y: number }
  | { t: 'dawn' }
  | { t: 'fell'; x: number; y: number; tiles: number }
  | { t: 'hurt'; amount: number }
  | { t: 'bank'; total: number }
  | { t: 'death'; lost: number; medic: boolean }
  | { t: 'jump' }
  | { t: 'land'; speed: number }
  | { t: 'lowbattery' }
  | { t: 'upgrade'; id: string }
  | { t: 'craft'; id: string }
  | { t: 'smelt'; made: number }
  | { t: 'newdive' }
  | { t: 'award'; id: string; name: string; tier: Tier; gift: Partial<Record<ItemId, number>> }
  | { t: 'goal'; id: string; next: number }
  | { t: 'record'; beat: RecordBeat; value: number; code: string }
  | { t: 'swing'; dir: number }
  | { t: 'enemyhit'; x: number; y: number; dmg: number }
  | { t: 'enemykill'; x: number; y: number; kind: EnemyKind }
  | { t: 'shoot'; x: number; y: number }
  | { t: 'shothit'; x: number; y: number }
  | { t: 'drip'; x: number; y: number }
  | { t: 'splash'; x: number; y: number; kind: 'acid' | 'debris' }
  | { t: 'steam'; x: number; y: number }
  | { t: 'gas' }
  | { t: 'dronerole'; role: DroneRole; name: string }
  | DroneEvent;

export type Tool = 'drill' | 'blade' | 'pistol' | 'rod' | 'hook';
export const TOOLS: readonly Tool[] = ['drill', 'blade', 'pistol', 'rod', 'hook'];
export const PISTOL_DMG = 8;
export const PISTOL_CD = 0.35;
export const PISTOL_SPEED = 22;
export const PISTOL_LIFE = 0.9;
export const PISTOL_COST = 0.5;
export const HITSTOP = 0.04;

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  /** Damage per hit (defaults to the pistol's). */
  dmg?: number;
  /** Rail bolts pass through enemies (each hit once). */
  pierce?: boolean;
  /** Bombs fall and explode. */
  bomb?: boolean;
  /** Ricochet chip: wall bounces left. */
  bounces?: number;
  hit?: number[];
}

/** Grappling hook: anchored rope with a maximum length (pendulum constraint). */
export interface Hook {
  ax: number;
  ay: number;
  len: number;
}
export const HOOK_RANGE = 14;
export const HOOK_REEL = 9;
export const BOMB_RADIUS = 2.2;
export const JET_THRUST = 95;
export const JET_MAX = 9;
export const JET_DRAIN = 6;
export const GLIDE_FALL = 2.5;
/** How close you must stand to a parked vehicle to get in. */
export const MOUNT_RANGE = 2.5;
export const BLADE_DMG = 12;
export const BLADE_RANGE = 2.1;
export const BLADE_CD = 0.32;
export const MAX_ENEMIES = 8;
export const IFRAMES = 0.8;

export class Game {
  world: World;
  body: Body = { x: 0, y: 0, vx: 0, vy: 0, onGround: true };
  hp = 100;
  battery = 240;
  carried: Inventory = {};
  stash: Inventory = {};
  upgrades: Levels = {};
  selected: ItemId = 'rust';
  tool: Tool = 'drill';
  enemies: Enemy[] = [];
  /** Seconds of player invulnerability after a hit. */
  iframes = 0;
  /** Meal buffs with seconds left (farming.ts); saved since v17. */
  buffs: Buffs = {};
  /** Remaining swing animation time (render only). */
  swing = 0;
  private rng = mulberry32(1);
  private nextEnemyId = 1;
  private spawnCd = 3;
  private bladeCd = 0;
  private pistolCd = 0;
  shots: Shot[] = [];
  fallers: Faller[] = [];
  hazards: HazardField = { emitters: [], gas: [] };
  /** True while the player stands in a gas pocket (render/HUD). */
  inGas = false;
  private debrisCd = 5;
  private gasTick = 0;
  /** Seconds of sim freeze after landing a hit (game feel). */
  hitStop = 0;
  mining: { tx: number; ty: number; progress: number } | null = null;
  facing = 1;
  time = 0;
  runDeepest = 0;
  events: GameEvent[] = [];
  /** Explored map for this dive. */
  fog!: FogMap;
  /** Surface recall progress in seconds (0 = idle). */
  recallT = 0;
  private discoverCd = 0;
  private wasNight = false;
  /** Tonight's base raid, if one is under way (raids.ts). */
  raid: Raid | null = null;
  /** Tonight's raid is coming: which side, how many, and the game time it should start (HUD countdown, map arrow). */
  raidWarn: { side: number; n: number; at: number } | null = null;
  private gearCache: GearStats | null = null;
  /** Garage whose panel is open (closes when out of reach). */
  garageOpen: { x: number; y: number } | null = null;
  private drillT = 0;
  /** The pet's position (render) and zap cooldown. */
  pet = { x: 0, y: 0, cd: 0 };
  /** Robot NPCs living in base rooms (npcs.ts); derived from the world, never saved. */
  npcs: Npc[] = [];
  private npcSync: { v: number; first: boolean } = { v: -1, first: true };
  /** Merchant presence last frame near the base (null until the first look, so loading is silent). */
  private merchantWas: boolean | null = null;
  /** Current weather or world event (weather.ts). */
  weather: WeatherKind = 'clear';
  /** Falling meteors during a shower. */
  meteors: { x: number; y: number; vx: number; vy: number }[] = [];
  private meteorAcc = 0;
  /** Active boss fight (one at a time). */
  boss: Boss | null = null;
  bossBolts: BossBolt[] = [];
  /** Telegraph currently shown (render): attack name and seconds of warning left. */
  bossWarn: { kind: AttackKind; t: number } | null = null;
  /** On the equipped vehicle. */
  riding = false;
  /** Grappling hook rope, when attached. */
  hook: Hook | null = null;
  private airJumpsLeft = 0;
  private dashT = 0;
  private dashCd = 0;
  private prevDash = false;
  /** Jetpack flame on this frame (render). */
  jetting = false;
  /** Gliding this frame (render). */
  gliding = false;
  /** Items lying in the world. */
  drops: Drop[] = [];
  /** Chest whose window is open (closes when out of reach). */
  chestOpen: { x: number; y: number } | null = null;
  private prevDig = false;
  /** Fishing line state (rod tool). */
  fishing: Fishing | null = null;
  /** Casts so far this session (seeds the bite timer and catch). */
  private casts = 0;
  /** Liquid tile the player's body centre is in (0 = none). */
  inLiquid = 0;
  private acidTick = 0;
  /** Seconds until a lavafall burns again while the player stands in it. */
  private fallBurn = 0;
  /** Base power grid snapshot (solar vs smelters), refreshed twice a second. */
  power: PowerState = newPower();
  private smeltProgress = 0;
  private machineCounts = { solars: 0, smelters: 0, batteries: 0, miners: 0, drones: 0 };
  /** Drone bay carry-over; not saved (at most one load is lost on reload). */
  private droneProgress = 0;
  private droneCount = 0;
  private mineProgress = 0;
  private mineCount = 0;
  private machineAcc = 0;
  /** Field drones launched from bays with a non-survey role (drones.ts). */
  drones: FieldDrone[] = [];
  /** Base turrets with their cooldown and barrel aim (defences.ts), re-synced with the machine scan. */
  turrets: Turret[] = [];
  private spikeAcc = 0;
  private surveyCount = 0;
  private liquidAcc = 0;
  private liquidTick = 0;
  private save: SaveData;
  private coyote = 0;
  private jumpBuf = 0;
  private prevJump = false;
  private placeCd = 0;
  private digTick = 0;
  private fullCd = 0;
  private lowWarned = false;
  private wasGround = true;

  constructor(save: SaveData = defaultSave()) {
    this.save = structuredClone(save);
    // Older in-memory saves (tests, fixtures) may lack awards; unlocks already earned are granted quietly.
    this.save.awards = this.save.awards ? sanitizeAwards(this.save.awards) : newAwards();
    checkAwards(this.save.awards);
    this.goalAt = goalIndex(this.save.awards);
    if (!Array.isArray(this.save.codex)) this.save.codex = [];
    this.save.gear = sanitizeGear(this.save.gear);
    if (!this.save.garage) this.save.garage = defaultGarage();
    if (!Array.isArray(this.save.bosses)) this.save.bosses = [];
    if (!this.save.drones || typeof this.save.drones !== 'object') this.save.drones = {};
    if (!this.save.droneRules || typeof this.save.droneRules !== 'object') this.save.droneRules = {};
    if (!Array.isArray(this.save.records)) this.save.records = [];
    this.stash = { ...save.stash };
    this.upgrades = { ...save.upgrades };
    this.buffs = { ...(this.save.buffs ?? {}) };
    // Crash/refresh safety: loot carried at last save is banked, never lost.
    const carried = { ...save.carried };
    let bankedTotal = 0;
    for (const id of Object.keys(carried) as ItemId[]) {
      const n = carried[id] ?? 0;
      if (ITEMS[id].kit) {
        invAdd(this.carried, id, n);
        continue;
      }
      bankedTotal += n;
      invAdd(this.stash, id, n);
    }
    this.save.stats.banked += bankedTotal;
    this.save.carried = {};
    // The current world persists until death: regenerate it from its seed, then replay the player's edits.
    this.world = generateWorld(this.diveSeed());
    this.fog = new FogMap(this.world);
    this.fog.revealSky(this.world);
    applyDiff(this.world, this.fog, this.save.world);
    stampBase(this.world, this.save.base);
    stampWalls(this.world, this.save.walls);
    openGates(this.world, this.biomeBossesBeaten());
    this.respawn(false);
    this.time = this.save.away.time;
    this.power = { ...newPower(), charge: this.save.away.charge };
  }

  /**
   * Run base machines for the time spent away (cap 8 h, clock-skew safe). Call once after loading, with the wall clock in ms.
   * Returns the summary, or null if the player was away less than a minute or there is nothing to run.
   */
  /** Crops that ripened during the last applyOffline (main.ts toasts it). */
  offlineRipe = 0;

  applyOffline(now: number): OfflineResult | null {
    const secs = awaySeconds(this.save.away.savedAt, now);
    this.save.away.savedAt = 0; // never apply the same absence twice
    if (secs < OFFLINE_MIN) return null;
    // Crops keep growing while you are away (robots are not synced yet, so only ponds and sprinklers water).
    this.offlineRipe = this.world.crops.size > 0 ? growCrops(this.world, secs) : 0;
    this.machineCounts = scanMachines(this.world);
    // Field drones idle while you are away; only survey bays keep working (and drawing power).
    const m = { ...this.machineCounts, drones: surveyBays(listBays(this.world), this.save.drones) };
    if (m.smelters + m.miners + m.drones === 0 && m.batteries === 0) return null;
    const r = simulateOffline(this.stash, m, { progressSmelt: this.smeltProgress, progressMine: this.mineProgress, mineCount: this.mineCount, droneProgress: this.droneProgress, droneCount: this.droneCount, charge: this.power.charge, time: this.time }, secs);
    this.smeltProgress = r.progressSmelt;
    this.mineProgress = r.progressMine;
    this.mineCount = r.mineCount;
    this.droneProgress = r.droneProgress;
    this.droneCount = r.droneCount;
    this.time = r.time;
    this.power = { ...this.power, charge: r.charge };
    return r.metal + r.scrap + r.rust + r.wire + r.crystal > 0 ? r : null;
  }

  get derived(): Derived {
    const d = derive(this.upgrades);
    const g = this.gear;
    return applyResearch({ ...d, maxHp: d.maxHp + g.maxHp, digPower: d.digPower * g.digMul, lampRadius: d.lampRadius + g.light }, this.save.research);
  }

  /** Prerequisite perks still missing before `id` can be studied. */
  researchNeeds(id: ResearchId): ResearchId[] {
    return researchMissing(this.save.research, id);
  }

  hasResearch(id: ResearchId): boolean {
    return this.save.research.includes(id);
  }

  /** The Scientist studies a perk: it must live in the base, prerequisites done, you can shop and pay from the stash. */
  canResearch(id: ResearchId): boolean {
    return !this.hasResearch(id) && researchMissing(this.save.research, id).length === 0 && this.hasNpc('scientist') && this.canShop() && canAfford(this.stash, this.npcPrice('scientist', RESEARCH[id].cost));
  }

  /** Study a perk for good. Battery and HP gains fill up right away so the new headroom is felt at once. */
  research(id: ResearchId): boolean {
    if (!this.canResearch(id)) return false;
    pay(this.stash, this.npcPrice('scientist', RESEARCH[id].cost));
    const before = this.derived;
    this.save.research.push(id);
    const after = this.derived;
    this.battery = Math.min(after.maxBattery, this.battery + Math.max(0, after.maxBattery - before.maxBattery));
    this.hp = Math.min(after.maxHp, this.hp + Math.max(0, after.maxHp - before.maxHp));
    this.emit({ t: 'research', id });
    return true;
  }

  /** Combined stats of the equipped gear (cached until the loadout changes). */
  get gear(): GearStats {
    if (!this.gearCache) this.gearCache = applyMods(gearStats(this.save.gear.equip), this.save.mods.fit);
    return this.gearCache;
  }

  ownsMod(id: ModId): boolean {
    return this.save.mods.owned.includes(id);
  }

  fittedMod(slot: ModSlot): ModId | undefined {
    return this.save.mods.fit[slot];
  }

  /** The Gunsmith builds a chip: it must live in the base, you must be able to shop and pay from the stash. */
  canBuyMod(id: ModId): boolean {
    return !this.ownsMod(id) && this.hasNpc('gunsmith') && this.canShop() && canAfford(this.stash, this.npcPrice('gunsmith', MODS[id].cost));
  }

  /** Buy a chip and fit it right away (like crafted gear is equipped right away). */
  buyMod(id: ModId): boolean {
    if (!this.canBuyMod(id)) return false;
    pay(this.stash, this.npcPrice('gunsmith', MODS[id].cost));
    this.save.mods.owned.push(id);
    this.fitMod(id);
    this.emit({ t: 'modbuy', id });
    return true;
  }

  /** Fit or take out an owned chip; free, wherever the workshop is open. */
  fitMod(id: ModId): boolean {
    if (!this.canShop() || !fitMod(this.save.mods, id)) return false;
    this.gearCache = null;
    return true;
  }

  ownsGear(id: GearId): boolean {
    return this.save.gear.owned.includes(id);
  }

  equipped(slot: GearSlot): GearId | undefined {
    return this.save.gear.equip[slot];
  }

  canCraftGear(id: GearId): boolean {
    return !GEAR[id].bossOnly && !GEAR[id].garage && !this.ownsGear(id) && this.isAtBase() && canAfford(this.stash, GEAR[id].cost);
  }

  /** Build gear at the workshop from stashed materials; it is equipped right away. */
  craftGear(id: GearId): boolean {
    if (!this.canCraftGear(id)) return false;
    pay(this.stash, GEAR[id].cost);
    this.save.gear.owned.push(id);
    this.equipGear(id);
    this.emit({ t: 'craftgear', id });
    return true;
  }

  /** Equip owned gear in its slot (equipping the worn item again takes it off, except starter weapons). */
  equipGear(id: GearId): boolean {
    if (!this.ownsGear(id)) return false;
    const slot = GEAR[id].slot;
    if (this.save.gear.equip[slot] === id && slot !== 'melee' && slot !== 'ranged') delete this.save.gear.equip[slot];
    else this.save.gear.equip[slot] = id;
    if (slot === 'vehicle' && !this.save.gear.equip.vehicle) this.riding = false;
    this.gearCache = null;
    this.hp = Math.min(this.hp, this.derived.maxHp);
    return true;
  }

  /**
   * V: get in the parked vehicle when standing next to it, or get out (it stays parked where you leave it).
   * Vehicles come from a garage (DEPLOY); there is one deployed vehicle at a time.
   */
  toggleRide(): boolean {
    const g = this.save.garage;
    const b = this.body;
    if (this.riding) {
      const id = this.save.gear.equip.vehicle;
      this.riding = false;
      if (id && isVehicle(id)) g.parked = { id, x: b.x, y: b.y };
      this.emit({ t: 'dismount' });
      return true;
    }
    const p = this.parkedVehicle();
    if (!p) {
      this.emit({ t: 'novehicle', reason: this.save.gear.owned.some((x) => isVehicle(x)) ? 'Deploy a vehicle from your garage first' : 'Build a garage (fabricator) to make vehicles' });
      return false;
    }
    if (Math.hypot(p.x - b.x, p.y - b.y) > MOUNT_RANGE) {
      this.emit({ t: 'novehicle', reason: 'Walk up to your vehicle to get in' });
      return false;
    }
    this.save.gear.equip.vehicle = p.id;
    this.gearCache = null;
    g.parked = null;
    this.riding = true;
    this.hook = null;
    b.x = p.x;
    this.emit({ t: 'mount' });
    return true;
  }

  /** The parked vehicle, resolving the "beside the pad" placeholder from old saves. */
  parkedVehicle(): { id: VehicleId; x: number; y: number } | null {
    const p = this.save.garage.parked;
    if (!p) return null;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      p.x = this.world.padX + 3.5;
      p.y = this.world.padY;
    }
    return p;
  }

  get vehicle(): GearId | null {
    return this.riding ? (this.save.gear.equip.vehicle ?? null) : null;
  }

  /** Stats of the vehicle being ridden (with its parts), or null on foot. */
  get vstats(): ReturnType<typeof vehicleStats> | null {
    const v = this.vehicle;
    return v && isVehicle(v) ? vehicleStats(v, partsOf(this.save.garage, v)) : null;
  }

  /** A garage bay within reach (E). */
  garageNear(): { x: number; y: number } | null {
    const b = this.body;
    for (let y = Math.floor(b.y - 4); y <= Math.floor(b.y + 2); y++)
      for (let x = Math.floor(b.x - 4); x <= Math.floor(b.x + 4); x++) if (this.world.get(x, y) === T.GARAGE && this.reachable(x, y)) return { x, y };
    return null;
  }

  /** A carport around the bay: plate back wall and a metal roof, only where there is open air. */
  private buildGarageFrame(tx: number, ty: number): void {
    const w = this.world;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 0; dy++) if (w.wall(tx + dx, ty + dy) === W.NONE) w.setWall(tx + dx, ty + dy, W.PLATE);
      if (w.get(tx + dx, ty - 4) === T.AIR) w.set(tx + dx, ty - 4, T.METAL);
    }
  }

  private garageOk(): boolean {
    return !!this.garageOpen && this.world.get(this.garageOpen.x, this.garageOpen.y) === T.GARAGE;
  }

  canBuildVehicle(id: VehicleId): boolean {
    return this.garageOk() && !this.ownsGear(id) && canAfford(this.stash, VEHICLES[id].cost);
  }

  /** Build a vehicle in the open garage (paid from the stash) and park it beside the bay. */
  buildVehicle(id: VehicleId): boolean {
    if (!this.canBuildVehicle(id)) return false;
    pay(this.stash, VEHICLES[id].cost);
    this.save.gear.owned.push(id);
    this.deployVehicle(id);
    this.emit({ t: 'craftgear', id });
    return true;
  }

  /** Park an owned vehicle beside the open garage's bay (it replaces the deployed one). */
  deployVehicle(id: VehicleId): boolean {
    const at = this.garageOpen;
    if (!at || !this.garageOk() || !this.ownsGear(id)) return false;
    if (this.riding) this.riding = false;
    this.save.gear.equip.vehicle = id;
    this.gearCache = null;
    // Just outside the carport frame (it spans 3 tiles each side), so jets can take off.
    this.save.garage.parked = { id, x: at.x + 4.5, y: at.y + 1 };
    this.emit({ t: 'deploy', id });
    return true;
  }

  /** Installed part levels of a vehicle (for the garage panel). */
  vehicleParts(id: VehicleId): Readonly<PartLevels> {
    return partsOf(this.save.garage, id);
  }

  /** True when the RIDE button should show: riding, or standing by the parked vehicle. */
  canMount(): boolean {
    if (this.riding) return true;
    const p = this.parkedVehicle();
    return !!p && Math.hypot(p.x - this.body.x, p.y - this.body.y) <= MOUNT_RANGE;
  }

  canUpgradePart(id: VehicleId, part: PartId): boolean {
    const lv = partsOf(this.save.garage, id)[part];
    return this.garageOk() && this.ownsGear(id) && lv < MAX_PART && canAfford(this.stash, partCost(part, lv));
  }

  upgradePart(id: VehicleId, part: PartId): boolean {
    if (!this.canUpgradePart(id, part)) return false;
    const levels = { ...partsOf(this.save.garage, id) };
    pay(this.stash, partCost(part, levels[part]));
    levels[part]++;
    this.save.garage.parts[id] = levels;
    this.emit({ t: 'part', id, part, level: levels[part] });
    return true;
  }

  /** Vehicle extras each frame: battery drain, ramming enemies, the drill tank's tunnelling. */
  private stepVehicle(dt: number): void {
    const vs = this.vstats;
    if (!vs) return;
    const b = this.body;
    if (!this.isAtBase() && !vs.flying) this.battery = Math.max(0, this.battery - vs.drain * dt);
    if (this.battery === 0 && !this.isAtBase()) {
      this.toggleRide();
      return;
    }
    if (vs.ram > 0 && Math.abs(b.vx) > 5) {
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.iframes > 0 || !enemyOverlapsBox(e, b.x + Math.sign(b.vx) * 0.6, b.y - 0.6, 0.7, 0.6)) continue;
        this.damageEnemy(e, vs.ram, Math.sign(b.vx));
      }
    }
    if (vs.drill) {
      this.drillT -= dt;
      if (this.drillT <= 0) {
        this.drillT = 0.18;
        const fx = Math.floor(b.x + this.facing * 1.1);
        for (const fy of [Math.floor(b.y - 0.5), Math.floor(b.y - 1.5)]) {
          const t = this.world.get(fx, fy);
          if (!TILES[t].solid || !isMinable(t) || t === T.PAD || t === T.CHEST) continue;
          if (Math.abs(fx - this.world.padX) <= 8 && Math.abs(fy - this.world.padY) <= 10) continue;
          const drop = TILES[t].drop;
          if (drop && invTotal(this.carried) >= this.derived.packCap) continue;
          this.world.set(fx, fy, T.AIR);
          if (drop) {
            invAdd(this.carried, drop, 1);
            this.emit({ t: 'pickup', item: drop, x: fx, y: fy });
          }
          this.emit({ t: 'break', x: fx, y: fy, tile: t });
        }
      }
    }
  }

  get depth(): number {
    return Math.max(0, this.body.y - this.world.padY);
  }

  get muted(): boolean {
    return this.save.settings.muted;
  }

  setMuted(m: boolean): void {
    this.save.settings.muted = m;
  }

  /** Settings screen options (volumes, shake, UI size). */
  get prefs(): Prefs {
    const s = this.save.settings;
    return { master: s.master, musicVol: s.musicVol, sfxVol: s.sfxVol, shake: s.shake, uiSize: s.uiSize, oreMarks: s.oreMarks, flashes: s.flashes, stickSide: s.stickSide };
  }

  /** Desktop key bindings. */
  get keys(): KeyMap {
    return this.save.settings.keys;
  }

  rebindKey(id: BindId, code: string): KeyMap {
    this.save.settings.keys = rebind(this.save.settings.keys, id, code);
    return this.keys;
  }

  resetKeys(): KeyMap {
    this.save.settings.keys = { ...DEFAULT_KEYS };
    return this.keys;
  }

  /** Step one option by d (clamped); returns the new prefs. */
  stepPref(key: PrefKey, d: number): Prefs {
    Object.assign(this.save.settings, stepPref(this.prefs, key, d));
    return this.prefs;
  }

  get raidsOn(): boolean {
    return this.save.settings.raids;
  }

  /** Opt in or out of night base raids; turning them off sends tonight's raiders away. */
  setRaids(on: boolean): void {
    this.save.settings.raids = on;
    if (!on) this.endRaid();
  }

  get musicOn(): boolean {
    return this.save.settings.music !== false;
  }

  setMusic(on: boolean): void {
    this.save.settings.music = on;
  }

  get stats(): SaveData['stats'] {
    return this.save.stats;
  }

  get runs(): number {
    return this.save.runs;
  }

  private diveSeed(): number {
    return this.save.worldSeed ?? mixSeed(this.save.seedBase, this.save.runs);
  }

  /** Shareable code for the current world (see seedcode.ts). */
  /**
   * Your local record for this world when it came from a shared code (Daily Dive, a friend's code);
   * null on a random world. A shared world loaded from an older save gets its record on first use.
   */
  worldRecord(): WorldRecord | null {
    if (this.save.worldSeed === null) return null;
    const code = this.seedCode;
    if (this.save.records[0]?.code === code) return this.save.records[0];
    const r = this.save.records.find((k) => k.code === code);
    return r ?? startAttempt(this.save.records, code);
  }

  get seedCode(): string {
    return encodeSeed(this.diveSeed());
  }

  isAtBase(): boolean {
    const b = this.body;
    return (
      Math.abs(b.x - (this.world.padX + 0.5)) <= PAD_HALF + 2 &&
      b.y <= this.world.padY + 0.05 &&
      b.y >= this.world.padY - 6
    );
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  private emit(e: GameEvent): void {
    if (this.events.length < 256) this.events.push(e);
    if (e.t === 'award' || e.t === 'goal') return;
    countEvent(this.save.awards, e);
    noteCodexEvent(this.save.awards, e);
    this.awardCheck();
  }

  /** Unlock awards whose goals are met and announce each one. */
  private awardCheck(): void {
    for (const d of checkAwards(this.save.awards)) {
      // A small one-time gift lands in the base stash with the star (nothing to claim, nothing expires).
      const gift = awardGift(d);
      for (const k of Object.keys(gift) as ItemId[]) invAdd(this.stash, k, gift[k] ?? 0);
      this.emit({ t: 'award', id: d.id, name: d.name, tier: d.tier, gift });
    }
    const gi = goalIndex(this.save.awards);
    if (gi > this.goalAt) {
      const done = FTUE_STEPS[this.goalAt];
      this.goalAt = gi;
      if (done) this.emit({ t: 'goal', id: done.id, next: gi });
    }
  }

  /** First unfinished guided goal (ftue.ts); set quietly on load. */
  private goalAt = 0;

  /** The current guided goal with progress, or null once the chain is done. */
  get goal(): ReturnType<typeof currentGoal> {
    return currentGoal(this.save.awards);
  }

  /** Suit paint worn now (earned and chosen), or null for the default look. */
  get paint(): PaintDef | null {
    return activePaint(this.save.awards, this.save.paint);
  }

  /** Cycle the suit paint: default -> each earned paint -> default. Returns the new paint (or null). */
  /** Helmet shell paint worn now, or null for the default look (lamp tier / crafted helmet). */
  get helmPaint(): PaintDef | null {
    return activePaint(this.save.awards, this.save.paintHelm);
  }

  /** Vehicle hull paint (every vehicle), or null for each vehicle's own colours. */
  get ridePaint(): PaintDef | null {
    return activePaint(this.save.awards, this.save.paintRide);
  }

  /** Paint worn in one slot. */
  paintIn(slot: PaintSlot): PaintDef | null {
    return slot === 'helm' ? this.helmPaint : slot === 'ride' ? this.ridePaint : this.paint;
  }

  /** Next earned paint for a slot (default -> each earned -> default). */
  cyclePaint(slot: PaintSlot = 'suit'): PaintDef | null {
    const next = nextPaint(this.save.awards, this.paintIn(slot)?.id ?? null);
    if (slot === 'helm') this.save.paintHelm = next;
    else if (slot === 'ride') this.save.paintRide = next;
    else this.save.paint = next;
    return this.paintIn(slot);
  }

  /** Codex screen rows (places, creatures, logs) from what this save knows. */
  get codexRows(): CodexRow[] {
    return codexRows({ codex: this.save.codex, bosses: this.save.bosses, awards: this.save.awards, present: CREW_KINDS.filter((k) => this.hasNpc(k)) });
  }

  /** Award progress (read-only view for the AWARDS page). */
  get awards(): Readonly<Awards> {
    return this.save.awards;
  }

  /** Put the player on the pad with full health and battery. A fresh world also gets a fresh map. */
  private respawn(freshWorld: boolean): void {
    if (freshWorld) {
      this.fog = new FogMap(this.world);
      this.fog.revealSky(this.world);
    }
    this.recallT = 0;
    this.shots = [];
    this.drops = [];
    this.boss = null;
    this.bossBolts = [];
    this.bossWarn = null;
    this.chestOpen = null;
    this.fishing = null;
    this.fallers = [];
    this.hazards = placeHazards(this.world);
    this.inGas = false;
    this.debrisCd = 5;
    this.gasTick = 0;
    const d = this.derived;
    this.body = { x: this.world.padX + 0.5, y: this.world.padY, vx: 0, vy: 0, onGround: true };
    unstick(this.world, this.body);
    this.hp = d.maxHp;
    this.battery = d.maxBattery;
    this.mining = null;
    this.enemies = [];
    this.raid = null;
    // A new world rebuilds the base from the save: robots re-home silently.
    this.npcs = [];
    this.npcSync = { v: -1, first: true };
    this.merchantWas = null;
    this.iframes = 0;
    this.swing = 0;
    this.bladeCd = 0;
    this.spawnCd = 3;
    this.rng = mulberry32(this.diveSeed() ^ 0x5eed);
    this.runDeepest = 0;
    this.lowWarned = false;
    this.wasGround = true;
  }

  private newWorld(worldSeed: number | null = null): void {
    this.save.base = captureBase(this.world);
    this.save.walls = captureWalls(this.world);
    this.save.runs += 1;
    this.save.worldSeed = worldSeed;
    this.world = generateWorld(this.diveSeed());
    this.save.world = null;
    // A new world: the deployed vehicle waits beside the new pad.
    const vid = this.save.gear.equip.vehicle;
    if (this.riding || this.save.garage.parked) this.save.garage.parked = vid && isVehicle(vid) ? { id: vid, x: Number.NaN, y: Number.NaN } : null;
    this.riding = false;
    stampBase(this.world, this.save.base);
    stampWalls(this.world, this.save.walls);
    openGates(this.world, this.biomeBossesBeaten());
    this.respawn(true);
  }

  /** Move carried loot into the stash. Returns the number of items banked. */
  bank(): number {
    let total = 0;
    for (const id of Object.keys(this.carried) as ItemId[]) {
      const n = this.carried[id] ?? 0;
      if (n <= 0 || ITEMS[id].kit) continue;
      total += n;
      invAdd(this.stash, id, n);
      delete this.carried[id];
    }
    if (total > 0) {
      this.save.stats.banked += total;
      this.emit({ t: 'bank', total });
      const rec = this.worldRecord();
      if (rec && noteLoot(rec, total)) this.emit({ t: 'record', beat: 'loot', value: rec.loot, code: rec.code });
      reactNpcs(this.npcs, 'wave');
    }
    this.save.stats.deepest = Math.max(this.save.stats.deepest, Math.floor(this.runDeepest));
    return total;
  }

  /** Abandon this world for a freshly generated one (from the workshop). Loot is banked first. */
  newDive(code?: string): boolean {
    if (!this.isAtBase()) return false;
    const seed = code === undefined ? null : decodeSeed(code);
    if (code !== undefined && seed === null) return false;
    this.bank();
    this.newWorld(seed);
    if (seed !== null) startAttempt(this.save.records, this.seedCode);
    this.emit({ t: 'newdive' });
    return true;
  }

  buyUpgrade(id: string): boolean {
    const def = upgradeById(id);
    if (!def || !this.isAtBase()) return false;
    const level = this.upgrades[def.id] ?? 0;
    if (level >= def.maxLevel) return false;
    if (this.save.stats.raids < (def.needRaids?.(level) ?? 0)) return false;
    const cost = def.cost(level);
    if (!canAfford(this.stash, cost)) return false;
    pay(this.stash, cost);
    this.upgrades[def.id] = level + 1;
    this.emit({ t: 'upgrade', id: def.id });
    return true;
  }

  /** A cooking pot stands in the base strip (meal recipes need one). */
  hasPot(): boolean {
    const w = this.world;
    return hasPotIn(w, w.padX - BASE_HALF, w.padX + BASE_HALF, w.padY - BASE_ROWS, w.padY - 1);
  }

  /** Craft at the base: pay from the stash, output goes to the pack (needs room). */
  craft(id: string): boolean {
    const r = recipeById(id);
    if (!r || !this.isAtBase() || (this.upgrades.fab ?? 0) < (r.fab ?? 0) || this.save.stats.raids < (r.raids ?? 0) || (r.pot && !this.hasPot()) || !canAfford(this.stash, r.cost)) return false;
    if (invTotal(this.carried) + r.qty > this.derived.packCap) return false;
    pay(this.stash, r.cost);
    invAdd(this.carried, r.out, r.qty);
    this.emit({ t: 'craft', id: r.id });
    return true;
  }

  upgradeCost(id: string): Inventory | null {
    const def = upgradeById(id);
    if (!def) return null;
    const level = this.upgrades[def.id] ?? 0;
    return level >= def.maxLevel ? null : def.cost(level);
  }

  selectPlaceable(index: number): void {
    const id = PLACEABLE[((index % PLACEABLE.length) + PLACEABLE.length) % PLACEABLE.length];
    this.selected = id;
  }

  setTool(t: Tool): void {
    this.tool = t;
    this.mining = null;
  }

  toggleTool(): void {
    this.setTool(TOOLS[(TOOLS.indexOf(this.tool) + 1) % TOOLS.length]);
  }

  cycleSelected(): void {
    this.selectPlaceable(PLACEABLE.indexOf(this.selected) + 1);
  }

  private die(): void {
    let lost = 0;
    const medic = this.hasNpc('medic');
    for (const id of Object.keys(this.carried) as ItemId[]) {
      const n = this.carried[id] ?? 0;
      const keep = deathKeep(n, medic);
      lost += n - keep;
      invAdd(this.stash, id, keep);
    }
    this.carried = {};
    this.save.stats.deaths += 1;
    this.save.stats.deepest = Math.max(this.save.stats.deepest, Math.floor(this.runDeepest));
    this.emit({ t: 'death', lost, medic });
    this.newWorld();
  }

  /** Standing on open ground under the sky, away from the pad: you can beam home. */
  canRecall(): boolean {
    const b = this.body;
    const tx = Math.floor(b.x);
    if (this.isAtBase() || this.hp <= 0 || tx < 0 || tx >= this.world.w) return false;
    return b.onGround && b.y <= this.world.surface[tx] + 0.5;
  }

  /** Start channelling the recall. Moving, digging or taking damage cancels it. */
  startRecall(): boolean {
    if (this.recallT > 0 || !this.canRecall()) return false;
    this.recallT = 1e-6;
    this.emit({ t: 'recallstart' });
    return true;
  }

  private cancelRecall(): void {
    if (this.recallT <= 0) return;
    this.recallT = 0;
    this.emit({ t: 'recallcancel' });
  }

  /** Pet follows a little behind and above the player; a spark pup zaps enemies close to it. */
  private stepPet(dt: number): void {
    const id = this.save.gear.equip.pet;
    if (!id) return;
    const b = this.body;
    const tx = b.x - this.facing * 1.4;
    const ty = b.y - BODY_H - 0.6 + Math.sin(this.time * 3) * 0.3;
    const p = this.pet;
    p.x += (tx - p.x) * Math.min(1, 5 * dt);
    p.y += (ty - p.y) * Math.min(1, 5 * dt);
    if (Math.hypot(p.x - b.x, p.y - b.y) > 12) {
      p.x = tx;
      p.y = ty;
    }
    const zap = this.gear.petZap;
    if (zap <= 0) return;
    p.cd = Math.max(0, p.cd - dt);
    if (p.cd > 0) return;
    for (const e of this.enemies) {
      if (e.hp <= 0 || Math.hypot(e.x - p.x, e.y - 0.4 - p.y) > 4) continue;
      this.damageEnemy(e, zap, Math.sign(e.x - p.x) || 1);
      this.emit({ t: 'zap', x: p.x, y: p.y, tx: e.x, ty: e.y - 0.4 });
      p.cd = 1;
      return;
    }
  }

  /** Weather changes, and meteors that fall near the player during a shower. */
  private stepWeather(dt: number): void {
    const w = weatherAt(this.world.seed, this.time);
    if (w !== this.weather) {
      this.weather = w;
      this.emit({ t: 'weather', kind: w });
    }
    const b = this.body;
    if (w === 'meteors' && this.depth < 25) {
      this.meteorAcc += dt * METEOR_RATE;
      while (this.meteorAcc >= 1) {
        this.meteorAcc -= 1;
        this.meteors.push({ x: b.x + (this.rng() - 0.5) * 50, y: 2, vx: (this.rng() - 0.5) * 8, vy: 18 });
      }
    }
    const keep: typeof this.meteors = [];
    for (const m of this.meteors) {
      const n = 4;
      let hit = false;
      for (let i = 0; i < n && !hit; i++) {
        m.x += (m.vx * dt) / n;
        m.y += (m.vy * dt) / n;
        if (m.y >= this.world.h - 3 || this.world.isSolid(Math.floor(m.x), Math.floor(m.y))) hit = true;
        else if (this.iframes === 0 && Math.abs(m.x - b.x) < 0.7 && m.y > b.y - BODY_H && m.y < b.y) {
          this.hurt(15);
          this.iframes = 0.6;
          hit = true;
        }
      }
      if (!hit) {
        keep.push(m);
        continue;
      }
      // Impact: a small crater and star-metal on the ground (never at the pad).
      if (Math.abs(m.x - this.world.padX) > 12) this.explode(m.x, m.y, 10, 1.4);
      const rich = hash2(Math.floor(m.x), Math.floor(m.y), this.world.seed) < 0.25;
      addDrop(this.drops, makeDrop('crystal', 2, m.x, m.y - 1, 0, -6));
      if (rich) addDrop(this.drops, makeDrop('plasma', 1, m.x, m.y - 1, 1, -7));
      this.emit({ t: 'meteor', x: m.x, y: m.y });
    }
    this.meteors = keep;
  }

  private stepExplore(dt: number, c: Controls): void {
    this.stepWeather(dt);
    this.stepPet(dt);
    const b = this.body;
    const night = isNight(this.time);
    if (warnDue(isNight, this.time, dt)) this.warnRaid();
    if (night !== this.wasNight) {
      this.wasNight = night;
      this.raidWarn = null;
      this.emit({ t: night ? 'nightfall' : 'dawn' });
      if (night) this.startRaid();
      else this.endRaid();
    }
    this.fog.reveal(b.x, b.y - BODY_H / 2);
    this.discoverCd -= dt;
    if (this.discoverCd <= 0) {
      this.discoverCd = 0.25;
      for (const id of discoveriesAt(this.world, b.x, b.y)) this.discover(id);
    }
    if (this.recallT > 0) {
      if (Math.abs(c.moveX) > 0.1 || c.jump || c.dig || c.place || !this.canRecall()) this.cancelRecall();
      else {
        this.recallT += dt;
        if (this.recallT >= RECALL_TIME) {
          this.recallT = 0;
          b.x = this.world.padX + 0.5;
          b.y = this.world.padY;
          b.vx = 0;
          b.vy = 0;
          this.mining = null;
          this.emit({ t: 'recall' });
        }
      }
    }
  }

  /** First visit to a codex entry: record it and pay its one-time reward into the stash. */
  discover(id: string): boolean {
    const entry = codexEntry(id);
    if (!entry || this.save.codex.includes(id)) return false;
    this.save.codex.push(id);
    for (const k of Object.keys(entry.reward) as ItemId[]) invAdd(this.stash, k, entry.reward[k] ?? 0);
    this.emit({ t: 'discover', id, name: entry.name });
    return true;
  }

  get codex(): readonly string[] {
    return this.save.codex;
  }

  private hurt(amount: number): void {
    this.cancelRecall();
    amount *= 1 - this.gear.armor;
    const vs = this.vstats;
    if (vs) amount *= 1 - vs.armor;
    if (this.buffs.sturdy) amount *= STURDY_TAKEN;
    this.hp -= amount;
    this.emit({ t: 'hurt', amount });
  }

  private reachable(tx: number, ty: number): boolean {
    const cx = this.body.x;
    const cy = this.body.y - BODY_H / 2;
    const dx = tx + 0.5 - cx;
    const dy = ty + 0.5 - cy;
    return dx * dx + dy * dy <= REACH * REACH;
  }

  /** Solar cells power smelters in the base; smelters turn stash rust into metal. Runs wherever the player is. */
  private stepMachines(dt: number): void {
    this.machineAcc += dt;
    if (this.machineAcc >= 0.5) {
      this.machineAcc = 0;
      this.machineCounts = scanMachines(this.world);
      const bays = listBays(this.world);
      this.surveyCount = surveyBays(bays, this.save.drones);
      this.drones = syncDrones(this.drones, bays, this.save.drones);
      this.turrets = syncTurrets(this.world, this.turrets);
    }
    const m = this.machineCounts;
    const want = (this.stash.rust ?? 0) >= SMELT_RUST || this.smeltProgress > 0;
    this.power = stepGrid(m.solars, m.smelters, m.batteries, daylight(this.time), want, this.power.charge, dt, m.miners, m.drones, this.turrets.length);
    const mined = stepMining(this.stash, this.power, this.mineProgress, this.mineCount, dt);
    this.mineProgress = mined.progress;
    this.mineCount = mined.count;
    const flown = stepDrones(this.stash, { ...this.power, drones: this.surveyCount }, this.droneProgress, this.droneCount, dt);
    this.stepFieldDrones(dt);
    this.droneProgress = flown.progress;
    this.droneCount = flown.count;
    if (!this.power.working) return;
    const r = stepSmelting(this.stash, this.power, this.smeltProgress, dt);
    this.smeltProgress = r.progress;
    if (r.made > 0) this.emit({ t: 'smelt', made: r.made });
  }

  private stepFieldDrones(dt: number): void {
    if (this.drones.length === 0) return;
    const b = this.body;
    const ev = stepFieldDrones(this.drones, {
      world: this.world,
      px: b.x,
      py: b.y,
      atBase: this.isAtBase(),
      powered: this.power.ratio > 0,
      enemies: this.enemies,
      carried: this.carried,
      stash: this.stash,
      rules: this.save.droneRules,
      facts: this.ruleFacts(),
      hp: this.hp,
      maxHp: this.derived.maxHp,
    }, dt);
    for (const e of ev) {
      if (e.t === 'dronerepair') {
        this.hp = Math.min(this.derived.maxHp, this.hp + e.hp);
        continue;
      }
      if (e.t === 'droneshot') {
        const en = this.enemies.find((x) => x.id === e.id);
        if (en) this.damageEnemy(en, GUARD_DMG, Math.sign(en.x - e.x) || 1);
        this.emit({ t: 'zap', x: e.x, y: e.y, tx: e.tx, ty: e.ty });
      } else if (e.t === 'dronemine') this.emit({ t: 'break', x: e.x, y: e.y, tile: e.tile });
      else if (e.t === 'dronebank') this.save.stats.banked += e.n;
      this.emit(e);
    }
  }

  /** Drone bay within reach of the player (nearest), or null. */
  bayNear(): { x: number; y: number; key: string } | null {
    const b = this.body;
    let best: { x: number; y: number; key: string; d: number } | null = null;
    for (const bay of listBays(this.world)) {
      const d = Math.hypot(bay.x + 0.5 - b.x, bay.y + 0.5 - (b.y - 0.9));
      if (d <= REACH && (!best || d < best.d)) best = { ...bay, d };
    }
    return best;
  }

  /** What drone rule conditions see this frame. */
  ruleFacts(): { night: boolean; enemy: boolean; packHalf: boolean; hpLow: boolean; deep: boolean; raid: boolean } {
    const b = this.body;
    let haul = 0;
    for (const k in this.carried) if (!ITEMS[k as ItemId].kit) haul += this.carried[k as ItemId] ?? 0;
    return {
      night: isNight(this.time),
      enemy: this.enemies.some((e) => e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) <= ENEMY_NEAR) || this.boss !== null,
      packHalf: haul * 2 >= this.derived.packCap,
      hpLow: this.hp < this.derived.maxHp * HP_LOW,
      deep: this.depth >= DEEP_AT,
      raid: this.raid !== null,
    };
  }

  /** Drone bays in the base (scan order). */
  bays(): { key: string; x: number; y: number }[] {
    return listBays(this.world);
  }

  droneRules(key: string): DroneRule[] {
    return this.save.droneRules[key] ?? [];
  }

  /** Replace a bay's rules (sanitized, max RULE_MAX); an empty list removes the entry. */
  setDroneRules(key: string, rules: readonly DroneRule[]): DroneRule[] {
    const clean = sanitizeRules(rules).slice(0, RULE_MAX);
    if (clean.length === 0) delete this.save.droneRules[key];
    else this.save.droneRules[key] = clean;
    return clean;
  }

  droneRole(key: string): DroneRole {
    return roleOf(this.save.drones, key);
  }

  /** Cycle the role of the bay at `key` (survey -> miner -> guard -> hauler). */
  setDroneRole(key: string, role: DroneRole = nextRole(this.droneRole(key))): DroneRole {
    if (!DRONE_ROLES.includes(role)) return this.droneRole(key);
    if (role === 'survey') delete this.save.drones[key];
    else this.save.drones[key] = role;
    const bays = listBays(this.world);
    this.surveyCount = surveyBays(bays, this.save.drones);
    this.drones = syncDrones(this.drones, bays, this.save.drones);
    this.emit({ t: 'dronerole', role, name: ROLE_INFO[role].name });
    return role;
  }

  step(dt: number, c: Controls): void {
    if (!(dt > 0) || dt > 0.25) dt = Math.min(Math.max(dt || 0, 0), 0.25); // clamp tab-switch spikes
    if (dt === 0) return;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }
    this.time += dt;
    this.save.stats.playTime += dt;
    const d = this.derived;
    const b = this.body;
    this.stepExplore(dt, c);

    // Horizontal control with quick acceleration (weaker on a rope so swings keep their momentum).
    const mx = Math.max(-1, Math.min(1, c.moveX));
    const veh = this.vehicle;
    const g = this.gear;
    const vst = this.vstats;
    const speed = d.speed * (vst ? vst.speed : 1) * (this.buffs.swift && !veh ? SWIFT_SPEED : 1);
    if (this.hook) b.vx += mx * 22 * dt;
    else if (this.dashT <= 0) b.vx += (mx * speed - b.vx) * Math.min(1, 20 * dt);
    if (Math.abs(mx) > 0.1) this.facing = mx > 0 ? 1 : -1;

    // Dash (dash boots): a short burst, also in the air.
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.dashT = Math.max(0, this.dashT - dt);
    if (g.dash && c.dash && !this.prevDash && this.dashCd === 0 && !this.riding) {
      this.dashT = 0.16;
      this.dashCd = 0.8;
      b.vx = this.facing * 24;
      b.vy = Math.min(b.vy, 0);
      this.hook = null;
      if (!this.isAtBase()) this.battery = Math.max(0, this.battery - 1.5);
      this.emit({ t: 'dash' });
    }
    this.prevDash = !!c.dash;

    // Jump with coyote time, input buffer and variable height; air jumps from spring boots.
    const grounded = probeGround(this.world, b, c.down);
    if (grounded) this.airJumpsLeft = g.airJumps;
    this.coyote = grounded ? 0.1 : this.coyote - dt;
    const jumpPress = c.jump && !this.prevJump;
    this.jumpBuf = jumpPress ? 0.12 : this.jumpBuf - dt;
    const jumpV = JUMP_V * (vst ? vst.jump : 1);
    if (this.hook && jumpPress) {
      // Let go of the rope with a little hop, keeping the swing's speed.
      this.hook = null;
      b.vy = Math.min(b.vy, -JUMP_V * 0.6);
      this.jumpBuf = 0;
      this.emit({ t: 'unhook' });
    } else if (this.jumpBuf > 0 && this.coyote > 0) {
      b.vy = -jumpV;
      this.coyote = 0;
      this.jumpBuf = 0;
      this.emit({ t: 'jump' });
    } else if (jumpPress && this.airJumpsLeft > 0 && !this.riding && !this.inLiquid) {
      this.airJumpsLeft--;
      b.vy = -JUMP_V * 0.9;
      this.jumpBuf = 0;
      this.emit({ t: 'jump' });
    }
    if (!c.jump && b.vy < -6 && !this.hook && veh !== 'sky_jet') b.vy = -6;
    this.prevJump = c.jump;

    const swimT = this.world.get(Math.floor(b.x), Math.floor(b.y - BODY_H / 2));
    const wasLiquid = this.inLiquid;
    this.inLiquid = isLiquid(swimT) ? swimT : 0;
    // Falling lava (Ash Dunes lavafalls) burns like the magma it pours into.
    this.fallBurn = Math.max(0, this.fallBurn - dt);
    if (this.fallBurn <= 0 && inLavafall(this.world, b.x, b.y, HALF_W, BODY_H)) {
      this.fallBurn = 0.25;
      // Half the pool's heat: a sheet brushed in passing should sting, not kill outright.
      this.hurt(((TILES[T.MAGMA].dps ?? 0) * 0.5) / 4);
    }
    // Breaking the surface while stroking up: leap out, so pools can be left onto a ledge.
    if (wasLiquid && !this.inLiquid && c.jump && b.vy < 0) b.vy = -LEAP_V;
    this.jetting = false;
    this.gliding = false;
    if (veh === 'sky_jet') {
      // Flying: jump climbs, down dives, otherwise a gentle sink. Battery powers it away from the pad.
      const target = c.jump ? -10 : c.down ? 12 : 1.5;
      b.vy += (target - b.vy) * Math.min(1, 6 * dt);
      this.jetting = c.jump;
      this.wasGround = true;
      if (!this.isAtBase()) this.battery = Math.max(0, this.battery - (vst?.drain ?? JET_DRAIN * 0.8) * dt);
    } else if (this.inLiquid) {
      // Swimming: slow sink, jump strokes upward, no fall damage, drag on both axes.
      b.vx *= 1 - Math.min(1, 6 * dt);
      b.vy = c.jump ? Math.max(-SWIM_UP, b.vy - GRAVITY * 1.2 * dt) : Math.min(SINK, b.vy + GRAVITY * 0.25 * dt);
      this.coyote = 0.05;
      this.wasGround = true;
      const dps = TILES[this.inLiquid]?.dps ?? 0;
      if (dps > 0) {
        this.acidTick -= dt;
        if (this.acidTick <= 0) {
          this.acidTick = 0.25;
          this.hurt(dps / 4);
        }
      }
    } else if (!this.hook && onLadder(this.world, b)) {
      // Climbing: no gravity; jump climbs, down descends, otherwise cling.
      const lift = this.onLift() ? LIFT_MUL : 1;
      b.vy = c.jump ? -CLIMB_UP * lift : c.down ? CLIMB_DOWN * lift : 0;
      b.vx *= 0.6;
      this.coyote = 0.1;
    } else if (this.dashT > 0) {
      b.vy = 0;
    } else {
      b.vy = Math.min(MAX_FALL, b.vy + GRAVITY * dt);
      // Jetpack: hold jump in the air once the jump has peaked (or with no jumps left).
      if (g.jetpack && c.jump && !grounded && !this.hook && b.vy > -4 && this.battery > 0) {
        b.vy = Math.max(-JET_MAX, b.vy - JET_THRUST * dt);
        this.jetting = true;
        this.wasGround = true;
        if (!this.isAtBase()) this.battery = Math.max(0, this.battery - JET_DRAIN * dt);
      } else if (g.glider && c.jump && !grounded && !this.hook && b.vy > 0) {
        // Glide: slow fall, carry forward.
        b.vy = Math.min(b.vy, GLIDE_FALL);
        b.vx += (this.facing * speed * 1.4 - b.vx) * Math.min(1, 3 * dt);
        this.gliding = true;
        this.wasGround = true;
      }
    }
    b.onGround = false;
    moveX(this.world, b, b.vx * dt);
    const impact = b.vy;
    moveY(this.world, b, b.vy * dt, c.down);
    if (this.hook) this.stepRope(dt, c);
    this.stepVehicle(dt);
    if (this.garageOpen && (!this.reachable(this.garageOpen.x, this.garageOpen.y) || this.world.get(this.garageOpen.x, this.garageOpen.y) !== T.GARAGE)) this.garageOpen = null;
    if (b.onGround && !this.wasGround) {
      this.emit({ t: 'land', speed: impact });
      if (impact > FALL_SAFE && !vst?.soft) this.hurt((impact - FALL_SAFE) * 6);
    }
    this.wasGround = b.onGround;

    this.runDeepest = Math.max(this.runDeepest, this.depth);
    if (noteMax(this.save.awards, 'depth', this.runDeepest)) this.awardCheck();
    const rec = this.worldRecord();
    if (rec) {
      rec.curTime += dt;
      if (noteDepth(rec, this.depth)) this.emit({ t: 'record', beat: 'deep', value: rec.deepest, code: rec.code });
    }
    this.stepMachines(dt);
    for (const p of stepDrops(this.world, this.drops, dt, b.x, b.y, (item) => (invTotal(this.carried) < this.derived.packCap ? this.derived.packCap - invTotal(this.carried) : 0) * (ITEMS[item] ? 1 : 0), (item, n) => invAdd(this.carried, item, n), this.gear.magnet))
      this.emit({ t: 'pickup', item: p.item, x: b.x, y: b.y - 1 });
    if (this.world.saplings.size > 0 && stepSaplings(this.world, dt) > 0) this.emit({ t: 'grow' });
    if (this.world.crops.size > 0) stepCrops(this.world, dt, this.wetFn);
    stepBuffs(this.buffs, dt);
    this.liquidAcc += dt;
    if (this.liquidAcc >= 1 / LIQUID_HZ) {
      this.liquidAcc = 0;
      // Cool first, so water that touches magma at the start of a tick reacts before it flows on.
      for (const c of coolMagma(this.world, b.x, b.y)) this.emit({ t: 'steam', x: c.x, y: c.y });
      flowLiquids(this.world, b.x, b.y, this.liquidTick++);
    }

    // Mining.
    this.placeCd = Math.max(0, this.placeCd - dt);
    this.fullCd = Math.max(0, this.fullCd - dt);
    let mining = false;
    // Chests are containers: pressing on one within reach opens it (with any tool) instead of digging.
    const pressed = c.dig && !this.prevDig;
    const onChest = c.dig && c.aim && this.world.get(c.aim.tx, c.aim.ty) === T.CHEST && this.reachable(c.aim.tx, c.aim.ty);
    if (onChest && c.aim && pressed) this.openChestAt(c.aim.tx, c.aim.ty);
    // A tap or click on a robot NPC talks to it (the UI opens its panel).
    const npcTap = pressed && c.aim ? this.npcAtTile(c.aim.tx, c.aim.ty) : null;
    if (npcTap) this.emit({ t: 'npctalk', kind: npcTap.kind });
    else if (pressed && c.aim && this.merchantAtTile(c.aim.tx, c.aim.ty)) this.emit({ t: 'npctalk', kind: 'merchant' });
    // A tap on a drone bay in the base changes its role (holding still digs it up).
    if (pressed && c.aim && this.world.get(c.aim.tx, c.aim.ty) === T.DRONE && this.reachable(c.aim.tx, c.aim.ty)) {
      const key = `${c.aim.tx - this.world.padX},${this.world.padY - c.aim.ty}`;
      if (listBays(this.world).some((bb) => bb.key === key)) this.setDroneRole(key);
    }
    if (this.chestOpen && (!this.reachable(this.chestOpen.x, this.chestOpen.y) || this.world.get(this.chestOpen.x, this.chestOpen.y) !== T.CHEST)) this.chestOpen = null;
    const dig = c.dig && !onChest;
    this.prevDig = c.dig;
    if (pressed && !onChest && this.tool === 'rod') this.pressRod(c.aim);
    if (pressed && !onChest && this.tool === 'hook' && !this.hook) this.pressHook(c.aim);
    this.stepFishing(dt);
    if (c.dig && onChest) {
      // handled above
    } else if (c.dig && this.tool === 'blade') this.blade();
    if (dig && this.tool === 'pistol') this.firePistol(c.aim);
    if (dig && this.tool === 'drill' && c.aim && this.reachable(c.aim.tx, c.aim.ty)) {
      const { tx, ty } = c.aim;
      const tile = this.world.get(tx, ty);
      // Nothing in front: the drill works on a player-built back wall instead.
      const onWall = !isMinable(tile) && !TILES[tile].solid && this.world.wall(tx, ty) === W.PLATE;
      if (isMinable(tile) || onWall) {
        const def = onWall ? TILES[T.WALL] : TILES[tile];
        const blockedByPack = def.drop !== null && invTotal(this.carried) >= d.packCap;
        if (blockedByPack) {
          if (this.fullCd === 0) {
            this.emit({ t: 'full' });
            this.fullCd = 1;
          }
        } else {
          mining = true;
          if (!this.mining || this.mining.tx !== tx || this.mining.ty !== ty) this.mining = { tx, ty, progress: 0 };
          this.mining.progress += (dt * d.digPower) / def.hardness;
          this.digTick -= dt;
          if (this.digTick <= 0) {
            this.digTick = 0.14;
            this.emit({ t: 'dig', x: tx, y: ty });
          }
          if (this.mining.progress >= 1) {
            if (onWall) this.world.setWall(tx, ty, W.NONE);
            else removeTile(this.world, tx, ty); // also clears the other half of a 2-tile bed/table
            this.emit({ t: 'break', x: tx, y: ty, tile: onWall ? T.WALL : tile });
            if (def.drop) {
              invAdd(this.carried, def.drop, 1);
              this.emit({ t: 'pickup', item: def.drop, x: tx, y: ty });
            }
            if (tile === T.TERMINAL) this.emit({ t: 'lore', text: loreAt(this.world.seed, tx, ty) });
            if (isCropTile(tile)) this.harvest(tile, tx, ty, d.packCap);
            if (tile === T.PLANT) {
              const wild = grassSeed(this.world.biome[tx] ?? 0, tx, ty, this.world.seed);
              if (wild) this.gain(wild, 1, tx, ty, d.packCap);
            }
            if (tile === T.TRUNK) this.fellTree(tx, ty, d.packCap);
            this.mining = null;
          }
        }
      }
    }
    if (!mining) this.mining = null;

    // Placing blocks (must touch existing solid, must not trap the player).
    if (c.place && c.aim && this.placeCd === 0 && this.reachable(c.aim.tx, c.aim.ty)) {
      const { tx, ty } = c.aim;
      const item = ITEMS[this.selected];
      if (
        item.places !== null &&
        invCount(this.carried, this.selected) > 0 &&
        // Blocks can be placed into liquid (displacing it), so players can dam and plug pools.
        (this.world.get(tx, ty) === 0 || isLiquid(this.world.get(tx, ty))) &&
        (this.hasSolidNeighbour(tx, ty) || (item.places === T.LIFT && this.liftNeighbour(tx, ty))) &&
        !this.overlapsPlayer(tx, ty)
      ) {
        if ((item.places === T.SAPLING || cropOfSeed(this.selected)) && !SOIL_TILES.has(this.world.get(tx, ty + 1))) {
          // Seeds need soil underneath (not metal, ore or built blocks).
          if (this.placeCd === 0) this.emit({ t: 'nosoil' });
          this.placeCd = 0.5;
        } else if (!mountOk(this.world, tx, ty, item.places)) {
          // Screens and banners hang on a wall (rooms.ts WALL_MOUNTED).
          if (this.placeCd === 0) this.emit({ t: 'nomount' });
          this.placeCd = 0.5;
        } else {
          const homeBefore = this.validRooms();
          // Beds and tables take the free cell beside the aimed one too (wide.ts).
          for (const c of placement(this.world, tx, ty, item.places, (x, y) => !this.overlapsPlayer(x, y))) this.world.set(c.x, c.y, c.tile);
          if (this.validRooms() > homeBefore) this.emit({ t: 'roomready', x: tx, y: ty });
          const i = ty * this.world.w + tx;
          if (item.places === T.SAPLING) this.world.saplings.set(i, growTime(this.world, i));
          const crop = cropOfSeed(this.selected);
          if (crop) {
            plantCrop(this.world, tx, ty, crop);
            this.emit({ t: 'plant', crop, secs: Math.round(ripeIn(this.world, tx, ty, this.wetFn)), wet: this.cropWatered(tx, ty) });
          }
          if (item.places === T.CHEST) this.world.chests.set(i, {});
          if (item.places === T.GARAGE) this.buildGarageFrame(tx, ty);
          invAdd(this.carried, this.selected, -1);
          this.placeCd = 0.12;
          this.emit({ t: 'place', x: tx, y: ty });
        }
      } else if (item.placesWall !== undefined && invCount(this.carried, this.selected) > 0 && this.canPlaceWall(tx, ty)) {
        // Back walls sit behind tiles, so they may overlap the player, torches and ladders.
        this.world.setWall(tx, ty, item.placesWall);
        invAdd(this.carried, this.selected, -1);
        this.placeCd = 0.12;
        this.emit({ t: 'place', x: tx, y: ty });
      }
    }

    this.stepEnemies(dt);
    this.stepShots(dt);
    this.stepBossFight(dt);
    this.stepHazards(dt);

    // Base services, battery and survival.
    if (this.isAtBase()) {
      this.battery = d.maxBattery;
      this.hp = Math.min(d.maxHp, this.hp + 40 * dt);
      this.lowWarned = false;
      this.bank();
    } else if (this.depth > 1.5) {
      this.battery = Math.max(0, this.battery - dt * this.gear.drainMul * LAYERS[layerAt(this.depth)].heat * (this.buffs.charged ? CHARGED_DRAIN : 1));
      if (this.battery < d.maxBattery * 0.2 && !this.lowWarned) {
        this.lowWarned = true;
        this.emit({ t: 'lowbattery' });
      }
      if (this.battery === 0) this.hp -= 8 * dt;
    }
    if (this.hp <= 0) this.die();
  }

  private blade(): void {
    if (this.bladeCd > 0) return;
    const g = this.gear;
    this.bladeCd = g.meleeCd;
    this.swing = 0.18;
    const b = this.body;
    this.emit({ t: 'swing', dir: this.facing });
    for (const e of this.enemies) {
      const dx = (e.x - b.x) * this.facing;
      if (dx < -0.4 || dx > g.meleeRange || Math.abs(e.y - b.y) > 1.8) continue;
      if (e.iframes <= 0 && e.hp > 0 && g.leech > 0) this.leechHeal(g.leech);
      this.damageEnemy(e, g.meleeDmg, this.facing);
    }
    const bs = this.boss;
    if (bs) {
      const bd = BOSSES[bs.id];
      const dx = (bs.x - b.x) * this.facing;
      if (dx > -bd.halfW && dx < g.meleeRange + bd.halfW && b.y > bs.y - bd.h - 1 && b.y - BODY_H < bs.y + 0.5) {
        if (g.leech > 0) this.leechHeal(g.leech);
        this.damageBoss(g.meleeDmg);
      }
    }
  }

  /** Leech chip: a melee hit heals a little (never past max HP). */
  private leechHeal(n: number): void {
    const before = this.hp;
    this.hp = Math.min(this.derived.maxHp, this.hp + n);
    if (this.hp > before) this.emit({ t: 'leech', x: this.body.x, y: this.body.y - BODY_H, n: this.hp - before });
  }

  /** Bomb blast: damages enemies in the radius and breaks minable solid tiles (their drops land as pickups). */
  explode(x: number, y: number, dmg: number, radius = BOMB_RADIUS): void {
    const r = radius;
    for (const e of this.enemies) if (Math.hypot(e.x - x, e.y - 0.4 - y) <= r + 0.5) this.damageEnemy(e, dmg, Math.sign(e.x - x) || 1);
    if (this.boss && Math.abs(this.boss.x - x) < BOSSES[this.boss.id].halfW + r && y > this.boss.y - BOSSES[this.boss.id].h - r && y < this.boss.y + r) this.damageBoss(dmg);
    for (let ty = Math.floor(y - r); ty <= Math.ceil(y + r); ty++) {
      for (let tx = Math.floor(x - r); tx <= Math.ceil(x + r); tx++) {
        if (Math.hypot(tx + 0.5 - x, ty + 0.5 - y) > r) continue;
        const t = this.world.get(tx, ty);
        const def = TILES[t];
        if (!def.solid || !isMinable(t) || t === T.PAD || t === T.CHEST) continue;
        if (this.isAtBase() && Math.abs(tx - this.world.padX) <= 8) continue;
        this.world.set(tx, ty, T.AIR);
        this.emit({ t: 'break', x: tx, y: ty, tile: t });
        if (def.drop) addDrop(this.drops, makeDrop(def.drop, 1, tx + 0.5, ty + 0.5, 0, -2));
      }
    }
    this.emit({ t: 'boom', x, y });
  }

  /** Rope: keep the body within the rope length of the anchor (pendulum); holding dig reels in. */
  private stepRope(dt: number, c: Controls): void {
    const h = this.hook;
    if (!h) return;
    const b = this.body;
    if (!this.world.isSolid(Math.floor(h.ax), Math.floor(h.ay))) {
      this.hook = null;
      this.emit({ t: 'unhook' });
      return;
    }
    if ((c.dig && this.tool === 'hook') || c.reel) h.len = Math.max(1.5, h.len - HOOK_REEL * dt);
    else if (c.down) h.len = Math.min(HOOK_RANGE, h.len + HOOK_REEL * dt);
    const cx = b.x;
    const cy = b.y - BODY_H / 2;
    const dx = cx - h.ax;
    const dy = cy - h.ay;
    const dist = Math.hypot(dx, dy);
    if (dist <= h.len || dist < 1e-6) return;
    const nx = dx / dist;
    const ny = dy / dist;
    // Pull back onto the circle through collision, then drop the outward part of the velocity.
    moveX(this.world, b, -nx * (dist - h.len));
    moveY(this.world, b, -ny * (dist - h.len), false);
    const vr = b.vx * nx + b.vy * ny;
    if (vr > 0) {
      b.vx -= vr * nx;
      b.vy -= vr * ny;
    }
    this.wasGround = true;
  }

  /** Hook press: attach to the first solid tile along the aim (up to HOOK_RANGE), or let go. */
  pressHook(aim: Controls['aim']): boolean {
    if (this.hook) {
      this.hook = null;
      this.emit({ t: 'unhook' });
      return false;
    }
    if (!aim || this.riding) return false;
    const b = this.body;
    const ox = b.x;
    const oy = b.y - BODY_H / 2;
    const dx = aim.tx + 0.5 - ox;
    const dy = aim.ty + 0.5 - oy;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return false;
    for (let d = 0.5; d <= HOOK_RANGE; d += 0.25) {
      const x = ox + (dx / len) * d;
      const y = oy + (dy / len) * d;
      if (this.world.isSolid(Math.floor(x), Math.floor(y))) {
        this.hook = { ax: x, ay: y, len: Math.max(1.5, d) };
        this.airJumpsLeft = this.gear.airJumps;
        this.emit({ t: 'hook', x, y });
        return true;
      }
    }
    return false;
  }

  /** Hit an enemy. `stop` freezes the frame for juice; base defences pass false so they do not stutter the game. */
  damageEnemy(e: Enemy, dmg: number, dir: number, stop = true): void {
    if (e.iframes > 0 || e.hp <= 0) return;
    e.hp -= dmg;
    e.iframes = ENEMY_HIT_IFRAMES;
    e.vx = dir * 9;
    e.vy = ENEMIES[e.kind].flying ? e.vy : -5;
    if (stop) this.hitStop = HITSTOP;
    this.emit({ t: 'enemyhit', x: e.x, y: e.y - 0.5, dmg });
  }

  private firePistol(aim: Controls['aim']): void {
    if (this.pistolCd > 0) return;
    const b = this.body;
    const ox = b.x;
    const oy = b.y - BODY_H * 0.55;
    let dx = this.facing;
    let dy = 0;
    if (aim) {
      dx = aim.tx + 0.5 - ox;
      dy = aim.ty + 0.5 - oy;
    }
    let len = Math.hypot(dx, dy);
    if (len < 0.3) {
      dx = this.facing;
      dy = 0;
      len = 1;
    }
    const g = this.gear;
    if (!this.isAtBase()) this.battery = Math.max(0, this.battery - PISTOL_COST * (g.ranged === 'pulse' ? 1 : 1.5));
    this.pistolCd = g.rangedCd;
    const ux = dx / len;
    const uy = dy / len;
    const first = this.shots.length;
    if (g.ranged === 'scatter') {
      for (const a of [-0.18, 0, 0.18]) {
        const c = Math.cos(a);
        const sn = Math.sin(a);
        this.shots.push({ x: ox, y: oy, vx: (ux * c - uy * sn) * PISTOL_SPEED, vy: (ux * sn + uy * c) * PISTOL_SPEED, life: PISTOL_LIFE * 0.7, dmg: g.rangedDmg });
      }
    } else if (g.ranged === 'rail') {
      this.shots.push({ x: ox, y: oy, vx: ux * PISTOL_SPEED * 1.7, vy: uy * PISTOL_SPEED * 1.7, life: PISTOL_LIFE, dmg: g.rangedDmg, pierce: true, hit: [] });
    } else if (g.ranged === 'bomb') {
      this.shots.push({ x: ox, y: oy, vx: ux * 13, vy: uy * 13 - 4, life: 3, dmg: g.rangedDmg, bomb: true });
    } else this.shots.push({ x: ox, y: oy, vx: ux * PISTOL_SPEED, vy: uy * PISTOL_SPEED, life: PISTOL_LIFE, dmg: g.rangedDmg });
    // Mod chips change how bolts fly (bombs keep their own rules).
    for (const sh of this.shots.slice(first)) {
      if (sh.bomb) continue;
      if (g.pierce && !sh.pierce) {
        sh.pierce = true;
        sh.hit = [];
      }
      if (g.bounces > 0) {
        sh.bounces = g.bounces;
        sh.life += 0.35 * g.bounces;
      }
    }
    this.emit({ t: 'shoot', x: ox, y: oy });
  }

  /** Sweep shots in small steps so fast bolts never tunnel through walls or enemies. */
  private stepShots(dt: number): void {
    this.pistolCd = Math.max(0, this.pistolCd - dt);
    const keep: Shot[] = [];
    for (const s of this.shots) {
      s.life -= dt;
      const dist = Math.hypot(s.vx, s.vy) * dt;
      const n = Math.max(1, Math.ceil(dist / 0.2));
      let alive = s.life > 0;
      if (s.bomb) s.vy = Math.min(25, s.vy + GRAVITY * 0.6 * dt);
      for (let i = 0; i < n && alive; i++) {
        const px = s.x;
        const py = s.y;
        s.x += (s.vx * dt) / n;
        s.y += (s.vy * dt) / n;
        if (this.world.isSolid(Math.floor(s.x), Math.floor(s.y))) {
          if (!s.bomb && (s.bounces ?? 0) > 0) {
            // Ricochet: step back out of the wall and reflect off the face it hit.
            const v = bounce(s.vx, s.vy, px, py, s.x, s.y, (x, y) => this.world.isSolid(x, y));
            s.vx = v.vx;
            s.vy = v.vy;
            s.x = px;
            s.y = py;
            s.bounces = (s.bounces ?? 0) - 1;
            this.emit({ t: 'ricochet', x: px, y: py });
            continue;
          }
          if (s.bomb) this.explode(s.x, s.y, s.dmg ?? 20);
          else this.emit({ t: 'shothit', x: s.x, y: s.y });
          alive = false;
          break;
        }
        if (this.boss && bossHits(this.boss, s.x, s.y, 0.1, 0.1)) {
          if (s.bomb) this.explode(s.x, s.y, s.dmg ?? 20);
          else if (!s.pierce || !s.hit?.includes(-1)) {
            this.damageBoss(s.dmg ?? PISTOL_DMG);
            s.hit?.push(-1);
            this.emit({ t: 'shothit', x: s.x, y: s.y });
          }
          if (!s.pierce || s.bomb) {
            alive = false;
            break;
          }
        }
        for (const e of this.enemies) {
          if (e.hp > 0 && enemyOverlapsBox(e, s.x, s.y + 0.1, 0.1, 0.2)) {
            if (s.bomb) {
              this.explode(s.x, s.y, s.dmg ?? 20);
              alive = false;
              break;
            }
            if (s.pierce) {
              if (s.hit?.includes(e.id)) continue;
              s.hit?.push(e.id);
              this.damageEnemy(e, s.dmg ?? PISTOL_DMG, Math.sign(s.vx) || 1);
              this.emit({ t: 'shothit', x: s.x, y: s.y });
              continue;
            }
            this.damageEnemy(e, s.dmg ?? PISTOL_DMG, Math.sign(s.vx) || 1);
            this.emit({ t: 'shothit', x: s.x, y: s.y });
            alive = false;
            break;
          }
        }
      }
      if (!alive || s.life > 0) {
        // fallthrough
      } else if (s.bomb) this.explode(s.x, s.y, s.dmg ?? 20);
      if (alive) keep.push(s);
    }
    this.shots = keep;
  }

  private stepHazards(dt: number): void {
    if (this.isAtBase()) {
      this.fallers = [];
      this.inGas = false;
      return;
    }
    const b = this.body;
    // Acid emitters near the player start a telegraphed drip.
    for (const em of this.hazards.emitters) {
      em.cd -= dt;
      if (em.cd > 0) continue;
      em.cd = HAZARD.acidPeriod;
      if (Math.abs(em.x - b.x) > 14 || Math.abs(em.y - b.y) > 12 || this.fallers.length >= 16) continue;
      this.fallers.push({ kind: 'acid', x: em.x, y: em.y + 0.3, vy: 0, warn: HAZARD.acidWarn });
      this.emit({ t: 'drip', x: em.x, y: em.y });
    }
    // Debris drops above the player when a ceiling is nearby.
    this.debrisCd -= dt;
    if (this.debrisCd <= 0) {
      this.debrisCd = HAZARD.debrisPeriod * (0.7 + this.rng() * 0.6);
      if (this.depth >= HAZARD.debrisMinDepth && this.fallers.length < 16) {
        const x = Math.floor(b.x + (this.rng() - 0.5) * 6);
        const row = findCeiling(this.world, x, Math.floor(b.y - 2), 10);
        if (row >= 0 && !this.world.isSolid(x, row)) {
          this.fallers.push({ kind: 'debris', x: x + 0.5, y: row + 0.2, vy: 0, warn: HAZARD.debrisWarn });
        }
      }
    }
    const keep: Faller[] = [];
    for (const f of this.fallers) {
      const hit = this.iframes === 0 && fallerHits(f, b.x, b.y, HALF_W, BODY_H);
      if (hit) {
        this.hurt(FALLER_DMG[f.kind]);
        this.iframes = IFRAMES;
        this.emit({ t: 'splash', x: f.x, y: f.y, kind: f.kind });
        continue;
      }
      if (stepFaller(this.world, f, dt)) keep.push(f);
      else this.emit({ t: 'splash', x: f.x, y: f.y, kind: f.kind });
    }
    this.fallers = keep;
    // Gas: steady damage with a pulse every half second.
    this.inGas = inGas(this.hazards.gas, b.x, b.y - BODY_H / 2);
    if (this.inGas) {
      this.gasTick += dt;
      if (this.gasTick >= 0.5) {
        this.gasTick -= 0.5;
        this.hurt(HAZARD.gasDps * 0.5);
        this.emit({ t: 'gas' });
      }
    } else this.gasTick = 0;
  }

  private stepEnemies(dt: number): void {
    this.bladeCd = Math.max(0, this.bladeCd - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    const b = this.body;
    const atBase = this.isAtBase();
    for (const e of this.enemies) {
      if (e.raid && chewTarget(this.world, e) && e.iframes === 0) {
        // Raider at a base block: it holds still and chews (stepRaid) instead of hopping over it.
        e.age += dt;
        e.vx = 0;
      } else if (e.raid) {
        // Raiders go for the nearest machine first, then the pad.
        const goal = machineGoal(this.world, e.x);
        const tg = goal ? raidTarget(e, b.x, b.y, goal.x - 0.5, goal.y, atBase) : raidTarget(e, b.x, b.y, this.world.padX, this.world.padY, atBase);
        stepEnemy(this.world, e, dt, tg.x, tg.y);
      } else stepEnemy(this.world, e, dt, b.x, b.y);
      if (!atBase && this.iframes === 0 && enemyOverlapsBox(e, b.x, b.y, HALF_W, BODY_H)) {
        this.hurt(ENEMIES[e.kind].contact);
        this.iframes = IFRAMES;
        b.vx = (b.x >= e.x ? 1 : -1) * 8;
        b.vy = Math.min(b.vy, -6);
      }
    }
    this.stepDefences(dt);
    this.stepNpcs(dt);
    // Deaths and drops.
    const alive: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.hp > 0 && e.y < this.world.h + 2) {
        alive.push(e);
        continue;
      }
      if (e.hp <= 0) {
        this.emit({ t: 'enemykill', x: e.x, y: e.y - 0.5, kind: e.kind });
        addDrop(this.drops, makeDrop(ENEMIES[e.kind].drop ?? 'iron_scrap', 1, e.x, e.y - 0.4, (hash2(e.id, 3, 77) - 0.5) * 4, -6));
        // Eclipse kills sometimes drop a crystal too.
        if (hash2(e.id, 5, 91) < weatherEnemy(this.weather).bonus) addDrop(this.drops, makeDrop('crystal', 1, e.x, e.y - 0.6, 1, -7));
      }
    }
    this.enemies = alive;
    this.stepRaid(dt);
    if (atBase) {
      // The pad is safe: wild enemies vanish, raiders keep coming for the base.
      this.enemies = this.enemies.filter((e) => e.raid);
      return;
    }
    this.spawnCd -= dt;
    if (this.spawnCd <= 0) {
      this.spawnCd = 4 + this.rng() * 4;
      this.trySpawn();
    }
  }

  /** Raid size tonight if night fell now (0 = no raid): raids on, no boss, home on the surface, base worth it. */
  raidWouldStart(): number {
    if (!this.save.settings.raids || this.raid || this.boss || this.depth >= 8) return 0;
    if (Math.abs(this.body.x - this.world.padX) > NIGHT_SAFE) return 0;
    return raidSize(baseValue(this.world), this.save.stats.raids);
  }

  /** RAID_WARN seconds before nightfall: tell the player tonight's wave and its side so they can prepare. */
  warnRaid(): boolean {
    const n = this.raidWouldStart();
    if (n === 0) return false;
    const at = this.time + RAID_WARN;
    const side = raidPlan(this.world.seed, Math.floor(at / DAY_LENGTH), 1)[0].side;
    this.raidWarn = { side, n, at };
    this.emit({ t: 'raidwarn', n, side, secs: RAID_WARN });
    return true;
  }

  /** Nightfall: start a raid when raids are on, the player is home on the surface and the base is worth it. */
  startRaid(): boolean {
    const n = this.raidWouldStart();
    if (n === 0) return false;
    this.raidWarn = null;
    const plan = raidPlan(this.world.seed, Math.floor(this.time / DAY_LENGTH), n);
    this.raid = { plan, t: 0, next: 0, ids: [], total: n };
    this.emit({ t: 'raidstart', n, side: plan[0].side });
    return true;
  }

  /** Dawn (or raids switched off): surviving raiders slink away, no reward. */
  endRaid(): void {
    if (!this.raid) return;
    this.raid = null;
    this.enemies = this.enemies.filter((e) => !e.raid);
    this.emit({ t: 'raidend' });
  }

  /** Base turrets shoot, spike traps bite (defences.ts). */
  private stepDefences(dt: number): void {
    if (this.turrets.length > 0) {
      for (const sh of stepTurrets(this.world, this.turrets, this.enemies, this.power.ratio, dt, this.upgrades.turret ?? 0)) {
        const en = this.enemies.find((x) => x.id === sh.id);
        if (en) this.damageEnemy(en, turretStats(this.upgrades.turret ?? 0).dmg, Math.sign(sh.tx - sh.x) || 1, false);
        this.emit({ t: 'turretshot', x: sh.x, y: sh.y, tx: sh.tx, ty: sh.ty });
      }
    }
    this.spikeAcc += dt;
    if (this.spikeAcc < SPIKE_TICK) return;
    this.spikeAcc -= SPIKE_TICK;
    for (const e of spikeVictims(this.world, this.enemies)) {
      this.damageEnemy(e, SPIKE_DMG, -e.dir || 1, false);
      this.emit({ t: 'spikehit', x: e.x, y: e.y });
    }
  }

  private stepRaid(dt: number): void {
    const r = this.raid;
    if (!r) return;
    r.t += dt;
    const w = this.world;
    while (r.next < r.plan.length && r.plan[r.next].at <= r.t) {
      const sp = r.plan[r.next++];
      const x = Math.max(2, Math.min(w.w - 3, w.padX + sp.side * (BASE_HALF + RAID_ENTRY)));
      const flying = ENEMIES[sp.kind].flying;
      const e = makeEnemy(this.nextEnemyId++, sp.kind, x + 0.5, w.surface[x] - (flying ? 3 : 0), r.next);
      e.raid = true;
      e.dir = -sp.side;
      e.hp *= weatherEnemy(this.weather).hp;
      unstickEnemy(w, e);
      this.enemies.push(e);
      r.ids.push(e.id);
    }
    // Chew base blocks loose: the block drops as an item, so nothing is lost for good.
    for (const e of this.enemies) {
      if (!e.raid) continue;
      const c = chewTarget(w, e);
      if (!c) {
        e.chew = 0;
        continue;
      }
      e.chew = (e.chew ?? 0) + dt;
      const tile = w.get(c.x, c.y);
      if (e.chew >= chewTime(tile)) {
        e.chew = 0;
        const item = removeTile(w, c.x, c.y).drop;
        if (item) addDrop(this.drops, makeDrop(item, 1, c.x + 0.5, c.y + 0.5, 0, -4));
        this.emit({ t: 'raidchew', x: c.x, y: c.y, tile });
      }
    }
    const alive = new Set(this.enemies.map((e) => e.id));
    r.ids = r.ids.filter((id) => alive.has(id));
    if (r.next >= r.plan.length && r.ids.length === 0) {
      const reward = raidReward(r.total);
      for (const k in reward) invAdd(this.stash, k as ItemId, reward[k as ItemId] ?? 0);
      this.save.stats.raids++;
      this.raid = null;
      reactNpcs(this.npcs, 'cheer');
      this.emit({ t: 'raidclear', n: r.total, reward, blueprint: blueprintDrop(this.save.stats.raids)?.name ?? null });
    }
  }

  /** Spawn an enemy in open cave space near, but never on, the player and never inside walls. */
  trySpawn(): Enemy | null {
    if (this.enemies.length >= MAX_ENEMIES) return null;
    // At night, drone wisps also hunt on the surface (never near the pad).
    const dark = isNight(this.time) || this.weather === 'eclipse';
    const nightSurface = this.depth < 8 && dark && Math.abs(this.body.x - this.world.padX) > NIGHT_SAFE;
    if (this.depth < 8 && !nightSurface) return null;
    const col = Math.min(this.world.w - 1, Math.max(0, Math.floor(this.body.x)));
    const kinds = spawnableKinds(this.depth, this.world.biome[col], nightSurface);
    if (kinds.length === 0) return null;
    const kind = kinds[Math.floor(this.rng() * kinds.length)];
    const b = this.body;
    for (let i = 0; i < 12; i++) {
      const side = this.rng() < 0.5 ? -1 : 1;
      const x = b.x + side * (9 + this.rng() * 8);
      const y = b.y + (this.rng() - 0.5) * 10;
      const e = makeEnemy(this.nextEnemyId, kind, Math.floor(x) + 0.5, Math.floor(y) + 1, this.rng() * 6.28);
      if ((!nightSurface && e.y < this.world.padY + 6) || e.y < 2 || e.y >= this.world.h - 1 || e.x < 2 || e.x >= this.world.w - 2) continue;
      if (nightSurface && Math.abs(e.x - this.world.padX) <= NIGHT_SAFE) continue;
      if (enemyBoxHits(this.world, e)) continue;
      if (this.world.lightAt(e.x, e.y - 0.5) > SPAWN_LIGHT_MAX) continue;
      // Player-built back walls make a room safe: nothing spawns in front of them.
      if (this.world.wall(Math.floor(e.x), Math.floor(e.y - 0.05)) === W.PLATE) continue;
      if (!ENEMIES[kind].flying && !this.world.isSolid(Math.floor(e.x), Math.floor(e.y + 0.05))) continue;
      // Deeper layers breed tougher enemies.
      e.hp *= LAYERS[layerAt(e.y - this.world.padY)].enemyHp * weatherEnemy(this.weather).hp;
      this.nextEnemyId++;
      this.enemies.push(e);
      return e;
    }
    return null;
  }

  /** Contents of the chest at (tx, ty): world chests roll seeded loot the first time they are opened. */
  chestContents(tx: number, ty: number): Inventory {
    const i = ty * this.world.w + tx;
    let inv = this.world.chests.get(i);
    if (!inv) {
      inv = chestLoot(this.world.seed, tx, ty, ty - this.world.padY);
      this.world.chests.set(i, inv);
    }
    return inv;
  }

  openChestAt(tx: number, ty: number): boolean {
    if (this.world.get(tx, ty) !== T.CHEST) return false;
    this.chestContents(tx, ty);
    this.chestOpen = { x: tx, y: ty };
    this.emit({ t: 'chest', x: tx, y: ty, items: invTotal(this.chestContents(tx, ty)) });
    return true;
  }

  /** E: open the nearest chest within reach. */
  interact(): boolean {
    const b = this.body;
    let best: { x: number; y: number; d: number } | null = null;
    for (let y = Math.floor(b.y - 5); y <= Math.floor(b.y + 3); y++) {
      for (let x = Math.floor(b.x - 5); x <= Math.floor(b.x + 5); x++) {
        if (this.world.get(x, y) !== T.CHEST || !this.reachable(x, y)) continue;
        const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - (b.y - 0.9));
        if (!best || d < best.d) best = { x, y, d };
      }
    }
    if (this.chestOpen) {
      this.chestOpen = null;
      return true;
    }
    if (this.garageOpen) {
      this.garageOpen = null;
      return true;
    }
    const gar = this.garageNear();
    if (gar && (!best || Math.hypot(gar.x + 0.5 - b.x, gar.y + 0.5 - (b.y - 0.9)) < best.d)) {
      this.garageOpen = gar;
      this.emit({ t: 'garage' });
      return true;
    }
    const npc = this.npcNear();
    if (npc) {
      this.emit({ t: 'npctalk', kind: npc.kind });
      return true;
    }
    const bay = this.bayNear();
    if (bay && (!best || Math.hypot(bay.x + 0.5 - b.x, bay.y + 0.5 - (b.y - 0.9)) < best.d)) {
      this.setDroneRole(bay.key);
      return true;
    }
    // The merchant hovers over the pad, so a drone bay or chest right beside you comes first.
    if (this.merchantNear() && !best) {
      this.emit({ t: 'npctalk', kind: 'merchant' });
      return true;
    }
    return best ? this.openChestAt(best.x, best.y) : false;
  }

  /** Move items from the open (or given) chest into the pack: one item id, or everything. Returns the count. */
  takeFromChest(id: ItemId | 'all', at = this.chestOpen): number {
    if (!at) return 0;
    const inv = this.chestContents(at.x, at.y);
    let got = 0;
    for (const k of (id === 'all' ? Object.keys(inv) : [id]) as ItemId[]) {
      const n = Math.min(inv[k] ?? 0, Math.max(0, this.derived.packCap - invTotal(this.carried)));
      if (n <= 0) continue;
      invAdd(this.carried, k, n);
      invAdd(inv, k, -n);
      if ((inv[k] ?? 0) <= 0) delete inv[k];
      got += n;
      this.emit({ t: 'pickup', item: k, x: at.x, y: at.y });
    }
    if (got === 0 && invTotal(inv) > 0) this.emit({ t: 'full' });
    this.world.markChest(at.x, at.y);
    return got;
  }

  /** Store a stack from the pack in the open chest. */
  putInChest(id: ItemId, n = Infinity): number {
    const at = this.chestOpen;
    if (!at) return 0;
    const k = Math.min(n, invCount(this.carried, id));
    if (k <= 0) return 0;
    invAdd(this.carried, id, -k);
    invAdd(this.chestContents(at.x, at.y), id, k);
    this.world.markChest(at.x, at.y);
    return k;
  }

  /** Remove the open chest: its contents spill on the ground and the chest goes into the pack. */
  breakChest(): boolean {
    const at = this.chestOpen;
    if (!at) return false;
    const inv = this.chestContents(at.x, at.y);
    for (const k of Object.keys(inv) as ItemId[]) if ((inv[k] ?? 0) > 0) addDrop(this.drops, makeDrop(k, inv[k] ?? 0, at.x + 0.5, at.y + 0.5));
    this.world.chests.delete(at.y * this.world.w + at.x);
    this.world.set(at.x, at.y, T.AIR);
    this.world.markChest(at.x, at.y);
    addDrop(this.drops, makeDrop('chest', 1, at.x + 0.5, at.y + 0.5));
    this.chestOpen = null;
    return true;
  }

  /** Compatibility: take everything a chest holds (as much as fits). */
  openChest(tx: number, ty: number, _cap?: number): number {
    return this.takeFromChest('all', { x: tx, y: ty });
  }

  /** Rod press: cast at water, land a biting fish, or reel the line in. */
  pressRod(aim: Controls['aim']): void {
    const f = this.fishing;
    if (f) {
      if (f.bite > 0) {
        const got = catchFor(this.world.seed, f.cast, this.depth, isNight(this.time));
        const room = Math.max(0, this.derived.packCap - invTotal(this.carried));
        const n = Math.min(room, got.n);
        if (n > 0) invAdd(this.carried, got.item, n);
        if (got.n > n) addDrop(this.drops, makeDrop(got.item, got.n - n, this.body.x, this.body.y - 1));
        this.emit({ t: 'catch', item: got.item, n: got.n });
        this.emit({ t: 'pickup', item: got.item, x: f.x, y: f.y });
      } else this.emit({ t: 'reel' });
      this.fishing = null;
      return;
    }
    if (!aim) return;
    const at = castTarget(this.world, this.body.x, this.body.y, aim.tx, aim.ty);
    if (!at) return;
    const cast = this.casts++;
    this.fishing = { x: at.x, y: at.y, t: 0, biteAt: biteDelay(this.world.seed, cast), bite: 0, cast };
    this.emit({ t: 'cast', x: at.x, y: at.y });
  }

  private stepFishing(dt: number): void {
    const f = this.fishing;
    if (!f) return;
    // Walking away, switching tools or the water vanishing breaks the line.
    if (this.tool !== 'rod' || this.world.get(f.x, f.y) !== T.WATER || Math.hypot(f.x + 0.5 - this.body.x, f.y - this.body.y) > CAST_RANGE + 3) {
      this.fishing = null;
      return;
    }
    f.t += dt;
    if (f.bite > 0) {
      f.bite -= dt;
      if (f.bite <= 0) {
        // It got away: wait for the next bite.
        f.bite = 0;
        f.biteAt = f.t + biteDelay(this.world.seed, f.cast + 1000);
      }
    } else if (f.t >= f.biteAt) {
      f.bite = BITE_WINDOW;
      this.emit({ t: 'bite' });
    }
  }

  /** Use a beacon in the boss's own biome, away from the pad: the boss lands nearby and the arena locks. */
  summonBoss(id: BossId): boolean {
    const d = BOSSES[id];
    const col = Math.min(this.world.w - 1, Math.max(0, Math.floor(this.body.x)));
    const beacon = d.beacon;
    if (this.boss) return this.noSummon('A boss is already here');
    if (invCount(this.carried, beacon) <= 0) return this.noSummon('You need the beacon');
    if (Math.abs(this.body.x - this.world.padX) < 40) return this.noSummon('Too close to the pad');
    if (d.layer !== undefined) {
      if (layerAt(this.depth) < d.layer) return this.noSummon(`Use it in the ${LAYERS[d.layer].name}`);
    } else if (this.world.biome[col] !== d.biome) return this.noSummon(`Use it in the ${BIOMES[d.biome as BiomeId].name}`);
    invAdd(this.carried, beacon, -1);
    const x = this.body.x + this.facing * 10;
    this.boss = makeBoss(id, x, Math.max(3, this.body.y - 8));
    this.boss.ax0 = Math.min(this.body.x, x) - ARENA_HALF;
    this.boss.ax1 = Math.max(this.body.x, x) + ARENA_HALF;
    this.emit({ t: 'bossspawn', id });
    return true;
  }

  private noSummon(reason: string): boolean {
    this.emit({ t: 'nosummon', reason });
    return false;
  }

  biomeBossesBeaten(): number {
    return BIOME_BOSSES.filter((id) => this.save.bosses.includes(id)).length;
  }

  /** Depth layer the player is in (layers.ts). */
  get layer(): number {
    return layerAt(this.depth);
  }

  bossDefeated(id: BossId): boolean {
    return this.save.bosses.includes(id);
  }

  damageBoss(dmg: number): void {
    const bs = this.boss;
    if (!bs || bs.iframes > 0 || bs.hp <= 0) return;
    bs.hp -= dmg;
    bs.iframes = 0.12;
    this.hitStop = HITSTOP;
    this.emit({ t: 'bosshit', x: bs.x, y: bs.y - BOSSES[bs.id].h / 2, dmg });
    if (bs.hp <= 0) this.defeatBoss();
  }

  private defeatBoss(): void {
    const bs = this.boss;
    if (!bs) return;
    const d = BOSSES[bs.id];
    const first = !this.save.bosses.includes(bs.id);
    for (const k of Object.keys(d.reward) as ItemId[]) addDrop(this.drops, makeDrop(k, d.reward[k] ?? 0, bs.x + (hash2(k.length, 1, bs.age) - 0.5) * 2, bs.y - 1, (hash2(k.length, 2, 3) - 0.5) * 6, -8));
    if (first) {
      this.save.bosses.push(bs.id);
      if (!this.ownsGear(d.gear)) this.save.gear.owned.push(d.gear);
    }
    this.emit({ t: 'bossdown', id: bs.id, first });
    const rec = this.worldRecord();
    if (rec && noteBoss(rec)) this.emit({ t: 'record', beat: 'boss', value: rec.boss, code: rec.code });
    if (openGates(this.world, this.biomeBossesBeaten()) > 0) this.emit({ t: 'gateopen' });
    if (bs.id === FINAL_BOSS) this.emit({ t: 'victory', first });
    this.boss = null;
    this.bossBolts = [];
    this.bossWarn = null;
  }

  /** Boss AI, its attacks against the player, and leaving the arena (the boss withdraws). */
  private stepBossFight(dt: number): void {
    const bs = this.boss;
    const b = this.body;
    if (!bs) return;
    if (b.x < bs.ax0 - 20 || b.x > bs.ax1 + 20 || this.isAtBase()) {
      this.boss = null;
      this.bossBolts = [];
      this.bossWarn = null;
      this.emit({ t: 'bossgone' });
      return;
    }
    const d = BOSSES[bs.id];
    const out = stepBoss(bs, this.world, dt, b.x, b.y, this.rng);
    if (out.warn) {
      this.bossWarn = { kind: out.warn, t: ATTACK_TIME[out.warn].warn };
      this.emit({ t: 'bosswarn', kind: out.warn });
    }
    if (this.bossWarn) {
      this.bossWarn.t -= dt;
      if (this.bossWarn.t <= 0) this.bossWarn = null;
    }
    this.bossBolts.push(...out.bolts);
    for (const x of out.rain) this.fallers.push({ kind: 'debris', x, y: b.y - 12, vy: 0, warn: 0.7 });
    for (let i = 0; i < out.minions && this.enemies.length < MAX_ENEMIES + 3; i++) this.enemies.push(makeEnemy(this.nextEnemyId++, d.minion, bs.x + (i - 1) * 2, bs.y - 1));
    if (out.slam) {
      this.emit({ t: 'bossslam', x: bs.x, y: bs.y });
      if (b.onGround && Math.abs(b.x - bs.x) < SLAM_RADIUS && this.iframes === 0) {
        this.hurt(SLAM_DMG);
        this.iframes = 0.6;
        b.vy = -10;
        b.vx = Math.sign(b.x - bs.x) * 12;
      }
    }
    if (this.iframes === 0 && bossHits(bs, b.x, b.y - BODY_H / 2, HALF_W, BODY_H / 2)) {
      this.hurt(d.contact);
      this.iframes = 0.8;
      b.vx = Math.sign(b.x - bs.x) * 14;
      b.vy = -8;
    }
    // Boss bolts.
    const keep: BossBolt[] = [];
    for (const s of this.bossBolts) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0 || this.world.isSolid(Math.floor(s.x), Math.floor(s.y))) continue;
      if (this.iframes === 0 && Math.abs(s.x - b.x) < HALF_W + 0.2 && s.y > b.y - BODY_H && s.y < b.y) {
        this.hurt(BOLT_DMG);
        this.iframes = 0.5;
        continue;
      }
      keep.push(s);
    }
    this.bossBolts = keep;
  }

  /** Eat food from the pack. */
  useItem(id: ItemId): boolean {
    const bossId = bossForBeacon(id);
    if (bossId) return this.summonBoss(bossId);
    const food = FOOD[id];
    if (!food || invCount(this.carried, id) <= 0) return false;
    invAdd(this.carried, id, -1);
    this.hp = Math.min(this.derived.maxHp, this.hp + food.hp);
    this.battery = Math.min(this.derived.maxBattery, this.battery + food.battery);
    const buff = MEAL_BUFF[id];
    if (buff) this.buffs[buff] = BUFF_TIME;
    this.emit({ t: 'eat', item: id });
    return true;
  }

  /** Quick heal (H / HUD button): eats the best healing item for the HP missing. 'full', 'none' or the item eaten. */
  quickHeal(): ItemId | 'full' | 'none' {
    const missing = this.derived.maxHp - this.hp;
    if (missing <= 0.5) return 'full';
    const id = bestHeal(this.carried, missing);
    if (!id || !this.useItem(id)) return 'none';
    return id;
  }

  /** Throw a stack from the pack in front of the player (it cannot be picked up for a moment). */
  dropItem(id: ItemId, n = Infinity): number {
    const k = Math.min(n, invCount(this.carried, id));
    if (k <= 0) return 0;
    invAdd(this.carried, id, -k);
    addDrop(this.drops, makeDrop(id, k, this.body.x + this.facing * 0.8, this.body.y - 1.2, this.facing * 5, -4, 1.5));
    return k;
  }

  /** Item into the pack (with a pickup toast), or onto the ground beside (x, y) when the pack is full. */
  private gain(item: ItemId, n: number, x: number, y: number, cap: number): void {
    const room = ITEMS[item].kit ? n : Math.min(n, Math.max(0, cap - invTotal(this.carried)));
    if (room > 0) {
      invAdd(this.carried, item, room);
      this.emit({ t: 'pickup', item, x, y });
    }
    if (n > room) addDrop(this.drops, makeDrop(item, n - room, x + 0.5, y + 0.5, 0, -2));
  }

  /** Cutting a crop: ripe ones give produce and seeds, unripe ones their seed back. */
  private harvest(tile: number, x: number, y: number, cap: number): void {
    const got = harvestYield(tile, x, y, this.world.seed);
    for (const g of got) this.gain(g.item, g.n, x, y, cap);
    const c = cropAt(tile);
    if (c && c.stage >= 2) this.emit({ t: 'harvest', crop: c.crop, n: got[0]?.n ?? 0, x, y });
  }

  /** Cutting a trunk fells the whole connected tree: biomass for each trunk, a little for leaves. */
  fellTree(tx: number, ty: number, cap: number): number {
    const wl = this.world;
    const stack: [number, number][] = [[tx, ty - 1], [tx - 1, ty], [tx + 1, ty]];
    let trunks = 0;
    let leaves = 0;
    let guard = 0;
    while (stack.length > 0 && guard++ < 400) {
      const [x, y] = stack.pop() as [number, number];
      const t = wl.get(x, y);
      if (t !== T.TRUNK && t !== T.LEAVES) continue;
      // Only what stood above the cut falls.
      if (y > ty) continue;
      wl.set(x, y, T.AIR);
      if (t === T.TRUNK) trunks++;
      else leaves++;
      this.emit({ t: 'break', x, y, tile: t });
      stack.push([x + 1, y], [x - 1, y], [x, y - 1], [x, y + 1]);
    }
    const total = trunks + Math.ceil(leaves / 6);
    const n = Math.min(total, Math.max(0, cap - invTotal(this.carried)));
    if (n > 0) {
      invAdd(this.carried, 'biomass', n);
      this.emit({ t: 'pickup', item: 'biomass', x: tx, y: ty });
    }
    // What does not fit lands on the ground, plus seeds to plant new trees.
    if (total > n) addDrop(this.drops, makeDrop('biomass', total - n, tx + 0.5, ty));
    if (trunks > 0) addDrop(this.drops, makeDrop('seed', 1 + (hash2(tx, ty, this.world.seed) < 0.5 ? 1 : 0), tx + 0.5, ty - 1, 1.5, -5));
    this.emit({ t: 'fell', x: tx, y: ty, tiles: trunks + leaves });
    return n;
  }

  /** A back wall needs an open (non-solid) cell with no built wall, touching a block or another built wall. */
  canPlaceWall(x: number, y: number): boolean {
    const wl = this.world;
    if (x < 0 || y < 0 || x >= wl.w || y >= wl.h) return false;
    if (wl.isSolid(x, y) || wl.wall(x, y) === W.PLATE) return false;
    if (wl.wall(x, y) !== W.NONE) return true; // lining an existing cave wall
    const nb: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    return this.hasSolidNeighbour(x, y) || nb.some(([dx, dy]) => wl.wall(x + dx, y + dy) === W.PLATE);
  }

  /** A lift shaft can hang from the shaft above or stand on the one below. */
  private liftNeighbour(x: number, y: number): boolean {
    return this.world.get(x, y - 1) === T.LIFT || this.world.get(x, y + 1) === T.LIFT;
  }

  /** The player's torso or feet are in a lift shaft. */
  onLift(): boolean {
    const b = this.body;
    const x = Math.floor(b.x);
    return this.world.get(x, Math.floor(b.y - BODY_H / 2)) === T.LIFT || this.world.get(x, Math.floor(b.y - 0.1)) === T.LIFT;
  }

  private hasSolidNeighbour(x: number, y: number): boolean {
    return (
      this.world.isSolid(x + 1, y) || this.world.isSolid(x - 1, y) || this.world.isSolid(x, y + 1) || this.world.isSolid(x, y - 1)
    );
  }

  private overlapsPlayer(tx: number, ty: number): boolean {
    const b = this.body;
    return tx + 1 > b.x - HALF_W && tx < b.x + HALF_W && ty + 1 > b.y - BODY_H && ty < b.y;
  }

  toSave(now = 0): SaveData {
    return {
      ...this.save,
      away: { savedAt: now, time: this.time, charge: this.power.charge },
      base: captureBase(this.world),
      walls: captureWalls(this.world),
      stash: { ...this.stash },
      carried: { ...this.carried },
      upgrades: { ...this.upgrades },
      stats: { ...this.save.stats },
      settings: { ...this.save.settings },
      codex: [...this.save.codex],
      gear: { owned: [...this.save.gear.owned], equip: { ...this.save.gear.equip } },
      bosses: [...this.save.bosses],
      drones: { ...this.save.drones },
      research: [...this.save.research],
      buffs: { ...this.buffs },
      records: this.save.records.map((r) => ({ ...r })),
      world: captureDiff(this.world, this.fog),
      // While riding, the vehicle is saved parked where the player is.
      garage: {
        parts: { ...this.save.garage.parts },
        parked: this.riding && this.save.gear.equip.vehicle && isVehicle(this.save.gear.equip.vehicle) ? { id: this.save.gear.equip.vehicle, x: this.body.x, y: this.body.y } : this.save.garage.parked ? { ...this.save.garage.parked } : null,
      },
    };
  }

  /** Tutorial line for the first automation, shown at the base only. */
  hintAutomation(touch: boolean): string | null {
    // Robots can live in rooms beyond the pad strip (upstairs, next door), so they talk anywhere in the base.
    const npc = this.npcNear();
    if (npc) {
      const info = NPC_INFO[npc.kind];
      const act = `${touch ? 'Tap' : 'E'} to ${npc.kind === 'medic' ? 'get medkits' : npc.kind === 'gunsmith' ? 'fit weapon mods' : npc.kind === 'scientist' ? 'research perks' : 'trade'}`;
      if (npc.pose === 'sleep' && this.raid) return `${info.name} hides under the covers: "Tell me when it is over!"  ${act}`;
      return `${info.name} the ${info.title}: "${npcLine(npc.kind, this.time, this.npcMood(npc.kind))}"  ${act}`;
    }
    if (!this.isAtBase()) return null;
    const room = roomHint(this.roomHere());
    if (room) return room;
    const bay = this.bayNear();
    if (bay) {
      const r = this.droneRole(bay.key);
      return `Drone bay: ${ROLE_INFO[r].name} (${ROLE_INFO[r].desc}). ${touch ? 'Tap the bay' : 'Press E'} to change role, DRONES for rules`;
    }
    if (this.merchantNear()) {
      const info = NPC_INFO.merchant;
      return `${info.name} the ${info.title}: "${npcLine('merchant', this.time)}"  ${touch ? 'Tap' : 'E'} for today's stock`;
    }
    return automationHint(this.machineCounts, this.stash, this.power.ratio, touch, this.upgrades.fab ?? 0);
  }

  private roomCache: { v: number; px: number; py: number; rooms: Room[] } | null = null;

  /** Enclosed rooms in the base strip (rooms.ts), recomputed only when the world changes. */
  get rooms(): Room[] {
    const w = this.world;
    const c = this.roomCache;
    if (c && c.v === w.version && c.px === w.padX && c.py === w.padY) return c.rooms;
    const rooms = findRooms(w);
    this.roomCache = { v: w.version, px: w.padX, py: w.padY, rooms };
    return rooms;
  }

  /** Valid robot homes in the base (counted only near the base, where rooms can exist). */
  validRooms(): number {
    if (Math.abs(this.body.x - this.world.padX) > 30) return 0;
    return this.rooms.filter((r) => r.valid).length;
  }

  /** The room the player is standing in, or null. */
  roomHere(): Room | null {
    const i = Math.floor(this.body.y - 0.5) * this.world.w + Math.floor(this.body.x);
    return this.rooms.find((r) => r.cells.includes(i)) ?? null;
  }

  /** Move robots in and out as rooms change, then let them pace. Only near the base, where rooms exist. */
  private stepNpcs(dt: number): void {
    const w = this.world;
    const b = this.body;
    if (Math.abs(b.x - w.padX) > 30) return;
    if (this.npcSync.v !== w.version) {
      const res = syncNpcs(w, this.rooms, this.npcs);
      this.npcs = res.npcs;
      // Robots already home when the game loads are not announced again.
      if (!this.npcSync.first) {
        for (const kind of res.arrived) this.emit({ t: 'npcarrive', kind });
        for (const kind of res.left) this.emit({ t: 'npcleave', kind });
      }
      this.npcSync = { v: w.version, first: false };
    }
    const here = this.merchantHere();
    if (this.merchantWas !== null && here !== this.merchantWas) this.emit({ t: 'merchant', here });
    this.merchantWas = here;
    const near = this.npcNear();
    const mood = { night: isNight(this.time), raid: this.raid !== null };
    for (const n of this.npcs) {
      const room = this.rooms.find((r) => r.y0 * w.w + r.x0 === n.home);
      const floor = room ? roomFloor(w, room) : null;
      if (room && floor) stepNpc(n, floor, dt, n === near ? b.x : null, npcSpots(w, room, floor), mood);
    }
  }

  /** The robot NPC within talking range of the player, or null. */
  npcNear(): Npc | null {
    const b = this.body;
    let best: Npc | null = null;
    let bd = Infinity;
    for (const n of this.npcs) {
      const d = Math.abs(n.x - b.x);
      if (d < 2.2 && Math.abs(n.y - b.y) < 2.5 && d < bd) {
        best = n;
        bd = d;
      }
    }
    return best;
  }

  /** The robot NPC drawn over tile (tx, ty) (1 wide, 2 tall), or null. */
  npcAtTile(tx: number, ty: number): Npc | null {
    return this.npcs.find((n) => Math.floor(n.x) === tx && ty >= Math.floor(n.y) - 2 && ty < Math.floor(n.y)) ?? null;
  }

  /** The workshop can stay open: on the pad, or talking to a robot in a room nearby. */
  canShop(): boolean {
    return this.isAtBase() || this.npcNear() !== null;
  }

  /** Is a robot of this kind living in the base (for the merchant: parked on the pad now)? */
  hasNpc(kind: NpcKind): boolean {
    if (kind === 'merchant') return this.merchantHere();
    return this.npcs.some((n) => n.kind === kind);
  }

  /** The merchant drone is parked on the pad: by day, and never during a raid. */
  merchantHere(): boolean {
    return merchantPresent(this.time) && this.raid === null;
  }

  /** Where the merchant drone hovers (tile coords of its centre): over the right end of the pad. */
  merchantPos(): { x: number; y: number } {
    return { x: this.world.padX + 4.5, y: this.world.padY - 2.2 };
  }

  /** The player stands next to the parked merchant drone. */
  merchantNear(): boolean {
    if (!this.merchantHere()) return false;
    const p = this.merchantPos();
    return Math.abs(p.x - this.body.x) < 2.4 && Math.abs(p.y - (this.body.y - 1)) < 2.6;
  }

  /** The parked merchant drone is drawn over tile (tx, ty) (about 2x2 tiles around its centre). */
  merchantAtTile(tx: number, ty: number): boolean {
    if (!this.merchantHere()) return false;
    const p = this.merchantPos();
    return Math.abs(tx + 0.5 - p.x) <= 1 && Math.abs(ty + 0.5 - p.y) <= 1.2;
  }

  /** Every posted rate: the robots' fixed ones, then the merchant's stock for today (or its next visit). */
  tradeList(): Trade[] {
    return [...TRADES, ...merchantStock(this.world.seed, merchantDay(this.time))];
  }

  /** Comfort (0..4) of the room a robot lives in, 0 when it is not home. */
  npcComfort(kind: NpcKind): number {
    const n = this.npcs.find((k) => k.kind === kind);
    if (!n) return 0;
    return this.rooms.find((r) => r.y0 * this.world.w + r.x0 === n.home)?.comfort ?? 0;
  }

  /** Other robots living in the base besides `kind` (the visiting merchant does not count). */
  npcNeighbours(kind: NpcKind): number {
    return this.npcs.filter((n) => n.kind !== kind && NPC_ORDER.includes(n.kind)).length;
  }

  /** How a robot feels about its home (comfort + neighbours); 'content' for the merchant or a robot not home. */
  /** A happy or delighted robot living in the base: it waters every crop in the base strip. */
  gardener(): NpcKind | null {
    for (const n of this.npcs) if (NPC_ORDER.includes(n.kind) && GARDENER_MOODS.includes(this.npcMood(n.kind))) return n.kind;
    return null;
  }

  /** Watered by a pond or sprinkler, or (inside the base strip) by a happy robot gardener. */
  cropWatered(x: number, y: number): boolean {
    if (isWatered(this.world, x, y)) return true;
    const w = this.world;
    return Math.abs(x - w.padX) <= BASE_HALF && y < w.padY && y >= w.padY - BASE_ROWS && this.gardener() !== null;
  }

  private readonly wetFn = (_w: World, x: number, y: number): boolean => this.cropWatered(x, y);

  npcMood(kind: NpcKind): Mood {
    if (kind === 'merchant' || !this.hasNpc(kind)) return 'content';
    return npcMood(this.npcComfort(kind), this.npcNeighbours(kind));
  }

  /** What a robot asks for a posted price right now: happy robots knock a little off, never more. */
  npcPrice(kind: NpcKind, cost: Inventory): Inventory {
    return moodGive(cost, this.npcMood(kind));
  }

  /** A posted rate at today's mood price. */
  tradeNow(t: Trade): Trade {
    const give = this.npcPrice(t.npc, t.give);
    return give === t.give ? t : { ...t, give };
  }

  /** Swap with a robot at its posted rate (mood price; base only, it must live here). */
  trade(id: string): boolean {
    const posted = this.tradeList().find((k) => k.id === id);
    const t = posted && this.tradeNow(posted);
    if (!t || !this.canShop() || !tradeOpen(t, this.hasNpc(t.npc), this.npcComfort(t.npc)) || !doTrade(this.stash, t, this.carried)) return false;
    this.emit({ t: 'trade', id });
    return true;
  }

  /** The base room containing tile (tx, ty), or null. */
  roomAtTile(tx: number, ty: number): Room | null {
    if (Math.abs(this.body.x - this.world.padX) > 30) return null;
    const i = ty * this.world.w + tx;
    return this.rooms.find((r) => r.cells.includes(i)) ?? null;
  }

  /** Cheapest affordable upgrade hint for UI badges. */
  affordableUpgrades(): string[] {
    return UPGRADES.filter((u) => {
      const lv = this.upgrades[u.id] ?? 0;
      return lv < u.maxLevel && this.save.stats.raids >= (u.needRaids?.(lv) ?? 0) && canAfford(this.stash, u.cost(lv));
    }).map((u) => u.id);
  }
}
