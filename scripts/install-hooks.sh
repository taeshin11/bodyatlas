#!/bin/sh
# One-time setup: point git at tracked hooks under .githooks/
set -e
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/commit-msg 2>/dev/null || true
echo "[install-hooks] core.hooksPath = .githooks"
echo "[install-hooks] pre-commit ready"
