#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0
WARN=0

ok(){ echo "✅ $1"; PASS=$((PASS+1)); }
warn(){ echo "⚠️  $1"; WARN=$((WARN+1)); }
bad(){ echo "❌ $1"; FAIL=$((FAIL+1)); }

echo "== Memphis Daily Ops Check =="

date

if command -v memphis >/dev/null 2>&1; then
  if memphis status >/tmp/memphis-status.out 2>/tmp/memphis-status.err; then
    ok "memphis status"
  else
    bad "memphis status failed"
    sed -n '1,80p' /tmp/memphis-status.err || true
  fi
else
  bad "memphis command not found"
fi

if command -v openclaw >/dev/null 2>&1; then
  if openclaw status >/tmp/openclaw-status.out 2>/tmp/openclaw-status.err; then
    ok "openclaw status"
  else
    warn "openclaw status failed"
  fi
else
  warn "openclaw not installed"
fi

if systemctl --user is-enabled memphis-bot.service >/dev/null 2>&1; then
  if systemctl --user is-active memphis-bot.service >/dev/null 2>&1; then
    ok "memphis-bot.service active"
  else
    bad "memphis-bot.service not active"
  fi

  if journalctl --user -u memphis-bot.service -n 120 --no-pager | grep -Eq '401 Unauthorized|409.*Conflict'; then
    bad "bot logs contain recurring 401/409 patterns"
  else
    ok "bot logs clean from 401/409 in recent window"
  fi
else
  warn "memphis-bot.service not enabled"
fi

if command -v memphis >/dev/null 2>&1; then
  if memphis share-sync --status >/tmp/share-sync-status.out 2>/tmp/share-sync-status.err; then
    ok "share-sync status command"
  else
    warn "share-sync status failed"
  fi
fi

echo
echo "Summary: PASS=$PASS WARN=$WARN FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
