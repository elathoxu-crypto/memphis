#!/bin/bash
# Test chain integration
echo "Testing Nexus Chain Integration..."

# 1. Send test message
echo "1. Sending test message to chain..."
node dist/cli/index.js journal "TestChain: Testing chain integration" --tags nexus,test

# 2. Recall
echo "2. Recalling messages..."
node dist/cli/index.js recall "nexus" --tag nexus --limit 3

echo ""
echo "✅ Chain integration test complete!"
