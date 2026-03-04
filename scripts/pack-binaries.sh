#!/bin/bash
# Build Memphis binaries for all platforms

set -e

echo "📦 Building Memphis binaries..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if built
if [ ! -d "dist" ] || [ ! -f "dist/cli/index.js" ]; then
    echo "❌ Not built. Run: npm run build"
    exit 1
fi

# Clean
echo "🧹 Cleaning old binaries..."
rm -rf dist/binaries
mkdir -p dist/binaries

# Install pkg if needed
if ! command -v pkg &> /dev/null; then
    echo "📥 Installing pkg..."
    npm install -g @yao-pkg/pkg
fi

# Build for each platform
echo ""
echo "🔨 Building Linux x64..."
pkg . --targets node18-linux-x64 --output dist/binaries/memphis-linux-x64 --compress GZip

echo "🔨 Building macOS x64..."
pkg . --targets node18-macos-x64 --output dist/binaries/memphis-macos-x64 --compress GZip

echo "🔨 Building macOS ARM64..."
pkg . --targets node18-macos-arm64 --output dist/binaries/memphis-macos-arm64 --compress GZip

echo "🔨 Building Windows x64..."
pkg . --targets node18-win-x64 --output dist/binaries/memphis-win-x64.exe --compress GZip

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Binaries built successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
ls -lh dist/binaries/
echo ""
echo "Total size: $(du -sh dist/binaries | cut -f1)"
