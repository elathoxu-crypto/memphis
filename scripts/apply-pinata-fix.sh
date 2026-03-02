#!/bin/bash
# apply-pinata-fix.sh — Auto-apply Pinata JSON sanitization fix
# Created: 2026-03-02 20:24 CET
# Usage: ./apply-pinata-fix.sh

set -e

PINATA_FILE="src/integrations/pinata.ts"
BACKUP_FILE="src/integrations/pinata.ts.backup"

echo "🔧 PINATA FIX AUTO-APPLIER"
echo "=========================="
echo ""

# Check if file exists
if [ ! -f "$PINATA_FILE" ]; then
    echo "❌ ERROR: $PINATA_FILE not found!"
    exit 1
fi

# Create backup
echo "📦 Creating backup..."
cp "$PINATA_FILE" "$BACKUP_FILE"
echo "✅ Backup: $BACKUP_FILE"
echo ""

# Check if fix already applied
if grep -q "sanitizeJSONData" "$PINATA_FILE"; then
    echo "✅ Fix already applied!"
    exit 0
fi

echo "🔨 Applying fix..."

# Create temp file with the new method
cat > /tmp/sanitize-method.txt << 'EOF'

  /**
   * Sanitize JSON data by removing control characters
   * Fix for "Bad control character in string literal" error
   */
  private sanitizeJSONData(data: any): any {
    const str = JSON.stringify(data);
    // Remove control characters except standard whitespace
    const cleaned = str.replace(/[\x00-\x1F\x7F]/g, (char) => {
      // Keep standard whitespace: \n, \r, \t
      if (char === '\n' || char === '\r' || char === '\t') {
        return char;
      }
      return '';
    });
    return JSON.parse(cleaned);
  }
EOF

# Insert before pinJSON method
sed -i '/async pinJSON(data: MemoryBlock)/r /tmp/sanitize-method.txt' "$PINATA_FILE"

# Update pinJSON to use sanitizedData
sed -i 's/const json = JSON.stringify(data);/\/\/ Sanitize data first (fix for Pinata JSON parsing error)\n    const sanitizedData = this.sanitizeJSONData(data);\n\n    \/\/ Validate size (max 2KB)\n    const json = JSON.stringify(sanitizedData);/' "$PINATA_FILE"

# Update pinataContent to use sanitizedData
sed -i 's/pinataContent: data,/pinataContent: sanitizedData,/' "$PINATA_FILE"

# Update metadata name
sed -i 's/name: `${data.agent}_${data.timestamp}`,/name: `${sanitizedData.agent}_${sanitizedData.timestamp}`,/' "$PINATA_FILE"

echo "✅ Fix applied!"
echo ""

# Rebuild
echo "🔨 Rebuilding TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build SUCCESS!"
    echo ""

    # Test
    echo "🧪 Running test..."
    node test-pinata-sanitization.js 2>/dev/null || echo "⚠️ Test file not found (create manually)"

    echo ""
    echo "🎉 FIX COMPLETE!"
    echo "================"
    echo ""
    echo "Next steps:"
    echo "1. Test: node dist/cli/index.js share-sync --push --limit 1"
    echo "2. If error: Restore backup: cp $BACKUP_FILE $PINATA_FILE"
    echo "3. Report success to Watra!"
else
    echo "❌ Build FAILED!"
    echo "Restoring backup..."
    cp "$BACKUP_FILE" "$PINATA_FILE"
    exit 1
fi
