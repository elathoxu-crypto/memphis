#!/usr/bin/env bash
set -euo pipefail

MEMPHIS_BIN="${MEMPHIS_BIN:-$HOME/.nvm/versions/node/v24.14.0/bin/memphis}"

echo "[1/4] ask interview format smoke"
out1="$($MEMPHIS_BIN ask --provider ollama --model qwen2.5-coder:3b --no-save "Przeprowadzmy wywiad 7 punktow: 01 agenda 02 rapport 03 goals 04 how it is going 05 trial and tribulation 06 decision to take action 07 needed information" 2>/dev/null || true)"
echo "$out1" | grep -q "01" || { echo "FAIL: missing section 01"; exit 1; }
echo "$out1" | grep -q "07" || { echo "FAIL: missing section 07"; exit 1; }

echo "[2/4] ask fallback smoke (best-effort)"
out2="$($MEMPHIS_BIN ask --no-save "status" 2>/dev/null || true)"
echo "$out2" | grep -q "Provider:" || { echo "FAIL: provider line missing"; exit 1; }

echo "[3/4] share-sync status count smoke"
out3="$($MEMPHIS_BIN share-sync --status 2>/dev/null || true)"
remote_count="$(echo "$out3" | sed -n 's/.*Remote share blocks:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n 1)"
[[ -n "$remote_count" ]] || { echo "FAIL: remote share count missing"; echo "$out3"; exit 1; }

echo "[4/4] panic command smoke"
"$HOME/.openclaw/workspace/scripts/memphis-panic-doctor.sh" >/tmp/rm084-panic.out 2>/tmp/rm084-panic.err || true
grep -q "STATUS:" /tmp/rm084-panic.out || { echo "FAIL: panic status missing"; exit 1; }

echo "SMOKE_RM084_OK remote_share_blocks=$remote_count"
