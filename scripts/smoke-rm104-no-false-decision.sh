#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT=$(node dist/cli/index.js ask "what you need to thrive and survive?" --provider openclaw --top 4 2>&1 || true)

if grep -q "Decision detected" <<<"$OUT"; then
  echo "SMOKE_RM104_FAIL false_decision_detected" >&2
  echo "$OUT" >&2
  exit 1
fi

echo "SMOKE_RM104_OK"