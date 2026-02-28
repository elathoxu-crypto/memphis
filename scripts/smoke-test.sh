#!/bin/bash
set -e
echo "=== Memphis Smoke Test ==="
node dist/cli/index.js init
node dist/cli/index.js status
node dist/cli/index.js journal "Smoke test" --tags test,smoke
node dist/cli/index.js recall smoke
node dist/cli/index.js reflect --daily
node dist/cli/index.js graph build --dry-run
node dist/cli/index.js ingest README.md --dry-run
node dist/cli/index.js daemon status
echo "=== ALL PASSED ==="
