# Terrabound design bible

## 1. Core loops

| Loop | Length | Player does | Reward |
| --- | --- | --- | --- |
| Dig | 0-10 s | Break blocks, collect ore | Juicy feedback, loot flying in |
| Dive | 3-8 min | Descend, mine, fight, decide when to extract | Loot banked, depth record |
| Base | 2-5 min | Spend loot, craft, place machines, program drones | Visible growth, stronger suit |
| Session | 10-25 min | 2-4 dives plus base time | A new unlock every session |
| Day | 1-2 visits | Collect offline drone output, Daily Dive | Streak (never punishing), contract |
| Week | Ongoing | New layer or boss, mutator week, leaderboards | Goals and bragging rights |

**Dive tension rule:** every dive offers a clear choice between going deeper (rarer ore, more danger) and extracting now. Battery is the clock; pack size is the greed limit; death costs half the carried loot, never progress.

## 2. Player, gear, combat

- **Suit slots:** Helmet, Core, Boots, Module (jetpack, shield, scanner).
- **Accessories (3):** grapple, ore magnet, double jump, damage reflector, etc.
- **Stats:** health, shield, battery (dive timer), heat resistance, dig power, move speed, pack size.
- **Weapon classes:** Melee (energy blade, plasma axe), Ranged (pulse pistol, rail rifle, scatter), Tech (arc coil, gravity gun, mines), Drone (combat and repair drones, share the base drones).
- **Rarity:** Common, Uncommon, Rare, Epic, Legendary. Weapons roll 0-3 modifiers (for example +crit, burn, pierce, vampiric). Mod chips can be slotted and swapped. Drops are free (no paid randomness).
- **Set bonuses:** 2 and 4 piece bonuses per layer set give a collecting goal.
- **Combat feel:** hit-stop of 40-60 ms, knockback, damage numbers, enemy telegraphs of 0.4 s or more, i-frames after hit 0.6 s.
- **Controls:** keyboard and mouse; touch (floating thumbstick left, tap or hold to dig and aim right, auto-aim assist for weapons, 4 quick-slots); gamepad later.

## 3. Building and automation

- **Base grid:** persistent, separate from dive worlds. Blocks, walls, platforms, doors, lights.
- **Power:** solar cells, batteries, power lines; machines show power state.
- **Logistics:** conveyors, chests, smelter, assembler, fabricator (tiered stations: Fabricator, Assembler, Quantum Forge).
- **Drones:** Miner, Hauler, Fighter, Repair. Programmed with up to three rules each, for example: if target is iron then mine; if pack full then return; if enemy near then attack. Rules are data, deterministic and visualised so players can watch and tune them.
- **Offline production:** capped at 8 hours, computed from elapsed time with clock-skew protection (negative or huge deltas ignored).
- **In-dive builds:** scaffolds, ladders, bridges, deployable turret, shield dome. Blueprints are found in dives.

## 4. World and progression

| Layer | Depth | Materials | Hazards and enemies | Boss | Gear |
| --- | --- | --- | --- | --- | --- |
| Scrap | 0-60 | Rust, iron scrap, copper | Crawlers, falling debris, drip acid | Junk Colossus | Scavenger set, blade, pulse pistol |
| Circuit | 60-140 | Silicon, gold circuits | Sparkers, electric floors, dark zones | Logic Warden | Circuit set, arc coil, drones |
| Plasma | 140-220 | Plasma cells | Heat, plasma vents, flyers | Reactor Beast | Plasma set, rail rifle, gravity gun |
| Core | 220+ | Core fragments | Everything, AI sentinels | The Hollow AI | Core set, legendary weapons |

Pacing targets: first upgrade in 90 s; first extraction in 4 min; first drone in 15 min; first boss in 45-60 min; full Scrap layer in 1 hour; full game 10-20 hours.

## 5. Economy rules

- Upgrade costs grow about 1.55x per level (see `src/sim/upgrades.ts`).
- Every resource has a sink at every stage. No resource becomes worthless.
- No hard paywalls. Purchases save time or add cosmetics; they never gate content.
- A simulated-player test checks that each layer is reachable inside the pacing target.

## 6. Art direction

- **Look:** retro-futuristic pixel art, dusk sky, dead machine-world. All art is generated in code.
- **Palette:** sky `#0b1026` to `#2a1f4d` to `#e87f5b`; rust `#7a4a3a`; metal `#4a5568`; iron `#d6c7b8`; copper `#e08a3c`; neon cyan `#36e0e8` (UI, energy, pad); hazard orange `#e8a33d` (player suit); warning amber `#ff9a3c`; danger red `#ff5a5a`; gold `#ffcf4a`.
- **Scale:** 16 px tiles, integer scaling, about 16 tiles across the short screen side.
- **Lighting:** radial darkness grows with depth; torches and suit lamp push it back; low battery pulses red.
- **Juice list:** screen shake (settings-controlled), particles on break, floating pickup text, mining beam, hit-stop, pad glow, footstep dust, landing dust.
- **Readability:** ores have distinct silhouettes not only colours (colour-blind safe); enemies have a bright outline in dark zones.

## 7. UI and UX

- Touch targets at least 44 CSS px; HUD safe areas for notches; HUD scales with screen size.
- HUD: HP, battery, depth, pack, quick-slots; contextual shop button at the pad.
- First-time user experience (FTUE), first 90 seconds, no text walls:
  1. Title, one tap to start.
  2. Player stands on the pad; arrow points to the nearest rust block; "Hold to dig".
  3. Pickup text and pack counter pop; "Return to the pad to bank".
  4. Shop button pulses when the first upgrade is affordable (about 60 s).
  5. First low-battery warning teaches the clock without punishing.
- Settings: sound, music, screen shake, colour-blind mode, left-handed layout, text size, control remap.

## 8. Audio

Synthesised with WebAudio: dig tick, break pop, pickup chirp, hurt, bank arpeggio, upgrade fanfare, death drop, low-battery beeps. Planned: layered procedural ambient music that deepens with depth; rate limiting so bursts never clip.

## 9. Content backlog ideas (post-MVP)

Weather events (dust storms), wandering merchant drone, ancient vaults, pets (companion drone skins), fishing in coolant pools, seasonal events, base raids on a timer players can disable.

## 10. Marketing-ready moments (design for clips)

1. Drill burst through an ore vein with a cascade of loot.
2. First drone automation: "it works while I sleep".
3. Extraction at 3% battery.
4. Boss telegraph and dodge.
5. Huge base with dozens of drones working in sync.
