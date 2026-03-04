# Memphis Quick Start

**3 installation methods - pick your style:**

---

## 🚀 Method 1: One-Liner (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/elathoxu-crypto/memphis/main/quick-install.sh | bash
```

✅ Installs CLI + OpenClaw skill (if detected)
✅ Works offline (skills bundled in repo)
✅ Bulletproof

---

## 🔧 Method 2: Manual (Full Control)

```bash
# Clone
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis

# Install
npm install
npm run build

# Initialize
node dist/cli/index.js init

# (Optional) Install skill for OpenClaw
mkdir -p ~/.openclaw/workspace/skills
cp -r skills/memphis-cognitive ~/.openclaw/workspace/skills/
openclaw gateway restart  # If using OpenClaw
```

---

## 📦 Method 3: ClawHub (OpenClaw Only)

If you already have OpenClaw:

```bash
# Install CLI first (see Method 2)
cd memphis && npm install && npm run build && npm link

# Then install skill via ClawHub
clawhub install memphis-cognitive

# Restart
openclaw gateway restart
```

---

## ✨ Verify Installation

```bash
# Test CLI
memphis status

# Test memory
memphis journal "First memory" --tags test
memphis recall "first"

# Test ask (requires Ollama or API)
memphis ask "What do you know?"
```

**Expected output:** Chain stats, memory saved, context retrieved.

---

## 🎯 What's Next?

```bash
# Explore commands
memphis --help

# Read full guide
cat BOOTSTRAP.md

# Check examples
ls examples/
```

---

## 🧠 What Memphis Does

| Command | Purpose |
|---------|---------|
| `memphis journal` | Save memories, events, insights |
| `memphis ask` | Ask questions with memory context |
| `memphis decide` | Record important decisions |
| `memphis recall` | Semantic search through memories |
| `memphis status` | Check chain health |
| `memphis reflect` | Analyze patterns |

---

## 🔌 OpenClaw Integration

When installed with OpenClaw, Memphis becomes your agent's long-term memory:

```
User: "record decision: use PostgreSQL for database"
Agent: ✅ Saved to decision chain

User: "search memory for database decisions"
Agent: 🔍 Found: decision#000012 - use PostgreSQL (reason: reliability)
```

---

## 🐛 Troubleshooting

**"Node.js not found"**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**"npm install fails"**
```bash
# Try clearing cache
npm cache clean --force
npm install
```

**"memphis: command not found"**
```bash
# Use direct path
cd memphis
node dist/cli/index.js status

# Or create alias
echo 'alias memphis="node ~/memphis/dist/cli/index.js"' >> ~/.bashrc
source ~/.bashrc
```

**"OpenClaw skill not working"**
```bash
# Verify skill installed
ls ~/.openclaw/workspace/skills/memphis-cognitive

# Restart gateway
openclaw gateway restart

# Check logs
openclaw gateway logs
```

---

## 📚 Documentation

- **QUICKSTART.md** - This file (1 min)
- **README.md** - Overview + features (5 min)
- **BOOTSTRAP.md** - Complete guide (15 min)
- **docs/** - Full documentation

---

## 💡 Pro Tips

**1. Create alias for easier use:**
```bash
echo 'alias m="memphis"' >> ~/.bashrc
m journal "test"
```

**2. Enable tab completion:**
```bash
memphis completion >> ~/.bashrc
```

**3. Use with Ollama for local LLM:**
```bash
ollama pull qwen2.5:3b
memphis ask "What's the weather?"  # Uses local model
```

**4. Backup your memories:**
```bash
memphis backup --output ~/memphis-backup-$(date +%Y%m%d).tar.gz
```

**5. Multi-agent sync:**
```bash
# On machine A
memphis share-sync --push

# On machine B
memphis share-sync --pull
```

---

**Memphis = Your AI-powered second brain 🧠**

- ✅ Local-first
- ✅ Fast
- ✅ Free
- ✅ Open source
- ✅ OpenClaw-ready

---

**Need help?**
- GitHub Issues: https://github.com/elathoxu-crypto/memphis/issues
- Discord: https://discord.gg/clawd
- Docs: https://github.com/elathoxu-crypto/memphis/tree/master/docs
