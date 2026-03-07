#!/usr/bin/env bash
set -euo pipefail

echo "== Canary Health Check =="

PASS=0
FAIL=0
ok(){ echo "✅ $1"; PASS=$((PASS+1)); }
bad(){ echo "❌ $1"; FAIL=$((FAIL+1)); }

if bash scripts/daily-ops-check.sh >/tmp/canary-ops.out 2>/tmp/canary-ops.err; then
  ok "daily ops check"
else
  bad "daily ops check"
fi

if bash scripts/first-time-user-smoke.sh >/tmp/canary-smoke.out 2>/tmp/canary-smoke.err; then
  ok "first-time smoke"
else
  bad "first-time smoke"
fi

echo "Summary: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
