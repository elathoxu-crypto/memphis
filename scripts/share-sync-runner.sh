#!/usr/bin/env bash
set -u

LOG_DIR="$HOME/.memphis/logs"
OUT_LOG="$LOG_DIR/share-sync.log"
ERR_LOG="$LOG_DIR/share-sync.err.log"
STATE_FILE="$LOG_DIR/share-sync.state"
LOCK_FILE="/tmp/memphis-share-sync.lock"

MAX_RETRIES=3
BASE_DELAY=10
ALERT_COOLDOWN_SEC=$((2*60*60))
REMOTE_HOST="${MEMPHIS_SHARE_SYNC_REMOTE_HOST:-10.0.0.22}"
REMOTE_USER="${MEMPHIS_SHARE_SYNC_REMOTE_USER:-memphis}"

mkdir -p "$LOG_DIR"
cd "$HOME/memphis" || exit 1

now_ts() { date +%s; }
iso_ts() { date -Iseconds; }

read_last_alert() {
  if [[ -f "$STATE_FILE" ]]; then
    grep -E '^last_alert_ts=' "$STATE_FILE" | head -n1 | cut -d'=' -f2
  fi
}

write_state() {
  local last_alert_ts="$1"
  cat > "$STATE_FILE" <<EOF
last_run_ts=$(now_ts)
last_alert_ts=${last_alert_ts:-0}
EOF
}

attempt=1
success=0

while [[ $attempt -le $MAX_RETRIES ]]; do
  echo "[$(iso_ts)] share-sync attempt $attempt/$MAX_RETRIES" >> "$OUT_LOG"

  TMP_OUT="$(mktemp)"
  TMP_ERR="$(mktemp)"

  if flock -n "$LOCK_FILE" node dist/cli/index.js share-sync --pull --remote "$REMOTE_HOST" --user "$REMOTE_USER" >"$TMP_OUT" 2>"$TMP_ERR"; then
    cat "$TMP_OUT" >> "$OUT_LOG"
    cat "$TMP_ERR" >> "$ERR_LOG"

    if grep -Eqi "cannot access remote share chain|permission denied|sync failed" "$TMP_OUT" "$TMP_ERR"; then
      # Semantic failure even with exit 0
      echo "[$(iso_ts)] share-sync semantic-failure detected on attempt $attempt" >> "$ERR_LOG"
    else
      echo "[$(iso_ts)] share-sync success on attempt $attempt" >> "$OUT_LOG"
      success=1
      rm -f "$TMP_OUT" "$TMP_ERR"
      break
    fi
  else
    cat "$TMP_OUT" >> "$OUT_LOG"
    cat "$TMP_ERR" >> "$ERR_LOG"
  fi

  rm -f "$TMP_OUT" "$TMP_ERR"

  if [[ $attempt -lt $MAX_RETRIES ]]; then
    delay=$((BASE_DELAY * attempt))
    echo "[$(iso_ts)] share-sync failed (attempt $attempt), retry in ${delay}s" >> "$ERR_LOG"
    sleep "$delay"
  fi

  attempt=$((attempt + 1))
done

if [[ $success -eq 1 ]]; then
  last_alert_ts="$(read_last_alert)"
  write_state "${last_alert_ts:-0}"
  exit 0
fi

# anti-spam alert policy
current_ts="$(now_ts)"
last_alert_ts="$(read_last_alert)"
last_alert_ts="${last_alert_ts:-0}"

if [[ $((current_ts - last_alert_ts)) -ge $ALERT_COOLDOWN_SEC ]]; then
  echo "[$(iso_ts)] ALERT: share-sync failed after ${MAX_RETRIES} attempts (cooldown ${ALERT_COOLDOWN_SEC}s)" >> "$ERR_LOG"
  write_state "$current_ts"
else
  echo "[$(iso_ts)] share-sync failed after ${MAX_RETRIES} attempts (alert suppressed by cooldown)" >> "$ERR_LOG"
  write_state "$last_alert_ts"
fi

exit 0
