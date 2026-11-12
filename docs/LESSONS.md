# Lessons (mistakes made and the guard added; read before starting)

- **Test setup bugs look like game bugs.** Five early failures were test-world issues (side walls above the surface, unminable pad tiles, auto-bank emptying test loot). Guard: use the `standOnSurface` helper and set state explicitly in tests.
- **Vitest swallows console.log.** Use `process.stdout.write` when debugging; delete debug files after.
- **Never use sed to rewrite files with complex content.** It mangled a file once; rewrite with Write instead.
- **Mobile layout needs a screenshot.** Text overflow and footer overlaps only showed in the 360 px screenshot. Guard: e2e saves mobile screenshots; look at them after any UI change.
- **Touch detection must happen at boot**, not on first touch, or the title shows desktop hints. Guard: e2e touch check.
- **`gh` auth may be broken.** Use plain `git push`; do not rely on PRs.
- **Typecheck with `@types/node`** is required for tests that use Buffer; `types` in tsconfig lists it.
- **Commit after every green slice** so a usage-limit stop never loses work.
- **Branch setup:** a fresh clone is on `main`; the runbook's `git checkout dev` fails until `git checkout -b dev origin/dev`. Use that.
- **Tool names are case-sensitive** (`Bash`, not `bash`).
- **Test worlds are solid rock.** Projectile/enemy tests need an open corridor; use `openCorridor` in tests/enemies.test.ts instead of assuming air.
- **Auto-bank eats crafted items.** Crafting at the base put items in the pack, which the base banked straight back. Guard: `kit` flag on ItemDef (banking skips kit items) plus a unit test; any new craftable gear must set `kit: true`.
- **Shop panel text can clip under buttons.** Pass a `maxW` to `text()` for any row with a right-side button.
- **Adding items widens the hotbar and stash row.** Slot sizes are now computed from the item count, but adding more than ~10 placeables will need a scrolling bar. Guard: always view 06-mobile-play.png and 09-mobile-shop.png after adding an item.
- **Sim bots need latches, not float thresholds.** A balance bot flipped between "walk" and "dig" at a 10.0-tile boundary because centring jitter crossed it every frame, silently resetting mining. Guard: one-way `leftPad` latch; when a bot test shows 0 progress, print per-frame state before touching game numbers.
- **Check whether a number is a game problem or a bot problem before tuning.** Balance changes only after the bot was verified to dig correctly.
- **`git stash` ignores untracked files**; do not rely on it to isolate a new test file.
- **The repo moved to `tralesmile/Terrabound`** (git prints a redirect warning on push; pushes still work).
- **Tests that name upgrade ids must use real `UpgradeId`s** (`pick`, not `drill`); tsc catches it, so run `npx tsc --noEmit` before the full gate.
- **Hotbar width is now bounded by owned items**, not the PLACEABLE table; keys 4+ still index the full table, so a key for an unowned item selects it (shows slot with 0).
- **Jump height is ~2-3 tiles.** A test placing a platform 5 tiles above the feet never lands; derive geometry from a measured jump apex, not a guess.
- **Sprite maps drift in width.** Guard: tests/sprites.test.ts checks row widths and palette keys; review `e2e/out/10-gallery.png` after art edits.
- **A piped gate lies.** `npm run check 2>&1 | grep ... && git commit && git push` pushed a red build to main because the `&&` saw grep's exit code. Guard: `npm run ship` (scripts/ship.sh, `set -euo pipefail`) is the only push path; if you capture logs, redirect to a file and check `$?`.
- **Long sims need an explicit timeout.** The balance bot ran ~4-5 s against vitest's 5 s default and flaked under parallel load. Guard: heavy simulation tests pass a timeout (30 s) as the third `it` argument; never shrink their assertions instead.
- **Odd sprite heights break chunk maths.** Debris chunk centres for a 7-row sprite landed below the feet; use `min(h, r0 + chunk)` and test bounds on every sprite.
- **Check light/occlusion maths before writing the test.** A 1-tile pillar costs only 2x air, so light bleeds through it by design; occlusion tests need walls thicker than SOLID_COST/AIR_COST allows.
- **Bigger worlds break fixtures that hard-code rows.** Tests used `body.y = 40` and "no torches in a fresh world". Guard: derive positions from `world.padY` / `surface[x]` and compare counts relative to a baseline.
- **A bot that targets unreachable ore stands still forever.** The balance bot "got worse" when the world changed only because it locked onto ore out of reach. Guard: the bot filters by REACH and retreats at low HP; check the bot's own behaviour (print per-dive time/depth) before blaming the game.
- **Structures that extend in one direction need side-aware offsets.** Left-side ruins overlapped the pad clear zone. Guard: test asserts every surface structure is outside PAD_CLEAR.
- **E2e that teleports the player must wait for the camera.** The camera eases; aiming the mouse right after a teleport hits the wrong tile. Guard: `waitForFunction` on camX before converting tiles to screen.
- **Shared-VM timings are noisy (2x swings).** Perf checks are coarse regression guards (12 ms/frame headless), not the 60 fps budget; measure with a warm cache and repeat before optimising.
- **Commit messages with double quotes break `git commit -m "..."`.** Guard: write the message to a file and use `git commit -F`.
- **Cellular liquid rules can settle into staircases or stranded puddles.** Guard: tests assert volume conservation, flat-within-1 settling and draining into a dug hole; the row scan only moves to strictly lower spots so settled pools never jitter.
- **A screenshot caught "Cost: 3 undefined"** after adding items. Guard: a test renders a cost label for every item id.
- **Test loops must cover the simulated time they assert on.** My smelter test ran 6.5 s of a 6 s/unit process and expected 2 units; derive the loop length from the constants (`SMELT_TIME * n`).
- **Check that a backlog item has a purpose before building it.** "Storage chest" had no job because the stash is unlimited; I dropped it and wrote down why instead of shipping a dead feature. Guard: read DESIGN rules for the thing a feature would change before slicing it.
- **Sim must stay clock-free even for offline progress.** `Game` never calls `Date.now`; the wall clock is passed into `applyOffline(now)`/`toSave(now)` from main.ts, and the stamp is consumed once so a reload cannot double-pay. Guard: tests for skew, cap, and double application.
- **Worldgen-heavy tests flake at vitest's 5 s default on slow VMs.** Guard: global `testTimeout: 30000` in vite.config.ts (assertions untouched).
- **A growing shop list silently clipped rows.** Guard: row height shrinks to fit; always view 09-mobile-shop.png after adding upgrades or recipes (next step: tabs/scroll past ~20 rows).
- **Shop panel is at capacity (18 rows at 360 px).** Guard: add tabs or scrolling before the next recipe/upgrade; view 09-mobile-shop.png each time.
- **Fresh clones may be detached with no local `dev`.** Guard: `git checkout -B dev origin/dev` before working (ship.sh requires branch dev).
- **Shop tabs added; limit is now ~12 rows per tab.** (now scrolls); view 09b-mobile-shop-fab.png.
- **Fabricator tab is now full (12 rows at 360 px).** Guard: add scrolling before the next recipe; view 09b-mobile-shop-fab.png.
- **Adding a field to `scanMachines` breaks `toEqual` fixtures.** Optional offline fields (`drones?`) keep old callers compiling; update exact-equality tests deliberately.
- **Check codes must use odd weights.** A first draft weighted positions 1..7, so even weights are not invertible mod 32 and some typos passed. Guard: the test now tries every single-character substitution and expects null.
- **Shop panel scrolls now (9 rows).** Adding rows is safe; still view 09/09b screenshots.
- **Duplicate `const` names in one long UI method fail tsc.** Guard: run `npx tsc --noEmit` before the full gate (already noted); use distinct names (`tbw`) for per-row widths.
- **Tile ids are shared across parallel work.** A new tile collided with ids another run had added (SAPLING vs SOLAR=27). Guard: tests/icons.test.ts asserts tile ids are contiguous and TILES has one entry per id; always append new ids at the end of `T`.
- **New surface features break fixed e2e spots.** Recall checks used `padX + 90`, which became a pond. Guard: e2e searches for a dry, open column instead of a fixed offset.
- **A Playwright `mouse.click` or `keyboard.press` can fall between two sim frames** (the sim only sees held state). Guard: in e2e, press, wait ~60-80 ms, then release for anything the sim must see as a press.
- **`npm run ship` is rejected when a parallel run pushed first.** Fix: `git fetch origin && git rebase origin/main` (dev and main are the same commit after every ship), then ship again.
- **`npm run check` takes over 2 minutes.** The default Bash timeout (120 s) killed it on run 12. Guard: run the gate and ship with an explicit 600000 ms timeout and log to a file.
- **New liquids need four touch points:** tile def (with `dps`), renderer liquid branch + light source, sprites TILE_COLORS, map colours. Grep `ACID_POOL` before adding one.
- **Rotating noise coordinates by a position-dependent angle shreds the pattern.** `x * cos(a(x, y))` changes by ~x * da/dx per tile, so seams turned into speckle. Guard: pick a fixed angle per region (SEAM_DIRS) and test shape (component elongation) rather than eyeballing; dump a region to PNG with PIL to look at worldgen.
- **E2e that stands the player in a deep layer can lose the world** (heat/magma death regenerates it). Guard: build the fixture right next to the player in the same evaluate, and restore HP first.
- **Order of liquid passes matters.** Cooling after flow let water slide off magma before reacting; reactions run before flow.
- **Liquid fixtures drain before the screenshot.** A found magma pocket had flowed away by the time the e2e looked at it, so the clip showed empty rock. Guard: build a sealed basin fixture right beside the player in the same evaluate, then screenshot.
- **E2e fixtures in the base leak into later checks.** Solar cells added for the drone check changed the smelter check's numbers. Guard: remove every tile a check placed in the base before moving on.
- **Tests that pin `SAVE_VERSION` with `toBe(n)` break on every bump.** Run 15 had to edit the v12 drone test. Guard: migration tests assert `toBeGreaterThanOrEqual(n)` and test the migration itself with an old fixture.
- **Sprite rows over the width are easy to type** (a 17-char drone rotor). The width test caught it; add every new sprite map to tests/sprites.test.ts the moment you write it.
- **Rule/role systems need a per-frame "acting" field** (`FieldDrone.act`) so the renderer and panel show what the drone does now, not its saved role; switching acts must drop half-finished targets.

- **Check a tile's `solid` flag before writing path/dock tests.** I assumed drone bays were solid; they are not (T.DRONE is minable, non-solid). Guard: tests that need a solid block place T.RUST themselves.
- **The world is open above row 0** (`get` returns air off the top, rock off the sides), so A* can route over a wall's top. Guard: path tests assert "detour" (length), not a specific route.
- **Hopping walkers jump over the thing they should attack.** Raiders hopped over a 1-tile block instead of chewing it. Guard: raiders with a chew target hold still (game.stepEnemies) and a test checks the block comes loose.
- **The pad clears all enemies every frame** (`atBase`). Any enemy meant to threaten the base must be exempt (raiders keep `e.raid`).
- **Ran `npm run check` without the 600000 ms timeout again (run 17)** and the shell killed it at 2 min. Guard: only ever run the gate through `npm run ship` or with `timeout: 600000` on the Bash call; never bare.
- **`damageEnemy` sets hit-stop**, so every automated hit (turrets, spikes) would stutter the game. Guard: pass `stop = false` for anything that is not the player's own hit.
- **A turret in MACHINE_TILES would grow the raid** (machines count double in baseValue) and punish defending. Defences are in BASE_KEEP only; a test asserts a turret leaves baseValue at 0.
- **Stale toasts contradicted each other** ("Raid repelled!" under a new "RAID!"). Guard: related messages share a toast group (`ui.toast(..., group)`), a test asserts replacement and the TOAST_MAX cap.
- **Locked shop rows still lit the SHOP ! badge** once a gate (raid blueprints) was added to buy(). Guard: any new purchase gate must be applied in `affordableUpgrades` too; the blueprint test checks buy is refused before the gate.
- **New gameplay gates belong in derived data when possible.** Blueprints derive from `stats.raids`, so no save bump; a test ties recipe/upgrade gates to `blueprintRaids`.
- **Ran `npm ci && npm run check` bare again (run 19)** and the shell killed it at 2 min, despite two lessons. Guard: the run prompt's step "npm ci && npm run check" must be issued as two calls, the gate with `timeout: 600000` and output to a log.
- **Derived state that announces itself needs a "first sync is silent" rule.** NPCs are derived from rooms each frame; without it every load would toast "moved in". Tests that expect the arrival event must step the game once before finishing the room.

- **Derived assignment by scan order reshuffles on change.** Rooms are scanned top-down, so a new room upstairs became "room 0" and the Trader moved house. Guard: syncNpcs keeps a robot's own room first, then hands free rooms to newcomers; tests/npcs "never makes the Trader move house".
- **"At base" is a 13-tile strip, but rooms can be wider or upstairs.** Anything a robot offers must use `canShop()` (pad or next to a robot), not `isAtBase()`; the workshop auto-close in main.ts uses it too.
- **Loose pack items vanish in e2e when an earlier check left a hauler drone running** (fish got banked, so a quick-heal check looked like a double eat). Guard: e2e fixtures that need pack items use kit items (medkit), or remove drone bays first.
- **Base HP regen (40/s on the pad) and repair drones hide heal amounts in e2e.** Guard: assert which item was consumed, not the exact HP.
- **Multi-cell tiles need every removal path to clear the partner.** Mining and raid chewing go through `removeTile` (wide.ts); explosions skip non-solid tiles. Any new removal path must call it too.

- **`Game` has no event subscription; tests read `g.drainEvents()`** after the steps (run 22 wrote `g.on(...)`). Also placing a tile in the player's own column is refused (`overlapsPlayer`), so placement tests stand the player off to the side.
- **Light tests need a source bright enough to reach the probe** (AIR_COST 4, SOLID_COST 8 per tile; TORCH_LEVEL 40). A level-24 source 6 tiles away reads 0 either way and the comparison is meaningless.

- **A plain Playwright `mouse.click` flaked the fishing check** (the lesson about frame-sampled input applied to clicks too). Guard: `holdClick(page, x, y)` in e2e/smoke.mjs; use it for any click the sim must see.
- **Anything new at the pad competes for E and the hint line.** The merchant took E from the drone bay and broke 4 drone checks. Guard: new interactables go after bays/chests in `interact()` and after base hints in `hintAutomation`; run the full e2e after adding one.
- **Two posted rates can loop into free goods** (5 biomass -> 3 seed, 4 seed -> 8 biomass = 1.2x). Guard: tests/merchant.test.ts checks every A -> B -> A pair over all robot and merchant rates loses.
- **Disabled buttons are not in `ui.rects`.** An e2e that counts TRADE buttons must give the stash enough to afford every row first.


- **The base strip is only 15 x 10 tiles (BASE_HALF 7, BASE_ROWS 10).** A third room stacked on two others is outside `findRooms`, so the Gunsmith test never saw it. Guard: tests build rooms side by side with `rowHomes` (tests/mods.test.ts); any 4th robot needs a wider strip first.
- **Things drawn before `drawDarkness` are dimmed by it.** Bolts looked dull in caves; anything that should glow (bolts, sparks) goes in a pass after the darkness (`drawBolts`).

- **Widening the base strip pulls natural terrain into "base" scans.** Hills inside the wider strip would have followed the player into new worlds, swelled raids and been chewed. Guard: every base scan that means "player-built" checks `isBuilt` (world.edits); tests/base.test.ts writes natural tiles straight into `world.tiles` and asserts they are ignored.
- **`findRooms` was already 1.8 ms per call** and runs on every world edit; Set-based flood fills were the cost. Guard: stamped visited buffer + leaked-pocket skip, and a perf assertion (< 2 ms) in tests/base.test.ts.
- **Tests that pin a growing list with `toEqual` break on content growth** (NPC_ORDER in mods.test). Pin the prefix you care about (`slice(0, 3)`).

- **New happiness discounts silently changed an existing e2e price check** (8 rust -> 7 at comfort 4). Guard: the e2e now reads the mood price through `game.tradeNow` and asserts both posted and mood price; any future price modifier must go through `tradeNow` / `npcPrice` so UI, sim and tests agree.
- **Crop timers reuse the sapling diff instead of a new save field.** It works because the tile at each index says which map it belongs to; tests/farming.test.ts reloads a save with both a sapling and a crop. Any new "growing" tile must be routed in `applyDiff` too, or it stalls with no timer (applyDiff restarts a growing crop without one).
- **Retro:** the run stayed fast by doing pure sim + unit tests first, then one e2e block per slice with its own fixture cleanup. Raw tile ids in e2e (57-67) are brittle; next time expose `T` on `window.__terrabound`.

- **E2e polls for periodic visuals must cover a full period plus margin.** The heart shows 1.4 s of every 4.5 s; a 3 s poll missed it sometimes. Guard: poll for two periods and print the state that gates the visual on failure.
- **Base positions are pad-relative and every world has its own pad height.** A test that checked `padY - 3` of the old world in the new one read air. Guard: recompute `padX/padY` from the new world after any world change.
- **Retro:** four small slices each shipped through `npm run ship` (one gate each, ~3-4 min) kept every step safe; the run's slowest part is the full gate, so batch e2e edits before the gate and run `npm run e2e` alone while iterating.

- **Rounded tile corners are 1 px cut-outs on edge tiles.** A full-tile overlay painted on an edge tile darkens the transparent corner and the backdrop behind it. Guard: overlays on edge tiles (`mask !== 0`) use a cross shape that skips the 4 corner pixels (renderer `drawStrata`).
- **The surface dirt layer is only 3-4 tiles thick; the scrap layer rock (T.METAL) is right under it** and is also a player build block. Guard: natural-only visuals check `world.edits` (placed tiles are in it), not the tile id.
- **Disabled buttons are not in `ui.rects` (again):** the settings e2e expected 10 steppers but maxed ones were disabled. Count with the current values in mind.
- **Retro:** three slices, each gated by `npm run ship` (~4 min each). Writing the mobile fit check first would have caught the squeezed labels before the screenshot review.
