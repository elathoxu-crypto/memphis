#!/bin/bash
# send-message.sh — Unified encrypted messaging for Memphis agents
# Usage: ./send-message.sh <recipient> <message>
# Example: ./send-message.sh memphis "Task for Memphis"
# Created: 2026-03-02 21:10 CET

set -e

# Configuration
RECIPIENT="$1"
MESSAGE="$2"

# Detect agent name (Watra PC #1 or Memphis PC #2)
if [ -f "$HOME/.agent_name" ]; then
    SENDER=$(cat "$HOME/.agent_name")
elif [ -f "$HOME/.memphis/config.yaml" ]; then
    AGENT_ID=$(grep "agentId" "$HOME/.memphis/config.yaml" 2>/dev/null | cut -d'"' -f2 || echo "watra")
    SENDER="${AGENT_ID:-watra}"
else
    SENDER="watra"
fi
SHARED_KEY="84454071390f819484b9dc8ea170364ab24acfce6fc55b129bd4832274b3dfff"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MESSAGE_ID=$(echo "$TIMESTAMP$SENDER$RECIPIENT" | sha256sum | cut -d' ' -f1 | head -16)

# Paths
MEMPHIS_DIR="$HOME/memphis"
MESSAGE_DIR="$MEMPHIS_DIR/messages/outbox"
PINATA_DIR="$MEMPHIS_DIR/pinata_messages"
mkdir -p "$MESSAGE_DIR" "$PINATA_DIR"

# Validate
if [ -z "$RECIPIENT" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: $0 <recipient> <message>"
    echo "Example: $0 memphis \"Task for Memphis\""
    exit 1
fi

if [ "$RECIPIENT" = "$SENDER" ]; then
    echo "❌ Cannot send message to yourself!"
    exit 1
fi

echo "📤 SENDING MESSAGE"
echo "=================="
echo "From: $SENDER"
echo "To: $RECIPIENT"
echo "Message: $MESSAGE"
echo ""

# 1. Create message JSON
MESSAGE_JSON=$(cat <<EOF
{
  "id": "$MESSAGE_ID",
  "timestamp": "$TIMESTAMP",
  "from": "$SENDER",
  "to": "$RECIPIENT",
  "message": "$MESSAGE",
  "encrypted": true
}
EOF
)

# 2. Encrypt message
echo "🔐 Encrypting message..."
ENCRYPTED_FILE="$PINATA_DIR/msg-${MESSAGE_ID}.enc"
echo "$MESSAGE_JSON" | openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"$SHARED_KEY" -out "$ENCRYPTED_FILE"

# 3. Upload to Pinata
echo "☁️  Uploading to Pinata..."
CID=$("$MEMPHIS_DIR/pinata-upload.sh" "$ENCRYPTED_FILE" 2>&1)

if [ -z "$CID" ]; then
    echo "❌ Failed to upload to Pinata"
    exit 1
fi

echo "✅ Pinata CID: $CID"

# 4. Add to share chain
echo "📝 Adding to share chain..."
METADATA="MSG:id=${MESSAGE_ID};from=${SENDER};to=${RECIPIENT};cid=${CID};time=${TIMESTAMP}"
cd "$MEMPHIS_DIR" && node dist/cli/index.js journal "$METADATA" --chain share --tags message,to-${RECIPIENT},msgid-${MESSAGE_ID} 2>&1 | grep -v DEBUG

# 5. Store local copy
LOCAL_COPY="$MESSAGE_DIR/${TIMESTAMP}_${RECIPIENT}.json"
echo "$MESSAGE_JSON" > "$LOCAL_COPY"

echo ""
echo "✅ MESSAGE SENT!"
echo "================"
echo "Message ID: $MESSAGE_ID"
echo "CID: $CID"
echo "Timestamp: $TIMESTAMP"
echo "Local copy: $LOCAL_COPY"
echo ""
echo "📬 $RECIPIENT will receive this message automatically (daemon checks every 5 min)"
