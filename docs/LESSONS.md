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
