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

## P1.5 World and art overhaul (OWNER PRIORITY 2026-11-10: do this before anything else)

Owner feedback after playing: the game works and sounds good, but the map is too small, the graphics are bad (player and enemies especially) and the world feels blank. Goal: Terraria-level richness with our own identity (dead machine-planet "the Hollow", drones, battery clock). Each item is a vertical slice with tests; review the screenshots after every visual change and add a sprite-gallery screenshot (`?e2e=1&gallery=1`) so every sprite is reviewed at 4x.

Art (do first, biggest visible win):
- [x] Art quality bar: write `docs/ART.md` (palette ramps of 4-5 shades per material, 1 px dark outline on characters, top-left light, dithering rules, silhouette-first). Add a gallery screen that draws every tile, item, character and enemy at 4x, captured by e2e.
- [x] Player rig (16x24 sprite, idle bob, 4-frame run, jump, fall, climb, swing arm, hurt flash, suit tier colour by armor level): 16x24 px, separate head/helmet with glowing visor, torso, backpack with battery light, arms, legs; animations idle (breathing), run (6 frames), jump, fall, dig/swing, hurt flash, climb. Facing flip. Suit colour shows upgrade tier.
- [x] Enemies redrawn (4-step crawler scuttle, 3-frame rotor flyer with blinking eye, hit flash, shatter death burst) with distinct silhouettes and 2-4 frame animations: Crawler (scrap-beetle with legs, glowing eye), Flyer (rotor drone with blinking light); hit flash and death burst.
- [x] Tiles: autotiling (edge and corner variants via 4-neighbour mask) so blocks have rounded, outlined edges; per-material texture detail (rivets on metal, flakes on rust, glints on ore); grass/moss tops on surface blocks.
- [x] Back-wall layer (save v3; nothing spawns in front of built walls): separate `walls` array in World; caves show darker dug-out walls behind, so underground is never flat black. Player-placed walls move to this layer.
- [x] Terraria-style tile light map (flood-fill light from sky, torches, lamp, glowing ores) replacing the radial gradient; smooth per-tile interpolation; cached and only recomputed near changes.
- [ ] Day/night cycle on the surface (sky colours, stars, light level), 10-minute day.
- [ ] Parallax backgrounds per biome: skyline silhouettes per biome done (towers, giant trees, spires, mountains, ash cones) and sky palette blends between biomes; still todo: 2 more depth layers (mid structures, near foliage).

World size and variety:
- [x] Bigger world: 1400 x 420 tiles (chosen over 1600x600 to keep worldgen ~100 ms and tests fast) (wide surface to explore, deep layers). Chunked render cache (32x32 tile chunks pre-drawn to offscreen canvases, redraw only dirty chunks); keep 60 fps and memory budget; perf test in e2e. Save format unaffected (world regenerates from seed; only diffs near the base persist).
- [x] Surface biomes left/right of the pad (data table in `src/sim/biomes.ts`): Rust Wastes (start), Overgrown Ruins (alien jungle), Crystal Flats, Ash Dunes, Frozen Spires. Each: tiles, colours, background, ores, enemies, music mood.
- [x] Trees and plants (canopy, pine, spire, wire, dead shapes; felling yields biomass; bio torch recipe): alien trees of 3-4 shapes per biome (choppable for `biomass`, new item used in recipes), grass, bushes, flowers, mushrooms, vines in caves; decorative but harvestable.
- [x] Surface structures (ruins, radio towers, crashed ships with chests; see src/sim/structures.ts): ruined buildings, crashed ships, radio towers, abandoned outposts with loot chests (seeded loot tables, no paid randomness). At least 1 structure every ~60 tiles.
- [ ] Underground cave biomes: glowing mushroom patches, crystal-lined caverns and deep big caverns done; still todo: lava/plasma pockets, flooded tunnels (need liquids), shaped ore veins.
- [ ] Underground points of interest: sealed vaults with chests and crystal geodes done; still todo: lore shrines with data logs, drone wrecks to salvage.
- [ ] Biome-specific enemies (one per biome, data-driven in enemies.ts) and a music mood per biome (needs P5 music).
- [ ] Liquids v1: water/coolant and acid pools with simple cellular flow (deterministic), swim physics, acid damage.
- [x] Map screen (M; mute moved to N and the HUD button), plus surface recall (R / HOME button, 2.5 s, cancelled by moving or damage): explored-area minimap with fog of war, pins for chests and pad.
- [x] Exploration rewards: 10 codex entries (biomes + structure kinds) with one-time stash rewards, save v4. (Explorer achievements move to P4 achievements.)
- [x] Simulated-player test (tests/biomes.test.ts over 8 seeds): biomes, structures and chests appear within the expected distances on 25 seeds; no structure overlaps the pad.

## P2 Base and automation (M2)

- [x] Persistent base strip above the pad (15x10 tiles, src/sim/base.ts) saved in format v2 with v1 migration test; built tiles survive dives and reloads
- [x] Hotbar shows only owned placeables plus the selected one (`visiblePlaceables`), so new build tiles fit at 360 px
- [ ] Base grid: widen/extend beyond the 15x10 strip if needed (walls behind, background layer)
- [x] One-way platform tile (craftable, key 9, jump up through, S/Down drops, saved in base)
- [x] Build mode in base: back walls and doors (door passable for player, blocks enemies via `enemyBlock`; keys 0 and -)
- [ ] Power: solar cell, battery, wire; machines show state
- [ ] Machines: smelter (rust and ore to plate), storage chest, conveyor, fabricator upgrade path
- [ ] Drone v1: Miner drone mines assigned ore tiles in a base mine shaft
- [ ] Drone rules UI (3 rules per drone, deterministic evaluation)
- [ ] Offline production (cap 8 h, clock-skew safe) and a "while you were away" summary
- [ ] First automation moment tutorial beat

## P3 Gear and layers (M3)

- [ ] Equipment slots (helmet, core, boots, module, 3 accessories) with stats and UI
- [ ] Rarity and weapon modifiers; mod chips; set bonuses
- [ ] Layer 2 Circuit: tiles, ores, enemies, hazards (electric floors), dark zones
- [ ] Boss 1 Junk Colossus with telegraphed attacks and arena
- [ ] Boss 2 Logic Warden; unlock flow between layers
- [ ] Tech tree for blueprints

## P4 Retention and sharing (M4)

- [ ] Daily Dive: date-seeded world, same for everyone, local best, UTC rollover and DST-safe
- [ ] Seed sharing: copy and paste seed code, "play this seed"
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
