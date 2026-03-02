#!/bin/bash
# test-relay-sync.sh — Test Memphis chain sync via IPFS relay
# Created: 2026-03-02 19:59 CET

set -e

MANIFEST_CID="QmRcy5Wep7txahUjiKNNpAi96LqvutpBjk1coey8p8Lkmf"

echo "🧪 TESTING IPFS RELAY CONNECTION"
echo "=================================="
echo ""

echo "📡 Step 1: Download manifest from PC #1 (Watra)..."
if timeout 30 ipfs cat $MANIFEST_CID > /tmp/memphis-manifest-received.json 2>&1; then
    echo "✅ SUCCESS! Manifest downloaded:"
    cat /tmp/memphis-manifest-received.json
    echo ""
else
    echo "❌ FAILED! Relay not working"
    exit 1
fi

echo ""
echo "📊 Step 2: Parse manifest..."
if command -v jq &> /dev/null; then
    AGENT_ID=$(jq -r '.agent.id' /tmp/memphis-manifest-received.json)
    CHAIN_COUNT=$(jq '.chains.total' /tmp/memphis-manifest-received.json)
    echo "Agent: $AGENT_ID"
    echo "Chains: $CHAIN_COUNT blocks"
else
    echo "jq not installed, skipping parse"
fi

echo ""
echo "✅ RELAY CONNECTION VERIFIED!"
echo "Next: Implement Memphis export/import"
