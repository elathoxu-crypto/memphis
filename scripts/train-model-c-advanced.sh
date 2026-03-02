#!/bin/bash
# train-model-c-advanced.sh — Advanced Model C training with git integration
# Created: 2026-03-02 20:25 CET
# Usage: ./train-model-c-advanced.sh

set -e

cd ~/memphis

echo "🧠 MODEL C ADVANCED TRAINING"
echo "============================"
echo ""

# Check current status
echo "📊 Current status:"
DECISIONS_BEFORE=$(ls ~/.memphis/chains/decisions/*.json 2>/dev/null | wc -l || echo "0")
PATTERNS_BEFORE=$(node dist/cli/index.js patterns stats 2>&1 | grep "Total patterns:" | awk '{print $3}' || echo "0")

echo "Decisions: $DECISIONS_BEFORE"
echo "Patterns: $PATTERNS_BEFORE"
echo ""

# TRAINING METHOD 1: Git Commit Analysis (20 decisions)
echo "📥 METHOD 1: Git Commit Analysis (20 decisions)"
echo "================================================"

COMMIT_COUNT=0
for commit in $(git log --oneline --all --since="2026-02-01" --grep="feat\|fix\|docs\|chore\|refactor" | head -20 | awk '{print $1}'); do
    MSG=$(git log --format=%s -n 1 $commit)
    CONF=$(echo "scale=2; 0.6 + ($RANDOM % 30) / 100" | bc)

    # Categorize commit
    CATEGORY=""
    if echo "$MSG" | grep -qi "feat"; then
        CATEGORY="feature"
    elif echo "$MSG" | grep -qi "fix"; then
        CATEGORY="bugfix"
    elif echo "$MSG" | grep -qi "docs"; then
        CATEGORY="documentation"
    elif echo "$MSG" | grep -qi "refactor"; then
        CATEGORY="refactoring"
    else
        CATEGORY="maintenance"
    fi

    node dist/cli/index.js decision "[Git:$CATEGORY] $MSG" --confidence $CONF --tags inferred,git,$CATEGORY 2>&1 | grep -v DEBUG
    COMMIT_COUNT=$((COMMIT_COUNT + 1))
done

echo "✅ Added $COMMIT_COUNT git-based decisions"
echo ""

# TRAINING METHOD 2: Pattern-Based Decisions (20 decisions)
echo "🧩 METHOD 2: Pattern-Based Decisions (20 decisions)"
echo "===================================================="

DECISIONS=(
    "Always write tests for new features:testing,quality"
    "Use TypeScript strict mode:typescript,quality"
    "Document public APIs:documentation,api"
    "Keep functions under 50 lines:refactoring,clean-code"
    "Use meaningful variable names:naming,readability"
    "Handle errors explicitly:error-handling,robustness"
    "Use async/await over callbacks:async,modern-js"
    "Prefer composition over inheritance:oop,design-patterns"
    "Log important operations:logging,debugging"
    "Use environment variables for config:config,security"
    "Keep dependencies minimal:dependencies,minimalism"
    "Update dependencies weekly:maintenance,security"
    "Use git conventional commits:git,conventions"
    "Review code before merge:code-review,quality"
    "Write integration tests for critical paths:testing,integration"
    "Monitor production metrics:monitoring,production"
    "Use caching strategically:performance,optimization"
    "Implement proper error boundaries:error-handling,frontend"
    "Follow SOLID principles:oop,principles"
    "Write self-documenting code:readability,clean-code"
)

COUNT=0
for decision in "${DECISIONS[@]}"; do
    MSG=$(echo "$decision" | cut -d':' -f1)
    TAGS=$(echo "$decision" | cut -d':' -f2)
    CONF=$(echo "scale=2; 0.75 + ($RANDOM % 20) / 100" | bc)

    node dist/cli/index.js decision "$MSG" --confidence $CONF --tags training,manual,$TAGS 2>&1 | grep -v DEBUG
    COUNT=$((COUNT + 1))
done

echo "✅ Added $COUNT pattern-based decisions"
echo ""

# TRAINING METHOD 3: Project-Specific Decisions (10 decisions)
echo "🎯 METHOD 3: Project-Specific Decisions (10 decisions)"
echo "========================================================"

PROJECT_DECISIONS=(
    "Use Memphis for memory persistence:memphis,architecture"
    "Implement encrypted sync via IPFS:ipfs,encryption,security"
    "Support multi-agent network:multi-agent,scaling"
    "Use Kubo for decentralized storage:kubo,ipfs,decentralization"
    "Implement Models A-E cognitive stack:models,cognitive-architecture"
    "Use relay for NAT traversal:networking,relay,p2p"
    "Support both local and cloud models:llm,flexibility"
    "Implement decision lifecycle:decisions,state-management"
    "Use semantic search for memory:embeddings,search,ai"
    "Support encrypted chain sharing:encryption,sharing,privacy"
)

COUNT=0
for decision in "${PROJECT_DECISIONS[@]}"; do
    MSG=$(echo "$decision" | cut -d':' -f1)
    TAGS=$(echo "$decision" | cut -d':' -f2)
    CONF=$(echo "scale=2; 0.85 + ($RANDOM % 10) / 100" | bc)

    node dist/cli/index.js decision "$MSG" --confidence $CONF --tags training,project,$TAGS 2>&1 | grep -v DEBUG
    COUNT=$((COUNT + 1))
done

echo "✅ Added $COUNT project-specific decisions"
echo ""

# Check progress
echo "📊 Updated status:"
DECISIONS_AFTER=$(ls ~/.memphis/chains/decisions/*.json 2>/dev/null | wc -l || echo "0")
PATTERNS_AFTER=$(node dist/cli/index.js patterns stats 2>&1 | grep "Total patterns:" | awk '{print $3}' || echo "0")

echo "Decisions: $DECISIONS_BEFORE → $DECISIONS_AFTER (+$((DECISIONS_AFTER - DECISIONS_BEFORE)))"
echo "Patterns: $PATTERNS_BEFORE → $PATTERNS_AFTER"
echo ""

# Test predictions
echo "🔮 Testing predictions:"
node dist/cli/index.js predict 2>&1 | grep -v DEBUG
echo ""

# Test suggestions
echo "💡 Testing suggestions:"
node dist/cli/index.js suggest 2>&1 | grep -v DEBUG
echo ""

# Recommendations
echo "🎯 RECOMMENDATIONS:"
echo "=================="
echo ""

if [ "$PATTERNS_AFTER" -lt 5 ]; then
    echo "⚠️ Still need more patterns (current: $PATTERNS_AFTER, target: 10+)"
    echo "   → Run this script again tomorrow"
    echo "   → Add real decisions as you work"
elif [ "$PATTERNS_AFTER" -lt 10 ]; then
    echo "✅ Good progress! (patterns: $PATTERNS_AFTER)"
    echo "   → Run again in 2-3 days for 10+ patterns"
    echo "   → Start testing predictions"
else
    echo "🎉 EXCELLENT! 10+ patterns achieved! ($PATTERNS_AFTER)"
    echo "   → Model C is ready for production"
    echo "   → Monitor accuracy: memphis accuracy"
fi

echo ""
echo "📈 NEXT STEPS:"
echo "1. Use Memphis normally (patterns will auto-learn)"
echo "2. Check patterns weekly: memphis patterns stats"
echo "3. Monitor predictions: memphis predict"
echo "4. Review accuracy: memphis accuracy"
echo ""
echo "Target: 50+ patterns for production-ready Model C"
