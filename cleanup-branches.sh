#!/bin/bash
# Memphis Repository Cleanup Script
# Date: 2026-03-03 19:00 CET
# Purpose: Remove dead branches and clean up repository

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         MEMPHIS REPOSITORY CLEANUP SCRIPT 🧹                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd ~/memphis

# STEP 1: Verify current state
echo "📊 STEP 1: Verify current state..."
echo "Current branch: $(git branch --show-current)"
echo "Latest commit: $(git log -1 --oneline)"
echo ""

# STEP 2: Create archive tags
echo "📦 STEP 2: Creating archive tags..."
git tag archive/memphis-chains-master origin/Memphis-Chains/master -m "Archive: Memphis-Chains/master (dead branch)" 2>/dev/null || echo "Tag already exists"
git tag archive/memphis-cli-v1.0.0 origin/memphis-cli/v1.0.0 -m "Archive: memphis-cli/v1.0.0 (dead branch)" 2>/dev/null || echo "Tag already exists"
echo "✅ Archive tags created"
echo ""

# STEP 3: Push archive tags
echo "⬆️  STEP 3: Pushing archive tags to remote..."
echo "Command: git push origin archive/memphis-chains-master archive/memphis-cli-v1.0.0"
echo "⚠️  This will require GitHub credentials"
read -p "Press Enter to continue..."
git push origin archive/memphis-chains-master archive/memphis-cli-v1.0.0
echo "✅ Archive tags pushed"
echo ""

# STEP 4: Verify v3.0.1-tests-safety is fully merged
echo "🔍 STEP 4: Checking if v3.0.1-tests-safety is fully merged..."
BEHIND=$(git log master..v3.0.1-tests-safety --oneline | wc -l)
AHEAD=$(git log v3.0.1-tests-safety..master --oneline | wc -l)
echo "v3.0.1-tests-safety status:"
echo "  - Behind master: $BEHIND commits"
echo "  - Ahead master: $AHEAD commits"

if [ "$BEHIND" -eq 0 ]; then
    echo "✅ v3.0.1-tests-safety is fully merged"
    DELETE_TESTS_SAFETY="yes"
else
    echo "⚠️  v3.0.1-tests-safety has unmerged commits"
    DELETE_TESTS_SAFETY="no"
fi
echo ""

# STEP 5: Delete dead branches
echo "🧹 STEP 5: Deleting dead branches..."
echo ""
echo "Will delete:"
echo "  ❌ Memphis-Chains/master (145 commits behind)"
echo "  ❌ memphis-cli/v1.0.0 (187 commits behind)"
if [ "$DELETE_TESTS_SAFETY" = "yes" ]; then
    echo "  ❌ v3.0.1-tests-safety (merged)"
fi
echo ""
read -p "Continue with deletion? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

# Delete Memphis-Chains/master
echo "Deleting Memphis-Chains/master..."
git push origin --delete Memphis-Chains/master || echo "Branch already deleted or not found"

# Delete memphis-cli/v1.0.0
echo "Deleting memphis-cli/v1.0.0..."
git push origin --delete memphis-cli/v1.0.0 || echo "Branch already deleted or not found"

# Delete v3.0.1-tests-safety if merged
if [ "$DELETE_TESTS_SAFETY" = "yes" ]; then
    echo "Deleting v3.0.1-tests-safety..."
    git push origin --delete v3.0.1-tests-safety || echo "Branch already deleted or not found"
    # Also delete local
    git branch -D v3.0.1-tests-safety 2>/dev/null || true
fi

echo ""
echo "✅ Dead branches deleted"
echo ""

# STEP 6: Prune and verify
echo "🔄 STEP 6: Pruning and verifying..."
git fetch --prune
echo ""
echo "📋 Remaining branches:"
git branch -a | grep -v "HEAD"
echo ""

# STEP 7: Summary
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  CLEANUP COMPLETE! ✅                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "  ✅ Archive tags created and pushed"
echo "  ✅ Dead branches deleted"
echo "  ✅ Repository cleaned"
echo ""
echo "📁 Remaining branches:"
git branch -a | grep -E "master$" | head -1
echo ""
echo "📦 Archive tags created:"
git tag -l "archive/*"
echo ""
echo "🏷️  Release tags available:"
git tag -l "v*" | tail -5
echo ""
echo "🎉 Repository is now clean and organized!"
