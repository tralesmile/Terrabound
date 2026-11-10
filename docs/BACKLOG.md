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
- [ ] Hazards: drip acid tiles, falling debris with telegraph, gas pockets
- [x] Torches (craftable, placeable, minable, light pushes back darkness)
- [x] Suit lamp upgrade (4 levels, +1.5 tiles of light)
- [x] Crafting at the base Fabricator: recipes table (src/sim/recipes.ts), UI rows in the workshop; torch done
- [ ] More recipes: scaffold, ladder, plate
- [ ] Scaffold and ladder placement and climbing physics
- [ ] Simulated-player balance test for the Scrap layer

## P2 Base and automation (M2)

- [ ] Persistent base grid separate from the dive world (save format v2 with migration test)
- [ ] Build mode in base: blocks, walls, platforms, doors
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
