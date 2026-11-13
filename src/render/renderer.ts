import { aoRects } from './ao';
import { computeRims, type Rim } from './rimlight';
import { buriedDecal, decalRects, hasStrata, strataShade } from './strata';
import type { Game, Hook, Shot } from '../sim/game';
import { petSwimPose, petWater, type PetWater } from './petfx';
import { lavafallSpan } from '../sim/structures';
import { FALL_W, LAVA_BLOCK, SHIMMER_ROW, SHIMMER_ROWS, fallShade, lavaDepthShade, lavaShade, shimmerRuns, shimmerShift } from './lavafx';
import { acidBubble, causticBand, depthShade, surfaceGlint, waveOffsets } from './liquidfx';
import { cropAt, isCropTile, isWatered } from '../sim/farming';
import { cropSway, drawCropTile, ripeSparkle, sprinklerDrops } from './crops';
import { NPC_INFO, type Mood, type Npc } from '../sim/npcs';
import { roomEdges } from '../sim/rooms';
import { furnitureArt, screenLines } from './furniture';
import { wideSide } from '../sim/wide';
import { REACH } from '../sim/game';
import { onLadder } from '../sim/physics';
import { ENEMIES } from '../sim/enemies';
import { hash2 } from '../sim/rng';
import { T, TILES } from '../sim/tiles';
import { isLiquid } from '../sim/liquids';
import { BODY_H } from '../sim/physics';
import { HIT_SQUASH_TIME, hitSquash, hurtSquash, hurtVignette, softFlash, magmaBubble, magmaEmber, magmaPulse, squashScale, type Fx } from './fx';
import type { PlayerGear, VehicleSpriteId } from './sprites';
import { ICON, drawIcon } from './icons';
import { vehicleRemap } from './sprites';
/**
 * Swim tilt in radians (canvas rotation; positive leans the head right): head-first toward the
 * swim direction, but never upside down.
 */
export function swimTilt(vx: number, vy: number): number {
  // Sinking counts for less than stroking, so a sideways swim stays roughly level.
  const a = Math.atan2(vx, -vy * (vy > 0 ? 0.4 : 1));
  return Math.max(-1.8, Math.min(1.8, a));
}
/** Vehicle tilt from the ground rows under the left and right wheels (positive: right side lower). */
export function vehicleTilt(gyLeft: number, gyRight: number): number {
  // A wall in front is not a slope: steps count as one tile at most.
  const d = Math.max(-1, Math.min(1, gyRight - gyLeft));
  return Math.max(-0.3, Math.min(0.3, Math.atan2(d, 2.6)));
}
export const LAND_SQUASH_TIME = 0.28;
/** Suspension squash 0..0.12 over the landing: compress fast, spring back. */
export function landSquash(left: number): number {
  if (left <= 0) return 0;
  const k = 1 - left / LAND_SQUASH_TIME;
  return 0.12 * Math.sin(Math.PI * Math.min(1, k * 1.3)) * (1 - k * 0.4);
}
/** Pixel-art scale of ground vehicles relative to the player sprite. */
const VEHICLE_ART_SCALE = 1.5;
/** Sprite row where a ground vehicle's hull starts (above it: roll cage / cab). */
const HULL_ROW = 3;
/** Sprite row of a ground vehicle's floor pan: the pilot is not drawn below it (no legs through the floor). */
const HULL_FLOOR: Record<'buggy' | 'drill_tank', number> = { buggy: 7, drill_tank: 9 };
import { GEAR, type RangedKind } from '../sim/gear';
import { BOSSES, phase as bossPhase } from '../sim/bosses';
import { drawBossArt } from './bossart';
import { ACT_INFO } from '../sim/drones';
import { EDGE_N, MASKS, edgeMask, growsMoss, growsSnow, isBlock, leafMask } from './autotile';
import { CAVE_ROW, LEAF_VARIANTS, NIGHT_SKY, PLANT_VARIANTS, NEAR_LAYER, SKYLINE_LAYERS, SNOW_H, blendSky, buildDecor, mixHex, nearPieces, towerShape } from './decor';
import { daylight, sunHeight, dayPhase } from '../sim/daynight';
import { weatherLight } from '../sim/weather';
import { B, BIOME_IDS } from '../sim/biomes';
import { ENEMY_SCALE, MOSS_H, TILE_COLORS, TS, VARIANTS, atlasCol, buildAtlas, buildMoss, buildWallAtlas, DRONE_W, TRADER_W, robotRows, MEDIC_REMAP, GUNSMITH_REMAP, SCIENTIST_REMAP, type RobotKind, npcSitRows, npcBedHeadRows, blanketRows, npcHop, MERCHANT_REMAP, MERCHANT_CRATE, drawEnemySprite, drawPlayer, drawRows, droneRows, makeCanvas, VEHICLES, vehicleRows, wheelSpinTime } from './sprites';
import { AIR_COST, DARK_MAX, LEVEL_CAP, SKY_LEVEL, brightness, computeLight, frameSources, levelAt, type LightGrid } from './lightmap';
import { drawGlyph, hasGlyph } from './glyphs';
import { ropePoints, ropeSag, twangAmp } from './ropefx';

/** Chunk size in tiles for the render cache. */
/** Per-robot colours: sprite remap, name tag, blanket. */
export const ROBOT_LOOK: Record<RobotKind, { remap?: Record<string, string>; tag: string; blanket: Record<string, string> }> = {
  trader: { tag: '#ffd23a', blanket: { a: '#4a6ab8', b: '#a8c0ff', e: '#34508f' } },
  medic: { remap: MEDIC_REMAP, tag: '#ff8a8a', blanket: { a: '#d8dee8', b: '#ffffff', e: '#9aa4b4' } },
  gunsmith: { remap: GUNSMITH_REMAP, tag: '#ffb23a', blanket: { a: '#8a4a2a', b: '#d88a4a', e: '#5a2e1a' } },
  scientist: { remap: SCIENTIST_REMAP, tag: '#c08aff', blanket: { a: '#5a3e9a', b: '#a888e8', e: '#3a2870' } },
};

/** Tracer colour of a player bolt: ricochet green, piercing blue, scatter orange, plain pulse gold. Pure. */
const HEART = ['.#.#.', '#####', '.###.', '..#..'];

/**
 * Mood bubble over a robot that is awake: happy robots float a pink heart every few seconds,
 * delighted ones more often in gold, lonely ones a grey one. Null while nothing shows. Pure.
 */
export function moodHeart(mood: Mood, t: number): { rise: number; alpha: number; color: string } | null {
  if (mood === 'content') return null;
  const period = mood === 'delighted' ? 2.5 : 4.5;
  const p = (((t % period) + period) % period) / 1.4; // shows for the first 1.4 s of each period
  if (p >= 1) return null;
  const color = mood === 'delighted' ? '#ffd23a' : mood === 'happy' ? '#ff7aa8' : '#8a90a2';
  return { rise: p, alpha: Math.min(1, (1 - p) * 2.5), color };
}

export function boltColor(sh: Shot, ranged: RangedKind): string {
  if (sh.bounces !== undefined) return '#7dffb0';
  if (sh.pierce) return ranged === 'rail' ? '#8fd0ff' : '#5aa6ff';
  return ranged === 'scatter' ? '#ff9a3c' : '#ffd24a';
}

export const CHUNK = 32;
/** Cache size before far chunks are evicted. */
export const MAX_CHUNKS = 48;
/** Liquid body colours (chunk fill and the per-frame crest fill must match). */
const LIQUID_FILL = { water: 'rgba(40,130,220,0.6)', acid: 'rgba(120,255,80,0.55)' } as const;
/** Lava crust shades by lavaShade value (1 = base melt, not drawn). */
const LAVA_SHADES = ['rgba(96,22,12,0.78)', '', '#ffa53a', '#ffe8a0'] as const;
const chunkKey = (cx: number, cy: number): number => cy * 4096 + cx;

/** Gear levels shown on the character (shared by the world view and the inventory preview). */
export function playerGear(game: Game): PlayerGear {
  const u = game.upgrades;
  return { lamp: u.lamp ?? 0, pick: u.pick ?? 0, pack: u.pack ?? 0, battery: u.battery ?? 0, boots: u.boots ?? 0 };
}

export interface Aim {
  tx: number;
  ty: number;
}

export class Renderer {
  private atlas = buildAtlas();
  /** Screen shake multiplier from the settings screen (0 off, 0.45 low, 1 full). */
  shakeMul = 1;
  /** Settings: shape marks on ores and hazards (colour-blind assist). Set through setOreMarks. */
  oreMarks = false;
  /** Settings: no strobing (hurt blink, enemy hit flash, boss blink) and a softer red vignette. */
  reduceFlash = false;

  setOreMarks(on: boolean): void {
    if (on === this.oreMarks) return;
    this.oreMarks = on;
    this.chunks.clear();
  }
  private moss = buildMoss();
  private wallAtlas = buildWallAtlas();
  private decor = buildDecor();
  /** Blended sky palette for the camera position (updated each frame). */
  private sky: [string, string, string, string] = ['#0b1026', '#2a1f4d', '#e87f5b', '#1a1536'];
  /** Daylight 0..1 of the current frame. */
  private day = 1;
  private ropeHook: Hook | null = null;
  private ropeT0 = 0;
  /** Last drawn rope shape (for e2e checks). */
  ropeInfo: { sag: number; twang: number; points: number } | null = null;
  /** True while a ground vehicle's hull is drawn over the pilot (for e2e checks). */
  pilotTucked = false;
  /** Swim pose this frame (e2e): body tilt in radians, whether stroking. */
  swimInfo: { angle: number; moving: boolean } | null = null;
  private swimAngle = 0;
  /** Vehicle tilt (radians) and landing squash (0-1) this frame (e2e). */
  vehPose: { tilt: number; squash: number } | null = null;
  private vehTilt = 0;
  private vehSquashT = 0;
  private vehAir = false;
  private vehVy = 0;
  private lastDrawTime = 0;
  /** Device pixels. */
  w = 1;
  h = 1;
  scale = 3;
  camX = 0;
  camY = 0;
  /** Last frame's hurt vignette alpha (read by e2e). */
  lastHurtAlpha = 0;
  /** Mood hearts drawn last frame (read by e2e). */
  heartsShown = 0;
  /** Crops and sprinklers drawn by the per-frame pass last frame (read by e2e). */
  farmShown = 0;
  /** Watered test for crops this frame (sprinklers, ponds, robot gardeners in the base). */
  private cropWet: ((x: number, y: number) => boolean) | null = null;
  private snapped = false;

  constructor(private ctx: CanvasRenderingContext2D) {}

  resize(w: number, h: number): void {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    // Integer pixel scaling keeps pixel art crisp: roughly 16 tiles across the short side.
    this.scale = Math.max(2, Math.round(Math.min(this.w, this.h) / (TS * 16)));
  }

  /** Smooth camera, clamped to the world so we never show the void. */
  follow(game: Game, dt: number): void {
    const tx = game.body.x;
    const ty = game.body.y - BODY_H / 2;
    const k = this.snapped ? Math.min(1, 9 * dt) : 1;
    this.snapped = true;
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    const halfW = this.w / (2 * TS * this.scale);
    const halfH = this.h / (2 * TS * this.scale);
    const { w, h } = game.world;
    this.camX = w <= halfW * 2 ? w / 2 : Math.min(w - halfW, Math.max(halfW, this.camX));
    this.camY = h <= halfH * 2 ? h / 2 : Math.min(h - halfH + 2, Math.max(-6 + halfH, this.camY));
  }

  /** Back-wall layer: cave walls underground, player-built plates; nothing (sky) otherwise. */
  private drawBack(ctx: CanvasRenderingContext2D, world: Game['world'], tx: number, ty: number, dx: number, dy: number, ts: number): void {
    const wl = world.wall(tx, ty);
    if (wl === 0) return;
    const v = Math.floor(hash2(tx, ty, 11) * VARIANTS);
    ctx.drawImage(this.wallAtlas, v * TS, wl * TS, TS, TS, dx, dy, ts, ts);
    // Contact shadow where the wall meets solid blocks (baked into the chunk, free per frame).
    const k = ts / TS;
    for (const r of aoRects(world, tx, ty, TS)) {
      ctx.fillStyle = `rgba(6,4,12,${r.alpha.toFixed(3)})`;
      ctx.fillRect(dx + r.x * k, dy + r.y * k, r.w * k, r.h * k);
    }
  }

  screenToTile(sx: number, sy: number): Aim {
    const ts = TS * this.scale;
    return {
      tx: Math.floor(this.camX + (sx - this.w / 2) / ts),
      ty: Math.floor(this.camY + (sy - this.h / 2) / ts),
    };
  }

  /** World tile coords to device px (no shake), for screen-space effects like pickup flyers. */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: this.sx(wx, 0), y: this.sy(wy, 0) };
  }

  private sx(wx: number, shakeX: number): number {
    return Math.round(this.w / 2 + (wx - this.camX) * TS * this.scale + shakeX);
  }

  private sy(wy: number, shakeY: number): number {
    return Math.round(this.h / 2 + (wy - this.camY) * TS * this.scale + shakeY);
  }

  draw(game: Game, fx: Fx, aim: Aim | null, time: number): void {
    const ctx = this.ctx;
    const { w, h, scale } = this;
    const ts = TS * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const shakeX = (Math.random() - 0.5) * fx.shake * this.shakeMul * 6 * scale;
    const shakeY = (Math.random() - 0.5) * fx.shake * this.shakeMul * 6 * scale;
    const world = game.world;
    const dtFrame = Math.min(0.1, Math.max(0, time - this.lastDrawTime));
    this.lastDrawTime = time;

    // Underground base colour, then the sky above the surface.
    ctx.fillStyle = '#17141f';
    ctx.fillRect(0, 0, w, h);
    const skyBottom = this.sy(world.padY + 12, shakeY);
    if (skyBottom > 0) {
      const horizon = this.sy(world.padY, shakeY);
      const g = ctx.createLinearGradient(0, Math.min(0, horizon - ts * 22), 0, horizon);
      const dl = daylight(game.time) * weatherLight(game.weather);
      this.day = dl;
      const base = this.skyAt(world);
      this.sky = [0, 1, 2, 3].map((k) => mixHex(base[k], NIGHT_SKY[k], 1 - dl)) as [string, string, string, string];
      g.addColorStop(0, this.sky[0]);
      g.addColorStop(0.55, this.sky[1]);
      g.addColorStop(1, this.sky[2]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, Math.min(h, skyBottom));
      this.drawSkyDecor(ctx, horizon, time, world, game.time);
    }

    // Tiles: cached chunks, then per-frame animated tiles.
    const x0 = Math.floor(this.camX - w / 2 / ts) - 1;
    const x1 = Math.ceil(this.camX + w / 2 / ts) + 1;
    const y0 = Math.floor(this.camY - h / 2 / ts) - 1;
    const y1 = Math.ceil(this.camY + h / 2 / ts) + 1;
    this.syncChunks(world);
    const cx0 = Math.floor(Math.max(0, x0) / CHUNK);
    const cx1 = Math.floor(Math.min(world.w - 1, x1) / CHUNK);
    const cy0 = Math.floor(Math.max(0, y0) / CHUNK);
    const cy1 = Math.floor(Math.min(world.h - 1, y1) / CHUNK);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        ctx.drawImage(this.chunk(world, cx, cy), this.sx(cx * CHUNK, shakeX), this.sy(cy * CHUNK, shakeY), CHUNK * ts, CHUNK * ts);
      }
    }
    this.prefetchChunk(world, cx0, cy0, cx1, cy1);
    this.machinesOn = game.power.working;
    this.minersOn = game.power.miners > 0 && game.power.ratio > 0;
    this.dronesOn = game.power.drones > 0 && game.power.ratio > 0;
    this.machinesSun = game.power.supply > 0;
    this.turretsOn = game.power.ratio > 0;
    this.turretAim.clear();
    for (const tu of game.turrets) this.turretAim.set(tu.y * world.w + tu.x, tu.aim);
    this.batteryFill = game.power.cap > 0 ? game.power.charge / game.power.cap : 0;
    this.cropWet = (x, y) => game.cropWatered(x, y);
    this.drawDynamic(ctx, world, x0, y0, x1, y1, shakeX, shakeY, time);
    this.drawLavafalls(ctx, world, x0, y0, x1, y1, shakeX, shakeY, time);

    // Aim highlight and crack overlay.
    if (aim) {
      const near = this.reachable(game, aim);
      ctx.strokeStyle = near ? 'rgba(54,224,232,0.9)' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = Math.max(1, scale / 2);
      ctx.strokeRect(this.sx(aim.tx, shakeX) + 0.5, this.sy(aim.ty, shakeY) + 0.5, ts - 1, ts - 1);
    }
    this.drawRoomOutline(ctx, game, aim, shakeX, shakeY, time);
    if (game.mining) {
      const m = game.mining;
      const dx = this.sx(m.tx, shakeX);
      const dy = this.sy(m.ty, shakeY);
      ctx.fillStyle = `rgba(0,0,0,${(m.progress * 0.55).toFixed(3)})`;
      ctx.fillRect(dx, dy, ts, ts);
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = Math.max(1, scale / 2);
      ctx.beginPath();
      const n = Math.floor(m.progress * 4) + 1;
      for (let i = 0; i < n; i++) {
        const a = hash2(i, m.tx, m.ty);
        const b = hash2(m.ty, i, m.tx);
        ctx.moveTo(dx + a * ts, dy);
        ctx.lineTo(dx + b * ts, dy + ts);
      }
      ctx.stroke();
    }

    // Player and mining beam.
    const b = game.body;
    const px = this.sx(b.x, shakeX);
    const py = this.sy(b.y, shakeY);
    if (game.mining) {
      const hx = px + game.facing * 5 * scale;
      const hy = py - 14 * scale;
      const ex = this.sx(game.mining.tx + 0.5, shakeX);
      const ey = this.sy(game.mining.ty + 0.5, shakeY);
      ctx.strokeStyle = `rgba(54,224,232,${0.55 + 0.35 * Math.sin(time * 40)})`;
      ctx.lineWidth = scale * 1.5;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,255,255,0.9)';
      ctx.lineWidth = scale * 0.6;
      ctx.stroke();
    }
    for (const g of game.hazards.gas) {
      const gx = this.sx(g.x, shakeX);
      const gy = this.sy(g.y, shakeY);
      if (gx < -g.r * ts || gx > this.w + g.r * ts) continue;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, g.r * ts);
      grad.addColorStop(0, 'rgba(120,255,90,0.38)');
      grad.addColorStop(1, 'rgba(120,255,90,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(gx - g.r * ts, gy - g.r * ts, g.r * 2 * ts, g.r * 2 * ts);
    }
    for (const f of game.fallers) {
      const fx = this.sx(f.x, shakeX);
      const fy = this.sy(f.y, shakeY);
      const acid = f.kind === 'acid';
      if (f.warn > 0) {
        // Telegraph: pulsing marker and a faint line down to the floor.
        const pulse = 0.5 + 0.5 * Math.sin(f.warn * 24);
        ctx.fillStyle = acid ? `rgba(140,255,70,${0.4 + 0.5 * pulse})` : `rgba(255,200,80,${0.4 + 0.5 * pulse})`;
        ctx.beginPath();
        ctx.arc(fx, fy, ts * (acid ? 0.18 : 0.35) * (1 + 0.3 * pulse), 0, Math.PI * 2);
        ctx.fill();
        if (!acid) {
          ctx.fillStyle = `rgba(255,200,80,${0.15 * pulse})`;
          ctx.fillRect(fx - ts * 0.35, fy, ts * 0.7, ts * 6);
        }
      } else {
        ctx.fillStyle = acid ? '#8aff4a' : '#8b7f72';
        const r = ts * (acid ? 0.14 : 0.32);
        ctx.fillRect(fx - r, fy - r * (acid ? 2.2 : 1), r * 2, r * (acid ? 2.2 : 2));
      }
    }
    for (const e of game.enemies) {
      const d = ENEMIES[e.kind];
      const ex = this.sx(e.x, shakeX);
      const ey = this.sy(e.y, shakeY);
      const w = d.halfW * 2 * ts;
      const h = d.h * ts;
      if (e.raid) {
        // Raiders carry a red war-glow and a bobbing chevron so they read as tonight's wave.
        ctx.fillStyle = 'rgba(255,60,50,0.22)';
        ctx.beginPath();
        ctx.arc(ex, ey - h / 2, Math.max(w, h) * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      const sq = hitSquash(e.iframes);
      if (sq.sx !== 1) {
        // Squash and stretch about the feet so every hit lands with weight.
        ctx.save();
        ctx.translate(ex, ey);
        ctx.scale(sq.sx, sq.sy);
        drawEnemySprite(ctx, e.kind, 0, 0, scale * ENEMY_SCALE, e.dir, time, !this.reduceFlash && e.iframes > HIT_SQUASH_TIME * 0.4, !!e.raid);
        ctx.restore();
      } else drawEnemySprite(ctx, e.kind, ex, ey, scale * ENEMY_SCALE, e.dir, time, false, !!e.raid);
      if (e.raid) {
        const cy = ey - h - 7 * scale + Math.round(Math.sin(time * 6 + e.id) * scale);
        ctx.fillStyle = (e.chew ?? 0) > 0 && Math.floor(time * 8) % 2 ? '#ffcf4a' : '#ff4a3a';
        ctx.fillRect(ex - 2 * scale, cy, scale, scale);
        ctx.fillRect(ex - scale, cy + scale, 2 * scale, scale);
        ctx.fillRect(ex + scale, cy, scale, scale);
      }
      if (e.hp < d.hp) {
        ctx.fillStyle = '#300';
        ctx.fillRect(ex - w / 2, ey - h - 4 * scale, w, 2 * scale);
        ctx.fillStyle = '#6f6';
        ctx.fillRect(ex - w / 2, ey - h - 4 * scale, (w * Math.max(0, e.hp)) / d.hp, 2 * scale);
      }
    }
    if (game.swing > 0) {
      const k = 1 - game.swing / 0.18;
      ctx.strokeStyle = `rgba(120,255,255,${1 - k})`;
      ctx.lineWidth = scale * 2;
      ctx.beginPath();
      const a0 = game.facing > 0 ? -1.2 + k * 2.2 : Math.PI + 1.2 - k * 2.2;
      ctx.arc(px, py - 12 * scale, 2 * ts * 0.9, a0 - 0.5, a0 + 0.1);
      ctx.stroke();
    }
    // Boss: big procedural body, attack telegraph and its bolts.
    if (game.boss) this.drawBoss(ctx, game, shakeX, shakeY, time);
    for (const bb of game.bossBolts) {
      ctx.fillStyle = BOSSES[game.boss?.id ?? 'colossus'].eye;
      ctx.beginPath();
      ctx.arc(this.sx(bb.x, shakeX), this.sy(bb.y, shakeY), scale * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.sx(bb.x, shakeX) - scale, this.sy(bb.y, shakeY) - scale, scale * 2, scale * 2);
    }
    // Pet companion.
    const petId = game.equipped('pet');
    this.petSwim = 'dry';
    if (petId) {
      const u = scale;
      // Swimming: a pet that trails the player into a pool paddles (petfx.ts) instead of hovering.
      const pcx = Math.floor(game.pet.x);
      const water = petWater(isLiquid(world.get(pcx, Math.floor(game.pet.y))), isLiquid(world.get(pcx, Math.floor(game.pet.y - 0.45))));
      const pose = petSwimPose(time, water, game.facing < 0 ? -1 : 1);
      this.petSwim = water;
      const pxp = this.sx(game.pet.x, shakeX);
      const pyp = this.sy(game.pet.y, shakeY) + pose.bob * u;
      const pd = GEAR[petId];
      if (pose.bubble) {
        const b = pose.bubble;
        ctx.strokeStyle = `rgba(220,245,255,${(0.85 * b.alpha).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, u * 0.6);
        ctx.strokeRect(pxp + b.dx * u - u, pyp + b.dy * u - u, u * 2, u * 2);
      }
      if (pose.wake) {
        // Wake on the surface line: two short bright dashes trailing behind.
        const sy = this.sy(Math.floor(game.pet.y), shakeY);
        ctx.fillStyle = 'rgba(230,248,255,0.75)';
        const off = pose.paddle ? u : 0;
        ctx.fillRect(pxp - game.facing * u * (6 + off) - u * 2, sy, u * 3, u);
        ctx.fillRect(pxp - game.facing * u * (10 + off) - u, sy + u, u * 2, u);
      }
      ctx.save();
      if (pose.tilt !== 0) {
        ctx.translate(pxp, pyp);
        ctx.rotate(pose.tilt);
        ctx.translate(-pxp, -pyp);
      }
      if (petId === 'glow_moth') {
        const flap = water === 'dry' ? (Math.sin(time * 18) > 0 ? 3 : 1) : pose.paddle ? 2 : 1;
        ctx.fillStyle = 'rgba(200,255,216,0.25)';
        ctx.beginPath();
        ctx.arc(pxp, pyp, u * 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pd.color;
        ctx.fillRect(pxp - u * (2 + flap), pyp - u * 2, u * flap, u * 3);
        ctx.fillRect(pxp + u * 2, pyp - u * 2, u * flap, u * 3);
        ctx.fillStyle = pd.accent;
        ctx.fillRect(pxp - u * 2, pyp - u * 2, u * 4, u * 3);
      } else {
        ctx.fillStyle = '#14181f';
        ctx.fillRect(pxp - u * 4, pyp - u * 3, u * 8, u * 6);
        ctx.fillStyle = pd.color;
        ctx.fillRect(pxp - u * 3, pyp - u * 2, u * 6, u * 4);
        ctx.fillStyle = pd.accent;
        ctx.fillRect(pxp + game.facing * u * 1 - u, pyp - u, u * 2, u * 1.5);
        if (petId === 'scout_bot') {
          ctx.fillStyle = '#c9d0e4';
          if (water === 'dry') {
            const r = Math.floor(time * 20) % 2 ? 5 : 3;
            ctx.fillRect(pxp - u * r, pyp - u * 4.5, u * r * 2, u);
          } else {
            // Rotor folded flat; a little prop spins at the back.
            ctx.fillRect(pxp - u * 2, pyp - u * 4, u * 4, u);
            const bx = pxp - game.facing * u * 5;
            ctx.fillRect(bx - u * 0.5, pyp - u * (pose.paddle ? 2.5 : 1), u, u * (pose.paddle ? 5 : 2));
          }
        } else {
          // Spark pup: ears and a tail.
          ctx.fillStyle = pd.color;
          ctx.fillRect(pxp - u * 3, pyp - u * 4, u * 2, u * 2);
          ctx.fillRect(pxp + u, pyp - u * 4, u * 2, u * 2);
          ctx.fillRect(pxp - game.facing * u * 4.5, pyp - u * 2 + (Math.floor(time * 6) % 2) * u, u * 1.5, u);
          if (water !== 'dry') {
            // Doggy paddle: front and back paws stroke in turn under the body.
            ctx.fillStyle = pd.accent;
            const k = pose.paddle;
            ctx.fillRect(pxp + game.facing * u * (2 + k) - u, pyp + u * 3, u * 2, u);
            ctx.fillRect(pxp - game.facing * u * (3 - k) - u, pyp + u * (3 + k), u * 2, u);
          }
        }
      }
      ctx.restore();
    }
    this.drawFieldDrones(ctx, game, shakeX, shakeY, time);
    this.drawNpcs(ctx, game, shakeX, shakeY, time);
    this.drawMerchant(ctx, game, shakeX, shakeY, time);
    // Back gear and vehicles behind / under the player.
    const veh = game.vehicle;
    const eq = (slot: 'head' | 'body' | 'feet' | 'back'): [string, string] | undefined => {
      const id = game.equipped(slot);
      return id ? [GEAR[id].color, GEAR[id].accent] : undefined;
    };
    const back = game.equipped('back');
    if (back === 'glider' && game.gliding) {
      ctx.fillStyle = GEAR.glider.color;
      ctx.beginPath();
      ctx.moveTo(px - 18 * scale, py - 14 * scale);
      ctx.lineTo(px, py - 20 * scale);
      ctx.lineTo(px + 18 * scale, py - 14 * scale);
      ctx.lineTo(px, py - 17 * scale);
      ctx.fill();
    }
    if (back === 'jetpack') {
      ctx.fillStyle = GEAR.jetpack.color;
      ctx.fillRect(px - game.facing * 7 * scale - 2 * scale, py - 15 * scale, 4 * scale, 7 * scale);
      if (game.jetting && !veh) {
        ctx.fillStyle = Math.floor(time * 30) % 2 ? '#ffcf4a' : '#ff7a3c';
        ctx.fillRect(px - game.facing * 7 * scale - 1.5 * scale, py - 8 * scale, 3 * scale, (3 + (Math.floor(time * 40) % 3)) * scale);
      }
    }
    const rp = game.ridePaint;
    const rideRemap = (id: VehicleSpriteId): Record<string, string> | undefined => vehicleRemap(id, rp ? [rp.c1, rp.c2] : undefined);
    // Vehicle body language: ground vehicles tilt to the slope under their wheels, fliers pitch with
    // their climb, and a hard landing squashes the suspension. Applied to the vehicle and its pilot.
    const vt = veh ? this.vehiclePose(game, veh, dtFrame) : { tilt: 0, squash: 0 };
    this.vehPose = veh ? vt : null;
    const vehXf = (): void => {
      if (!veh) return;
      ctx.translate(px, py);
      ctx.rotate(vt.tilt);
      ctx.scale(1 + vt.squash * 0.5, 1 - vt.squash);
      ctx.translate(-px, -py);
    };
    let hullOver: { clipY: number; floorY: number; draw: () => void } | null = null;
    if (veh === 'hoverbike' || veh === 'sky_jet' || veh === 'buggy' || veh === 'drill_tank') {
      const vd = VEHICLES[veh];
      if (veh === 'hoverbike') {
        // Soft hover field on the ground under the pads.
        ctx.fillStyle = 'rgba(54,224,232,0.22)';
        ctx.fillRect(px - 11 * scale, py + 2 * scale, 22 * scale, 2 * scale);
      }
      const bob = veh === 'sky_jet' ? Math.round(Math.sin(time * 5)) * 0.5 : 0;
      const ground = veh === 'buggy' || veh === 'drill_tank';
      // Wheels and treads turn with the distance rolled, so they match the ground speed.
      if (ground) this.wheelDist += Math.abs(b.vx) * dtFrame;
      const moving = wheelSpinTime(this.wheelDist);
      // Ground vehicles are drawn larger so the pilot sits inside, not on top of a toy.
      const vs = ground ? scale * VEHICLE_ART_SCALE : scale;
      const drawVeh = (): void => drawRows(ctx, vehicleRows(veh, ground ? moving : time, game.jetting), px - (vd.w / 2) * vs, py - (vd.top - bob) * vs, vs, game.facing < 0, vd.w, undefined, rideRemap(veh));
      ctx.save();
      vehXf();
      drawVeh();
      ctx.restore();
      // Ground vehicles: the hull (rows below the cab) is drawn again over the pilot after the
      // player, so the pilot sits inside with only helmet and shoulders showing.
      if (ground) hullOver = { clipY: Math.round(py - (vd.top - HULL_ROW) * vs), floorY: Math.round(py - (vd.top - HULL_FLOOR[veh]) * vs), draw: drawVeh };
    }
    // The parked vehicle waits where you left it, with a hint when you are close.
    const parked = game.riding ? null : game.parkedVehicle();
    if (parked) {
      const vd = VEHICLES[parked.id];
      const vx = this.sx(parked.x, shakeX);
      const vy = this.sy(parked.y, shakeY);
      const vs = parked.id === 'buggy' || parked.id === 'drill_tank' ? scale * VEHICLE_ART_SCALE : scale;
      drawRows(ctx, vehicleRows(parked.id, 0, false), vx - (vd.w / 2) * vs, vy - vd.top * vs, vs, false, vd.w, undefined, rideRemap(parked.id));
      if (Math.hypot(parked.x - b.x, parked.y - b.y) < 2.5) {
        ctx.fillStyle = '#ffcf4a';
        ctx.font = `bold ${Math.round(scale * 6)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('RIDE', vx, vy - (vd.top + 4) * vs);
      }
    }
    // Grappling rope: sags while slack, twangs on attach, two-tone with a claw at the anchor.
    if (game.hook) {
      const hk = game.hook;
      if (hk !== this.ropeHook) {
        this.ropeHook = hk;
        this.ropeT0 = time;
      }
      const age = time - this.ropeT0;
      const hy = b.y - 12 / TS;
      const pts = ropePoints(b.x, hy, hk.ax, hk.ay, hk.len, age);
      this.ropeInfo = { sag: ropeSag(Math.hypot(hk.ax - b.x, hk.ay - hy), hk.len), twang: twangAmp(age), points: pts.length };
      const trace = (): void => {
        ctx.beginPath();
        pts.forEach((p, i) => {
          const x = this.sx(p.x, shakeX);
          const y = this.sy(p.y, shakeY);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#2a3346';
      ctx.lineWidth = Math.max(2, scale * 1.6);
      trace();
      ctx.strokeStyle = '#d9ecf7';
      ctx.lineWidth = Math.max(1, scale * 0.7);
      trace();
      // Braid ticks so the rope reads as cord, not a laser.
      ctx.fillStyle = '#8fa6bd';
      for (let i = 1; i < pts.length - 1; i += 2) {
        ctx.fillRect(this.sx(pts[i].x, shakeX) - scale * 0.5, this.sy(pts[i].y, shakeY) - scale * 0.5, scale, scale);
      }
      // Claw: a small hub with three prongs biting into the rock.
      const ax = this.sx(hk.ax, shakeX);
      const ay = this.sy(hk.ay, shakeY);
      const ang = Math.atan2(hk.ay - hy, hk.ax - b.x);
      ctx.strokeStyle = '#c3cbd9';
      ctx.lineWidth = Math.max(1, scale * 0.8);
      for (const off of [-0.8, 0, 0.8]) {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + Math.cos(ang + off) * scale * 3, ay + Math.sin(ang + off) * scale * 3);
        ctx.stroke();
      }
      ctx.fillStyle = '#6f7a8f';
      ctx.fillRect(ax - scale * 1.5, ay - scale * 1.5, scale * 3, scale * 3);
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    } else {
      this.ropeHook = null;
      this.ropeInfo = null;
    }
    const paint = game.paint;
    const helmPaint = game.helmPaint;
    if (veh) {
      ctx.save();
      vehXf();
    }
    if (hullOver) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w, -h, w * 3, hullOver.floorY + h);
      ctx.clip();
    }
    // Swimming: tilt the whole body toward the swim direction (smoothed), tread water when still.
    const swimming = game.inLiquid !== 0 && !veh && !b.onGround;
    const swimMoving = swimming && Math.hypot(b.vx, b.vy) > 1.2;
    const target = swimMoving ? swimTilt(b.vx, b.vy) : 0;
    this.swimAngle += (target - this.swimAngle) * Math.min(1, dtFrame * 8);
    if (!swimming) this.swimAngle = 0;
    const tread = swimming && !swimMoving ? Math.round(Math.sin(time * 3)) * scale : 0;
    const seated = veh === 'hoverbike' || veh === 'sky_jet';
    if (swimming) {
      this.drawSwimRipples(ctx, game, shakeX, shakeY, time, swimMoving);
      ctx.save();
      const pivotY = py - 12 * scale;
      ctx.translate(px, pivotY + tread);
      ctx.rotate(this.swimAngle);
      ctx.translate(-px, -pivotY);
    }
    drawPlayer(ctx, px, py + (seated ? 2 * scale : 0), scale, {
      swim: swimming ? { moving: swimMoving } : undefined,
      seated,
      wear: { head: eq('head'), body: eq('body'), feet: eq('feet') },
      paint: paint ? [paint.c1, paint.c2] : undefined,
      helm: helmPaint ? [helmPaint.c1, helmPaint.c2] : undefined,
      facing: game.facing,
      walking: Math.abs(b.vx) > 1,
      t: time,
      airborne: !b.onGround,
      vy: b.vy,
      climbing: onLadder(game.world, b) && !b.onGround,
      hurt: game.iframes > 0 && (this.reduceFlash ? game.iframes > 0.3 : Math.floor(time * 20) % 2 === 0),
      swing: game.swing > 0,
      tier: game.upgrades.armor ?? 0,
      gear: playerGear(game),
      held: game.tool,
      squash: fx.hurtLeft > 0 ? hurtSquash(fx.hurtLeft) : squashScale(fx.squashLeft, fx.squashPower),
    });
    if (swimming) ctx.restore();
    this.swimInfo = swimming ? { angle: this.swimAngle, moving: swimMoving } : null;
    this.pilotTucked = hullOver !== null;
    if (hullOver) {
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w, hullOver.clipY, w * 3, h * 2);
      ctx.clip();
      hullOver.draw();
      ctx.restore();
    }
    if (veh) ctx.restore();

    // Items on the ground: bobbing icons with a soft glow so they read as pickups.
    for (const d of game.drops) {
      const isz = ICON * scale * 0.7;
      const bob = Math.sin(time * 4 + d.x * 3) * scale * 1.2;
      const dx = this.sx(d.x, shakeX) - isz / 2;
      const dy = this.sy(d.y, shakeY) - isz - scale * 2 + bob;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(dx + isz / 2, dy + isz / 2, isz * 0.7, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, d.item, dx, dy, scale * 0.7);
      if (d.n > 1) {
        ctx.font = `bold ${Math.round(scale * 5)}px monospace`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(`${d.n}`, dx + isz * 0.8, dy + isz);
      }
    }
    // Fishing line and bobber.
    if (game.fishing) {
      const f = game.fishing;
      const hx = px + game.facing * 9 * scale;
      const hy = py - 15 * scale;
      const bx2 = this.sx(f.x + 0.5, shakeX);
      const dip = f.bite > 0 ? scale * 3 + Math.sin(time * 30) * scale : Math.sin(time * 3) * scale * 0.8;
      const by2 = this.sy(f.y, shakeY) + dip;
      ctx.strokeStyle = 'rgba(230,246,255,0.8)';
      ctx.lineWidth = Math.max(1, scale * 0.5);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo((hx + bx2) / 2, Math.max(hy, by2) + ts * 0.8, bx2, by2);
      ctx.stroke();
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(bx2 - scale * 1.5, by2 - scale * 3, scale * 3, scale * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx2 - scale * 1.5, by2 - scale, scale * 3, scale * 1.5);
      if (f.bite > 0) {
        ctx.fillStyle = '#ffcf4a';
        ctx.font = `bold ${Math.round(scale * 8)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('!', bx2, by2 - scale * 6);
      }
    }

    // Meteors: bright head with a long fading trail.
    for (const m of game.meteors) {
      const mx = this.sx(m.x, shakeX);
      const my = this.sy(m.y, shakeY);
      const g = ctx.createLinearGradient(mx, my, mx - m.vx * scale * 3, my - m.vy * scale * 3);
      g.addColorStop(0, 'rgba(255,240,180,0.95)');
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = scale * 3;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - m.vx * scale * 3, my - m.vy * scale * 3);
      ctx.stroke();
      ctx.fillStyle = '#fff6d0';
      ctx.fillRect(mx - scale * 2, my - scale * 2, scale * 4, scale * 4);
    }

    this.drawShimmer(ctx, shakeX, shakeY, time);

    // Dust storm haze on the surface (fades out underground).
    if (game.weather === 'dust' && game.depth < 20) {
      const k = Math.max(0, 1 - game.depth / 20);
      ctx.fillStyle = `rgba(150,110,70,${(0.45 * k).toFixed(3)})`;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.fillStyle = `rgba(220,180,130,${(0.35 * k).toFixed(3)})`;
      for (let i = 0; i < 60; i++) {
        const sx = (hash2(i, 1, 4) * this.w + time * (220 + i * 3)) % this.w;
        const sy = hash2(i, 2, 4) * this.h;
        ctx.fillRect(sx, sy, scale * 6, scale);
      }
    }

    // Particles and floating text.
    for (const p of fx.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max + 0.2));
      ctx.fillStyle = p.color;
      const px = this.sx(p.x, shakeX);
      const py = this.sy(p.y, shakeY);
      const ps = p.size * scale;
      if (p.hollow) {
        // Air bubble: a 1 art px ring with a bright fleck, so it reads as air, not a speck.
        ctx.fillRect(px + scale, py, ps - scale * 2, scale);
        ctx.fillRect(px + scale, py + ps - scale, ps - scale * 2, scale);
        ctx.fillRect(px, py + scale, scale, ps - scale * 2);
        ctx.fillRect(px + ps - scale, py + scale, scale, ps - scale * 2);
        if (p.size >= 4) ctx.fillRect(px + scale, py + scale, scale, scale);
      } else ctx.fillRect(px, py, ps, ps);
    }
    ctx.globalAlpha = 1;
    for (const tr of fx.tracers) {
      const k = tr.life / tr.max;
      ctx.globalAlpha = Math.max(0, k);
      ctx.strokeStyle = tr.color;
      ctx.lineWidth = scale * (1 + k);
      ctx.beginPath();
      ctx.moveTo(this.sx(tr.x, shakeX), this.sy(tr.y, shakeY));
      ctx.lineTo(this.sx(tr.tx, shakeX), this.sy(tr.ty, shakeY));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const r of fx.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = scale * (2.5 - 1.5 * k);
      ctx.beginPath();
      const rad = Math.max(1, r.r * ts * (0.2 + 0.8 * k));
      // Flat rings (splashes) are ellipses lying on the surface.
      ctx.ellipse(this.sx(r.x, shakeX), this.sy(r.y, shakeY), rad, rad * (r.flat ?? 1), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.font = `bold ${Math.round(scale * 5)}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = 'center';
    for (const t of fx.texts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / 0.5));
      ctx.fillStyle = '#000';
      ctx.fillText(t.text, this.sx(t.x, shakeX) + scale, this.sy(t.y, shakeY) + scale);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, this.sx(t.x, shakeX), this.sy(t.y, shakeY));
    }
    ctx.globalAlpha = 1;

    this.drawDarkness(ctx, game, px, py - 14 * scale, time, shakeX, shakeY);
    // Bolts are light sources: drawn over the darkness with an additive glow so they read in deep caves.
    this.drawBolts(ctx, game, shakeX, shakeY, time);
    this.drawHurt(ctx, game, fx, time);
  }

  /** Red screen-edge vignette: flashes on a hit, beats slowly while HP is low. */
  private drawHurt(ctx: CanvasRenderingContext2D, game: Game, fx: Fx, time: number): void {
    const a = softFlash(hurtVignette(fx.hurtLeft, fx.hurtPower, game.hp / Math.max(1, game.derived.maxHp), time), this.reduceFlash);
    this.lastHurtAlpha = a;
    if (a <= 0.005) return;
    const r = Math.hypot(this.w, this.h) / 2;
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, r * 0.45, this.w / 2, this.h / 2, r);
    g.addColorStop(0, 'rgba(200,20,30,0)');
    g.addColorStop(1, `rgba(200,20,30,${a.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  /** Player bolts: additive glow, then the tracer itself (bombs are plain shells). */
  private drawBolts(ctx: CanvasRenderingContext2D, game: Game, shakeX: number, shakeY: number, time: number): void {
    const scale = this.scale;
    const ts = TS * scale;
    ctx.globalCompositeOperation = 'lighter';
    for (const sh of game.shots) {
      if (sh.bomb) continue;
      const gx = this.sx(sh.x, shakeX);
      const gy = this.sy(sh.y, shakeY);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, ts * 1.1);
      g.addColorStop(0, boltColor(sh, game.gear.ranged) + '5a');
      g.addColorStop(1, boltColor(sh, game.gear.ranged) + '00');
      ctx.fillStyle = g;
      ctx.fillRect(gx - ts * 1.1, gy - ts * 1.1, ts * 2.2, ts * 2.2);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const sh of game.shots) {
      const sxp = this.sx(sh.x, shakeX);
      const syp = this.sy(sh.y, shakeY);
      const len = Math.hypot(sh.vx, sh.vy) || 1;
      if (sh.bomb) {
        // A dark shell with a blinking fuse light.
        ctx.fillStyle = '#2b3a2a';
        ctx.beginPath();
        ctx.arc(sxp, syp, scale * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Math.floor(time * 12) % 2 ? '#ff5a5a' : '#ffd24a';
        ctx.fillRect(sxp - scale * 0.6, syp - scale * 2.8, scale * 1.4, scale * 1.4);
        continue;
      }
      // Glowing tracer: a soft wide halo, a coloured body and a white-hot head (colour says what the bolt does).
      const col = boltColor(sh, game.gear.ranged);
      const tail = ts * (sh.pierce ? 1.5 : 1.05);
      const tx0 = sxp - (sh.vx / len) * tail;
      const ty0 = syp - (sh.vy / len) * tail;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = col;
      ctx.lineWidth = scale * 5;
      ctx.beginPath();
      ctx.moveTo(tx0, ty0);
      ctx.lineTo(sxp, syp);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const grad = ctx.createLinearGradient(tx0, ty0, sxp, syp);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, col);
      ctx.strokeStyle = grad;
      ctx.lineWidth = scale * 2;
      ctx.beginPath();
      ctx.moveTo(tx0, ty0);
      ctx.lineTo(sxp, syp);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sxp - scale, syp - scale, scale * 2, scale * 2);
    }
  }

  /** Static art of one tile (cached in chunks): back wall, block, decor, lichen. */
  private drawTile(ctx: CanvasRenderingContext2D, world: Game['world'], tx: number, ty: number, dx: number, dy: number, ts: number, scale: number): void {
    const t = world.tiles[ty * world.w + tx];
    const get = (x: number, y: number): number => world.get(x, y);
    if (t === T.AIR) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      return;
    }
    if (t === T.TORCH) {
      // Flame flickers: drawn each frame by drawDynamic, only the wall is cached.
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      return;
    }
    if (t === T.LADDER) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      this.drawLadder(ctx, dx, dy, ts);
      return;
    }
    if (t === T.WINDOW) {
      // The pane shows the live sky: drawn each frame by drawDynamic.
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      return;
    }
    if (t === T.LIFT) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      this.drawLiftShaft(ctx, dx, dy, ts);
      return;
    }
    if (t === T.PLATFORM) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      ctx.fillStyle = '#9fb0c8';
      ctx.fillRect(dx, dy, ts, Math.max(2, ts * 0.22));
      ctx.fillStyle = '#55627a';
      ctx.fillRect(dx, dy + Math.max(2, ts * 0.22), ts, Math.max(1, ts * 0.08));
      return;
    }
    if (t === T.SPIKES) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      this.drawSpikes(ctx, dx, dy, ts);
      return;
    }
    const art = furnitureArt(t, wideSide(world, tx, ty));
    if (art) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      drawRows(ctx, art.rows, dx, dy, ts / 16, false, 16, undefined, art.pal);
      return;
    }
    if (t === T.SOLAR || t === T.SMELTER || t === T.BATTERY || t === T.MINER || t === T.DRONE || t === T.TURRET) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      this.drawMachine(ctx, t, dx, dy, ts);
      return;
    }
    if (t === T.WATER || t === T.ACID_POOL || t === T.MAGMA) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      const acid = t === T.ACID_POOL;
      const magma = t === T.MAGMA;
      ctx.fillStyle = magma ? '#ff5a1f' : acid ? LIQUID_FILL.acid : LIQUID_FILL.water;
      const aboveT = world.get(tx, ty - 1);
      // Water and acid surface cells leave the top 2 art px open: the rolling crest fills them per frame.
      const open = !magma && aboveT !== T.WATER && aboveT !== T.ACID_POOL && aboveT !== T.MAGMA ? (ts / 16) * 2 : 0;
      ctx.fillRect(dx, dy + open, ts, ts - open);
      // Magma crust, veins and depth are drawn per frame (drawMagma, lavafx.ts) so the pool flows.
      const above = world.get(tx, ty - 1);
      if (above !== T.WATER && above !== T.ACID_POOL && above !== T.MAGMA) {
        // Surface: magma keeps a static bright line; water and acid crests roll per frame (drawLiquid).
        if (magma) {
          ctx.fillStyle = '#ffd27a';
          ctx.fillRect(dx, dy, ts, Math.max(1, ts / 8));
        }
        // Colour-blind assist: a warning mark on every third surface cell of acid and magma.
        if (this.oreMarks && !(t === T.WATER) && tx % 3 === 0) drawGlyph(ctx, t, dx, dy, ts);
      }
      return;
    }
    if (t === T.SPRINKLER || t === T.POT || isCropTile(t)) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      // Crops sway and sprinklers spray: drawn each frame by drawDynamic.
      if (t === T.POT) drawCropTile(ctx, t, dx, dy, ts, false, false, true);
      return;
    }
    if (t === T.SAPLING) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      const u = ts / 16;
      const leaf = ['#9fd36a', '#5fe0e0', '#d8b8ff', '#c9a35a', '#7fa8b8'][world.biome[tx] ?? 0] ?? '#9fd36a';
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(dx + 7 * u, dy + 7 * u, 2 * u, 9 * u);
      ctx.fillStyle = leaf;
      ctx.fillRect(dx + 3 * u, dy + 6 * u, 4 * u, 3 * u);
      ctx.fillRect(dx + 9 * u, dy + 4 * u, 4 * u, 3 * u);
      ctx.fillRect(dx + 6 * u, dy + 2 * u, 4 * u, 4 * u);
      ctx.fillStyle = '#14181f';
      ctx.fillRect(dx + 5 * u, dy + 15 * u, 6 * u, u);
      return;
    }
    if (t === T.GARAGE) {
      // Garage bay: a roll-up door panel with a glowing control light.
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      const u = ts / 16;
      ctx.fillStyle = '#14181f';
      ctx.fillRect(dx, dy, ts, ts);
      ctx.fillStyle = '#5d6a80';
      ctx.fillRect(dx + u, dy + u, ts - 2 * u, ts - 2 * u);
      ctx.fillStyle = '#3a4356';
      for (let r = 0; r < 4; r++) ctx.fillRect(dx + u, dy + (3 + r * 3) * u, ts - 2 * u, u);
      ctx.fillStyle = '#e8a33d';
      ctx.fillRect(dx + u, dy + u, ts - 2 * u, 2 * u);
      ctx.fillStyle = '#36e0e8';
      ctx.fillRect(dx + 12 * u, dy + 5 * u, 2 * u, 2 * u);
      return;
    }
    if (t === T.TERMINAL) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      const u = ts / 16;
      ctx.fillStyle = '#14181f';
      ctx.fillRect(dx + 2 * u, dy + 2 * u, 12 * u, 14 * u);
      ctx.fillStyle = '#3d4152';
      ctx.fillRect(dx + 3 * u, dy + 3 * u, 10 * u, 12 * u);
      ctx.fillStyle = '#0b2a2c';
      ctx.fillRect(dx + 4 * u, dy + 4 * u, 8 * u, 6 * u);
      ctx.fillStyle = '#36e0e8';
      for (let r = 0; r < 3; r++) ctx.fillRect(dx + 5 * u, dy + (5 + r * 2) * u, (3 + ((tx + r) % 4)) * u, u);
      ctx.fillStyle = '#ffcf4a';
      ctx.fillRect(dx + 5 * u, dy + 12 * u, 2 * u, u);
      return;
    }
    if (t === T.TRUNK || t === T.LEAVES || t === T.PLANT || t === T.CHEST) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      const bio = world.biome[tx] ?? 0;
      const v2 = Math.floor(hash2(tx, ty, 7) * 4);
      if (t === T.TRUNK) {
        // Inside a canopy, foliage continues behind the trunk so crowns never split in two.
        if (get(tx - 1, ty) === T.LEAVES && get(tx + 1, ty) === T.LEAVES) {
          const m = leafMask(get, tx, ty) & ~(2 | 8);
          ctx.drawImage(this.decor.leaves, (m * LEAF_VARIANTS + (v2 % LEAF_VARIANTS)) * TS, bio * TS, TS, TS, dx, dy, ts, ts);
        }
        ctx.drawImage(this.decor.trunks, (v2 % 2) * TS, bio * TS, TS, TS, dx, dy, ts, ts);
      }
      else if (t === T.LEAVES) {
        const m = leafMask(get, tx, ty);
        ctx.drawImage(this.decor.leaves, (m * LEAF_VARIANTS + (v2 % LEAF_VARIANTS)) * TS, bio * TS, TS, TS, dx, dy, ts, ts);
      } else if (t === T.PLANT) {
        const row = ty > world.surface[tx] + 1 ? CAVE_ROW : bio;
        ctx.drawImage(this.decor.plants, (v2 % PLANT_VARIANTS) * TS, row * TS, TS, TS, dx, dy, ts, ts);
      }
      // Chests bob: drawn each frame by drawDynamic.
      return;
    }
    if (t === T.WALL || t === T.DOOR) {
      // T.WALL is legacy (pre-v3 saves migrate it to the wall layer); still drawn if ever present.
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      ctx.fillStyle = t === T.WALL ? '#3a4356' : '#6fa8c9';
      const inset = t === T.WALL ? 0 : ts * 0.25;
      ctx.fillRect(dx + inset, dy, ts - inset * 2, ts);
      ctx.fillStyle = t === T.WALL ? '#2f3748' : '#3d6e8a';
      ctx.fillRect(dx + inset, dy, Math.max(1, ts * 0.08), ts);
      if (t === T.DOOR) {
        ctx.fillStyle = '#ffd36b';
        ctx.fillRect(dx + ts * 0.58, dy + ts * 0.5, Math.max(2, ts * 0.1), Math.max(2, ts * 0.1));
      }
      return;
    }
    const v = Math.floor(hash2(tx, ty, 7) * VARIANTS);
    const mask = isBlock(t) ? edgeMask(get, tx, ty) : MASKS - 1;
    // Rounded corners are transparent: show the cave wall behind them underground.
    if (mask !== 0) this.drawBack(ctx, world, tx, ty, dx, dy, ts);
    ctx.drawImage(this.atlas, atlasCol(v, mask) * TS, t * TS, TS, TS, dx, dy, ts, ts);
    if (hasStrata(t) && !world.edits.has(ty * world.w + tx)) this.drawStrata(ctx, tx, ty - world.surface[tx], ty, dx, dy, ts, mask);
    if (this.oreMarks && hasGlyph(t)) drawGlyph(ctx, t, dx, dy, ts);
    if (mask & EDGE_N && ty <= world.surface[tx]) {
      if (growsMoss(t) && world.biome[tx] !== B.ASH) ctx.drawImage(this.moss, v * TS, 0, TS, MOSS_H, dx, dy, ts, MOSS_H * scale);
      else if (growsSnow(t)) ctx.drawImage(this.decor.snow, v * TS, 0, TS, SNOW_H, dx, dy, ts, SNOW_H * scale);
    }
  }

  /** Soil strata bands, band seams and rare buried bones / pipes in natural ground near the surface. */
  private drawStrata(ctx: CanvasRenderingContext2D, tx: number, depth: number, ty: number, dx: number, dy: number, ts: number, mask: number): void {
    const sh = strataShade(depth, tx);
    const u = ts / 16;
    if (sh.dark > 0) {
      ctx.fillStyle = `rgba(10,6,14,${sh.dark.toFixed(3)})`;
      if (mask === 0) ctx.fillRect(dx, dy, ts, ts);
      else {
        // Edge tiles have cut (transparent) corner pixels: a cross shape keeps the overlay off them.
        ctx.fillRect(dx, dy + u, ts, ts - 2 * u);
        ctx.fillRect(dx + u, dy, ts - 2 * u, u);
        ctx.fillRect(dx + u, dy + ts - u, ts - 2 * u, u);
      }
    }
    if (sh.seam > 0) {
      ctx.fillStyle = `rgba(255,226,190,${sh.seam.toFixed(3)})`;
      ctx.fillRect(dx, dy, ts, Math.max(1, ts / 8));
    }
    const decal = buriedDecal(tx, ty, depth);
    if (!decal || mask !== 0) return;
    for (const [x, y, w, h, c] of decalRects(decal, ((tx + ty) & 1) === 1)) {
      ctx.fillStyle = c;
      ctx.fillRect(dx + x * u, dy + y * u, w * u, h * u);
    }
  }

  /** Machines: a solar panel on a post, and a smelter with a furnace mouth (glow is added per frame). */
  private drawMachine(ctx: CanvasRenderingContext2D, t: number, dx: number, dy: number, ts: number): void {
    const u = ts / 16;
    if (t === T.SOLAR) {
      ctx.fillStyle = '#2b3447';
      ctx.fillRect(dx + 7 * u, dy + 9 * u, 2 * u, 7 * u);
      ctx.fillStyle = '#1b2438';
      ctx.fillRect(dx + 1 * u, dy + 3 * u, 14 * u, 7 * u);
      ctx.fillStyle = '#3a8fe0';
      for (let i = 0; i < 3; i++) ctx.fillRect(dx + (2 + i * 4.3) * u, dy + 4 * u, 3.5 * u, 5 * u);
      ctx.fillStyle = '#9fd8ff';
      ctx.fillRect(dx + 2 * u, dy + 4 * u, 3.5 * u, 1 * u);
      return;
    }
    if (t === T.MINER) {
      ctx.fillStyle = '#3d4458';
      ctx.fillRect(dx + 2 * u, dy + 2 * u, 12 * u, 6 * u);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(dx + 2 * u, dy + 2 * u, 12 * u, 1.5 * u);
      ctx.fillStyle = '#566078';
      ctx.fillRect(dx + 7 * u, dy + 8 * u, 2 * u, 6 * u);
      ctx.fillStyle = '#c9d4e8';
      ctx.fillRect(dx + 6 * u, dy + 14 * u, 4 * u, 2 * u);
      return;
    }
    if (t === T.BATTERY) {
      ctx.fillStyle = '#2b3447';
      ctx.fillRect(dx + 3 * u, dy + 3 * u, 10 * u, 13 * u);
      ctx.fillStyle = '#566078';
      ctx.fillRect(dx + 6 * u, dy + 1 * u, 4 * u, 2 * u);
      ctx.fillStyle = '#14171f';
      ctx.fillRect(dx + 5 * u, dy + 5 * u, 6 * u, 9 * u);
      return;
    }
    if (t === T.TURRET) {
      // Tripod mount and a domed housing; the barrel is drawn per frame so it can track its target.
      ctx.fillStyle = '#2b3447';
      ctx.fillRect(dx + 3 * u, dy + 14 * u, 10 * u, 2 * u);
      ctx.fillRect(dx + 7 * u, dy + 10 * u, 2 * u, 4 * u);
      ctx.fillStyle = '#161a24';
      ctx.fillRect(dx + 3 * u, dy + 5 * u, 10 * u, 6 * u);
      ctx.fillStyle = '#5d6a80';
      ctx.fillRect(dx + 4 * u, dy + 6 * u, 8 * u, 4 * u);
      ctx.fillStyle = '#8e98b0';
      ctx.fillRect(dx + 4 * u, dy + 6 * u, 8 * u, 1 * u);
      ctx.fillStyle = '#566078';
      ctx.fillRect(dx + 2 * u, dy + 15 * u, 12 * u, 1 * u);
      return;
    }
    if (t === T.DRONE) {
      ctx.fillStyle = '#3d4458';
      ctx.fillRect(dx + 1 * u, dy + 13 * u, 14 * u, 3 * u);
      ctx.fillStyle = '#566078';
      ctx.fillRect(dx + 1 * u, dy + 13 * u, 14 * u, 1 * u);
      ctx.fillStyle = '#2b3447';
      ctx.fillRect(dx + 4 * u, dy + 9 * u, 8 * u, 4 * u);
      ctx.fillStyle = '#8ad8ff';
      ctx.fillRect(dx + 6 * u, dy + 10 * u, 4 * u, 2 * u);
      return;
    }
    ctx.fillStyle = '#3d4458';
    ctx.fillRect(dx + 1 * u, dy + 3 * u, 14 * u, 13 * u);
    ctx.fillStyle = '#566078';
    ctx.fillRect(dx + 1 * u, dy + 3 * u, 14 * u, 2 * u);
    ctx.fillStyle = '#2b3140';
    ctx.fillRect(dx + 11 * u, dy + 0 * u, 3 * u, 4 * u);
    ctx.fillStyle = '#14171f';
    ctx.fillRect(dx + 4 * u, dy + 8 * u, 8 * u, 6 * u);
  }

  /** Floor spikes: a dark plate with five steel teeth, lit on the left edge. */
  private drawSpikes(ctx: CanvasRenderingContext2D, dx: number, dy: number, ts: number): void {
    const u = ts / 16;
    ctx.fillStyle = '#161a24';
    ctx.fillRect(dx, dy + 13 * u, ts, 3 * u);
    ctx.fillStyle = '#3d4458';
    ctx.fillRect(dx, dy + 14 * u, ts, 2 * u);
    for (let i = 0; i < 5; i++) {
      const x = dx + (1 + i * 3) * u;
      ctx.fillStyle = '#161a24';
      ctx.fillRect(x, dy + 8 * u, 3 * u, 5 * u);
      ctx.fillStyle = '#9aa3b8';
      ctx.fillRect(x + 0.5 * u, dy + 9 * u, 2 * u, 4 * u);
      ctx.fillStyle = '#e6eeff';
      ctx.fillRect(x + 1 * u, dy + 7 * u, 1 * u, 3 * u);
    }
  }

  /** Turret barrel and status light: aims at the last target, red eye when powered, dim when not. */
  private drawTurretTop(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, aim: number, on: boolean, time: number): void {
    const u = ts / 16;
    const cx = x + 8 * u;
    const cy = y + 6 * u;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(aim);
    ctx.fillStyle = '#161a24';
    ctx.fillRect(-1 * u, -2 * u, 10 * u, 4 * u);
    ctx.fillStyle = '#9aa3b8';
    ctx.fillRect(0, -1 * u, 9 * u, 2 * u);
    ctx.fillStyle = '#e6eeff';
    ctx.fillRect(0, -1 * u, 9 * u, 0.7 * u);
    ctx.restore();
    ctx.fillStyle = on ? (Math.floor(time * 3) % 3 === 0 ? '#ffcf4a' : '#ff4a3a') : '#3a2a2a';
    ctx.fillRect(x + 7 * u, y + 8 * u, 2 * u, 1.5 * u);
  }

  /** Lamp halo and a live wall screen (scrolling readout and a blinking cursor). */
  private drawFurnitureGlow(ctx: CanvasRenderingContext2D, t: number, x: number, y: number, ts: number, time: number, tx: number): void {
    const u = ts / 16;
    if (t === T.LAMP) {
      const f = 0.85 + 0.15 * Math.sin(time * 2.3 + tx);
      ctx.fillStyle = `rgba(255,224,138,${0.16 * f})`;
      ctx.beginPath();
      ctx.arc(x + 8 * u, y + 4 * u, 7 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,246,208,${0.5 * f})`;
      ctx.fillRect(x + 5 * u, y + 3 * u, 6 * u, 2 * u);
      return;
    }
    const s = screenLines(time, tx);
    for (let i = 0; i < s.length; i++) {
      ctx.fillStyle = i === 1 ? '#9ff6a0' : '#36e0e8';
      ctx.fillRect(x + 3 * u, y + (4 + i * 2) * u, s[i] * u, u);
    }
    if (Math.floor(time * 2) % 2 === 0) {
      ctx.fillStyle = '#e6eeff';
      ctx.fillRect(x + (3 + s[s.length - 1]) * u, y + (4 + (s.length - 1) * 2) * u, u, u);
    }
  }

  private turretAim = new Map<number, number>();
  private turretsOn = false;
  private machinesOn = false;
  private minersOn = false;
  private dronesOn = false;
  private machinesSun = false;
  private batteryFill = 0;

  /** Per-frame tile art: torch flames and bobbing chests over the cached chunks. */
  private drawDynamic(ctx: CanvasRenderingContext2D, world: Game['world'], x0: number, y0: number, x1: number, y1: number, shakeX: number, shakeY: number, time: number): void {
    const ts = TS * this.scale;
    this.farmShown = 0;
    this.liquidShown = 0;
    this.lavaShown = 0;
    this.shimmerCells.length = 0;
    for (let ty = Math.max(0, y0); ty <= Math.min(world.h - 1, y1); ty++) {
      for (let tx = Math.max(0, x0); tx <= Math.min(world.w - 1, x1); tx++) {
        const t = world.tiles[ty * world.w + tx];
        if (t === T.TORCH) this.drawTorch(ctx, this.sx(tx, shakeX), this.sy(ty, shakeY), ts, time + tx);
        else if (t === T.SPRINKLER || isCropTile(t)) this.drawFarmTile(ctx, world, t, tx, ty, this.sx(tx, shakeX), this.sy(ty, shakeY), ts, time);
        else if (t === T.WINDOW) this.drawWindow(ctx, world, tx, ty, this.sx(tx, shakeX), this.sy(ty, shakeY), ts, time);
        else if (t === T.LIFT) this.drawLiftGlow(ctx, this.sx(tx, shakeX), this.sy(ty, shakeY), ts, time, ty);
        else if (t === T.LAMP || t === T.SCREEN) this.drawFurnitureGlow(ctx, t, this.sx(tx, shakeX), this.sy(ty, shakeY), ts, time, tx);
        else if (t === T.TURRET) this.drawTurretTop(ctx, this.sx(tx, shakeX), this.sy(ty, shakeY), ts, this.turretAim.get(ty * world.w + tx) ?? -Math.PI / 2, this.turretsOn, time);
        else if (t === T.BATTERY) {
          const n = Math.round(this.batteryFill * 4);
          const bx = this.sx(tx, shakeX);
          const by = this.sy(ty, shakeY);
          const u = ts / 16;
          ctx.fillStyle = '#7dff9a';
          for (let i = 0; i < n; i++) ctx.fillRect(bx + 6 * u, by + (12 - i * 2) * u, 4 * u, 1.4 * u);
        } else if (t === T.SMELTER && this.machinesOn) {
          const f = 0.6 + 0.4 * Math.sin(time * 9 + tx);
          ctx.fillStyle = `rgba(255,${120 + 80 * f | 0},40,${0.7 + 0.3 * f})`;
          ctx.fillRect(this.sx(tx, shakeX) + ts * 0.3, this.sy(ty, shakeY) + ts * 0.55, ts * 0.4, ts * 0.3);
        } else if (t === T.MINER && this.minersOn) {
          const bob = Math.abs(Math.sin(time * 8 + tx)) * ts * 0.12;
          ctx.fillStyle = '#c9d4e8';
          ctx.fillRect(this.sx(tx, shakeX) + ts * 0.4, this.sy(ty, shakeY) + ts * 0.62 + bob, ts * 0.2, ts * 0.2);
        } else if (t === T.DRONE && this.dronesOn) {
          const a = time * 2.2 + tx;
          ctx.fillStyle = '#8ad8ff';
          ctx.fillRect(this.sx(tx, shakeX) + ts * (0.45 + 0.35 * Math.cos(a)), this.sy(ty, shakeY) + ts * (0.2 + 0.12 * Math.sin(a * 2)), ts * 0.14, ts * 0.1);
        } else if (t === T.SOLAR && this.machinesSun) {
          ctx.fillStyle = 'rgba(159,216,255,0.35)';
          const gx = this.sx(tx, shakeX) + ts * (0.1 + 0.8 * ((time * 0.4 + tx * 0.37) % 1));
          ctx.fillRect(gx, this.sy(ty, shakeY) + ts * 0.2, ts * 0.12, ts * 0.45);
        } else if (t === T.WATER || t === T.ACID_POOL) {
          this.drawLiquid(ctx, world, t, tx, ty, this.sx(tx, shakeX), this.sy(ty, shakeY), ts, time);
        } else if (t === T.MAGMA) {
          this.drawMagma(ctx, world, tx, ty, this.sx(tx, shakeX), this.sy(ty, shakeY), ts, time);
        } else if (t === T.CHEST) {
          const bob = Math.sin(time * 3 + tx) > 0.6 ? this.scale : 0;
          ctx.drawImage(this.decor.chest, 0, 0, TS, TS, this.sx(tx, shakeX), this.sy(ty, shakeY) - bob, ts, ts);
        }
      }
    }
  }

  /** Crops (swaying in the wind, ripe ones twinkle) and sprinklers (spray arcs), per frame. */
  private drawFarmTile(ctx: CanvasRenderingContext2D, world: Game['world'], t: number, tx: number, ty: number, dx: number, dy: number, ts: number, time: number): void {
    const u = ts / 16;
    if (t === T.SPRINKLER) {
      drawCropTile(ctx, t, dx, dy, ts, false, true);
      ctx.fillStyle = '#9fd8ff';
      for (const d of sprinklerDrops(time, tx)) {
        ctx.globalAlpha = d.a;
        ctx.fillRect(dx + d.x * u, dy + d.y * u, u, u);
      }
      ctx.globalAlpha = 1;
      this.farmShown++;
      return;
    }
    const c = cropAt(t);
    if (!c) return;
    drawCropTile(ctx, t, dx, dy, ts, this.cropWet ? this.cropWet(tx, ty) : isWatered(world, tx, ty), false, false, cropSway(time, tx, c.stage));
    this.farmShown++;
    if (c.stage === 2) {
      const sp = ripeSparkle(time, tx);
      if (sp) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dx + sp.x * u, dy + sp.y * u, u, u);
        ctx.fillRect(dx + (sp.x - 1) * u, dy + sp.y * u, 3 * u, u * 0.5);
      }
    }
  }

  /** Field drones: a dark hull with a role-coloured eye, spinning rotor, drill beam or cargo pod. */
  /**
   * Outline of the room you stand in or point at (base only): green when it is a robot home,
   * amber while it still needs something. Brighter when the cursor is inside it.
   */
  private drawRoomOutline(ctx: CanvasRenderingContext2D, game: Game, aim: Aim | null, shakeX: number, shakeY: number, time: number): void {
    if (!game.isAtBase() && Math.abs(game.body.x - game.world.padX) > 20) return;
    const aimed = aim ? game.roomAtTile(aim.tx, aim.ty) : null;
    const room = aimed ?? game.roomHere();
    if (!room) return;
    const ts = TS * this.scale;
    const e = roomEdges(room, game.world.w);
    const a = (aimed ? 0.65 : 0.42) + 0.15 * Math.sin(time * 3);
    ctx.strokeStyle = room.valid ? `rgba(125,255,176,${a.toFixed(3)})` : `rgba(255,176,58,${a.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, this.scale * 0.75);
    ctx.setLineDash([ts / 4, ts / 6]);
    ctx.lineDashOffset = -time * ts * 0.5;
    ctx.beginPath();
    for (const [x, y] of e.h) {
      ctx.moveTo(this.sx(x, shakeX), this.sy(y, shakeY));
      ctx.lineTo(this.sx(x + 1, shakeX), this.sy(y, shakeY));
    }
    for (const [x, y] of e.v) {
      ctx.moveTo(this.sx(x, shakeX), this.sy(y, shakeY));
      ctx.lineTo(this.sx(x, shakeX), this.sy(y + 1, shakeY));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    // A faint wash inside, so the room's shape reads even with busy walls.
    ctx.fillStyle = room.valid ? 'rgba(125,255,176,0.05)' : 'rgba(255,176,58,0.06)';
    for (const i of room.cells) ctx.fillRect(this.sx(i % game.world.w, shakeX), this.sy(Math.floor(i / game.world.w), shakeY), ts, ts);
  }

  /** Robot NPCs in their rooms: pixel sprite, a soft glow under the antenna, a name tag when you are close. */
  private drawNpcs(ctx: CanvasRenderingContext2D, game: Game, shakeX: number, shakeY: number, time: number): void {
    const near = game.npcNear();
    const s = this.scale;
    this.heartsShown = 0;
    for (const n of game.npcs) {
      const x = this.sx(n.x, shakeX);
      const hop = n.react && n.pose !== 'sit' ? npcHop(n.react, n.reactT ?? 0) * s : 0;
      const y = this.sy(n.y, shakeY) - hop;
      const info = NPC_INFO[n.kind];
      const kind = n.kind === 'merchant' ? 'trader' : n.kind;
      const look = ROBOT_LOOK[kind];
      const remap = look.remap;
      const t = time + n.home * 0.01;
      if (n.pose === 'sleep') this.drawNpcAsleep(ctx, game, n, x, y, t, kind, game.raid !== null);
      else if (n.pose === 'sit') {
        // On the chair seat, shifted forward so the chair back shows behind; legs bend towards the table.
        drawRows(ctx, npcSitRows(kind, t), Math.round(x - (TRADER_W / 2 - 4) * s), Math.round(y - 21 * s), s, false, TRADER_W, undefined, remap);
      } else {
        const rows = robotRows(kind, t, n.to !== null);
        drawRows(ctx, rows, Math.round(x - (TRADER_W / 2) * s), Math.round(y - 20 * s), s, n.face < 0, TRADER_W, undefined, remap);
      }
      if (n.react) this.drawNpcBubble(ctx, x, y - (n.pose === 'sit' ? 23 : 22) * s, n.react === 'cheer' ? 'Yay!' : 'Hi!', n.react === 'cheer' ? '#7dffb0' : '#ffffff', time);
      else if (n.pose !== 'sleep' && n !== near) {
        const h = moodHeart(game.npcMood(n.kind), t + n.home * 0.37);
        if (h) this.heartsShown++;
        if (h) this.drawHeart(ctx, x + 5 * s, y - (22 + h.rise * 6) * s, h.alpha, h.color);
      }
      if (n === near && !n.react) {
        const label = `${info.name.toUpperCase()}  ${info.title}`;
        ctx.font = `bold ${Math.round(s * 4)}px monospace`;
        const tw = ctx.measureText(label).width + s * 4;
        const ty = y - 26 * s + Math.sin(time * 3) * s;
        ctx.fillStyle = 'rgba(10,12,20,0.8)';
        ctx.fillRect(x - tw / 2, ty - s * 3.5, tw, s * 5);
        ctx.strokeStyle = look.tag;
        ctx.lineWidth = Math.max(1, s * 0.5);
        ctx.strokeRect(x - tw / 2, ty - s * 3.5, tw, s * 5);
        ctx.fillStyle = look.tag;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, ty - s);
      }
    }
  }

  /** Dex, the merchant drone, hovering over the pad with its crate while it is parked there (merchant.ts). */
  private drawMerchant(ctx: CanvasRenderingContext2D, game: Game, shakeX: number, shakeY: number, time: number): void {
    if (!game.merchantHere()) return;
    const s = this.scale;
    const p = game.merchantPos();
    const x = this.sx(p.x, shakeX);
    const y = this.sy(p.y + Math.sin(time * 2.2) * 0.12, shakeY);
    const rows = [...droneRows('home', time), ...MERCHANT_CRATE];
    // A soft cyan landing beam under the crate.
    const g = ctx.createLinearGradient(0, y, 0, this.sy(game.world.padY, shakeY));
    g.addColorStop(0, 'rgba(90,216,255,0.22)');
    g.addColorStop(1, 'rgba(90,216,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 5 * s, y + 4 * s, 10 * s, this.sy(game.world.padY, shakeY) - y - 4 * s);
    drawRows(ctx, rows, Math.round(x - (DRONE_W / 2) * s), Math.round(y - 8 * s), s, false, DRONE_W, undefined, { ...MERCHANT_REMAP, C: '#a07a4a', c: '#6b5028' });
    if (game.merchantNear()) {
      const label = 'DEX  Merchant';
      ctx.font = `bold ${Math.round(s * 4)}px monospace`;
      const tw = ctx.measureText(label).width + s * 4;
      const ty = y - 13 * s + Math.sin(time * 3) * s;
      ctx.fillStyle = 'rgba(10,12,20,0.8)';
      ctx.fillRect(x - tw / 2, ty - s * 3.5, tw, s * 5);
      ctx.strokeStyle = '#5ad8ff';
      ctx.lineWidth = Math.max(1, s * 0.5);
      ctx.strokeRect(x - tw / 2, ty - s * 3.5, tw, s * 5);
      ctx.fillStyle = '#5ad8ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, ty - s);
    }
  }

  /** A 5x4 pixel heart (or a grey sigh for a lonely robot) centred on (x, y). */
  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number, color: string): void {
    const s = this.scale;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let r = 0; r < HEART.length; r++) for (let c = 0; c < 5; c++) {
      if (HEART[r][c] === '#') ctx.fillRect(Math.round(x + (c - 2.5) * s), Math.round(y + (r - 2) * s), Math.ceil(s), Math.ceil(s));
    }
    ctx.globalAlpha = 1;
  }

  /** A little speech bubble with a tail, centred over (x, y) (its bottom edge). */
  private drawNpcBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, time: number): void {
    const s = this.scale;
    ctx.font = `bold ${Math.round(s * 5)}px monospace`;
    const w = ctx.measureText(text).width + s * 4;
    const h = s * 7;
    const by = y - h - s * 2 + Math.sin(time * 6) * s * 0.5;
    ctx.fillStyle = 'rgba(10,12,20,0.85)';
    ctx.fillRect(Math.round(x - w / 2), Math.round(by), Math.round(w), Math.round(h));
    ctx.fillRect(Math.round(x - s), Math.round(by + h), Math.round(s * 2), Math.round(s * 2));
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, s * 0.5);
    ctx.strokeRect(Math.round(x - w / 2), Math.round(by), Math.round(w), Math.round(h));
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + h / 2);
  }

  /**
   * A robot in bed: its head on the pillow under a blanket mound that runs to the foot of the bed,
   * with drifting z's. In a raid it is wide awake and trembling under the covers, with a "!" over it.
   */
  private drawNpcAsleep(ctx: CanvasRenderingContext2D, game: Game, n: Npc, x: number, y: number, t: number, kind: RobotKind, raid: boolean): void {
    const s = this.scale;
    const bed = Math.floor(n.x);
    const left = x - 8 * s;
    const top = y - 16 * s;
    const jit = raid ? Math.round(Math.sin(t * 40)) * s * 0.5 : 0;
    const remap = ROBOT_LOOK[kind].remap;
    drawRows(ctx, npcBedHeadRows(raid), Math.round(left + s + jit), Math.round(top - 1 * s), s, false, TRADER_W, undefined, { ...remap, q: '#2a6878' });
    // The blanket covers the body from the pillow's edge to the foot (one cell for an old 1-tile bed).
    const wide = game.world.get(bed + 1, Math.floor(n.y) - 1) === T.BED_FOOT;
    const bw = wide ? 18 : 6;
    const bx = wide ? 11 : 10;
    const pal = ROBOT_LOOK[kind].blanket;
    drawRows(ctx, blanketRows(bw), Math.round(left + bx * s + jit), Math.round(top + 5 * s), s, false, bw, undefined, pal);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (raid) {
      ctx.font = `bold ${Math.round(s * 7)}px monospace`;
      ctx.fillStyle = '#ff5a4a';
      ctx.fillText('!', left + 8 * s, top - 6 * s + Math.sin(t * 12) * s);
      return;
    }
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.5 + i / 3) % 1;
      ctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
      ctx.font = `bold ${Math.round(s * (3 + k * 3))}px monospace`;
      ctx.fillStyle = '#bcd4ff';
      ctx.fillText('z', left + (10 + k * 6 + Math.sin((k + i) * 6) * 1.5) * s, top - (2 + k * 12) * s);
    }
    ctx.globalAlpha = 1;
  }

  private drawFieldDrones(ctx: CanvasRenderingContext2D, game: Game, shakeX: number, shakeY: number, time: number): void {
    const u = this.scale;
    for (const d of game.drones) {
      if (d.mode === 'dock') continue;
      const x = this.sx(d.x, shakeX);
      const y = this.sy(d.y + Math.sin(time * 4 + d.bayX) * 0.08, shakeY);
      const col = ACT_INFO[d.act].color;
      // Inside rock the drone phases through: draw it faint.
      ctx.globalAlpha = game.world.isSolid(Math.floor(d.x), Math.floor(d.y)) ? 0.45 : 1;
      const s = u * 0.6;
      const rows = droneRows(d.act, time + d.bayX * 0.013);
      if (d.mode === 'drill' && d.target && Math.hypot(d.target.x + 0.5 - d.x, d.target.y - 0.2 - d.y) < 0.2) {
        ctx.fillStyle = `rgba(255,190,80,${0.6 + 0.4 * Math.sin(time * 30)})`;
        ctx.fillRect(x - u, y + u * 5, u * 2, u * 4);
      }
      if (d.act === 'repair' && game.hp < game.derived.maxHp && d.mode === 'follow') {
        // Repair beam: a pulsing line to the player's chest with a few motes.
        const px = this.sx(game.body.x, shakeX);
        const py = this.sy(game.body.y - BODY_H * 0.6, shakeY);
        ctx.strokeStyle = `rgba(90,255,216,${0.45 + 0.3 * Math.sin(time * 14)})`;
        ctx.lineWidth = Math.max(1, u * 1.2);
        ctx.beginPath();
        ctx.moveTo(x, y + u * 4);
        ctx.lineTo(px, py);
        ctx.stroke();
        const k = (time * 2) % 1;
        ctx.fillStyle = '#c8fff0';
        ctx.fillRect(x + (px - x) * k - u, y + u * 4 + (py - y - u * 4) * k - u, u * 2, u * 2);
      }
      drawRows(ctx, rows, x - (DRONE_W / 2) * s, y - u * 3, s, d.x > game.body.x, DRONE_W, undefined, { e: col });
      if (Object.keys(d.cargo).length > 0) {
        ctx.fillStyle = '#ffcf4a';
        ctx.fillRect(x - u * 1.5, y + u * 3, u * 3, u * 2);
        ctx.fillStyle = '#14181f';
        ctx.fillRect(x - u * 1.5, y + u * 3, u * 3, Math.max(1, u * 0.5));
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Molten rock moves: a travelling heat band, bubbles that swell and pop, embers and shimmer above the surface. */
  /** Water and acid per frame: depth shade, rolling crest, drifting glint, caustics, acid bubbles. */
  private vehiclePose(game: Game, veh: string, dt: number): { tilt: number; squash: number } {
    const b = game.body;
    const ground = veh === 'buggy' || veh === 'drill_tank';
    let target = 0;
    if (ground && b.onGround) {
      // Slope under the wheels: ground height one tile left and right of the body.
      const gy = (x: number): number => {
        for (let y = Math.floor(b.y - 1.5); y <= Math.floor(b.y + 2); y++) if (TILES[game.world.get(Math.floor(x), y)]?.solid) return y;
        return b.y + 2;
      };
      target = vehicleTilt(gy(b.x - 1.1), gy(b.x + 1.1));
    } else if (!ground) target = Math.max(-0.3, Math.min(0.3, game.facing * b.vy * 0.03));
    else target = Math.max(-0.25, Math.min(0.25, game.facing * b.vy * 0.02));
    this.vehTilt += (target - this.vehTilt) * Math.min(1, dt * 10);
    if (this.vehAir && b.onGround && this.vehVy > 7) this.vehSquashT = LAND_SQUASH_TIME;
    this.vehAir = !b.onGround;
    this.vehVy = b.vy;
    this.vehSquashT = Math.max(0, this.vehSquashT - dt);
    return { tilt: this.vehTilt, squash: landSquash(this.vehSquashT) };
  }

  /** Rings spreading on the surface while the swimmer's head is near it (faster and wider when stroking). */
  private drawSwimRipples(ctx: CanvasRenderingContext2D, game: Game, shakeX: number, shakeY: number, time: number, moving: boolean): void {
    const b = game.body;
    const w = game.world;
    const tx = Math.floor(b.x);
    let top = Math.floor(b.y - 0.2);
    while (isLiquid(w.get(tx, top - 1)) && top > b.y - 4) top--;
    if (isLiquid(w.get(tx, top - 1)) || b.y - BODY_H > top + 1.2) return;
    const scale = this.scale;
    const cx = this.sx(b.x, shakeX);
    const cy = this.sy(top, shakeY) + scale;
    const period = moving ? 0.7 : 1.4;
    ctx.fillStyle = 'rgba(220,242,255,0.75)';
    for (let k = 0; k < 2; k++) {
      const ph = ((time / period + k / 2) % 1 + 1) % 1;
      const r = (4 + ph * (moving ? 18 : 12)) * scale;
      ctx.globalAlpha = 1 - ph;
      ctx.fillRect(cx - r - 3 * scale, cy, 3 * scale, scale);
      ctx.fillRect(cx + r, cy, 3 * scale, scale);
    }
    ctx.globalAlpha = 1;
  }

  private drawLiquid(ctx: CanvasRenderingContext2D, world: Game['world'], t: number, tx: number, ty: number, dx: number, dy: number, ts: number, time: number): void {
    const u = ts / 16;
    const acid = t === T.ACID_POOL;
    let depth = 0;
    while (depth < 4 && world.get(tx, ty - depth - 1) === t) depth++;
    this.liquidShown++;
    const shade = depthShade(depth);
    if (shade > 0) {
      ctx.fillStyle = acid ? `rgba(10,40,10,${shade})` : `rgba(4,16,48,${shade})`;
      ctx.fillRect(dx, dy, ts, ts);
    }
    if (acid) {
      const b = acidBubble(time, tx, ty);
      if (b && !(depth === 0 && b.y < 3)) {
        ctx.fillStyle = 'rgba(220,255,160,0.8)';
        ctx.fillRect(dx + b.x * u, dy + b.y * u, b.r * u, b.r * u);
      }
    }
    if (depth > 0) {
      const c = causticBand(time, tx, depth);
      if (c) {
        ctx.fillStyle = acid ? `rgba(220,255,160,${c.a})` : `rgba(170,225,255,${c.a})`;
        ctx.fillRect(dx + c.x * u, dy, c.w * u, ts);
      }
      return;
    }
    const above = world.get(tx, ty - 1);
    if (above === T.MAGMA) return;
    const crest = acid ? '#c8ff8a' : '#bfe6ff';
    const offs = waveOffsets(time, tx);
    for (let c = 0; c < 4; c++) {
      const o = offs[c] ?? 1;
      if (o < 2) {
        ctx.fillStyle = acid ? LIQUID_FILL.acid : LIQUID_FILL.water;
        ctx.fillRect(dx + c * 4 * u, dy + o * u, 4 * u, (2 - o) * u);
      }
      ctx.fillStyle = crest;
      ctx.fillRect(dx + c * 4 * u, dy + o * u, 4 * u, u);
      // Softer foam under the crest; above it the tile shows the air it sits in.
      ctx.fillStyle = acid ? 'rgba(200,255,140,0.35)' : 'rgba(160,215,255,0.35)';
      ctx.fillRect(dx + c * 4 * u, dy + (o + 1) * u, 4 * u, u);
    }
    const g = surfaceGlint(time, tx);
    if (g) {
      ctx.fillStyle = `rgba(255,255,255,${0.9 * g.a})`;
      ctx.fillRect(dx + g.x * u, dy + ((offs[Math.min(3, g.x >> 2)] ?? 1) + 1) * u, 2 * u, u);
    }
  }

  /** Liquid cells drawn last frame (e2e). */
  liquidShown = 0;
  /** Tiles the ridden ground vehicle has rolled (drives the wheel frames; e2e). */
  wheelDist = 0;
  /** Lava cells drawn last frame and shimmer rows copied (e2e). */
  lavaShown = 0;
  shimmerRows = 0;
  private shimmerCells: { tx: number; ty: number }[] = [];

  /**
   * Heat shimmer: the picture just above surface lava is copied back onto itself in thin rows,
   * each nudged a whole art px left or right, so the air over a lava pool wobbles.
   */
  private drawShimmer(ctx: CanvasRenderingContext2D, shakeX: number, shakeY: number, time: number): void {
    this.shimmerRows = 0;
    if (this.shimmerCells.length === 0) return;
    const u = this.scale;
    const canvas = ctx.canvas;
    const rh = SHIMMER_ROW * u;
    for (const run of shimmerRuns(this.shimmerCells)) {
      const x = this.sx(run.tx, shakeX);
      const w = run.n * TS * u;
      const top = this.sy(run.ty, shakeY);
      for (let r = 0; r < SHIMMER_ROWS / SHIMMER_ROW; r++) {
        const off = shimmerShift(time, r, run.tx);
        if (off === 0) continue;
        const y = top - (r + 1) * rh;
        if (y < 0 || y + rh > this.h || x + w < 0 || x > this.w) continue;
        const sx = Math.max(0, x);
        const sw = Math.min(this.w, x + w) - sx;
        if (sw <= 0) continue;
        ctx.drawImage(canvas, sx, y, sw, rh, sx + off * u, y, sw, rh);
        this.shimmerRows++;
      }
    }
    this.shimmerCells.length = 0;
  }

  /** Where the pet is this frame: dry, at the surface or under (e2e). */
  petSwim: PetWater = 'dry';
  /** Lavafall sheets drawn last frame (e2e) and the air cells they pour through (light sources). */
  lavafallsShown = 0;
  private fallCells = new Set<number>();

  /**
   * Ash Dunes lavafalls: lava spills over the crag lip and pours down the face in a sheet of
   * downward-scrolling streaks, lights the rock beside it, and spatters and throws embers where it
   * meets the catch pool. The sheet stops at whatever blocks it (lavafallSpan, shared with the burn).
   */
  private drawLavafalls(ctx: CanvasRenderingContext2D, world: Game['world'], x0: number, y0: number, x1: number, y1: number, shakeX: number, shakeY: number, time: number): void {
    this.lavafallsShown = 0;
    this.fallCells.clear();
    const u = this.scale;
    const ts = TS * u;
    for (const st of world.structures) {
      if (st.kind !== 'lavafall' || st.x1 < x0 - 1 || st.x0 > x1 + 1 || st.y1 < y0 - 1 || st.y0 > y1 + 1) continue;
      const f = lavafallSpan(world, st);
      for (let y = f.y0; y < f.y1; y++) this.fallCells.add(y * world.w + f.x);
      this.lavafallsShown++;
      const left = this.sx(f.x, shakeX);
      const top = this.sy(f.y0, shakeY);
      const rows = (f.y1 - f.y0) * 16 + 2;
      // Warm light on the crag face and the ground around the foot (additive, so it reads at night too).
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.5 + 0.5 * Math.sin(time * 3.1 + f.x);
      ctx.fillStyle = `rgba(255,110,30,${(0.18 + 0.08 * pulse).toFixed(3)})`;
      ctx.fillRect(left - ts, top, ts, (f.y1 - f.y0) * ts);
      const fy = this.sy(f.y1, shakeY);
      const g = ctx.createRadialGradient(left + 5 * u, fy, u, left + 5 * u, fy, ts * 2.2);
      g.addColorStop(0, `rgba(255,150,50,${(0.35 + 0.1 * pulse).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(left - ts * 2, fy - ts * 2.2, ts * 4.5, ts * 3.2);
      ctx.restore();
      // Overflow: a thin skin of lava rolling over the lip into the sheet.
      for (let bx = 4; bx < 16; bx += LAVA_BLOCK) {
        const s = lavaShade((f.x - 1) * 16 + bx, f.y0 * 16, time * 3, false);
        ctx.fillStyle = s === 1 ? '#ff5a1f' : LAVA_SHADES[s];
        ctx.fillRect(left - ts + bx * u, top, LAVA_BLOCK * u, 3 * u);
      }
      // The sheet: base melt, then streaks in whole art px.
      ctx.fillStyle = '#ff5a1f';
      ctx.fillRect(left, top, FALL_W * u, rows * u);
      for (let ay = 0; ay < rows; ay += LAVA_BLOCK) {
        for (let ax = 0; ax < FALL_W; ax++) {
          const s = fallShade(ax, ay, time, FALL_W);
          if (s === 1) continue;
          ctx.fillStyle = s === 0 ? '#a8260e' : LAVA_SHADES[s];
          ctx.fillRect(left + ax * u, top + ay * u, u, LAVA_BLOCK * u);
        }
      }
      // Spatter at the foot: hot droplets hop out of the pool in little arcs.
      for (let k = 0; k < 5; k++) {
        const ph = (time * 1.7 + k * 0.37) % 1;
        const dir = k % 2 === 0 ? 1 : -1;
        const ox = 5 + dir * (2 + k) * ph * 2;
        const oy = -Math.sin(ph * Math.PI) * (4 + k);
        ctx.fillStyle = k === 0 ? '#fff0b0' : '#ffa53a';
        ctx.fillRect(left + Math.round(ox) * u, fy + Math.round(oy) * u, u, u);
      }
      // Embers drift up from the splash and fade.
      for (let k = 0; k < 4; k++) {
        const ph = (time * 0.45 + k * 0.29) % 1;
        const ex = 5 + Math.round(Math.sin(time * 1.3 + k * 2.1) * 4 + (k - 1.5) * 3);
        const ey = -Math.round(ph * 40);
        ctx.fillStyle = `rgba(255,${170 + k * 15},80,${(1 - ph).toFixed(3)})`;
        ctx.fillRect(left + ex * u, fy + ey * u, u, u);
      }
    }
  }

  private drawMagma(ctx: CanvasRenderingContext2D, world: Game['world'], tx: number, ty: number, dx: number, dy: number, ts: number, time: number): void {
    const p = magmaPulse(tx, ty, time);
    const u = ts / 16;
    let depth = 0;
    while (depth < 3 && world.get(tx, ty - depth - 1) === T.MAGMA) depth++;
    this.lavaShown++;
    // Flowing crust: world-space ridged noise, so plates and glowing cracks run across cell edges.
    const surface = depth === 0;
    for (let by = 0; by < 16; by += LAVA_BLOCK) {
      for (let bx = 0; bx < 16; bx += LAVA_BLOCK) {
        const s = lavaShade(tx * 16 + bx, ty * 16 + by, time, surface);
        if (s === 1) continue;
        ctx.fillStyle = LAVA_SHADES[s];
        ctx.fillRect(dx + bx * u, dy + by * u, LAVA_BLOCK * u, LAVA_BLOCK * u);
      }
    }
    const shade = lavaDepthShade(depth);
    if (shade > 0) {
      ctx.fillStyle = `rgba(70,0,0,${shade})`;
      ctx.fillRect(dx, dy, ts, ts);
    }
    if (!surface) return;
    const above = world.get(tx, ty - 1);
    // Rolling crest: the bright surface line rises and falls a pixel.
    const crest = Math.sin(time * 2.4 + tx * 1.3) > 0 ? u : 0;
    ctx.fillStyle = '#fff0b0';
    ctx.fillRect(dx, dy - crest, ts, Math.max(1, u));
    if (above !== T.AIR) return;
    // Heat haze: a faint warm glow one tile tall; the picture above also wobbles (drawShimmer).
    ctx.fillStyle = `rgba(255,140,60,${0.05 + 0.05 * p})`;
    ctx.fillRect(dx, dy - ts, ts, ts);
    this.shimmerCells.push({ tx, ty });
    const b = magmaBubble(tx, ty, time);
    if (b) {
      const bx = dx + b.x * ts;
      if (!b.pop) {
        const r = Math.max(1, b.r * 4 * u);
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(bx - r, dy - r * 0.8, r * 2, r);
        ctx.fillStyle = '#ff8a3a';
        ctx.fillRect(bx - r * 0.4, dy - r * 0.6, r * 0.8, r * 0.4);
      } else {
        const s = (b.k - 0.7) / 0.3;
        ctx.fillStyle = `rgba(255,220,120,${1 - s})`;
        for (const side of [-1, 1]) ctx.fillRect(bx + side * (2 + 5 * s) * u, dy - (2 + 4 * s - 3 * s * s) * u, u * 1.5, u * 1.5);
      }
    }
    const e = magmaEmber(tx, ty, time);
    if (e) {
      ctx.fillStyle = `rgba(255,190,80,${e.a})`;
      ctx.fillRect(dx + e.dx * ts, dy - e.up * ts, u * 1.5, u * 1.5);
    }
  }

  /** Chunk cache: CHUNK x CHUNK tiles pre-drawn at 1x; redrawn only when a tile in or next to it changes. */
  private chunks = new Map<number, HTMLCanvasElement>();
  private chunkWorld: Game['world'] | null = null;
  private chunkSeen = 0;

  private syncChunks(world: Game['world']): void {
    if (this.chunkWorld !== world) {
      this.chunks.clear();
      this.chunkWorld = world;
      this.chunkSeen = world.changes.length;
      return;
    }
    if (world.changesOverflow) {
      world.changesOverflow = false;
      world.changes.length = 0;
      this.chunks.clear();
      return;
    }
    const ch = world.changes;
    for (let k = this.chunkSeen; k < ch.length; k++) {
      const i = ch[k];
      const x = i % world.w;
      const y = Math.floor(i / world.w);
      // Neighbours change autotile edges, leaf masks and AO corners (diagonals), so touch adjacent chunks too.
      for (const [ox, oy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        this.chunks.delete(chunkKey(Math.floor((x + ox) / CHUNK), Math.floor((y + oy) / CHUNK)));
      }
    }
    world.changes.length = 0;
    this.chunkSeen = 0;
    // Bound memory (each chunk is 512x512, ~1 MB): evict chunks far from the camera.
    if (this.chunks.size > MAX_CHUNKS) {
      const ccx = this.camX / CHUNK;
      const ccy = this.camY / CHUNK;
      for (const key of this.chunks.keys()) {
        const kx = key % 4096;
        const ky = Math.floor(key / 4096);
        if (Math.abs(kx + 0.5 - ccx) > 3 || Math.abs(ky + 0.5 - ccy) > 3) this.chunks.delete(key);
      }
    }
  }

  /** Build at most one missing chunk per frame in a one-chunk ring around the view, so walking never stalls. */
  private prefetchChunk(world: Game['world'], cx0: number, cy0: number, cx1: number, cy1: number): void {
    const maxCx = Math.floor((world.w - 1) / CHUNK);
    const maxCy = Math.floor((world.h - 1) / CHUNK);
    for (let cy = Math.max(0, cy0 - 1); cy <= Math.min(maxCy, cy1 + 1); cy++) {
      for (let cx = Math.max(0, cx0 - 1); cx <= Math.min(maxCx, cx1 + 1); cx++) {
        if (!this.chunks.has(chunkKey(cx, cy))) {
          this.chunk(world, cx, cy);
          return;
        }
      }
    }
  }

  private chunk(world: Game['world'], cx: number, cy: number): HTMLCanvasElement {
    const key = chunkKey(cx, cy);
    let c = this.chunks.get(key);
    if (c) return c;
    c = makeCanvas(CHUNK * TS, CHUNK * TS);
    const cctx = c.getContext('2d');
    if (cctx) {
      cctx.imageSmoothingEnabled = false;
      for (let y = 0; y < CHUNK; y++) {
        const ty = cy * CHUNK + y;
        if (ty < 0 || ty >= world.h) continue;
        for (let x = 0; x < CHUNK; x++) {
          const tx = cx * CHUNK + x;
          if (tx < 0 || tx >= world.w) continue;
          this.drawTile(cctx, world, tx, ty, x * TS, y * TS, TS, 1);
        }
      }
    }
    this.chunks.set(key, c);
    return c;
  }

  /** Number of cached chunks (debug/e2e). */
  chunkCount(): number {
    return this.chunks.size;
  }

  private reachable(game: Game, aim: Aim): boolean {
    const dx = aim.tx + 0.5 - game.body.x;
    const dy = aim.ty + 0.5 - (game.body.y - BODY_H / 2);
    return dx * dx + dy * dy <= REACH * REACH;
  }

  /** Sky palette blended from the biomes around the camera, so walking between biomes fades the sky. */
  private skyAt(world: Game['world']): [string, string, string, string] {
    const weights = BIOME_IDS.map(() => 0);
    const cx = Math.floor(this.camX);
    for (let dx = -60; dx <= 60; dx += 6) {
      const x = Math.min(world.w - 1, Math.max(0, cx + dx));
      weights[world.biome[x] ?? 0] += 1 - Math.abs(dx) / 66;
    }
    return blendSky(weights);
  }

  private drawSkyDecor(ctx: CanvasRenderingContext2D, horizon: number, time: number, world: Game['world'], gameTime: number): void {
    const ts = TS * this.scale;
    // Sun by day, moon by night, arcing across the sky with the day phase.
    const ph = dayPhase(gameTime);
    const sh = sunHeight(gameTime);
    const arc = (p: number): number => this.w * (0.1 + 0.8 * ((p % 0.5) / 0.5));
    const body = (x: number, hgt: number, core: string, glow: string, r: number): void => {
      const y = horizon - ts * 2 - hgt * ts * 12;
      const g = ctx.createRadialGradient(x, y, 0, x, y, ts * r * 2.5);
      g.addColorStop(0, glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - ts * r * 2.5, y - ts * r * 2.5, ts * r * 5, ts * r * 5);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, ts * r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    };
    if (sh > -0.2) body(arc(ph), sh, 'rgba(255,214,150,0.95)', 'rgba(255,184,107,0.5)', 2);
    else body(arc(ph - 0.5), -sh, 'rgba(220,230,255,0.9)', 'rgba(160,180,255,0.25)', 1.2);
    // Stars: faint by day, bright at night.
    ctx.fillStyle = `rgba(255,255,255,${(0.15 + 0.75 * (1 - this.day)).toFixed(3)})`;
    for (let i = 0; i < 90; i++) {
      const sx = hash2(i, 1, 9) * this.w;
      const sy = hash2(i, 2, 9) * Math.max(1, horizon - ts * 6);
      if (sy < horizon - ts * 4) ctx.fillRect(sx, sy, this.scale, this.scale);
    }
    // Parallax skyline in two depth layers: a pale far haze, then the near silhouettes.
    this.drawSkyline(ctx, horizon, time, world, 1, mixHex(this.sky[3], this.sky[1], 0.45));
    this.drawSkyline(ctx, horizon, time, world, 0, this.sky[3]);
    this.drawNearLayer(ctx, horizon, world, mixHex(this.sky[3], '#000000', 0.4));
  }

  /** Near foliage silhouettes just above the ground line, scrolling faster than the skyline. */
  private drawNearLayer(ctx: CanvasRenderingContext2D, horizon: number, world: Game['world'], color: string): void {
    const ts = TS * this.scale;
    const { par, spacing: sp } = NEAR_LAYER;
    const left = Math.floor(this.camX * par - this.w / 2 / ts) - 3;
    const right = Math.ceil(this.camX * par + this.w / 2 / ts) + 3;
    const base = horizon + ts * 0.6;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    // A ground band under the clumps, so where the terrain dips below the horizon the
    // backdrop reads as a nearer ridge instead of shapes floating on the sky.
    ctx.fillRect(0, base - 1, this.w, ts * 10);
    for (let i = Math.floor(left / sp); i <= Math.ceil(right / sp); i++) {
      const wx = i * sp;
      const col = Math.min(world.w - 1, Math.max(0, Math.round(this.camX + (wx - this.camX * par))));
      const x0 = this.w / 2 + (wx - this.camX * par) * ts;
      for (const p of nearPieces(i, world.biome[col] ?? 0)) {
        const x = x0 + p.x * ts;
        const pw = p.w * ts;
        const ph = p.h * ts;
        if (p.k === 'hump') {
          ctx.beginPath();
          ctx.ellipse(x + pw / 2, base, pw / 2, ph, 0, Math.PI, 0);
          ctx.fill();
        } else if (p.k === 'spike') {
          ctx.beginPath();
          ctx.moveTo(x, base);
          ctx.lineTo(x + pw * 0.45, base - ph);
          ctx.lineTo(x + pw, base);
          ctx.fill();
        } else if (p.k === 'stalk') {
          // A curved frond or bent rebar.
          ctx.lineWidth = Math.max(1, this.scale * 1.5);
          ctx.beginPath();
          ctx.moveTo(x, base);
          ctx.quadraticCurveTo(x, base - ph, x + ts * 0.6, base - ph * 0.85);
          ctx.stroke();
        } else {
          ctx.fillRect(Math.round(x), Math.round(base - ph), Math.max(1, Math.round(pw)), Math.ceil(ph));
        }
      }
    }
  }

  /** One skyline layer; each silhouette takes the shape of the biome it stands over. */
  private drawSkyline(ctx: CanvasRenderingContext2D, horizon: number, time: number, world: Game['world'], layer: number, color: string): void {
    const ts = TS * this.scale;
    const L = SKYLINE_LAYERS[layer];
    const par = L.par;
    const sp = L.spacing;
    const left = Math.floor(this.camX * par - this.w / 2 / ts) - 3;
    const right = Math.ceil(this.camX * par + this.w / 2 / ts) + 3;
    const base = horizon + ts * 2;
    const far = layer > 0;
    for (let i = Math.floor(left / sp); i <= Math.ceil(right / sp); i++) {
      const wx = i * sp + hash2(i, 3, L.salt) * (sp - 1);
      const col = Math.min(world.w - 1, Math.max(0, Math.round(this.camX + (wx - this.camX * par))));
      const bio = world.biome[col] ?? 0;
      const th = L.minH + Math.floor(hash2(i, 4, L.salt) * L.varH);
      const tw = L.minW + hash2(i, 5, L.salt) * L.varW;
      const x = Math.round(this.w / 2 + (wx - this.camX * par) * ts);
      ctx.fillStyle = color;
      if (bio === B.JUNGLE) {
        // Giant alien trees.
        ctx.fillRect(x + ts * 0.5, base - th * ts, Math.max(2, ts * 0.5), th * ts);
        ctx.beginPath();
        ctx.ellipse(x + ts * 0.75, base - th * ts, ts * (1.6 + tw), ts * (1 + tw * 0.4), 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (bio === B.CRYSTAL || bio === B.FROST || bio === B.ASH) {
        // Spires, mountains or ash cones.
        const half = bio === B.CRYSTAL ? tw * ts * 0.5 : tw * ts * (bio === B.FROST ? 2.4 : 2);
        const peak = bio === B.ASH ? th * 0.6 : th;
        ctx.beginPath();
        ctx.moveTo(x - half, base);
        ctx.lineTo(x + (bio === B.ASH ? -half * 0.25 : 0), base - peak * ts);
        if (bio === B.ASH) ctx.lineTo(x + half * 0.25, base - peak * ts);
        ctx.lineTo(x + half, base);
        ctx.fill();
        if (far) {
          // Haze layer: shapes only.
        } else if (bio === B.FROST) {
          ctx.fillStyle = 'rgba(230,246,255,0.55)';
          ctx.beginPath();
          ctx.moveTo(x - half * 0.25, base - peak * ts * 0.75);
          ctx.lineTo(x, base - peak * ts);
          ctx.lineTo(x + half * 0.25, base - peak * ts * 0.75);
          ctx.fill();
        } else if (bio === B.ASH && Math.floor(time * 2 + i) % 3 !== 0) {
          ctx.fillStyle = 'rgba(255,120,50,0.7)';
          ctx.fillRect(x - half * 0.2, base - peak * ts, half * 0.4, this.scale * 2);
        } else if (bio === B.CRYSTAL) {
          ctx.fillStyle = 'rgba(200,170,255,0.6)';
          ctx.fillRect(x - this.scale, base - peak * ts * 0.7, this.scale * 2, this.scale * 2);
        }
      } else {
        // Ruined towers: setbacks, broken crowns and antennas, with a few lit windows.
        const shape = towerShape(i, layer);
        for (const r of shape.rects) {
          ctx.fillRect(Math.round(x + r.x * ts), Math.round(base - (r.y + r.h) * ts), Math.max(1, Math.round(r.w * ts)), Math.ceil(r.h * ts));
        }
        if (!far) {
          const warm = hash2(i, 6, 5) > 0.5;
          ctx.fillStyle = warm ? 'rgba(232,127,91,0.75)' : 'rgba(54,224,232,0.65)';
          shape.windows.forEach((wn, n) => {
            if (Math.floor(time * 0.5 + i + n * 3) % 7 === 0) return;
            ctx.fillRect(Math.round(x + wn.x * ts), Math.round(base - wn.y * ts), this.scale * 2, this.scale * 2);
          });
        }
      }
    }
  }

  private drawBoss(ctx: CanvasRenderingContext2D, game: Game, shakeX: number, shakeY: number, time: number): void {
    const bs = game.boss;
    if (!bs) return;
    const d = BOSSES[bs.id];
    const ts = TS * this.scale;
    const u = this.scale;
    const cx = this.sx(bs.x, shakeX);
    const by = this.sy(bs.y, shakeY);
    const h = d.h * ts;
    const warn = bs.attack !== null && bs.at < 0;
    const flash = this.reduceFlash ? warn : bs.iframes > 0 || (warn && Math.floor(time * 12) % 2 === 0);
    const lift = !d.flying && bs.attack === 'slam' && bs.at < 0 ? Math.round(-bs.at * 10) : 0;
    const reach = bs.attack === 'charge' && bs.at >= 0 ? 8 : 0;
    drawBossArt(ctx, bs.id, cx, by, u, {
      facing: bs.facing,
      age: bs.age,
      flash,
      lift,
      reach,
      enraged: bossPhase(bs) === 2,
      lookX: game.body.x - bs.x,
      lookY: game.body.y - BODY_H / 2 - (bs.y - d.h / 2),
    });
    if (warn) {
      ctx.fillStyle = '#ffcf4a';
      ctx.font = `bold ${Math.round(u * 10)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, by - h - ts * 0.6);
      if (bs.attack === 'slam') {
        ctx.strokeStyle = 'rgba(255,90,90,0.6)';
        ctx.lineWidth = u * 2;
        ctx.strokeRect(cx - 6 * ts, by - u, 12 * ts, u * 2);
      }
    }
  }

  private drawLadder(ctx: CanvasRenderingContext2D, dx: number, dy: number, ts: number): void {
    const u = ts / 16;
    ctx.fillStyle = '#8a6a36';
    ctx.fillRect(dx + 3 * u, dy, 2 * u, ts);
    ctx.fillRect(dx + 11 * u, dy, 2 * u, ts);
    ctx.fillStyle = '#c9a35a';
    for (let r = 2; r < 16; r += 5) ctx.fillRect(dx + 3 * u, dy + r * u, 10 * u, 2 * u);
  }

  /** Lift shaft (cached): dark guide channel with two metal rails and rivets. */
  private drawLiftShaft(ctx: CanvasRenderingContext2D, dx: number, dy: number, ts: number): void {
    const u = ts / 16;
    ctx.fillStyle = 'rgba(20,24,34,0.55)';
    ctx.fillRect(dx + 3 * u, dy, 10 * u, ts);
    ctx.fillStyle = '#55627a';
    ctx.fillRect(dx + u, dy, 2 * u, ts);
    ctx.fillRect(dx + 13 * u, dy, 2 * u, ts);
    ctx.fillStyle = '#9fb0c8';
    ctx.fillRect(dx + u, dy, u, ts);
    ctx.fillRect(dx + 13 * u, dy, u, ts);
    ctx.fillStyle = '#c9d4e8';
    ctx.fillRect(dx + 2 * u, dy + 3 * u, u, u);
    ctx.fillRect(dx + 13 * u, dy + 11 * u, u, u);
  }

  /** Lift shaft (per frame): cyan chevrons drifting upward so the shaft reads as powered. */
  private drawLiftGlow(ctx: CanvasRenderingContext2D, dx: number, dy: number, ts: number, time: number, ty: number): void {
    const u = ts / 16;
    const off = ((time * 10 + ty * 16) % 16 + 16) % 16;
    ctx.fillStyle = 'rgba(90,216,255,0.75)';
    for (const base of [0, 8]) {
      const cy = (((base - off) % 16) + 16) % 16;
      ctx.fillRect(dx + 7 * u, dy + cy * u, 2 * u, u);
      if (cy + 1 < 16) {
        ctx.fillRect(dx + 5 * u, dy + (cy + 1) * u, 2 * u, u);
        ctx.fillRect(dx + 9 * u, dy + (cy + 1) * u, 2 * u, u);
      }
    }
  }

  /**
   * Window (per frame): metal frame and cross bar over a pane that shows the sky colour by day
   * and glows warm at night, like a lit home seen from outside. Underground it is dark glass.
   */
  private drawWindow(ctx: CanvasRenderingContext2D, world: Game['world'], tx: number, ty: number, dx: number, dy: number, ts: number, time: number): void {
    const u = ts / 16;
    const above = ty < (world.surface[tx] ?? 0) + 2;
    const night = Math.max(0, Math.min(1, (0.6 - this.day) / 0.4));
    const pane = above ? mixHex(this.sky[1], '#ffc46e', night * 0.85) : '#1c2a3a';
    ctx.fillStyle = '#55627a';
    ctx.fillRect(dx, dy, ts, ts);
    ctx.fillStyle = pane;
    ctx.fillRect(dx + 2 * u, dy + 2 * u, 12 * u, 12 * u);
    // Glint: two diagonal streaks that slide across slowly.
    const g = Math.floor(((time * 0.6 + tx * 0.37) % 1) * 12);
    ctx.fillStyle = `rgba(255,255,255,${(0.18 + 0.12 * (1 - night)).toFixed(3)})`;
    for (let i = 0; i < 4; i++) {
      const gx = 2 + ((g + i) % 12);
      const gy = 2 + ((9 - i + 12) % 12);
      ctx.fillRect(dx + gx * u, dy + gy * u, u, u);
    }
    ctx.fillStyle = '#8794a8';
    ctx.fillRect(dx + 7.5 * u, dy + 2 * u, u, 12 * u);
    ctx.fillRect(dx + 2 * u, dy + 7.5 * u, 12 * u, u);
    ctx.fillStyle = '#9fb0c8';
    ctx.fillRect(dx, dy, ts, u);
    ctx.fillStyle = '#2a3346';
    ctx.fillRect(dx, dy + 15 * u, ts, u);
  }

  private drawTorch(ctx: CanvasRenderingContext2D, dx: number, dy: number, ts: number, t: number): void {
    const u = ts / 16;
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(dx + 7 * u, dy + 7 * u, 2 * u, 8 * u);
    ctx.fillStyle = Math.floor(t * 8) % 2 === 0 ? '#ffd24a' : '#ff9a3c';
    ctx.fillRect(dx + 6 * u, dy + 3 * u, 4 * u, 5 * u);
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(dx + 7 * u, dy + 5 * u, 2 * u, 2 * u);
  }

  /** Flood-fill light map for the visible region (plus a margin so off-screen torches still reach in). */
  private lightKey = '';
  private light: LightGrid | null = null;
  private lightCanvas: HTMLCanvasElement | null = null;
  private rims: Rim[] = [];
  /** Rims drawn last frame (e2e reads it to check caves get a rim and open sky does not). */
  lastRimCount = 0;

  /** Thin warm highlights on lit cave faces, 1 art px thick. */
  private drawRims(ctx: CanvasRenderingContext2D, shakeX: number, shakeY: number): void {
    const u = this.scale;
    const ts = TS * u;
    let n = 0;
    for (const r of this.rims) {
      const x = this.sx(r.x, shakeX);
      const y = this.sy(r.y, shakeY);
      if (x < -ts || y < -ts || x > this.w || y > this.h) continue;
      ctx.fillStyle = `rgba(255,228,184,${r.alpha.toFixed(3)})`;
      // Inset 1 art px only at a real corner, so a long wall reads as one continuous edge.
      const a = r.joinA ? 0 : u;
      const len = ts - a - (r.joinB ? 0 : u);
      if (r.side === 0) ctx.fillRect(x + a, y, len, u);
      else if (r.side === 2) ctx.fillRect(x + a, y + ts - u, len, u);
      else if (r.side === 1) ctx.fillRect(x + ts - u, y + a, u, len);
      else ctx.fillRect(x, y + a, u, len);
      n++;
    }
    this.lastRimCount = n;
  }

  /** Current light level at a tile (debug/e2e). */
  lightLevel(tx: number, ty: number): number {
    return this.light ? levelAt(this.light, tx, ty) : -1;
  }

  private drawDarkness(ctx: CanvasRenderingContext2D, game: Game, _cx: number, _cy: number, time: number, shakeX = 0, shakeY = 0): void {
    const world = game.world;
    const ts = TS * this.scale;
    const margin = Math.ceil(LEVEL_CAP / AIR_COST / 2);
    const x0 = Math.floor(this.camX - this.w / 2 / ts) - margin;
    const y0 = Math.floor(this.camY - this.h / 2 / ts) - margin;
    const lw = Math.ceil(this.w / ts) + margin * 2 + 2;
    const lh = Math.ceil(this.h / ts) + margin * 2 + 2;
    const b = game.body;
    const ptx = Math.floor(b.x);
    const pty = Math.floor(b.y - BODY_H / 2);
    const lampR = game.derived.lampRadius;
    // Night dims the open sky (but keeps it readable); steps of 4 levels so the cache is not rebuilt every frame.
    const skyLevel = Math.round((SKY_LEVEL * (0.45 + 0.55 * daylight(game.time) * weatherLight(game.weather))) / 4) * 4;
    const key = `${x0},${y0},${lw},${lh},${ptx},${pty},${lampR},${world.version},${world.torches.size},${skyLevel}`;
    if (key !== this.lightKey || !this.light) {
      this.lightKey = key;
      const sources = frameSources(world.torches, world.w, { x: ptx, y: pty, radius: lampR }, { x: world.padX, y: world.padY });
      // Crystals and cave mushrooms glow faintly, so deep caves have landmarks.
      for (let yy = Math.max(0, y0); yy < Math.min(world.h, y0 + lh); yy++) {
        for (let xx = Math.max(0, x0); xx < Math.min(world.w, x0 + lw); xx++) {
          const tt = world.tiles[yy * world.w + xx];
          if (tt === T.TERMINAL) sources.push({ x: xx, y: yy, level: 22 });
          else if ((tt === T.GATE || tt === T.CIRCUIT_ORE || tt === T.PLASMA_ORE || tt === T.CORE_ORE) && !world.isSolid(xx, yy - 1)) sources.push({ x: xx, y: yy, level: tt === T.GATE ? 16 : 12 });
          else if (tt === T.ACID_POOL && world.get(xx, yy - 1) !== T.ACID_POOL) sources.push({ x: xx, y: yy, level: 14 });
          else if (tt === T.MAGMA && world.get(xx, yy - 1) !== T.MAGMA) sources.push({ x: xx, y: yy, level: 28 });
          else if (tt === T.AIR && this.fallCells.has(yy * world.w + xx)) sources.push({ x: xx, y: yy, level: 24 });
          else if (tt === T.CRYSTAL && !world.isSolid(xx, yy - 1) || tt === T.CRYSTAL && !world.isSolid(xx, yy + 1)) sources.push({ x: xx, y: yy, level: 18 });
          else if (tt === T.PLANT && yy > world.surface[xx] + 1) sources.push({ x: xx, y: yy, level: 14 });
        }
      }
      this.light = computeLight(world, x0, y0, lw, lh, sources, skyLevel);
      // Faces of cave rock toward lit air get a thin warm rim, strongest toward the lamp (3D read in caves).
      this.rims = computeRims(world, this.light, x0 + margin, y0 + margin, lw - margin * 2, lh - margin * 2, b.x, b.y - BODY_H / 2);
      if (!this.lightCanvas || this.lightCanvas.width !== lw || this.lightCanvas.height !== lh) this.lightCanvas = makeCanvas(lw, lh);
      const lctx = this.lightCanvas.getContext('2d');
      if (lctx) {
        const img = lctx.createImageData(lw, lh);
        const lv = this.light.levels;
        for (let k = 0; k < lv.length; k++) {
          img.data[k * 4] = 5;
          img.data[k * 4 + 1] = 4;
          img.data[k * 4 + 2] = 10;
          img.data[k * 4 + 3] = Math.round(255 * DARK_MAX * (1 - brightness(lv[k])));
        }
        lctx.putImageData(img, 0, 0);
      }
    }
    if (this.lightCanvas) {
      // One pixel per tile, scaled with smoothing: per-tile light with soft interpolation between tiles.
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.lightCanvas, 0, 0, lw, lh, this.sx(x0, 0), this.sy(y0, 0), lw * ts, lh * ts);
      ctx.imageSmoothingEnabled = false;
    }
    this.drawRims(ctx, shakeX, shakeY);
    const low = game.battery / game.derived.maxBattery;
    if (low < 0.2 && !game.isAtBase()) {
      const pulse = 0.12 + 0.1 * Math.sin(time * 6);
      const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.3, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.7);
      g.addColorStop(0, 'rgba(255,40,40,0)');
      g.addColorStop(1, `rgba(255,40,40,${pulse + (low === 0 ? 0.2 : 0)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }
}

export { TILE_COLORS };
