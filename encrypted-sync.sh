#!/bin/bash
# Encrypted Sync Wrapper Script (FIXED - uses AES-256-CBC)
# Provides encrypted multi-agent knowledge exchange

set -e

# Configuration
MEMPHIS_DIR="${MEMPHIS_DIR:-$HOME/.memphis}"
MEMPHIS_CLI="node $HOME/memphis/dist/cli/index.js"
ENCRYPTION_KEY="${AGENT_EXCHANGE_KEY:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

# Check encryption key
check_key() {
    if [ -z "$ENCRYPTION_KEY" ]; then
        # Try to load from config
        if [ -f "$MEMPHIS_DIR/config.yaml" ]; then
            ENCRYPTION_KEY=$(grep -oP 'exchangeKey:\s*\K[a-f0-9]{64}' "$MEMPHIS_DIR/config.yaml" || true)
        fi

        if [ -z "$ENCRYPTION_KEY" ]; then
            log_error "No encryption key found!"
            echo ""
            echo "Set AGENT_EXCHANGE_KEY environment variable or add to config.yaml:"
            echo "  export AGENT_EXCHANGE_KEY=\$(openssl rand -hex 32)"
            echo "  # OR"
            echo "  echo '  exchangeKey: \$(openssl rand -hex 32)' >> $MEMPHIS_DIR/config.yaml"
            exit 1
        fi
    fi

    # Derive actual encryption key from the exchange key
    export ENC_KEY=$(echo -n "$ENCRYPTION_KEY" | openssl dgst -sha256 -binary | hexdump -C | head -1 | awk '{print $2$3$4$5$6$7$8$9}' | tr -d ' ')

    log_success "Encryption key loaded and derived"
}

# Encrypt a file (AES-256-CBC)
encrypt_file() {
    local input="$1"
    local output="$2"

    # Generate random IV
    local iv=$(openssl rand -hex 16)

    # Encrypt with AES-256-CBC
    openssl enc -aes-256-cbc \
        -in "$input" \
        -out "$output" \
        -K "$ENC_KEY" \
        -iv "$iv" \
        2>/dev/null

    # Prepend IV to encrypted file
    echo "$iv" | cat - "$output" > /tmp/temp-enc && mv /tmp/temp-enc "$output"
}

# Decrypt a file (AES-256-CBC)
decrypt_file() {
    local input="$1"
    local output="$2"

    # Extract IV (first 32 hex chars = 16 bytes)
    local iv=$(head -c 32 "$input")

    # Decrypt (skip first line with IV)
    tail -c +33 "$input" | openssl enc -aes-256-cbc -d \
        -K "$ENC_KEY" \
        -iv "$iv" \
        -out "$output" \
        2>/dev/null
}

# Push encrypted blocks
push_encrypted() {
    local limit="${1:-10}"

    log_info "Exporting blocks for encrypted sharing..."

    # Get share-tagged blocks
    local blocks_json=$($MEMPHIS_CLI show share --limit "$limit" --json 2>/dev/null)

    if [ -z "$blocks_json" ] || [ "$blocks_json" = "[]" ]; then
        log_warning "No share-tagged blocks found"
        return 0
    fi

    local count=$(echo "$blocks_json" | jq 'length')
    log_info "Found $count blocks to encrypt and share"

    local encrypted_count=0
    local temp_dir=$(mktemp -d)

    # Process each block
    echo "$blocks_json" | jq -c '.[]' | while read -r block; do
        local index=$(echo "$block" | jq -r '.index')
        local chain=$(echo "$block" | jq -r '.chain')

        # Save block to temp file
        local temp_plain="$temp_dir/block-${chain}-${index}.json"
        local temp_encrypted="$temp_dir/block-${chain}-${index}.enc"

        echo "$block" > "$temp_plain"

        # Encrypt
        if encrypt_file "$temp_plain" "$temp_encrypted"; then
            # Upload to IPFS
            local cid=$($MEMPHIS_CLI ipfs upload "$temp_encrypted" 2>/dev/null | grep -oP 'Qm[a-zA-Z0-9]{44}' || true)

            if [ -n "$cid" ]; then
                log_success "Encrypted & uploaded: ${chain}#${index} → ${cid}"
                # Update network-chain
                echo "{\"cid\":\"$cid\",\"agent\":\"watra\",\"timestamp\":\"$(date -Iseconds)\",\"chain\":\"$chain\",\"index\":$index,\"encrypted\":true}" >> "$MEMPHIS_DIR/network-chain.jsonl"
            fi
        else
            log_error "Failed to encrypt ${chain}#${index}"
        fi
    done

    # Cleanup
    rm -rf "$temp_dir"

    echo ""
    log_success "Encrypted push complete"
}

# Pull and decrypt blocks
pull_encrypted() {
    log_info "Pulling encrypted blocks from network..."

    if [ ! -f "$MEMPHIS_DIR/network-chain.jsonl" ]; then
        log_warning "No network-chain found"
        return 0
    fi

    local decrypted_count=0
    local temp_dir=$(mktemp -d)

    # Process each encrypted entry
    grep '"encrypted":true' "$MEMPHIS_DIR/network-chain.jsonl" | while read -r entry; do
        local cid=$(echo "$entry" | jq -r '.cid')
        local chain=$(echo "$entry" | jq -r '.chain')

        log_info "Processing $cid..."

        # Download from IPFS
        local temp_encrypted="$temp_dir/block-${cid}.enc"
        local temp_decrypted="$temp_dir/block-${cid}.json"

        if $MEMPHIS_CLI ipfs download "$cid" > "$temp_encrypted" 2>/dev/null; then
            # Try to decrypt
            if decrypt_file "$temp_encrypted" "$temp_decrypted"; then
                # Import to chain
                if cat "$temp_decrypted" | $MEMPHIS_CLI import "$chain" 2>&1 | grep -q "✓"; then
                    log_success "Decrypted & imported: ${cid} → ${chain}"
                    ((decrypted_count++)) || true
                fi
            else
                log_error "Failed to decrypt $cid (wrong key?)"
            fi
        else
            log_warning "Could not download $cid"
        fi
    done

    # Cleanup
    rm -rf "$temp_dir"

    echo ""
    log_success "Decrypted pull complete"
}

# Main
main() {
    local action="${1:-help}"
    local limit="${2:-10}"

    echo "🔐 Memphis Encrypted Sync (AES-256-CBC)"
    echo "========================================="
    echo ""

    check_key

    case "$action" in
        push)
            push_encrypted "$limit"
            ;;
        pull)
            pull_encrypted
            ;;
        sync)
            push_encrypted "$limit"
            echo ""
            pull_encrypted
            ;;
        test)
            echo "🧪 Testing encryption/decryption..."
            echo '{"test":"encryption"}' > /tmp/test.json
            encrypt_file /tmp/test.json /tmp/test.enc
            decrypt_file /tmp/test.enc /tmp/test2.json
            if diff -q /tmp/test.json /tmp/test2.json > /dev/null; then
                log_success "Encryption test PASSED!"
            else
                log_error "Encryption test FAILED!"
            fi
            rm -f /tmp/test.json /tmp/test.enc /tmp/test2.json
            ;;
        help|*)
            echo "Usage: $0 {push|pull|sync|test} [limit]"
            echo ""
            echo "Commands:"
            echo "  push [limit]  - Encrypt and push blocks to IPFS"
            echo "  pull          - Pull and decrypt blocks from IPFS"
            echo "  sync [limit]  - Push + Pull"
            echo "  test          - Test encryption/decryption"
            echo ""
            echo "Environment:"
            echo "  AGENT_EXCHANGE_KEY  - Encryption key (hex, 64 chars)"
            echo ""
            echo "Example:"
            echo "  export AGENT_EXCHANGE_KEY=\$(openssl rand -hex 32)"
            echo "  $0 sync 20"
            ;;
    esac
}

main "$@"
