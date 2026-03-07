#!/usr/bin/env bash
set -euo pipefail

MEMPHIS_HOME="${MEMPHIS_HOME:-$HOME/.memphis}"
LOG_DIR="$MEMPHIS_HOME/logs"
REPORT_JSON="$LOG_DIR/embedding-coverage.json"
ALERT_LOG="$LOG_DIR/embedding-coverage-alert.log"
STATE_FILE="$LOG_DIR/embedding-coverage-alert.state"

THRESHOLD="${EMBEDDING_COVERAGE_THRESHOLD:-95}"
COOLDOWN_SEC="${EMBEDDING_COVERAGE_ALERT_COOLDOWN_SEC:-21600}" # 6h

mkdir -p "$LOG_DIR"

# Ensure fresh report exists
"$HOME/memphis/scripts/embedding-coverage-report.sh" >/dev/null

if [[ ! -f "$REPORT_JSON" ]]; then
  echo "[$(date -Iseconds)] ERROR: missing report json" >> "$ALERT_LOG"
  exit 1
fi

export REPORT_JSON
coverage=$(python3 - <<'PY'
import json,os
p=os.path.expanduser(os.environ.get('REPORT_JSON',''))
j=json.load(open(p))
print(float(j.get('coveragePct',0.0)))
PY
)

last_alert_ts=0
if [[ -f "$STATE_FILE" ]]; then
  last_alert_ts=$(grep -E '^last_alert_ts=' "$STATE_FILE" | head -n1 | cut -d'=' -f2 || echo 0)
  last_alert_ts=${last_alert_ts:-0}
fi

now=$(date +%s)

# Compare as float via python
export COVERAGE="$coverage"
export THRESHOLD
below=$(python3 - <<'PY'
import os
c=float(os.environ['COVERAGE'])
t=float(os.environ['THRESHOLD'])
print('1' if c < t else '0')
PY
)

if [[ "$below" == "1" ]]; then
  if (( now - last_alert_ts >= COOLDOWN_SEC )); then
    echo "[$(date -Iseconds)] ALERT: embedding coverage ${coverage}% below threshold ${THRESHOLD}%" >> "$ALERT_LOG"
    cat > "$STATE_FILE" <<EOF
last_alert_ts=$now
last_coverage=$coverage
threshold=$THRESHOLD
EOF
  else
    echo "[$(date -Iseconds)] ALERT_SUPPRESSED: coverage ${coverage}% below ${THRESHOLD}% (cooldown)" >> "$ALERT_LOG"
  fi
else
  echo "[$(date -Iseconds)] OK: coverage ${coverage}% >= ${THRESHOLD}%" >> "$ALERT_LOG"
fi
