# Memphis 🧠

**Local-first cognitive engine with AI-powered decision tracking and predictive suggestions.**

**Latest: v2.0.0 — Model C Complete (Predictive Engine)**

[English](#english) | [Polski](#polski) | [Quick Start](docs/QUICKSTART.md) | [Full Docs](docs/)

---

## English

### 🎯 What is Memphis?

Memphis is a **cognitive engine** that helps you track, learn from, and predict your decisions:

- **Model A** — Record conscious decisions manually
- **Model B** — Detect decisions from git history automatically  
- **Model C** — Predict decisions before you make them

**Think of it as:** A second brain that learns from your choices and suggests what you'll decide next.

---

### ✨ What's New in v2.0.0?

**🚀 Model C — Predictive Decisions Engine**

**Pattern Learning:**
```bash
# Learn patterns from your decision history
memphis predict --learn --since 30
# → 15 decisions analyzed, 3 patterns extracted
```

**Prediction Generation:**
```bash
# Get predictions based on current context
memphis predict
# 🔮 PREDICTED DECISIONS
# 
# Based on your current work (5 files, 2 commits today):
#
# 1. 🟢 [85%] Use REST architecture
#    Evidence: 5 similar decisions, 80% accuracy
#    Type: technical
#
# 2. 🟡 [72%] Add authentication
#    Evidence: 3 similar decisions
```

**Proactive Suggestions:**
```bash
# Check for suggestions (background daemon runs every 30min)
memphis suggest --force

# 🔔 PROACTIVE SUGGESTIONS
# 
# Based on your current context:
# 1. 🟢 [85%] Use TypeScript for new features
#    [a]ccept / [n]one / [c]ustom
```

**Pattern Management:**
```bash
# View learned patterns
memphis patterns list

# 📊 LEARNED PATTERNS (5)
#
# 1. Use TypeScript for new features
#    Type: technical | Occurrences: 12
#    Confidence: 92% | Accuracy: 87%
#    Trend: improving ⬆️
#
# 2. Use PostgreSQL for data storage
#    Type: technical | Occurrences: 8
#    Confidence: 75% | Accuracy: 80%
```

**Accuracy Tracking:**
```bash
# Track prediction accuracy
memphis accuracy

# 📊 ACCURACY TRACKING
#
# Total events: 45
# Overall accuracy: 78%
# Patterns tracked: 5
#
# 📈 Improving: 2 | 📉 Declining: 1
#
# 🏆 TOP PERFORMERS:
# 1. [87%] Use TypeScript
#    12 predictions, improving ⬆️
```

---

### 🧠 Complete Cognitive Engine

Memphis implements a 3-model cognitive architecture:

#### **Model A — Conscious Decisions** ✅ 100%

You explicitly record decisions:

```bash
# Full syntax
memphis decide "Use TypeScript not JavaScript" "TypeScript" \
  --reasoning "Better type safety" \
  --scope project \
  --tags tech,frontend

# Frictionless (92ms average)
md "use TypeScript"
# ✓ [decisions#8] hash
# ⚡ 92ms
```

**Features:**
- Manual capture
- Rich metadata (reasoning, scope, tags)
- Lifecycle tracking (revise/contradict/reinforce)
- Semantic search

---

#### **Model B — Inferred Decisions** ✅ 100%

Agent detects decisions from git history:

```bash
# Analyze last 30 days
memphis infer --since 30

# ╔═══════════════════════════════════════════════════════════╗
# ║           Memphis Decision Inference Engine 🧠            ║
# ╚═══════════════════════════════════════════════════════════╝
#
#   Analyzed commits from last 30 days
#   Total detected: 20 | High confidence: 15
#
#   DETECTED DECISIONS:
#
#   1. 🟢 [83%] Refactored addBlock to appendBlock
#      Type: technical | Category: refactoring
#      Evidence: commit a6b88d0
#
#   2. 🟢 [77%] Using navigateTo instead of navigateToMenu
#      Type: technical | Category: technology
#      Evidence: commit 74c8dd5
```

**Features:**
- Git commit analysis
- Pattern detection (20 patterns)
- Confidence scoring (50-83%)
- Interactive prompts (`--prompt`)

---

#### **Model C — Predictive Decisions** ✅ 100%

Agent predicts decisions before you make them:

```bash
# Learn patterns (one-time setup)
memphis predict --learn --since 30

# Generate predictions
memphis predict --min-confidence 0.7

# View pattern stats
memphis patterns stats

# Track accuracy
memphis accuracy
```

**Features:**
- Pattern learning from history
- Context analysis (files, branch, commits)
- Weighted matching (5 dimensions)
- Proactive suggestions
- Accuracy tracking
- Trend detection

**Performance:**
| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Pattern Learning | <2000ms | 1049ms | ✅ 47% faster |
| Prediction | <1000ms | 660ms | ✅ 34% faster |
| Suggestion | <1000ms | 610ms | ✅ 39% faster |

---

### 🚀 Quick Start

**1. Install**
```bash
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install && npm run build
```

**2. Initialize**
```bash
node dist/cli/index.js init
# Interactive setup wizard
```

**3. Make First Decision**
```bash
# Model A (conscious)
node dist/cli/index.js decide "Use Memphis for decision tracking" "Memphis" \
  --reasoning "Better than scattered notes"

# Model B (inferred - detect from git)
node dist/cli/index.js infer --since 7

# Model C (predictive - needs training first)
node dist/cli/index.js predict --learn --since 30
node dist/cli/index.js predict
```

**4. Search Your Memory**
```bash
node dist/cli/index.js recall "decision tracking"
# Finds related decisions, journal entries, etc.
```

**Time to first success:** <5 minutes ⏱️

---

### 📋 Command Reference

#### **Core Commands**

```bash
# Decisions (Model A)
memphis decide <title> <chosen> [--reasoning <why>] [--tags <tags>]
memphis decisions [--status active|revised] [--recent 7]
memphis revise <id> <new-choice> [--reasoning <why>]
memphis contradict <id> [--evidence <why>]
memphis reinforce <id> [--evidence <why>]

# Inference (Model B)
memphis infer --since <days>
memphis infer --prompt --since <days>
memphis decide-fast <title> <chosen>  # alias: md

# Predictions (Model C)
memphis predict [--learn] [--since <days>] [--min-confidence <n>]
memphis patterns [list|stats|clear]
memphis suggest [--force] [--channel <name>]
memphis accuracy [clear]

# Memory
memphis journal <text> [--tags <tags>]
memphis ask <question>
memphis recall <keywords>

# System
memphis status
memphis doctor
memphis tui
```

#### **Advanced Commands**

```bash
# Intelligence
memphis intelligence stats
memphis intelligence analyze

# Sync
memphis share-sync --push|--pull
memphis trade create <recipient> --blocks <chain:range>

# Vault
memphis vault init
memphis vault backup  # 24-word seed
memphis vault recover --seed <words>

# Daemon
memphis daemon start
memphis daemon status
```

---

### 📚 Documentation

**Getting Started:**
- [Quick Start Guide](docs/QUICKSTART.md) — 5-minute setup
- [Architecture](docs/ARCHITECTURE.md) — How it works
- [API Reference](docs/API_REFERENCE.md) — Complete command reference

**Models:**
- [Model A Guide](docs/MODEL-A-GUIDE.md) — Conscious decisions
- [Model B Guide](docs/MODEL-B-GUIDE.md) — Inferred decisions  
- [Model C Guide](docs/MODEL-C-GUIDE.md) — Predictive decisions

**Advanced:**
- [Decision Schema](docs/DECISION_SCHEMA.md) — Data format
- [Integration Tests](docs/MODEL-C-INTEGRATION-TESTS.md) — Test suite
- [Deployment](docs/DEPLOYMENT.md) — Production setup

**Vision:**
- [Project Vision](docs/VISION.md) — Where we're going
- [Implementation Roadmap](docs/VISION-IMPLEMENTATION-ROADMAP.md) — How we get there

---

### 🏗️ Architecture

**4-Layer Cognitive Architecture:**

```
┌─────────────────────────────────────────┐
│  Layer 4: Interface (CLI/TUI/IDE)       │ ← Your interface
├─────────────────────────────────────────┤
│  Layer 3: Cognitive Engine (A+B+C)      │ ← Decision models
├─────────────────────────────────────────┤
│  Layer 2: Agent Runtime (Daemon/Watch)  │ ← Background agents
├─────────────────────────────────────────┤
│  Layer 1: Memory Ledger (Chains)        │ ← Persistent storage
└─────────────────────────────────────────┘
```

**Components:**
- **Memory Chains** — Journal, decisions, ask (blockchain-inspired)
- **Embeddings** — Semantic search (Ollama nomic-embed-text)
- **Intelligence** — Auto-categorization, pattern matching
- **Daemon** — Background agents (git collector, shell collector)
- **Sync** — Multi-agent synchronization (IPFS/Pinata)

---

### 🎯 Use Cases

**For Developers:**
- Track technical decisions ("Why did I choose X?")
- Learn from past choices
- Predict future decisions
- Onboarding documentation (decision archaeology)

**For Entrepreneurs:**
- Strategic decision tracking
- Business pattern recognition
- Proactive decision support
- Decision accountability

**For Teams:**
- Collective decision memory
- Decision archaeology (why did we do X?)
- Pattern sharing across agents
- Knowledge transfer

**For Lifelong Learners:**
- Learning journal
- Pattern recognition in behavior
- Self-reflection tool
- Decision analytics

---

### 📊 Performance

**v2.0.0 Benchmarks:**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Decision Capture | <100ms | 92ms | ✅ |
| Inference Engine | <1000ms | 641ms | ✅ |
| Pattern Learning | <2000ms | 1049ms | ✅ |
| Prediction Gen | <1000ms | 660ms | ✅ |
| Context Analysis | <1000ms | 610ms | ✅ |

**Tests:**
- Integration Tests: 8/8 passing (100%)
- Unit Tests: 182+ tests passing
- Accuracy: 77.2% (auto-categorization)

---

### 🔒 Privacy & Security

**Local-First:**
- All data stored locally in `~/.memphis/`
- No cloud required
- No telemetry
- No tracking

**Optional Sync:**
- IPFS/Pinata for encrypted sync
- Multi-agent support (opt-in)
- Vault for secrets (24-word seed)

**Data Ownership:**
- You own your chains
- Export anytime (`memphis export`)
- Delete anytime (delete `~/.memphis/`)

---

### 🤝 Community

**Get Help:**
- [Discord](https://discord.gg/clawd) — Community support
- [GitHub Issues](https://github.com/elathoxu-crypto/memphis/issues) — Bug reports
- [Documentation](https://docs.openclaw.ai) — Guides & API

**Contributing:**
- Fork & PR welcome
- See [CONTRIBUTING.md](CONTRIBUTING.md)
- Check [VISION.md](docs/VISION.md) for direction

---

### 📦 Installation

**Requirements:**
- Node.js 18+
- Git (for Model B inference)
- Ollama (optional, for embeddings)

**Install:**
```bash
# Clone
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis

# Install dependencies
npm install

# Build
npm run build

# Initialize
node dist/cli/index.js init

# Verify
node dist/cli/index.js doctor
# ✓ All systems healthy! 9/9 checks passed
```

---

### 🗺️ Roadmap

**v2.0.0** (Current) ✅
- ✅ Model A: Conscious decisions
- ✅ Model B: Inferred decisions
- ✅ Model C: Predictive decisions
- ✅ Complete documentation

**v2.1.0** (Next)
- [ ] Knowledge graph integration
- [ ] Multi-agent pattern sharing
- [ ] IDE integration (VS Code)
- [ ] Web dashboard

**v3.0.0** (Future)
- [ ] Model D: Collective decisions
- [ ] Model E: Meta-cognitive
- [ ] Machine learning models
- [ ] Team features

---

### 📜 License

MIT License — See [LICENSE](LICENSE)

---

### 🙏 Credits

Created by **Elathoxu Abbylan** (Memphis)

Built with:
- TypeScript
- Node.js
- Ollama
- IPFS/Pinata

Inspired by:
- Local-first software movement
- Cognitive architecture research
- Decision theory

---

## Polski

Memphis to **silnik poznawczy** który pomaga śledzić, uczyć się i przewidywać decyzje:

- **Model A** — Ręczne zapisywanie decyzji
- **Model B** — Automatyczne wykrywanie z gita
- **Model C** — Przewidywanie decyzji

**Dokumentacja:** [QUICKSTART.md](docs/QUICKSTART.md) | [MODEL-C-GUIDE.md](docs/MODEL-C-GUIDE.md)

---

**Status:** v2.0.0 Production Ready ✅  
**GitHub:** https://github.com/elathoxu-crypto/memphis  
**Discord:** https://discord.gg/clawd

---

*Made with 🧠 by Memphis*
