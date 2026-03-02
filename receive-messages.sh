#!/bin/bash
# receive-messages.sh — Check and receive encrypted messages
# Usage: ./receive-messages.sh [--daemon]
# Created: 2026-03-02 21:10 CET

set -e

# Configuration
# Detect agent name (Watra PC #1 or Memphis PC #2)
if [ -f "$HOME/.agent_name" ]; then
    MY_NAME=$(cat "$HOME/.agent_name")
elif [ -f "$HOME/.memphis/config.yaml" ]; then
    AGENT_ID=$(grep "agentId" "$HOME/.memphis/config.yaml" 2>/dev/null | cut -d'"' -f2 || echo "watra")
    MY_NAME="${AGENT_ID:-watra}"
else
    MY_NAME="watra"
fi
SHARED_KEY="84454071390f819484b9dc8ea170364ab24acfce6fc55b129bd4832274b3dfff"
MEMPHIS_DIR="$HOME/memphis"
INBOX_DIR="$MEMPHIS_DIR/messages/inbox"
PROCESSED_DIR="$MEMPHIS_DIR/messages/processed"
mkdir -p "$INBOX_DIR" "$PROCESSED_DIR"

DAEMON_MODE="${1:---normal}"

echo "📥 CHECKING FOR NEW MESSAGES"
echo "============================"
echo "Recipient: $MY_NAME"
echo ""

# 1. Check share chain for messages to me
cd "$MEMPHIS_DIR"
NEW_MESSAGES=$(node dist/cli/index.js show share --tags to-${MY_NAME} --format json 2>/dev/null | jq -r '.[] | select(.data.tags[] | contains("to-'$MY_NAME'")) | @base64' | tail -5 || echo "")

if [ -z "$NEW_MESSAGES" ]; then
    echo "📭 No new messages"
    exit 0
fi

# 2. Process each message
echo "$NEW_MESSAGES" | while read -r MSG_B64; do
    MSG=$(echo "$MSG_B64" | base64 -d)
    CONTENT=$(echo "$MSG" | jq -r '.data.content')

    # Parse metadata
    MESSAGE_ID=$(echo "$CONTENT" | grep -o 'id=[^;]*' | cut -d'=' -f2)
    SENDER=$(echo "$CONTENT" | grep -o 'from=[^;]*' | cut -d'=' -f2)
    CID=$(echo "$CONTENT" | grep -o 'cid=[^;]*' | cut -d'=' -f2)
    TIMESTAMP=$(echo "$CONTENT" | grep -o 'time=[^;]*' | cut -d'=' -f2)

    # Check if already processed
    if [ -f "$PROCESSED_DIR/${MESSAGE_ID}.json" ]; then
        echo "⏭️  Message $MESSAGE_ID already processed"
        continue
    fi

    echo ""
    echo "📨 NEW MESSAGE from $SENDER!"
    echo "   ID: $MESSAGE_ID"
    echo "   Time: $TIMESTAMP"
    echo "   CID: $CID"

    # 3. Download from Pinata
    echo "☁️  Downloading from Pinata..."
    ENCRYPTED_FILE="/tmp/msg-${MESSAGE_ID}.enc"
    "$MEMPHIS_DIR/pinata-download.sh" "$CID" "$ENCRYPTED_FILE" 2>&1 | grep -v DEBUG

    if [ ! -f "$ENCRYPTED_FILE" ]; then
        echo "❌ Failed to download message"
        continue
    fi

    # 4. Decrypt message
    echo "🔓 Decrypting message..."
    DECRYPTED=$(openssl enc -aes-256-cbc -d -pbkdf2 -pass pass:"$SHARED_KEY" -in "$ENCRYPTED_FILE" 2>/dev/null || echo '{"message":"DECRYPTION_FAILED"}')

    MESSAGE_TEXT=$(echo "$DECRYPTED" | jq -r '.message')
    MSG_TIMESTAMP=$(echo "$DECRYPTED" | jq -r '.timestamp')

    # 5. Display message
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║              📨 MESSAGE FROM ${SENDER^^}                        ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "Time: $MSG_TIMESTAMP"
    echo "Message:"
    echo "  $MESSAGE_TEXT"
    echo ""

    # 6. Store in inbox
    INBOX_FILE="$INBOX_DIR/${TIMESTAMP}_${SENDER}.json"
    echo "$DECRYPTED" > "$INBOX_FILE"
    echo "💾 Saved to: $INBOX_FILE"

    # 7. Mark as processed
    PROCESSED_FILE="$PROCESSED_DIR/${MESSAGE_ID}.json"
    echo "$DECRYPTED" > "$PROCESSED_FILE"
    echo "✅ Marked as processed"

    # 8. Send ACK
    if [ "$DAEMON_MODE" != "--daemon" ]; then
        ACK_MSG="ACK:id=${MESSAGE_ID};from=${MY_NAME};to=${SENDER};status=received;time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        node dist/cli/index.js journal "$ACK_MSG" --chain share --tags ack,from-${MY_NAME},msgid-${MESSAGE_ID} 2>&1 | grep -v DEBUG
        echo "✉️  ACK sent to $SENDER"
    fi

    # Cleanup
    rm -f "$ENCRYPTED_FILE"
done

echo ""
echo "📬 Message check complete"
