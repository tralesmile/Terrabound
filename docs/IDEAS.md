# Ideas (creative review log; newest first, keep short)

## 2026-11-13 run 44

- Done this run: per-layer cave back walls (dark circuit mesh, plasma basalt, core obsidian; carried 1), enemies follow slope diagonals, desktop hover labels for HUD glyphs, lore logs in story order by depth, red hurt-flash tint (was a flat white silhouette every other frame, 27c).
- Weakest graphics: the surface dirt is a wide flat orange noise field (11f, 26-boss); a few buried pebbles, roots and darker bands in the first 6 tiles would give the cross-section depth (Terraria, Core Keeper).
- Weakest boss art: the Junk Colossus is a brick block with eyes (26-boss); arms that swing on its slam telegraph and loose scrap plates would sell the weight.
- Weakest feel: lit deep caves are still one flat tone near the player; a soft rim light on cave floors in the deep layers would show the walkable edge.
- Weakest UI: the toast column (goal + 2 toasts) still covers the top-left quarter when a gate opens (27); fade toasts older than 4 s to a one-line ghost.

## 2026-11-13 run 43

- Done this run: icon HUD (square glyph buttons two wide with the cog, key hints on desktop, 44 px on touch; carried 1); longer lore logs (2-3 more lines each, carried 8); feet follow the drawn slope diagonals (render-only sink, no more half-tile float).
- Weakest graphics: in the Circuit layer the open cave (rust back wall) reads brighter than the solid blocks (27-deep-layer), because light stops at solids; a per-layer back wall (dark green circuit mesh in Circuit, basalt in Plasma) and a faint top-face highlight on lit floors would fix the inversion.
- Weakest feel: enemies still float over slope caps (only the player sinks); reuse slopeSink for walkers in drawEnemy.
- Weakest UI: desktop has no tooltip for the new glyph buttons; a hover label (hudButtonsShown already has the words) under the button.
- Weakest progression: lore logs are found at random terminals; place them in story order by depth so the arc reads in sequence.

## 2026-11-13 run 42

- Done this run: walkers auto-step (chases flow over hills, carried 1); slim goal card (one row + hairline bar, carried 2); cave-ceiling slope caps. Found on the way: the Scrap layer's rock is metal, which never sloped, so the whole first underground layer was stair-steps; natural metal slopes now.
- Weakest UI: the right-hand HUD is a column of big text buttons (SOUND ON, MAP, HOME, SHOP, MODE DIG); square glyph buttons like the cog would free half the right side on phones (Core Keeper, Terraria mobile).
- Weakest graphics: underground is very dark blue-grey; the back wall and rock read the same tone, so cave shapes are hard to see (11e). A slightly warmer, darker back wall or a thin lit rim on cave floors would separate them.
- Weakest feel: slopes are render-only (player floats up to half a tile on the cap); physical diagonal walking.
- Weakest story (carried 7): logs are one line each; 3-4 lines per log.
