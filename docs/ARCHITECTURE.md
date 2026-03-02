# Memphis Architecture

**Version:** 2.0.0  
**Date:** 2026-03-02  
**Status:** Production Ready

---

## 🏗️ Overview

Memphis implements a **4-layer cognitive architecture** with **3 cognitive models** for decision tracking, inference, and prediction.

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Interface                                         │
│  CLI • TUI • IDE Integration • Web Dashboard               │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Cognitive Engine                                  │
│  Model A (Conscious) • Model B (Inferred) • Model C (Pred)  │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Agent Runtime                                     │
│  Daemon • Watch • Git Collector • Shell Collector          │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Memory Ledger                                     │
│  Chains (journal/decisions/ask) • Embeddings • Vault       │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Memory Ledger

**Purpose:** Persistent, immutable storage with blockchain-inspired chains.

### Components

**1. Memory Chains**
```typescript
interface Chain {
  name: string;              // journal, decisions, ask
  blocks: Block[];
  index: number;             // Next block index
}

interface Block {
  index: number;
  timestamp: string;
  chain: string;
  data: BlockData;
  prev_hash: string;
  hash: string;              // SHA256
}
```

**Chain Types:**
- **journal** — Daily experiences, insights, notes
- **decisions** — Conscious decisions (Model A)
- **ask** — Q&A with memory
- **vault** — Encrypted secrets
- **share_manifest** — Multi-agent sync
- **trade** — Agent trade protocol

**2. Embeddings Store**
```typescript
interface EmbeddingStore {
  embeddings: Map<string, number[]>;  // blockId → vector
  model: string;                      // nomic-embed-text
  dimensions: number;                 // 768
}
```

**Purpose:** Semantic search over all chains.

**3. Vault**
```typescript
interface Vault {
  encrypted: Map<string, EncryptedValue>;
  seed?: string;  // 24-word recovery
}
```

**Purpose:** Encrypted storage for sensitive data (API keys, credentials).

---

## Layer 2: Agent Runtime

**Purpose:** Background agents that run continuously.

### Components

**1. Daemon**
```bash
memphis daemon start
```

**Runs:**
- Git collector (every 5 min)
- Shell collector (monitors commands)
- Event detector (file/process changes)
- Pattern relearning (daily at midnight)

**2. Watch Mode**
```bash
memphis watch <path>
```

**Monitors:**
- File changes
- Process events
- Pattern triggers

**3. Collectors**

**GitCollector:**
```typescript
class GitCollector {
  async collect(since: Date): Promise<Commit[]> {
    // Get commits since date
    // Extract metadata
    // Return structured data
  }
}
```

**ShellCollector:**
```typescript
class ShellCollector {
  async collect(): Promise<ShellEvent[]> {
    // Monitor shell history
    // Detect commands
    // Extract insights
  }
}
```

---

## Layer 3: Cognitive Engine

**Purpose:** The three cognitive models that make Memphis intelligent.

### Model A: Conscious Decisions

**Purpose:** User explicitly records decisions.

**Flow:**
```
User Input → Decision Parser → Block Creation → Chain Append
```

**Components:**
```typescript
class DecisionCapture {
  async capture(title: string, chosen: string, opts: DecisionOptions): Promise<Block> {
    // 1. Parse decision
    const decision = createDecisionV1({
      title,
      options: opts.options,
      chosen,
      reasoning: opts.why,
      scope: opts.scope,
      mode: 'conscious',
      confidence: 1.0,
    });

    // 2. Create block
    const block = await store.appendBlock('decisions', {
      type: 'decision',
      content: JSON.stringify(decision),
      tags: ['decision', decision.mode, decision.scope],
    });

    return block;
  }
}
```

**Lifecycle:**
```bash
# Create
memphis decide "Use TypeScript" "TypeScript"

# Revise (creates new, deprecates old)
memphis revise <id> "Use JavaScript" --reasoning "Easier hiring"

# Contradict (marks as wrong)
memphis contradict <id> --evidence "Caused performance issues"

# Reinforce (confirms as still valid)
memphis reinforce <id> --evidence "Still the best choice after 6 months"
```

---

### Model B: Inferred Decisions

**Purpose:** Agent detects decisions from git history.

**Flow:**
```
Git Commits → Pattern Matcher → Decision Extraction → User Confirmation → Chain
```

**Components:**

**1. Inference Engine** (`src/decision/inference-engine.ts`)
```typescript
class InferenceEngine {
  async infer(sinceDays: number): Promise<InferredDecision[]> {
    // 1. Get commits
    const commits = await this.getCommits(sinceDays);

    // 2. Match patterns
    const decisions = [];
    for (const commit of commits) {
      const matches = this.matchPatterns(commit);
      decisions.push(...matches);
    }

    // 3. Score confidence
    return decisions.map(d => ({
      ...d,
      confidence: this.calculateConfidence(d),
    }));
  }
}
```

**2. Pattern Database** (`src/decision/patterns.ts`)
```typescript
const DECISION_PATTERNS = [
  // Technology choices
  {
    pattern: /migrated from (\w+) to (\w+)/gi,
    type: 'technical',
    category: 'technology',
    template: 'Migrated from {1} to {2}',
  },
  
  // Architecture
  {
    pattern: /refactored (\w+) to (\w+)/gi,
    type: 'technical',
    category: 'refactoring',
    template: 'Refactored {1} to {2}',
  },
  
  // ... 18 more patterns
];
```

**3. Proactive Prompts** (`src/decision/proactive-prompter.ts`)
```typescript
class ProactivePrompter {
  async prompt(decisions: InferredDecision[]): Promise<void> {
    for (const decision of decisions) {
      // Show decision
      console.log(this.formatDecision(decision));

      // Ask user
      const answer = await this.promptUser();

      if (answer === 'y') {
        // Save as conscious decision
        await this.saveAsConscious(decision);
      }
    }
  }
}
```

---

### Model C: Predictive Decisions

**Purpose:** Agent predicts decisions before user makes them.

**Flow:**
```
Decision History → Pattern Learning → Context Analysis → Prediction Generation
```

**Components:**

**1. Pattern Learner** (`src/decision/pattern-learner.ts`)
```typescript
class PatternLearner {
  async learnFromHistory(sinceDays: number): Promise<DecisionPattern[]> {
    // 1. Get decisions
    const decisions = await this.getRecentDecisions(sinceDays);

    // 2. Extract contexts
    const contexts = decisions.map(d => this.extractContext(d));

    // 3. Group by similarity
    const groups = this.groupBySimilarContext(contexts);

    // 4. Create patterns
    const patterns = [];
    for (const [context, group] of groups) {
      if (group.length >= 3) {  // Min occurrences
        patterns.push(this.createPattern(context, group));
      }
    }

    return patterns;
  }
}
```

**2. Context Analyzer** (`src/decision/context-analyzer.ts`)
```typescript
class ContextAnalyzer {
  async analyzeCurrentContext(): Promise<CurrentContext> {
    return {
      activeFiles: this.getActiveFiles(60),     // Last 1h
      branch: this.getCurrentBranch(),
      recentCommits: this.getRecentCommits(24), // Last 24h
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
    };
  }
}
```

**3. Context Matcher** (`src/decision/context-matcher.ts`)
```typescript
class ContextMatcher {
  matchPatterns(
    patterns: DecisionPattern[],
    current: CurrentContext
  ): ContextMatch[] {
    const matches = [];

    for (const pattern of patterns) {
      const score = this.calculateMatchScore(pattern, current);
      
      if (score >= 0.5) {
        matches.push({ pattern, score });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  calculateMatchScore(pattern: DecisionPattern, current: CurrentContext): number {
    // Weighted scoring:
    // Activity: 30%
    // Files: 25%
    // Time: 15%
    // Branch: 15%
    // Graph: 15%
    
    return (
      this.matchActivity(pattern, current) * 0.3 +
      this.matchFiles(pattern, current) * 0.25 +
      this.matchTime(pattern, current) * 0.15 +
      this.matchBranch(pattern, current) * 0.15 +
      this.matchGraph(pattern, current) * 0.15
    );
  }
}
```

**4. Prediction Engine** (`src/decision/prediction-engine.ts`)
```typescript
class PredictionEngine {
  async predict(): Promise<Prediction[]> {
    // 1. Get current context
    const context = await this.analyzer.analyzeCurrentContext();

    // 2. Get patterns
    const patterns = this.learner.getPatterns();

    // 3. Match patterns
    const matches = this.matcher.matchPatterns(patterns, context);

    // 4. Score predictions
    const predictions = matches.map(match => ({
      title: match.pattern.prediction.title,
      confidence: this.calculateConfidence(match),
      evidence: match.pattern.prediction.evidence,
    }));

    // 5. Filter and diversify
    return predictions
      .filter(p => p.confidence >= 0.6)
      .slice(0, 5);
  }
}
```

**5. Proactive Suggester** (`src/decision/proactive-suggester.ts`)
```typescript
class ProactiveSuggester {
  async checkAndSuggest(): Promise<Suggestion[] | null> {
    // 1. Check cooldown (30 min)
    if (!this.canSuggest()) return null;

    // 2. Generate predictions
    const predictions = await this.engine.predict();

    // 3. Filter by confidence (70%)
    const highConfidence = predictions.filter(p => p.confidence >= 0.7);

    if (highConfidence.length === 0) return null;

    // 4. Send notifications
    await this.sendNotifications(highConfidence);

    return highConfidence;
  }
}
```

**6. Accuracy Tracker** (`src/decision/accuracy-tracker.ts`)
```typescript
class AccuracyTracker {
  record(event: AccuracyEvent): void {
    // 1. Add to history
    this.events.push(event);

    // 2. Update pattern accuracy
    const accuracy = this.getPatternAccuracy(event.patternId);
    accuracy.totalPredictions++;
    if (event.accepted) accuracy.accepted++;

    // 3. Calculate accuracy
    accuracy.acceptanceRate = accuracy.accepted / accuracy.totalPredictions;

    // 4. Detect trend
    accuracy.trend = this.detectTrend(accuracy);

    // 5. Save
    this.save();
  }
}
```

---

## Layer 4: Interface

**Purpose:** User interfaces for interacting with Memphis.

### Components

**1. CLI** (`src/cli/index.ts`)
```bash
memphis <command> [options]
```

**2. TUI** (`src/tui/index.ts`)
```bash
memphis tui
```

**Features:**
- Interactive dashboard
- Keyboard shortcuts
- Real-time updates
- Visual decision flow

**3. IDE Integration** (Planned)
- VS Code extension
- Inline decision capture
- Context-aware suggestions

---

## Data Flow

### Decision Capture Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────▶│  Parser  │────▶│ Decision │
│  Input   │     │          │     │  Object  │
└──────────┘     └──────────┘     └──────────┘
                                        │
       ┌────────────────────────────────┘
       │
       ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Create  │────▶│  Append  │────▶│  Chain   │
│  Block   │     │  Block   │     │  Updated │
└──────────┘     └──────────┘     └──────────┘
```

### Inference Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   Git    │────▶│ Pattern  │────▶| Inferred │
│ Commits  │     │  Matcher │     │ Decision │
└──────────┘     └──────────┘     └──────────┘
                                        │
       ┌────────────────────────────────┘
       │
       ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Prompt  │────▶│   User   │────▶│  Save as │
│   User   │     │ Response │     │Conscious │
└──────────┘     └──────────┘     └──────────┘
```

### Prediction Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Decision │────▶│ Pattern  │────▶│ Pattern  │
│ History  │     │ Learner  │     │ Storage  │
└──────────┘     └──────────┘     └──────────┘
                                        │
       ┌────────────────────────────────┘
       │
       ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Current  │────▶│ Context  │────▶│Prediction│
│ Context  │     │ Matcher  │     │ Engine   │
└──────────┘     └──────────┘     └──────────┘
                                        │
       ┌────────────────────────────────┘
       │
       ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│Predictions│────▶│ Proactive│────▶│  User    │
│(filtered) │     │Suggester │     │Notified  │
└──────────┘     └──────────┘     └──────────┘
```

---

## Storage

### Directory Structure

```
~/.memphis/
├── chains/
│   ├── journal/
│   │   ├── 000001.json
│   │   ├── 000002.json
│   │   └── ...
│   ├── decisions/
│   │   ├── 000001.json
│   │   └── ...
│   └── ask/
│       └── ...
├── embeddings/
│   ├── journal.json
│   ├── decisions.json
│   └── ...
├── patterns.json           # Model C patterns
├── accuracy.json           # Accuracy tracking
├── intelligence/           # Learning data
├── config.yaml
└── vault/
    └── encrypted.json
```

### File Formats

**Block File** (`.json`)
```json
{
  "index": 42,
  "timestamp": "2026-03-02T17:00:00Z",
  "chain": "decisions",
  "data": {
    "type": "decision",
    "content": "{\"title\":\"Use TypeScript\",\"chosen\":\"TypeScript\"}",
    "tags": ["decision", "conscious", "project"]
  },
  "prev_hash": "abc123...",
  "hash": "def456..."
}
```

**Patterns File** (`patterns.json`)
```json
{
  "pattern_123": {
    "id": "pattern_123",
    "context": {
      "activity": ["api", "backend"],
      "timeOfDay": 14
    },
    "prediction": {
      "title": "Use REST architecture",
      "confidence": 0.85
    },
    "occurrences": 12,
    "accuracy": 0.80
  }
}
```

---

## Performance

### Benchmarks (v2.0.0)

| Operation | Target | Actual | Performance |
|-----------|--------|--------|-------------|
| Block Append | <100ms | 92ms | 8% faster |
| Inference (30d) | <1000ms | 641ms | 36% faster |
| Pattern Learning | <2000ms | 1049ms | 47% faster |
| Prediction Gen | <1000ms | 660ms | 34% faster |
| Context Analysis | <1000ms | 610ms | 39% faster |

### Optimization Techniques

**1. Caching**
- Context cache (5-min TTL)
- Pattern cache (in-memory)
- Embeddings cache (90%+ hit rate)

**2. Lazy Loading**
- Chains loaded on-demand
- Embeddings loaded async
- Patterns loaded at startup

**3. Batch Operations**
- Bulk embedding generation
- Batch pattern learning
- Bulk chain operations

---

## Security

### Chain Integrity

**SHA256 Hashing:**
```typescript
function calculateHash(block: Block): string {
  const data = `${block.index}${block.timestamp}${JSON.stringify(block.data)}${block.prev_hash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

**Verification:**
```bash
memphis verify
```

### Encryption

**Vault:**
- AES-256-GCM encryption
- 24-word seed recovery
- Key derivation (PBKDF2)

**Sync:**
- End-to-end encryption
- IPFS encrypted pins
- Secure trade protocol

---

## Extensibility

### Adding New Chains

```typescript
// 1. Define chain type
declare module './chain/types' {
  interface BlockData {
    type: 'my_new_type' | ...
  }
}

// 2. Add command
program
  .command('my-command')
  .action(async () => {
    await store.appendBlock('my_chain', {
      type: 'my_new_type',
      content: '...',
      tags: ['custom'],
    });
  });
```

### Adding New Collectors

```typescript
class MyCollector {
  async collect(): Promise<any[]> {
    // Collect data
    return data;
  }
}

// Register in daemon
daemon.registerCollector(new MyCollector());
```

---

## Deployment

### Local Development

```bash
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install
npm run build
node dist/cli/index.js init
```

### Production

```bash
# Build
npm run build

# Test
bash scripts/test-model-c.sh

# Run
node dist/cli/index.js daemon start
```

### Docker (Planned)

```bash
docker pull memphis/cognitive-engine
docker run -v ~/.memphis:/data memphis/cognitive-engine
```

---

## Monitoring

### Health Checks

```bash
memphis doctor

# ╔═══════════════════════════════════════════════════════════╗
# ║              Memphis Doctor — Health Check 🏥           ║
# ╚═══════════════════════════════════════════════════════════╝
#
# ✓ Node.js: v25.6.1 (supported)
# ✓ Config File: Found at ~/.memphis/config.yaml
# ✓ Provider Config: Provider configured
# ✓ Model Config: Model specified
# ✓ Ollama: Running (15 models)
# ✓ Provider Connection: Ollama API responding
# ✓ Embeddings: nomic-embed-text
# ✓ Memory Chains: 889 blocks stored
# ✓ API Keys: 1 found: OpenAI
#
# ✓ All systems healthy! 9/9 checks passed
```

### Logs

```bash
tail -f ~/.memphis/daemon.log
```

---

## Future Architecture

### Model D: Collective Decisions (Planned)

```
Agent A ←──→ Agent B ←──→ Agent C
   │            │            │
   └────────────┴────────────┘
                │
                ▼
        Collective Memory
```

### Model E: Meta-Cognitive (Planned)

```
Decision → Reflection → Learning → Strategy Update
```

---

**Architecture Version:** 2.0.0  
**Last Updated:** 2026-03-02  
**Status:** Production Ready
