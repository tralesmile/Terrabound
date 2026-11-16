# Ideas (creative review log; newest first, keep short)

## 2026-11-16 run 57

- Done this run: banking shows a TRIP BANKED card above the bar with the trip's highlights (13d); beam-home arrival has its own shimmer + thud; zap crests tink on insulator pads; arena floor scan cached.
- Checked, not a bug: the clipped toast in 13c is the 0.18 s slide-in caught mid-frame (drop the run 56 "toasts clip" note).
- Weakest progression: gear is still stats-only; P3 equipment slots (helmet/core/boots/module) with visible suit parts on the player would give loot a reason to exist (Terraria/Core Keeper armor sets).
- Weakest retention: the dive and trip tallies vanish on reload; persist them in the save (small, needs SAVE_VERSION bump + fixture).
- Weakest feel at the pad: banked items vanish from the pack instantly; let the pack icons fly from the bag slot into the stash crate on the card (reuse Flyers).

## 2026-11-16 run 56

- Done this run: beaming home is now a visible event (charging light column over the player, arrival pillar on the landing ring, deck dust, camera cut instead of a 100-tile pan; 13b/13c); legacy-size saves are offered a BIGGER WORLD.
- Stale idea dropped: "surface strata" (run 55) already exists (strata.ts bands + topsoil); check the code before logging a graphics idea.
- Weakest UI: toasts slide in from the left edge and clip ("at the pad" in 13c); on phones cap the column at two pills and fold the rest into a "+N" chip.
- Weakest progression: the dive report still only shows on death; a lighter "dive banked" card on beam-home would pair with the new arrival beat (P4 follow-up).
- Weakest audio: the arrival has no sound of its own (reuses the recall chime); a descending shimmer + soft thud would sell the slam.

## 2026-11-13 run 55

- Done this run: two teal insulator pads in the Hollow AI arena never conduct the phase-2 floor zaps (the crest fizzles in teal arcs at their edge), so the finale has a positioning answer besides jumping (28h-safe-pad); block tooltips stay quiet in boss fights and raids (a "Rust" tip sat on screen mid-fight in 28f).
- Weakest graphics: surface dirt under the grass is one flat brown speckle for 6+ tiles (02-digging); a few buried pebble clusters and a darker band every ~8 rows would read as strata (Terraria/Core Keeper layered soil).
- Weakest performance: the arena floor is rescanned every frame (56+ columns x 20 rows); cache per boss and refresh on world edits.
- Process: two overlapping runs both took the phone boss-bar item this hour; claim an item in BACKLOG (CLAIMED + time) in a first tiny docs commit before building anything bigger than an hour.

## 2026-11-13 run 54

- Done this run: the landing pad is a real deck now (steel plates, hazard chevrons, landing ring, runway lights that chase toward the centre); blocks and machines name themselves under a resting mouse with dig time; streams splash into pools; the boss bar drops under the HUD on small phones (28g).
- Weakest first impression: the pad is the first thing a player sees; a short landing beam / dust puff when the player beams home onto the ring would make returning feel like an arrival (Dome Keeper's return-to-dome beat).
- Weakest UI: toasts still stack 3-4 deep at depth (awards fold, but the column covers a quarter of a phone screen); cap the column at two pills on phones and fold the rest into a "+2" chip.
- Weakest progression: the dive report still only shows on death; a lighter "dive banked" card on beam-home (carried, P4 follow-up).
- Weakest finale play: a non-conducting safe platform node in the Hollow AI arena (carried, BACKLOG P1.10 follow-up).

## 2026-11-13 run 53

- Done this run: the Hollow AI's phase 2 now electrifies its floor circuit: a charging pool flickers under the boss (0.9 s), then a white-hot crest with zigzag arcs rolls out both ways; standing on the floor as it passes hurts, a jump dodges it (28f). Every boss answers hits in its own material sound (clank, thump, crystal ping, ember hiss, ice crack, glitch).
- Weakest finale play (next): zaps share the floor with volleys; a "safe island" (a raised platform node that never conducts) would add positioning, Terraria Moon Lord style.
- Weakest graphics: the new liquid strip on the surface pond reads as glitter noise at 1x (02-digging); owner's interactive session owns liquids, so note only.
- Weakest progression: the dive report still only shows on death; a lighter "dive banked" card on beam-home (carried, P4 follow-up).
- Weakest UI: Core-layer toasts and the boss title can crowd the top band on small phones (carried; a 360x640 boss screenshot check is cheap).
