#!/usr/bin/env bash
set -euo pipefail

# Minimal parity harness placeholder.
# Compares TS output with a future Rust core output for selected commands.

TMP_DIR="${TMP_DIR:-/tmp/memphis-parity}"
mkdir -p "$TMP_DIR"

run_ts() {
  local cmd="$1"
  bash -lc "memphis $cmd" >"$TMP_DIR/ts.out" 2>"$TMP_DIR/ts.err" || true
}

run_rust() {
  local cmd="$1"
  # Placeholder command for future rust bridge binary.
  bash -lc "memory-chain $cmd" >"$TMP_DIR/rust.out" 2>"$TMP_DIR/rust.err" || true
}

compare() {
  if cmp -s "$TMP_DIR/ts.out" "$TMP_DIR/rust.out"; then
    echo "✅ parity: match"
    return 0
  fi
  echo "⚠️ parity: mismatch"
  diff -u "$TMP_DIR/ts.out" "$TMP_DIR/rust.out" || true
  return 1
}

CMD="${1:-status}"
run_ts "$CMD"
run_rust "$CMD"
compare
