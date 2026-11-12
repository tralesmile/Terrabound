# Backlog (ordered; work top to bottom; tick when `npm run check` is green and pushed)

Rule: ship small vertical slices. Each item needs tests. Keep the game playable at all times.

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
- [ ] Follow-ups: gear/armor as real equippable items (P3 equipment slots), crops and farming, ice fishing in Frozen Spires, a way up to islands (jump pads / grapple), an inventory hotbar the player can arrange, touch long-press for item actions

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
- [ ] More robot NPCs: Gunsmith (weapon mods), Scientist (research tree)
- [x] Quick heal (run 21): H or the HUD heal button beside the bars eats the smallest healing item that covers the missing HP (`bestHeal`); pulses red under 35% HP
- [x] Wandering merchant drone (run 23, src/sim/merchant.ts): Dex parks over the pad sunrise to mid-afternoon, 3 offers/day from a 10-offer pool by seed+day, shown in full even while away; no-loop test over all rates

World
- [x] Weather and events (src/sim/weather.ts): seeded per in-game day; dust storms (haze), meteor showers (craters, crystal and plasma drops), eclipses (dark noon, surface spawns, 1.5x enemy health, bonus crystals)
- [x] Pets (gear slot "pet"): scout bot (7-tile loot magnet), glow moth (+4 light), spark pup (zaps enemies); they follow the player
- [ ] Farming: crops on soil (3-4 kinds), watering, harvest; cooking pot recipes; food buffs with timers

Together
- [ ] Daily world leaderboard (local first, then free-tier backend behind the Leaderboard interface): deepest, most loot, fastest boss
- [x] Share card (src/ui/share.ts): 1200x630 image with stats and world code; SHARE on the map and victory screens; Web Share API with PNG download fallback
- [ ] Co-op research spike then implementation (2-4 players, WebRTC peer-to-peer, host-authoritative sim); keep behind a feature flag until stable

Polish
- [x] Procedural music per biome, depth, night and boss fights (src/platform/composer.ts); SOUND button cycles all on / music off / all off (save v11). Volume sliders move to the settings screen item.
- [ ] Settings screen: master/music/sfx volume, screen shake, key remap, colour-blind palette, text size, left-handed touch layout
- [ ] Guided first 2 minutes (FTUE), achievements (30+), codex screen with lore logs and enemy entries
- [ ] Mobile polish: on-screen hotbar sized for thumbs, hook hold-to-reel button, safe-area insets; real-device check listed in NEEDS_FROM_USER

Money (ethical, no paywalls)
- [ ] Cosmetic suits and vehicle skins (visible prices), supporter pack, opt-in rewarded ads (double drone output, revive with half loot) behind AdProvider; consent first
- [ ] Store releases: itch.io and web portals, then Steam page and Android/iOS (accounts in NEEDS_FROM_USER)

## P1.7 Owner requests 2026-11-11 evening (done in an interactive session)

- [x] Craftable gear (src/sim/gear.ts, save v9) in the workshop GEAR tab: 2 melee, 3 ranged, 4 armor, 2 boots, 2 back items, 2 vehicles; equip from the workshop or inventory
- [x] Grappling hook tool (5): rope pendulum, reel in / lower, jump to release
- [x] Abilities: double jump, dash, jetpack, glider; vehicles hoverbike and Sky Jet (V / RIDE)
- [x] Map: tile detail, zoom (wheel, +/-), drag pan, YOU, chest pins, structure outlines, legend
- [ ] Follow-ups: gear tiers and upgrades (Mk II), weapon mods, enemy-dropped gear, vehicle art pass (sprites instead of rectangles), map waypoints and fast travel between beacons, touch: hold-to-reel button for the hook

## P2 Base and automation (M2)

- [x] Persistent base strip above the pad (15x10 tiles, src/sim/base.ts) saved in format v2 with v1 migration test; built tiles survive dives and reloads
- [x] Hotbar shows only owned placeables plus the selected one (`visiblePlaceables`), so new build tiles fit at 360 px
- [ ] Base grid: widen/extend beyond the 15x10 strip if needed (walls behind, background layer)
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

- [ ] Equipment slots (helmet, core, boots, module, 3 accessories) with stats and UI
- [ ] Rarity and weapon modifiers; mod chips; set bonuses
- [ ] Layer 2 Circuit: tiles, ores, enemies, hazards (electric floors), dark zones
- [ ] Boss 1 Junk Colossus with telegraphed attacks and arena
- [ ] Boss 2 Logic Warden; unlock flow between layers
- [ ] Tech tree for blueprints

## P4 Retention and sharing (M4)

- [x] Daily Dive v1: UTC-day world code (src/sim/daily.ts), workshop DAILY button, tests for rollover/DST. Todo: local best per day, daily leaderboard-free share card
- [x] Seed sharing: 8-char world code with checksum (src/sim/seedcode.ts), COPY and PLAY A CODE in the workshop, save v7 `worldSeed`
- [ ] Run summary screen and share card image (canvas to PNG, Web Share API with fallback download)
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

## Definition of release candidate

P0-P8 complete, all edge cases in EDGE_CASES marked done or consciously deferred with a reason, `npm run check` green, owner has played on a real phone and PC, bundle under 500 KB gzip.
