#!/bin/bash
# encrypted-sync-simple.sh — Encrypted sync via IPFS
# Ported from PC #2 (Memphis) to PC #1 (Watra)
# Created: 2026-03-02 20:04 CET

# set -e  # Disabled for testing

# Shared encryption key (from config or env)
EXCHANGE_KEY="${AGENT_EXCHANGE_KEY:-$(grep exchangeKey ~/.memphis/config.yaml 2>/dev/null | awk '{print $2}')"

if [ -z "$EXCHANGE_KEY" ]; then
    echo "❌ ERROR: No exchange key found"
    echo "Set AGENT_EXCHANGE_KEY or add to config.yaml"
    exit 1
fi

# Temp directory
TEMP_DIR="/tmp/memphis-encrypted"
mkdir -p "$TEMP_DIR"

# Encrypt function
encrypt_data() {
    local input="$1"
    local output="$2"

    # Generate random salt and IV
    SALT=$(openssl rand -hex 8)
    IV=$(openssl rand -hex 16)

    # Encrypt with AES-256-CBC
    echo "$input" | openssl enc -aes-256-cbc -salt -pbkdf2 \
        -pass pass:"$EXCHANGE_KEY" \
        -iv "$IV" \
        -out "$output"

    # Prepend salt and IV
    echo "${SALT}:${IV}:$(cat "$output" | base64)" > "$output"
}

# Decrypt function
decrypt_data() {
    local input="$1"
    local output="$2"

    # Extract salt, IV, and ciphertext
    SALT=$(cut -d':' -f1 "$input")
    IV=$(cut -d':' -f2 "$input")
    CIPHERTEXT=$(cut -d':' -f3 "$input")

    # Decrypt
    echo "$CIPHERTEXT" | base64 -d | openssl enc -aes-256-cbc -d -pbkdf2 \
        -pass pass:"$EXCHANGE_KEY" \
        -iv "$IV" \
        -out "$output"
}

# Test encryption
test_encryption() {
    echo "🧪 Testing encryption..."

    TEST_DATA='{"test": "hello from Watra!", "timestamp": "'$(date -Iseconds)'"}'
    TEST_ENCRYPTED="$TEMP_DIR/test.encrypted"
    TEST_DECRYPTED="$TEMP_DIR/test.decrypted"

    # Encrypt
    encrypt_data "$TEST_DATA" "$TEST_ENCRYPTED"
    echo "✅ Encrypted: $(wc -c < "$TEST_ENCRYPTED") bytes"

    # Decrypt
    decrypt_data "$TEST_ENCRYPTED" "$TEST_DECRYPTED"
    echo "✅ Decrypted: $(cat "$TEST_DECRYPTED")"

    # Verify
    if [ "$(cat "$TEST_DECRYPTED")" = "$TEST_DATA" ]; then
        echo "✅ VERIFICATION PASSED!"
    else
        echo "❌ VERIFICATION FAILED!"
        exit 1
    fi
}

# Push encrypted blocks to IPFS
push_blocks() {
    local count="${1:-10}"

    echo "📤 Pushing $count encrypted blocks..."

    # Get recent blocks
    BLOCKS_FILE="$TEMP_DIR/blocks.json"
    cd ~/memphis
    node dist/cli/index.js status > "$BLOCKS_FILE" 2>&1

    # Encrypt
    ENCRYPTED_FILE="$TEMP_DIR/blocks.encrypted"
    encrypt_data "$(cat "$BLOCKS_FILE")" "$ENCRYPTED_FILE"

    # Add to IPFS
    CID=$(ipfs add -Q "$ENCRYPTED_FILE")
    echo "✅ Encrypted blocks pushed!"
    echo "📦 CID: $CID"

    # Log CID
    node dist/cli/index.js journal "🔐 Encrypted sync: CID=$CID, blocks=$count" --chain share --tags encrypted,sync,ipfs 2>&1 | grep -v DEBUG
}

# Pull encrypted blocks from IPFS
pull_blocks() {
    local cid="$1"

    if [ -z "$cid" ]; then
        echo "❌ ERROR: CID required"
        echo "Usage: $0 pull <CID>"
        exit 1
    fi

    echo "📥 Pulling encrypted blocks from CID: $cid..."

    # Download from IPFS
    ENCRYPTED_FILE="$TEMP_DIR/blocks_downloaded.encrypted"
    ipfs cat "$cid" > "$ENCRYPTED_FILE"

    # Decrypt
    DECRYPTED_FILE="$TEMP_DIR/blocks_downloaded.json"
    decrypt_data "$ENCRYPTED_FILE" "$DECRYPTED_FILE"

    echo "✅ Decrypted blocks:"
    cat "$DECRYPTED_FILE"
}

# Main
COMMAND="${1:-test}"

if [ "$COMMAND" = "test" ]; then
    test_encryption
elif [ "$COMMAND" = "push" ]; then
    push_blocks "${2:-10}"
elif [ "$COMMAND" = "pull" ]; then
    pull_blocks "$2"
else
    echo "Usage: $0 {test|push|pull}"
    echo "  test         - Test encryption"
    echo "  push [N]     - Push N encrypted blocks"
    echo "  pull <CID>   - Pull encrypted blocks"
    exit 1
fi
