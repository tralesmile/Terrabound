# Edge-case catalogue

Status: `done` (implemented and tested), `part` (partly), `todo`. Update when you ship. Add a test reference when possible.

## Simulation

| Case | Status | Notes |
| --- | --- | --- |
| Huge or NaN or negative frame time | done | `Game.step` clamps; test "survives absurd frame times" |
| Tunnelling at max fall speed | done | Sub-stepped movement; test in physics |
| Block placed on the player | done | `overlapsPlayer` check |
| Floating block placement | done | Needs solid neighbour |
| Body spawned inside solid | done | `unstick` on respawn |
| Mining out of reach | done | Reach check |
| Pack full | done | Refuses to mine drops, emits `full` |
| Unbreakable tiles (bedrock, pad) | done | `isMinable` |
| Fall damage and landing | done | `FALL_SAFE` threshold |
| Death with loot | done | Half kept; test |
| Out-of-bounds tile reads and writes | done | Bedrock sides and floor |
| World generation invariants over many seeds | done | 25 seeds checked |
| Digging out the whole floor under the pad | todo | Pad is unbreakable; verify player cannot get stuck above void |
| Enemy spawn inside walls or on the player | todo | M1 |
| Projectile through thin walls | todo | M1 sweep test |
| Drone pathing stuck or oscillating | todo | M2 |
| Machine power loops and overflow | todo | M2 |
| Integer overflow of counts | part | Save clamps at 1e9; add clamps in sim |
| Float drift in long sessions | todo | Soak test M7 |
| Determinism across platforms | part | Same seed same world; add golden hash test |

## Save and persistence

| Case | Status | Notes |
| --- | --- | --- |
| Corrupt or hostile JSON | done | `parseSave` never throws |
| Old and future save versions | part | Migration hook exists; add fixtures when v2 ships |
| localStorage blocked or full | done | Memory fallback |
| Crash or refresh mid-dive | done | Carried loot banked on load |
| Two tabs open at once | todo | Last-writer-wins; add storage-event merge or warning |
| Clock changed (offline production) | todo | M2: ignore negative and absurd deltas |
| Export and import save | todo | Backup string for players |

## Input and devices

| Case | Status | Notes |
| --- | --- | --- |
| Window blur with keys held | done | Keys cleared on blur |
| Right-click menu | done | Prevented |
| Touch and mouse mixed | part | Touch flag set on first touch |
| Multi-touch (stick plus dig) | done | Independent pointers |
| Gamepad | todo | P5 |
| Keyboard layouts (AZERTY, QWERTZ) | todo | Use `code` plus remap UI |
| Screen sizes 320 px to 4K, notch safe areas | part | Responsive HUD; add safe-area insets |
| Orientation change | done | Resize handler |
| High-DPI scaling | done | DPR capped at 2 |
| Browser zoom | todo | Test |
| iOS Safari quirks (audio unlock, 100vh, pull-to-refresh) | part | `100dvh`, overscroll none; real-device test needed |
| Low-end phones | todo | Low-end mode, perf test |
| Background tab throttling | done | dt clamp, pause on hidden |

## Audio

| Case | Status | Notes |
| --- | --- | --- |
| Autoplay policy | done | Unlock on first gesture |
| Burst of sounds | done | Rate limits |
| Mute persistence | done | Saved in settings |
| Audio unsupported | done | Silent fallback |

## UI

| Case | Status | Notes |
| --- | --- | --- |
| Text overflow on narrow screens | done | `maxW` shrink |
| Shop on very short screens | part | Panel clamps; add scrolling |
| Accessibility (colour-blind, reduced motion, text size) | todo | P5 |
| Localization (long words, RTL) | todo | P5 framework |
| Buttons pressed through menus | done | Hit-test before world input |

## Monetization and compliance

| Case | Status | Notes |
| --- | --- | --- |
| Ad no-fill or ad blocker | todo | Grant reward fallback path or hide button |
| Rewarded ad closed early | todo | No reward, no penalty |
| Purchase pending or restored | todo | P6 |
| Consent (GDPR, UMP) and children | todo | Ads and analytics off until consent; age gate decision |
| Privacy policy and data deletion | todo | P6 page |
| Store policy (no misleading ads, no loot boxes) | done | Design rule |

## Platform and release

| Case | Status | Notes |
| --- | --- | --- |
| Build relocatable (sub-path hosting) | done | `base: './'` |
| Offline play (PWA) | todo | P5 |
| Update while a player has an old tab | todo | Service worker versioning |
| Error overlay instead of blank screen | done | `fatal` handler |
| Crash reporting without third parties | todo | Local ring buffer plus opt-in send |
| Android WebView differences | todo | M6 |
