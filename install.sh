#!/bin/bash

# Memphis Quick Install Script
# One-command installation for Linux/macOS

set -e

echo "🧠 Memphis Quick Install"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if already installed
if [ -d "memphis" ]; then
    echo "⚠️  Memphis already exists in current directory"
    echo "   Remove it first: rm -rf memphis"
    exit 1
fi

# Clone
echo "📥 Cloning Memphis..."
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis

# Install
echo ""
echo "📦 Installing dependencies..."
npm install

# Build
echo ""
echo "🔨 Building Memphis..."
npm run build

# Init
echo ""
echo "⚙️  Initializing Memphis..."
node dist/cli/index.js init

# Done!
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Memphis installed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Quick Start:"
echo ""
echo "  cd memphis"
echo "  node dist/cli/index.js journal 'Hello Memphis!'"
echo "  node dist/cli/index.js status"
echo ""
echo "📖 Documentation:"
echo "  - README.md     - Overview"
echo "  - QUICKSTART.md - 1-minute guide"
echo "  - BOOTSTRAP.md  - Full setup"
echo ""
echo "🎯 Next Steps:"
echo "  1. Try the commands above"
echo "  2. Check 'node dist/cli/index.js --help'"
echo "  3. Read BOOTSTRAP.md for full features"
echo ""
echo "🧠 Welcome to Memphis!"
echo ""
