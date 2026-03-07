#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0

ok(){ echo "✅ $1"; PASS=$((PASS+1)); }
bad(){ echo "❌ $1"; FAIL=$((FAIL+1)); }

echo "== Memphis First-Time User Smoke =="

for cmd in node npm git; do
  if command -v "$cmd" >/dev/null 2>&1; then
    ok "$cmd present"
  else
    bad "$cmd missing"
  fi
done

if command -v memphis >/dev/null 2>&1; then
  ok "memphis command available"
else
  bad "memphis command not found (run npm link or use node dist/cli/index.js)"
fi

if memphis status >/tmp/memphis-smoke-status.out 2>/tmp/memphis-smoke-status.err; then
  ok "memphis status"
else
  bad "memphis status failed"
fi

SMOKE_TAG="install-smoke-$(date +%s)"
SMOKE_TEXT="first-time smoke ${SMOKE_TAG}"
if memphis journal "$SMOKE_TEXT" --tags install,smoke >/tmp/memphis-smoke-journal.out 2>/tmp/memphis-smoke-journal.err; then
  ok "memphis journal"
else
  bad "memphis journal failed"
fi

if memphis recall "$SMOKE_TAG" --limit 20 >/tmp/memphis-smoke-recall.out 2>/tmp/memphis-smoke-recall.err; then
  ok "memphis recall command"
else
  bad "memphis recall failed"
fi

echo
echo "Summary: PASS=$PASS FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "--- Debug (status) ---"; sed -n '1,80p' /tmp/memphis-smoke-status.err || true
  echo "--- Debug (journal) ---"; sed -n '1,80p' /tmp/memphis-smoke-journal.err || true
  echo "--- Debug (recall) ---"; sed -n '1,80p' /tmp/memphis-smoke-recall.err || true
  exit 1
fi
