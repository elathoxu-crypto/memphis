# Memphis Quick Start Guide

**Get Memphis running in 5 minutes!**

---

## ⚡ Super Fast Install (3 commands)

```bash
# 1. Clone & enter
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis

# 2. Install & build
npm install && npm run build

# 3. Initialize
node dist/cli/index.js init

# Done! Start using Memphis:
node dist/cli/index.js journal "Hello Memphis!"
```

---

## 📋 What You Get

After install, you have:

- ✅ **Memory chains** (blockchain-like storage)
- ✅ **5 cognitive models** (decisions, predictions, learning)
- ✅ **Semantic search** (find anything instantly)
- ✅ **Multi-agent networking** (collaborate with other agents)
- ✅ **Local-first** (your data stays on your machine)
- ✅ **Encrypted vault** (secure storage)

---

## 🎯 First Steps

### 1. Add Your First Memory
```bash
node dist/cli/index.js journal "My first memory" --tags test,first
```

### 2. Search Your Memory
```bash
node dist/cli/index.js recall "first"
```

### 3. Record a Decision
```bash
node dist/cli/index.js decide "Use TypeScript" "TypeScript" -r "Better type safety"
```

### 4. Check System Status
```bash
node dist/cli/index.js status
```

---

## 🔧 Configuration (Optional)

### Add LLM Provider (for AI features)

Edit `~/.memphis/config.yaml`:

```yaml
providers:
  openai:
    url: https://api.openai.com/v1
    model: gpt-4
    api_key: ${OPENAI_API_KEY}  # Set in environment
    role: primary
```

### Set API Key
```bash
export OPENAI_API_KEY="your-key-here"
```

---

## 📚 Essential Commands

| Command | What it does |
|---------|--------------|
| `memphis init` | First-time setup |
| `memphis journal "text"` | Save memory |
| `memphis recall "keyword"` | Search memory |
| `memphis decide "title" "choice"` | Record decision |
| `memphis status` | Check system health |
| `memphis verify` | Verify chain integrity |
| `memphis ask "question"` | Ask with AI context |

---

## 🎨 What Can Memphis Do?

### Memory Management
```
✅ Save thoughts, ideas, decisions
✅ Search instantly with semantic search
✅ Track everything in blockchain chains
✅ Never lose context again
```

### Cognitive Models
```
✅ Model A: Record conscious decisions
✅ Model B: Detect decisions from git commits
✅ Model C: Predict decisions before you make them
✅ Model D: Collective multi-agent decisions
✅ Model E: Meta-cognitive reflection
```

### Multi-Agent Network
```
✅ Connect with other Memphis instances
✅ Share knowledge across agents
✅ Collaborative decision making
✅ Campfire Circle Protocol
```

---

## 🚀 Advanced Features

### TUI Dashboard
```bash
node dist/cli/index.js tui
```
Interactive dashboard for browsing memories and decisions.

### Multi-Agent Sync
```bash
# Share knowledge with other agents
node dist/cli/index.js share "Knowledge to share"
```

### Predictive Analytics
```bash
# Learn from past decisions
node dist/cli/index.js predict --learn

# Get predictions
node dist/cli/index.js predict
```

---

## 📁 Where Everything Is

```
~/.memphis/
├── chains/           # Your memory blocks
│   ├── journal/      # Daily memories
│   ├── decisions/    # Decision records
│   ├── ask/          # Q&A history
│   └── share/        # Multi-agent sync
├── config.yaml       # Configuration
└── logs/            # System logs
```

---

## 🔒 Security

**Your data is yours:**

- ✅ All data stored locally (`~/.memphis/`)
- ✅ Encrypted vault for sensitive data
- ✅ SHA256 cryptographic integrity
- ✅ No cloud dependency
- ✅ Your API keys never leave your machine

---

## 🛠️ Troubleshooting

### "Command not found"
```bash
# Use direct path:
node dist/cli/index.js [command]

# Or install globally:
npm link
memphis [command]
```

### "Chain broken"
```bash
# Repair chain:
node dist/cli/index.js repair --chain=journal
node dist/cli/index.js verify
```

### "No blocks found"
```bash
# Start fresh:
rm -rf ~/.memphis/chains/*
node dist/cli/index.js init
```

---

## 📖 Learn More

- **Full docs:** `docs/` folder
- **Examples:** `examples/` folder
- **Roadmap:** `docs/ROADMAP.md`
- **Architecture:** `docs/ARCHITECTURE.md`

---

## 🤝 Get Help

- **Issues:** GitHub Issues
- **Discord:** [Community link]
- **Email:** [Support email]

---

## ⚡ Quick Reference Card

```bash
# Memory
memphis journal "text"           # Save
memphis recall "keyword"         # Search
memphis status                   # Health

# Decisions
memphis decide "title" "choice"  # Record
memphis decisions --recent 10    # View

# AI
memphis ask "question"           # Ask with context
memphis predict                  # Get predictions

# System
memphis verify                   # Check integrity
memphis tui                      # Dashboard
```

---

## 🎯 What's Next?

After basic setup:

1. **Try the TUI:** `memphis tui`
2. **Record decisions:** Track your choices
3. **Set up LLM:** Enable AI features
4. **Join network:** Connect with other agents
5. **Explore:** Check `docs/` for advanced features

---

## 🏆 Pro Tips

1. **Tag everything:** Tags make search powerful
2. **Journal daily:** Build your memory chain
3. **Review decisions:** Learn from patterns
4. **Use semantic search:** Natural language queries
5. **Backup chains:** Copy `~/.memphis/chains/` regularly

---

## 💡 Philosophy

**Memphis is:**
- 🧠 Your AI-powered second brain
- 🔒 Local-first (your data = yours)
- 🚀 Fast (milliseconds response)
- 📈 Grows with you (unlimited memory)
- 🤝 Multi-agent ready (network effects)

**Memphis is NOT:**
- ❌ Cloud-dependent
- ❌ Subscription service
- ❌ Data harvesting
- ❌ Black box

---

## 📦 What's Included

```
memphis/
├── src/
│   ├── cli/          # Command-line interface
│   ├── memory/       # Chain storage
│   ├── cognitive/    # AI models
│   └── multi-agent/  # Networking
├── dist/             # Compiled code
├── docs/             # Documentation
└── tests/            # Test suite
```

---

## ⏱️ Time Investment

**First 5 minutes:**
- Install & init
- First memory
- First search

**First hour:**
- Understand chains
- Record decisions
- Try TUI dashboard

**First week:**
- Build memory chain
- Pattern recognition
- Decision tracking

**First month:**
- Predictive insights
- Multi-agent network
- Full cognitive engine

---

## 🎉 You're Ready!

```bash
# Start now:
node dist/cli/index.js journal "Memphis is alive!" --tags startup,first

# Check your memory:
node dist/cli/index.js status
```

---

**Welcome to Memphis! 🧠**

**Your local-first AI brain with persistent memory.**

**Questions? Check `docs/` or reach out!**

---

**Version:** 3.0.1
**Status:** Production Ready
**License:** MIT
**Author:** Memphis Team
