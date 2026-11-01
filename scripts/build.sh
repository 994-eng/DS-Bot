#!/bin/sh
# Build and test DS Bot, then the extension scaffolds.
# From the repository root: sh scripts/build.sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

cd "$ROOT/ds-bot"
npm ci --no-fund --no-audit
npm run harness
npm run build
npm test
node scripts/build-client.mjs --check
npm run lint

cd "$ROOT"
node --test extensions/*/test/*.test.js app/test/virtual-screens.test.mjs
