# Memphis API Reference

**Version:** 2.0.0  
**Date:** 2026-03-02

---

## Table of Contents

- [Decision Commands](#decision-commands)
- [Inference Commands](#inference-commands)
- [Prediction Commands](#prediction-commands)
- [Memory Commands](#memory-commands)
- [System Commands](#system-commands)
- [Advanced Commands](#advanced-commands)

---

## Decision Commands

### `memphis decide`

Record a conscious decision.

**Usage:**
```bash
memphis decide <title> <chosen> [options]
```

**Arguments:**
- `<title>` — Decision title (what did you decide?)
- `<chosen>` — What did you choose?

**Options:**
- `-r, --reasoning <text>` — Why did you choose this?
- `-o, --options <options>` — Options considered (pipe-separated: `A|B|C`)
- `-s, --scope <scope>` — Impact scope: `personal` | `project` | `life` (default: `project`)
- `-m, --mode <mode>` — Mode: `conscious` | `inferred` (default: `conscious`)
- `-c, --confidence <n>` — Confidence 0-1 (default: 1.0 for conscious)
- `-t, --tags <tags>` — Tags (comma-separated)
- `-l, --links <ids>` — Related decision IDs (comma-separated)

**Examples:**
```bash
# Minimal
memphis decide "Use TypeScript" "TypeScript"

# Full
memphis decide "Database choice" "PostgreSQL" \
  --reasoning "Better JSON support and performance" \
  --options "PostgreSQL|MongoDB|MySQL" \
  --scope project \
  --tags tech,backend \
  --confidence 0.9

# With links
memphis decide "API design" "REST" \
  --reasoning "Simpler than GraphQL for our needs" \
  --links dec_abc123,dec_def456
```

**Output:**
```
✓ [decisions#15] 589c1cfc5afa...
ℹ Decision saved: 0b3f9e6acbefc3e4 (conscious, active, project)
ℹ Title: Database choice
ℹ Chosen: PostgreSQL
```

---

### `memphis decisions`

List decisions with filters.

**Usage:**
```bash
memphis decisions [options]
```

**Options:**
- `--status <status>` — Filter by status: `active` | `revised` | `deprecated`
- `--mode <mode>` — Filter by mode: `conscious` | `inferred`
- `--scope <scope>` — Filter by scope: `personal` | `project` | `life`
- `--tags <tags>` — Filter by tags (comma-separated)
- `--recent <n>` — Last N days (default: 30)
- `--limit <n>` — Limit results (default: 20)

**Examples:**
```bash
# All active decisions
memphis decisions

# Recent technical decisions
memphis decisions --recent 7 --tags tech

# Project-scoped
memphis decisions --scope project --status active

# Inferred only
memphis decisions --mode inferred
```

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║                RECENT DECISIONS (Last 7 days)            ║
╚═══════════════════════════════════════════════════════════╝

1. [project | conscious] Database choice
   Chosen: PostgreSQL
   Reasoning: Better JSON support
   Tags: tech,backend
   2 days ago

2. [project | inferred] Refactored addBlock to appendBlock
   Chosen: appendBlock
   Confidence: 83%
   5 days ago
```

---

### `memphis revise`

Revise a decision (creates new, deprecates old).

**Usage:**
```bash
memphis revise <decision-id> <new-choice> [options]
```

**Arguments:**
- `<decision-id>` — Decision ID to revise
- `<new-choice>` — New choice

**Options:**
- `-r, --reasoning <text>` — Why are you revising?

**Example:**
```bash
memphis revise dec_abc123 "MongoDB" \
  --reasoning "Schema flexibility became important"
```

**Effect:**
- Old decision → status: `deprecated`
- New decision → status: `active`, `parent_id` = old

---

### `memphis contradict`

Mark a decision as contradicted (wrong).

**Usage:**
```bash
memphis contradict <decision-id> [options]
```

**Arguments:**
- `<decision-id>` — Decision ID to contradict

**Options:**
- `-e, --evidence <text>` — Evidence why it was wrong

**Example:**
```bash
memphis contradict dec_abc123 \
  --evidence "Caused performance issues in production"
```

**Effect:**
- Decision → status: `contradicted`
- Confidence → reduced

---

### `memphis reinforce`

Reinforce a decision (confirm as still valid).

**Usage:**
```bash
memphis reinforce <decision-id> [options]
```

**Arguments:**
- `<decision-id>` — Decision ID to reinforce

**Options:**
- `-e, --evidence <text>` — Evidence why it's still valid

**Example:**
```bash
memphis reinforce dec_abc123 \
  --evidence "Still the best choice after 6 months of use"
```

**Effect:**
- Decision confidence → increased
- Last reinforced → updated

---

### `memphis show`

Show a specific decision.

**Usage:**
```bash
memphis show decision <id>
```

**Example:**
```bash
memphis show decision dec_abc123
```

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║                    DECISION DETAILS                       ║
╚═══════════════════════════════════════════════════════════╝

ID: dec_abc123
Title: Database choice
Chosen: PostgreSQL

Status: active
Mode: conscious
Scope: project
Confidence: 90%

Reasoning:
  Better JSON support and performance

Options considered:
  - PostgreSQL ✓
  - MongoDB
  - MySQL

Tags: tech,backend
Created: 2026-03-01 14:30
```

---

## Inference Commands

### `memphis infer`

Detect decisions from git history.

**Usage:**
```bash
memphis infer [options]
```

**Options:**
- `--since <days>` — Days to analyze (default: 7)
- `--prompt` — Interactive prompts to save decisions
- `--min-confidence <n>` — Min confidence 0-1 (default: 0.5)

**Examples:**
```bash
# Analyze last 7 days
memphis infer --since 7

# Interactive mode
memphis infer --prompt --since 30

# High confidence only
memphis infer --since 14 --min-confidence 0.7
```

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║           Memphis Decision Inference Engine 🧠            ║
╚═══════════════════════════════════════════════════════════╝

  Analyzed commits from last 7 days
  Confidence threshold: 50%
  Total detected: 6
  High confidence: 6

  ─────────────────────────────────────────────────────
  DETECTED DECISIONS:
  ─────────────────────────────────────────────────────

  1. 🟢 [83%] Refactored addBlock to appendBlock
     Type: technical | Category: refactoring
     Evidence: commit a6b88d0

  2. 🟢 [77%] Using navigateTo instead of navigateToMenu
     Type: technical | Category: technology
     Evidence: commit 74c8dd5
```

---

### `memphis decide-fast` / `md`

Ultra-fast decision capture (<100ms target).

**Usage:**
```bash
memphis decide-fast <title>
# or alias:
md <title>
```

**Arguments:**
- `<title>` — Quick decision title

**Options:**
- (none - ultra-minimal)

**Example:**
```bash
md "use TypeScript not JavaScript"
# ✓ [decisions#8] 5b289c8f
# ⚡ 92ms
```

**Setup:**
```bash
./scripts/setup-frictionless.sh
# Creates alias: md → memphis decide-fast
```

---

## Prediction Commands

### `memphis predict`

Generate predictions or learn patterns.

**Usage:**
```bash
memphis predict [options]
```

**Options:**
- `--learn` — Learn patterns from decision history
- `--since <days>` — Days to analyze (default: 30)
- `--min-confidence <n>` — Min confidence 0-1 (default: 0.6)
- `--max <n>` — Max predictions to show (default: 5)
- `--json` — Output as JSON

**Examples:**
```bash
# Learn patterns (first time or refresh)
memphis predict --learn --since 30

# Generate predictions
memphis predict

# High confidence only
memphis predict --min-confidence 0.8

# JSON output
memphis predict --json
```

**Output (Learning):**
```
📚 Learning patterns from last 30 days...

📚 Analyzing 15 decisions...
🔍 Found 4 context groups
✅ Created 1 new patterns
   Total patterns: 1
   Avg occurrences: 13.0

🔮 Analyzing current context...

🔮 PREDICTED DECISIONS

No predictions available yet.

💡 Keep making decisions to train the prediction engine!
```

**Output (Predictions):**
```
🔮 PREDICTED DECISIONS

Based on your current work (5 files, 2 commits today):

1. 🟢 [85%] Use REST architecture
   Type: technical
   Evidence: 5 similar decisions • 80% accuracy

2. 🟡 [72%] Add authentication
   Type: technical
   Evidence: 3 similar decisions

3. 🟡 [68%] Use PostgreSQL
   Type: technical
   Evidence: 4 similar decisions

📊 Stats: 3/5 patterns matched
   Avg confidence: 75%
```

---

### `memphis patterns`

Manage learned patterns.

**Usage:**
```bash
memphis patterns [action] [options]
```

**Actions:**
- `list` — List all patterns (default)
- `stats` — Show pattern statistics
- `clear` — Clear all patterns

**Options:**
- `--json` — Output as JSON

**Examples:**
```bash
# List patterns
memphis patterns list

# Show stats
memphis patterns stats

# Clear patterns
memphis patterns clear

# JSON output
memphis patterns list --json
```

**Output (List):**
```
📊 LEARNED PATTERNS (5)

1. Use TypeScript for new features
   Type: technical
   Occurrences: 12
   Confidence: 92%
   Accuracy: 87%
   Created: 2/15/2026
   Last seen: 3/2/2026

2. Use PostgreSQL for data storage
   Type: technical
   Occurrences: 8
   Confidence: 75%
   Accuracy: 80%
   Created: 2/20/2026
   Last seen: 3/1/2026
```

**Output (Stats):**
```
📊 PATTERN STATISTICS

Total patterns: 5
Average occurrences: 10.2
Average accuracy: 78%
Oldest pattern: 2/15/2026
Newest pattern: 3/2/2026
```

---

### `memphis suggest`

Check for proactive suggestions.

**Usage:**
```bash
memphis suggest [options]
```

**Options:**
- `--force` — Force check (ignore 30-minute cooldown)
- `--channel <name>` — Notification channel: `terminal` | `desktop` | `slack` | `discord` (default: `terminal`)

**Examples:**
```bash
# Check (respects cooldown)
memphis suggest

# Force check
memphis suggest --force

# Desktop notification
memphis suggest --channel desktop
```

**Output:**
```
🔮 PROACTIVE SUGGESTIONS

Based on your current context:

1. 🟢 [85%] Use TypeScript for new features
   Evidence: 12 similar decisions • 87% accuracy

2. 🟡 [72%] Add unit tests
   Evidence: 8 similar decisions • 75% accuracy

Actions:
  [a] Accept first suggestion
  [n] Reject all
  [c] Custom decision
  [i] Ignore for now
```

---

### `memphis accuracy`

View prediction accuracy tracking.

**Usage:**
```bash
memphis accuracy [action] [options]
```

**Actions:**
- (none) — Show stats
- `clear` — Clear accuracy data

**Options:**
- `--json` — Output as JSON

**Examples:**
```bash
# View stats
memphis accuracy

# Clear data
memphis accuracy clear

# JSON output
memphis accuracy --json
```

**Output:**
```
📊 ACCURACY TRACKING

Total events: 45
Overall accuracy: 78%
Patterns tracked: 5

📈 Improving: 2 | 📉 Declining: 1

🏆 TOP PERFORMERS:
1. [87%] Use TypeScript
   12 predictions, improving ⬆️
   
2. [80%] Use PostgreSQL
   8 predictions, stable ➡️

⚠️  NEEDS IMPROVEMENT:
1. [45%] Use REST API
   5 predictions, declining ⬇️
```

---

## Memory Commands

### `memphis journal`

Record a journal entry.

**Usage:**
```bash
memphis journal <text> [options]
```

**Arguments:**
- `<text>` — Journal entry text

**Options:**
- `--tags <tags>` — Tags (comma-separated)

**Examples:**
```bash
# Basic
memphis journal "Fixed critical bug in auth flow"

# With tags
memphis journal "Discovered pattern in user behavior" \
  --tags insight,analytics
```

**Output:**
```
✓ [journal#456] abc123def456...
ℹ Entry saved to journal chain
```

---

### `memphis ask`

Ask a question to your memory.

**Usage:**
```bash
memphis ask <question>
```

**Arguments:**
- `<question>` — Question to ask

**Examples:**
```bash
memphis ask "Why did I choose PostgreSQL?"
memphis ask "What did I learn last week?"
memphis ask "What decisions did I make about the API?"
```

**Output:**
```
Searching memory for: "Why did I choose PostgreSQL?"

Found 3 relevant entries:

1. [decision#12] Database choice
   Chosen: PostgreSQL
   Reasoning: Better JSON support and performance
   Date: 2026-03-01

2. [journal#340] PostgreSQL performance insights
   "Discovered that JSON queries are 3x faster than MongoDB..."
   Date: 2026-02-28
```

---

### `memphis recall`

Search memory semantically.

**Usage:**
```bash
memphis recall <keywords> [options]
```

**Arguments:**
- `<keywords>` — Search keywords

**Options:**
- `--chain <name>` — Search specific chain
- `--limit <n>` — Limit results (default: 10)

**Examples:**
```bash
# Search all
memphis recall "API design"

# Specific chain
memphis recall "PostgreSQL" --chain decisions

# Limit results
memphis recall "bug" --limit 5
```

---

## System Commands

### `memphis status`

Show system status.

**Usage:**
```bash
memphis status
```

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║              Memphis System Status 🧠                    ║
╚═══════════════════════════════════════════════════════════╝

Provider: ollama
Model: qwen2.5-coder:3b
Chains: 15 (889 blocks total)
  • journal: 436 blocks
  • decisions: 14 blocks
  • ask: 439 blocks

Embeddings:
  • Total: 889 vectors
  • Cache hit rate: 92%

Intelligence:
  • Accuracy: 77.2%
  • Patterns: 366
  • Feedback events: 54

Uptime: 2 days, 14 hours
```

---

### `memphis doctor`

Run health checks.

**Usage:**
```bash
memphis doctor
```

**Checks:**
1. Node.js version
2. Config file
3. Provider config
4. Model config
5. Ollama detection
6. Provider connectivity
7. Embeddings model
8. Memory chains
9. API keys

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║              Memphis Doctor — Health Check 🏥           ║
╚═══════════════════════════════════════════════════════════╝

✓ Node.js: v25.6.1 (supported)
✓ Config File: Found at ~/.memphis/config.yaml
✓ Provider Config: Provider configured
✓ Model Config: Model specified
✓ Ollama: Running (15 models)
✓ Provider Connection: Ollama API responding
✓ Embeddings: nomic-embed-text
✓ Memory Chains: 889 blocks stored
✓ API Keys: 1 found: OpenAI

✓ All systems healthy! 9/9 checks passed
```

---

### `memphis tui`

Launch interactive TUI dashboard.

**Usage:**
```bash
memphis tui [options]
```

**Options:**
- `--screen <name>` — Start on specific screen

**Screens:**
- Dashboard (default)
- Journal
- Decisions
- Ask
- Intelligence
- Inferred Decisions

**Keyboard Shortcuts:**
- `Ctrl+J` — Quick journal
- `Ctrl+R` — Search/Recall
- `Ctrl+S` — Toggle sidebar
- `Ctrl+T` — Toggle theme
- `q` — Quit

---

### `memphis init`

Initialize Memphis (interactive setup).

**Usage:**
```bash
memphis init
```

**Prompts:**
1. Provider selection (Ollama/OpenAI/etc)
2. Model selection
3. Chain directory
4. Workspace setup

---

## Advanced Commands

### `memphis daemon`

Manage background daemon.

**Usage:**
```bash
memphis daemon <action>
```

**Actions:**
- `start` — Start daemon
- `stop` — Stop daemon
- `status` — Check status

**Example:**
```bash
memphis daemon start
memphis daemon status
```

---

### `memphis intelligence`

Intelligence system commands.

**Usage:**
```bash
memphis intelligence <action>
```

**Actions:**
- `stats` — Show intelligence stats
- `analyze` — Analyze recent blocks

**Example:**
```bash
memphis intelligence stats
```

---

### `memphis share-sync`

Multi-agent synchronization.

**Usage:**
```bash
memphis share-sync <action>
```

**Actions:**
- `--push` — Push to IPFS
- `--pull` — Pull from IPFS

**Example:**
```bash
memphis share-sync --push
memphis share-sync --pull
```

---

### `memphis trade`

Agent trade protocol.

**Usage:**
```bash
memphis trade <action> [options]
```

**Actions:**
- `create <recipient>` — Create trade offer
- `accept <manifest>` — Accept trade
- `list` — List trade offers
- `verify <manifest>` — Verify trade

**Example:**
```bash
# Create offer
memphis trade create did:memphis:abc123 \
  --blocks journal:0-100 \
  --ttl 7

# Accept
memphis trade accept manifest.json
```

---

### `memphis vault`

Manage encrypted vault.

**Usage:**
```bash
memphis vault <action> [options]
```

**Actions:**
- `init` — Initialize vault
- `add <key> <value>` — Add secret
- `list` — List secrets
- `get <key>` — Get secret
- `delete <key>` — Delete secret
- `backup` — Generate 24-word seed
- `recover` — Recover from seed

**Options:**
- `--seed <words>` — Recovery seed phrase
- `--password-env <var>` — Password from env
- `--password-stdin` — Password from stdin

**Example:**
```bash
# Add secret
memphis vault add openai_key sk-abc123...

# Get secret
memphis vault get openai_key

# Backup
memphis vault backup
# → word1 word2 word3 ... word24

# Recover
memphis vault recover --seed "word1 word2 ... word24"
```

---

## Exit Codes

- `0` — Success
- `1` — Error
- `2` — Invalid arguments
- `130` — Interrupted (Ctrl+C)

---

## Environment Variables

- `MEMPHIS_DIR` — Data directory (default: `~/.memphis`)
- `MEMPHIS_WORKSPACE` — Workspace ID
- `MEMPHIS_PROVIDER` — Default provider
- `MEMPHIS_MODEL` — Default model

---

## Configuration

**Config file:** `~/.memphis/config.yaml`

```yaml
provider: ollama
model: qwen2.5-coder:3b
embeddings:
  backend: ollama
  model: nomic-embed-text
memory:
  path: ~/.memphis/chains
```

---

**API Version:** 2.0.0  
**Last Updated:** 2026-03-02
