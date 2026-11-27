#!/usr/bin/env bash
# Push dev and fast-forward main ONLY if the full gate passes. Commit first, then run `npm run ship`.
# Exists because a run once chained `npm run check | grep ... && git push`, which keyed off grep's
# exit code and pushed a red build to main.
set -euo pipefail
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "ship: uncommitted changes to tracked files; commit first" >&2
  exit 1
fi
# Fresh scheduled clones start on a detached HEAD with no local dev branch (lesson 2026-11-23, hit again
# in run 103): adopt HEAD as dev, but only when that cannot orphan commits of an existing local dev.
if [ "$(git rev-parse --abbrev-ref HEAD)" = "HEAD" ]; then
  if ! git rev-parse -q --verify refs/heads/dev >/dev/null || git merge-base --is-ancestor dev HEAD; then
    git checkout -q -B dev
    echo "ship: detached HEAD adopted as dev"
  fi
fi
[ "$(git rev-parse --abbrev-ref HEAD)" = "dev" ] || { echo "ship: not on dev; run: git fetch origin && git checkout -B dev origin/dev" >&2; exit 1; }
# Fail fast (before the ~10 minute gate) when another run pushed: scheduled runs and the interactive
# session share dev, and a gate that ends in a rejected push is wasted. dev can be ahead of main
# while another run is mid-ship, so check both.
git fetch -q origin dev:refs/remotes/origin/dev main:refs/remotes/origin/main 2>/dev/null || true
for ref in origin/dev origin/main; do
  if git rev-parse -q --verify "$ref" >/dev/null && ! git merge-base --is-ancestor "$ref" HEAD; then
    echo "ship: $ref has commits this branch lacks; run: git rebase $ref (then ship again)" >&2
    exit 1
  fi
done
npm run check
git push origin dev
git fetch -q origin
git push origin dev:main
echo "ship: dev and main at $(git rev-parse --short HEAD)"
