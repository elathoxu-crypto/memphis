#!/bin/bash
# Simple Pinata download script
# Usage: ./pinata-download.sh <CID> <output-file>

set -e

CID="$1"
OUTPUT="$2"

if [ -z "$CID" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <CID> <output-file>"
    exit 1
fi

# Get Pinata JWT from config
JWT=$(grep "jwt:" ~/.memphis/config.yaml 2>/dev/null | head -1 | sed 's/.*jwt: *"\([^"]*\)".*/\1/')

if [ -z "$JWT" ]; then
    echo "❌ Pinata JWT not found"
    exit 1
fi

# Download from Pinata gateway
curl -s -X GET "https://gateway.pinata.cloud/ipfs/$CID" -o "$OUTPUT"

if [ ! -f "$OUTPUT" ] || [ ! -s "$OUTPUT" ]; then
    echo "❌ Download failed"
    exit 1
fi

echo "✅ Downloaded to: $OUTPUT"
