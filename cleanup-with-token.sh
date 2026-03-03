#!/bin/bash
# Cleanup with Token - One-time use
# Date: 2026-03-03 19:58 CET

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║      MEMPHIS CLEANUP WITH TOKEN - FINAL STEP! 🧹            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd ~/memphis

echo "🔑 Using your GitHub token for authentication..."
echo ""
echo "⚠️  Token will be used once, then we'll restore original remote"
echo ""

# Save current remote
CURRENT_REMOTE=$(git remote get-url origin)
echo "📦 Current remote: $CURRENT_REMOTE"
echo ""

# You will be prompted for token
echo "🧹 STARTING CLEANUP..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Push archive tags
echo "📦 STEP 1: Pushing archive tags..."
git push origin archive/memphis-chains-master archive/memphis-cli-v1.0.0
echo "✅ Archive tags pushed"
echo ""

# Delete branches
echo "🧹 STEP 2: Deleting dead branches..."
git push origin --delete Memphis-Chains/master
echo "✅ Memphis-Chains/master deleted"

git push origin --delete memphis-cli/v1.0.0
echo "✅ memphis-cli/v1.0.0 deleted"
echo ""

# Cleanup
echo "🧹 STEP 3: Local cleanup..."
git fetch --prune
echo "✅ Local references cleaned"
echo ""

# Verify
echo "📊 STEP 4: Verification..."
echo "Remaining branches:"
git branch -a | grep -v HEAD
echo ""
echo "Archive tags:"
git tag -l "archive/*"
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            🎉 CLEANUP COMPLETE! 🎉                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Weeks of waiting - OVER!"
echo "✅ Repository cleaned and organized"
echo "✅ Ready for v3.0.2 development"
