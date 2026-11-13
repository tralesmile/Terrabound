# Ideas (creative review log; newest first, keep short)

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

## 2026-11-13 run 41

- Done this run: half-tile slope caps on staircase corners (carried 2 runs; 11c-slopes); auto-step over one-tile ledges (every surface bump used to need a jump, Starbound/Terraria walk up them); codex field-guide notes.
- Weakest feel: walkers (enemies, pets) still stop at one-tile steps; give them the same stepUp so chases flow over hills.
- Weakest UI (carried 1): the goal card is a wide dark panel; one line + bar would free a third of the top-left.
- Weakest graphics: cave ceilings stay stair-stepped; mirror the caps for bottom corners (S+E / S+W).
- Weakest story (carried 6): logs are one line each; 3-4 lines per log.
