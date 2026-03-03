#!/usr/bin/env bash
#
# Memphis Automated Backup Script
# Creates backups before risky operations
#
# @version 3.0.1
# @date 2026-03-03

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
MEMPHIS_HOME="${MEMPHIS_HOME:-$HOME/.memphis}"
BACKUP_DIR="$MEMPHIS_HOME/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Parse arguments
BACKUP_TYPE="${1:-manual}"
DESCRIPTION="${2:-}"
KEEP_DAYS=${3:-30}

# Backup naming
BACKUP_NAME="backup-$BACKUP_TYPE-$TIMESTAMP"
BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.tar.gz"
BACKUP_META="$BACKUP_DIR/$BACKUP_NAME.meta.json"

echo "💾 Memphis Automated Backup"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if Memphis is initialized
if [ ! -d "$MEMPHIS_HOME/chains" ]; then
    echo -e "${RED}✗ Memphis not initialized${NC}"
    echo "  Run: memphis init"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Count items to backup
CHAIN_COUNT=$(find "$MEMPHIS_HOME/chains" -name "*.json" 2>/dev/null | wc -l)
CONFIG_COUNT=0
[ -f "$MEMPHIS_HOME/config.yaml" ] && CONFIG_COUNT=$((CONFIG_COUNT + 1))
[ -f "$MEMPHIS_HOME/providers.yaml" ] && CONFIG_COUNT=$((CONFIG_COUNT + 1))

echo "📊 Backup summary:"
echo "  • Type: $BACKUP_TYPE"
echo "  • Chains: $CHAIN_COUNT files"
echo "  • Configs: $CONFIG_COUNT files"
echo "  • Destination: $BACKUP_FILE"
echo ""

# Create backup
echo "🔄 Creating backup..."

# Backup chains (most critical)
if [ -d "$MEMPHIS_HOME/chains" ]; then
    tar -czf "$BACKUP_FILE" -C "$MEMPHIS_HOME" chains/ 2>/dev/null || {
        echo -e "${RED}✗ Backup failed${NC}"
        exit 1
    }
else
    echo -e "${RED}✗ No chains directory found${NC}"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

# Create metadata file
cat > "$BACKUP_META" <<EOF
{
  "backup_type": "$BACKUP_TYPE",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "description": "$DESCRIPTION",
  "file": "$BACKUP_NAME.tar.gz",
  "size": "$BACKUP_SIZE",
  "chains_count": $CHAIN_COUNT,
  "memphis_version": "3.0.1",
  "hostname": "$(hostname)",
  "username": "$(whoami)"
}
EOF

echo -e "${GREEN}✓ Backup created: $BACKUP_NAME.tar.gz ($BACKUP_SIZE)${NC}"

# Cleanup old backups
echo ""
echo "🧹 Cleaning old backups (keeping last $KEEP_DAYS days)..."
find "$BACKUP_DIR" -name "backup-*.tar.gz" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "backup-*.meta.json" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true

REMAINING_BACKUPS=$(ls -1 "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Cleanup complete ($REMAINING_BACKUPS backups remaining)${NC}"

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -lt "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -5 | while read -r line; do
    BACKUP_FILE_NAME=$(echo "$line" | awk '{print $9}' | xargs basename)
    BACKUP_SIZE=$(echo "$line" | awk '{print $5}')
    echo "  • $BACKUP_FILE_NAME ($BACKUP_SIZE)"
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Backup complete!${NC}"
echo ""
echo "To restore:"
echo "  tar -xzf $BACKUP_FILE -C $MEMPHIS_HOME"
echo ""
echo "To list all backups:"
echo "  ls -lh $BACKUP_DIR/backup-*.tar.gz"
echo "═══════════════════════════════════════════════════════"
