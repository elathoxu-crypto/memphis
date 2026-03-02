#!/bin/bash
# train-model-c.sh — Quick training script for Model C
# Created: 2026-03-02 20:17 CET
# Purpose: Get 10+ patterns in 30 minutes

set -e

cd ~/memphis

echo "🚀 MODEL C TRAINING SCRIPT"
echo "=========================="
echo ""

# Check current status
echo "📊 Current status:"
node dist/cli/index.js patterns stats 2>&1 | grep -v DEBUG
echo ""

# Count decisions
DECISION_COUNT=$(ls ~/.memphis/chains/decisions/*.json 2>/dev/null | wc -l || echo "0")
echo "Current decisions: $DECISION_COUNT"
echo ""

# 1. Add 20 conscious decisions
echo "📝 Step 1: Adding 20 conscious decisions..."
for i in {1..20}; do
  case $i in
    1) MSG="Use TypeScript for type safety" ;;
    2) MSG="Prefer local models over cloud" ;;
    3) MSG="Document all major changes" ;;
    4) MSG="Test before committing" ;;
    5) MSG="Use conventional commits" ;;
    6) MSG="Keep functions under 50 lines" ;;
    7) MSG="Write unit tests for core logic" ;;
    8) MSG="Use meaningful variable names" ;;
    9) MSG="Refactor when complexity > 10" ;;
    10) MSG="Prefer composition over inheritance" ;;
    11) MSG="Use async/await over callbacks" ;;
    12) MSG="Log important operations" ;;
    13) MSG="Handle errors explicitly" ;;
    14) MSG="Use environment variables for config" ;;
    15) MSG="Keep dependencies minimal" ;;
    16) MSG="Update dependencies weekly" ;;
    17) MSG="Use git branches for features" ;;
    18) MSG="Review code before merge" ;;
    19) MSG="Write integration tests" ;;
    20) MSG="Monitor production metrics" ;;
  esac

  CONF=$(echo "scale=2; 0.7 + ($RANDOM % 30) / 100" | bc)
  node dist/cli/index.js decision "$MSG" --confidence $CONF --tags training,manual 2>&1 | grep -v DEBUG
done

echo "✅ Added 20 decisions"
echo ""

# 2. Import from git history
echo "📥 Step 2: Importing 20 decisions from git history..."
COUNT=0
for commit in $(git log --oneline --all --since="2026-02-01" | head -20 | awk '{print $1}'); do
  MSG=$(git log --format=%s -n 1 $commit)
  CONF=$(echo "scale=2; 0.6 + ($RANDOM % 30) / 100" | bc)
  node dist/cli/index.js decision "Git: $MSG" --confidence $CONF --tags inferred,git 2>&1 | grep -v DEBUG
  COUNT=$((COUNT + 1))
done

echo "✅ Added $COUNT git-based decisions"
echo ""

# 3. Check progress
echo "📊 Updated status:"
node dist/cli/index.js patterns stats 2>&1 | grep -v DEBUG
echo ""

NEW_DECISION_COUNT=$(ls ~/.memphis/chains/decisions/*.json 2>/dev/null | wc -l || echo "0")
echo "Total decisions: $NEW_DECISION_COUNT"
echo "Added: $((NEW_DECISION_COUNT - DECISION_COUNT))"
echo ""

# 4. Test predictions
echo "🔮 Testing predictions:"
node dist/cli/index.js predict 2>&1 | grep -v DEBUG
echo ""

# 5. Test suggestions
echo "💡 Testing suggestions:"
node dist/cli/index.js suggest 2>&1 | grep -v DEBUG
echo ""

echo "🎉 TRAINING COMPLETE!"
echo "===================="
echo ""
echo "Next steps:"
echo "1. Run this script daily for 1 week"
echo "2. Add real decisions as you work"
echo "3. Check patterns: memphis patterns stats"
echo "4. Monitor accuracy: memphis accuracy"
echo ""
echo "Target: 10+ patterns, 50+ decisions"
