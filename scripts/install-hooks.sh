#!/usr/bin/env bash
#
# Install Memphis Git Hooks
#
# @version 3.0.1
# @date 2026-03-03

set -e

echo "🛡️ Installing Memphis Git Hooks..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"
SCRIPTS_HOOKS_DIR="$REPO_ROOT/scripts/hooks"

# Check if we're in a git repository
if [ ! -d "$GIT_HOOKS_DIR" ]; then
    echo -e "${YELLOW}⚠️  Not in a git repository${NC}"
    echo "   Hooks can only be installed in git repos"
    exit 1
fi

# Install pre-commit hook
echo "📦 Installing pre-commit hook..."
if [ -f "$GIT_HOOKS_DIR/pre-commit" ]; then
    echo -e "${YELLOW}⚠️  Pre-commit hook already exists${NC}"
    echo "   Backing up to: pre-commit.backup.$(date +%s)"
    mv "$GIT_HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit.backup.$(date +%s)"
fi

# Copy hook
cp "$SCRIPTS_HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
chmod +x "$GIT_HOOKS_DIR/pre-commit"

echo -e "${GREEN}✓ Pre-commit hook installed${NC}"

# Create backup directory
echo ""
echo "💾 Setting up backup directory..."
BACKUP_DIR="$HOME/.memphis/backups/pre-commit"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup directory created: $BACKUP_DIR${NC}"

# Test the hook
echo ""
echo "🧪 Testing pre-commit hook..."
if "$GIT_HOOKS_DIR/pre-commit"; then
    echo -e "${GREEN}✓ Pre-commit hook test passed${NC}"
else
    echo -e "${YELLOW}⚠️  Pre-commit hook test returned non-zero (this might be expected)${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Git hooks installed successfully!${NC}"
echo ""
echo "What happens now:"
echo "  • Every commit will validate Memphis chains"
echo "  • Automatic backups created before each commit"
echo "  • Broken blocks detected and blocked"
echo ""
echo "To bypass (not recommended):"
echo "  git commit --no-verify"
echo ""
echo "To uninstall:"
echo "  rm $GIT_HOOKS_DIR/pre-commit"
echo "═══════════════════════════════════════════════════════"
