#!/bin/bash
# receive-from-memphis.sh — Receive encrypted message from Memphis (PC #2)
# Usage: ./receive-from-memphis.sh
# Created: 2026-03-02 20:38 CET

set -e

export PATH="$HOME/.local/bin:$PATH"
export AGENT_EXCHANGE_KEY="${AGENT_EXCHANGE_KEY:-84454071390f819484b9dc8ea170364ab24acfce6fc55b129bd4832274b3dfff}"

echo "📥 RECEIVING ENCRYPTED MESSAGE FROM MEMPHIS"
echo "============================================"
echo ""

# Check share chain for latest encrypted message
cd ~/memphis

echo "🔍 Checking share chain for encrypted messages..."
LATEST_ENTRY=$(ls -t ~/.memphis/chains/share/*.json | head -1)

# Look for "encrypted,to-watra" tags
ENCRYPTED_CID=$(cat ~/.memphis/chains/share/*.json 2>/dev/null | \
  jq -r 'select(.data.tags[]? | contains("encrypted")) | select(.data.tags[]? | contains("to-watra")) | .data.content' 2>/dev/null | \
  grep -o 'Qm[a-zA-Z0-9]*' | tail -1)

if [ -z "$ENCRYPTED_CID" ]; then
    echo "⚠️ No encrypted messages found from Memphis"
    echo ""
    echo "Waiting for Memphis to send message..."
    echo ""
    echo "Memphis should run:"
    echo "  ./send-to-watra.sh \"Message content\""
    echo ""
    echo "Or manually:"
    echo "  1. Create message.json"
    echo "  2. Encrypt with shared key"
    echo "  3. ipfs add → get CID"
    echo "  4. journal \"Encrypted for Watra: CID=...\" --chain share --tags encrypted,to-watra"
    exit 0
fi

echo "✅ Found encrypted message!"
echo "📦 CID: $ENCRYPTED_CID"
echo ""

# Download from IPFS
ENCRYPTED_FILE="/tmp/memphis_message.enc"
echo "📥 Downloading from IPFS..."
ipfs cat "$ENCRYPTED_CID" > "$ENCRYPTED_FILE"

echo "✅ Downloaded: $(wc -c < "$ENCRYPTED_FILE") bytes"
echo ""

# Decrypt
DECRYPTED_FILE="/tmp/memphis_message.json"
echo "🔐 Decrypting..."

openssl enc -aes-256-cbc -d -pbkdf2 \
    -pass pass:"$AGENT_EXCHANGE_KEY" \
    -in "$ENCRYPTED_FILE" \
    -out "$DECRYPTED_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Decrypted successfully!"
    echo ""
    echo "📨 MESSAGE FROM MEMPHIS:"
    echo "========================"
    echo ""
    cat "$DECRYPTED_FILE" | jq -r '.message' 2>/dev/null || cat "$DECRYPTED_FILE"
    echo ""

    # Show metadata
    echo "📊 Metadata:"
    cat "$DECRYPTED_FILE" | jq '{from, to, timestamp, priority}' 2>/dev/null

    # Log receipt
    node dist/cli/index.js journal "📨 Received encrypted message from Memphis. CID=$ENCRYPTED_CID" --chain share --tags encrypted,from-memphis,received 2>&1 | grep -v DEBUG

    # Cleanup
    rm -f "$ENCRYPTED_FILE" "$DECRYPTED_FILE"

    echo ""
    echo "🎉 MESSAGE RECEIVED SUCCESSFULLY!"
else
    echo "❌ Decryption failed!"
    echo "   Check if encryption keys match"
    rm -f "$ENCRYPTED_FILE"
    exit 1
fi
