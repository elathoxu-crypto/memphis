#!/bin/bash
# Model C Integration Test Suite
# 
# Tests the complete Model C pipeline end-to-end.
#
# Usage: ./scripts/test-model-c.sh

set -e

echo "🧪 MODEL C INTEGRATION TEST SUITE"
echo "=================================="
echo ""

PASS=0
FAIL=0
TOTAL=0

test_command() {
    local name="$1"
    local cmd="$2"
    local expected="$3"
    
    TOTAL=$((TOTAL + 1))
    echo "Test $TOTAL: $name"
    
    if output=$(eval "$cmd" 2>&1); then
        if echo "$output" | grep -q "$expected"; then
            echo "  ✅ PASS"
            PASS=$((PASS + 1))
        else
            echo "  ❌ FAIL: Expected '$expected'"
            echo "  Output: $output"
            FAIL=$((FAIL + 1))
        fi
    else
        echo "  ❌ FAIL: Command failed"
        echo "  Error: $output"
        FAIL=$((FAIL + 1))
    fi
    
    echo ""
}

# Test 1: Pattern Learning
test_command \
    "Pattern learning" \
    "node ~/memphis/dist/cli/index.js predict --learn --since 7 2>&1 | grep -v DEBUG" \
    "patterns"

# Test 2: Context Analysis
test_command \
    "Context analysis" \
    "node ~/memphis/dist/cli/index.js predict 2>&1 | grep -v DEBUG" \
    "PREDICTED DECISIONS"

# Test 3: Pattern List
test_command \
    "Pattern listing" \
    "node ~/memphis/dist/cli/index.js patterns list 2>&1 | grep -v DEBUG" \
    "LEARNED PATTERNS"

# Test 4: Pattern Stats
test_command \
    "Pattern stats" \
    "node ~/memphis/dist/cli/index.js patterns stats 2>&1 | grep -v DEBUG" \
    "PATTERN STATISTICS"

# Test 5: Proactive Suggestions
test_command \
    "Proactive suggestions" \
    "node ~/memphis/dist/cli/index.js suggest --force 2>&1 | grep -v DEBUG" \
    "suggestions"

# Test 6: Accuracy Tracking
test_command \
    "Accuracy tracking" \
    "node ~/memphis/dist/cli/index.js accuracy 2>&1 | grep -v DEBUG" \
    "ACCURACY"

# Test 7: JSON Output (patterns)
test_command \
    "JSON output (patterns)" \
    "node ~/memphis/dist/cli/index.js patterns stats --json 2>&1 | grep -v DEBUG | grep -q totalPatterns && echo 'valid JSON'" \
    "valid JSON"

# Test 8: Performance Test
echo "Test 8: Performance (<1000ms)"
START=$(date +%s%N)
node ~/memphis/dist/cli/index.js predict >/dev/null 2>&1
END=$(date +%s%N)
DURATION=$(((END - START) / 1000000))

TOTAL=$((TOTAL + 1))
if [ $DURATION -lt 1000 ]; then
    echo "  ✅ PASS (${DURATION}ms)"
    PASS=$((PASS + 1))
else
    echo "  ❌ FAIL (${DURATION}ms, target <1000ms)"
    FAIL=$((FAIL + 1))
fi
echo ""

# Summary
echo "=================================="
echo "RESULTS"
echo "=================================="
echo "Total: $TOTAL"
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ ALL TESTS PASSED!"
    exit 0
else
    echo "❌ SOME TESTS FAILED"
    exit 1
fi
