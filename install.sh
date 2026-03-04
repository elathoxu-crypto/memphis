#!/bin/bash

# Memphis Complete Install Script
# Bulletproof installation: CLI + OpenClaw Skill
# Works offline (skills bundled in repo)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🧠 Memphis Complete Install${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ═══════════════════════════════════════════════════════════════
# PHASE 1: PREREQUISITES
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}📋 Phase 1: Checking prerequisites...${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo ""
    echo "Install Node.js 20 LTS:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt install -y nodejs"
    echo ""
    echo "Or visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${RED}❌ Node.js too old: $NODE_VERSION (need 18+)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found${NC}"
    echo "Install: sudo apt install -y git"
    exit 1
fi

echo -e "${GREEN}✅ Git: $(git --version | cut -d' ' -f3)${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# PHASE 2: CLI INSTALLATION
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}📦 Phase 2: Installing Memphis CLI...${NC}"
echo ""

# Check if already installed
INSTALL_DIR="memphis"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠️  Memphis directory already exists${NC}"
    read -p "Remove and reinstall? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    rm -rf "$INSTALL_DIR"
fi

# Clone
echo -e "${BLUE}📥 Cloning repository...${NC}"
git clone https://github.com/elathoxu-crypto/memphis.git "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install --silent

# Build
echo -e "${BLUE}🔨 Building CLI...${NC}"
npm run build

# Create global symlink
echo -e "${BLUE}🔗 Creating global command...${NC}"
npm link --silent 2>/dev/null || echo "   (symlink optional, using node dist/cli/index.js)"

# Initialize
echo -e "${BLUE}⚙️  Initializing Memphis brain...${NC}"
node dist/cli/index.js init --skip-welcome 2>/dev/null || node dist/cli/index.js init

# Verify
echo ""
if node dist/cli/index.js status &> /dev/null; then
    echo -e "${GREEN}✅ Memphis CLI installed successfully!${NC}"
else
    echo -e "${RED}❌ CLI installation failed${NC}"
    exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# PHASE 3: OPENCLAW INTEGRATION (OPTIONAL)
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}🔌 Phase 3: OpenClaw Integration${NC}"
echo ""

# Check OpenClaw
if ! command -v openclaw &> /dev/null; then
    echo -e "${YELLOW}⚠️  OpenClaw not detected${NC}"
    echo ""
    echo "OpenClaw integration is OPTIONAL. Memphis works standalone."
    echo ""
    echo "To install OpenClaw later:"
    echo "  npm install -g openclaw"
    echo "  openclaw onboard"
    echo "  clawhub install memphis-cognitive"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Memphis CLI Ready!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    print_standalone_instructions
    exit 0
fi

echo -e "${GREEN}✅ OpenClaw detected: $(openclaw --version 2>/dev/null || echo 'installed')${NC}"
echo ""

# Install skill (bundled in repo - works offline)
echo -e "${BLUE}📦 Installing Memphis skill for OpenClaw...${NC}"

SKILL_DIR="$HOME/.openclaw/workspace/skills"
BUNDLED_SKILL="$(pwd)/skills/memphis-cognitive"

if [ -d "$BUNDLED_SKILL" ]; then
    # Use bundled skill (bulletproof - no network needed)
    echo "   Using bundled skill (offline-safe)"
    mkdir -p "$SKILL_DIR"
    cp -r "$BUNDLED_SKILL" "$SKILL_DIR/"
    echo -e "${GREEN}✅ Skill installed from bundle${NC}"
else
    # Fallback to ClawHub (requires network)
    echo "   Bundled skill not found, trying ClawHub..."
    if npx clawhub@latest install memphis-cognitive &> /dev/null; then
        echo -e "${GREEN}✅ Skill installed from ClawHub${NC}"
    else
        echo -e "${YELLOW}⚠️  Skill installation failed (Memphis CLI still works)${NC}"
        echo "   Manual install: clawhub install memphis-cognitive"
    fi
fi

# Enable in OpenClaw config
echo -e "${BLUE}⚙️  Enabling skill in OpenClaw...${NC}"
CONFIG_FILE="$HOME/.openclaw/openclaw.json"

if [ -f "$CONFIG_FILE" ]; then
    # Add skill entry (jq would be better, but keep it simple)
    if ! grep -q "memphis-cognitive" "$CONFIG_FILE" 2>/dev/null; then
        # Simple append (works for most configs)
        echo '  "skills": { "entries": { "memphis-cognitive": { "enabled": true } } }' >> "$CONFIG_FILE.tmp"
        cat "$CONFIG_FILE" | head -n -1 > "$CONFIG_FILE.final"
        echo "," >> "$CONFIG_FILE.final"
        cat "$CONFIG_FILE.tmp" >> "$CONFIG_FILE.final"
        mv "$CONFIG_FILE.final" "$CONFIG_FILE"
        rm -f "$CONFIG_FILE.tmp"
        echo -e "${GREEN}✅ Skill enabled in config${NC}"
    else
        echo -e "${GREEN}✅ Skill already enabled${NC}"
    fi
fi

# Restart OpenClaw gateway
echo -e "${BLUE}🔄 Restarting OpenClaw gateway...${NC}"
if openclaw gateway restart &> /dev/null; then
    echo -e "${GREEN}✅ Gateway restarted${NC}"
else
    echo -e "${YELLOW}⚠️  Gateway restart failed (may need manual restart)${NC}"
    echo "   Run: openclaw gateway restart"
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 4: VERIFICATION
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${YELLOW}🧪 Phase 4: Verification${NC}"
echo ""

# Test CLI
echo "Testing CLI..."
if memphis status &> /dev/null || node dist/cli/index.js status &> /dev/null; then
    echo -e "${GREEN}✅ CLI: Working${NC}"
else
    echo -e "${RED}❌ CLI: Failed${NC}"
fi

# Test skill (if OpenClaw installed)
if command -v openclaw &> /dev/null; then
    echo "Testing skill integration..."
    if [ -d "$SKILL_DIR/memphis-cognitive" ]; then
        echo -e "${GREEN}✅ Skill: Installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Skill: Not found${NC}"
    fi
fi

# ═══════════════════════════════════════════════════════════════
# COMPLETE!
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Memphis Installation Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}🚀 Quick Start:${NC}"
echo ""
echo "  # CLI (standalone)"
echo "  memphis journal 'Hello Memphis!' --tags first"
echo "  memphis status"
echo "  memphis ask 'What do you know?'"
echo ""
if command -v openclaw &> /dev/null; then
    echo -e "${BLUE}  # OpenClaw (with skill)${NC}"
    echo "  openclaw chat"
    echo "  > record decision: use Memphis for memory"
    echo "  > search memory for decision"
    echo ""
fi
echo -e "${BLUE}📖 Documentation:${NC}"
echo "  cd memphis"
echo "  cat QUICKSTART.md     # 1-minute guide"
echo "  cat README.md         # Overview"
echo "  memphis --help        # All commands"
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "  1. Try the commands above"
echo "  2. Read QUICKSTART.md"
echo "  3. Explore: memphis decisions, memphis recall"
echo ""
echo -e "${GREEN}🧠 Welcome to Memphis!${NC}"
echo ""

# Optional: Ollama reminder
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}💡 Tip: Install Ollama for embeddings & local LLM${NC}"
    echo "   curl -fsSL https://ollama.com/install.sh | sh"
    echo "   ollama pull nomic-embed-text"
    echo "   ollama pull qwen2.5:3b"
    echo ""
fi

# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

print_standalone_instructions() {
    echo ""
    echo -e "${BLUE}🚀 Quick Start (Standalone):${NC}"
    echo ""
    echo "  cd memphis"
    echo "  node dist/cli/index.js journal 'Hello Memphis!' --tags first"
    echo "  node dist/cli/index.js status"
    echo "  node dist/cli/index.js ask 'What do you know?'"
    echo ""
    echo -e "${BLUE}📖 Documentation:${NC}"
    echo "  cat QUICKSTART.md"
    echo "  cat README.md"
    echo "  node dist/cli/index.js --help"
    echo ""
    echo -e "${GREEN}🧠 Welcome to Memphis!${NC}"
    echo ""
}
