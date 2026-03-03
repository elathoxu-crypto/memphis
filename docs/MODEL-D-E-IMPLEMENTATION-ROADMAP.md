# Memphis Models D & E Implementation Roadmap

**Version:** 1.0.0
**Date:** 2026-03-03
**Status:** Draft → Implementation

---

## Overview

**Memphis Brain Model Status:**
- ✅ Model A (Conscious Decisions): 100%
- ✅ Model B (Inferred Decisions): 100%
- ✅ Model C (Predictive Decisions): 100%
- ❌ Model D (Collective Decisions): 0% → Target
- ❌ Model E (Meta-Cognitive): 0% → Target

**Goal:** Complete implementation of Models D and E over 4 weeks, enabling:
- Multi-agent collective decision making
- Self-reflection and learning loops
- Strategy evolution
- Performance tracking

---

## Model D: Collective Decisions

### Vision

**Model D = Collective Intelligence Engine**

Enables Memphis to simulate and participate in multi-agent decision making, combining multiple perspectives, voting mechanisms, consensus algorithms, and reputation tracking.

**Use Cases:**
- Multi-agent code review simulation
- Architectural decision committees
- Expert role delegation (security, performance, UX)
- Collective memory aggregation
- Cross-project pattern sharing

---

### Architecture

#### Core Components

**1. Voting Engine** (`src/collective/voting-engine.ts`)
```
Purpose: Execute voting algorithms on proposals

Capabilities:
- Single-choice voting (majority, supermajority, unanimous)
- Ranked voting (instant runoff, Borda count)
- Weighted voting (by reputation, expertise)
- Approval voting
- Delegation (proxy voting)

Input: Proposal + VoterPreferences
Output: VoteResult (winner, participation, consensus)
```

**2. Consensus Mechanism** (`src/collective/consensus-mechanism.ts`)
```
Purpose: Achieve agreement across multiple agents

Algorithms:
- Raft-like leader election for decision coordination
- Byzantine fault tolerance for unreliable agents
- Gossip protocol for agreement propagation
- Threshold-based consensus (75%, 90%, 100%)
- Conflict resolution (tie-breaking, mediation)

Input: Proposal + AgentVotes
Output: ConsensusResult (agreed, partial, failed)
```

**3. Reputation Tracker** (`src/collective/reputation-tracker.ts`)
```
Purpose: Track agent trust scores and expertise

Metrics:
- Accuracy (historical prediction success)
- Participation (engagement rate)
- Consensus alignment (how often agrees with group)
- Expertise domain scores (security, performance, UX)
- Reliability (uptime, response time)

Decay: Reputation decays over time, boosts from recent success

Input: AgentID + Outcome
Output: ReputationScore (0-1, domain breakdown)
```

**4. Agent Registry** (`src/collective/agent-registry.ts`)
```
Purpose: Manage available agents and their capabilities

Agents:
- SecurityAgent (code security patterns)
- PerformanceAgent (optimization patterns)
- UXAgent (user experience patterns)
- TestingAgent (test coverage patterns)
- DocumentationAgent (doc quality patterns)

Each agent has:
- ID, name, role
- Expertise domains
- Reputation scores
- Capabilities
- Config
```

---

### TypeScript Interfaces

```typescript
// src/collective/types.ts

/**
 * Agent Role - specialized domains of expertise
 */
export type AgentRole =
  | 'security'
  | 'performance'
  | 'ux'
  | 'testing'
  | 'documentation'
  | 'architecture'
  | 'general';

/**
 * Voting Method - different voting algorithms
 */
export type VotingMethod =
  | 'majority'      // >50%
  | 'supermajority' // >66%
  | 'unanimous'     // 100%
  | 'ranked'        // Instant runoff
  | 'borda'         // Weighted ranking
  | 'approval'      // Multiple choices allowed
  | 'weighted';     // By reputation

/**
 * Proposal - a decision to be voted on
 */
export interface Proposal {
  id: string;
  title: string;
  description: string;
  context: string;
  options: string[];
  proposedBy: string; // Agent ID or 'user'
  createdAt: Date;
  expiresAt?: Date;
  tags: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Vote - a single agent's vote
 */
export interface Vote {
  proposalId: string;
  agentId: string;
  choice: string | string[]; // Single or multiple (approval)
  ranking?: number[];        // For ranked voting
  weight?: number;           // For weighted voting
  reasoning?: string;
  confidence?: number;       // 0-1
  timestamp: Date;
}

/**
 * Vote Result - outcome of voting
 */
export interface VoteResult {
  proposalId: string;
  method: VotingMethod;
  winner: string;
  participation: {
    totalAgents: number;
    votedAgents: number;
    participationRate: number;
  };
  counts: Map<string, number>; // Option -> vote count
  consensus: 'agreed' | 'partial' | 'failed';
  timestamp: Date;
  votes: Vote[];
}

/**
 * Reputation Score - agent trust metrics
 */
export interface ReputationScore {
  agentId: string;
  overall: number;           // 0-1
  domains: Map<AgentRole, number>; // Domain-specific scores
  accuracy: number;          // Historical success rate
  participation: number;    // Engagement rate
  alignment: number;         // Agreement with consensus
  reliability: number;       // Uptime/responsiveness
  updatedAt: Date;
  history: ReputationEvent[];
}

/**
 * Reputation Event - history of reputation changes
 */
export interface ReputationEvent {
  type: 'success' | 'failure' | 'participation' | 'decay';
  delta: number;             // Change in score
  reason: string;
  context?: string;
  timestamp: Date;
}

/**
 * Agent - registered voting agent
 */
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  capabilities: string[];
  reputation: ReputationScore;
  config: AgentConfig;
  active: boolean;
  createdAt: Date;
}

/**
 * Agent Config - agent-specific settings
 */
export interface AgentConfig {
  votingMethod: VotingMethod;
  minConfidence: number;
  delegateTo?: string;       // Proxy agent
  responseTimeout: number;   // ms
  maxLoad: number;           // max concurrent proposals
}

/**
 * Consensus Result - agreement outcome
 */
export interface ConsensusResult {
  proposalId: string;
  agreed: boolean;
  consensus: number;         // 0-1
  decision?: string;
  conflict: ConflictInfo | null;
  timestamp: Date;
  agents: ConsensusAgentStatus[];
}

/**
 * Conflict Info - when consensus fails
 */
export interface ConflictInfo {
  type: 'tie' | 'low_participation' | 'timeout' | 'byzantine';
  details: string;
  proposedResolution?: string;
}

/**
 * Consensus Agent Status - per-agent consensus state
 */
export interface ConsensusAgentStatus {
  agentId: string;
  voted: boolean;
  agreed?: boolean;
  vote?: string;
}

/**
 * Collective Memory - shared knowledge across agents
 */
export interface CollectiveMemory {
  id: string;
  topic: string;
  content: string;
  contributors: string[];  // Agent IDs
  agreement: number;        // 0-1, how much agents agree
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Voting Config - global voting settings
 */
export interface VotingConfig {
  defaultMethod: VotingMethod;
  minParticipation: number; // 0-1
  consensusThreshold: number; // 0-1
  timeout: number;          // ms
  enableDelegation: boolean;
  reputationDecayRate: number; // per day
}
```

---

### CLI Commands

#### `memphis vote`

**Run a collective vote on a proposal.**

```bash
# Create and run a vote
memphis vote "Proposal title" --options "A|B|C" --chosen "A"

# Vote on existing proposal
memphis vote <proposalId> --choice "A" --as-agent <agentId>

# Different voting methods
memphis vote "Title" --method ranked --ranking "A,B,C"
memphis vote "Title" --method approval --choices "A,B"
memphis vote "Title" --method weighted --as-agent security

# List proposals
memphis vote --list

# Show proposal details
memphis vote show <proposalId>

# Results
memphis vote results <proposalId>
```

**Options:**
- `--list` — List all proposals
- `--show <id>` — Show proposal details
- `--results <id>` — Show voting results
- `--create` — Create new proposal
- `--options <choices>` — Options (pipe-separated)
- `--choice <value>` — Single choice vote
- `--choices <values>` — Multiple choices (approval voting)
- `--ranking <order>` — Ranked order (comma-separated)
- `--as-agent <id>` — Vote as specific agent
- `--method <method>` — Voting method (default: majority)
- `--min-participation <n>` — Minimum participation 0-1
- `--timeout <ms>` — Voting timeout
- `--json` — Output JSON

---

#### `memphis consensus`

**Achieve consensus across agents.**

```bash
# Run consensus on a proposal
memphis consensus <proposalId>

# Check consensus status
memphis consensus status <proposalId>

# Resolve conflicts
memphis consensus resolve <proposalId> --resolution "A"

# Force consensus (for testing)
memphis consensus force <proposalId> --choice "A"
```

**Options:**
- `<proposalId>` — Proposal to reach consensus on
- `--status` — Check consensus status
- `--resolve` — Resolve conflict with specific choice
- `--force` — Force consensus (bypass voting)
- `--method <method>` — Consensus algorithm
- `--threshold <n>` — Consensus threshold 0-1
- `--timeout <ms>` — Consensus timeout
- `--json` — Output JSON

---

#### `memphis reputation`

**Manage agent reputation and trust scores.**

```bash
# Show all agents and reputation
memphis reputation list

# Show specific agent reputation
memphis reputation show <agentId>

# Update reputation manually
memphis reputation update <agentId> --success --reason "Good decision"

# Show reputation history
memphis reputation history <agentId>

# Reset reputation
memphis reputation reset <agentId>

# Decay reputation (simulate time passage)
memphis reputation decay --days 7
```

**Options:**
- `list` — List all agents with reputation
- `show <id>` — Show detailed agent reputation
- `update <id>` — Update agent reputation
  - `--success` — Mark as success
  - `--failure` — Mark as failure
  - `--reason <text>` — Reason for update
  - `--domain <domain>` — Domain-specific update
- `history <id>` — Show reputation history
- `reset <id>` — Reset reputation to baseline
- `decay` — Apply time-based decay
  - `--days <n>` — Days to decay
- `--json` — Output JSON

---

### Model D Testing Strategy

**Unit Tests:**
- `tests/collective/voting-engine.test.ts`
  - Majority voting (edge cases: ties, low participation)
  - Supermajority voting
  - Unanimous voting
  - Ranked voting (IRV, Borda)
  - Weighted voting
  - Approval voting
  - Delegation

- `tests/collective/consensus-mechanism.test.ts`
  - Basic consensus (single proposal)
  - Multi-agent consensus
  - Timeout handling
  - Byzantine fault tolerance
  - Conflict resolution
  - Gossip protocol

- `tests/collective/reputation-tracker.test.ts`
  - Reputation calculation
  - Decay over time
  - Domain-specific scores
  - History tracking
  - Edge cases (no data, negative scores)

**Integration Tests:**
- `tests/collective/integration.test.ts`
  - End-to-end voting workflow
  - Multi-proposal scenarios
  - Agent interaction
  - Collective memory updates

**Performance Tests:**
- Large-scale voting (100+ agents)
- Rapid voting (100 proposals/minute)
- Reputation calculation performance

---

## Model E: Meta-Cognitive

### Vision

**Model E = Self-Reflection & Learning Engine**

Enables Memphis to analyze its own decisions, learn from mistakes, evolve strategies, and track performance over time.

**Use Cases:**
- Self-critique of past decisions
- Identifying patterns in mistakes
- Adaptive decision strategies
- Performance benchmarking
- Meta-learning (learning to learn)

---

### Architecture

#### Core Components

**1. Reflection Engine** (`src/meta-cognitive/reflection-engine.ts`)
```
Purpose: Analyze and critique past decisions

Analysis Types:
- Decision quality assessment
- Pattern recognition in mistakes
- Strength/weakness identification
- Comparative analysis (Model A vs B vs C outcomes)
- Confidence calibration (predicted vs actual)

Input: DecisionHistory
Output: ReflectionReport (insights, recommendations)
```

**2. Learning Loop** (`src/meta-cognitive/learning-loop.ts`)
```
Purpose: Transform mistakes into improvements

Process:
1. Detect mistake/contradiction
2. Root cause analysis
3. Generate improvement action
4. Apply to decision patterns
5. Validate improvement
6. Commit to learning

Input: MistakeEvent
Output: LearningRecord (what was learned)
```

**3. Strategy Evolver** (`src/meta-cognitive/strategy-evolver.ts`)
```
Purpose: Adapt decision strategies over time

Strategies:
- Confidence thresholds (adjust based on accuracy)
- Voting methods (choose based on context)
- Pattern weights (boost high-accuracy patterns)
- Agent selection (choose best agents for domain)
- Context preferences (time of day, project type)

Evolution:
- A/B test strategies
- Track performance metrics
- Select best performer
- Gradual rollout

Input: PerformanceMetrics
Output: StrategyUpdate (new strategy parameters)
```

**4. Performance Tracker** (`src/meta-cognitive/performance-tracker.ts`)
```
Purpose: Track and benchmark Memphis performance

Metrics:
- Decision accuracy (correct vs incorrect)
- Prediction accuracy (Model C)
- Confidence calibration
- Decision velocity (decisions/hour)
- Pattern quality
- Agent performance (Model D)
- User satisfaction

Dimensions:
- Time series (daily, weekly, monthly)
- Domain breakdown (security, performance, etc.)
- Context breakdown (project, time of day)
```

---

### TypeScript Interfaces

```typescript
// src/meta-cognitive/types.ts

/**
 * Reflection Type - different reflection modes
 */
export type ReflectionType =
  | 'quality'       // Decision quality assessment
  | 'patterns'      // Pattern recognition
  | 'mistakes'      // Mistake analysis
  | 'comparative'   // Model comparison
  | 'confidence';    // Confidence calibration

/**
 * Learning Level - depth of learning
 */
export type LearningLevel =
  | 'shallow'       // One-time adjustment
  | 'medium'        // Pattern update
  | 'deep';         // Strategy evolution

/**
 * Reflection Report - output of reflection
 */
export interface ReflectionReport {
  id: string;
  type: ReflectionType;
  period: {
    from: Date;
    to: Date;
  };
  insights: Insight[];
  recommendations: Recommendation[];
  metrics: ReflectionMetrics;
  generatedAt: Date;
  durationMs: number;
}

/**
 * Insight - discovered pattern or observation
 */
export interface Insight {
  type: 'strength' | 'weakness' | 'pattern' | 'anomaly' | 'opportunity';
  title: string;
  description: string;
  confidence: number;        // 0-1
  evidence: Evidence[];
  impact: 'high' | 'medium' | 'low';
}

/**
 * Recommendation - actionable suggestion
 */
export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  description: string;
  expectedImpact: string;
  effort: 'quick' | 'moderate' | 'significant';
}

/**
 * Evidence - supporting data for insights
 */
export interface Evidence {
  type: 'decision' | 'pattern' | 'metric' | 'contradiction';
  reference: string;
  description: string;
  weight: number;
}

/**
 * Reflection Metrics - quantitative analysis
 */
export interface ReflectionMetrics {
  totalDecisions: number;
  accuracy: number;
  avgConfidence: number;
  confidenceCalibration: number; // How close confidence to accuracy
  topStrengths: string[];
  topWeaknesses: string[];
  patternAccuracy: Map<string, number>;
}

/**
 * Mistake Event - when a decision is wrong
 */
export interface MistakeEvent {
  id: string;
  decisionId: string;
  type: 'contradiction' | 'reinforcement_failed' | 'predicted_wrongly' | 'user_rejected';
  originalChoice: string;
  correctChoice?: string;
  reason: string;
  context: string;
  timestamp: Date;
  rootCause?: RootCause;
}

/**
 * Root Cause - analysis of why mistake occurred
 */
export interface RootCause {
  category: 'data_quality' | 'pattern_incorrect' | 'context_mismatch' | 'confidence_misaligned' | 'unknown';
  description: string;
  contributingFactors: string[];
  suggestedPrevention: string;
}

/**
 * Learning Record - what was learned from mistake
 */
export interface LearningRecord {
  id: string;
  mistakeId: string;
  level: LearningLevel;
  learning: string;
  action: LearningAction;
  appliedAt: Date;
  validatedAt?: Date;
  effective: boolean;
}

/**
 * Learning Action - what was changed
 */
export interface LearningAction {
  type: 'pattern_update' | 'pattern_remove' | 'confidence_adjust' | 'strategy_change' | 'agent_config';
  target: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Strategy - decision-making approach
 */
export interface Strategy {
  id: string;
  name: string;
  description: string;
  parameters: StrategyParameters;
  performance: StrategyPerformance;
  active: boolean;
  createdAt: Date;
}

/**
 * Strategy Parameters - configurable strategy values
 */
export interface StrategyParameters {
  votingMethod: VotingMethod;
  minConfidence: number;
  consensusThreshold: number;
  patternBoost: Map<string, number>;
  agentWeights: Map<string, number>;
  contextPreferences: Map<string, number>;
}

/**
 * Strategy Performance - metrics for strategy
 */
export interface StrategyPerformance {
  accuracy: number;
  speed: number;           // Average decision time (ms)
  satisfaction: number;    // User acceptance rate
  sampleSize: number;
  updatedAt: Date;
}

/**
 * Strategy Update - evolution of strategy
 */
export interface StrategyUpdate {
  strategyId: string;
  changes: StrategyParameterChange[];
  reason: string;
  abTest?: ABTest;
  timestamp: Date;
}

/**
 * Strategy Parameter Change - specific parameter update
 */
export interface StrategyParameterChange {
  parameter: string;
  oldValue: unknown;
  newValue: unknown;
  expectedImpact: string;
}

/**
 * AB Test - A/B test for strategy comparison
 */
export interface ABTest {
  id: string;
  strategyA: string;
  strategyB: string;
  trafficSplit: number;   // 0-1, portion for B
  startedAt: Date;
  duration: number;        // days
  results?: ABTestResults;
}

/**
 * AB Test Results - outcome of A/B test
 */
export interface ABTestResults {
  winner: string;
  confidence: number;      // Statistical confidence
  accuracyA: number;
  accuracyB: number;
  sampleA: number;
  sampleB: number;
  completedAt: Date;
}

/**
 * Performance Metric - tracked metric
 */
export interface PerformanceMetric {
  id: string;
  name: string;
  type: 'accuracy' | 'speed' | 'satisfaction' | 'calibration' | 'coverage';
  value: number;
  unit: string;
  timestamp: Date;
  dimensions: {
    model?: 'A' | 'B' | 'C' | 'D';
    domain?: string;
    context?: string;
  };
}

/**
 * Performance Benchmark - target values
 */
export interface PerformanceBenchmark {
  id: string;
  metric: string;
  target: number;
  minimum: number;
  timeframe: string;       // 'daily', 'weekly', 'monthly'
  current?: number;
  status?: 'passed' | 'failed' | 'unknown';
}

/**
 * Meta-Cognitive Config - global settings
 */
export interface MetaCognitiveConfig {
  reflection: {
    interval: number;      // hours
    minDecisions: number;  // minimum for reflection
    depth: ReflectionType[];
  };
  learning: {
    autoApply: boolean;
    validationWindow: number; // days
    maxLearningPerDay: number;
  };
  strategy: {
    evolutionInterval: number; // days
    abTestDuration: number;   // days
    minSampleSize: number;
  };
  performance: {
    metrics: string[];
    benchmarks: PerformanceBenchmark[];
  };
}
```

---

### CLI Commands

#### `memphis reflect`

**Generate self-reflection report.**

```bash
# Run reflection
memphis reflect

# Reflection types
memphis reflect --type quality
memphis reflect --type mistakes
memphis reflect --type patterns

# Time windows
memphis reflect --daily
memphis reflect --weekly
memphis reflect --monthly
memphis reflect --since 2026-02-15

# Save reflection
memphis reflect --save

# JSON output
memphis reflect --json
```

**Options:**
- `--type <type>` — Reflection type (quality, patterns, mistakes, comparative, confidence)
- `--daily` — Last 24 hours
- `--weekly` — Last 7 days (default)
- `--monthly` — Last 30 days
- `--since <date>` — Custom start date
- `--save` — Save reflection to memory
- `--min-decisions <n>` — Minimum decisions for reflection
- `--json` — Output JSON

---

#### `memphis learn`

**View and manage learning records.**

```bash
# List recent learning
memphis learn list

# Show learning record
memphis learn show <learningId>

# Analyze mistakes
memphis learn mistakes --since 30

# Apply learning manually
memphis learn apply <learningId>

# Validate learning effectiveness
memphis learn validate <learningId>

# Statistics
memphis learn stats
```

**Options:**
- `list` — List learning records
- `show <id>` — Show learning details
- `mistakes` — Analyze recent mistakes
  - `--since <days>` — Time window
- `apply <id>` — Apply learning changes
- `validate <id>` — Validate learning effectiveness
- `stats` — Show learning statistics
- `--json` — Output JSON

---

#### `memphis strategy`

**Manage decision strategies.**

```bash
# List strategies
memphis strategy list

# Show strategy
memphis strategy show <strategyId>

# Create new strategy
memphis strategy create --name "Conservative" --min-confidence 0.8

# Update strategy
memphis strategy update <strategyId> --param min-confidence --value 0.9

# Activate strategy
memphis strategy activate <strategyId>

# A/B test strategies
memphis strategy abtest --A <strategyA> --B <strategyB> --duration 7

# Evolution (auto-improve)
memphis strategy evolve

# Performance comparison
memphis strategy compare
```

**Options:**
- `list` — List all strategies
- `show <id>` — Show strategy details
- `create` — Create new strategy
  - `--name <name>` — Strategy name
  - `--description <text>` — Description
- `update <id>` — Update strategy
  - `--param <param>` — Parameter name
  - `--value <value>` — New value
- `activate <id>` — Set as active strategy
- `abtest` — Run A/B test
  - `--A <id>` — Strategy A
  - `--B <id>` — Strategy B
  - `--duration <days>` — Test duration
- `evolve` — Trigger strategy evolution
- `compare` — Compare strategy performance
- `--json` — Output JSON

---

### Model E Testing Strategy

**Unit Tests:**
- `tests/meta-cognitive/reflection-engine.test.ts`
  - Quality reflection generation
  - Pattern detection
  - Mistake analysis
  - Comparative analysis
  - Confidence calibration

- `tests/meta-cognitive/learning-loop.test.ts`
  - Mistake detection
  - Root cause analysis
  - Learning application
  - Learning validation
  - Pattern updates

- `tests/meta-cognitive/strategy-evolver.test.ts`
  - Strategy creation
  - Strategy updates
  - A/B test simulation
  - Performance comparison
  - Evolution logic

- `tests/meta-cognitive/performance-tracker.test.ts`
  - Metric tracking
  - Benchmark evaluation
  - Time series aggregation
  - Dimension filtering

**Integration Tests:**
- `tests/meta-cognitive/integration.test.ts`
  - Reflection → Learning → Strategy pipeline
  - Mistake → Improvement loop
  - Cross-model learning (C→D→E)
  - Performance feedback loop

---

## 4-Week Implementation Timeline

### Week 1: Foundation

**Model D (Collective):**
- [ ] Day 1-2: Types and interfaces
  - Create `src/collective/types.ts`
  - Define all TypeScript interfaces
  - Write interface tests

- [ ] Day 3-4: Voting Engine
  - Create `src/collective/voting-engine.ts`
  - Implement majority, supermajority, unanimous voting
  - Implement ranked voting (IRV)
  - Implement weighted voting
  - Write tests

- [ ] Day 5: Agent Registry
  - Create `src/collective/agent-registry.ts`
  - Implement agent management
  - Pre-register domain agents
  - Write tests

**Model E (Meta-Cognitive):**
- [ ] Day 1-2: Types and interfaces
  - Create `src/meta-cognitive/types.ts`
  - Define all TypeScript interfaces
  - Write interface tests

- [ ] Day 3-5: Reflection Engine
  - Create `src/meta-cognitive/reflection-engine.ts`
  - Implement quality reflection
  - Implement pattern detection
  - Implement mistake analysis
  - Write tests

---

### Week 2: Core Logic

**Model D (Collective):**
- [ ] Day 6-7: Consensus Mechanism
  - Create `src/collective/consensus-mechanism.ts`
  - Implement threshold consensus
  - Implement conflict resolution
  - Implement timeout handling
  - Write tests

- [ ] Day 8-9: Reputation Tracker
  - Create `src/collective/reputation-tracker.ts`
  - Implement reputation calculation
  - Implement domain-specific scoring
  - Implement time-based decay
  - Implement history tracking
  - Write tests

- [ ] Day 10: Collective Memory
  - Create `src/collective/collective-memory.ts`
  - Implement memory aggregation
  - Implement agreement scoring
  - Write tests

**Model E (Meta-Cognitive):**
- [ ] Day 6-7: Learning Loop
  - Create `src/meta-cognitive/learning-loop.ts`
  - Implement mistake detection
  - Implement root cause analysis
  - Implement learning application
  - Write tests

- [ ] Day 8-10: Performance Tracker
  - Create `src/meta-cognitive/performance-tracker.ts`
  - Implement metric tracking
  - Implement benchmark evaluation
  - Implement time series aggregation
  - Write tests

---

### Week 3: Advanced Features & Integration

**Model D (Collective):**
- [ ] Day 11-12: Advanced Voting
  - Implement Borda count
  - Implement approval voting
  - Implement delegation
  - Implement proxy voting
  - Write tests

- [ ] Day 13-14: Integration with Models A+B+C
  - Import decisions from Model A+B
  - Use Model C patterns in agent reasoning
  - Collective memory from Model A+B decisions
  - Write integration tests

- [ ] Day 15: Documentation for Model D
  - Write guide (`docs/MODEL-D-GUIDE.md`)
  - Document CLI commands
  - Add examples

**Model E (Meta-Cognitive):**
- [ ] Day 11-12: Strategy Evolver
  - Create `src/meta-cognitive/strategy-evolver.ts`
  - Implement strategy creation
  - Implement strategy updates
  - Implement A/B testing
  - Implement evolution logic
  - Write tests

- [ ] Day 13-14: Advanced Reflection
  - Implement comparative analysis (A vs B vs C)
  - Implement confidence calibration
  - Implement anomaly detection
  - Write tests

- [ ] Day 15: Integration with Models A+B+C+D
  - Reflect on all models
  - Learn from Model C predictions
  - Learn from Model D consensus
  - Write integration tests

---

### Week 4: CLI, Testing, Polish

**Model D (Collective):**
- [ ] Day 16-17: CLI Commands
  - Create `src/cli/commands/vote.ts`
  - Create `src/cli/commands/consensus.ts`
  - Create `src/cli/commands/reputation.ts`
  - Register in `src/cli/index.ts`
  - Write CLI tests

- [ ] Day 18-19: Full Test Suite
  - Integration tests
  - Performance tests
  - Edge case tests
  - Fix bugs

- [ ] Day 20: Final Polish
  - Code review
  - Documentation review
  - Performance optimization

**Model E (Meta-Cognitive):**
- [ ] Day 16-17: CLI Commands
  - Create `src/cli/commands/reflect.ts` (extend existing)
  - Create `src/cli/commands/learn.ts`
  - Create `src/cli/commands/strategy.ts`
  - Register in `src/cli/index.ts`
  - Write CLI tests

- [ ] Day 18-19: Full Test Suite
  - Integration tests
  - Performance tests
  - Edge case tests
  - Fix bugs

- [ ] Day 20: Final Polish
  - Code review
  - Documentation review
  - Performance optimization
  - Write guide (`docs/MODEL-E-GUIDE.md`)

---

### Final Week: Cross-Model Integration

**Days 21-28: System Integration**
- [ ] Cross-model integration tests
- [ ] End-to-end workflows
  - Decision → Collective vote → Reflection → Learning → Strategy update
  - Pattern → Prediction → Consensus → Validation
- [ ] Performance benchmarking
- [ ] Documentation finalization
  - Architecture diagram
  - API reference
  - Examples
- [ ] Release preparation
  - Version bump
  - Changelog
  - Release notes

---

## Integration with Existing Models

### Model A (Conscious) → Model D (Collective)
- User decisions become proposals
- User acts as voting agent
- Track user reputation

### Model B (Inferred) → Model D (Collective)
- Detected decisions become proposals
- Inferred agent as voting participant
- Evidence from git commits

### Model C (Predictive) → Model D (Collective)
- Patterns inform agent preferences
- Predictions become voting options
- Confidence influences voting weights

### Model D (Collective) → Model A (Conscious)
- Consensus results as suggested decisions
- Agent recommendations as context
- Reputation-based prioritization

### Model C (Predictive) → Model E (Meta-Cognitive)
- Track prediction accuracy
- Learn from prediction errors
- Improve pattern weights

### Model D (Collective) → Model E (Meta-Cognitive)
- Reflect on consensus quality
- Learn from agent disagreements
- Evolve voting strategies

### Model E (Meta-Cognitive) → All Models
- Reflection insights inform parameters
- Learning updates patterns
- Strategy evolution changes behavior

---

## Configuration

### Model D Configuration

```yaml
# ~/.memphis/config.yaml
collective:
  enabled: true
  agents:
    - id: security
      role: security
      active: true
    - id: performance
      role: performance
      active: true
    - id: ux
      role: ux
      active: true
  voting:
    defaultMethod: majority
    minParticipation: 0.5
    consensusThreshold: 0.75
    timeout: 30000  # 30s
    enableDelegation: true
  reputation:
    decayRate: 0.01  # per day
    minScore: 0.0
    maxScore: 1.0
```

### Model E Configuration

```yaml
# ~/.memphis/config.yaml
metaCognitive:
  enabled: true
  reflection:
    interval: 24  # hours
    minDecisions: 10
    depth:
      - quality
      - patterns
      - mistakes
  learning:
    autoApply: true
    validationWindow: 7  # days
    maxLearningPerDay: 5
  strategy:
    evolutionInterval: 7  # days
    abTestDuration: 14  # days
    minSampleSize: 50
  performance:
    metrics:
      - accuracy
      - speed
      - satisfaction
    benchmarks:
      - metric: accuracy
        target: 0.8
        minimum: 0.7
```

---

## Data Storage

### Model D Storage

- `~/.memphis/collective/agents.json` — Agent registry
- `~/.memphis/collective/proposals.json` — Proposals
- `~/.memphis/collective/votes.json` — Votes
- `~/.memphis/collective/reputation.json` — Reputation scores
- `~/.memphis/collective/consensus.json` — Consensus records

### Model E Storage

- `~/.memphis/meta-cognitive/reflections.json` — Reflection reports
- `~/.memphis/meta-cognitive/learning.json` — Learning records
- `~/.memphis/meta-cognitive/strategies.json` — Strategies
- `~/.memphis/meta-cognitive/performance.json` — Performance metrics
- `~/.memphis/meta-cognitive/benchmarks.json` — Benchmarks

---

## Success Criteria

### Model D (Collective) - Complete When:
- [x] All TypeScript interfaces defined and tested
- [ ] Voting engine passes 100% of tests
- [ ] Consensus mechanism passes 100% of tests
- [ ] Reputation tracker passes 100% of tests
- [ ] CLI commands working (vote, consensus, reputation)
- [ ] Integration with Models A+B+C working
- [ ] Documentation complete
- [ ] Performance targets met (<1000ms for consensus)

### Model E (Meta-Cognitive) - Complete When:
- [x] All TypeScript interfaces defined and tested
- [ ] Reflection engine passes 100% of tests
- [ ] Learning loop passes 100% of tests
- [ ] Strategy evolver passes 100% of tests
- [ ] Performance tracker passes 100% of tests
- [ ] CLI commands working (reflect, learn, strategy)
- [ ] Integration with all models working
- [ ] Documentation complete
- [ ] Learning loop functional (mistake → improvement)

---

## Definition of Done

Both Models D and E are complete when:

1. **Code**
   - [ ] All TypeScript files written
   - [ ] Strict mode enabled
   - [ ] No linting errors
   - [ ] Code follows existing patterns

2. **Testing**
   - [ ] Unit tests passing (>90% coverage)
   - [ ] Integration tests passing
   - [ ] Performance tests passing
   - [ ] No known bugs

3. **Documentation**
   - [ ] Implementation guides written
   - [ ] CLI commands documented
   - [ ] API reference complete
   - [ ] Examples provided

4. **Integration**
   - [ ] Integrated with Models A+B+C
   - [ ] CLI commands registered
   - [ ] Configuration documented
   - [ ] End-to-end workflows tested

5. **Performance**
   - [ ] Voting <500ms
   - [ ] Consensus <1000ms
   - [ ] Reflection <2000ms
   - [ ] Learning <500ms

---

## Next Steps

1. ✅ Review and approve this roadmap
2. Start Week 1: Foundation
3. Track progress in project management
4. Weekly reviews and adjustments
5. Final integration and testing

---

**Created:** 2026-03-03
**Status:** Ready for Implementation
**Owner:** Memphis Team
