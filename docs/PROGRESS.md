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
