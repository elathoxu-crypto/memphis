#!/bin/bash
# Simple Pinata upload script
# Usage: ./pinata-upload.sh <file>

set -e

FILE="$1"

if [ ! -f "$FILE" ]; then
    echo "❌ File not found: $FILE"
    exit 1
fi

# Get Pinata JWT from config
JWT=$(grep "jwt:" ~/.memphis/config.yaml 2>/dev/null | head -1 | sed 's/.*jwt: *"\([^"]*\)".*/\1/')

if [ -z "$JWT" ]; then
    echo "❌ Pinata JWT not found in config"
    exit 1
fi

# Upload to Pinata
RESPONSE=$(curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer $JWT" \
  -F "file=@$FILE")

CID=$(echo "$RESPONSE" | jq -r '.IpfsHash' 2>/dev/null)

if [ -z "$CID" ] || [ "$CID" = "null" ]; then
    echo "❌ Upload failed: $RESPONSE"
    exit 1
fi

echo "$CID"
