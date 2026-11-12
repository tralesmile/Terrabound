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
