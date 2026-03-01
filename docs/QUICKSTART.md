# Memphis Quickstart 🚀

**First journal entry in 5 minutes. No complexity.**

---

## What You'll Do

1. Install Memphis
2. Initialize your brain
3. Write your first memory
4. Ask a question about it
5. (Optional) Try the visual dashboard

---

## Step 1: Install (2 min)

```bash
# Clone + install
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install
npm run build

# Make CLI available globally
npm link
```

**Verify:**
```bash
memphis --version
# Should show: 1.5.0 (or newer)
```

---

## Step 2: Initialize (1 min)

```bash
# Create ~/.memphis/ with default config
memphis init

# Check if it worked
memphis status
```

**Expected output:**
```
✓ Workspace: /home/you/.memphis
✓ Chains: 0 blocks
✓ Provider: ollama (ready)
✓ Embeddings: 0 vectors
```

---

## Step 3: First Memory (30 sec)

```bash
memphis journal "My first memory: Memphis is my AI brain" --tags learning,test
```

**Output:**
```
✓ journal#000001 created
  SHA256: a1b2c3...
  Tags: learning, test
```

---

## Step 4: Ask About It (30 sec)

```bash
memphis ask "what did I just remember?"
```

**Expected response:**
```
You just remembered that Memphis is your AI brain.
Tags: learning, test
Time: just now
```

---

## Step 5: See It Visually (Optional, 1 min)

```bash
memphis tui
```

**Navigate:**
- `1` — Dashboard (stats)
- `2` — Journal (all entries)
- `3` — Ask (interactive Q&A)
- `q` — Quit

---

## 🎉 Done!

You now have:
- ✅ Working Memphis install
- ✅ First memory saved
- ✅ Contextual recall working
- ✅ Visual dashboard ready

---

## What's Next?

### If you want to learn more (10 min):

**Core commands (memorize these):**

| Command | What it does |
|---------|--------------|
| `memphis journal <text> --tags x,y` | Save a memory |
| `memphis ask <question>` | Ask with context |
| `memphis status` | Check health |
| `memphis tui` | Visual dashboard |

**5 more useful commands:**

| Command | What it does |
|---------|--------------|
| `memphis recall <keyword>` | Search memories |
| `memphis decide <title> <choice>` | Track decisions |
| `memphis embed` | Enable semantic search |
| `memphis reflect --daily` | Get insights |
| `memphis share-sync --all` | Sync with other agents |

### If you want full docs:

- **Full command reference:** [README.md](../README.md)
- **Architecture:** [NEXUS.md](NEXUS.md)
- **Examples:** [WORKFLOWS.md](WORKFLOWS.md)
- **Tutorial:** [TUTORIAL.md](TUTORIAL.md)

---

## Common Issues

### "Provider not ready"

**Problem:** No LLM configured.

**Fix:**
```bash
# Option 1: Use Ollama (free, offline)
# Install: https://ollama.ai
ollama pull qwen2.5-coder:3b

# Edit ~/.memphis/config.yaml
providers:
  default: ollama
  ollama:
    model: qwen2.5-coder:3b
    url: http://127.0.0.1:11434/v1

# Option 2: Use OpenAI (requires API key)
providers:
  default: openai
  openai:
    apiKey: sk-...
    model: gpt-4
```

### "Embeddings slow"

**Problem:** First-time embedding takes 2-3 seconds.

**Normal!** This is Ollama loading the model. Subsequent runs are faster.

### "Where's my data?"

**Location:** `~/.memphis/`

```bash
# See all chains
ls ~/.memphis/*.jsonl

# View journal chain
cat ~/.memphis/journal.jsonl | head -5
```

---

## Real-World Usage

### Daily workflow (recommended):

```bash
# Morning: capture intent
memphis journal "Today's focus: finish X feature" --tags goal,focus

# During work: save decisions
memphis journal "Decided: use SQLite instead of Postgres for simplicity" --tags decision,arch

# Evening: summarize
memphis journal "EOD: finished X, tomorrow need Y" --tags eod
```

### Weekly rituals:

```bash
# Build knowledge graph (connects related memories)
memphis embed
memphis graph build

# Get insights
memphis reflect --weekly
```

### Ask questions:

```bash
memphis ask "what decisions did I make about architecture this week?"
memphis ask "what problems are still unresolved?"
memphis ask "what did I learn about X?"
```

---

## That's It!

**You don't need to know all 35 commands.**

Just remember:
1. `journal` — capture
2. `ask` — query
3. `tui` — visualize

Everything else is optional.

---

**Questions?** Check [NEXUS.md](NEXUS.md) or open an issue on GitHub.

**Want more?** See [WORKFLOWS.md](WORKFLOWS.md) for real-world examples.
