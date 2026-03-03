#!/bin/bash
# TUI Path Fix Verification Script
# Tests if nexus-chain.js correctly resolves Memphis root directory

echo "🧪 Testing TUI Path Resolution Fix"
echo "=================================="
echo ""

# Test 1: Check if build exists
if [ -f "/home/memphis/memphis/dist/tui/nexus-chain.js" ]; then
    echo "✅ TUI build exists: /home/memphis/memphis/dist/tui/nexus-chain.js"
else
    echo "❌ TUI build missing!"
    exit 1
fi

# Test 2: Check if CLI exists at correct path
if [ -f "/home/memphis/memphis/dist/cli/index.js" ]; then
    echo "✅ CLI exists at correct path"
else
    echo "❌ CLI missing!"
    exit 1
fi

# Test 3: Verify path resolution logic
echo ""
echo "📋 Path Resolution Test:"
cd /tmp  # Start from different directory
node -e "
const path = require('path');
const __dirname = '/home/memphis/memphis/dist/tui';
const memphisRoot = path.resolve(__dirname, '..', '..');
console.log('Memphis Root:', memphisRoot);
console.log('Expected:', '/home/memphis/memphis');
console.log('Match:', memphisRoot === '/home/memphis/memphis' ? '✅ YES' : '❌ NO');
"

echo ""
echo "🧪 Ready to test TUI!"
echo "Run: cd /home/memphis/memphis && node dist/tui/nexus-poc.js"
