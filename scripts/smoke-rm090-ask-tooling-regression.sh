#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CLI="node dist/cli/index.js"

if [[ ! -f dist/cli/index.js ]]; then
  echo "dist/cli/index.js missing; run npm run build first" >&2
  exit 1
fi

run_case() {
  local name="$1"
  local question="$2"
  local expectedMode="$3"

  local out
  if ! out=$(MEMPHIS_SOUL_DEBUG=0 $CLI ask "$question" --provider openclaw --no-save --explain-context --top 4 2>&1); then
    echo "SMOKE_RM090_FAIL case=$name reason=command_error" >&2
    echo "$out" >&2
    exit 1
  fi

  if ! grep -q "queryMode=${expectedMode}" <<<"$out"; then
    echo "SMOKE_RM090_FAIL case=$name reason=query_mode_mismatch expected=${expectedMode}" >&2
    echo "$out" >&2
    exit 1
  fi

  if [[ "$expectedMode" == "external" ]]; then
    if ! grep -Eq "SOURCES:|WEB CONTEXT|fallback activated|No LLM provider available" <<<"$out"; then
      echo "SMOKE_RM090_FAIL case=$name reason=missing_external_signals" >&2
      echo "$out" >&2
      exit 1
    fi
  fi

  echo "case=$name ok mode=$expectedMode"
}

run_case "memory_only" "Kim jest Memphis w tym projekcie?" "memory-only"
run_case "external" "Sprawdź latest OpenClaw release news" "external"
run_case "mixed" "Porównaj to co pamiętasz o OpenClaw z tym co jest aktualnie online" "external"

echo "SMOKE_RM090_OK"