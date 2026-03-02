# Frequently Asked Questions

**Version:** 2.0.0  
**Last Updated:** 2026-03-02

---

## 📋 Table of Contents

- [General](#general)
- [Installation](#installation)
- [Model A (Conscious Decisions)](#model-a-conscious-decisions)
- [Model B (Inferred Decisions)](#model-b-inferred-decisions)
- [Model C (Predictive Decisions)](#model-c-predictive-decisions)
- [Performance](#performance)
- [Privacy & Security](#privacy--security)
- [Technical](#technical)
- [Troubleshooting](#troubleshooting)

---

## General

### What is Memphis?

**Memphis** is a local-first cognitive engine that helps you track, learn from, and predict your decisions. It's like a second brain that remembers not just WHAT you decided, but WHY.

**Three models:**
- **Model A** — Record conscious decisions
- **Model B** — Detect decisions from git
- **Model C** — Predict decisions before you make them

---

### Why would I use Memphis?

**You should use Memphis if:**
- ✅ You make important decisions and forget why later
- ✅ You want to learn from past choices
- ✅ You work on complex projects with many technical decisions
- ✅ You want to document decision history for onboarding
- ✅ You're curious about your decision patterns

**You might NOT need Memphis if:**
- ❌ You rarely make technical/business decisions
- ❌ You have perfect memory (congratulations!)
- ❌ You don't care about decision history

---

### Is Memphis free?

**Yes!**
- Open source (MIT license)
- No subscription
- No cloud costs (local-first)
- Optional: Ollama for embeddings (free)

---

### What makes Memphis different from note-taking apps?

| Feature | Memphis | Note Apps |
|---------|---------|-----------|
| Structured decision format | ✅ | ❌ |
| Git integration | ✅ | ❌ |
| Predictive suggestions | ✅ | ❌ |
| Semantic search | ✅ | ❌ |
| Decision lifecycle | ✅ | ❌ |
| Pattern learning | ✅ | ❌ |
| Multi-agent sync | ✅ | ❌ |

**Memphis is specialized for decisions, not general notes.**

---

## Installation

### What are the requirements?

**Minimum:**
- Node.js 18+
- Git (for Model B)
- 500MB disk space

**Recommended:**
- Node.js 20+
- Ollama (for embeddings)
- 2GB RAM

---

### How do I install Memphis?

```bash
# 1. Clone
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis

# 2. Install
npm install

# 3. Build
npm run build

# 4. Initialize
node dist/cli/index.js init

# 5. Verify
node dist/cli/index.js doctor
```

**Time:** ~5 minutes

---

### Do I need Ollama?

**No, but recommended.**

**Without Ollama:**
- ❌ No semantic search
- ❌ No embeddings
- ✅ Basic decision tracking works
- ✅ Git inference works

**With Ollama:**
- ✅ Semantic search enabled
- ✅ Better pattern matching
- ✅ Smarter predictions

**Install Ollama:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text
```

---

### Can I use a different LLM provider?

**Yes!** Memphis supports:

| Provider | Type | Cost |
|----------|------|------|
| Ollama | Local | Free |
| OpenAI | Cloud | $$$ |
| OpenRouter | Cloud | $$ |
| MiniMax | Cloud | $ |
| ZAI | Cloud | $ |
| Codex | Cloud | $$ |

**Configuration:**
```yaml
# ~/.memphis/config.yaml
provider: ollama
model: qwen2.5-coder:3b
```

---

## Model A (Conscious Decisions)

### When should I use Model A?

**Use Model A when:**
- ✅ You consciously make a decision
- ✅ You want to capture the WHY
- ✅ The decision is important enough to remember
- ✅ You want to track decision evolution

**Don't use Model A for:**
- ❌ Trivial choices (what to eat for lunch)
- ❌ Temporary decisions
- ❌ Decisions you won't care about in 6 months

---

### How do I make decision capture faster?

**Use frictionless capture:**

```bash
# Setup (one-time)
./scripts/setup-frictionless.sh

# Then capture instantly
md "use PostgreSQL not MongoDB"

# Time: 92ms average
```

**Or add alias manually:**
```bash
# ~/.bashrc or ~/.zshrc
alias md='memphis decide-fast'
```

---

### What's the difference between revise/contradict/reinforce?

| Action | When to use | Effect |
|--------|-------------|--------|
| `revise` | Changed mind, new choice | Old → deprecated, new → active |
| `contradict` | Decision was wrong | Status → contradicted, confidence ↓ |
| `reinforce` | Decision proven correct | Confidence ↑, timestamp updated |

**Example:**
```bash
# Revise: Changed from REST to GraphQL
memphis revise dec_abc123 "GraphQL" --reasoning "Frontend needs flexibility"

# Contradict: REST was a mistake
memphis contradict dec_abc123 --evidence "Caused performance issues"

# Reinforce: GraphQL still best after 6 months
memphis reinforce dec_abc123 --evidence "Zero issues, team loves it"
```

---

### Should I record all decisions?

**No.** Focus on:

**Record these:**
- ✅ Technical architecture choices
- ✅ Technology selections
- ✅ Business strategy decisions
- ✅ Process changes
- ✅ Hiring decisions
- ✅ Project pivots

**Skip these:**
- ❌ Temporary choices
- ❌ Personal preferences (unless important)
- ❌ Trivial decisions
- ❌ Decisions with no long-term impact

**Rule of thumb:** Would you care about this in 6 months?

---

## Model B (Inferred Decisions)

### How does Model B detect decisions?

**Pattern matching on git commits:**

```bash
memphis infer --since 30
```

**Detects patterns like:**
- "Migrated from X to Y" → technology choice
- "Refactored X to Y" → refactoring decision
- "Added X" → feature decision
- "Removed X" → removal decision

**20+ patterns** covering:
- Technology choices
- Architecture changes
- Refactoring decisions
- Tool adoptions

---

### How accurate is inference?

**Confidence: 50-83%**

| Pattern | Confidence |
|---------|------------|
| Migration (X to Y) | 83% |
| Refactoring | 77% |
| Technology choice | 75% |
| Tool adoption | 70% |
| Architecture | 65% |

**Why not 100%?**
- Git messages vary in quality
- Some commits aren't decisions
- Context is limited

**Best practice:** Use `--prompt` mode to verify:

```bash
memphis infer --prompt --since 30
```

---

### Can I improve inference accuracy?

**Yes!**

1. **Write better commit messages:**
   ```bash
   # Good
   git commit -m "Migrated from REST to GraphQL for better frontend DX"
   
   # Bad
   git commit -m "updates"
   ```

2. **Use conventional commits:**
   ```bash
   feat(api): migrate from REST to GraphQL
   refactor(db): switch from MongoDB to PostgreSQL
   ```

3. **Review detected decisions:**
   ```bash
   memphis infer --prompt --min-confidence 0.7
   ```

---

### What if inference detects too many false positives?

**Filter by confidence:**

```bash
# Only high-confidence (>70%)
memphis infer --since 30 --min-confidence 0.7
```

**Or use interactive mode:**

```bash
memphis infer --prompt --since 30
# Review each one manually
```

---

## Model C (Predictive Decisions)

### How many decisions do I need for predictions?

**Minimum:** 50+ decisions

**Why?**
- Pattern learning needs examples
- 3+ occurrences per pattern
- Diversity of contexts

**Current stats:**
```bash
memphis patterns stats

# Output:
# Total patterns: 5
# Average occurrences: 10.2
```

---

### How do I train the prediction engine?

**One-time setup:**

```bash
# Learn from last 90 days
memphis predict --learn --since 90
```

**Retrain periodically:**
```bash
# Weekly (recommended)
memphis predict --learn --since 7

# Or set up cron
crontab -e
# Add: 0 0 * * 0 memphis predict --learn --since 7
```

---

### How accurate are predictions?

**Current: 78% average**

| Metric | Value |
|--------|-------|
| Overall accuracy | 78% |
| Best pattern | 87% |
| Worst pattern | 45% |
| Improving patterns | 40% |
| Declining patterns | 20% |

**Improves over time** as you:
- Make more decisions
- Accept/reject predictions
- Retrain patterns

---

### Why am I not getting predictions?

**Possible reasons:**

1. **Not enough decisions**
   ```bash
   memphis decisions --recent 90
   # Need 50+ decisions
   ```

2. **Patterns not learned**
   ```bash
   memphis patterns list
   # If empty, run:
   memphis predict --learn --since 90
   ```

3. **Context not matching**
   ```bash
   memphis predict --min-confidence 0.5
   # Lower threshold temporarily
   ```

4. **Cooldown active**
   ```bash
   memphis suggest --force
   # Bypass 30-minute cooldown
   ```

---

### Can I delete bad patterns?

**Yes:**

```bash
# Clear all patterns (fresh start)
memphis patterns clear

# Re-learn from scratch
memphis predict --learn --since 90
```

**Or edit manually:**
```bash
# Edit patterns file
nano ~/.memphis/patterns.json

# Remove specific patterns
# Save and restart
```

---

## Performance

### How fast is decision capture?

**Target: <100ms**

**Actual:** 92ms average

```bash
md "test decision"
# ⚡ 92ms
```

**7x faster than planned target (700ms)**

---

### How much disk space does Memphis use?

**Typical usage:**

| Component | Size |
|-----------|------|
| Chains (1 year) | ~50MB |
| Embeddings | ~100MB |
| Patterns | ~1KB |
| Config | ~1KB |
| **Total** | ~150MB |

**Growth rate:** ~12MB/month

---

### Can Memphis handle large codebases?

**Yes.**

**Tested with:**
- 10,000+ commits
- 1,000+ decisions
- 5,000+ journal entries

**Performance:**
- Inference: 641ms (30 days)
- Search: <100ms
- Prediction: 660ms

---

### Is there a limit on chain size?

**No hard limit.**

**Soft limits:**
- 1 block per file
- Files indexed sequentially
- Search works on all blocks

**Recommendation:** Archive old chains annually if >10,000 blocks

---

## Privacy & Security

### Where is my data stored?

**Local-only:**

```
~/.memphis/
├── chains/          # Decision history
├── embeddings/      # Search vectors
├── patterns.json    # Learned patterns
└── config.yaml      # Configuration
```

**No cloud required.**

---

### Does Memphis send data anywhere?

**No.**

- ❌ No telemetry
- ❌ No analytics
- ❌ No cloud sync (unless you enable it)
- ✅ Everything stays local

**Optional sync:**
- IPFS/Pinata (encrypted)
- You control the keys

---

### Can I encrypt my data?

**Yes!**

```bash
# Vault for secrets
memphis vault init
memphis vault add api_key "sk-abc123..."

# Backup with 24-word seed
memphis vault backup
# → word1 word2 ... word24

# Recover
memphis vault recover --seed "word1 word2 ..."
```

---

### Can I export my data?

**Yes:**

```bash
# Export decisions
memphis decisions --json > decisions.json

# Export all chains
cp -r ~/.memphis/chains ~/backup/

# Export everything
tar -czf memphis-backup.tar.gz ~/.memphis/
```

---

### Can I delete my data?

**Yes:**

```bash
# Delete everything
rm -rf ~/.memphis/

# Or delete specific chains
rm -rf ~/.memphis/chains/decisions/
```

**No cloud, no traces.**

---

## Technical

### What database does Memphis use?

**No database.**

- File-based storage (JSON)
- One file per block
- Sequential indexing
- In-memory caching

**Why?**
- Simplicity
- Portability
- No external dependencies
- Easy backup/restore

---

### Can I run Memphis in Docker?

**Yes (planned):**

```bash
# Coming soon
docker pull memphis/cognitive-engine
docker run -v ~/.memphis:/data memphis/cognitive-engine
```

**Current workaround:**
```bash
# Manual Docker
FROM node:20
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["node", "dist/cli/index.js", "daemon", "start"]
```

---

### Can I use Memphis programmatically?

**Yes:**

```javascript
const { Store } = require('memphis');

async function main() {
  const store = await Store.create();
  
  // Add decision
  const block = await store.appendBlock('decisions', {
    type: 'decision',
    content: JSON.stringify({
      title: 'Use TypeScript',
      chosen: 'TypeScript',
    }),
  });
  
  // Search
  const results = await store.recall('TypeScript');
  console.log(results);
}
```

---

### Can I sync multiple machines?

**Yes:**

```bash
# Machine A: Push
memphis share-sync --push

# Machine B: Pull
memphis share-sync --pull
```

**Requires:**
- IPFS node (or Pinata)
- Configuration in `~/.memphis/config.yaml`

---

## Troubleshooting

### Installation fails with "node-gyp" error

**Solution:**

```bash
# Install build tools
sudo apt-get install build-essential python3

# Or on macOS
xcode-select --install

# Retry
npm install
```

---

### "Ollama not found" error

**Solution:**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve

# Pull embeddings model
ollama pull nomic-embed-text

# Verify
curl http://localhost:11434/api/tags
```

---

### "Cannot find module" error

**Solution:**

```bash
# Build first
npm run build

# Then run
node dist/cli/index.js init
```

---

### Predictions not working

**Solution:**

```bash
# Check patterns
memphis patterns list

# If empty, learn
memphis predict --learn --since 90

# Check accuracy
memphis accuracy

# If low, make more decisions
memphis decide "test" "test"
```

---

### Search returns no results

**Solution:**

```bash
# Check embeddings
ls ~/.memphis/embeddings/

# If missing, generate
memphis embeddings generate

# Check Ollama
ollama list | grep nomic
```

---

### Daemon crashes

**Solution:**

```bash
# Check logs
tail -f ~/.memphis/daemon.log

# Restart
memphis daemon stop
memphis daemon start

# Check status
memphis daemon status
```

---

### "Out of memory" error

**Solution:**

```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Or limit search
memphis recall "query" --limit 5
```

---

## Still Have Questions?

**Get help:**

- 💬 [Discord](https://discord.gg/clawd)
- 🐛 [GitHub Issues](https://github.com/elathoxu-crypto/memphis/issues)
- 📖 [Documentation](https://docs.openclaw.ai)

---

**FAQ Version:** 2.0.0  
**Last Updated:** 2026-03-02
