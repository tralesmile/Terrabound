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

## 2026-11-11 Scheduled run 11

**Done:** baseline green (234 unit tests, e2e all pass; `git checkout -B dev origin/dev` needed again). Hotbar no longer prints a "0" count on a selected block you do not own (slot stays dimmed). Short run: no larger slice started.

**Next:** run summary + share card, pause menu, DAILY confirm tap, drone rules UI, equipment slots (P3).

**Known issues:** DAILY replaces the persistent world without a confirm; fishing screenshot sometimes shows no line.

## 2026-11-11 Interactive session (owner: swinging, more weapons and abilities, craftable weapons/armor/vehicles, better map)

**Done:** BACKLOG P1.7: craftable gear in the GEAR tab (17 pieces, save v9 with v8 migration), grappling hook, double jump, dash, jetpack, glider, hoverbike and Sky Jet, armor recolours, bombs that dig craters, rail/scatter guns, zoomable draggable map with pins and legend, workshop rows fit any screen.

**Numbers:** 247 unit tests, e2e all green (new: GEAR tab build, ride and fly, hook attach/release, map zoom/pan), bundle 159 kB (55.5 kB gzip).

**Next:** P1.7 follow-ups, then P2/P3 in order.

**Known issues:** vehicles are drawn from rectangles (art pass pending); on touch, reeling the hook needs holding the dig side.

## 2026-11-11 (late) Interactive session: bosses

**Done:** five biome bosses (src/sim/bosses.ts) with telegraphed attacks, phase 2, arenas, beacons at the fabricator, trophies (boss-only GEAR), save v10. 254 unit tests, e2e boss summon/defeat check, bundle 172 kB (59.8 kB gzip).

**Next (claimed by the interactive session):** deeper layers with gates, final boss. Scheduled runs: start at "Living base and drones".

**Known issues:** boss art is built from rectangles (needs a pixel-art pass); no status effects yet.

## 2026-11-11 (later) Interactive session: layers and final boss

**Done:** depth layers with gates (src/sim/layers.ts, gates open as biome bosses fall, persisted as world edits), new rock/ore/items (circuit, plasma, core shard), deep gear (plasma saber, core plate), the Hollow AI final boss with a victory screen. 256 unit tests, e2e green (deep layer, final boss, victory), bundle 178 kB (61.6 kB gzip).

**Next:** "Living base and drones" (P1.8), then the rest of P1.8 in order.
Also: procedural music (composer.ts + Sfx.updateMusic, mood from biome/layer/night/boss), save v11 music setting. 259 unit tests, bundle 181 kB (62.7 kB gzip).
Also: weather and events (weather.ts): dust storms, meteor showers, eclipses. 264 unit tests, bundle 184 kB (63.8 kB gzip).
Also: pets (scout bot, glow moth, spark pup) in a new gear slot. 266 unit tests, bundle 186 kB (64.5 kB gzip).
Also: share cards (SHARE on the map and victory screens). 267 unit tests, e2e green, bundle 189 kB (65.3 kB gzip).
Interactive session claims are all finished; scheduled runs continue P1.8 from "Living base and drones" (skip items already ticked).

## 2026-11-11 Scheduled run 12

**Done:** baseline green (267 tests). Creative review: the surface skyline was flat rectangles; now two parallax layers (far haze at 0.3) and towers with setbacks, antennas, broken crowns and blinking window grids (`towerShape` in decor.ts, 4 tests; screenshot 02 reviewed). Magma pockets: new liquid `T.MAGMA` (id 40, 60 dps, glows, light 28) replaces water/acid in the Plasma and Core layers; liquid damage now comes from `TileDef.dps`; 3 tests and e2e screenshot 27b-magma.

**Numbers:** 274 unit tests, e2e all green, bundle 190 kB (65.9 kB gzip).

**Next:** near-foliage parallax layer, shaped ore veins, water+magma cooling into rock, then P1.8 "Living base and drones".

**Known issues:** most magma pockets are 1-3 cells (the basin fill only floods floor cells); DAILY still replaces the world without a confirm.

## 2026-11-12 Scheduled run 13

**Done:** baseline green (274 tests). Creative review found the phone toast ("Codex reward ...") drawn over the SHOP button and clipped; toasts now move below the button column on narrow screens (`toastLayout`) and repeated toasts merge. Feel: landing squash about the feet and dust in the ground colour, footstep puffs while running (fx.ts, e2e checks + 02a-landing.png). Backlog: near foliage parallax layer with a ridge band (screenshots 02, 11-jungle reviewed), water cools magma into basalt (T.BASALT 41, steam hiss, e2e 27c-basalt.png), iron seams and copper veins (ore totals within ~2%).

**Numbers:** 295 unit tests, e2e all green, bundle 194 kB (67.4 kB gzip).

**Next:** P1.8 "Living base and drones", then the rest of P1.8; IDEAS: magma surface art, context hints, touch jump button.

**Known issues:** DAILY still replaces the world without a confirm; basalt is quite dark against plasma rock.

## 2026-11-12 Scheduled run 14

**Done:** baseline green (295 tests). Creative review: magma pools were flat orange blocks; now a travelling heat band, rolling crest, bubbles that swell and pop, embers and heat haze (fx.ts helpers, 4 tests, e2e checks two frames differ, 27b2-magma-close.png). Backlog P1.8 field drones slice 1: bays get roles (Survey/Miner/Guard/Hauler) via E or tap, drones fly out with the player, miners drill exposed ore and bank it, guards shoot, haulers empty a filling pack; save v12 (roles per bay); bay hint at the base; 12 unit tests, e2e 33-drones.png.

**Numbers:** 311 unit tests, e2e all green, bundle 203 kB (70.5 kB gzip).

**Next:** drone rules + rule editor (P1.8, split out), then night base raids.

**Known issues:** drones fly straight through rock (drawn faint while inside); drone art is rectangles; DAILY still replaces the world without a confirm.

## 2026-11-12 Scheduled run 15

**Done:** baseline green (311 tests). Creative review: bosses were flat rectangles (worst art in the game). New src/render/bossart.ts draws every boss as a rig of shaded, outlined pixel parts (scrap plates, vines, crystal facets, ice cracks, ember scales, circuit traces) cached as canvases: walkers step, bob, reach and glow red when enraged; the Ash Wyrm has finned segments and a maw; the Hollow AI is an armoured eye with orbiting shards that tracks you (screenshots 10-gallery, 26-boss, 28-final-boss). Backlog P1.8 drone rules: 3 IF/THEN rules per bay, DRONES panel at the base, Repair role with heal beam, 16 px drone sprites per job, save v13 (`droneRules`, v12 migration test). Button labels now shrink to fit.

**Numbers:** 325 unit tests, e2e all green (new: rule panel by clicks, Escape closes, repair heals, phone panel fit; 33b/33c/33d screenshots), bundle 218 kB (75.9 kB gzip).

**Next:** drone pathing (bounded A*), then night base raids (P1.8).

**Known issues:** drones still fly through rock; DAILY still replaces the world without a confirm; toasts show faintly through open panels.


## 2026-11-12 Scheduled run 16

**Done:** baseline green (325 tests). Creative review: vehicles were the last rectangle art; the hoverbike and Sky Jet are now outlined, shaded sprite maps (`vehicleRows`: canopy, swept wing, tail fin, flickering exhaust that lengthens on boost, flight bob, pulsing hover pads; screenshots 22-sky-jet, new 22b-hoverbike). Backlog: drone pathing (src/sim/dronepath.ts: clearLine + 8-way bounded A*, 300 nodes, re-plan 0.5 s, falls back to straight flight; miners hover at an open ore face; 9 tests). Night base raids slice 1 (src/sim/raids.ts, save v14): waves sized by base value march on the pad at nightfall when you are home, chew base blocks loose as items, clearing pays metal/wire/crystal; RAIDS ON/OFF in the workshop; HUD counter, siren, red chevrons (12 tests, 3 e2e checks, 34-raid.png, 34b-raids-toggle.png).

**Numbers:** 347 unit tests, e2e all green, bundle 225 kB (78.4 kB gzip).

**Next:** raid defences (turret, spike trap, reinforced wall), then raid follow-ups, then furniture.

**Known issues:** raiders are ordinary enemy sprites with a glow; a raider standing on a base floor block chews down through it; DAILY still replaces the world without a confirm; toasts show faintly through open panels.

## 2026-11-12 Scheduled run 17

**Done:** baseline green (347 tests). Creative review: raiders read as ordinary cave enemies and raids were "kill what walks in". Raiders now wear red war-armour with a gold eye (sprite remap). Backlog raid defences (src/sim/defences.ts): powered turret block with a tracking barrel and tracer shots, spike traps, reinforced walls (3x chew), raiders go for the nearest machine; 3 new tiles (42-44), items, icons, Fabricator recipes. Raid follow-ups: 20 s warning (horn, toast, HUD countdown, edge arrow), map entry chevrons, drone rule "a raid is on". Screenshots 34c-defences, 34d-raid-warning, 34e-raid-map.

**Numbers:** 361 unit tests, e2e all green, bundle 233 kB (80.8 kB gzip).

**Next:** furniture and decoration set + room detection (P1.8), then robot NPCs.

**Known issues:** a raider on a base floor block chews down through it; DAILY still replaces the world without a confirm; toasts show faintly through open panels; turrets draw 1 power even when idle.

## 2026-11-12 Scheduled run 18

**Done:** baseline green (361 tests). Creative review: the base was a bare strip and raid toasts stacked stale lines ("Raid repelled!" over "RAID!"). Toasts now cap at 3 lines and raid messages replace each other (toast groups). Raid polish: floor blocks resting on ground are never chewed through (roofs over open space still are); raid blueprints every 3 cleared raids (Turret Mk II, Shield wall, Turret Mk III, derived from stats.raids so no save change); Turret core upgrade (+1.5 range, +50% damage, faster fire per tier); Shield wall tile 45 (6x chew, glows). Furniture: table, lamp (lights like a torch), wall screen (live readout), potted plant, banner, bunk bed (tiles 46-51, 16x16 art in src/render/furniture.ts); rooms.ts detects enclosed rooms and robot homes (light + table + bed), comfort 0-4; in-room hint and a "Room complete" toast/chime. Screenshot 35-room.png reviewed.

**Numbers:** 384 unit tests, e2e all green (new: furnished room check), bundle 243 kB (84.1 kB gzip).

**Next:** Robot NPCs move into valid rooms (P1.8 Characters), starting with the Trader (fixed visible prices), then the wandering merchant drone.

**Known issues:** table and bed are 1 tile and read small; DAILY still replaces the world without a confirm; turrets draw 1 power even when idle.

## 2026-11-12 Scheduled run 19

**Done:** baseline green (384 tests). Creative review: rooms had no payoff and you could not see a room's shape. Dashed room outline (green home, amber incomplete) for the room you stand in or point at (`roomEdges`, 1 test). Robot NPC slice 1 (src/sim/npcs.ts): Bolt the Trader moves into the first valid room (derived from the world, no save change; silent on load, toast + chime when a home is finished, leaves when the room breaks), paces its floor, faces you, says rotating lines in the hint bar, name tag; E or tap opens a 4th workshop tab TRADE with 7 fixed barter rates (rust->metal is worse than a smelter so automation still pays). 15 x 20 trader sprite with walk cycle and blink. Screenshots 35b-trader, 36-trade, 09-mobile-shop (4 tabs fit) reviewed.

**Numbers:** 397 unit tests, e2e all green (new: trader moves in, greeting, E opens TRADE, click swaps 8 rust for 1 metal), bundle 250 kB (86.4 kB gzip).

**Next:** Medic robot in a second valid room (heals at the base, cures), then furniture follow-ups (2-tile bed/table, chairs), then wandering merchant drone.

**Known issues:** trade rows are text only (no item icons); table and bed are 1 tile and read small; DAILY still replaces the world without a confirm; turrets draw 1 power even when idle.


## 2026-11-12 Scheduled run 20

**Done:** baseline green (397 tests). Creative review: the TRADE tab was a wall of text with the same subtitle on every row. Trade rows now show item icons (give > get, with counts, dimmed when the robot is not home) and "you have N" per row (36-trade). Backlog P1.8 Characters: Patch the Medic moves into the second valid room (white-coat remap of the trader rig with a red cross, red name tag); posts two medkit rates that go straight into the pack (medkit is a new kit item, eat for +60 HP); while Patch lives in the base death keeps 3/4 of each pack stack (toast says so). Robots now keep their own room when a new one appears (the Trader used to move upstairs). Robots talk and trade anywhere in the base (`canShop`), and talking to one opens TRADE scrolled to its rows. Screenshots 35c-medic, 36b-medic-trade reviewed.

**Numbers:** 402 unit tests, e2e all green (new: medic moves in upstairs + greets, E opens TRADE at its rows, click buys a medkit into the pack), bundle 252 kB (87.3 kB gzip).

**Next:** furniture follow-ups (2-tile bed/table, chairs), quick-heal key, then wandering merchant drone.

**Known issues:** upgrade BUY rows refuse while you shop upstairs off the pad (only TRADE is meant to work there); trade rows on a phone are tight (text shrinks); table and bed are 1 tile; DAILY still replaces the world without a confirm; turrets draw 1 power even when idle.

## 2026-11-12 Scheduled run 21

**Done:** baseline green (402 tests). Creative review: the 1-tile bed and table looked like toys next to the player (35-room). Furniture follow-ups (src/sim/wide.ts): bed and table now go down 2 cells wide for one item (right half tiles BED_FOOT 52 / TABLE_END 53; prefers the right cell, else left, else single; mining or raider chewing either half clears both and drops one item; old 1-tile pieces still count and draw as before). New 32x16 art: double bed with head/footboard, long table with a mug, sprout and crate. Chair (tile 54, Chair x2 for 3 rust) adds a comfort kind; comfort capped at COMFORT_MAX 4. Quick heal: H or a heal button with a count beside the HP bar eats the smallest heal that covers the missing HP (`bestHeal`), pulses red under 35% HP; toasts for full/none. Screenshots 35-room, 35c-medic, 37-quick-heal reviewed.

**Numbers:** 410 unit tests (new tests/wide.test.ts: 8), e2e all green (new: quick heal by H and by clicking the HUD button), bundle 257 kB (88.5 kB gzip).

**Next:** wall-mounted placement rules + lift block, then more robot NPCs (comfort pays, robots react), then wandering merchant drone.

**Known issues:** upgrade BUY rows refuse while you shop upstairs off the pad; trade rows on a phone are tight; DAILY still replaces the world without a confirm; turrets draw 1 power even when idle; a chair has no flip (always faces right).

## 2026-11-12 Scheduled run 22

**Done:** baseline green (410 tests). Creative review: base interiors and the tower read as one flat grey slab (35c-medic). Window tile 55: solid glass that lets light through (`TileDef.clear`, lightmap), drawn per frame so the pane shows the live sky by day and glows warm amber at night like a lit home; a window in a room's wall adds +1 comfort (a view, `Room.view`). Backlog: wall-mounted rules (screen/banner need a back wall or a block above/beside, toast otherwise; `mountOk`), lift shaft tile 56 (climb tile, 3x ladder speed `LIFT_MUL`, hangs from the shaft below, closes rooms like a door, rails + drifting cyan chevrons). Comfort pays: each robot posts one cozy rate at comfort 3+ (Bolt 2 fish -> 1 crystal, Patch 2 biomass + 1 fish -> medkit), warm-tinted rows that say what the room needs. Screenshots 38-windows, 38b-lift, 38c-windows-night, 36c-cozy-trade reviewed.

**Numbers:** 419 unit tests (new tests/windowlift.test.ts: 7, cozy: 2), e2e all green (new: window view keeps a valid comfort-4 home, lift ride > 4 tiles in 0.45 s, cozy row enabled), bundle 260 kB (89.4 kB gzip).

**Next:** robots react / sit / sleep, Gunsmith and Scientist, then wandering merchant drone.

**Known issues:** upgrade BUY rows refuse while you shop upstairs off the pad; trade rows on a phone are tight; DAILY still replaces the world without a confirm; turrets draw 1 power even when idle; a chair has no flip; windows underground do not bring in daylight; mounted screens stay up if their wall is later removed.

## 2026-11-12 Scheduled run 23

**Done:** baseline: 419 unit tests green, e2e fishing check flaked once (a plain `mouse.click` fell between frames); fixed with a `holdClick` helper (press ~70 ms) and waiting for a fresh bite. Creative review: robots paced silently and the tower walls read as rock. Robots now live: sit on the chair at the table by day, sleep in bed at night (head on the pillow under a blanket, drifting z's; a nearby player wakes them), hurry to bed and tremble with a "!" during raids, wave ("Hi!" bubble + hop) when you bank loot and cheer ("Yay!") after a beaten raid. Frame trims on built metal and reinforced walls (bright band, shadow line, corner bolts). Backlog: Dex the wandering merchant drone (src/sim/merchant.ts): parks over the pad sunrise to mid-afternoon, 3 rotating offers a day from a 10-offer pool (seed + day), shown in the TRADE tab even while away, landing/leaving toasts, gold sprite with a crate and a landing beam. Screenshots 39-robots-asleep, 39b-robot-sits, 39c-robots-wave, 40-merchant, 40b-merchant-trade, 38-windows (trims) reviewed.

**Numbers:** 437 unit tests (new: npcpose 9, merchant 8, trims 1), e2e all green (new: robots sleep at night, Trader sits on the chair, robots wave on bank, merchant E opens its 3 rows), bundle 268 kB (92.3 kB gzip).

**Next:** Gunsmith (weapon mods) and Scientist (research tree) robots; then farming.

**Known issues:** upgrade BUY rows refuse while you shop upstairs off the pad; trade rows on a phone are tight (TRADE now has 14 rows, scrolls); DAILY still replaces the world without a confirm; turrets draw 1 power even when idle; a chair has no flip; mounted screens stay up if their wall is later removed; the merchant hovers inside whatever is built over the right end of the pad.


## 2026-11-12 Scheduled run 24

**Done:** baseline green (437 tests). Creative review: combat had no loadout choice past crafting tiers, and pistol bolts were thin lines swallowed by cave darkness (06-pistol). Bolts now glow: tracers drawn over the darkness with an additive halo, a white-hot head, colour by behaviour (gold pulse, orange scatter, blue piercing, green ricochet), muzzle flash and impact sparks. Backlog P1.8: Rook the Gunsmith (orange visor, chip badge) moves into the third valid room; TRADE lists 7 mod chips (src/sim/mods.ts) with fixed costs: overcharge +35% shot damage, hair trigger 30% faster, piercer (bolts pass through), ricochet (2 wall bounces), keen edge (+30% damage, +0.6 reach), leech (3 HP per melee hit), quick grip (25% faster swings). One chip per weapon slot, owned forever, fit/take out free while you can shop; a fitted chip shows on the hotbar weapon slot. Save v15 (`mods`), migration + v14 fixture test. Screenshots 35d-gunsmith, 36d-gunsmith-mods, 36e-mod-fitted, 36f-hotbar-chip, 06-pistol reviewed.

**Numbers:** 453 unit tests (new tests/mods.test.ts: 15, sprites: 1), e2e all green (new: Gunsmith moves in + hint, E opens its chip rows, BUILD fits overcharge and raises pistol damage), bundle 275 kB (94.7 kB gzip).

**Next:** Scientist research tree (needs room space: base strip holds 3 rooms comfortably), TRADE tab grouping per robot, then farming.

**Known issues:** base strip (15x10) fits about 3 robot rooms; upgrade BUY rows refuse while you shop upstairs off the pad; TRADE has 21 rows (scrolls); DAILY still replaces the world without a confirm; turrets draw 1 power even when idle; mounted screens stay up if their wall is removed; the merchant hovers inside whatever is built over the right end of the pad; piercer chip does nothing extra on the rail rifle (already pierces).

## 2026-11-12 Scheduled run 25

**Done:** baseline green (453 tests). Creative review: hits had no weight (05-blade) and TRADE had grown to 21+ rows of mixed robots. Enemies now squash flat on the hit frame and spring back (`hitSquash`, white flash only the first 60%; 05b-hit-squash). Backlog: base strip widened from 15x10 to 33x16 so four or more robot rooms fit; natural hill tiles inside it are skipped by base capture, raid value and raider chewing (`isBuilt` via `world.edits`); raiders enter 10 columns outside the strip (was 16). `findRooms` rewritten with a stamped visited buffer and leaked-pocket skipping (4.5 ms -> 0.23 ms per scan). Nova the Scientist (lavender coat, green goggles, bubbling flask) moves into the fourth room and studies 7 permanent perks with prerequisites (save v16 `research`, migration + v15 fixture). TRADE tab grouped: header row per robot with its sprite portrait; robots not home fold to one header. Screenshots 05b-hit-squash, 35e-scientist, 36g-research, 36h-researched, 36-trade reviewed.

**Numbers:** 469 unit tests (new: research 8, tradegroups 2, base wide strip 4, hit squash 1, scientist sprite 1), e2e all green (new: hit squash frame, Scientist moves in + hint, E opens research, STUDY adds 40 battery), bundle 282 kB (97.1 kB gzip).

**Next:** farming (crops, watering, cooking, food buffs); robot happiness (mood lines, small comfort discount); P1.6/P1.7 follow-ups.

**Known issues:** upgrade BUY rows refuse while you shop upstairs off the pad; DAILY still replaces the world without a confirm; turrets draw 1 power even when idle; mounted screens stay up if their wall is removed; the merchant hovers inside whatever is built over the right end of the pad; piercer chip does nothing extra on the rail rifle; research rows only show while the Scientist is home (folded header says what to build).

## 2026-11-12 Scheduled run 26

**Done:** baseline green (469 tests). Creative review: damage had no weight (only a blink) and robots had nothing to feel. Hurt feedback: red screen-edge vignette scaled by damage, suit recoil squash, red damage number, slow red heartbeat under 30% HP (`hurtVignette`, 37b-hurt). Backlog: robot happiness (mood from comfort + neighbours; happy/delighted knock 1/2 off the biggest stack of trades, chips and perks, never above posted; mood lines; TRADE header shows mood; "was" prices; pink/gold/grey hearts float over awake robots; 36-trade, 36i-happy-heart). Farming slice 1: three crops (glowcorn, rustroot, frostberry) with kit seeds found in wild grass by biome, 2 stages of 60 s, 2x near a pond or sprinkler (new recipe), ripe gives 2-3 produce + 1-2 seeds; stage timers saved in the sapling diff (no save shape change). Cooking pot unlocks 3 meals with 3-minute buffs (Charged, Sturdy, Swift), HUD buff chips (41-farm, 41b-harvest, 41c-meal-buff).

**Numbers:** 494 unit tests (new: hurtfx 5, mood 8, farming 12), e2e all green (new: hurt vignette on/off, happy Trader trades at 7 rust, heart floats, right-click plants, drill harvests, pot unlocks chowder + buff), bundle 297 kB (101.9 kB gzip).

**Next:** farming follow-ups (robots water crops, sprinkler spray, crops kept with the base), P1.8 Together/Polish items (leaderboard, settings screen), P1.6 follow-ups.

**Known issues:** meal buffs end on reload; crops planted in the base are lost when the world resets on death (base tiles are kept, crops are not); the e2e farm uses raw tile ids (57-67); upgrade BUY rows refuse while you shop upstairs off the pad; DAILY still replaces the world without a confirm; turrets draw 1 power even when idle; the merchant hovers inside whatever is built over the right end of the pad.

## 2026-11-12 Scheduled run 27

**Done:** baseline: 494 unit tests green, e2e "happy heart" check failed (it polled 3 s for a heart that shows 1.4 s of every 4.5 s, so the 3.1 s gap could be missed); poll now covers two periods and logs robot state on failure. Creative review: the farm was a row of static stickers and toasts were long (41-farm). Crops now sway in a two-sine wind (taller stages more, neighbours out of phase), ripe ones twinkle, sprinklers throw droplet arcs (per-frame pass, 41d-farm-sway). Backlog: farming follow-ups done (base crops kept across worlds via `BASE_SAVE`, raids still use `BASE_KEEP`; meal buffs saved, v17; a happy/delighted robot waters every crop in the base strip; Dex seed packet; offline crop growth `growCrops` + welcome-back toast). Local world records (src/sim/records.ts, save v18): per shared code best depth, most loot in one try, fastest boss; gold toast + fanfare; workshop footer line (42-world-record). DAILY now needs a second tap (known issue fixed).

**Numbers:** 515 unit tests (new: cropfx 4, farming +9, records 8), e2e all green (new: farm sway, gardener, personal-best toast, DAILY confirm), bundle 302 kB (103.7 kB gzip).

**Next:** online leaderboard needs a hosting decision (NEEDS_FROM_USER); co-op spike; settings screen (volume, shake, colour-blind, text size); shorter toasts with icons.

**Known issues:** offline crop growth ignores robot gardeners (robots are derived after load); growing crops restart their current stage when the base moves to a new world; upgrade BUY rows refuse while you shop upstairs off the pad; turrets draw 1 power even when idle; the merchant hovers inside whatever is built over the right end of the pad; e2e farm uses raw tile ids (57-67).

## 2026-11-12 Scheduled run 28

**Done:** baseline green (515 tests). Creative review: surface dirt and scrap rock were one flat noise (carried over two runs) and harvest labels overprinted. Soil strata (src/render/strata.ts): wavy alternating bands that darken with depth, light seams at band edges, rare buried pebbles/bones/pipes/skulls in the top 22 rows, natural tiles only (`world.edits` skips built ones); e2e pit screenshot 43-strata. Floating text: repeat pickups merge ("+2 Glowcorn"), different labels stack instead of overprinting (41b-harvest). Backlog: settings screen slice 1 (cog button beside SOUND and on the title, O key; pauses; master/music/effects volume on separate audio buses, screen shake off/low/full, UI size normal/large/huge, sound toggle; phone layout stacks labels), save v19 prefs with v18 fixture test. Screenshots 43-strata, 44-settings, 44b-large-ui, 44c-mobile-settings, 06-mobile-play reviewed.

**Numbers:** 532 unit tests (new: strata 6, settings 7, floattext 4), e2e all green (new: strata pit, cog opens + pauses, steppers change scale/shake, Esc saves, HUGE fits a phone), bundle 309 kB (105.9 kB gzip).

**Next:** settings slice 2 (colour-blind palette, key remap, left-handed touch, reduce flashes); FTUE / achievements; mobile polish; co-op spike.

**Known issues:** strata bands are subtle under cave darkness; offline crop growth ignores robot gardeners; growing crops restart their stage when the base moves to a new world; upgrade BUY rows refuse while you shop upstairs off the pad; turrets draw 1 power even when idle; the merchant hovers inside whatever is built over the right end of the pad; e2e farm uses raw tile ids (57-67).

## 2026-11-12 Scheduled run 29

**Done:** baseline green (532 tests). Creative review: pickups had no arc into the pack (carried two runs) and ore colours relied on hue alone. Pickup flyers (src/ui/flyers.ts): every pickup's icon pops up and arcs into its hotbar slot (or the bag), bursts stream with a stagger, the slot rings on landing (41e-pickup-fly). Backlog settings slice 2: ORE AND HAZARD MARKS (src/render/glyphs.ts: = :: + x diamond on iron/copper/circuit/plasma/core ore, ! and triangle on acid/magma surfaces; 45-ore-marks), FLASHES REDUCED (no hurt blink, enemy white flash or boss strobe; vignette capped at 0.22), TOUCH MOVE STICK LEFT/RIGHT for left-handed play (`inStickZone`, hint follows; 06b-mobile-lefty). Settings rows shrink to fit short screens (44c-mobile-settings). Save v20 (oreMarks, flashes) and v21 (stickSide) with v19/v20 fixture tests.

**Numbers:** 545 unit tests (new: flyers 7, glyphs 3, settings +3), 129 e2e checks all green (new: harvest flyers land, ore marks + reduced flashes on/off, stick side), bundle 313 kB (107.3 kB gzip).

**Next:** settings slice 3 (key remap, mirrored HUD for left-handed touch); FTUE / achievements / codex; mobile polish; shorter icon toasts.

**Known issues:** left-handed stick zone overlaps the right HUD button column (buttons win the tap); ore marks are 5 px and can be hard to see at the smallest scale; strata bands subtle under cave darkness; offline crop growth ignores robot gardeners; growing crops restart their stage when the base moves; upgrade BUY rows refuse while you shop upstairs off the pad; turrets draw 1 power idle; e2e farm uses raw tile ids (57-67).

## 2026-11-12 Scheduled run 30

**Done:** baseline green (545 tests). Creative review: toasts were full sentences stacked mid-screen over the play area (carried 3 runs, 11-biome-crystal). Toasts are now at most 2 left-aligned pills under the HUD text: colour accent bar, vector icon per kind (pin, plus, star, warning, house, info), "Discovered:"-style prefixes as a small head label, body wrapped to 2 lines, 0.18 s slide-in (src/ui/toastfx.ts; 46-toasts, 46b-mobile-toasts). Backlog settings slice 3: CONTROLS page (desktop) remaps 15 actions (src/sim/keys.ts; click a key then press the new one, a used key swaps over, Esc/Tab reserved, RESET KEYS; arrows and Space always move; first-minute hint names bound keys; save v22 `settings.keys` with v21 fixture; 47-controls, 47b-controls-armed). Left-handed touch mirrors the HUD: button column left, bars/depth/toasts right, clear of the right-hand stick zone (src/ui/hudlayout.ts; 06b-mobile-lefty). The night-sky e2e now samples right of centre (the top-left corner holds the toast column).

**Numbers:** 562 unit tests (new: toast 8, keys 7, hudlayout 5), 137 e2e checks all green (new: toast pills clear of buttons desktop + phone, CONTROLS lists 15, rebind jump to K and jump with it, Esc back, reset, mirrored HUD clear of stick zone), bundle 320 kB (110.3 kB gzip).

**Next:** FTUE (guided first 2 minutes), achievements (30+), codex screen; mobile polish (thumb-sized hotbar, hold-to-reel, safe-area insets).

**Known issues:** digits 1-0 and Minus (hotbar) are not remappable; toast kinds are guessed from the text (a new message family may get the info icon); a very long toast body shrinks its second line instead of truncating; ore marks are 5 px; strata bands subtle under cave darkness; offline crop growth ignores robot gardeners; growing crops restart their stage when the base moves; upgrade BUY rows refuse while you shop upstairs off the pad; turrets draw 1 power idle; e2e farm uses raw tile ids (57-67).

## 2026-11-12 Scheduled run 31

**Done:** baseline green (562 tests). Creative review: water and acid were flat translucent rectangles (17-water, 27-deep-layer). Living liquids (src/render/liquidfx.ts): travelling-wave surface crest with foam, drifting glints, darker deep cells, swaying caustic light bands, rising acid bubbles; surface cells leave the top 2 art px open in the chunk and the crest fills them per frame (17-water). Backlog: awards (44 achievements from game-event counters, AWARDS page in the inventory with progress bars and paging, Award toast + tiered chime; save v23 with v22 fixture seeded from stats/bosses/codex/research, unlocked quietly on load; 48-awards, 48b, 48c-mobile-awards). Guided goals: 7-step GOAL card above the toasts (drill, 15 m, bank, upgrade, chest, 3 kills, craft) read from the award counters; "Goal done" toast + chime (49-goal, 06-mobile-play).

**Numbers:** 579 unit tests (new: liquidfx 6, achievements 8, ftue 3), 144 e2e checks all green (new: water crest rolls, AWARDS page + paging + unlock toast, phone fit, goal card clear of buttons + advances), bundle 333 kB (114.9 kB gzip).

**Next:** codex screen (lore logs, enemy entries); cosmetic suit colours for gold awards; mobile polish (thumb hotbar, hold-to-reel, safe-area insets).

**Known issues:** drone mining counts toward the "mined" awards; awards have no reward yet beyond the star; caustic bands are vertical stripes (could wave); digits 1-0 not remappable; toast kinds guessed from text; ore marks 5 px; strata subtle in caves; offline crop growth ignores robot gardeners; crops restart their stage when the base moves; upgrade BUY refuses upstairs off the pad; turrets draw 1 power idle; e2e farm uses raw tile ids (57-67).

## 2026-11-12 Interactive session: garage and buildable vehicles (save v24)

**Done:** Garage kit (fabricator recipe) places a bay tile with a carport frame (plate back wall, metal roof). E opens the GARAGE panel: BUILD buggy, hoverbike, drill tank and Sky Jet from base storage, DEPLOY one beside the bay, and fit ENGINE / ARMOR / BATTERY parts (3 levels each). Vehicles are parked world objects: walk up (RIDE hint, RIDE button) and press V to enter; getting out parks it where you stop. New buggy (fast, rams enemies) and drill tank (digs two tiles ahead while driving) with string-row sprite art drawn at 1.5x; the GARAGE tile has door art. Garage vehicles were removed from the workshop GEAR tab. Save v24 migrates old owned vehicles to park beside the pad.

**Numbers:** 586 unit tests (new: garage 7), e2e adds 9 garage checks (place, open, build, part, walk up + ride, park, Sky Jet build + flight, drill tank and hoverbike sprites), all green; bundle 344 kB (118.4 kB gzip).

**Next:** the follow-ups at the end of BACKLOG P1.9.

**Known issues:** the drill tank is drawn behind the pilot; the e2e water-crest check failed twice and then passed, so it looks flaky (watch it).

## 2026-11-12 Scheduled run 32

**Done:** baseline green (579 tests). Creative review: cave darkness flattened every wall (carried 4 runs; 27-deep-layer, 17-water). Cave rim light (src/render/rimlight.ts): solid faces bordering lit, non-sky air get a 1 art px warm highlight, strongest toward the suit lamp, continuous along flat walls (50-rim-light, 27-deep-layer). Backlog: codex screen (CODEX beside AWARDS in the inventory; PLACES / CREATURES / LOGS tabs, paged, phone fit; kills per kind and logs read are new award counters, so no save bump; 51-codex, 51b, 51c, 51d-mobile-codex). Suit paints: 6 paints from the 6 gold awards, PAINT cycles them on the inventory preview, drawn over armour tier and crafted body armour (save v25 after the interactive session's garage took v24; 52-suit-paint, 51e-mobile-inventory). Fixed: the held-tool name overprinted the 5th tool slot in the inventory (now in the TOOLS header); the water-crest e2e flake (the pool settles a cell while the swimmer moves; it now finds the live surface).

**Numbers:** 599 unit tests (new: rimlight 5, codex 4, paints 4; garage 7 from the interactive session), 160 e2e checks all green (new: rims in a deep cave and a dug pit, codex tabs + kill/log reveal + phone fit, paint locked/unlocked/cycle), bundle 353 kB (120.3 kB gzip).

**Next:** mobile polish (thumb hotbar, hold-to-reel, safe-area insets); codex follow-ups; P1.9 garage follow-ups.

**Known issues:** rims are subtle in big open caves (by design: only lamp-facing faces are strong); awards still pay only a star except gold ones (paints); drone mining counts toward "mined"; digits 1-0 not remappable; toast kinds guessed from text; ore marks 5 px; offline crop growth ignores robot gardeners; crops restart their stage when the base moves; upgrade BUY refuses upstairs off the pad; turrets draw 1 power idle; e2e farm uses raw tile ids (57-67); drill tank drawn behind the pilot.

## 2026-11-12 Scheduled run 33

**Done:** baseline green (599 tests). Creative review: swimming had no splash or bubbles (carried 2 runs; 17-water). Splash and bubbles (src/render/fx.ts): crossing a water/acid/magma surface throws a droplet crown, surface foam and a flat ring sized by fall speed (`splashPower`), with a splash sound; the helmet leaks hollow air bubbles that wobble up while under (17b-splash). Backlog mobile polish: the UI draws inside safe-area insets (notch, home bar) read from env() through a probe element, hit rects stay in canvas px, `?inset=t,r,b,l` fakes them (06c-mobile-notch); HOLD REEL touch button while hooked reels the rope in (Controls.reel; 23b-mobile-reel). The water e2e now uses a sealed bedrock tank so flowing water cannot move the surface.

**Numbers:** 612 unit tests (new: splashfx 7, mobilepolish 6), 164 e2e checks all green (new: helmet bubbles, splash crown + ring, notch frame, hold reel), bundle 357 kB (123.1 kB gzip).

**Next:** codex follow-ups (log reader, robot/merchant entries, helmet/vehicle paints); P1.9 garage follow-ups; small stash gifts for bronze/silver awards.

**Known issues:** the full-screen panels fill only the safe frame (the world shows in the notch strip); rims subtle in big open caves; drone mining counts toward "mined"; digits 1-0 not remappable; toast kinds guessed from text; ore marks 5 px; offline crop growth ignores robot gardeners; crops restart their stage when the base moves; upgrade BUY refuses upstairs off the pad; turrets draw 1 power idle; e2e farm uses raw tile ids (57-67); drill tank drawn behind the pilot.

## 2026-11-12 Scheduled run 34

**Done:** baseline green (612 tests). Creative review: the grappling rope was a straight 1 px laser line (23-grapple). Rope feel (src/render/ropefx.ts): two-tone braided cord that sags with slack, a decaying twang on attach, a three-prong claw at the anchor, synth hook/unhook sounds (23-grapple, 23c-rope-slack). Backlog codex follow-ups: log reader (click a read log; PREV/NEXT through read logs in story order, ALL LOGS back, story strip of lit/dark cells; 51f-log-reader, 51h-mobile-log-reader) and a CREW tab (Bolt, Patch, Rook, Nova, Dex; met from the robots award keys `seen:npc:*`, Dex from seeing him or talking; present crew count as met for older saves; 51g-codex-crew). No save bump. P1.9 follow-up: the pilot sits inside the buggy and drill tank (hull redrawn over the pilot, pilot clipped at the floor pan; 22b-drill_tank, 22c-buggy).

**Numbers:** 620 unit tests (new: ropefx 5, codex +3), 172 e2e checks all green (new: rope cord drawn/cleared, slack sag, log reader open/next/all, crew tab, phone reader fit, tank hull over pilot), bundle 362 kB (124.9 kB gzip).

**Next:** helmet/vehicle paints; P1.9 follow-ups (plane with cargo, charge station); small stash gifts for bronze/silver awards; cave ambient occlusion.

**Known issues:** the log reader leaves empty space on desktop for these one-line logs; full-screen panels fill only the safe frame (world shows in the notch strip); rims subtle in big open caves; drone mining counts toward "mined"; digits 1-0 not remappable; toast kinds guessed from text; ore marks 5 px; offline crop growth ignores robot gardeners; crops restart their stage when the base moves; upgrade BUY refuses upstairs off the pad; turrets draw 1 power idle; e2e farm uses raw tile ids (57-67).


## 2026-11-12 Interactive session: driving and swimming graphics, Ash Dunes lava

**Done:**
- Swimming now has a real pose: the body leans head-first toward the swim direction (sinking is weighted less, so a sideways swim stays level), legs flutter-kick, the front arm strokes, the player treads water when still, and ripples spread on the surface.
- Vehicles: the pilot sits on the hoverbike and Sky Jet. Ground vehicles tilt to the slope (a wall counts as a one-tile step) and squash their suspension on hard landings; fliers pitch with their climb.
- New particles: wheel dust, exhaust, drill-tank sparks, hoverbike motes and a Sky Jet contrail.
- Lava: two basalt-lined lava pools per Ash Dunes band (new codex entry "Lava pool", orange map pin), and lava basins in the caves under the Ash Dunes from 25 m down.

**Numbers:** 629 unit tests (new: motion 6, lava 3; 2 updated for the new rules), e2e adds swim lean, buggy dust and lava pool checks plus screenshots 17c, 17d and 22d, all green; bundle 366.8 kB (126.8 kB gzip).

**Next:** the follow-ups at the end of BACKLOG P1.10.

**Known issues:** the stroke arm is small at phone scale; the tilt also rotates the RIDE/GET OFF state art; lava pools are placed before trees but rely on `used` to keep trees off the rim.

## 2026-11-12 Scheduled run 35 (docs written by run 36)

**Done:** cave back walls get a baked contact shadow where they meet solid blocks (src/render/ao.ts, chunk cache, diagonal chunk invalidation); SUIT / HELM / RIDE paint buttons on the inventory preview recolour suit, helmet and every vehicle hull (vehicleRemap); save v26 adds paintHelm and paintRide. The run stopped before its docs; run 36 recorded it.

## 2026-11-13 Scheduled run 36

**Done:** baseline green (636 tests). Creative review: surface lava read as striped orange water (a hot band per cell; 22d-lava-pool). Molten lava (src/render/lavafx.ts): a world-space ridged-noise crust (cooled plates, melt, hot veins, white-hot cracks) drifts slowly across cell edges, darker red with depth, and the air above surface lava shimmers (rows copied back onto the canvas nudged a whole art px; 22d-lava-pool, 22e-lava-close). Award gifts: every award pays a themed one-time stash gift on unlock (torches for mining, medkits for fights, crystal for exploring, seeds for farming...; silver/gold add gold circuits), shown as icons on the AWARDS cards and in the toast (48-awards, 48c-mobile-awards, 22c-buggy toast). Buggy wheels and tank treads now advance with distance rolled, not the clock.

**Numbers:** 652 unit tests (new: lavafx 8, awardgifts 5, wheelspin 3), 181 e2e checks all green (new: molten lava colours + shimmer rows, gifts on every award card, gift lands in stash with the toast, wheels track distance and stop), bundle 371 kB (129.2 kB gzip).

**Next:** lavafalls down Ash cliffs; swim animation for robot pets; P1.9 follow-ups (plane with cargo, charge station); longer lore logs.

**Known issues:** shimmer copies the canvas onto itself (cheap here, untested on a real phone GPU); old awards earned before gifts paid nothing (by design, no save change); the log reader leaves empty space on desktop; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67).

## 2026-11-13 Scheduled run 37

**Done:** baseline green (652 tests). Creative review: Ash Dunes lava sat flat with no drama (carried 1 run; 11-biome-ash, 22d). Lavafalls (src/sim/structures.ts `lavafalls`, render `drawLavafalls`, `fallShade` in lavafx.ts): one basalt crag per Ash band with a sealed 2-cell lava spring on top; the overflow pours down the sheer face as a drawn sheet of downward-scrolling streaks into a 3-wide basalt-lined catch pool, lights the face and ground, spatters and throws embers; the sheet is a light source, stops at any block put in its way (`lavafallSpan`, shared with the burn) and burns at half the pool's heat; codex place "Lavafall" (16 places) with an orange map pin (22f-lavafall, 22g-lavafall-close). Pets swim (src/render/petfx.ts): bob, head-first lean, paddle frames, air bubbles under, wake at the surface; pup paddles, scout bot folds its rotor and spins a rear prop, moth beats slowly (31b-pet-swim).

**Numbers:** 664 unit tests (new: lavafall 7, petfx 5; codex count 15 -> 16), e2e adds lavafall present / streaked sheet / burns and pet-swims checks (all green), bundle 376 kB (130.9 kB gzip).

**Next:** lava contact juice; Ash Dunes surface variety; first unchecked P1.6/P1.9 follow-ups (plane with cargo, charge station); longer lore logs.

**Known issues:** worldgen changed (lavafall crags), so existing saves' Ash Dunes regenerate with a crag midway (same as when lava pools were added); the player sprite flashed white in the 31b screenshot (hurt flash from the teleport, cosmetic test artefact); the log reader leaves empty space on desktop; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67).

## 2026-11-13 Scheduled run 38

**Done:** baseline green (664 tests). Lava contact juice (src/sim/game.ts `lavaBurn`, src/render/scorchfx.ts): every magma burn tick kicks the body up (LAVA_HOP 9), pools and lavafalls emit `sizzle` (embers, black smoke, a synth hiss), and the suit chars for SCORCH_T 1.2 s (soot-mixed palette, flickering embers, smoke curling off; 22h-scorched). Acid unchanged. Ash Dunes surface variety (src/render/ashfx.ts, render only): pale drift caps on exposed ash tops with a 4-tile seamless swell, calm ash specks are now pale cinders, and the heat lives in clustered glowing crust fissures that fade with depth (11-biome-ash). Frame-time probe: e2e times plain vs lava frames with a forced 1 px readback; it found the heat shimmer (per-row canvas self-copy) at 18 ms vs 6 ms plain; the shimmer now takes one scratch snapshot per frame (~7 ms, same as plain).

**Numbers:** 677 unit tests (new: lavajuice 8, ashsurface 5), 188 e2e checks all green (new: charred suit darker with embers, ash drifts and cracks drawn, frame time over lava vs plain), bundle 380 kB (132.7 kB gzip). Probe (headless software raster): plain 5.8 ms median, lava 7.7 ms.

**Next:** cinder cones (worldgen), the same probe for a boss fight and a storm, ruin weathering; P1.9 follow-ups (plane with cargo, charge station); longer lore logs.

**Known issues:** the hop can bounce a player who stands still in deep lava up and down until they swim out (intended flinch, watch for complaints); crack overlays are baked in the chunk cache, so they do not pulse; the log reader leaves empty space on desktop; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67).

## 2026-11-13 Scheduled run 39

**Done:** baseline green (677 tests). Creative review: up close, ruins were a grid of identical blue-grey plate panels (11b-ruin-weathered); the back wall was the real culprit, not the bricks. Ruin weathering (src/render/ruinfx.ts, render only, baked into chunks): ruin bricks get mortar cracks and chipped corners, soot washing down from exposed tops (always in the Ash Dunes), vines (icicles in the Frozen Spires, nothing in the Ash Dunes) hanging into the air below; untouched worldgen plate walls (ruins, towers) get water stains, rust run-off and panel cracks, player-built plates (in `wallEdits`) stay clean. Cinder cones (src/sim/structures.ts `cinderCones`, render `drawCones`): up to two per Ash band near the band ends, a stepped basalt cone with a sealed magma crater; it glows, smokes (`conePuff` plume leaning downwind) and spits embers; a block in the crater plugs it; codex place "Cinder cone" (17 entries), orange map pin (22i-cinder-cone). Frame-time probe reused for a boss fight (same spot with the boss hidden) and a dust storm (same spot in clear weather) via an e2e `timeFrames()` helper.

**Numbers:** 690 unit tests (new: ruinfx 8, cinder 5; codex count 16 -> 17), 193 e2e checks all green (new: ruin weathering, cinder cone glow + smoke, boss and storm frame probes), bundle 386 kB (134.8 kB gzip). Probes (headless software raster): plain 7.1 ms, lava 7.5, boss 7.1, dust storm 7.8 (clear 7.8).

**Next:** cone eruptions (telegraphed lava bombs), half-tile slope caps on diagonal edges, merge the award + discovered toasts; P1.9 follow-ups (plane with cargo, charge station); longer lore logs.

**Known issues:** worldgen changed again (cinder cones), so existing saves' Ash Dunes regenerate with cones near the band ends; cones look stepped (tile grid); the e2e boss probe hides the boss by nulling `game.boss` for 60 frames; the log reader leaves empty space on desktop; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67).

## 2026-11-13 Scheduled run 40

**Done:** baseline green (690 tests). Creative review: arriving somewhere new stacked three dark panels over the world (goal, discovered, codex reward, often plus an award; carried 3 runs), and the cinder cones were scenery. Arrival toasts merge (src/ui/toastfx.ts `mergeTarget`/`extraLine`): a discovery, its codex gift and the award it unlocks within 1.2 s fold into one pill as small coloured follow-up lines ("+ 2 Crystal", "Award: Scout! +4 Crystal"; 46-toasts-merged, 46b-mobile-toasts-merged). Cone eruptions (src/sim/eruptions.ts, game `stepEruptions`): a live cone within 36 tiles rumbles every 26-48 s; 2.4 s of warning (glow swells and flickers faster, a magma bead rises in the mouth, tremor, smoke, low growl), then 4-6 lava bombs fan out both ways in slow arcs with a glowing landing mark each; a hit or splash burns (12, chars the suit, knocks back); bombs never break blocks; a plugged crater stays quiet (22j-cone-rumble, 22k-cone-erupt).

**Numbers:** 703 unit tests (new: toastmerge 5, eruptions 8), e2e adds merged arrival pill (desktop + mobile), cone rumble telegraph, bombs + landing marks drawn (all green), bundle 392 kB (136.9 kB gzip).

**Next:** half-tile slope caps on exposed diagonal edges; slimmer goal card; longer lore logs; P1.9 follow-ups (plane with cargo, charge station).

**Known issues:** tall cones put the top of the bomb arcs above the screen when the player stands at the foot (the marks still warn; 22k); an eruption can start 12 s after reaching a cone on a fresh dive (by design, so players meet it); bombs pass through the player's i-frames silently; the log reader leaves empty space on desktop; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67).

## 2026-11-13 Scheduled run 41

**Done:** baseline green (703 tests). Creative review: every surface bump needed a jump and hills read as stair-steps (carried 2 runs; 11-biome-frost, 11-biome-jungle). Slope caps (src/render/autotile.ts `slopeShape`/`slopePixel`, atlas gains 2 shapes): natural-ground corners on a one-tile staircase render as 45 degree half-tile caps; moss, snow and ash drifts follow the diagonal, strata shade and cave rims skip the cut, surface slopes show sky instead of their back wall (11c-slopes). Auto-step (src/sim/physics.ts `stepUp`): a grounded walker pressed into a one-tile ledge with headroom climbs it (85% speed kept), the drawn body eases up over ~0.1 s (`game.stepLift`), soft scuff sound; two-tile walls, low ceilings, swimming, ropes and the Sky Jet are unchanged. Codex places get a field-guide note once found (`POI_NOTES`); the cinder cone warns about eruptions and says a block plugs the crater.

**Numbers:** 713 unit tests (new: slopes 8, codex notes 2), 199 e2e checks all green (new: slope caps drawn, walk up a real staircase without jumping, codex note shown), bundle 394.5 kB (137.8 kB gzip).

**Next:** enemies and pets auto-step; slope caps on cave ceilings; slimmer goal card; longer lore logs; P1.9 follow-ups (plane with cargo, charge station).

**Known issues:** slopes are render-only, so a player standing on the outer half of a cap floats up to half a tile above the drawn diagonal (the auto-step makes walking over them smooth); the drill tank now climbs one-tile steps instead of drilling them (dig by aiming still works); tall cones put bomb arcs above the screen from the foot; the log reader leaves empty space on desktop; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67).

## 2026-11-13 Scheduled run 42

**Done:** baseline green (713 tests). Walker auto-step (src/sim/enemies.ts `enemyStepUp`, render ease via shared `stepEase` in physics.ts): crawlers, vine stalkers, mites and hulks climb one-tile ledges instead of turning back, walk down one-tile drops and turn only at real cliffs; raiders hop only taller walls (11d-crawler-step). Pets fly, so they needed nothing. Slim goal card (src/ui/hudlayout.ts `goalCardLayout`): a "2/7" badge, the step text and the count on one row with a hairline progress bar, 33 px tall vs ~55 (49-goal, 06-mobile-play). Cave-ceiling slope caps (autotile `SLOPE_CR`/`SLOPE_CL`, atlas 18 -> 20 shapes, shaded cut). The Scrap layer's rock is metal, which never sloped, so natural metal slopes now; player-placed blocks (any tile in `world.edits`) stay square (11e-cave-ceiling).

**Numbers:** 725 unit tests (new: enemystep 5, slim goal card 3, ceiling slopes 4; raids test updated on purpose: patrollers step one tile, still turn at two), 201 e2e checks all green (new: slim goal row, crawler auto-steps the staircase, ceiling caps drawn), bundle 396 kB (138.4 kB gzip).

**Next:** icon HUD buttons; underground contrast (back wall vs rock); physical slopes; longer lore logs; P1.9 follow-ups (plane with cargo, charge station); P1.6 follow-ups.

**Known issues:** player-placed soil/rust no longer slopes (it used to; built = square is the rule now); slopes are render-only, so the player floats up to half a tile over a cap; patrolling walkers now wander over hills further than before (watch spawn density near the pad); tall cones put bomb arcs above the screen from the foot; the log reader leaves empty space on desktop; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67).

## 2026-11-13 Scheduled run 43

**Done:** baseline green (725 tests). Creative review: the right-hand HUD was a column of wide text buttons (carried 1), logs were one line each (carried 8), and the player floated up to half a tile over slope caps. Icon HUD (src/ui/hudbuttons.ts data, src/ui/hudglyphs.ts drawing): square code-drawn glyphs two wide with the cog (speaker/note/cross, folded map, house, beam with a rising charge fill, drone, wrench+hammer with a "!" badge when an upgrade is affordable, pickaxe/block, buggy/get-off, hook, chevrons), bound key in the corner on desktop, at least 44 px on touch; the column is ~80-100 px wide instead of ~190 (08b-back-wall, 06d-mobile-icon-hud). Longer lore logs (explore.ts `LORE_MORE`): every log gains 2-3 lines telling the survey team's story; the reader draws them as paragraphs (fills the empty desktop reader; 51f-log-reader). Feet follow slope diagonals (autotile `slopeSink`/`nextSink`, renderer `footSink`): render-only, seamless off the low end (11f-slope-walk).

**Numbers:** 739 unit tests (new: hudbuttons 8, long logs 2, slope sink 4; codex logParts test updated for the new `more` field), 205 e2e checks all green (new: desktop square glyph buttons, mobile two-wide grid >= 44 px, dig/build glyph toggles mode, reader shows 4+ lines, feet sink half a tile mid-cap), bundle 403.6 kB (141.5 kB gzip).

**Next:** per-layer back walls (Circuit open caves read brighter than its solid blocks, 27-deep-layer); enemies follow slope diagonals; desktop hover labels for HUD glyphs; lore placed in story order by depth; P1.9 follow-ups (plane with cargo, charge station).

**Known issues:** glyph buttons have no text, so a new desktop player learns them by trying (key hints help); enemies still float over caps; tall cones put bomb arcs above the screen from the foot; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67).

## 2026-11-13 Scheduled run 44

**Done:** baseline green (739 tests). Creative review: in the Circuit layer the lit open cave (rust back wall) read brighter than the solid rock (27-deep-layer, carried 1), and the hurt flash was a flat white silhouette every other frame (27c). Per-layer cave back walls (src/render/sprites.ts `LAYER_WALL_LOOK`/`wallRow`, render only, baked in chunks): natural cave walls in Circuit become a dark board mesh with traces and a solder dot, Plasma a basalt with dim magenta veins, Core an obsidian with violet veins; plates unchanged. Enemies follow slope diagonals (renderer `enemySinks`, per-id eased sink like the feet). Desktop hover labels for HUD glyphs (`hoverLabel` in hudbuttons.ts; "Map (M)", 06e-hud-hover). Lore in story order by depth (explore.ts `loreIndexAt`: shallow terminals hold early logs, a read log gives way to the nearest unread). Hurt flash tints the suit red (scorchfx `hurtRemap`, 05c-hurt-tint).

**Numbers:** 754 unit tests (new: layerwalls 4, hudhover 3, loreorder 6, hurttint 2), 208 e2e checks all green (new: crawler drawn on the cap diagonal, hover label on/off, red hurt tint not white), bundle 406.6 kB (141.1 kB gzip).

**Next:** surface dirt cross-section detail; Junk Colossus art pass; old toasts fade to a ghost line; deep-cave floor rim light; P1.9 follow-ups (plane with cargo, charge station).

**Known issues:** the hurt tint shows the held tool (it used to vanish with the white flash); lore order depends on terminal depth, so a player who only digs shallow reads logs 1-3 first and the rest later (by design); enemies use the same sink rule as the player, so a hulk wider than a cap still sinks by its centre; tall cones put bomb arcs above the screen from the foot; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67).

## 2026-11-13 Scheduled run 46

**Done:** baseline green (767 tests). Creative review: the surface dirt was still a flat orange noise field for the first tiles (26-boss, carried 2), the boss slam landed with only a generic burst and a shake (carried 1), and long toasts (gate opened, boss down) kept a full pill over the top-left quarter of the world (carried many). Shipped all three. Boss slam impact (src/render/fx.ts `slamImpact`/`slamFistOffset`/`lighten`, event `bossslam` now carries `halfW`+`accent`): a flat pale shockwave ring grows to SLAM_RADIUS so you see exactly where it hurt, an inner accent ring, rolling dust both ways in the ground colour and junk chunks thrown up from where each fist lands (26c-boss-impact). Topsoil cross-section (src/render/strata.ts `topsoilShade`/`rootThreads`, renderer passes a warm-soil flag): rust/soil/sand get a darker organic top band in their first 4 rows and fine wandering root threads in the first 6 rows (frost/metal unchanged; 43-strata). Old toasts fold to a one-line ghost (src/ui/toastfx.ts `toastGhost`/`ghostText`, ui.ts `drawGhostToast`): a toast older than 2.5 s folds over 0.25 s to a faint colour-dot strip with one short line; default 2.4 s toasts never ghost.

**Numbers:** 776 unit tests (new: slamfx 4, toastghost 3, strata topsoil 2), e2e adds the slam shockwave check, a root-thread chunk count and a toast-ghost layout check (all green, 216 checks). Bundle 414.7 kB (143.7 kB gzip). Boss frame probe unchanged.

**Next:** soft rim light on deep-layer cave floor edges (last P1.10 follow-up); per-boss art pass for the Crystal Golem and Frost Titan (still plain rects); arrangeable hotbar (P1.6); run-summary/share card (P4).

**Known issues:** root threads are render-only decals on mask-0 (full) soil tiles, so an exposed single-tile-wide soil wall shows none (they read on the bulk mass, which is what the player sees); the ghost strip still counts toward the 2-pill cap, so a third fresh toast still drops the oldest; only the Junk Colossus has slam-impact juice (the other bosses reuse the generic burst until their art pass); tall cones put bomb arcs above the screen from the foot; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67, 69/70).

## 2026-11-13 Scheduled run 45

**Done:** baseline green (754 tests). Creative review: the Junk Colossus was a brick block with eyes whose slam telegraph was only a body lift (26-boss, carried 1). Colossus art pass (src/render/bossart.ts `slamRaise`/`armAngle`/`plateSwing`, rig parts `arm`/`dangle`): junk fists ride both arms, the arms swing overhead over the 0.7 s slam warning and stay up while airborne, a loose hip plate swings and jolts, a furnace grate in the chest breathes (brighter enraged or winding up; 26b-boss-slam). Backlog P1.6 follow-ups: ice fishing (Frozen Spires ponds freeze, new `T.ICE` 69, solid and see-through; the rod fishes the water under the ice through a drawn hole; ice catch table gives icefin, new food 35 hp + 20 battery; 19b-ice-fishing) and jump pads (`T.JUMP_PAD` 70, fabricator 2 metal + 2 copper wire for two; standing on one launches ~12 tiles without holding jump, down stands on it, the landing after a launch is cushioned; plate squashes and wobbles, boing; 20b-jump-pad).

**Numbers:** 767 unit tests (new: bossart 2, icefishing 6, jumppad 5; biomes pond test now accepts ice over water), 213 e2e checks all green (new: Colossus arms overhead vs idle, furnace glow, frozen pond cast + hole + catch, pad launch 11.9 tiles beside a sky island), bundle ~412 kB (~144 kB gzip). Boss frame probe 8.4 ms vs plain 6.3.

**Next:** boss slam impact (dust ring, debris); surface dirt cross-section; arrangeable hotbar; toasts fade to a ghost line; P1.9 follow-ups (plane with cargo, charge station).

**Known issues:** worldgen changed (frost ponds freeze), so existing saves' frost ponds get ice; pond ice drops nothing when mined (water below is then open); jump pads relaunch on every landing on them (bouncy by design; hold down to stand); a launch under a low ceiling bonks the head; the white warn flash still hides the furnace on alternate frames during a wind-up; tall cones put bomb arcs above the screen from the foot; full-screen panels fill only the safe frame; drone mining counts toward "mined"; digits 1-0 not remappable; e2e farm uses raw tile ids (57-67), e2e now also uses 69/70.


## 2026-11-13 Scheduled run 47

**Done:** baseline green (776 tests). Creative review: deep Circuit caves still read as one flat tone with a barely visible floor edge (27-deep-layer, carried 2), and the build bar order was fixed (carried 3). Deep-layer floor glow (src/render/rimlight.ts `LAYER_RIM`/`rimColor`/`floorGlowBands`, renderer `drawRims`): rims take each layer's colour (circuit green, plasma pink, core violet), lit top faces in deep layers get three fading rows below the edge (27d-floor-glow). Arrangeable build bar (tiles.ts `hotbarOrder`/`moveInHotbar`, game `hotbar`/`moveHotbar`, save v27 `hotbar`): select a placeable in the inventory, press < or > to swap it with its bar neighbour, a preview strip shows the bar; cycling the held block follows the order; new placeables append (18b-hotbar-arrange, 51i-mobile-bar-arrange).

**Numbers:** 787 unit tests (new: floorglow 4, hotbar 9; paints test's pinned SAVE_VERSION moved 26 -> 27 on purpose), 220 e2e checks (new: floor glow count, inventory < reorders + saved, mobile item details + arrange buttons fit inside the panel and are >= 44 px; the phone inventory panel is now taller (u*50) because HOLD/DROP used to spill below it), bundle 416.6 kB (145.8 kB gzip).

**Next:** keys 6-0 pick arranged bar slots; touch long-press on hotbar slots; Crystal Golem / Frost Titan art pass; run-summary card (P4); P1.9 follow-ups (plane with cargo, charge station).

**Known issues:** digits 6-0 and - still select fixed placeables (rust, metal, torch, ladder, scaffold, wall), not the arranged slots; the bar preview strip shows at most what fits the panel width, centred on the selected item; only the Junk Colossus has slam-impact juice; tall cones put bomb arcs above the screen from the foot; full-screen panels fill only the safe frame; drone mining counts toward "mined"; e2e farm uses raw tile ids (57-67, 69/70).

## 2026-11-13 Scheduled run 48

**Done:** baseline green (787 tests). Creative review: in the Circuit layer the suit read as a flat warm cut-out against the green cave (27-deep-layer, carried 1), keys 6-0 still picked fixed blocks (carried 1), touch item actions needed the inventory. Layer ambient on the suit (src/render/ambient.ts `layerAmbient`/`ambientRemap`, render only): circuit green, plasma pink, core violet, none on the surface or in Scrap; hurt flash still wins, scorch is lit too (27e-layer-ambient). Keys 6-0 and - pick visible bar slots 1-6 in the arranged order (tiles.ts `barSlotItem`/`BAR_SLOT_KEYS`, game `selectBarSlot`), with key hints on the slots and in the first-minute hint. Touch long-press on a bar slot (src/platform/longpress.ts): tap selects, holding 450 ms fills a gold ring and opens the inventory with that item's actions; sliding 14 px cancels (51j/51k-mobile-long-press).

**Numbers:** 796 unit tests (new: ambient 4, bar slots 2, longpress 3), 224 e2e checks all green (new: keys 6/7 pick slots, '-' picks the wall once arranged into slot 6 (replaces the fixed '-' = wall check), suit green-red shift vs ambient off, long-press ring + open), bundle 419.0 kB (146.6 kB gzip).

**Next:** Crystal Golem / Frost Titan art pass + impact juice; layer ambient on enemies, pets and NPCs; run-summary card (P4); P1.9 follow-ups (plane with cargo, charge station).

**Known issues:** digit keys 6-0 are not remappable (tools 1-5 neither); at the pad, carried non-kit blocks (rust, metal, soil) bank instantly, so they vanish from the bar there; only the player gets the layer ambient; only the Junk Colossus has slam-impact juice; tall cones put bomb arcs above the screen from the foot; full-screen panels fill only the safe frame; drone mining counts toward "mined"; e2e farm uses raw tile ids (57-67, 69/70).

## 2026-11-13 Scheduled run 49

**Done:** baseline green (796 tests). Creative review: the Crystal Golem and Frost Titan were still plain rounded boxes with eyes (carried many), and enemies/pets/NPCs kept surface colours next to the now-tinted player (carried 1). Shipped both as the visible improvements. Golem and Titan art pass (src/render/bossart.ts): new `wedge` torso (broad shoulders tapering to a waist) and `drip` (icicle) part shapes; both bosses get fists on each arm end (crystal gems for the Golem, ice blocks for the Titan) that ride the arm swing, and a glowing chest heart (`coldHeart`: the Golem's pulsing faceted geode, the Titan's frost rune). The Golem grows four tall leaning crystal clusters off its back and shoulders plus a head crown, all twinkling (`glint`); the Titan has big swept ram horns, a three-icicle beard under the visor, icicles on the torso hem and pale frost breath drifting from the mouth (`frostBreath`). A slam now throws glittering shards in the boss's colours (`slamShards` + fx). Layer ambient reaches enemies, pets and base robots (src/render/ambient.ts `litRemap` + `GLOW_KEYS`, renderer `ambientAt`): the deep-layer light (circuit green, plasma pink, core violet) lights their bodies like the player's while glowing eyes/lights keep their own colour; `ambientColor` is now memoised per Ambient so relighting many sprites stays cheap.

**Numbers:** 802 unit tests (new: bossart golem/titan + wedge/drip + slamShards 3, ambient sprites 3), 226 e2e checks all green (new: Golem geode + white shards on a slam, Titan frost rune + ice shards, enemies pick up the green cave light). Bundle ~420 kB (~147 kB gzip). Screenshots: 26d-golem, 26e-titan, 27f-enemy-ambient.

**Next:** impact/telegraph juice for the ranged bosses (Vine Queen volley/summon, Ash Wyrm charge) and the Hollow AI arena; run-summary / share card (P4, biggest retention lever); keep carried placeable blocks from auto-banking at the pad.

**Known issues:** the boss frame probe adds the per-part swung()/glint draws (watch ~8-9 ms vs 6 plain; cache the glint if it climbs); only melee slammers have slam shards; the Hollow AI still has no art pass beyond its core disc; tall cones put bomb arcs above the screen from the foot; full-screen panels fill only the safe frame; drone mining counts toward "mined"; e2e farm uses raw tile ids.

## 2026-11-13 Scheduled run 50

**Done:** baseline green (802 tests). Creative review: the ranged boss attacks (charge, volley, summon) had only the white flash and a "!" as a telegraph, and a dive ended with a bare red toast (no payoff). Ranged-boss telegraphs (src/render/bosstele.ts, render only): a charge wind-up paints a red lane with chevrons scrolling toward where the dash ends (clamped to the arena) and a dashed end post; the dash leaves speed streaks plus dust (walkers) or embers (flyers) behind (Fx.bossCharge); a volley wind-up swells an accent orb at the muzzle (drawn over the art) with motes drawn in; a summon opens glowing cracks with swaying sprouts at each minion spot (26f/26g/26h/26i). Dive report (src/sim/divereport.ts): the game folds events into a per-world tally; the death event carries it with items lost and a new-record flag; the UI shows a SIGNAL LOST card with a dive title by layer, the non-zero rows, NEW DIVE and SHARE (04b-dive-report).

**Numbers:** 813 unit tests (new: bosstele 6, divereport 5), 233 e2e checks all green (new: charge lane reds, dash streaks + particles, muzzle orb whites, summon sprouts, dive card + NEW DIVE closes). Bundle 430 kB (149 kB gzip). Boss frame probe 7.3 ms vs 5.5 plain.

**Next:** Hollow AI art pass + arena; bolt trails; dive stats on the share card and a report on beam-home; P1.9 follow-ups (plane with cargo, charge station); equipment slots (P3).

**Known issues:** dive tally lives in memory, so a reload mid-dive restarts it (world persists); the dive card shows only on death; SHARE from the card shares the fresh pad view with lifetime stats; summon sprouts draw under the boss body; the game keeps running behind the card (safe at the pad); tall cones put bomb arcs above the screen from the foot; drone mining counts toward "mined"; e2e farm uses raw tile ids.

