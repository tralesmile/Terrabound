# Ideas (creative review log; newest first, keep short)

## 2026-11-16 run 61

- Done this run: field garages show on the map as green bolt pins (plan deep trips around charge points; finished run 60's drafted slice); the magnet ring / scout bot draw faint tethers with beads sliding into the suit from every drop they reel in, so the accessory reads in play (47d-magnet-pull).
- Weakest graphics (underground): buried skulls and bones in 02-digging are flat white sprites at full brightness; tint them by depth/ambient so fossils sit in the dirt instead of on top of it.
- Done too: ground vehicles deploy under the carport and hang on a dock cable; the bay charges you while seated.
- Weakest gameplay feel (vehicles): the Sky Jet must still park outside; an open-roof "hangar" variant of the garage would let flyers dock too.
- Weakest progression (loot): carried, boss bonus accessory roll with boss-only trinkets (Terraria boss drops).
- Weakest UI: the TRIP BANKED card can still be on screen after you leave the pad and reach a new biome (11-biome-jungle); hide it once the player is more than ~20 tiles from the pad.

## 2026-11-16 run 59

- Done this run: a field garage is a charging bay (battery fills at 30/s under its roof, crackling green arc from the bay light to the suit, "+" motes, steady green lamp when full, CHARGING % replaces the "return to the pad" nag) so a garage becomes a Dome Keeper-style forward outpost (21c-bay-charge); the phone inventory shows the accessory socket row (51e).
- Weakest progression (outposts): the map does not mark field garages; a green bolt pin would let players plan deep trips around their charge points.
- Weakest gameplay feel (vehicles): the parked buggy sits just outside the carport; parking under the roof (deploy into the bay) would make the bay read as a garage and charge you while seated.
- Checked, stale: lava scene cost (9.1 vs 8.7 ms plain); the old 11 ms note is gone after the shimmer/memo fixes.
- Weakest progression (loot): accessories still only come from chests and the workshop; a boss bonus roll with boss-only trinkets (carried).

## 2026-11-16 run 58

- Done this run: 3 accessory sockets with 7 craftable trinkets (magnet ring, vital heart, lamp shard, power coil, grip gloves, aegis charm, feather charm); a WORN / ACCESSORIES socket row fills the dead space under the character in the inventory (18c); worn trinkets glint as gems on the belt.
- Done too: accessories turn up in world chests (10% shallow to 30% deep, always a new one), so opening chests has a jackpot (Terraria accessory hunting). Next: a boss bonus roll and boss-only accessories.
- Weakest UI (phones): the narrow inventory has no socket row; fold the 6 upgrade-level lines into one compact strip to make room.
- Done too: mid-air jumps had no effect at all; now a kick ring in the gear's colour, a down-puff and (feather charm) green wisps, plus a lighter chirp (47c).
- Weakest graphics (character): accessories show only as 1 px belt gems; a magnet ring could draw faint pull lines to loot it is reeling in.

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
