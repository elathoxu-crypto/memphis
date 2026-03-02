# Model C — Predictive Decisions Plan

**Version:** v2.0.0 (Target)
**Date:** 2026-03-02
**Status:** Planning Phase

---

## 🎯 What is Model C?

**Model C = Predictive Decisions**

The agent predicts decisions you're likely to make based on:
- Past decision patterns
- Current context (files, branches, activity)
- Similar situations in memory
- Knowledge graph relationships

**Model A** = You record decisions  
**Model B** = Agent detects decisions from git  
**Model C** = Agent predicts future decisions

---

## 💡 Core Concept

**Before you decide, agent suggests:**

```
You're working on a new API endpoint...
Based on past decisions:
  85% likely: "Use REST not GraphQL"
  70% likely: "Add authentication"
  65% likely: "Use PostgreSQL"

Accept prediction? [y/n/custom]
```

**Value:**
- Saves cognitive load
- Consistent with past decisions
- Catches patterns you might miss
- Proactive guidance

---

## 🏗️ Architecture

### 1. Pattern Learning Engine

**Input:** Past decisions (Model A + B)
**Output:** Decision patterns

```typescript
interface DecisionPattern {
  // Trigger context
  context: {
    files: string[];          // ["src/api/*.ts"]
    branches: string[];       // ["feature/*"]
    activity: string[];       // ["new-feature", "refactor"]
    timeOfDay?: number;       // 9-17 for work hours
  };

  // Predicted decision
  prediction: {
    type: "strategic" | "tactical" | "technical";
    title: string;
    confidence: number;       // 0.0-1.0
    evidence: string[];       // Past decisions that support this
  };

  // Stats
  occurrences: number;        // How often this pattern appears
  lastSeen: Date;
  accuracy?: number;          // How often prediction was correct
}
```

**Example Pattern:**
```typescript
{
  context: {
    files: ["src/api/**/*.ts"],
    branches: ["feature/api-*"],
    activity: ["new-endpoint"]
  },
  prediction: {
    type: "technical",
    title: "Use REST architecture",
    confidence: 0.85,
    evidence: ["decision#3", "decision#7", "decision#12"]
  },
  occurrences: 5,
  accuracy: 0.80
}
```

---

### 2. Context Analyzer

**Monitors current state:**

```typescript
interface CurrentContext {
  // Active files (last 1h)
  activeFiles: string[];

  // Current branch
  branch: string;

  // Recent activity (last 24h)
  recentCommits: Commit[];
  recentDecisions: Decision[];

  // Knowledge graph context
  relatedNodes: GraphNode[];

  // Time context
  timeOfDay: number;
  dayOfWeek: number;
}
```

**Analysis:**
```typescript
class ContextAnalyzer {
  analyzeCurrentContext(): CurrentContext {
    // 1. Get recent file activity
    const activeFiles = this.getRecentFiles(1h);

    // 2. Get current branch
    const branch = this.getCurrentBranch();

    // 3. Get recent commits
    const commits = this.getRecentCommits(24h);

    // 4. Get related knowledge graph nodes
    const nodes = this.getRelatedNodes(activeFiles);

    return { activeFiles, branch, commits, nodes, ... };
  }
}
```

---

### 3. Prediction Engine

**Generates predictions:**

```typescript
class PredictionEngine {
  predict(context: CurrentContext): Prediction[] {
    // 1. Match context to patterns
    const matchingPatterns = this.matchPatterns(context);

    // 2. Score predictions
    const scored = this.scorePredictions(matchingPatterns);

    // 3. Filter by confidence
    const highConfidence = scored.filter(p => p.confidence >= 0.6);

    // 4. Return top predictions
    return highConfidence.slice(0, 5);
  }

  matchPatterns(context: CurrentContext): DecisionPattern[] {
    // Match files, branches, activity
    return this.patterns.filter(pattern => {
      return this.matches(pattern.context, context);
    });
  }

  scorePredictions(patterns: DecisionPattern[]): Prediction[] {
    return patterns.map(pattern => ({
      ...pattern.prediction,
      confidence: this.calculateConfidence(pattern),
      basedOn: pattern.evidence,
      pattern: pattern
    }));
  }
}
```

---

### 4. Proactive Suggestions

**Shows predictions to user:**

```typescript
class ProactiveSuggester {
  async suggestPredictions(): Promise<void> {
    // 1. Analyze context
    const context = this.analyzer.analyzeCurrentContext();

    // 2. Generate predictions
    const predictions = this.engine.predict(context);

    if (predictions.length === 0) return;

    // 3. Display to user
    this.displayPredictions(predictions);

    // 4. Handle user response
    await this.handleResponse(predictions);
  }

  displayPredictions(predictions: Prediction[]): void {
    console.log("\n🔮 Predicted Decisions:");
    console.log("Based on your current work...\n");

    predictions.forEach((pred, i) => {
      const emoji = pred.confidence >= 0.8 ? "🟢" :
                    pred.confidence >= 0.7 ? "🟡" : "🔴";

      console.log(`${i + 1}. ${emoji} [${(pred.confidence * 100).toFixed(0)}%] ${pred.title}`);
      console.log(`   Based on: ${pred.basedOn.length} past decisions`);
      console.log(`   Evidence: ${pred.evidence.slice(0, 2).join(", ")}`);
    });

    console.log("\n[a]ccept first / [n]one / [c]ustom");
  }
}
```

---

## 📊 Implementation Plan

### Phase 1: Pattern Learning (Week 5, Days 1-2)

**Goal:** Learn patterns from Model A+B decisions

**Tasks:**
- [ ] Create `src/decision/pattern-learner.ts` (300 lines)
  - Extract patterns from decision history
  - Calculate confidence scores
  - Store patterns persistently

- [ ] Create `src/decision/pattern-storage.ts` (150 lines)
  - Persist patterns to `~/.memphis/patterns.json`
  - Load patterns on startup
  - Update patterns incrementally

- [ ] Add pattern learning triggers
  - After each decision save
  - Weekly batch analysis
  - Manual trigger command

**Output:**
- Pattern database with 10+ patterns
- Confidence scoring working
- Persistence working

---

### Phase 2: Context Analysis (Week 5, Days 3-4)

**Goal:** Analyze current work context

**Tasks:**
- [ ] Create `src/decision/context-analyzer.ts` (250 lines)
  - Monitor file activity (last 1h)
  - Track current branch
  - Analyze recent commits
  - Query knowledge graph

- [ ] Create `src/decision/context-matcher.ts` (200 lines)
  - Match current context to patterns
  - Calculate match scores
  - Handle partial matches

- [ ] Add daemon integration
  - Context analysis every 30 min
  - Cache results for performance

**Output:**
- Real-time context analysis
- Pattern matching working
- Performance <500ms

---

### Phase 3: Prediction Engine (Week 5, Day 5)

**Goal:** Generate predictions

**Tasks:**
- [ ] Create `src/decision/prediction-engine.ts` (300 lines)
  - Generate predictions from patterns
  - Score predictions
  - Filter by confidence
  - Deduplicate similar predictions

- [ ] Add prediction CLI command
  - `memphis predict` — show current predictions
  - `memphis predict --learn` — learn from feedback
  - `memphis predict --stats` — show pattern stats

**Output:**
- Prediction generation working
- CLI command functional
- 3-5 predictions per context

---

### Phase 4: Proactive Suggestions (Week 6, Days 1-2)

**Goal:** Show predictions proactively

**Tasks:**
- [ ] Create `src/decision/proactive-suggester.ts` (250 lines)
  - Display predictions to user
  - Handle accept/reject/custom
  - Track prediction accuracy
  - Learn from feedback

- [ ] Add TUI integration
  - Predictions widget in dashboard
  - Keyboard shortcuts (a/n/c)
  - Visual confidence indicators

- [ ] Add daemon integration
  - Check for predictions every 30 min
  - Show when confidence >70%
  - Max 3 suggestions per check

**Output:**
- Proactive suggestions working
- TUI widget functional
- Feedback loop complete

---

### Phase 5: Accuracy Tracking (Week 6, Days 3-4)

**Goal:** Track and improve prediction accuracy

**Tasks:**
- [ ] Create `src/decision/accuracy-tracker.ts` (200 lines)
  - Track prediction outcomes
  - Calculate accuracy per pattern
  - Adjust confidence scores
  - Decay low-accuracy patterns

- [ ] Add accuracy reports
  - `memphis predict --report` — show accuracy stats
  - Weekly accuracy summary
  - Pattern health dashboard

- [ ] Implement learning loop
  - Update patterns based on accuracy
  - Remove low-accuracy patterns
  - Boost high-accuracy patterns

**Output:**
- Accuracy tracking working
- Self-improving patterns
- Target: 70% accuracy

---

### Phase 6: Integration & Testing (Week 6, Day 5)

**Goal:** Complete integration and testing

**Tasks:**
- [ ] Integration testing
  - Test with real decisions
  - Validate pattern learning
  - Verify predictions accurate

- [ ] Performance optimization
  - Pattern matching <100ms
  - Context analysis <500ms
  - Prediction generation <200ms

- [ ] Documentation
  - Update README
  - Create MODEL-C-GUIDE.md
  - Add examples

- [ ] Release v2.0.0
  - Complete CHANGELOG
  - Tag release
  - Push to GitHub

**Output:**
- Model C complete
- v2.0.0 released
- Documentation complete

---

## 🎯 Success Criteria

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pattern Learning | >10 patterns | Count patterns in DB |
| Prediction Speed | <300ms | Time from context to predictions |
| Accuracy | >70% | Accepted predictions / total |
| Coverage | >50% | Contexts with predictions |
| Latency | <500ms | Context analysis time |

### User Value

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cognitive Load | Reduced | User feedback |
| Decision Consistency | Increased | Compare before/after |
| Proactive Saves | >2/day | Tracked predictions saved |
| User Satisfaction | >4/5 | Survey rating |

---

## 📁 File Structure

```
src/decision/
├── pattern-learner.ts        (300 lines) — Learn patterns from history
├── pattern-storage.ts        (150 lines) — Persist patterns
├── context-analyzer.ts       (250 lines) — Analyze current context
├── context-matcher.ts        (200 lines) — Match context to patterns
├── prediction-engine.ts      (300 lines) — Generate predictions
├── proactive-suggester.ts    (250 lines) — Show predictions to user
├── accuracy-tracker.ts       (200 lines) — Track prediction accuracy
└── pattern-types.ts          (100 lines) — Type definitions

Total: ~1,750 lines
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Model C Pipeline                          │
└─────────────────────────────────────────────────────────────┘

1. PATTERN LEARNING (Background)
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Decision │ ───▶ │  Pattern │ ───▶ │  Pattern │
   │  History │      │  Learner │      │ Storage  │
   └──────────┘      └──────────┘      └──────────┘

2. CONTEXT ANALYSIS (Every 30 min)
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │  Files/  │ ───▶ │ Context  │ ───▶ │ Context  │
   │  Git/    │      │ Analyzer │      │  Cache   │
   │  Graph   │      └──────────┘      └──────────┘
   └──────────┘

3. PREDICTION GENERATION (On demand)
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Context  │ ───▶ │Prediction│ ───▶ │Prediction│
   │  Cache   │      │  Engine  │      │  List    │
   └──────────┘      └──────────┘      └──────────┘

4. PROACTIVE SUGGESTIONS (When confidence >70%)
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │Prediction│ ───▶ │Proactive │ ───▶ │   User   │
   │  List    │      │Suggester │      │Interface │
   └──────────┘      └──────────┘      └──────────┘

5. FEEDBACK LOOP (After user response)
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │   User   │ ───▶ │ Accuracy │ ───▶ │ Pattern  │
   │ Response │      │ Tracker  │      │ Update   │
   └──────────┘      └──────────┘      └──────────┘
```

---

## 💡 Example Scenarios

### Scenario 1: New API Endpoint

**Context:**
- Files: `src/api/users.ts`, `src/api/types.ts`
- Branch: `feature/user-api`
- Recent: "Add user endpoint"

**Predictions:**
```
🔮 Predicted Decisions:
Based on your current work on user API...

1. 🟢 [85%] Use REST architecture
   Based on: 5 past decisions
   Evidence: decision#3, decision#7, decision#12

2. 🟡 [72%] Add authentication
   Based on: 3 past decisions
   Evidence: decision#5, decision#9

3. 🟡 [68%] Use PostgreSQL
   Based on: 4 past decisions
   Evidence: decision#2, decision#8

[a]ccept first / [n]one / [c]ustom
```

**User accepts:**
```bash
✓ Saved: "Use REST architecture"
  Confidence upgraded: 85% → 100%
  Pattern accuracy updated: 80% → 81%
```

---

### Scenario 2: Refactoring

**Context:**
- Files: `src/utils/helpers.ts`, `src/core/engine.ts`
- Branch: `refactor/helpers`
- Recent: "Refactor helper functions"

**Predictions:**
```
🔮 Predicted Decisions:
Based on your refactoring work...

1. 🟢 [88%] Extract to separate module
   Based on: 7 past decisions
   Evidence: decision#15, decision#23, decision#31

2. 🟢 [82%] Add unit tests
   Based on: 6 past decisions
   Evidence: decision#18, decision#25

3. 🟡 [65%] Use dependency injection
   Based on: 3 past decisions
   Evidence: decision#12, decision#19

[a]ccept first / [n]one / [c]ustom
```

---

### Scenario 3: New Feature

**Context:**
- Files: `src/features/analytics.ts`
- Branch: `feature/analytics`
- Recent: "Add analytics dashboard"

**Predictions:**
```
🔮 Predicted Decisions:
Based on your analytics feature work...

1. 🟢 [90%] Use Chart.js library
   Based on: 8 past decisions
   Evidence: decision#20, decision#28, decision#35

2. 🟢 [85%] Add export functionality
   Based on: 5 past decisions
   Evidence: decision#22, decision#30

3. 🟡 [70%] Cache results
   Based on: 4 past decisions
   Evidence: decision#25, decision#32

[a]ccept first / [n]one / [c]ustom
```

---

## 🚀 Commands

### New Commands

```bash
# Show current predictions
memphis predict

# Show with options
memphis predict --since 7        # Based on last 7 days context
memphis predict --threshold 0.7  # Min confidence
memphis predict --learn          # Learn from feedback

# Pattern management
memphis patterns list            # List learned patterns
memphis patterns stats           # Show pattern statistics
memphis patterns accuracy        # Show accuracy report

# Training
memphis patterns train           # Force pattern learning
memphis patterns validate        # Validate all patterns
```

### Integration with Existing

```bash
# After decision save, update patterns
memphis decide "..." --train-patterns

# During infer, also predict
memphis infer --predict --since 7

# Dashboard shows predictions
memphis tui
# [P] Predictions widget
```

---

## 📈 Learning Algorithm

### Pattern Extraction

```typescript
function extractPatterns(decisions: Decision[]): Pattern[] {
  const patterns: Pattern[] = [];

  for (const decision of decisions) {
    // 1. Get context at decision time
    const context = getContextAtDecision(decision);

    // 2. Look for similar contexts
    const similar = decisions.filter(d =>
      contextSimilarity(getContextAtDecision(d), context) > 0.7
    );

    // 3. If enough similar, create pattern
    if (similar.length >= 3) {
      patterns.push({
        context: generalizeContext(context),
        prediction: {
          type: decision.type,
          title: decision.title,
          confidence: similar.length / decisions.length,
          evidence: similar.map(s => s.id)
        },
        occurrences: similar.length
      });
    }
  }

  return deduplicatePatterns(patterns);
}
```

### Confidence Calculation

```typescript
function calculateConfidence(pattern: Pattern): number {
  // Base confidence from occurrences
  let confidence = pattern.occurrences / 10; // Normalize

  // Boost if recent
  const daysSinceLast = daysSince(pattern.lastSeen);
  if (daysSinceLast < 7) confidence += 0.1;

  // Adjust by accuracy
  if (pattern.accuracy) {
    confidence *= pattern.accuracy;
  }

  // Boost if high-confidence evidence
  const highConfEvidence = pattern.evidence.filter(e =>
    getDecision(e).confidence >= 0.8
  );
  confidence += highConfEvidence.length * 0.05;

  // Cap at 0.95 (predictions never 100%)
  return Math.min(confidence, 0.95);
}
```

### Accuracy Tracking

```typescript
function trackAccuracy(prediction: Prediction, accepted: boolean): void {
  const pattern = prediction.pattern;

  // Update pattern stats
  pattern.totalPredictions = (pattern.totalPredictions || 0) + 1;
  if (accepted) {
    pattern.correctPredictions = (pattern.correctPredictions || 0) + 1;
  }

  // Calculate accuracy
  pattern.accuracy = pattern.correctPredictions / pattern.totalPredictions;

  // Decay low-accuracy patterns
  if (pattern.accuracy < 0.5 && pattern.totalPredictions > 10) {
    pattern.confidence *= 0.9; // Reduce confidence
  }

  // Boost high-accuracy patterns
  if (pattern.accuracy > 0.8 && pattern.totalPredictions > 5) {
    pattern.confidence = Math.min(pattern.confidence * 1.1, 0.95);
  }

  // Save updated pattern
  savePattern(pattern);
}
```

---

## 🎯 Risks & Mitigations

### Risk 1: Low Accuracy
**Problem:** Predictions wrong >30% of time
**Mitigation:**
- Conservative confidence thresholds (start at 0.7)
- Continuous learning from feedback
- Decay low-accuracy patterns
- User can always reject

### Risk 2: Too Many Predictions
**Problem:** Overwhelming user with suggestions
**Mitigation:**
- Max 3 predictions per check
- Only show high confidence (>70%)
- User-configurable frequency
- Easy to dismiss

### Risk 3: Context Analysis Slow
**Problem:** Taking >1s to analyze context
**Mitigation:**
- Cache context analysis (30 min TTL)
- Incremental updates
- Background processing
- Lazy loading

### Risk 4: Privacy Concerns
**Problem:** Users don't want patterns tracked
**Mitigation:**
- All data local (no external API)
- Opt-out option
- Pattern deletion command
- Transparent about what's stored

---

## 📅 Timeline

### Week 5 (Model C Core)
- **Day 1-2:** Pattern Learning (450 lines)
- **Day 3-4:** Context Analysis (450 lines)
- **Day 5:** Prediction Engine (300 lines)

**Total:** 1,200 lines, 5 days

### Week 6 (Integration & Polish)
- **Day 1-2:** Proactive Suggestions (250 lines)
- **Day 3-4:** Accuracy Tracking (200 lines)
- **Day 5:** Testing & Docs (100 lines + docs)

**Total:** 550 lines + docs, 5 days

**Grand Total:** 1,750 lines, 10 days

---

## 🎉 Definition of Done

- [ ] Pattern learning working (10+ patterns)
- [ ] Context analysis <500ms
- [ ] Prediction generation <300ms
- [ ] Proactive suggestions showing
- [ ] Accuracy tracking working
- [ ] Target accuracy >70%
- [ ] TUI widget functional
- [ ] CLI commands working
- [ ] Documentation complete
- [ ] v2.0.0 released

---

## 🚀 Ready to Build?

**Prerequisites:**
- ✅ Model A complete (100%)
- ✅ Model B complete (100%)
- ✅ 20+ decisions in history
- ✅ Knowledge graph built
- ✅ Daemon working

**Estimated Effort:**
- 10 days development
- 1,750 lines of code
- 2 weeks total (with testing)

**Value:**
- Proactive decision guidance
- Consistent decision-making
- Reduced cognitive load
- Learning system

---

**Plan Status:** COMPLETE ✅
**Ready for:** Implementation (Week 5)

Watra 🔥
