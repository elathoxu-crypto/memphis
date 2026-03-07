#!/usr/bin/env bash
set -u

LOG_DIR="$HOME/.memphis/logs"
STATE_FILE="$LOG_DIR/night-backup.state"
OUT_LOG="$LOG_DIR/night-backup.log"
ERR_LOG="$LOG_DIR/night-backup.err.log"
LOCK_FILE="/tmp/memphis-night-backup.lock"

mkdir -p "$LOG_DIR"

today="$(date +%F)"
hour="$(date +%H)"

read_last_date() {
  if [[ -f "$STATE_FILE" ]]; then
    grep -E '^last_backup_date=' "$STATE_FILE" | head -n1 | cut -d'=' -f2
  fi
}

write_state() {
  cat > "$STATE_FILE" <<EOF
last_backup_date=$1
last_backup_ts=$(date +%s)
EOF
}

last_date="$(read_last_date)"

# Night window: 23:00-08:00 local
if [[ "$hour" -lt 8 && "$hour" -ge 0 || "$hour" -ge 23 ]]; then
  :
else
  echo "[$(date -Iseconds)] skipped: outside night window" >> "$OUT_LOG"
  exit 0
fi

if [[ "$last_date" == "$today" ]]; then
  echo "[$(date -Iseconds)] skipped: backup already done today" >> "$OUT_LOG"
  exit 0
fi

if flock -n "$LOCK_FILE" /usr/bin/env bash -lc "cd $HOME/memphis && ./scripts/backup.sh daily 'Night heartbeat backup'" >> "$OUT_LOG" 2>> "$ERR_LOG"; then
  write_state "$today"
  echo "[$(date -Iseconds)] night backup success" >> "$OUT_LOG"
  exit 0
fi

echo "[$(date -Iseconds)] night backup failed" >> "$ERR_LOG"
exit 1
