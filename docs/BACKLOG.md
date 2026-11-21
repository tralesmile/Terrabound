# Backlog (ordered; work top to bottom; tick when `npm run check` is green and pushed)

Rule: ship small vertical slices. Each item needs tests. Keep the game playable at all times.

## P12 GROWTH ROADMAP (OWNER PRIORITY 2026-11-18: work this section FIRST, top to bottom, before any older unchecked item below)

Owner goal: make Terrabound feel closer to Terraria, Starbound and Core Keeper (richer graphics, better physics and feel, more to do and build, a bigger world, a story) WITHOUT changing the core idea. Research notes and sources: `docs/RESEARCH.md`.

**Core idea guard (never break):** short dives on a battery clock, bank loot at the pad before the battery dies, upgrade the suit, build drones and automation at the base, survive the Hollow. Free to play, no dark patterns, tiny bundle, deterministic sim. Every item must deepen this loop. If an item would replace or dilute it, do not build it: write the question in `docs/NEEDS_FROM_USER.md` instead.

**Slice rule:** each checkbox is one run-sized slice (tests plus a screenshot check; save changes follow the SAVE_VERSION rule). If an item is too big, split it into sub-bullets right here and tick as you go. Pick the order by player impact: A (feel) first because it improves everything else, then B, E, F, C, D, G. Tick an item only after `npm run ship` is green.

### P12-A Feel and physics

- [x] Movement model v2 (run 81, `src/sim/movement.ts`; tuning table `MOVE`): ground and air acceleration and friction instead of instant speed; all constants in one tuning table; tests for top speed, stop distance and turn-around; keep coyote time and jump buffer.
- [x] Jump feel (run 82, `JUMPFEEL` + `gravityMul` in movement.ts): apex hang (reduced gravity near the apex), fast-fall when holding down, jump cut on release; measure the apex in a test (see LESSONS: derive geometry from the measured apex).
- [x] (run 83, `src/sim/teach.ts`, save v31 `met`) (run 82 research) Enemy attack-pattern teaching: each new enemy shows its pattern in a safe first encounter (telegraph plus a harmless first use), cheap and fits P12-B.
- [x] (run 83: take-off stretch, camera look-ahead and fall lead in `src/render/camlead.ts`; landing squash and dust already existed) Landing and run juice: squash and stretch on jump and land (render-only), dust puffs, camera look-ahead and a small vertical lead when falling.
- [x] (run 83: per-class `HIT_FEEL` table in `src/sim/hitfeel.ts`, trauma-squared smooth shake in `src/render/trauma.ts`, OS reduce-motion caps shake; whole-sim hit-stop, knockback decay, flash and damage numbers already existed) Hit feel stack: hit-stop that freezes BOTH attacker and target, trauma-based screen shake that stacks and respects the shake setting and reduced motion, short-decay knockback, white flash, damage numbers; per-weapon-class tuning table.
- [x] (run 83: Frost hulk telegraphed ground slam with a rear-up pose, mite crouch, music dip on every boss warning in `src/platform/duck.ts`; boss wind-up poses already existed in bosstele) Anticipation: enemy and boss wind-up poses plus a brief audio dip before heavy attacks (the 0.4 s telegraph rule stays).
- [x] (run 83: `src/render/digfx.ts`, `src/platform/digvoice.ts`) Dig feedback: crack stages on the block being mined, debris chips (render-only), per-material dig sounds with pitch variation.
- [x] Drill heat or overdrive meter (split from dig feedback in run 83): holding the drill builds heat that tints the beam; an overdrive burst digs faster but drains battery; must deepen the battery-clock decision, not add a second bar to babysit.
- [x] (run 83, `src/sim/drilltier.ts`: ores only, rock never gated) Dig-power tiers: harder blocks need a better drill; the tile tip says "needs drill Lv N"; no luck gating.
- [x] (run 83, `src/sim/falling.ts`) Falling blocks: crystal sand and ash wobble 0.45 s when undermined, drop, pile up and cascade; one landing on the player does 8 damage and breaks into a pickup; deterministic tests.
- [ ] Telegraphed ceiling collapse in deep layers (split from falling blocks in run 83): rubble tiles in Plasma and Core ceilings that shake, drop dust, then fall (dodgeable); reuse `falling.ts`.
- [ ] Liquids v2 (build on `liquids.ts`): flow and pressure rules, lava plus water makes obsidian, swimming buoyancy, an oxygen drain that uses the battery clock instead of a new bar.
- [x] (run 83, `src/sim/blastjump.ts`: your own bomb launches you and never hurts you) Explosives: blast jump.
- [ ] Explosives part 2 (split in run 83): craftable placed charge, chain reactions, block damage radius; deterministic.
- [ ] Traversal tools: grapple hook or rope swing, wall-slide and wall-jump (boots or module), jetpack fuel tied to the battery, rails or ziplines between base points.
- [x] (run 83, `src/platform/haptics.ts`, VIBRATION setting, save v32) Mobile feel: haptics (`navigator.vibrate`) for hit, break and bank behind a setting.
- [ ] Mobile feel part 2 (split in run 83): auto-aim tuning for touch digging and combat; one-hand layout.
- [ ] Gamepad support (also listed in P5): aim stick for digging, radial hotbar.

### P12-B Enemies, bosses and biomes (more to fight)

- [ ] Enemy roster from 6 to about 30, 4-6 per run, at least 5 per biome with distinct behaviours: burrower (tunnels through blocks), sniper (telegraphed beam), swarm, shielded (hit the back), leaper, bomber, mimic chest, spawner nest (destroy it). Each needs a sprite, sound, drop, codex entry and a spawn-rule test.
- [ ] Elite variants: rare, glowing, one modifier, better drop, odds shown to the player.
- [ ] One optional repeatable mini-boss per biome between the 7 main bosses (cosmetic trophy).
- [ ] World events: Hollow Surge (drone wave at night), acid rain, magnetic storm (extra battery drain), solar flare; telegraphed in the HUD, never mandatory to survive by skipping a dive.
- [ ] New biomes, one per 2-3 runs, each with its own mechanic, palette ramp, music mood, hazard and boss hint: Flooded Ruins (liquids and pressure), Fungal Caverns (spores, light, bounce), Dune Sea (sand, buried vaults, sandworm), Corrupted Zone (a "Hollow bloom" that spreads until machines clean it), Orbital Wreck (low gravity).
- [ ] "Reboot Phase" world change after a key boss (Terraria hardmode idea): new ores, enemies and events, tinted surface; opt-in with a confirmation.
- [ ] Weapon classes: summoner drone weapons, tech (mines, turrets), thrown, shield and parry; target 30+ weapons (modifiers already exist) with a distinct feel each.
- [ ] Gear tiers Mk II and Mk III so variety exists at every layer (Core Keeper players complain about thin weapon and armour variety).

### P12-C Build and automate (more to do and build)

- [ ] Furniture and decor sets plus a room quality score with a visible checklist that decides which robot moves in (`rooms.ts`).
- [ ] Wiring and logic: switch, pressure plate, timer, AND/OR gate, signal lamp, door, trap; extends `lasergrid` and `power`.
- [ ] Logistics (conveyors, sorters, depots) ONLY if it adds real decisions (placement, throughput, defence, drone hauling). Earlier runs dropped conveyors because the stash is shared; revisit only with that test in mind, otherwise skip.
- [ ] Drone programming v2: more conditions and actions, builder and farmer drones, path visualisation, copy-paste blueprints of a base section.
- [ ] Defence: turrets, shield domes, walls with HP, raid waves that threaten automation (`raids.ts`, `defences.ts`), tied to Hollow Surge. This is the "survive" pillar.
- [ ] Farming and fishing expansion: crop tiers, cooking buffs (battery, dig speed), rods, aquarium decor.
- [ ] Pets and mounts: hover-bike and walker mounts (garage exists), pet abilities.
- [ ] Creative sandbox mode (P4) with unlimited items, plus a photo mode.
- [ ] Tech tree (P3) as visible research goals; blueprints found in dives.

### P12-D Bigger world and depth

- [ ] More layers: 5 Abyss and 6 Orbit or Void, table-driven in `layers.ts`, with tile sets, hazards, enemies and a boss.
- [ ] Planets: a launch pad to seeded planets (Starbound style), each with a biome mix and a gravity or atmosphere modifier; reuse worldgen and `seedcode`; unlocks tied to story acts; generation stays cheap.
- [ ] Structure variety: crashed ships, buried cities, vault puzzles with keys, mini-dungeons, secret rooms, lore arenas.
- [ ] Underground rail or tunnel network for fast travel, plus map waypoints and beacon fast travel (P1.7 follow-up).
- [ ] Expand the sky layer: more floating islands and a sky boss.
- [ ] BIGGER WORLD+ (2800 to about 4200 wide) with a chunk-cache perf test and an automatic low-end mode.
- [ ] Anti-bland worldgen (Starbound lesson: a palette swap is not a biome): every biome and planet gets landmark structures and one unique mechanic.

### P12-E Story (write `docs/STORY.md` first, then wire it in)

Seed premise to refine, not to rewrite: you are a repair technician in a suit on the dead machine-planet. The Hollow AI was built to restore the world and got stuck in a loop, rebuilding the same dead machines. The bosses are its corrupted subsystems, the base robots (the 4 NPCs and Dex) are repaired survivors, the 12 lore logs are what happened. Acts follow the layers: I Scrap (Junk Colossus, the mystery), II the biome subsystems (Vine Queen, Crystal Golem, Ash Wyrm, Frost Titan), III Circuit (Logic Warden), IV Core (The Hollow AI). Final choice: Reboot (restore the world), Merge (join the AI) or Shutdown (end the loop, the planet stays quiet).

- [ ] Write `docs/STORY.md`: premise, cast, acts mapped to layers and bosses, reveals, three endings, tone, rules (max two lines per delivery, no walls of text, skippable); reuse the existing logs, robots and Dex.
- [x] Objective tracker in the HUD ("what next?") and Guide hints; fixes the weak-tutorial complaint players have about Starbound; ties into FTUE.
- [ ] Quest log and 3 short quest lines per robot, rewarded from the stash, never timed.
- [ ] Act beats: two-line boss intro and outro cards; Hollow AI radio transmissions that change as it is weakened; ruins and logs placed by act.
- [ ] Three endings at the Hollow AI, credits, then New Game+ "Loop N" with mutators and carry-over cosmetics (no power gating).
- [ ] Lore expansion from 12 to about 40 logs across the acts, with synthesised voice bleeps.

### P12-F Graphics and audio (code-drawn art stays the default until the owner approves assets; see NEEDS_FROM_USER "Art source")

- [ ] Tile variation: 3-4 hash-picked variants per block plus rare decals (cracks, moss, ore veins) so big areas do not tile.
- [ ] Animated tiles: lava and water surfaces, pulsing glow ores, idle machine animations, grass and plant sway in wind.
- [ ] (2026-11-18 research: additive radial light sprites over a dark overlay, dithered falloff) Coloured dynamic lights with a bloom approximation (additive pass) and heat haze near lava; stay inside the 60 fps budget on a mid-range 2019 phone.
- [ ] Optional WebGL post-process pass (bloom, vignette, per-biome colour grade) with a canvas fallback and a bundle-size check.
- [ ] Depth and atmosphere: 4 parallax layers per biome, depth fog, weather particles (rain, ash, snow, spores).
- [ ] Character and enemy animation: 8-frame run, anticipation and follow-through, visible gear layers (helmet, backpack, weapon), idle variants.
- [ ] Palette and dither audit against `docs/ART.md`; review the 4x sprite gallery every time art changes.
- [ ] Boss presentation: bigger arenas, intro zoom, visual change per phase, one screenshot per boss.
- [ ] UI polish: one panel style, icon set, damage number styles, colour-blind safe ore silhouettes.
- [ ] Adaptive music: layered stems per depth and boss, stingers, pitch-varied SFX, positional panning.

### P12-G Retention, community and longevity

- [ ] First 10 minutes: finish FTUE, tie in the Guide, and add a local D1/D7/D30 funnel (opt-in, no sending without consent).
- [ ] Weekly mutators and seasonal Hollow events; no FOMO, nothing lost by skipping.
- [ ] Anti-grind audit: every drop has a visible pity counter or a deterministic source (Terraria's top complaint is low drop rates and grind); report the audit in PROGRESS.
- [ ] Content packs: load tiles, items and enemies from validated JSON so the community can add content (the lesson of Terraria's long life with tModLoader).
- [ ] Share tools: photo mode, seed cards, daily leaderboard (leaderboard needs an owner decision).
- [ ] Co-op (2-4 players, host-authoritative, deterministic sim) after a research spike; behind a feature flag.
- [ ] Accessibility pass and localization (P5).
- [ ] Steam and Steam Deck page once stable (needs the owner).

### P12-H Discovered by research (runs append here; one line each, dated, with the reason; promote into A-G when ready)

- [ ] 2026-11-18: Core Keeper added automation and new biomes in its 2026 update, so our drone automation must stay the differentiator: make drones visible, programmable and fun to watch (Dome Keeper lesson: systems that feed into one another).
- [ ] 2026-11-20 (run 83): Core Keeper's top refund-risk complaint is "no tutorial" and its first-2-hour reviews are the least positive; promote the P12-E objective tracker ahead of other E items.
- [ ] 2026-11-20 (run 83): Dome Keeper players tire of repetition and few unlocks; keep a steady drip of cosmetic suit and helmet paints tied to milestones (no power, no paywall).
- [ ] 2026-11-18: Mobile D30 retention is about 3 percent on average; D30 killers are progression walls and content droughts. Keep a smooth ramp and a steady stream of small unlocks.

## P0 Foundation (done)

- [x] Repo scaffold: TypeScript strict, Vite, Vitest, Playwright e2e with system Chrome, CI workflows
- [x] Deterministic sim: seeded world generation, tile and item tables
- [x] Player physics (AABB, coyote time, jump buffer, variable jump, fall damage)
- [x] Mining, pack capacity, placing blocks, battery clock, base banking, death rules
- [x] Upgrades (battery, drill, pack, boots, plating) and workshop UI
- [x] Save system (versioned, sanitized, crash-safe), settings persistence
- [x] Procedural art, particles, lighting, parallax sky; synthesised SFX
- [x] Keyboard, mouse and touch input; responsive HUD; title screen
- [x] 21 unit tests and 16 browser checks

## P1 Combat and survival (M1)

- [x] Tool and weapon slots: hotbar with Drill, Blade, Pistol, Rust, Metal; click uses the selected tool; touch quick-slots (tap hotbar; keys 1-3 tools, 4-5 blocks, Q cycles)
- [x] Enemy framework (data-driven, deterministic AI with seeded RNG): Crawler (ground patrol), Flyer (sine hover); knockback, contact damage, i-frames, death drops (src/sim/enemies.ts)
- [x] Energy blade (Q toggles drill/blade; arc swing, damage numbers)
- [x] Pulse pistol (projectile with sweep collision); hit-stop
- [x] Enemy spawning by depth (never inside walls or near the player; 25-seed test)
- [x] Spawning also by light level (enemies refuse to spawn where torch light > 0.3)
- [x] Hazards: acid drips (telegraphed), falling debris (telegraphed, dodgeable), gas pockets (src/sim/hazards.ts)
- [x] Torches (craftable, placeable, minable, light pushes back darkness)
- [x] Suit lamp upgrade (4 levels, +1.5 tiles of light)
- [x] Crafting at the base Fabricator: recipes table (src/sim/recipes.ts), UI rows in the workshop; torch done
- [x] More recipes: scaffold, ladder (plate deferred: metal already drops from tiles; revisit with smelter in P2)
- [x] Scaffold and ladder placement and climbing physics (jump climbs, S/Down or stick-down descends, cling otherwise; keys 7/8 select)
- [x] Simulated-player balance test for the Scrap layer (tests/balance.test.ts; first upgrade within 4 dives on >=50% of seeds for a dumb bot, deaths <25%)

## P1.5 World and art overhaul

Owner decision 2026-11-10: one persistent world until death (done, save v5). NEW WORLD in the workshop abandons it on purpose.
 (OWNER PRIORITY 2026-11-10: do this before anything else)

Owner feedback after playing: the game works and sounds good, but the map is too small, the graphics are bad (player and enemies especially) and the world feels blank. Goal: Terraria-level richness with our own identity (dead machine-planet "the Hollow", drones, battery clock). Each item is a vertical slice with tests; review the screenshots after every visual change and add a sprite-gallery screenshot (`?e2e=1&gallery=1`) so every sprite is reviewed at 4x.

Art (do first, biggest visible win):
- [x] Art quality bar: write `docs/ART.md` (palette ramps of 4-5 shades per material, 1 px dark outline on characters, top-left light, dithering rules, silhouette-first). Add a gallery screen that draws every tile, item, character and enemy at 4x, captured by e2e.
- [x] Player rig (16x24 sprite, idle bob, 4-frame run, jump, fall, climb, swing arm, hurt flash, suit tier colour by armor level): 16x24 px, separate head/helmet with glowing visor, torso, backpack with battery light, arms, legs; animations idle (breathing), run (6 frames), jump, fall, dig/swing, hurt flash, climb. Facing flip. Suit colour shows upgrade tier.
- [x] Enemies redrawn (4-step crawler scuttle, 3-frame rotor flyer with blinking eye, hit flash, shatter death burst) with distinct silhouettes and 2-4 frame animations: Crawler (scrap-beetle with legs, glowing eye), Flyer (rotor drone with blinking light); hit flash and death burst.
- [x] Tiles: autotiling (edge and corner variants via 4-neighbour mask) so blocks have rounded, outlined edges; per-material texture detail (rivets on metal, flakes on rust, glints on ore); grass/moss tops on surface blocks.
- [x] Back-wall layer (save v3; nothing spawns in front of built walls): separate `walls` array in World; caves show darker dug-out walls behind, so underground is never flat black. Player-placed walls move to this layer.
- [x] Terraria-style tile light map (flood-fill light from sky, torches, lamp, glowing ores) replacing the radial gradient; smooth per-tile interpolation; cached and only recomputed near changes.
- [x] Day/night cycle (src/sim/daynight.ts): 10-minute day, night sky palette, sun and moon, dimmer sky light, drone wisps hunt the surface at night beyond 30 columns of the pad.
- [x] Parallax backgrounds per biome: skyline silhouettes per biome (towers, giant trees, spires, mountains, ash cones), sky palette blends, far haze layer (run 12), near foliage layer at parallax 0.8 with a ridge band (run 13, `nearPieces` in decor.ts).

World size and variety:
- [x] Bigger world: 1400 x 420 tiles (chosen over 1600x600 to keep worldgen ~100 ms and tests fast) (wide surface to explore, deep layers). Chunked render cache (32x32 tile chunks pre-drawn to offscreen canvases, redraw only dirty chunks); keep 60 fps and memory budget; perf test in e2e. Save format unaffected (world regenerates from seed; only diffs near the base persist).
- [x] Surface biomes left/right of the pad (data table in `src/sim/biomes.ts`): Rust Wastes (start), Overgrown Ruins (alien jungle), Crystal Flats, Ash Dunes, Frozen Spires. Each: tiles, colours, background, ores, enemies, music mood.
- [x] Trees and plants (canopy, pine, spire, wire, dead shapes; felling yields biomass; bio torch recipe): alien trees of 3-4 shapes per biome (choppable for `biomass`, new item used in recipes), grass, bushes, flowers, mushrooms, vines in caves; decorative but harvestable.
- [x] Surface structures (ruins, radio towers, crashed ships with chests; see src/sim/structures.ts): ruined buildings, crashed ships, radio towers, abandoned outposts with loot chests (seeded loot tables, no paid randomness). At least 1 structure every ~60 tiles.
- [x] Underground cave biomes: glowing mushroom patches, crystal-lined caverns, deep big caverns, flooded tunnels and acid pools, magma pockets (run 12), iron seams and copper veins, water cooling magma into basalt T.BASALT (run 13).
- [x] Underground points of interest: sealed vaults, crystal geodes, data shrines (12 lore logs) and drone wrecks.
- [x] Biome-specific enemies: vine stalker, shard mite (hops), ember wisp, frost hulk. (Music mood per biome moves to P5 music.)
- [x] Persistent world until death: edits + explored map in save v5 (src/sim/persist.ts), two-tap NEW WORLD.
- [x] Liquids v1: coolant water and acid pools (src/sim/liquids.ts), flooded cave basins, swimming, acid damage, plug with blocks. Todo later: lava/plasma, pumps (P2), pre-settled pools at worldgen.
- [x] Map screen (M; mute moved to N and the HUD button), plus surface recall (R / HOME button, 2.5 s, cancelled by moving or damage): explored-area minimap with fog of war, pins for chests and pad.
- [x] Exploration rewards: 10 codex entries (biomes + structure kinds) with one-time stash rewards, save v4. (Explorer achievements move to P4 achievements.)
- [x] Simulated-player test (tests/biomes.test.ts over 8 seeds): biomes, structures and chests appear within the expected distances on 25 seeds; no structure overlaps the pad.

## P1.6 Owner requests 2026-11-11 (done in an interactive session)

- [x] Inventory screen (I / Tab / bag slot) with the character in gear, tools, pack grid, EAT / HOLD / DROP
- [x] Pixel icons for every item and tool (src/render/icons.ts); hotbar uses them; visible gear and held tool on the character
- [x] Tool switching: 1-4, Q, mouse wheel; fishing rod as tool 4
- [x] Chests open as containers (click / E): take, take all, store, pick up; storage chest item; contents persist (save v8)
- [x] Ground pickups (src/sim/drops.ts): enemy loot, overflow, dropped items
- [x] Seeds from felled trees; planting on soil grows trees (saplings persist)
- [x] Fishing (src/sim/fishing.ts) at surface ponds; fish heal when eaten
- [x] Floating sky islands with a rich chest; surface ponds (codex now 14 entries)
- [x] Ice fishing in the Frozen Spires (frozen ponds, icefin) and jump pads (a way up to sky islands) (run 45); crops and farming done earlier (farming.ts)
- [x] Arrangeable build bar: < / > in the inventory with a bar preview strip, order saved (save v27) (run 47)
- [x] Keys 6-0 and - pick arranged bar slots 1-6 (key hints on the slots); touch long-press on a bar slot opens its item actions (run 48)
- [x] Follow-ups: gear/armor as real equippable items (P3 equipment slots; accessories run 58)

## P1.11 Owner feedback 2026-11-13 (done 2026-11-13)

- [x] Fractional liquid levels (water, acid, lava): pools level out, smooth surfaces, falls drawn as streams
- [x] Water and lava art pass (depth gradient, dapples, level crest, glowing lava ropes, lavafall edges and halo, every lava cell glows)
- [x] Pet redesign: pixel-art sprites with animation for scout bot, glow moth and spark pup
- [x] Hover tooltips for item cells everywhere and for items on the ground
- [x] Bigger world: 2800 x 480 for new worlds (old saves keep 1400 x 420), 1.5x wider biome bands, worldgen 1.7x faster (noiseGrid)
- [x] Hover tooltips for world blocks and machines (0.5 s dwell, dig time + drop), splash where a stream lands in a pool (run 54)
- [x] "Start a bigger world" offer for legacy saves: load toast, BIGGER WORLD workshop button, size in the footer (run 56)
- [x] Lava scene profiling: re-measured run 59, lava 9.1 ms vs 8.7 ms plain (median of 3 alternations) after the shimmer snapshot and floor memo fixes; no hotspot left (the e2e probe still guards it)

## P1.10 Owner request 2026-11-12: better driving and swimming graphics, lava (done 2026-11-12)

- [x] Swim pose: head-first tilt toward the swim direction, flutter kick, stroking arm, tread water, surface ripples
- [x] Vehicles: seated pilot on hoverbike and Sky Jet, slope tilt and climb pitch, landing suspension squash, wheel dust, exhaust, drill sparks, hover motes, jet contrail
- [x] Lava: two basalt-lined surface lava pools per Ash Dunes band (codex: Lava pool), lava basins in the caves under the Ash Dunes
- [x] Heat shimmer and flowing crust on lava (run 36, src/render/lavafx.ts); wheel and tread frames follow the distance rolled (run 36)
- [x] Lavafalls: a basalt crag per Ash band pours a burning sheet into a catch pool (codex: Lavafall); pets paddle, lean and bubble when they follow the player into water (run 37)
- [x] Lava contact juice (hop, sizzle, charred suit with embers and smoke), Ash Dunes surface variety (drift caps, clustered glowing crust cracks), e2e frame-time probe over lava (found and fixed an 18 ms shimmer) (run 38)
- [x] Ruin weathering (cracked bricks, soot, vines/icicles, stained old plates), cinder cones with smoking craters (codex: Cinder cone), frame-time probes for a boss fight and a dust storm (run 39)
- [x] Cone eruptions (rumble telegraph, lava bombs that burn and knock back, never break blocks); discovery + codex gift + award fold into one toast pill (run 40)
- [x] Half-tile slope caps on one-tile staircase corners (render), auto-step over one-tile ledges (sim, eased), codex field-guide notes for every place incl. cone eruptions (run 41)
- [x] Walkers auto-step one-tile ledges and walk down one-tile drops (pets fly, nothing to do); slim one-row goal card; cave-ceiling slope caps; natural Scrap-layer metal slopes (player-placed blocks stay square) (run 42)
- [x] Icon HUD (square glyph buttons, two wide, key hints, 44 px touch), longer lore logs (2-3 more lines each in the reader), the player's feet follow slope-cap diagonals (render-only sink) (run 43)
- [x] Per-layer cave back walls (circuit mesh, plasma basalt, core obsidian), enemies follow slope diagonals, desktop hover labels for HUD glyphs, lore logs in story order by depth, red hurt-flash tint (run 44)
- [x] Junk Colossus art pass: junk fists, arms overhead on the slam wind-up, swinging hip plate, chest furnace glow (run 45)
- [x] Surface dirt cross-section (organic topsoil band + root threads in shallow warm soil), boss slam impact (flat shockwave ring as wide as the reach, dust walls, fist debris), old toasts fold to a one-line ghost after 2.5 s (run 46)
- [x] Deep-layer floor glow: rims take the layer's colour, lit floors get a soft fading sheen (run 47)
- [x] Layer-tinted ambient on the player sprite in deep layers (circuit green, plasma pink, core violet) (run 48)
- [x] Crystal Golem and Frost Titan art pass + glittering slam shards; layer ambient reaches enemies, pets and NPCs (run 49)
- [x] Ranged-boss telegraphs: charge lane with chevrons + end post, dash streaks and dust/embers, volley muzzle orb, summon cracks with sprouts (run 50)
- [x] Boss bolts leave a fading accent trail; Hollow AI art pass: battered plate shell that sheds plates with debris, glowing seams and core cracks as it is hurt; boss bar damage chip + phase notch (run 51)
- [x] Hollow AI arena floor circuit (pink pulse rings rolling outward, red and faster in phase 2); boss hit sparks in each boss's colours from the hit face toward the attacker, damage number at the hit point (run 52)
- [x] Hollow AI phase-2 floor zaps (charging pool telegraph, white-hot crest rolling out both ways, jump to dodge); per-boss hit sounds (run 53)
- [x] Landing pad deck art (steel plates, hazard ends, landing ring, chasing runway lights); boss bar drops under the HUD on small phones (run 54)
- [x] Hollow AI arena insulator pads (two teal pads that never conduct zaps; the crest fizzles at their edge); block tooltips quiet in boss fights and raids (run 55)
- [x] Beam-home juice: a teal column gathers over the player while recall charges; an arrival pillar slams onto the landing ring with deck dust, camera cuts to the pad (run 56)
- [x] A glassy "tink" and teal sparks where a zap crest reaches an insulator pad (sim event `zappad`); the arena floor scan is cached per world version (FloorMemo) (run 57)

## P1.9 Owner request 2026-11-12: garage and buildable vehicles (done 2026-11-12)

- [x] Garage kit (fabricator) placed on flat ground builds a garage; E / click opens the garage panel
- [x] Vehicles are built only in a garage: buggy (new car, rams enemies), drill tank (new, digs while driving), hoverbike, Sky Jet
- [x] Parts per vehicle: engine (speed), armor (damage taken), battery (drain); 3 levels each
- [x] Vehicles are parked world objects: DEPLOY from the garage, walk up and press V to enter, leaving parks it; save migration parks owned vehicles at the pad
- [x] Art for the garage, buggy and drill tank; e2e checks and screenshots
- [x] Charging bay: a garage placed in the field charges the battery at 30/s under its roof (on foot or riding), green arc + rising motes, steady green lamp when full, toast + hum (run 59)
- [x] Field garages show on the map as green bolt charge pins (run 61)
- [x] DEPLOY parks ground vehicles under the carport roof (flyers just outside); a parked vehicle hangs on a dock cable with a green pulse, and the bay charges you while seated (run 61)
- [x] Cargo Lifter: a heavy garage plane (slower, thriftier than the Sky Jet) with a +30 cargo hold while you fly it; four crate bays in the hull light up as the load passes the suit pack; getting out over the pack keeps the load with a toast (run 63)
- [x] Flyer apron: a hazard-striped strip beside the carport where flyers dock and charge, runway lights chase outward (run 64)
- [x] Cargo crates rattle in their bays when the Lifter flies fast (run 65)

## P1.8 Owner request 2026-11-11: "add all" (do these FIRST, top to bottom, before P2)

Bosses and goals: done by the interactive session 2026-11-11 except the follow-ups noted on the final-boss line. Scheduled runs: continue with "Living base and drones".

Bosses and goals
- [x] Boss framework (src/sim/bosses.ts): data-driven phases, telegraphed attacks (>= 0.4 s warning), arena lock, health bar UI, defeat rewards; deterministic, tested
- [x] Junk Colossus (Rust Wastes): summon item crafted from scrap; slam, scrap rain, charge
- [x] Vine Queen (Overgrown Ruins), Crystal Golem (Crystal Flats), Ash Wyrm (Ash Dunes, burrowing), Frost Titan (Frozen Spires)
- [x] Unique boss drops: trophy GEAR per boss (stat-based; status effects burn/chain/freeze/lifesteal still todo); trophies for the base still todo
- [x] Deeper layers (src/sim/layers.ts): Circuit 90 m, Plasma 180 m, Core 270 m; own rock/ore, tougher enemies, heat drain; energy gates open at 1 / 3 / 5 bosses; plasma saber and core plate gear
- [x] Final boss: the Hollow AI in the Core (Core key recipe); victory screen. Boss pixel-art rigs done (run 15, src/render/bossart.ts). Still todo: new game+ toggle, status effects on trophy weapons, base trophies

Living base and drones
- [x] Field drones slice 1 (src/sim/drones.ts, save v12): E/tap at a bay cycles Survey (abstract, offline) / Miner (drills exposed ore near you, flies it home) / Guard (shoots enemies) / Hauler (banks a load from a filling pack); powered by the base grid
- [x] Drone rules (run 15, save v13): 3 IF/THEN rules per bay (night / enemy near / pack half / hp low / deep -> mine / guard / haul / repair / home), DRONES panel at the base, Repair role with a heal beam, 16 px drone sprites per job
- [x] Drone pathing: bounded A* over air tiles so drones stop phasing through rock (IDEAS run 14; run 16, src/sim/dronepath.ts)
- [x] Night base raids slice 1 (run 16, src/sim/raids.ts, save v14): at nightfall at home, a wave sized by base value marches on the pad from the map edges, chews base blocks loose (they drop as items), clearing pays metal/wire/crystal; RAIDS ON/OFF in the workshop; HUD counter, siren
- [x] Raid defences (run 17, src/sim/defences.ts): powered turret (raiders first, line of sight, 1 power), spike trap (5 dmg / 0.5 s to walkers), reinforced wall (3x chew); raiders head for the nearest machine
- [x] Raid follow-ups (run 17): red war-armour raiders (`raiderRemap`), 20 s warning (horn, countdown, edge arrow), map entry chevrons, drone rule "a raid is on"
- [x] Raid polish (run 18): floor blocks on ground are never chewed (roofs still are); raid blueprints every 3 clears (Turret Mk II 3, Shield wall 6, Turret Mk III 9; derived from stats.raids); Turret core upgrade tiers; shield wall tile 45
- [x] Furniture and decoration set + room detection (run 18, src/sim/rooms.ts, tiles 46-51): light + table + bed in an enclosed 12-80 cell pocket = robot home; comfort 0-4 from decor kinds and back walls
- [x] Room outline overlay (run 19): dashed outline of the room you stand in or point at, green home / amber incomplete (`roomEdges`)
- [x] Furniture follow-ups (run 21, src/sim/wide.ts): 2-tile bed and table (tiles 52-53, one item, either half breaks both), chair (tile 54, comfort, capped 4)
- [x] Wall-mounted placement rules + lift shaft (run 22): screens/banners need a back wall or a block above/beside (`mountOk`); lift shaft tile 56 rides 3x ladder speed, stacks from the shaft below, closes rooms; window tile 55 (glass, lets light through, shows the sky, warm at night, +1 comfort for a view)
- [x] Window follow-ups (run 23): frame trims on built metal/reinforced walls (`applyTrim`). Underground daylight dropped on purpose: windows already pass any light, and underground there is no daylight to pass; a light-pipe block would be its own idea (IDEAS).

Characters
- [x] Robot NPC slice 1 (run 19, src/sim/npcs.ts): Bolt the Trader moves into the first valid room (derived, no save change), paces, greets, E/tap opens the TRADE tab with 7 fixed barter rates from the stash
- [x] Medic robot (run 20): Patch moves into the second valid room; medkit trades into the pack (+60 HP, eat from inventory); while home you keep 3/4 of the pack on death; robots never move house when a new room appears; trade rows show item icons
- [x] Comfort pays (run 22): each robot posts one cozy rate while its room has comfort 3+ (`COZY`, `tradeOpen`, `game.npcComfort`); locked rows say what the room needs
- [x] Robots live (run 23): sit on the chair by day, sleep in bed at night (a nearby player wakes them), hurry to bed and hide in raids, wave when you bank loot, cheer when a raid is beaten (`npcSpots`, `reactNpcs`)
- [x] Gunsmith (run 24, src/sim/mods.ts): Rook moves into the third valid room and builds 7 mod chips (overcharge, hair trigger, piercer, ricochet, keen edge, leech, quick grip); one per weapon slot, owned forever, free swap at the base; save v15
- [x] Scientist (run 25, src/sim/research.ts): Nova moves into the fourth valid room and studies 7 permanent perks (battery, dig, pack, lamp, HP, speed) at fixed prices, some gated by an earlier perk; save v16 `research`
- [x] TRADE tab grouping (run 25): one header per robot with its sprite portrait; robots not moved in fold to their header (`tradeEntries`)
- [x] Robot happiness (run 26): mood lonely/content/happy/delighted from comfort + up to 2 neighbours; happy -1, delighted -2 off the biggest stack of trades, chips and perks (never above posted); mood lines, TRADE header mood, "was" prices, floating hearts
- [x] Quick heal (run 21): H or the HUD heal button beside the bars eats the smallest healing item that covers the missing HP (`bestHeal`); pulses red under 35% HP
- [x] Wandering merchant drone (run 23, src/sim/merchant.ts): Dex parks over the pad sunrise to mid-afternoon, 3 offers/day from a 10-offer pool by seed+day, shown in full even while away; no-loop test over all rates

World
- [x] Weather and events (src/sim/weather.ts): seeded per in-game day; dust storms (haze), meteor showers (craters, crystal and plasma drops), eclipses (dark noon, surface spawns, 1.5x enemy health, bonus crystals)
- [x] Pets (gear slot "pet"): scout bot (7-tile loot magnet), glow moth (+4 light), spark pup (zaps enemies); they follow the player
- [x] Farming slice 1 (run 26, src/sim/farming.ts): glowcorn / rustroot / frostberry seeds from wild grass by biome, 2 growth stages on soil, 2x near a pond or sprinkler, ripe gives produce + seeds; cooking pot + 3 meals with 3-minute buffs (Charged, Sturdy, Swift)
- [x] Farming follow-ups (run 27): happy robots water every crop in the base strip; crops sway, ripe ones twinkle, sprinklers spray; meal buffs saved (v17); base crops kept across worlds (BASE_SAVE); Dex seed packet; offline crop growth (`growCrops`) with a welcome-back toast

Together
- [x] Local world records (run 27, src/sim/records.ts): personal bests per shared code (Daily Dive or a friend's code): best depth, most loot in one try, fastest first boss; gold toast + fanfare on a new best; record line in the workshop footer; save v18 `records` (last 10 codes)
- [ ] Online daily leaderboard: free-tier backend behind a Leaderboard interface (needs an owner decision on hosting; see NEEDS_FROM_USER), records screen listing the last 10 codes
- [x] Share card (src/ui/share.ts): 1200x630 image with stats and world code; SHARE on the map and victory screens; Web Share API with PNG download fallback
- [ ] Co-op research spike then implementation (2-4 players, WebRTC peer-to-peer, host-authoritative sim); keep behind a feature flag until stable

Polish
- [x] Procedural music per biome, depth, night and boss fights (src/platform/composer.ts); SOUND button cycles all on / music off / all off (save v11). Volume sliders move to the settings screen item.
- [x] Settings screen slice 1 (run 28, src/sim/settings.ts): cog beside SOUND / on the title, or O; pauses the game; master/music/effects volume (separate buses), screen shake off/low/full, UI size normal/large/huge, sound toggle; stacked layout on phones; save v19
- [x] Settings slice 2 (run 29): ORE AND HAZARD MARKS (shape glyph per ore, acid/magma warning marks), FLASHES REDUCED (no hurt blink / enemy white flash / boss strobe, capped vignette), TOUCH MOVE STICK LEFT/RIGHT (left-handed); save v20/v21
- [x] Settings slice 3 (run 30): CONTROLS page remaps 15 desktop keys (src/sim/keys.ts, swap on conflict, save v22); left-handed touch mirrors the HUD (buttons left, status right; src/ui/hudlayout.ts)
- [x] Toast rework (run 30, src/ui/toastfx.ts): max 2 left-aligned pills under the HUD text, kind icon, head label, 2-line wrap, slide-in
- [x] Achievements (run 31, src/sim/achievements.ts): 44 bronze/silver/gold awards counted from game events, AWARDS page in the inventory (paged, phone fit), Award toast + chime, save v23 seeded from older saves
- [x] Guided first minutes (run 31, src/sim/ftue.ts): 7-step GOAL card above the toasts, read from award counters (no save field)
- [x] Codex screen (run 32, src/sim/codex.ts): CODEX in the inventory, tabs PLACES / CREATURES (kill counts, field notes, bosses) / LOGS (12 data logs); derived from save.codex, save.bosses and award counters (no save field)
- [x] Suit paints (run 32, src/sim/paints.ts): 6 cosmetic paints, one per gold award, PAINT button on the inventory preview, shown in the world; save v25
- [x] Codex follow-ups (run 34): log reader paging read logs in story order with a story strip; CREW tab for the 4 robots and Dex (derived from award counters + who is present, no save bump)
- [x] Paint colours for helmets and vehicles (run 35: SUIT / HELM / RIDE paint buttons, save v26)
- [x] Award gifts (run 36): every award drops a small themed one-time gift into the stash on unlock; silver/gold add gold circuits; shown on the AWARDS cards and the toast
- [x] Mobile polish (run 33): safe-area insets (notch / home bar, src/ui/safearea.ts), HOLD REEL touch button for the hook; hotbar slots were already ~44 CSS px on a 390 px phone; real-device check stays in NEEDS_FROM_USER

Money (ethical, no paywalls)
- [ ] Cosmetic suits and vehicle skins (visible prices), supporter pack, opt-in rewarded ads (double drone output, revive with half loot) behind AdProvider; consent first
- [ ] Store releases: itch.io and web portals, then Steam page and Android/iOS (accounts in NEEDS_FROM_USER)

## P1.7 Owner requests 2026-11-11 evening (done in an interactive session)

- [x] Craftable gear (src/sim/gear.ts, save v9) in the workshop GEAR tab: 2 melee, 3 ranged, 4 armor, 2 boots, 2 back items, 2 vehicles; equip from the workshop or inventory
- [x] Grappling hook tool (5): rope pendulum, reel in / lower, jump to release
- [x] Abilities: double jump, dash, jetpack, glider; vehicles hoverbike and Sky Jet (V / RIDE)
- [x] Map: tile detail, zoom (wheel, +/-), drag pan, YOU, chest pins, structure outlines, legend
- [ ] Follow-ups: gear tiers and upgrades (Mk II), weapon mods, enemy-dropped gear, vehicle art pass (sprites instead of rectangles), map waypoints and fast travel between beacons (touch hold-to-reel done run 33)

## P2 Base and automation (M2)

- [x] Persistent base strip above the pad (15x10 tiles, src/sim/base.ts) saved in format v2 with v1 migration test; built tiles survive dives and reloads
- [x] Hotbar shows only owned placeables plus the selected one (`visiblePlaceables`), so new build tiles fit at 360 px
- [x] Base grid widened (run 25): strip 33 x 16 (BASE_HALF 16, BASE_ROWS 16); natural hills inside it never count as base (`isBuilt`)
- [x] One-way platform tile (craftable, key 9, jump up through, S/Down drops, saved in base)
- [x] Build mode in base: back walls and doors (door passable for player, blocks enemies via `enemyBlock`; keys 0 and -)
- [x] Power v1: solar cell + shared base grid (src/sim/power.ts), machines glow when working. Todo: battery tile (night power), wire tile, power readout in the HUD
- [x] Power v2: battery tile (60 power-seconds each, charges from surplus solar, runs smelters at night; HUD readout at base). Wire tile dropped on purpose: the base is one shared grid, so wires add nothing yet.
- [x] Smelter (4 stash rust -> 1 metal per 6 s, needs power)
- [x] Storage chest dropped on purpose: the stash is already unlimited and safe, so a chest adds nothing. Conveyor dropped for the same reason (one shared stash).
- [x] Miner rig v1 (powered base machine, 2 power, 1 rust per 5 s, every 4th unit iron scrap; `stepMining` in src/sim/power.ts)
- [x] Fabricator upgrade path (upgrade `fab` Lv1 unlocks solar+battery, Lv2 miner+smelter; `Recipe.fab`; no save bump)
- [x] Machines: ore-to-plate recipe (Metal plate x2 from 3 iron scrap + 2 rust, Fabricator Lv1)
- [x] Workshop tabs (UPGRADES / FABRICATOR) so the shop scales; fits 11 recipe rows at 360 px
- [x] Drone bay v1 (powered base machine, 3 power, 1 load per 12 s: copper wire, every 5th a crystal; first crystal source without diving; offline-aware; a circling drone is drawn). Todo: world-flying drones on assigned ore tiles
- [x] Drone rules UI (3 rules per drone, deterministic evaluation): done in P1.8 run 15
- [x] Offline production (cap 8 h, clock-skew safe, save v6 `away` stamp, src/sim/offline.ts) and a "while you were away" toast
- [x] First automation moment tutorial beat (`automationHint`, green line at the base)

## P3 Gear and layers (M3)

- [x] Equipment slots: head/body/feet/back/pet existed; 3 accessory sockets with 7 craftable accessories (stats stack), WORN + ACCESSORIES socket row under the character in the inventory (tap to take off), gems on the belt in the world (save v29) (run 58)
- [x] Accessories in world chests: 10% of shallow chests rising to 30% deep hold an unowned accessory, worn at once if a socket is free, gold toast + ring + sparkle (run 58); feather-charm air jump wisps (run 58)
- [x] Socket row on phones under the gear grid (run 59)
- [x] Magnet pull tethers: drops the magnet ring / scout bot reel in draw faint tinted lines with beads sliding into the suit (run 61)
- [x] Boss bonus accessory roll and boss-only accessories: 6 boss trinkets, 50% on the first kill, sure on a repeat, then 35% for a new craftable; loot beam + gem marks the drop; codex boss cards show the trinket (run 62); creatures codex footer counts "Trinkets n/6" (run 63)
- [x] Rarity and weapon modifiers: 13 prefixes (common/rare/epic, odds 60/30/10 shown), REFORGE on the Workshop gear tab for a visible price, rarity rim + gem on weapon cells, prefixed names in tips (save v30) (run 66); mod chips existed (Gunsmith)
- [x] Rolled weapon drops: 6-20% of chests (by depth) hold an unowned craftable weapon with a prefix; boss refights hone the trophy weapon with a rare-or-better prefix until it is epic; rarity toast + loot beam (run 67)
- [x] Swing trail in the weapon's colours with a rarity glow and sparkles for rare/epic; common rarity is near-white (run 67)
- [x] Armor set bonuses: Pathfinder (scout helm, spring boots, glider), Deep Miner (miner helm, reactor suit, jetpack), Vanguard (plate vest, dash boots), Hollow Regalia (crown, frost core); 2/3-piece tiers stack on the pieces, "Set bonus" toast + ring + chime, SET line in the inventory, set line in gear tips (no save change) (run 68)
- [x] Held weapon art: the hand and the blade/pistol tool slots show the equipped weapon in its own colours with a rarity rim (epic pulses) (run 68)
- [x] Rare/epic ranged prefixes glow their bolts wider in the rarity colour (run 68)
- [x] Full-set aura: a breathing glow in the set colour and motes rising from the boots when every piece of a set is worn (run 69)
- [x] Melee swing is a tapered crescent smear over the full 140-degree sweep from the shoulder (run 69)
- [x] Circuit Core set (run 73): Circuit visor + Core plate + Trace boots, 2/3-piece tiers, green aura
- [x] NEW dot on the bag when gear is found until the inventory is opened (run 74; session-only, no save change)
- [x] Per-item NEW dot in the inventory gear grid (run 75)
- [x] Trophy Hunter weapon set (run 79): any two boss trophy weapons (melee + ranged) give +15% weapon damage; shows in the inventory set lines and weapon tooltips
- [x] Layer 2 Circuit: tiles, ores, enemies, hazards, dark zones (done in P1.8; layers.ts)
- [x] Boss 1 Junk Colossus with telegraphed attacks and arena (done in P1.8 + P1.10)
- [x] Boss 2 Logic Warden (run 70): Circuit layer guardian (Logic key: 12 gold circuit, 12 copper wire, 8 crystal; summon in the Circuit layer or deeper), flying circuit monolith with orbiting logic nodes, new LASER GRID attack (0.95 s dashed guide lines, then beams across the arena; safe lanes swap each cast, tighter in phase 2), trophy Logic repeater (rapid piercing bolts), trinket Logic chip. Unlock flow: the Warden counts toward the deeper gates (GATE_BOSSES = biome bosses + Warden), victory and share cards count x/6
- [x] Warden phase-2 twist: floor tripwire beam (run 71)
- [x] Warden arena gets the glowing circuit floor trace (run 72); boss attack telegraphs are rising tones that last the warning (run 72)
- [x] Logic Warden music motif (144 bpm 16th-note arpeggio + tritone sting) and floor trace pulsing on the beat (run 77)
- [ ] Tech tree for blueprints

## P4 Retention and sharing (M4)

- [x] Daily Dive v1: UTC-day world code (src/sim/daily.ts), workshop DAILY button, tests for rollover/DST. Todo: local best per day, daily leaderboard-free share card
- [x] Seed sharing: 8-char world code with checksum (src/sim/seedcode.ts), COPY and PLAY A CODE in the workshop, save v7 `worldSeed`
- [x] Run summary: SIGNAL LOST dive report card (time, depth, tallies, items lost, record flag, dive title) with NEW DIVE / SHARE (run 50; share card itself existed)
- [x] Trip banked card: banking at the pad shows a light card above the bar (+items, trip depth, mined, beaten, chests, places since the last bank) instead of a toast; beam-home arrival has its own falling shimmer + thud (run 57)
- [ ] Follow-ups: persist the tally in the save (share card now shows this dive's time, mined, beaten, chests: run 78)
- [ ] Achievements (30) with cosmetic rewards; stats screen
- [ ] Weekly mutators (dark, low gravity, hot, double ore)
- [ ] Daily contract and non-punishing streak
- [ ] Creative sandbox mode

## P5 Polish and accessibility (M5)

- [ ] Settings screen: volume, music, shake, colour-blind palette, left-handed layout, text size, remap keys
- [ ] Pause menu; confirm-before-new-dive when carrying much loot
- [ ] FTUE: guided first 90 seconds, hints that fade
- [ ] Procedural ambient music that deepens with depth
- [ ] Gamepad support
- [ ] PWA: manifest, icons, offline service worker with version updates
- [ ] Localization framework and EN, ES, PT-BR, DE, FR, RU, TR strings
- [ ] Screenshot review of every screen at 360x640, 390x844, 1280x720, 1920x1080

## P6 Platform integration (M6)

- [ ] Adapter interfaces: AdProvider, Analytics, Leaderboard, Payments (no-op defaults, fully tested)
- [ ] Consent flow (GDPR) and privacy policy page; ads and analytics off until consent
- [ ] Web portal adapters (Poki, CrazyGames) behind AdProvider; rewarded ad placements (double drone output, revive)
- [ ] Local analytics event schema and funnel (D1, D7, session length) with opt-in send
- [ ] Capacitor Android project, debug APK in CI, AdMob plugin behind AdProvider
- [ ] Store assets generator (icons, feature graphic, screenshots via Playwright)
- [ ] itch.io zip build script; portal build with size checks (under 50 MB initial)

## P7 Performance and compatibility (M7)

- [ ] Chunked tile-layer caching for larger worlds; world size 512x1024 option
- [ ] Low-end mode (fewer particles, no gradients); automatic detection by frame time
- [ ] Memory and frame-time perf test in CI (headless budget)
- [ ] Safe-area insets, browser zoom, iOS Safari audio and viewport checks

## P8 Hardening (M7)

- [ ] Fuzz test: random input for 10 minutes of simulated time, invariants must hold
- [ ] 2-hour soak simulation: no NaN, no leaks, no stuck states
- [ ] Golden determinism hash for several seeds
- [ ] Save migration fixtures for every version
- [ ] Two-tab protection, save export and import
- [ ] Error ring buffer and in-game bug report text

## P9 Backend (optional, free tier)

- [ ] Leaderboard service on a free tier (for example Cloudflare Workers plus KV), behind `Leaderboard`
- [ ] Replay or plausibility validation of submitted dive results
- [ ] Cloud save (opt-in)

## P10 Content expansion (M9)

- [ ] Layers 3 Plasma and 4 Core with bosses 3 and 4
- [ ] More weapons, modifiers, enemy types; events and seasons
- [ ] Co-op research spike (WebRTC peer to peer)

## P11 Launch operations (needs owner accounts; see NEEDS_FROM_USER)

- [ ] Publish web build (GitHub Pages and itch.io)
- [ ] Submit to portals; Android closed test; production in cheap geos
- [ ] iOS build and submission
- [ ] Trailer, press kit, store listings in all languages

## P13 Deferred option: hand-made art (owner decision 2026-11-18: keep code-drawn art for now, do NOT start this until the trigger below)

The owner chose to keep improving the code-drawn art first (P12-F) and to keep this option open, not lose it. Do not work this section before the trigger. Do not delete it.

**Trigger:** all P12-F items are done or the owner says so, AND a screenshot review (`e2e/out/`, the 4x sprite gallery, bosses, mobile) shows the player, enemies and bosses clearly weaker than the world and tiles around them. Then write the finding and the ask in `docs/NEEDS_FROM_USER.md` (the "Art source" item) and wait for the owner's yes; the owner must approve the pack or supply art.

- [ ] Option B, scoped to characters only: approve a free CC0 pixel-art pack (no cost, no attribution required; check the licence text and keep a copy in `docs/ART.md`) for the player, enemies and bosses only. Tiles, lighting, UI and effects stay code-drawn so the look stays one style.
- [ ] Recolour or palette-map the pack to the Terrabound palette in `docs/DESIGN.md` so it matches; compare in the sprite gallery at 4x before replacing anything.
- [ ] Small sprite atlas (PNG, indexed palette) loaded behind a loader with the code-drawn sprites as the fallback; the bundle stays under 500 KB gzip and first interactive under 2 s on 4G (budget check in CI).
- [ ] Update the Zero binary assets rule in `CLAUDE.md` to name exactly which asset files are allowed, so later runs do not add more.
- [ ] Option C (owner supplies or commissions art): same loader and atlas; only a content swap. Needs the owner's files and licence.

## Definition of release candidate

P0-P8 complete, all edge cases in EDGE_CASES marked done or consciously deferred with a reason, `npm run check` green, owner has played on a real phone and PC, bundle under 500 KB gzip.
