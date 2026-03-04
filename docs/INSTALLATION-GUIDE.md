# Memphis Installation Guide

**Complete step-by-step guide for fresh PC setup**

---

## 📋 Prerequisites (5 min)

### 1. Node.js (Required)

```bash
# Install Node.js 20 LTS (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v20.x.x
npm --version
```

### 2. Git (Required)

```bash
# Install Git
sudo apt install -y git

# Verify
git --version
```

### 3. Ollama (Optional, for embeddings)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull nomic-embed-text  # For embeddings (required)
ollama pull qwen2.5:3b        # For ask command (optional)
```

---

## 🚀 Quick Install (3 options)

### Option 1: One-liner (RECOMMENDED)

```bash
curl -fsSL https://raw.githubusercontent.com/elathoxu-crypto/memphis/main/install.sh | bash
```

### Option 2: From npm (when published)

```bash
npm install -g @elathoxu-crypto/memphis
memphis init
```

### Option 3: From GitHub (manual)

```bash
# Clone repository
git clone https://github.com/elathoxu-crypto/memphis.git ~/memphis
cd ~/memphis

# Install dependencies
npm install

# Build
npm run build

# Create global command
npm link

# Verify
memphis --version
```

---

## 🔧 Install OpenClaw (2 min)

```bash
# Install OpenClaw
npm install -g openclaw

# Verify
openclaw --version

# Start Gateway (first run)
openclaw gateway start
```

This creates:
- ✅ OpenClaw CLI
- ✅ Gateway daemon (127.0.0.1:18789)
- ✅ Skills directory: `~/.openclaw/workspace/skills/`

---

## 🎯 Install Memphis Skill (1 min)

```bash
# Install ClawHub skill
clawhub install memphis-cognitive

# Verify
ls ~/.openclaw/workspace/skills/memphis-cognitive/
```

---

## 🎉 Initialize Memphis (1 min)

```bash
# First run - creates ~/.memphis/
memphis init

# Check status
memphis status

# Test
memphis journal "Hello fresh PC!" --tags test
memphis ask "What is my first memory?"
```

This creates:
- ✅ `~/.memphis/` directory
- ✅ Chains: journal, ask, decisions, vault
- ✅ Config: `~/.memphis/config.yaml`

---

## 📊 Directory Structure

After installation:

```
~/
 ├── .openclaw/
 │   └── workspace/
 │       └── skills/
 │           └── memphis-cognitive/    # Skill from ClawHub
 │               ├── SKILL.md          # Instructions for agent
 │               └── README.md         # Documentation
 │
 ├── memphis/                          # Git repo (source + binary)
 │   ├── dist/
 │   │   └── cli/index.js              # Memphis CLI
 │   └── package.json
 │
 └── .memphis/                         # Memphis data (chains)
     ├── chains/
     │   ├── journal/
     │   ├── ask/
     │   └── decisions/
     ├── config.yaml
     └── vault/
```

---

## 🧪 Test Installation

```bash
# 1. Check CLI
memphis --version
# Expected: 3.6.1

# 2. Check status
memphis status
# Expected: Healthy chains

# 3. Test journal
memphis journal "Test entry" --tags test
# Expected: Block created

# 4. Test ask
memphis ask "What is Memphis?"
# Expected: AI response with context

# 5. Test decide
memphis decide "Test decision" "Option A" -r "Testing"
# Expected: Decision recorded

# 6. Test search
memphis recall "test"
# Expected: Search results

# 7. Check OpenClaw integration
cat ~/.openclaw/workspace/skills/memphis-cognitive/SKILL.md
# Expected: Skill documentation
```

---

## 🔗 Integration with OpenClaw

### How it works:

1. **OpenClaw Gateway** runs as daemon
2. **Memphis skill** in `~/.openclaw/workspace/skills/`
3. **Agent reads SKILL.md** and learns Memphis commands
4. **Agent uses Memphis CLI** via shell commands

### Test integration:

```bash
# In OpenClaw session:
# Agent can read SKILL.md and execute Memphis commands
/memphis status
/memphis journal "Integration test"
```

---

## ⚠️ Troubleshooting

### Problem: `memphis: command not found`

**Solution 1: npm link**
```bash
cd ~/memphis
npm link
```

**Solution 2: Add alias**
```bash
echo 'alias memphis="node ~/memphis/dist/cli/index.js"' >> ~/.bashrc
source ~/.bashrc
```

---

### Problem: `Cannot find module '@elathoxu-crypto/memphis'`

**Solution:**
```bash
# Memphis not on npm yet - use GitHub install
git clone https://github.com/elathoxu-crypto/memphis.git ~/memphis
cd ~/memphis && npm install && npm run build && npm link
```

---

### Problem: `Ollama embeddings failed`

**Solution:**
```bash
# Install Ollama + pull model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text
```

---

### Problem: `OpenClaw not found`

**Solution:**
```bash
# Install OpenClaw
npm install -g openclaw
```

---

## 🚀 What's Next?

After installation:

### 1. Make your first decision
```bash
memphis decide "Use TypeScript" "TypeScript" -r "Type safety"
```

### 2. Ask memory
```bash
memphis ask "Why did I choose TypeScript?"
```

### 3. Try advanced features
```bash
# Knowledge graph
memphis graph build --limit 50

# Reflection
memphis reflect --daily

# Multi-agent sync (requires SSH setup)
memphis share-sync --status
```

### 4. Read documentation
```bash
# Full docs
cat ~/memphis/docs/QUICKSTART.md

# Advanced features
cat ~/.openclaw/workspace/skills/memphis-cognitive/SKILL.md
```

---

## 📊 Installation Checklist

- [ ] Node.js 20+ installed
- [ ] Git installed
- [ ] Ollama installed (optional)
- [ ] nomic-embed-text pulled
- [ ] OpenClaw installed
- [ ] OpenClaw Gateway started
- [ ] Memphis cloned from GitHub
- [ ] Memphis dependencies installed
- [ ] Memphis built (`npm run build`)
- [ ] Memphis linked globally (`npm link`)
- [ ] `memphis --version` works
- [ ] ClawHub skill installed
- [ ] `memphis init` run
- [ ] `memphis status` shows healthy
- [ ] Test commands work (journal, ask, decide)

---

## 🔗 Quick Reference

### Commands:
- `memphis status` - Check health
- `memphis journal` - Add entry
- `memphis ask` - Query with context
- `memphis decide` - Record decision
- `memphis recall` - Search memory
- `memphis reflect` - Generate insights
- `memphis graph build` - Knowledge graph
- `memphis share-sync` - Multi-agent sync

### Directories:
- `~/memphis/` - Source code + binary
- `~/.memphis/` - Data (chains)
- `~/.openclaw/workspace/skills/memphis-cognitive/` - Skill

### Files:
- `~/.memphis/config.yaml` - Configuration
- `~/.memphis/chains/` - Memory chains
- `~/.openclaw/workspace/skills/memphis-cognitive/SKILL.md` - Agent instructions

---

## 🎯 Summary

**Total installation time:** 10-15 minutes

**What you get:**
- ✅ Memphis CLI with 17 commands
- ✅ Local-first memory chains
- ✅ Semantic search with embeddings
- ✅ 3 cognitive models (A+B+C)
- ✅ Advanced features (TUI, Graph, Reflection, Trade, Sync)
- ✅ OpenClaw integration
- ✅ Multi-agent network ready

**Ready for:**
- Decision tracking
- Pattern learning
- Multi-agent coordination
- Knowledge management
- AI-assisted workflows

---

## 📚 Additional Resources

- **GitHub:** https://github.com/elathoxu-crypto/memphis
- **ClawHub:** https://clawhub.com/skill/memphis-cognitive
- **Discord:** https://discord.gg/clawd
- **Docs:** https://github.com/elathoxu-crypto/memphis/tree/master/docs

---

**Created:** 2026-03-04 19:55 CET
**Version:** 3.6.3
**Status:** ✅ Production Ready
**Based on:** User feedback walkthrough

**Need help?** Join Discord or create GitHub issue!
