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
