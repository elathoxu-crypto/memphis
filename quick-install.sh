#!/bin/bash
# Memphis Quick Install - Minimal one-liner wrapper
# Usage: curl -fsSL https://raw.githubusercontent.com/elathoxu-crypto/memphis/main/quick-install.sh | bash

set -e

echo "🧠 Memphis Quick Install"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git required"; exit 1; }

# Clone & Install
[ -d "memphis" ] && { echo "⚠️  memphis/ exists, remove first"; exit 1; }

git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install --silent
npm run build
node dist/cli/index.js init

# Install skill (if OpenClaw present)
if command -v openclaw >/dev/null 2>&1; then
    echo ""
    echo "🔌 Installing skill for OpenClaw..."
    mkdir -p ~/.openclaw/workspace/skills
    cp -r skills/memphis-cognitive ~/.openclaw/workspace/skills/ 2>/dev/null || \
        npx clawhub@latest install memphis-cognitive
    openclaw gateway restart 2>/dev/null || true
fi

echo ""
echo "✅ Done!"
echo ""
echo "Quick start:"
echo "  memphis status"
echo "  memphis journal 'Hello!' --tags test"
echo ""
