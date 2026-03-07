#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
CLI="node dist/cli/index.js"

if [[ ! -f dist/cli/index.js ]]; then
  echo "dist/cli/index.js missing; run npm run build first" >&2
  exit 1
fi

run_external_case() {
  local name="$1"
  local question="$2"
  local out

  if ! out=$($CLI ask "$question" --provider openclaw --no-save --top 4 2>&1); then
    echo "SMOKE_RM095_FAIL case=$name reason=command_error" >&2
    echo "$out" >&2
    exit 1
  fi

  if grep -q "No LLM provider available" <<<"$out"; then
    echo "case=$name ok (provider unavailable, fallback branch)"
    return 0
  fi

  if ! grep -Eq "CONFIDENCE: (high|medium|low)" <<<"$out"; then
    echo "SMOKE_RM095_FAIL case=$name reason=missing_confidence" >&2
    echo "$out" >&2
    exit 1
  fi

  if ! grep -Eq "SOURCES:|WEB CONTEXT|fallback activated|No LLM provider available" <<<"$out"; then
    echo "SMOKE_RM095_FAIL case=$name reason=missing_source_signal" >&2
    echo "$out" >&2
    exit 1
  fi

  echo "case=$name ok"
}

run_external_case "external-url" "Summarize this page: https://docs.openclaw.ai"
run_external_case "external-search" "What is the latest OpenClaw release?"

echo "SMOKE_RM095_OK"