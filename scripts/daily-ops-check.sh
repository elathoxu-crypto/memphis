#!/usr/bin/env bash
set -euo pipefail

# RM-079: Auto-Health Daily
# - Daily checks: gateway status, memory status, memphis update status
# - Persist one summary per day to memory/YYYY-MM-DD.md (anti-spam)
# - Emit critical alert marker only on FAIL

PASS=0
WARN=0
FAIL=0

ok(){ echo "OK   | $1"; PASS=$((PASS+1)); }
warn(){ echo "WARN | $1"; WARN=$((WARN+1)); }
bad(){ echo "FAIL | $1"; FAIL=$((FAIL+1)); }

TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"
TODAY="$(date '+%Y-%m-%d')"
MEMORY_DIR="$HOME/.openclaw/workspace/memory"
MEMORY_FILE="$MEMORY_DIR/${TODAY}.md"
STATE_DIR="$HOME/.memphis/state"
STATE_FILE="$STATE_DIR/daily-ops-state.json"
LOG_DIR="$HOME/.memphis/logs"
LOG_FILE="$LOG_DIR/daily-ops-check.log"

mkdir -p "$MEMORY_DIR" "$STATE_DIR" "$LOG_DIR"

NVM_OPENCLAW="$HOME/.nvm/versions/node/v24.14.0/bin/openclaw"
NVM_MEMPHIS="$HOME/.nvm/versions/node/v24.14.0/bin/memphis"

OPENCLAW_CMD=""
if [ -x "$NVM_OPENCLAW" ]; then
  OPENCLAW_CMD="$NVM_OPENCLAW"
elif command -v openclaw >/dev/null 2>&1; then
  OPENCLAW_CMD="$(command -v openclaw)"
fi

MEMPHIS_CMD=""
if [ -x "$NVM_MEMPHIS" ]; then
  MEMPHIS_CMD="$NVM_MEMPHIS"
elif command -v memphis >/dev/null 2>&1; then
  MEMPHIS_CMD="$(command -v memphis)"
elif [ -f "$HOME/memphis/dist/cli/index.js" ] && command -v node >/dev/null 2>&1; then
  MEMPHIS_CMD="node $HOME/memphis/dist/cli/index.js"
fi

echo "== Memphis Daily Ops Check =="
echo "$TS"

# 1) Gateway status
if [ -n "$OPENCLAW_CMD" ]; then
  if bash -lc "$OPENCLAW_CMD gateway status" >/tmp/memphis-daily-gateway.out 2>/tmp/memphis-daily-gateway.err; then
    ok "openclaw gateway status"
  else
    bad "openclaw gateway status"
  fi
else
  bad "openclaw command not found"
fi

# 2) Memory status
if [ -n "$OPENCLAW_CMD" ]; then
  if bash -lc "$OPENCLAW_CMD memory status" >/tmp/memphis-daily-memory.out 2>/tmp/memphis-daily-memory.err; then
    ok "openclaw memory status"
  else
    bad "openclaw memory status"
  fi
else
  bad "openclaw command not found for memory status"
fi

# 3) Memphis update status
if [ -n "$MEMPHIS_CMD" ]; then
  if bash -lc "$MEMPHIS_CMD update status" >/tmp/memphis-daily-update.out 2>/tmp/memphis-daily-update.err; then
    ok "memphis update status"
  else
    warn "memphis update status"
  fi
else
  warn "memphis command not found"
fi

SUMMARY_STATUS="OK"
if [ "$FAIL" -gt 0 ]; then
  SUMMARY_STATUS="FAIL"
elif [ "$WARN" -gt 0 ]; then
  SUMMARY_STATUS="WARN"
fi

echo "Summary: STATUS=$SUMMARY_STATUS PASS=$PASS WARN=$WARN FAIL=$FAIL"

# Anti-spam guard: one memory report per day
LAST_DATE=""
if [ -f "$STATE_FILE" ]; then
  LAST_DATE="$(python3 - <<'PY' "$STATE_FILE"
import json,sys
p=sys.argv[1]
try:
    with open(p,'r',encoding='utf-8') as f:
        d=json.load(f)
    print(d.get('last_report_date',''))
except Exception:
    print('')
PY
)"
fi

if [ "$LAST_DATE" != "$TODAY" ]; then
  # RM-072 SLO baseline snapshot fields
  GATEWAY_SLO="PASS"
  MEMORY_SLO="PASS"
  RTO_SLO="N/A"
  DEFERRED_SLO="N/A"

  [[ -s /tmp/memphis-daily-gateway.err ]] && GATEWAY_SLO="FAIL"
  [[ -s /tmp/memphis-daily-memory.err ]] && MEMORY_SLO="FAIL"

  {
    echo
    echo "## $(date '+%H:%M CET') — Auto-Health Daily"
    echo "- STATUS: **$SUMMARY_STATUS** (PASS=$PASS WARN=$WARN FAIL=$FAIL)"
    echo "- Checks: gateway status, memory status, memphis update status"
    echo "- SLO Snapshot: gateway=$GATEWAY_SLO, memory=$MEMORY_SLO, rto=$RTO_SLO, deferred_threshold=$DEFERRED_SLO"
  } >> "$MEMORY_FILE"

  python3 - <<'PY' "$STATE_FILE" "$TODAY" "$SUMMARY_STATUS"
import json,sys,time
p,today,status=sys.argv[1],sys.argv[2],sys.argv[3]
data={
  "last_report_date": today,
  "last_status": status,
  "updated_at": int(time.time())
}
with open(p,'w',encoding='utf-8') as f:
    json.dump(data,f,ensure_ascii=False,indent=2)
PY

  echo "Saved daily summary to $MEMORY_FILE"
else
  echo "Daily summary already saved for $TODAY (anti-spam guard)."
fi

# Outside schedule: only critical alert signal
if [ "$FAIL" -gt 0 ]; then
  echo "CRITICAL_ALERT: daily-ops-check failed" >&2
  exit 1
fi

exit 0
