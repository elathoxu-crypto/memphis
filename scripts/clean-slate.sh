#!/bin/bash
# Memphis Clean Slate Script
# Removes deployment-specific blocks for production clean state

JOURNAL_DIR="$HOME/.memphis/chains/journal"
BACKUP_DIR="$HOME/.memphis/backups/pre-clean-$(date +%Y%m%d-%H%M%S)"

echo "🧹 Memphis Clean Slate - Removing deployment artifacts"
echo ""

# Create backup
echo "📦 Creating backup..."
mkdir -p "$BACKUP_DIR"
cp -r "$JOURNAL_DIR" "$BACKUP_DIR/"
echo "✓ Backup saved: $BACKUP_DIR"
echo ""

# Count before
TOTAL_BEFORE=$(ls "$JOURNAL_DIR"/*.json 2>/dev/null | wc -l)
echo "📊 Journal blocks before: $TOTAL_BEFORE"

# Remove blocks with deployment tags
echo ""
echo "🗑️  Removing blocks with deployment tags..."

REMOVED=0
for tag in "multi-agent" "agent-comm" "watra" "style" "campfire"; do
    FILES=$(grep -l "\"$tag\"" "$JOURNAL_DIR"/*.json 2>/dev/null)
    COUNT=$(echo "$FILES" | grep -c ".json" 2>/dev/null || echo "0")
    
    if [ "$COUNT" -gt 0 ]; then
        echo "  Tag '$tag': $COUNT blocks"
        echo "$FILES" | xargs rm -f 2>/dev/null
        REMOVED=$((REMOVED + COUNT))
    fi
done

echo ""
echo "✓ Removed $REMOVED deployment blocks"

# Reindex remaining blocks
echo ""
echo "📝 Reindexing blocks..."
cd "$JOURNAL_DIR"
INDEX=0
for file in $(ls *.json 2>/dev/null | sort -V); do
    # Pad index to 6 digits
    NEW_NAME=$(printf "%06d.json" $INDEX)
    
    if [ "$file" != "$NEW_NAME" ]; then
        mv "$file" "$NEW_NAME" 2>/dev/null
        # Update index in file
        sed -i "s/\"index\": [0-9]*/\"index\": $INDEX/" "$NEW_NAME" 2>/dev/null
    fi
    
    INDEX=$((INDEX + 1))
done

TOTAL_AFTER=$INDEX
echo "✓ Reindexed $TOTAL_AFTER blocks"

echo ""
echo "📊 Summary:"
echo "  Before: $TOTAL_BEFORE blocks"
echo "  Removed: $REMOVED blocks"
echo "  After: $TOTAL_AFTER blocks"
echo "  Backup: $BACKUP_DIR"
echo ""
echo "✨ Clean slate complete!"
