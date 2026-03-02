# Installation Guide

**Version:** 2.0.0  
**Date:** 2026-03-02

---

## 📋 Table of Contents

- [Requirements](#requirements)
- [Quick Install](#quick-install)
- [Detailed Installation](#detailed-installation)
- [Provider Setup](#provider-setup)
- [Verification](#verification)
- [Upgrading](#upgrading)
- [Uninstalling](#uninstalling)

---

## Requirements

### Minimum Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| **Node.js** | 18+ | Required |
| **npm** | 9+ | Comes with Node |
| **Git** | 2.x+ | For Model B |
| **Disk Space** | 500MB | For chains + embeddings |
| **RAM** | 2GB | 4GB recommended |

### Recommended Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| **Node.js** | 20+ | Better performance |
| **Ollama** | Latest | For embeddings |
| **Disk Space** | 2GB | For growth |
| **RAM** | 4GB+ | For large chains |

---

## Quick Install

**5-minute setup:**

```bash
# 1. Clone
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis

# 2. Install & Build
npm install && npm run build

# 3. Initialize
node dist/cli/index.js init

# 4. Verify
node dist/cli/index.js doctor

# Done! ✅
```

---

## Detailed Installation

### Step 1: Install Node.js

**Ubuntu/Debian:**
```bash
# Using NodeSource (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # Should be v20+
npm --version   # Should be 9+
```

**macOS:**
```bash
# Using Homebrew
brew install node@20

# Verify
node --version
npm --version
```

**Windows:**
```bash
# Using Chocolatey
choco install nodejs-lts

# Verify
node --version
npm --version
```

**Using nvm (recommended):**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node
nvm install 20
nvm use 20

# Verify
node --version
```

---

### Step 2: Install Git

**Ubuntu/Debian:**
```bash
sudo apt-get install git
```

**macOS:**
```bash
brew install git
```

**Windows:**
```bash
choco install git
```

**Verify:**
```bash
git --version  # Should be 2.x+
```

---

### Step 3: Clone Repository

```bash
# HTTPS
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis

# Or SSH (if you have keys)
git clone git@github.com:elathoxu-crypto/memphis.git
cd memphis
```

---

### Step 4: Install Dependencies

```bash
# Install all dependencies
npm install

# If you get permission errors
sudo chown -R $USER:$USER ~/.npm
npm install
```

**Expected output:**
```
added 450 packages in 45s
```

---

### Step 5: Build Project

```bash
# Compile TypeScript to JavaScript
npm run build
```

**Expected output:**
```
> memphis@2.0.0 build /home/user/memphis
> tsc
```

**Verify:**
```bash
ls dist/cli/index.js  # Should exist
```

---

### Step 6: Initialize Memphis

```bash
# Interactive setup
node dist/cli/index.js init
```

**Follow the prompts:**

```
╔═══════════════════════════════════════════════════════════╗
║           Memphis Brain — Setup Wizard 🧠                ║
╚═══════════════════════════════════════════════════════════╝

🔍 Detecting environment...

  ✓ Node.js v20.11.0
  ✓ Git 2.43.0
  ⚠ Ollama (not found)
    Install: https://ollama.com

? Select provider:
  ❯ ollama (local, free)
    openai (cloud, paid)
    openrouter (cloud, paid)
    minimax (cloud, paid)
    zai (cloud, paid)

? Recommended provider: ollama/qwen2.5-coder:3b
  Use recommended? (Y/n): Y

✓ Created ~/.memphis/config.yaml
✓ Created ~/.memphis/chains

Ready? Let's go! 🚀
```

---

### Step 7: Install Ollama (Recommended)

**Why Ollama?**
- ✅ Free and local
- ✅ No API costs
- ✅ Offline-capable
- ✅ Better privacy

**Install:**

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS:**
```bash
brew install ollama
```

**Windows:**
Download from https://ollama.com/download

**Start Ollama:**
```bash
ollama serve
```

**Pull embeddings model:**
```bash
ollama pull nomic-embed-text
```

**Verify:**
```bash
curl http://localhost:11434/api/tags
```

---

## Provider Setup

### Ollama (Recommended)

```bash
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Start Ollama
ollama serve

# 3. Pull model
ollama pull qwen2.5-coder:3b
ollama pull nomic-embed-text

# 4. Configure Memphis
# ~/.memphis/config.yaml
provider: ollama
model: qwen2.5-coder:3b
embeddings:
  backend: ollama
  model: nomic-embed-text
```

---

### OpenAI

```bash
# 1. Get API key
# https://platform.openai.com/api-keys

# 2. Configure Memphis
# ~/.memphis/config.yaml
provider: openai
model: gpt-4
api_key: sk-abc123...
embeddings:
  backend: openai
  model: text-embedding-3-small
```

**Or use environment variable:**
```bash
export OPENAI_API_KEY="sk-abc123..."
```

---

### MiniMax

```bash
# 1. Get API credentials
# https://www.minimaxi.com/

# 2. Configure Memphis
# ~/.memphis/config.yaml
provider: minimax
model: MiniMax-M2.1
api_key: your_key
group_id: your_group_id
```

---

### ZAI

```bash
# 1. Get API key
# https://www.zhipuai.cn/

# 2. Configure Memphis
# ~/.memphis/config.yaml
provider: zai
model: glm-5
api_key: your_49_char_key
```

---

### OpenRouter

```bash
# 1. Get API key
# https://openrouter.ai/keys

# 2. Configure Memphis
# ~/.memphis/config.yaml
provider: openrouter
model: anthropic/claude-3-opus
api_key: sk-or-abc123...
```

---

## Verification

### Run Doctor

```bash
node dist/cli/index.js doctor
```

**Expected output:**
```
╔═══════════════════════════════════════════════════════════╗
║              Memphis Doctor — Health Check 🏥           ║
╚═══════════════════════════════════════════════════════════╝

✓ Node.js: v20.11.0 (supported)
✓ Config File: Found at ~/.memphis/config.yaml
✓ Provider Config: Provider configured
✓ Model Config: Model specified
✓ Ollama: Running (15 models)
✓ Provider Connection: Ollama API responding
✓ Embeddings: nomic-embed-text
✓ Memory Chains: 0 blocks stored
✓ API Keys: None found

✓ All systems healthy! 9/9 checks passed
```

---

### Test Basic Commands

```bash
# Make a decision
node dist/cli/index.js decide "Test decision" "Choice A" \
  --reasoning "Testing installation"

# List decisions
node dist/cli/index.js decisions

# Journal entry
node dist/cli/index.js journal "Memphis installed successfully!"

# Search
node dist/cli/index.js recall "test"
```

---

### Setup Global Alias (Optional)

```bash
# Add to ~/.bashrc or ~/.zshrc
alias memphis='node /path/to/memphis/dist/cli/index.js'

# Or create symlink
sudo ln -s /path/to/memphis/dist/cli/index.js /usr/local/bin/memphis

# Then use
memphis init
memphis decide "test" "test"
```

---

## Upgrading

### Backup First

```bash
# Backup chains
cp -r ~/.memphis/chains ~/memphis-backup-$(date +%Y%m%d)

# Backup config
cp ~/.memphis/config.yaml ~/memphis-config-backup.yaml
```

---

### Upgrade Steps

```bash
# 1. Pull latest
cd memphis
git pull origin master

# 2. Install updated dependencies
npm install

# 3. Rebuild
npm run build

# 4. Verify
node dist/cli/index.js doctor

# 5. Restore if needed
# cp -r ~/memphis-backup-YYYYMMDD/* ~/.memphis/
```

---

### Version Check

```bash
# Check current version
node dist/cli/index.js --version

# Or
cat package.json | grep version
```

---

## Uninstalling

### Remove Memphis

```bash
# 1. Backup data (optional)
tar -czf memphis-backup.tar.gz ~/.memphis

# 2. Delete repository
rm -rf memphis

# 3. Delete data (if desired)
rm -rf ~/.memphis

# 4. Remove alias (if added)
# Edit ~/.bashrc or ~/.zshrc, remove memphis alias
```

---

## Platform-Specific Notes

### Linux

**Ubuntu/Debian:**
```bash
# Install build essentials (for native modules)
sudo apt-get install -y build-essential python3-dev
```

**Fedora/RHEL:**
```bash
sudo dnf install -y gcc-c++ make python3-devel
```

**Arch Linux:**
```bash
sudo pacman -S base-devel python
```

---

### macOS

**Install Xcode tools:**
```bash
xcode-select --install
```

**Using Homebrew (recommended):**
```bash
brew install node git ollama
```

---

### Windows

**Using WSL (recommended):**
```bash
# Install WSL
wsl --install

# Then follow Linux instructions
```

**Using PowerShell:**
```powershell
# Install via Chocolatey
choco install nodejs git

# Or download installers
# Node: https://nodejs.org
# Git: https://git-scm.com
```

---

### Docker (Planned)

```bash
# Coming soon
docker pull memphis/cognitive-engine
docker run -v ~/.memphis:/data memphis/cognitive-engine
```

---

## Troubleshooting Installation

### "npm install" hangs

```bash
# Clear cache
npm cache clean --force

# Try with different registry
npm install --registry https://registry.npmjs.org

# Or use yarn
yarn install
```

---

### "node-gyp" errors

```bash
# Install build tools
# Ubuntu/Debian
sudo apt-get install -y build-essential python3-dev

# macOS
xcode-select --install

# Retry
npm install
```

---

### Permission errors

```bash
# Fix npm permissions
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER /usr/local/lib/node_modules

# Or use nvm (recommended)
```

---

## Next Steps

After installation:

1. **Read Quick Start:** [QUICKSTART.md](QUICKSTART.md)
2. **Learn Model A:** [MODEL-A-GUIDE.md](MODEL-A-GUIDE.md)
3. **Try Examples:** [EXAMPLES.md](EXAMPLES.md)
4. **Join Community:** https://discord.gg/clawd

---

**Installation Guide Version:** 2.0.0  
**Last Updated:** 2026-03-02
