# Memphis Vision Implementation Roadmap 🧠

**Based on:** [VISION.md](./VISION.md) — Oficjalna wizja projektu
**Last Updated:** 2026-03-02
**Current Version:** v1.7.6 (Event Detection Complete)

---

## 🎯 VISION RECAP

```
┌─────────────────────────────────────────────────────────┐
│  Memphis = lokalny agent + offline LLM + memory chain   │
│                                                         │
│  SERCE: Pamięć Decyzji (Cognitive Engine)              │
│  CORE: memphis decide                                   │
│  ARCHITEKTURA: 4 warstwy (Memory → LLM → Agent → UI)   │
└─────────────────────────────────────────────────────────┘
```

**Kluczowa zmiana:**
- ❌ NIE: "ładniejszy notatnik" / CLI showcase / Enterprise
- ✅ TAK: Cognitive Engine (decisions + inference + reflection)

---

## 📊 CO MAMY (v1.7.6)

### ✅ ETAP 1: Memory Ledger (COMPLETE)
- ✅ Append-only chains (journal, ask, decisions, share)
- ✅ SHA256 hash linking
- ✅ Tamper detection (`memphis verify`)
- ✅ Decision chain (`memphis decide`)
- ✅ Vaults (AES-256-GCM)
- ✅ 889+ blocks stored

### ✅ ETAP 3: Offline LLM (COMPLETE)
- ✅ Ollama integration
- ✅ llama3.2:1b fallback
- ✅ Provider abstraction (OpenAI, ZAI, MiniMax, Ollama)
- ✅ Fallback chain
- ✅ Offline mode (`memphis offline`)

### 🚧 ETAP 2: Agent Runtime (IN PROGRESS)
- ✅ Daemon (`memphis daemon start`)
- ✅ Git collector
- ✅ Shell collector
- ✅ Event Detection (process/file/pattern)
- ✅ Time-based suggestions (6h inactivity)
- ✅ Pattern detection (error spikes, activity bursts)
- ❌ Inferred decisions (Model B)
- ❌ Decision inference from commits
- ❌ Proactive "save decision?" prompts

### 🚧 ETAP 4: Interface (IN PROGRESS)
- ✅ CLI (35+ commands)
- ✅ TUI (dashboard, journal, ask, decisions, graph)
- ✅ Search + autocomplete (Phase 3)
- ✅ Keyboard shortcuts (Phase 4)
- ✅ Journal sidebar (Phase 5)
- ❌ Frictionless capture (<2 sec)
- ❌ Decision-focused UX
- ❌ Reflection prompts

---

## 🗺️ ROADMAP: OD TERAZ DO VISION

### WEEK 1-2: Model B — Inferred Decisions 🎯

**Cel:** Agent wykrywa decyzje i proponuje zapis

**Tasks:**

#### 1. Decision Inference Engine (3 days)
```typescript
// src/decision/inference-engine.ts
interface InferredDecision {
  title: string;
  confidence: number;  // 0.0-1.0
  evidence: string[];  // commits, actions, patterns
  type: "strategic" | "tactical" | "technical";
}

class DecisionInferenceEngine {
  // Analiza commitów
  analyzeCommitPattern(commits: Commit[]): InferredDecision[] {
    // "refactor: X → Y" → direction change
    // "feat: add X" → new feature decision
    // "fix: revert X" → abandoned approach
  }
  
  // Analiza branchy
  analyzeBranchPattern(branches: Branch[]): InferredDecision[] {
    // Deleted branch → abandoned direction
    // Merged branch → chosen approach
  }
  
  // Analiza plików
  analyzeFileChanges(files: FileChange[]): InferredDecision[] {
    // Config changes → architectural decisions
    // Dependency updates → technology choices
  }
}
```

**Implementation:**
- `src/decision/inference-engine.ts` (new)
- `src/decision/patterns.ts` (new)
- `tests/decision/inference.test.ts` (new)

**Success:**
- ✅ Detects 5+ inferred decisions per day
- ✅ Confidence scoring works
- ✅ Evidence linking works

#### 2. Proactive Prompt System (2 days)
```typescript
// src/agents/proactive-prompter.ts
class ProactivePrompter {
  // W daemonie:
  async checkForDecisions() {
    const inferred = await inferenceEngine.detect();
    
    for (const decision of inferred) {
      if (decision.confidence > 0.5) {
        // Pokaż prompt
        await this.promptUser(decision);
      }
    }
  }
  
  async promptUser(decision: InferredDecision) {
    console.log(`
💡 possible_decision detected:
   "${decision.title}"
   confidence: ${decision.confidence}
   evidence: ${decision.evidence.join(', ')}
   
   save? [y/n/e=edit]
    `);
    
    // User input → save as conscious decision
  }
}
```

**Implementation:**
- `src/agents/proactive-prompter.ts` (new)
- Integrate with `src/daemon/daemon.ts`
- Add to TUI suggestions widget

**Success:**
- ✅ Prompts appear in daemon
- ✅ User can accept/reject
- ✅ Saved as conscious decisions

#### 3. Decision Lifecycle (2 days)
```typescript
// src/decision/lifecycle.ts
class DecisionLifecycle {
  // Track state changes
  revise(decisionId: string, reasoning: string): Block {
    // Create new block with supersedes
    return {
      type: "decision_revision",
      supersedes: decisionId,
      reasoning,
      status: "revised"
    };
  }
  
  contradict(decisionId: string, evidence: string): Block {
    // Mark old decision as contradicted
    return {
      type: "decision_contradiction",
      contradicts: decisionId,
      evidence,
      status: "contradicted"
    };
  }
  
  reinforce(decisionId: string, evidence: string): Block {
    // Strengthen decision
    return {
      type: "decision_reinforcement",
      reinforces: decisionId,
      evidence,
      status: "reinforced"
    };
  }
}
```

**Implementation:**
- `src/decision/lifecycle.ts` (new)
- CLI commands: `memphis revise <id>`, `memphis contradict <id>`
- Tests

**Success:**
- ✅ Lifecycle tracking works
- ✅ All states supported
- ✅ Chain integrity maintained

---

### WEEK 3-4: Frictionless Capture ⚡

**Cel:** Zapis decyzji w <2 sekundy

**Tasks:**

#### 1. Ultra-fast `memphis decide` (2 days)
```typescript
// src/cli/commands/decide-fast.ts
// Target: <100ms (zero LLM)

async function fastDecide(title: string, reasoning?: string) {
  const start = Date.now();
  
  // 1. Create block (no LLM, no network)
  const block = createDecisionBlock({
    title,
    reasoning: reasoning || "",
    mode: "conscious",
    timestamp: new Date().toISOString()
  });
  
  // 2. Append to chain
  await appendBlock("decisions", block);
  
  // 3. Done
  const elapsed = Date.now() - start;
  console.log(`✓ Decision saved (${elapsed}ms)`);
}
```

**Implementation:**
- Optimize `src/cli/commands/decide.ts`
- Remove unnecessary async operations
- Benchmark target: <100ms

**Success:**
- ✅ <100ms execution time
- ✅ Works offline (no LLM needed)
- ✅ Zero friction

#### 2. Quick Capture Shortcuts (2 days)
```bash
# Option 1: Alias
alias md='memphis decide'

# Option 2: Global hotkey (desktop)
# Ctrl+Shift+D → opens input dialog

# Option 3: Voice (mobile)
# "Memphis: decided to use TypeScript"
```

**Implementation:**
- Add bash/zsh aliases to docs
- Desktop: Electron app with global hotkey
- Mobile: React Native voice integration

**Success:**
- ✅ <2 sec from thought to saved
- ✅ Multiple capture methods
- ✅ Works everywhere

#### 3. Smart Defaults (1 day)
```typescript
// Auto-fill from context
async function decideWithDefaults(title: string) {
  const context = {
    projectPath: process.cwd(),
    gitRoot: await getGitRoot(),
    branch: await getCurrentBranch(),
    lastCommits: await getLastCommits(3),
    hostname: os.hostname()
  };
  
  return fastDecide(title, "", context);
}
```

**Success:**
- ✅ Context auto-filled
- ✅ Rich metadata without user input
- ✅ Better recall later

---

### WEEK 5-6: Reflection AI 🪞

**Cel:** Agent pyta Ciebie, nie odwrotnie

**Tasks:**

#### 1. Daily Reflection Prompts (3 days)
```typescript
// src/agents/reflection-agent.ts
class ReflectionAgent {
  async generateDailyPrompt(): Promise<string> {
    const today = await getTodayBlocks();
    const decisions = today.filter(b => b.type === "decision");
    const problems = today.filter(b => b.tags?.includes("problem"));
    
    if (decisions.length > 0) {
      return `Reflect on today's decisions:
      
      ${decisions.map(d => `• ${d.title}`).join('\n')}
      
      Any insights to add?`;
    }
    
    if (problems.length > 0) {
      return `You encountered ${problems.length} problems today.
      What solutions worked?`;
    }
    
    return "What's one thing you learned today?";
  }
  
  async promptUser() {
    const prompt = await this.generateDailyPrompt();
    
    // Show at end of day (configurable)
    console.log(`\n🪞 Daily Reflection:\n${prompt}\n`);
    
    // User input → save as reflection block
  }
}
```

**Implementation:**
- `src/agents/reflection-agent.ts` (new)
- Integrate with daemon
- Config: time of day, frequency

**Success:**
- ✅ Prompts appear daily
- ✅ Context-aware (uses today's activity)
- ✅ User can respond or skip

#### 2. Weekly Insights (2 days)
```typescript
// src/agents/insights-generator.ts
class InsightsGenerator {
  async generateWeeklyInsights(): Promise<Insight[]> {
    const week = await getWeekBlocks();
    
    // 1. Decision patterns
    const decisions = extractDecisions(week);
    const patterns = findPatterns(decisions);
    
    // 2. Contradictions detected
    const contradictions = findContradictions(week);
    
    // 3. Reinforced beliefs
    const reinforced = findReinforced(week);
    
    // 4. Abandoned directions
    const abandoned = findAbandoned(week);
    
    return [
      ...patterns.map(p => ({
        type: "pattern",
        message: `You tend to decide on ${p.topic} frequently`,
        evidence: p.evidence
      })),
      ...contradictions.map(c => ({
        type: "contradiction",
        message: `You contradicted "${c.title}" with "${c.newTitle}"`,
        evidence: c.evidence
      })),
      // ...
    ];
  }
}
```

**Implementation:**
- `src/agents/insights-generator.ts` (new)
- `memphis insights` command
- Weekly cron in daemon

**Success:**
- ✅ Weekly insights delivered
- ✅ Actionable findings
- ✅ User discovers patterns they didn't see

#### 3. Ask with Decision Context (1 day)
```typescript
// Enhance memphis ask to prioritize decisions
async function askWithDecisionContext(question: string) {
  // 1. Find relevant decisions
  const decisions = await searchDecisions(question);
  
  // 2. Check lifecycle (are they still active?)
  const active = filterActiveDecisions(decisions);
  
  // 3. Build context with decision reasoning
  const context = buildContext(active);
  
  // 4. Ask LLM with rich context
  return askLLM(question, context);
}
```

**Success:**
- ✅ Ask uses decisions as primary context
- ✅ Shows reasoning + evidence
- ✅ Understands lifecycle (active vs contradicted)

---

### WEEK 7-8: Integration & Polish ✨

**Cel:** Wszystko działa razem seamlessly

**Tasks:**

#### 1. Decision Dashboard in TUI (3 days)
```
┌─────────────────────────────────────────────────────────┐
│           DECISION DASHBOARD (TUI Screen [D])            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ACTIVE DECISIONS (12)                                   │
│  ┌──────────────────────────────────────────────┐       │
│  │ • Offline-first architecture                 │       │
│  │   reinforced (3x), last: 2 days ago          │       │
│  │                                               │       │
│  │ • Use TypeScript over JavaScript             │       │
│  │   reinforced (7x), last: 1 week ago          │       │
│  │                                               │       │
│  │ • Focus on personal brain (not enterprise)   │       │
│  │   conscious, created: 3 weeks ago            │       │
│  └──────────────────────────────────────────────┘       │
│                                                           │
│  RECENT CONTRADICTIONS (2)                               │
│  ┌──────────────────────────────────────────────┐       │
│  │ ⚠ "Use REST API" contradicted by "GraphQL"   │       │
│  │   evidence: refactor commit abc123            │       │
│  └──────────────────────────────────────────────┘       │
│                                                           │
│  INFERRED (AWAITING CONFIRMATION) (3)                    │
│  ┌──────────────────────────────────────────────┐       │
│  │ 💡 "Shift from tests to types" (62%)         │       │
│  │ 💡 "Adopt pnpm over npm" (48%)               │       │
│  └──────────────────────────────────────────────┘       │
│                                                           │
│  [a] accept inferred  [r] view reasoning  [q] quit      │
└─────────────────────────────────────────────────────────┘
```

**Success:**
- ✅ Dashboard shows all decisions
- ✅ Lifecycle states visible
- ✅ Inferred decisions actionable
- ✅ <500ms load time

#### 2. Command Integration (2 days)
```bash
# All decision-related commands work together:

# Model A: Conscious
memphis decide "Use GraphQL"
memphis decide "Focus on personal brain" -r "Vision alignment"

# Model B: Inferred
memphis daemon start  # → detects decisions
# → prompts: "save? [y/n]"
memphis revise <id> -r "New evidence"
memphis contradict <id> -r "Proven wrong"

# Reflection
memphis reflect --daily   # → prompts user
memphis insights          # → weekly patterns

# Recall
memphis ask "why did we choose GraphQL?"
# → Returns decision + reasoning + evidence
```

**Success:**
- ✅ All commands tested
- ✅ Integration tests pass
- ✅ User documentation updated

#### 3. Performance Optimization (1 day)
```
Target:
- memphis decide: <100ms
- memphis ask (with decisions): <2s
- TUI dashboard load: <500ms
- Daemon event loop: <50ms

Benchmark:
- Profile hot paths
- Optimize slow operations
- Add caching where needed
```

**Success:**
- ✅ All targets met
- ✅ Benchmarks documented
- ✅ No regressions

#### 4. Documentation & Testing (2 days)
- [ ] Update README with decision focus
- [ ] Create DECISION-GUIDE.md
- [ ] Add examples for Model A+B
- [ ] Write integration tests (10+ scenarios)
- [ ] User testing with 3 people
- [ ] Collect feedback
- [ ] Iterate

**Success:**
- ✅ Docs complete
- ✅ Tests passing
- ✅ 3 users tested
- ✅ Feedback incorporated

---

## 📊 SUCCESS METRICS

### Week 1-2: Model B
- ✅ 5+ inferred decisions detected/day
- ✅ 80% acceptance rate for high-confidence prompts
- ✅ Lifecycle tracking works (all 4 states)

### Week 3-4: Frictionless Capture
- ✅ `memphis decide` <100ms
- ✅ <2 sec from thought to saved
- ✅ 3+ capture methods (alias, hotkey, voice)

### Week 5-6: Reflection AI
- ✅ Daily prompts appear (end of day)
- ✅ 50% response rate
- ✅ Weekly insights actionable

### Week 7-8: Integration
- ✅ Decision dashboard in TUI
- ✅ All commands work together
- ✅ Performance targets met
- ✅ 3 users tested successfully

---

## 🚀 RELEASE PLAN

### v1.8.0 — Decision Engine (Week 2)
**Theme:** Model B — Inferred Decisions

**Features:**
- ✅ Decision inference from commits
- ✅ Proactive prompts in daemon
- ✅ Decision lifecycle (revise/contradict/reinforce)

**Release Notes:**
> "Memphis now detects your decisions automatically"

### v1.9.0 — Frictionless Capture (Week 4)
**Theme:** Ultra-fast decision logging

**Features:**
- ✅ `memphis decide` <100ms
- ✅ Global hotkey (desktop)
- ✅ Smart context auto-fill

**Release Notes:**
> "Capture decisions in under 2 seconds"

### v2.0.0 — Cognitive Engine (Week 6)
**Theme:** Reflection AI

**Features:**
- ✅ Daily reflection prompts
- ✅ Weekly insights generator
- ✅ Ask with decision context

**Release Notes:**
> "Memphis helps you reflect on your decisions"

### v2.1.0 — Complete System (Week 8)
**Theme:** Integration & Polish

**Features:**
- ✅ Decision dashboard
- ✅ Full command integration
- ✅ Performance optimized
- ✅ Documentation complete

**Release Notes:**
> "Memphis is now a complete cognitive engine"

---

## 🎯 ALIGNMENT WITH VISION

### ✅ Co robimy (zgodnie z VISION)

| Vision Item | Implementation | Status |
|-------------|----------------|--------|
| **Memory Ledger** | Chains + SHA256 | ✅ Done |
| **Agent Runtime** | Daemon + Event Detection | 🚧 In Progress |
| **Offline LLM** | Ollama + Fallback | ✅ Done |
| **Interface** | CLI + TUI | 🚧 In Progress |
| **Decision Engine** | Model A+B | 📅 Week 1-2 |
| **Frictionless Capture** | <100ms decide | 📅 Week 3-4 |
| **Reflection AI** | Prompts + Insights | 📅 Week 5-6 |

### ❌ Co NIE robimy (zgodnie z VISION)

| Vision Non-Priority | Why Avoiding |
|---------------------|--------------|
| TUI jako UI showcase | Focus on decisions, not UI |
| CLI jako produkt | CLI is tool, not product |
| Multi-agent integracje | Single-user cognitive engine |
| Enterprise features | Personal brain focus |

---

## 🔄 FEEDBACK LOOPS

### Week 1-2
- Test Model B detection accuracy
- Measure acceptance rate
- Iterate confidence thresholds

### Week 3-4
- Time capture in real usage
- Identify friction points
- Optimize hot paths

### Week 5-6
- Track reflection response rate
- Measure insight usefulness
- Adjust prompt frequency

### Week 7-8
- User testing with 3 people
- Collect NPS scores
- Plan v2.2 improvements

---

## 📚 RESOURCES

**Vision:**
- [VISION.md](./VISION.md) — Oficjalna wizja
- [VISION.md](VISION.md) — Visual + narrative roadmap context

**Current State:**
- [CHANGELOG.md](../CHANGELOG.md) — v1.7.3-v1.7.6
- [CURRENT_FEATURES.md](../CURRENT_FEATURES.md) — Inventory

**Technical:**
- [DECISION_SCHEMA.md](./DECISION_SCHEMA.md) — Decision block format
- [NEXUS.md](./NEXUS.md) — Architecture
- [WORKFLOWS.md](./WORKFLOWS.md) — Usage examples

---

## 🎯 NEXT ACTIONS (THIS WEEK)

### Monday-Tuesday: Model B Foundation
- [ ] Create `src/decision/inference-engine.ts`
- [ ] Implement commit pattern analysis
- [ ] Write tests for inference engine
- [ ] Benchmark inference speed

### Wednesday-Thursday: Proactive Prompts
- [ ] Create `src/agents/proactive-prompter.ts`
- [ ] Integrate with daemon
- [ ] Add to TUI suggestions widget
- [ ] Test user interaction flow

### Friday: Decision Lifecycle
- [ ] Create `src/decision/lifecycle.ts`
- [ ] Add CLI commands (`memphis revise`, `memphis contradict`)
- [ ] Write lifecycle tests
- [ ] Update docs

---

**Status:** 🚀 READY TO START
**First Milestone:** v1.8.0 — Decision Engine (Week 2)
**Vision Alignment:** ✅ 100% aligned with VISION.md

**Key Insight:**
> "From memory system to cognitive engine — decisions are the unit of value"
