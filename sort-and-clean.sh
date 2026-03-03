#!/bin/bash
# Memphis Repository Full Cleanup + Origin Analysis
# Date: 2026-03-03 19:21 CET

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║    MEMPHIS REPOSITORY SORTING + ORIGIN ANALYSIS 🔍          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd ~/memphis

# PART 1: ORIGIN ANALYSIS
echo "📋 PART 1: ORIGIN CODE ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔍 Finding first commit..."
FIRST_COMMIT=$(git rev-list --max-parents=0 HEAD)
echo "First commit: $FIRST_COMMIT"
git show $FIRST_COMMIT --stat | head -30
echo ""

echo "📊 Repository Statistics:"
echo "  Total commits: $(git rev-list --count HEAD)"
echo "  Total tags: $(git tag | wc -l)"
echo "  Total branches: $(git branch -a | wc -l)"
echo "  First commit date: $(git log --reverse --format='%ad' --date=short | head -1)"
echo ""

echo "🏆 Version Timeline:"
git tag -l "v*" | sort -V | head -20
echo ""

# PART 2: BRANCH CLEANUP
echo ""
echo "🧹 PART 2: BRANCH CLEANUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Current branches:"
git branch -a | grep -v HEAD
echo ""

echo "Dead branches identified:"
echo "  ❌ Memphis-Chains/master (145 commits behind)"
echo "  ❌ memphis-cli/v1.0.0 (187 commits behind)"
echo "  ⏳ v3.0.1-tests-safety (checking merge status...)"
echo ""

# Check v3.0.1-tests-safety merge status
BEHIND=$(git log master..v3.0.1-tests-safety --oneline 2>/dev/null | wc -l || echo "0")
if [ "$BEHIND" -eq 0 ]; then
    echo "✅ v3.0.1-tests-safety is fully merged - will delete"
    DELETE_TESTS="yes"
else
    echo "⚠️  v3.0.1-tests-safety has $BEHIND unmerged commits - keeping"
    DELETE_TESTS="no"
fi
echo ""

# Create archive tags
echo "📦 Creating archive tags..."
git tag archive/memphis-chains-master origin/Memphis-Chains/master -m "Archive: Memphis-Chains/master (historical)" 2>/dev/null || echo "  (already exists)"
git tag archive/memphis-cli-v1.0.0 origin/memphis-cli/v1.0.0 -m "Archive: memphis-cli/v1.0.0 (historical)" 2>/dev/null || echo "  (already exists)"
echo "✅ Archive tags created"
echo ""

# Push archive tags
echo "⬆️  Pushing archive tags to remote..."
echo "This will require GitHub credentials"
read -p "Press Enter to continue..."
git push origin archive/memphis-chains-master archive/memphis-cli-v1.0.0 2>&1 || echo "Push failed (may need auth)"
echo ""

# Delete branches
echo "🧹 Deleting dead branches..."
echo ""
read -p "Delete Memphis-Chains/master? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin --delete Memphis-Chains/master 2>&1 || echo "Branch already deleted"
fi

read -p "Delete memphis-cli/v1.0.0? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin --delete memphis-cli/v1.0.0 2>&1 || echo "Branch already deleted"
fi

if [ "$DELETE_TESTS" = "yes" ]; then
    read -p "Delete v3.0.1-tests-safety (merged)? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin --delete v3.0.1-tests-safety 2>&1 || echo "Branch already deleted"
        git branch -D v3.0.1-tests-safety 2>/dev/null || true
    fi
fi

echo ""
echo "✅ Branch cleanup complete"
echo ""

# PART 3: FINAL STATUS
echo "📊 PART 3: FINAL STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Fetching latest..."
git fetch --prune

echo ""
echo "📋 Remaining branches:"
git branch -a | grep -v HEAD

echo ""
echo "🏷️  All tags:"
git tag -l | wc -l
echo "tags total"
echo ""
echo "Latest tags:"
git tag -l "v*" | sort -V | tail -5

echo ""
echo "📁 Repository size:"
du -sh .git 2>/dev/null || echo "Unable to calculate"

echo ""
echo "✅ CLEANUP COMPLETE!"
echo ""
