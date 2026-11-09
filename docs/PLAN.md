# Terrabound master plan

Version 1, 9 November 2026. Companion docs: [DESIGN](DESIGN.md), [MARKETING](MARKETING.md), [EDGE_CASES](EDGE_CASES.md), [BACKLOG](BACKLOG.md).

## 1. Vision

**Pitch:** You are a Salvager in a modular exosuit, digging through the Hollow, a dead machine-planet. Dive for ore, extract alive, build an automated base of drones and machines, and craft gear to reach the core.

**Pillars (every feature must serve at least one):**

1. **Juicy digging.** Every block break feels great: sound, particles, shake, loot popping to you.
2. **One more dive.** Short runs (3-8 minutes) with risk versus reward and an upgrade always almost in reach.
3. **Automation payoff.** Drones and machines keep producing while you are away, and you design how.
4. **Fair and honest.** Deaths are learnable, progress is never wasted, no manipulative monetization.
5. **Instant and tiny.** Loads in under 2 seconds, under 500 KB, plays in a browser tab or on a cheap phone.

**Audience:** fans of Terraria, Starbound, Core Keeper, Motherload, Forager, Vampire Survivors and Factorio-lite games. Mobile mid-core players aged 13+, web-portal casual players, and streamers who like satisfying clips.

**Differentiators:** programmable drones that also fight, the dive-and-extract roguelite loop on top of a persistent base, and a free, instant web version with no install.

## 2. The team (roles, owners, deliverables)

I act as every role. Each role has a definition of done so work does not drift.

| Role | Owns | Deliverables | Done when |
| --- | --- | --- | --- |
| Producer | Scope, order, risk | BACKLOG, PROGRESS, gates | Each run ends with updated docs and a green push |
| Game designer | Loops, content, balance | DESIGN, content tables | A new player reaches the first upgrade in 90 s |
| Systems and economy designer | Costs, drops, pacing | Numbers in code plus tests | Simulated player reaches each layer in the target time |
| World designer | Worldgen, biomes, hazards | `worldgen` plus invariant tests | 25+ seeds pass structure tests |
| Gameplay engineer | Sim, physics, combat, AI | `src/sim` plus tests | Deterministic, 60 fps, tested |
| Build and release engineer | CI, packaging, stores | Workflows, Capacitor project | One command makes web and Android builds |
| UI/UX designer | HUD, menus, onboarding | `src/ui`, FTUE | Touch targets 44 px or more, readable at 360 px width |
| Art director | Look and feel | Procedural sprites, palette, FX | Screenshot review passes every run |
| Audio designer | SFX and music | Synthesised sound and ambient loop | No clipping, mute works, 0 asset bytes |
| QA | Quality | Unit, e2e, fuzz, soak tests | `npm run check` green, edge cases tracked |
| Data and live-ops | Metrics, events | Analytics interface, KPI dashboard spec | Retention funnel measurable from day one |
| Marketing and community | Growth | MARKETING plan, assets | Weekly content shipped, wishlist and follower targets met |
| Business and finance | Revenue, cost, gates | Budget, scenarios, go/no-go gates | Spend stays inside the lean budget |
| Legal and compliance | Policies, ratings | Privacy policy, consent, age rating answers | Store review passes first time |

## 3. Business plan

### 3.1 Strategy: cheapest path to proven demand

1. **Web first.** No store fees, instant updates, free hosting, portals pay a share of ad revenue. Use it to prove retention.
2. **Android second.** $25 one-time, Capacitor wrapper around the same build. Soft launch in cheap countries.
3. **iOS third.** $99 per year, needs macOS for the final build (use a free GitHub Actions macOS runner on a public repo).
4. **Steam optional.** $100 per game, only if web retention is strong.

### 3.2 Monetization (ethical hybrid)

- **Web portals:** free with portal ads. Opt-in rewarded ad for double drone output or a free revive.
- **Mobile:** the same rewarded ads, plus a starter pack, drone slots, cosmetic suit skins, remove-ads purchase. A season pass only after launch.
- **Never:** loot boxes, hidden currency, pay-to-win, timers that pressure.
- **Planning ARPDAU:** $0.10-0.30. Net after cuts is about 65-85% of gross.

### 3.3 Go or no-go gates

| Gate | When | Pass criteria | If it fails |
| --- | --- | --- | --- |
| G1 Fun | Prototype | 5 of 8 testers ask for another run unprompted | Fix the loop before building more |
| G2 Retention | Web MVP, 300+ players | D1 35%+, D7 12%+ | Iterate onboarding, pacing, hooks; do not build mobile |
| G3 Monetization | After G2 | 20%+ of daily players watch a rewarded ad; ad ARPDAU above $0.03 | Tune placements; test offers |
| G4 Mobile | Android soft launch | D1 30%+, D7 10%+, LTV above 1.5x CPI in cheap geos | Stay organic; do not buy ads |
| G5 Scale | After G4 | LTV at least 1.4-3.3x CPI | Hold paid growth until the ratio improves |

### 3.4 Lean budget (first 6 months)

| Item | Cost |
| --- | --- |
| Google Play account | $25 once |
| Apple Developer Program | $99 a year (only at the iOS step) |
| Steam fee | $100 (optional) |
| Hosting (GitHub Pages, itch.io) | $0 |
| Engine, tools, CI | $0 |
| Art and audio | $0 (procedural) |
| Test ads in cheap geos | $300-1,000 |
| Domain (optional) | about $12 a year |

### 3.5 Business risks

See section 9.

## 4. Technical plan

### 4.1 Stack

TypeScript (strict), Vite, Canvas 2D, WebAudio. No runtime dependencies. Dev tools: Vitest, Playwright-core with system Chrome. Mobile via Capacitor (Android first). Why not Godot or Unity: this stack is fully testable in headless CI, ships a bundle about 100x smaller, and loads instantly in portals. Trade-off: no editor; content is data tables in code.

### 4.2 Architecture

```
src/sim        pure game logic: world, physics, mining, combat, crafting, drones, save (no DOM, deterministic)
src/render     canvas renderer, procedural sprites, effects (cosmetic randomness allowed)
src/platform   input, audio, storage, ads/analytics/leaderboard adapters (behind interfaces)
src/ui         HUD, menus, shop, onboarding
tests          unit tests for sim
e2e            real-browser smoke tests with screenshots
```

Key decisions:

- **Fixed timestep** 60 Hz in the sim, rendering interpolated by camera smoothing. Frame spikes are clamped so tab switches cannot tunnel through walls.
- **Seeded determinism:** world generation and loot are functions of a seed. This enables daily challenges, shareable seeds, replay validation and reproducible bug reports.
- **Data-driven content:** tiles, items, recipes, enemies, upgrades are tables. Adding content is a data change plus a test.
- **Save safety:** versioned, sanitized, never throws, loot banked on load so a crash never loses a dive.
- **Adapters:** `AdProvider`, `Analytics`, `Leaderboard`, `Payments` interfaces with no-op defaults so the game works fully offline and without consent.
- **Worlds:** dive worlds are 160x260 tiles now. The persistent base becomes its own grid. Larger worlds use chunked canvas caching (planned in P7).

### 4.3 Performance budgets

60 fps on a 2019 mid-range phone; JS under 500 KB gzip (now about 13 KB); memory under 200 MB; first interactive under 2 s on 4G; battery-friendly (cap at 60 fps, pause when hidden). A low-end mode reduces particles and darkness gradient cost.

### 4.4 Quality system

Pyramid: unit tests (sim) -> determinism and invariant tests over many seeds -> browser e2e with real input events -> fuzz/monkey test -> long soak simulation -> manual device checks by the owner. Every run executes `npm run check`. CI runs it on every push.

### 4.5 Release engineering

- **Web:** `npm run build` produces `dist/` (relocatable, `base: './'`). GitHub Pages workflow deploys `main`. A zip for itch.io and portal upload.
- **Android:** Capacitor project, debug APK in CI, signed AAB when the owner provides a keystore (see NEEDS_FROM_USER). Play closed test needs 12 testers for 14 days on a new personal account.
- **iOS:** Capacitor project built on a macOS runner; needs the owner's Apple account.
- **PWA:** manifest and service worker for installable offline play (cheap retention win).

## 5. Game design summary

Full detail in [DESIGN](DESIGN.md). Core loops: dive (3-8 min), base (2-5 min), meta (days). Gear: suit slots, accessories, four weapon classes, rarity with modifiers, set bonuses. Building: base blocks, power, conveyors, machines; in-dive scaffolds and turrets.

**Features that bring and keep more players (all low cost):**

| Feature | Why it works | Cost |
| --- | --- | --- |
| Daily Dive (same seed for everyone, leaderboard) | Daily return reason, social comparison | Low, seeded worlds already exist |
| Shareable seeds and run cards | Free viral loop, streamers love them | Low (Web Share API, canvas image) |
| Weekly mutators (dark, low gravity, hot) | Fresh feel without new content | Low |
| Offline drone production (capped) | Reason to return, idle appeal | Medium |
| Creative sandbox mode | Brings the Minecraft building crowd | Low |
| Achievements with cosmetic rewards | Goals for completionists | Low |
| Boss per layer with tells | Clip-worthy moments | Medium |
| Localization (ES, PT-BR, DE, FR, RU, TR, ID, ZH) | Large cheap-CPI audiences | Medium |
| Accessibility (colorblind, reduced shake, remap, one-handed) | Wider audience, store goodwill | Low |
| Co-op (later) | Biggest retention multiplier | High, post-launch |

## 6. Marketing summary

Full detail in [MARKETING](MARKETING.md). Organic first: 15-30 second digging clips on TikTok, Shorts and Reels, devlogs, Reddit communities, itch.io, web portals, Discord. Steam wishlists only if web numbers justify it. Paid ads only after G5.

## 7. Roadmap

| Milestone | Content | Exit criteria |
| --- | --- | --- |
| M0 Foundation (done) | Scaffold, dig, physics, shop, save, tests, CI | `npm run check` green |
| M1 Combat and survival | Enemies, weapons, hazards, crafting, torches | Playable 10-minute loop |
| M2 Base and drones | Persistent base, machines, drones, offline output | First automation moment in 15 min |
| M3 Gear and layers | Armor, accessories, rarity, layer 2, boss 1 | 1 hour of content |
| M4 Retention | Daily Dive, achievements, seeds, share cards, FTUE | Day-1 funnel measurable |
| M5 Polish | Settings, music, accessibility, PWA, localization framework | Screenshot and audio review passes |
| M6 Platforms | Ad and analytics adapters, consent, Capacitor, store assets | Web and Android builds from CI |
| M7 Hardening | Fuzz, soak, perf, compatibility, save migrations | Zero known crashers |
| M8 Launch | Web portals, itch.io, then Android soft launch | G2 then G4 |
| M9 Growth | Layers 3-4, events, co-op research | Revenue gates |

## 8. Spend policy

Spend nothing until G1 passes. Spend under $50 until G2 passes. Test ads only in cheap countries and only to measure retention. Never spend on ads before G5.

## 9. Risk register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Scope creep | Never ships | Strict backlog order; cut features, never the loop |
| Weak retention | No revenue | Gates G1-G2 before platform work |
| Paid ads cost more than players are worth | Losses | Organic first; G5 gate |
| Regulation of addictive design (EU DFA draft expected 11 Nov 2026) | Rework | Honest design from day one |
| Store rejection | Delay | Policy checklist, privacy policy, age rating, consent |
| Payout or tax setup in owner's country | Cannot be paid | Check early (NEEDS_FROM_USER) |
| Single-person bus factor | Stall | Docs are the memory; CI guards quality |
| Device fragmentation | Crashes or lag | Low-end mode, perf budgets, fuzz tests |
| Cheating on leaderboards | Bad community | Seed replay validation, plausibility checks |
| Copyright or lookalike claims | Takedown | Original names, art and sound; no copied assets |
