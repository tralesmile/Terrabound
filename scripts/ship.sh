#!/usr/bin/env bash
# Push dev and fast-forward main ONLY if the full gate passes. Commit first, then run `npm run ship`.
# Exists because a run once chained `npm run check | grep ... && git push`, which keyed off grep's
# exit code and pushed a red build to main.
set -euo pipefail
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "ship: uncommitted changes to tracked files; commit first" >&2
  exit 1
fi
[ "$(git rev-parse --abbrev-ref HEAD)" = "dev" ] || { echo "ship: not on dev" >&2; exit 1; }
npm run check
git push origin dev
git fetch -q origin
git push origin dev:main
echo "ship: dev and main at $(git rev-parse --short HEAD)"
