#!/bin/bash
# setup-auto-sync.sh — Configure automatic sync between PCs
# Created: 2026-03-02 20:27 CET
# Usage: ./setup-auto-sync.sh [install|status|remove]

set -e

cd ~/memphis

COMMAND="${1:-install}"

echo "🔄 MEMPHIS AUTO-SYNC SETUP"
echo "=========================="
echo ""

# Check if encryption key is set
if [ -z "$AGENT_EXCHANGE_KEY" ]; then
    echo "⚠️ WARNING: AGENT_EXCHANGE_KEY not set!"
    echo "   Setting from config..."

    KEY_FROM_CONFIG=$(grep exchangeKey ~/.memphis/config.yaml 2>/dev/null | awk '{print $2}')

    if [ -z "$KEY_FROM_CONFIG" ]; then
        echo "❌ ERROR: No encryption key found!"
        echo "   Set AGENT_EXCHANGE_KEY or add to config.yaml"
        exit 1
    fi

    export AGENT_EXCHANGE_KEY="$KEY_FROM_CONFIG"
    echo "✅ Key loaded from config"
fi

# Check if IPFS is running
if ! command -v ipfs &> /dev/null; then
    echo "❌ ERROR: IPFS not found!"
    echo "   Install: https://docs.ipfs.tech/install/command-line/"
    exit 1
fi

IPFS_PEERS=$(ipfs swarm peers 2>/dev/null | wc -l || echo "0")

if [ "$IPFS_PEERS" -eq 0 ]; then
    echo "⚠️ WARNING: IPFS not connected to network"
    echo "   Starting IPFS daemon..."
    ipfs daemon &
    sleep 5
fi

echo "✅ IPFS ready ($IPFS_PEERS peers)"
echo ""

case "$COMMAND" in
    install)
        echo "📦 INSTALLING AUTO-SYNC"
        echo "======================="
        echo ""

        # Create sync script
        cat > ~/memphis/auto-sync.sh << 'SCRIPT'
#!/bin/bash
# Auto-sync script (runs every 30 minutes via cron)

set -e

cd ~/memphis

# Load encryption key
export AGENT_EXCHANGE_KEY="${AGENT_EXCHANGE_KEY:-$(grep exchangeKey ~/.memphis/config.yaml 2>/dev/null | awk '{print $2}')}"

LOG_FILE=~/.memphis/logs/sync.log
mkdir -p ~/.memphis/logs

echo "[$(date -Iseconds)] Auto-sync started" >> "$LOG_FILE"

# Pull from network
node dist/cli/index.js share-sync --pull >> "$LOG_FILE" 2>&1 || echo "Pull failed (may be no new data)" >> "$LOG_FILE"

# Push local changes (limit 5 to avoid spam)
node dist/cli/index.js share-sync --push --limit 5 >> "$LOG_FILE" 2>&1 || echo "Push failed (may be no new data)" >> "$LOG_FILE"

echo "[$(date -Iseconds)] Auto-sync completed" >> "$LOG_FILE"
SCRIPT

        chmod +x ~/memphis/auto-sync.sh
        echo "✅ Created: ~/memphis/auto-sync.sh"
        echo ""

        # Add to crontab
        echo "⏰ Adding to crontab..."

        # Check if already exists
        if crontab -l 2>/dev/null | grep -q "auto-sync.sh"; then
            echo "⚠️ Auto-sync already in crontab"
        else
            # Add cron job (every 30 minutes)
            (crontab -l 2>/dev/null; echo "*/30 * * * * cd ~/memphis && ~/memphis/auto-sync.sh") | crontab -
            echo "✅ Added to crontab"
        fi

        echo ""
        echo "📋 CRONTAB STATUS:"
        crontab -l | grep auto-sync || echo "No cron job found"
        echo ""

        echo "🎉 AUTO-SYNC INSTALLED!"
        echo "======================"
        echo ""
        echo "Schedule: Every 30 minutes"
        echo "Log file: ~/.memphis/logs/sync.log"
        echo ""
        echo "Monitor:"
        echo "  tail -f ~/.memphis/logs/sync.log"
        echo ""
        echo "Test manual sync:"
        echo "  ~/memphis/auto-sync.sh"
        ;;

    status)
        echo "📊 AUTO-SYNC STATUS"
        echo "==================="
        echo ""

        # Check cron
        if crontab -l 2>/dev/null | grep -q "auto-sync.sh"; then
            echo "✅ Cron job: ACTIVE"
            crontab -l | grep auto-sync
        else
            echo "❌ Cron job: NOT FOUND"
        fi

        echo ""

        # Check script
        if [ -f ~/memphis/auto-sync.sh ]; then
            echo "✅ Sync script: EXISTS"
            echo "   Location: ~/memphis/auto-sync.sh"
        else
            echo "❌ Sync script: NOT FOUND"
        fi

        echo ""

        # Check last sync
        if [ -f ~/.memphis/logs/sync.log ]; then
            echo "📝 Last sync log:"
            tail -5 ~/.memphis/logs/sync.log
        else
            echo "⚠️ No sync log found"
        fi

        echo ""

        # Check IPFS
        IPFS_STATUS=$(ipfs swarm peers 2>/dev/null | wc -l || echo "0")
        echo "🌐 IPFS peers: $IPFS_STATUS"
        ;;

    remove)
        echo "🗑️ REMOVING AUTO-SYNC"
        echo "====================="
        echo ""

        # Remove from crontab
        echo "Removing from crontab..."
        crontab -l 2>/dev/null | grep -v "auto-sync.sh" | crontab -
        echo "✅ Removed from crontab"

        # Remove script
        if [ -f ~/memphis/auto-sync.sh ]; then
            rm ~/memphis/auto-sync.sh
            echo "✅ Removed: ~/memphis/auto-sync.sh"
        fi

        echo ""
        echo "🎉 AUTO-SYNC REMOVED"
        ;;

    *)
        echo "Usage: $0 {install|status|remove}"
        exit 1
        ;;
esac
