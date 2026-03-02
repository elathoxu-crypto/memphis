# Memphis Quick Start Guide

**Get your AI brain running in 5 minutes!** 🚀

---

## 📋 Prerequisites

- Node.js 18+ installed
- One of these providers:
  - **Ollama** (recommended, free, offline)
  - **ZAI API key** (49 characters)
  - **OpenAI API key**
  - **MiniMax API key**

---

## 🚀 Installation (3 min)

### 1. Clone & Build

```bash
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install
npm run build
```

### 2. Initialize

```bash
node dist/cli/index.js init
```

**Interactive wizard will:**
- ✅ Detect available providers
- ✅ Let you choose provider (Ollama/ZAI/OpenAI/MiniMax)
- ✅ Input API keys if needed
- ✅ Create optimized config

**Example:**
```
╔═══════════════════════════════════════════════════════════╗
║           Memphis Brain — Setup Wizard 🧠                ║
╚═══════════════════════════════════════════════════════════╝

🔍 Detecting environment...

  ✓ Node.js v25.6.1
  ✓ Ollama (http://127.0.0.1:11434)
    Available models: qwen2.5-coder, llama3.1

? Recommended provider: ollama/qwen2.5-coder
  Reason: Local, offline-capable, no API costs
  Use recommended? (Y/n): Y

✓ Created ~/.memphis/config.yaml
✓ Created ~/.memphis/chains

Ready? Let's go! 🚀
```

---

## 🎯 First Memory (1 min)

### Save a thought:

```bash
node dist/cli/index.js journal "I'm working on a new AI project called Memphis"
```

**Output:**
```
✓ Saved to journal#0
  Tags: project, ai, memphis
  Embedding: ready
```

---

## 🧠 Query Your Brain (30 sec)

### Ask Memphis:

```bash
node dist/cli/index.js ask "What am I working on?"
```

**Output:**
```
Context hits: 1

Based on your journal, you're working on Memphis - an AI project 
with persistent memory chains. You mentioned this in journal#0.

Would you like to explore this further?
```

---

## 🔍 Semantic Search (30 sec)

### Find related memories:

```bash
node dist/cli/index.js recall "AI"
```

**Output:**
```
Found 3 results:

[0.89] journal#0 — "I'm working on a new AI project called Memphis"
[0.75] journal#1 — "Testing semantic search with embeddings"
[0.68] ask#2 — "How does Memphis memory work?"
```

---

## 🎨 Visual Dashboard (1 min)

### Launch TUI:

```bash
node dist/cli/index.js tui
```

**Features:**
- 💬 Chat interface with history
- 💡 Suggestions queue (time-based triggers)
- 📊 Real-time stats (834 journal blocks)
- 🧠 Learning indicators (54 learned)
- ⌨️ Quick commands (/j, /a, /d)

**Commands:**
- `/journal <text>` or `/j <text>` — quick save
- `/accept` or `/a` — accept suggestion
- `/dismiss` or `/d` — dismiss suggestion
- `/status` — show chain stats
- `/help` — show all commands

**Status Bar:**
```
📚 834 journal │ Last: 17m ago │ ✓ ollama/qwen2.5-coder │ 🧠 54 learned │ 💡 2 │ [q] quit
```

---

## 🔧 Configuration

### View config:

```bash
cat ~/.memphis/config.yaml
```

### Example configs:

**Ollama (local):**
```yaml
providers:
  ollama:
    url: http://127.0.0.1:11434/v1
    model: qwen2.5-coder
    role: primary

memory:
  path: ~/.memphis/chains

embeddings:
  enabled: true
  backend: local-ollama
  model: nomic-embed-text
```

**ZAI (cloud):**
```yaml
providers:
  zai:
    url: https://api.zukijourney.com/v1
    model: zai/glm-5
    api_key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    role: primary

embeddings:
  enabled: true
  backend: local-ollama
  model: nomic-embed-text
```

---

## 📚 Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `init` | Setup wizard | `memphis init` |
| `journal` | Save memory | `memphis journal "My thought"` |
| `ask` | Query brain | `memphis ask "What did I do?"` |
| `recall` | Semantic search | `memphis recall "project"` |
| `status` | Show stats | `memphis status` |
| `tui` | Visual dashboard | `memphis tui` |
| `vault` | Encrypted storage | `memphis vault init` |
| `embed` | Generate embeddings | `memphis embed --chain journal` |

---

## 🎯 Common Workflows

### Daily Journaling:

```bash
# Morning
memphis journal "Today's goals: finish TUI, test on second PC" --tags goals

# During work
memphis journal "Fixed TUI crash - editor.clear bug" --tags bug,tui

# End of day
memphis journal "Completed Phase 2, starting Phase 3" --tags milestone
```

### Learning from mistakes:

```bash
memphis journal "LESSON: Always verify before claiming success" --tags lesson,learning
```

### Decision tracking:

```bash
memphis decide "Use ZAI/GLM over OpenAI for cost reasons" --rationale "49-char key, better pricing"
```

### Semantic recall:

```bash
memphis recall "last week" --top 20
memphis recall "bug fix" --since 2026-03-01
memphis ask "What lessons did I learn?"
```

---

## 🐛 Troubleshooting

### Provider not working?

```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags

# Check config
cat ~/.memphis/config.yaml

# Test provider
memphis ask "test" --provider ollama
```

### Embeddings not working?

```bash
# Pull embedding model
ollama pull nomic-embed-text

# Generate embeddings
memphis embed --chain journal

# Check status
memphis status
```

### TUI crashes?

```bash
# Update to latest version
git pull
npm run build

# Test
memphis tui
```

---

## 📖 Next Steps

1. **Explore features:**
   - `memphis vault init` — encrypted storage
   - `memphis daemon start` — background processing
   - `memphis share-sync --push` — IPFS sync

2. **Customize config:**
   - Edit `~/.memphis/config.yaml`
   - Add fallback providers
   - Adjust embeddings settings

3. **Join community:**
   - Docs: https://github.com/elathoxu-crypto/memphis
   - Chat: https://discord.gg/clawd

---

## 🎉 Success Checklist

After 5 minutes, you should have:

- ✅ Memphis installed
- ✅ Provider configured (Ollama/ZAI/OpenAI)
- ✅ First memory saved
- ✅ Asked your first question
- ✅ Tried semantic search
- ✅ Launched TUI

**If stuck:** Check troubleshooting or ask in Discord!

---

**Happy memory building! 🧠✨**
