# Progress log (newest at the bottom; append, keep short)

## 2026-11-09 Run 0 (interactive setup session)

**Done:** M0 foundation. Deterministic sim (world gen, physics, mining, battery, banking, death, upgrades), versioned never-throw saves, procedural art/FX, synth audio, keyboard/mouse/touch input, HUD/title/shop UI, crash overlay, autosave. Docs: CLAUDE, PLAN, DESIGN, MARKETING, EDGE_CASES, BACKLOG.

**Numbers:** 21 unit tests, 16 e2e checks, bundle 34.96 kB (13.24 kB gzip, budget 500 kB).

**Next:** P1 Combat and survival (see BACKLOG): hotbar, enemies, weapons, hazards, torches, crafting.

**Known issues:** touch-detection edit in `main.ts` not yet covered by a rerun of e2e at the time of writing (rerun `npm run check` first). No real-device testing yet. `gh` auth is broken in this environment, so use plain git push, no PRs.

## 2026-11-09 Run 1

**Done:** enemy framework (Crawler, Flyer) with seeded spawning, knockback, i-frames, contact damage, scrap drops; energy blade via Q tool toggle; enemy and swing rendering; 9 enemy unit tests plus 2 e2e checks.

**Numbers:** 30 unit tests, 18 e2e checks, bundle 39.9 kB (15.1 kB gzip).

**Next:** hotbar UI + touch quick-slots (tool toggle is keyboard-only for now, touch has no way to switch), pulse pistol, hazards, torches, crafting.

**Known issues:** touch players cannot switch to the blade yet (no on-screen button). Enemy art is placeholder rectangles. Enemy numbers are untuned (no balance test yet).

## 2026-11-10 Run 2

**Done:** pulse pistol (seeded-free deterministic bolts, swept collision, 0.5 battery per shot, cooldown), hit-stop on enemy hits, hotbar with tool slots (DRL/BLD/GUN) that works by tap on touch; keys 1-3 tools, 4-5 blocks, Q cycles; pistol sfx and bolt rendering; 3 new unit tests and 2 e2e checks.

**Numbers:** 33 unit tests, 20 e2e checks, bundle 42.2 kB (15.8 kB gzip).

**Next:** hazards (acid, debris, gas), torches + crafting at the Fabricator, scaffold/ladder, spawn by light, Scrap-layer balance sim.

**Known issues:** pistol aim on touch uses the tap position (no aim assist). Enemy art still placeholder rectangles. Pistol damage/cost untuned.

## 2026-11-10 Run 3

**Done:** torches (tile, item, minable, light model `World.lightAt`, darkness holes in the renderer), light-aware enemy spawning, Fabricator crafting (`recipes.ts`, `Game.craft`, workshop MAKE rows), "kit" items that stay in the pack when banking, key 6 selects torch, workshop text no longer clips under the buttons. 10 new unit tests, 2 new e2e checks, new screenshots 07-09.

**Numbers:** 44 unit tests, 22 e2e checks, bundle 44.9 kB (16.7 kB gzip). Suit lamp upgrade added late in the run.

**Next:** scaffold/ladder recipes and climbing, hazards (acid, debris, gas), Scrap-layer balance sim.

**Known issues:** torch glow is subtle on the 07 screenshot (consider warmer tint). Torches placed in the open air need an adjacent solid tile.

## 2026-11-10 Run 4

**Done:** ladder (non-solid, climbable, minable) and scaffold (solid, cheap) tiles/items with recipes; climbing physics (`onLadder`, optional `down` control, S/Down key and stick-down); ladder/scaffold rendering; hotbar and stash row now scale to fit 360 px with 9 slots; keys 7/8. 4 new unit tests.

**Numbers:** 48 unit tests, 22 e2e checks, bundle 46.1 kB (17.0 kB gzip).

**Next:** hazards (acid, debris, gas), Scrap-layer balance sim, then P2 base grid. Consider an e2e check for ladders and a hotbar that scrolls if more slots are added.

**Known issues:** ladders have no e2e check yet (unit-tested only). Hotbar is now 9 slots at 360 px; any further slot needs a grouped/scrolling bar. Ladder placement needs an adjacent solid like other blocks.

## 2026-11-10 Run 5

**Done:** hazards in `src/sim/hazards.ts` (seeded acid emitters with telegraphed drips, telegraphed falling debris that can be dodged, gas pockets with damage pulses; none at the base), rendering, sfx, 11 unit tests, 2 e2e checks, screenshot 07b. Simulated-player balance test (`tests/balance.test.ts`): it exposed that the first upgrade took too long (29% of seeds within 4 dives), so iron ore threshold 0.8 to 0.76 and first-tier upgrade costs lowered (battery 4 iron, drill 5, pack 12 rust + 2 iron); now 54% for a deliberately dumb bot, 7% deaths.

**Numbers:** 60 unit tests, 24 e2e checks, bundle 49.5 kB (18.2 kB gzip).

**Next:** P2 base grid (save v2 + migration test), build mode, power, smelter. Also: balance test could use a smarter bot (ladders, return trip) and a gas/acid-aware path; hazard numbers (dmg 10/18, gas 5 dps) untuned by real play.

**Known issues:** hazards are not saved (regenerated from seed, fine). Gas has no HUD warning yet. Balance bot teleports home instead of climbing.

## 2026-11-10 Run 6

**Done:** persistent base. `src/sim/base.ts` captures placeable tiles in a 15x10 strip above the landing pad and stamps them into every new dive world (and on load); `SaveData` v2 adds `base` (flat dx,dy,tile triples) with `sanitizeBase` and a v1 fixture migration test. 5 new unit tests.

**Numbers:** 65 unit tests, 24 e2e checks, bundle 50.3 kB (18.5 kB gzip).

**Next:** build mode UX in base (walls/platforms/doors tiles), power (solar, battery, wire), smelter, storage chest, then drones.

**Known issues:** base only persists the five placeable tile types; no background walls yet. No e2e check for base persistence (unit-tested only).

## 2026-11-10 Run 7

**Done:** hotbar lists only owned placeables plus the selected one (`visiblePlaceables` in tiles.ts, 2 unit tests); removes the 9-slot width limit so build-mode tiles can be added. Checked 06-mobile-play.png.

**Numbers:** 62 unit tests, 24 e2e checks, bundle 50.4 kB (18.5 kB gzip).

**Next:** build-mode tiles (platform, door, back wall), power (solar, battery, wire), smelter, chest.

**Known issues:** time budget this run went to baseline plus one small slice; stash-row on shop panel still lists all items.

## 2026-11-10 Run 8

**Done:** one-way platform tile (`oneWay` flag in tiles.ts, `landsOnPlatform` in physics.ts, `drop` param on moveY/probeGround fed by the down control), recipe, key 9, renderer, base persistence. 5 new unit tests (tests/platform.test.ts).

**Numbers:** 72 unit tests, 24 e2e checks, bundle 51.3 kB (18.8 kB gzip).

**Next:** back walls and doors, then power (solar, battery, wire), smelter, chest. Add an e2e check for platforms/ladders.

**Known issues:** platform has no e2e check; the hotbar still lacks a touch way to press "down" onto a platform other than the stick-down.

## 2026-11-10 Run 9

**Done:** door and back-wall tiles (craftable, minable, saved in base). Doors let the player through but block enemies (`enemyBlock`, `World.blocksEnemy`); walls are decor. Keys 0 and - select them. 3 unit tests (tests/doors.test.ts).

**Numbers:** 75 unit tests, 24 e2e checks, bundle 52.3 kB (19.1 kB gzip).

**Next:** power (solar, battery, wire), smelter, chest, then drones. Hotbar now has 8 placeables; check 06-mobile-play.png once more owned.

**Known issues:** walls occupy the tile (no layer behind ladders/torches); no e2e for doors; hazards/enemy spawn ignore doors.

## 2026-11-10 Owner feedback (interactive)

Owner played: works well, sounds good. Problems: map too small, graphics bad (player and enemies), world feels blank. Wants biomes/worlds, trees, loot places, closer to Terraria with our own identity. Added BACKLOG phase **P1.5 World and art overhaul** at top priority, ahead of the remaining P2 automation items. Runs should start with the art quality bar and player rig.

## 2026-11-10 Run 10

**Done:** `docs/ART.md`; palette-indexed pixel sprites (player 16x24 with idle/run/jump/fall frames, crawler and flyer 2 frames each, hit flash); gallery screen `?e2e=1&gallery=1` with e2e screenshot `10-gallery.png`; tests/sprites.test.ts.

**Numbers:** 77 unit tests, 25 e2e checks.

**Next:** finish player rig (dig, hurt, climb, suit tier), tile autotiling and back-wall layer, then bigger world with chunk cache.

**Known issues:** gallery lacks torch/ladder/door tiles (no LOOK entry; drawn procedurally in renderer); enemy sprites not yet reviewed in live play.

## 2026-11-10 Run 11

**Done:** player rig finished: climb frames, swing arm, hurt flash, suit colour by armor tier. Owner feedback payload matched existing P1.5 priorities.

**Numbers:** 77 unit tests, 25 e2e checks.

**Next:** enemy polish and death burst, tile autotiling, back-wall layer, bigger world with chunk cache.

**Known issues:** swing arm is a simple 2px extension; no unit test for pose selection yet.

## 2026-11-10 Run 12

**Done:** enemy polish (4-step crawler with eye on the facing side, 3-frame rotor flyer with blinking eye, sprite-shatter death burst with shock ring and smoke); autotiling (16 edge masks x 4 variants, outlined rounded corners, rivets/flakes/glints/cracks, lichen on surface tops; atlas via ImageData ~45 ms); back-wall layer (`World.walls`, natural cave walls below the surface, built walls behind tiles, drill removes built walls, no spawns in front of built walls, save v3 with v2 migration). Added `npm run ship` (gated push). Gallery is now 1100x640 with a terrain sample and wall swatches.

Also: flood-fill tile light map (`src/render/lightmap.ts`: sky, torches, lamp, pad; 4 per air tile, 8 per rock tile; smoothed 1 px/tile overlay, cached on `world.version`).

**Numbers:** 120 unit tests (+43), 29 e2e checks (+4), bundle 64.4 kB (23.5 kB gzip). Light map ~<1 ms for an 80x60 region.

**Next:** day/night cycle (scale SKY_LEVEL and sky colours), parallax per biome, bigger world with chunk cache, biomes. Torch light could get a warm tint.

**Known issues:** main briefly held a commit whose gate had failed (balance test timeout, build itself fine); fixed within minutes. Metal seam variant tiles in visible horizontal stripes; inner (diagonal) corners are not autotiled; the old `buildBackdrop` is now unused.

## 2026-11-10 Interactive session (owner asked to build without the schedule; schedule paused)

**Done:** big world and exploration. World 1400x420 (was 160x260) with five surface biomes (`src/sim/biomes.ts`: seeded bands around the home Rust Wastes), biome crusts, crystal ore, deep caverns; `src/sim/structures.ts` places ruins, radio towers, crashed ships (each with a loot chest), sealed vaults, crystal geodes, trees (5 shapes, felling gives biomass), plants and glowing cave mushrooms; `src/sim/loot.ts` seeded chest loot. Pad terrain eases in over 24 columns (no cliffs at spawn). New art in `src/render/decor.ts` (ragged autotiled leaves, trunks, plants, chest, snow caps, sky palettes blended by biome, per-biome skyline silhouettes); crystals and mushrooms emit light. Chunk render cache (32x32 tiles, change log on World, prefetch, eviction). `src/sim/explore.ts`: fog map, codex (10 entries, one-time stash rewards, save v4), surface recall (R / HOME). Map screen `src/ui/map.ts` (M; pauses the dive); mute moved to N. Workshop stash line shows only owned items.

**Numbers:** 143 unit tests, ~38 e2e checks, bundle 93 kB (33.8 kB gzip). Worldgen ~100 ms. Headless frame draw ~4 ms while walking (software rendering); heap ~10-20 MB.

**Next:** day/night cycle, liquids v1, biome enemies, lore shrines and drone wrecks, then P2 (power, machines, drones).

**Known issues:** a new world is generated every dive, so the map and chests reset per dive (codex persists). Map cells are 4x4 tiles (coarse on phones). Leaves of neighbouring trees across a biome border can merge. Schedule is paused (owner request); re-enable `trig_01RvURhsU84NhxudKyvWTNqN` to resume runs.

Later in the same session: day/night cycle with night surface spawns; one enemy per biome (vine stalker, shard mite, ember wisp, frost hulk); data shrines with 12 lore logs and drone wrecks (codex now 12 entries).

**Numbers (end of session):** 153 unit tests, 42 e2e checks, bundle 99 kB (36.1 kB gzip).

**Next:** liquids v1 (water/coolant, acid pools), lore/codex screen, then P2 base automation (power, smelter, chests, drones). Owner decision pending on persistent world vs new world per dive.

## 2026-11-10 (late) Interactive session, part 2

**Done:** persistent world until death (owner chose it): the world regenerates from its seed and replays saved edits and the explored map (save v5, `src/sim/persist.ts`, run-length encoded, never throws, dropped from the save past 2.5 MB). Death or two-tap NEW WORLD starts a fresh world. Liquids v1 (`src/sim/liquids.ts`): water and acid pools in caves, deterministic volume-conserving flow near the player, swimming with a leap out at the surface, acid damage, blocks plug liquid. Fixed the "3 undefined" cost label for new items.

**Numbers:** 172 unit tests, 44 e2e checks, bundle 103 kB (37.7 kB gzip), headless frame ~3 ms.

**Next:** remaining P1.5 polish (extra parallax layers, shaped ore veins), then P2 base automation: power, smelter, storage, conveyors, miner drones, offline production.

**Known issues:** worldgen pools are not pre-settled, so water visibly flows for a few seconds when you first get near. Leaves across biome borders can merge. Map cells are coarse on phones.

## 2026-11-11 Scheduled run

**Done:** P2 power v1: solar cell and smelter tiles (`src/sim/power.ts`), one shared base grid, solar scaled by daylight, smelter turns 4 stash rust into 1 metal per 6 s, glow/animation in the renderer, `smelt` sfx, recipes (solar: 2 metal + 1 crystal; smelter: 4 metal + 2 copper wire). Persisted through the existing base tile list, so no save version bump. 5 new unit tests, 1 new e2e check + screenshot `18-machines.png`.

**Numbers:** bundle 106 kB (38.7 kB gzip), baseline was green at start (`npm run check`).

**Next:** battery + wire so smelters run at night, HUD power readout, storage chest, miner drone v1, offline production.

**Known issues:** machines only run while the game is stepping (no offline production yet); at night with no battery they stop. Hotbar shows "0" with no icon label for a selected unowned block.

## 2026-11-11 Scheduled run 2

**Done:** power v2: battery tile (`stepGrid` in `src/sim/power.ts`, charge is in-memory only so no save bump, battery placed in the base persists through the existing tile list), recipe 3 metal + 1 copper wire, per-frame grid stepping with 0.5 s machine scans, fill bars drawn dynamically, HUD "Power supply/demand Batt %" line at base. 5 new unit tests (182 total), e2e machine check now includes a battery; screenshot 18-machines.png reviewed.

**Next:** storage chest, miner drone v1, offline production (battery charge could be simulated offline too), first-automation tutorial beat.

**Known issues:** battery charge resets on reload (not saved); hotbar "0" slot for a selected unowned block.

## 2026-11-11 Scheduled run 3

**Done:** baseline green. Miner rig (tile 30, item `miner`, recipe 3 metal + 2 copper wire): powered base machine on the shared grid (draw 2), makes 1 rust per 5 powered seconds, every 4th unit iron scrap (deterministic counter). Persisted via the base tile list (no save bump). Renders with a bobbing drill head; HUD power line counts it. 4 new unit tests, e2e machine check extended (screenshot 18-machines.png reviewed). Decided storage chest and conveyor are redundant with the unlimited stash and dropped them from the backlog.

**Numbers:** 186 unit tests, bundle 109 kB (39.5 kB gzip).

**Next:** offline production (smelters, miners, battery charge for up to 8 h, clock-skew safe) with a "while you were away" summary, then the first-automation tutorial beat, then drone rules.

**Known issues:** hotbar "0" slot for a selected unowned block.

## 2026-11-11 Scheduled run 4

**Done:** baseline green. Offline production: `src/sim/offline.ts` (`awaySeconds` clamps skew/future stamps to 0 and caps at 8 h; `simulateOffline` reuses live `stepGrid/stepMining/stepSmelting` in 15 s steps). Save v6 adds `away {savedAt,time,charge}` (v5 migration tested), so the day clock and battery charge now persist too (fixes "battery charge resets on reload"). `Game.applyOffline(now)` consumes the stamp once; main.ts shows a "While you were away" toast. 5 new unit tests (191 total).

**Also:** first-automation tutorial hint (`automationHint` in power.ts, shown at base after 40 s of play; guides solar then miner). 1 more unit test (192 total).

**Next:** drone rules / miner drone, ore-to-plate recipes.

**Known issues:** summary is a toast (6 s), not a panel; hotbar "0" slot for a selected unowned block.

## 2026-11-11 Scheduled run 5

**Done:** baseline green. Fabricator upgrade path: upgrade `fab` (2 levels) gates machine recipes via `Recipe.fab` (Lv1 solar/battery, Lv2 miner/smelter), locked rows in the shop, tutorial hint updated. No save bump (upgrade levels are sanitised generically). Shop rows now shrink to fit so the panel stays on screen at 360 px (screenshot 09-mobile-shop.png reviewed). 4 new tests (196 total). Global vitest timeout 30 s after slow-VM flakes.

**Next:** ore-to-plate recipes, miner drone v2, drone rules UI.

**Known issues:** shop will need scrolling or tabs if it grows past ~20 rows; hotbar "0" slot for a selected unowned block.

## 2026-11-11 Scheduled run 6

**Done:** baseline green. Ore-to-plate: Fabricator recipe `plate` (3 iron scrap + 2 rust -> 2 metal, Lv1) gives a non-machine path to metal. 1 new test (197 total). Bundle 112 kB (40.7 kB gzip). Screenshot 09-mobile-shop.png reviewed: 18 rows still fit at 360 px but are nearly full.

**Next:** shop tabs/scroll (needed before adding more rows), miner drone v2, drone rules UI.

**Known issues:** shop is at its row limit; hotbar "0" slot for a selected unowned block.

## 2026-11-11 Scheduled run 7

**Done:** baseline green (dev branch was missing locally; `git checkout -B dev origin/dev`). Workshop tabs (UPGRADES / FABRICATOR, `ui.shopTab`, `tab` action) fix the shop row-limit; screenshots 09 and 09b reviewed at 360 px (11 recipe rows, 7 upgrade rows). e2e check for tab switching. 197 unit tests.

**Next:** miner drone v2, drone rules UI; fabricator tab holds ~12 rows before it needs scrolling.

**Known issues:** hotbar "0" slot for a selected unowned block.

## 2026-11-11 Scheduled run 8

**Done:** baseline green (`dev` created from main; origin/dev existed but main was ahead). Drone bay v1: tile/item/recipe (Fabricator Lv2: 4 metal, 3 wire, 1 crystal), `stepDrones` in power.ts shared by live play and offline (summary toast now lists wire and crystal), persisted in the base strip (no save bump; carry-over progress is not saved). 4 new tests (201 total). Bundle 114 kB (41.2 kB gzip). Screenshot 09b reviewed: 12 fabricator rows still fit at 360 px (tab is full).

**Next:** drone rules UI needs real drones (flying to assigned ore); fabricator tab needs scrolling before another recipe; equipment slots (P3).

**Known issues:** fabricator tab at its 12-row limit; hotbar "0" slot for a selected unowned block.

## 2026-11-11 Scheduled run 9

**Done:** baseline green. Shop scrolling (9 visible rows, ^/v buttons, mouse wheel, `clampScroll`) removes the row-limit blocker; screenshots 09 and 09b reviewed at 360 px. Seed sharing: `src/sim/seedcode.ts` (7 base-32 chars + odd-weight check char, rejects any single typo), `Game.seedCode`, `newDive(code)`, save v7 `worldSeed` (v6 migration tested), workshop COPY / PLAY A CODE buttons (web prompt for entry). 8 new tests (209 total).

**Next:** drone rules UI / world-flying drones, equipment slots (P3), Daily Dive (needs a mode that does not clobber the persistent world), run summary card.

**Known issues:** PLAY A CODE uses window.prompt (no in-canvas text entry; fine on web, check Capacitor); hotbar "0" slot for a selected unowned block.

## 2026-11-11 Scheduled run 10

**Done:** baseline green. Daily Dive v1: `src/sim/daily.ts` (UTC-day hash -> world code, DST-proof), workshop row is now COPY CODE / PLAY CODE / DAILY with the world code in the footer; DAILY action e2e check; 4 new tests (213 total). Screenshot 09 reviewed at 360 px.

**Next:** local best per daily world, run summary + share card, pause menu, drone rules UI.

**Known issues:** DAILY replaces the persistent world (confirm tap not added; NEW WORLD has one); hotbar "0" slot for a selected unowned block.

## 2026-11-11 Interactive session (owner feedback: inventory, chests, pickups, planting, fishing, islands, graphics)

**Done:** see BACKLOG P1.6. Inventory screen, pixel icons, visible gear and held tool, rod tool and fishing, chests as containers with storage chests, ground drops, seeds and saplings, surface ponds, sky islands, save v8 (chests and saplings in the world diff, v7 migration). Jungle sky toned down. The scheduled task could not be paused from the session (permission check), so runs continued in parallel; no conflicts.

**Numbers:** 234 unit tests, e2e all green (new: chest window, TAKE ALL, E close, inventory open/eat/close, wheel tool switch, fishing catch), bundle 141 kB (49.9 kB gzip).

**Next:** P1.6 follow-ups (way up to islands, equipment items, crops), then P2/P3 as ordered.

**Known issues:** hotbar shows a dimmed "0" slot for a selected block you no longer own; the fishing screenshot sometimes shows no line because the capture runs before the cast lands; island access needs building ladders/scaffolds.
