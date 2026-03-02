#!/bin/bash
# send-to-watra.sh — Send encrypted message to Watra (PC #1)
# Usage: ./send-to-watra.sh "Your message here"
# Created: 2026-03-02 20:37 CET

set -e

MESSAGE="${1:-Test encrypted message from Memphis to Watra}"
TIMESTAMP=$(date -Iseconds)

export PATH="$HOME/.local/bin:$PATH"
export AGENT_EXCHANGE_KEY="${AGENT_EXCHANGE_KEY:-84454071390f819484b9dc8ea170364ab24acfce6fc55b129bd4832274b3dfff}"

echo "🔐 SENDING ENCRYPTED MESSAGE TO WATRA"
echo "======================================"
echo ""

# Create message payload
MESSAGE_FILE="/tmp/message-to-watra-$$.json"

cat > "$MESSAGE_FILE" << EOF
{
  "from": "memphis",
  "to": "watra",
  "timestamp": "$TIMESTAMP",
  "message": "$MESSAGE",
  "priority": "high",
  "system": {
    "ipfs_peers": $(ipfs swarm peers 2>/dev/null | wc -l || echo "0"),
    "status": "operational"
  }
}
EOF

echo "📦 Created message:"
cat "$MESSAGE_FILE"
echo ""

# Encrypt
ENCRYPTED_FILE="/tmp/watra_encrypted_message_$$.json.enc"

openssl enc -aes-256-cbc -salt -pbkdf2 \
    -pass pass:"$AGENT_EXCHANGE_KEY" \
    -in "$MESSAGE_FILE" \
    -out "$ENCRYPTED_FILE"

echo "✅ Encrypted: $(wc -c < "$ENCRYPTED_FILE") bytes"
echo ""

# Add to IPFS
CID=$(ipfs add -Q "$ENCRYPTED_FILE")

echo "✅ Added to IPFS"
echo "📦 CID: $CID"
echo ""

# Log to share chain
cd ~/memphis
node dist/cli/index.js journal "🔐 Encrypted message for Watra: CID=$CID. From Memphis (PC #2). Decrypt with shared key." --chain share --tags encrypted,to-watra,ipfs,memphis-message 2>&1 | grep -v DEBUG

# Cleanup
rm -f "$MESSAGE_FILE" "$ENCRYPTED_FILE"

echo ""
echo "🎉 MESSAGE SENT!"
echo "================"
echo ""
echo "CID: $CID"
echo "Chain: share"
echo ""
echo "Watra can decrypt with:"
echo "  ipfs cat $CID > message.enc"
echo "  openssl enc -aes-256-cbc -d -pbkdf2 -pass pass:\$AGENT_EXCHANGE_KEY -in message.enc -out message.json"
