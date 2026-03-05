#!/bin/bash
# Memphis Uninstall Script
# Removes Memphis installation and optionally data

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗑️  Memphis Uninstall"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if installed
if [ ! -d ~/memphis ] && [ ! -d ~/.memphis ]; then
  echo "❌ Memphis not found (no ~/memphis or ~/.memphis directories)"
  exit 0
fi

# Remove repo
if [ -d ~/memphis ]; then
  echo "📦 Removing ~/memphis..."
  rm -rf ~/memphis
  echo "✅ Removed ~/memphis"
fi

# Ask about data
if [ -d ~/.memphis ]; then
  echo ""
  read -p "Remove memory chains (~/.memphis)? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf ~/.memphis
    echo "✅ Removed ~/.memphis"
  else
    echo "⏭️  Keeping ~/.memphis (your data is safe)"
  fi
fi

# Remove global symlink
if command -v memphis &> /dev/null; then
  echo ""
  echo "🔗 Removing global command..."
  npm unlink -g @elathoxu-crypto/memphis 2>/dev/null || true
  echo "✅ Removed global command"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Memphis Uninstalled Successfully"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Reinstall anytime:"
echo "  curl -fsSL https://raw.githubusercontent.com/elathoxu-crypto/memphis/main/install.sh | bash"
echo ""
