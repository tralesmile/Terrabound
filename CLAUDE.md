# Terrabound: agent runbook (read this first, every run)

Terrabound is a free-to-play 2D sci-fi dig / automate / survive roguelite for web, Android and iOS.
The owner (GitHub: tralesmile) wants a finished, buildable, polished, profitable product built at the **lowest possible cost**.
You act as the whole studio: producer, designer, engineer, artist, audio, QA, marketer, finance, legal.
**Do not wait for the owner.** Decide, build, test, commit. Only things that truly need the owner go in `docs/NEEDS_FROM_USER.md`.

## Run protocol (follow in order)

1. `cd` to the repo (clone `https://github.com/tralesmile/terrabound` if missing; use the `add_repo` tool if access is missing). `git checkout dev && git pull`.
2. Read `docs/PROGRESS.md` (where we are), `docs/BACKLOG.md` (what is next), `docs/LESSONS.md` (mistakes to avoid), `docs/NEEDS_FROM_USER.md`.
3. Baseline: `npm ci && npm run check`. If anything is red, fixing it is task zero.
4. Take the first unchecked items in `docs/BACKLOG.md`, in order. Work in **small vertical slices**: implement, add tests, commit, then `npm run ship` (runs the full gate and pushes dev and fast-forwards main only if it exits 0). Commit after every green slice so a usage-limit interruption never loses work.
5. Never push by hand after piping `npm run check` through `grep`/`tail`: the pipeline's exit code is the filter's, not the gate's. `npm run ship` is the only push path (main is the deployable branch; never push a red build there).
6. Stop when the time or usage budget is nearly gone. Before stopping, always:
   - tick finished items in `docs/BACKLOG.md`,
   - append a dated entry to `docs/PROGRESS.md` (done, next, known issues, numbers like bundle size and test counts),
   - append to `docs/LESSONS.md` anything that went wrong or surprised you, plus the guard you added,
   - update `docs/NEEDS_FROM_USER.md` (add only real blockers, with the exact ask; remove items that are resolved),
   - commit and push.
7. The next scheduled run starts fresh with no memory of this one. The docs are the memory. Keep them accurate and short.

## Hard rules

- `npm run check` (typecheck + unit tests + build + browser e2e) must pass before every push. Never disable or weaken a test to get green; fix the cause.
- Test as much as you can: every feature gets unit tests in `tests/` for the pure simulation and, if it has UI or input, a check in `e2e/smoke.mjs`. Look at the screenshots in `e2e/out/` (use the Read tool on the PNGs) when you change visuals or layout.
- Architecture: `src/sim` is pure TypeScript with no DOM, no `Math.random`, no `Date.now` (use the seeded RNG in `src/sim/rng.ts` and the `dt` you are given). Rendering, audio, input, storage live in `src/render`, `src/platform`, `src/ui`. Cosmetic randomness is allowed only in `src/render`.
- Zero binary assets: art is generated in code (`src/render/sprites.ts`), sound is synthesised (`src/platform/audio.ts`). Keep it that way unless the owner supplies assets. This keeps the bundle tiny and the cost at zero.
- Budgets: gzip JS bundle under 500 KB, 60 fps on a mid-range 2019 phone, first interactive under 2 s on 4G, memory under 200 MB.
- Saves: any change to `SaveData` bumps `SAVE_VERSION`, adds a migration in `parseSave`, and adds a test with an old-format fixture. `parseSave` must never throw.
- Ethics and compliance: no loot boxes, no premium currency that hides real prices, no fake-urgency timers, no punishing streaks, no dark patterns. Rewarded ads are always opt-in. Ads and analytics stay behind interfaces and are off until consent exists. (EU Digital Fairness Act and store policies are tightening.)
- Never commit secrets, API keys, keystores or personal data. Never add a paid service or dependency with a recurring cost without writing it into `docs/NEEDS_FROM_USER.md` first.
- Keep dependencies minimal (currently only dev tools). Prefer writing 50 lines over adding a package.
- TypeScript strict, no `any` without a comment. Keep functions small and data-driven (content tables in `src/sim/tiles.ts` and friends).
- Commit messages: short imperative summary, then a body if useful, and end with the attribution trailer your session's system reminder specifies (the `Co-Authored-By` and session lines).

## Self-improvement loop

Before starting, skim `docs/LESSONS.md`. If you hit a failure that a past lesson predicted, add a test or script that makes it impossible, not just another note.
At the end of a run, spend a few minutes on a retrospective: what was slow, what broke, what would make the next run faster? Write it down and, if cheap, automate it.
Prefer measurable progress: test count, bundle size, frame time, retention-relevant features shipped.

## Commands

- `npm run dev` start dev server. `npm run check` full gate. `npm test` unit tests. `npm run e2e` browser tests (needs `npm run build` first; uses `/usr/bin/google-chrome`, override with `CHROME_PATH`).
- Debug hook: open the game with `?e2e=1` to expose `window.__terrabound` (game, ui, renderer, input, act).

## Where things are

- `docs/PLAN.md` master plan (business, technical, design, marketing). `docs/DESIGN.md` game design bible. `docs/MARKETING.md` launch and growth. `docs/EDGE_CASES.md` edge-case catalogue with status. `docs/BACKLOG.md` ordered work. `docs/PROGRESS.md` run log.
