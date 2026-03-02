# Memphis Real-World Examples

**Version:** 2.0.0  
**Date:** 2026-03-02

---

## 📋 Table of Contents

- [Getting Started Examples](#getting-started-examples)
- [Model A: Conscious Decisions](#model-a-conscious-decisions)
- [Model B: Inferred Decisions](#model-b-inferred-decisions)
- [Model C: Predictive Decisions](#model-c-predictive-decisions)
- [Advanced Workflows](#advanced-workflows)
- [Team Use Cases](#team-use-cases)
- [Integration Examples](#integration-examples)

---

## Getting Started Examples

### Example 1: First Time Setup

**Scenario:** You just installed Memphis and want to start tracking decisions.

```bash
# 1. Clone and build
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install && npm run build

# 2. Initialize (interactive)
node dist/cli/index.js init

# Output:
# ╔═══════════════════════════════════════════════════════════╗
# ║           Memphis Brain — Setup Wizard 🧠                ║
# ╚═══════════════════════════════════════════════════════════╝
#
# 🔍 Detecting environment...
#
#   ✓ Node.js v25.6.1
#   ✓ Ollama (http://127.0.0.1:11434)
#     Available models: qwen2.5-coder, llama3.1
#
# ? Recommended provider: ollama/qwen2.5-coder
#   Use recommended? (Y/n): Y
#
# ✓ Created ~/.memphis/config.yaml
# ✓ Created ~/.memphis/chains

# 3. Verify installation
node dist/cli/index.js doctor

# Output:
# ✓ All systems healthy! 9/9 checks passed
```

**Time:** 5 minutes

---

### Example 2: Quick Decision

**Scenario:** You made a quick tech decision and want to capture it.

```bash
# Setup alias (one-time)
./scripts/setup-frictionless.sh

# Capture instantly
md "use PostgreSQL not MongoDB for main DB"

# Output:
# ✓ [decisions#1] a1b2c3d4e5f6...
# ⚡ 92ms
```

**Time:** <1 second

---

## Model A: Conscious Decisions

### Example 3: Technical Decision

**Scenario:** Choosing between REST and GraphQL for a new API.

```bash
memphis decide "API Architecture" "GraphQL" \
  --reasoning "Flexible queries for frontend, reduces overfetching" \
  --options "REST|GraphQL|gRPC" \
  --scope project \
  --tags tech,api,backend \
  --confidence 0.85

# Output:
# ✓ [decisions#5] f8e7d6c5b4a3...
# ℹ Decision saved: 0b3f9e6acbefc3e4 (conscious, active, project)
# ℹ Title: API Architecture
# ℹ Chosen: GraphQL
```

**Why this matters:** 6 months later, you'll remember WHY you chose GraphQL when someone asks.

---

### Example 4: Business Decision

**Scenario:** Deciding pricing strategy for a SaaS product.

```bash
memphis decide "Pricing Model" "Tiered pricing with free tier" \
  --reasoning "Free tier drives adoption, tiered pricing captures enterprise value" \
  --options "Flat rate|Tiered|Usage-based|Tiered with free tier" \
  --scope life \
  --tags business,pricing,strategy \
  --confidence 0.75

# Output:
# ✓ [decisions#8] 1234567890ab...
```

---

### Example 5: Revising a Decision

**Scenario:** You decided to use REST, but after 2 months realized GraphQL would be better.

```bash
# Show old decision
memphis show decision dec_abc123

# Output:
# ID: dec_abc123
# Title: API Architecture
# Chosen: REST
# Reasoning: Simpler to implement

# Revise it
memphis revise dec_abc123 "GraphQL" \
  --reasoning "Frontend team needs flexible queries, REST causing overfetching"

# Output:
# ✓ [decisions#12] new_hash...
# ℹ Decision revised: dec_abc123 → dec_new
# ℹ Old decision status: deprecated
```

**Effect:** Old decision marked deprecated, new decision created with reference to old.

---

### Example 6: Contradicting a Decision

**Scenario:** You realize a past decision was wrong.

```bash
memphis contradict dec_abc123 \
  --evidence "Caused 3x slower page load times, switched back to REST"

# Output:
# ✓ Decision contradicted
# ℹ Status: deprecated
# ℹ Confidence reduced to 0.2
```

---

### Example 7: Reinforcing a Decision

**Scenario:** 6 months later, your decision proved to be correct.

```bash
memphis reinforce dec_abc123 \
  --evidence "Still the best choice after 6 months, zero issues"

# Output:
# ✓ Decision reinforced
# ℹ Confidence increased to 0.95
```

---

## Model B: Inferred Decisions

### Example 8: Git History Analysis

**Scenario:** You've been coding for 30 days and want to see what decisions Memphis can detect.

```bash
memphis infer --since 30

# Output:
# ╔═══════════════════════════════════════════════════════════╗
# ║           Memphis Decision Inference Engine 🧠            ║
# ╚═══════════════════════════════════════════════════════════╝
#
#   Analyzed commits from last 30 days
#   Total detected: 20
#   High confidence: 15
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
#
#   3. 🟢 [75%] Migrated from REST to GraphQL
#      Type: technical | Category: architecture
#      Evidence: commit f59ae39
```

---

### Example 9: Interactive Inference

**Scenario:** You want to review each detected decision and decide which to save.

```bash
memphis infer --prompt --since 7

# Output:
# 
# Detected Decision #1 of 6:
# ─────────────────────────────────────────────────────────
# Title: Refactored addBlock to appendBlock
# Confidence: 83%
# Evidence: commit a6b88d0
#
# Save as conscious decision? (y/n/e=edit/s=skip): y
#
# ✓ Saved as decision#15
#
# Detected Decision #2 of 6:
# ─────────────────────────────────────────────────────────
# Title: Using navigateTo instead of navigateToMenu
# Confidence: 77%
# Evidence: commit 74c8dd5
#
# Save as conscious decision? (y/n/e=edit/s=skip): n
#
# ✓ Skipped
```

---

### Example 10: Finding Undocumented Decisions

**Scenario:** You're documenting a project and realize many decisions weren't recorded.

```bash
# 1. Detect all decisions from project lifetime
memphis infer --since 365 --min-confidence 0.7 > decisions.txt

# 2. Review the file
cat decisions.txt

# 3. Import important ones interactively
memphis infer --prompt --since 365 --min-confidence 0.8
```

**Use case:** "Decision archaeology" for legacy projects.

---

## Model C: Predictive Decisions

### Example 11: Pattern Learning

**Scenario:** You've made 50+ decisions and want to enable predictions.

```bash
memphis predict --learn --since 90

# Output:
# 📚 Learning patterns from last 90 days...
#
# 📚 Analyzing 52 decisions...
# 🔍 Found 8 context groups
# ✅ Created 5 new patterns
#    Total patterns: 5
#    Avg occurrences: 10.4
#
# 🔮 Analyzing current context...
#
# 🔮 PREDICTED DECISIONS
#
# No predictions available yet.
#
# 💡 Make predictions with: memphis predict
```

---

### Example 12: Getting Predictions

**Scenario:** You're starting a new feature and want Memphis to suggest what you'll likely decide.

```bash
memphis predict

# Output:
# 🔮 PREDICTED DECISIONS
#
# Based on your current work (5 files, 2 commits today):
#
# 1. 🟢 [85%] Use TypeScript for new features
#    Type: technical
#    Evidence: 12 similar decisions • 87% accuracy
#
# 2. 🟡 [72%] Use PostgreSQL for data storage
#    Type: technical
#    Evidence: 8 similar decisions • 80% accuracy
#
# 3. 🟡 [68%] Add unit tests
#    Type: technical
#    Evidence: 6 similar decisions • 75% accuracy
#
# 📊 Stats: 3/5 patterns matched
#    Avg confidence: 75%
```

**Value:** You can accept predictions quickly, saving decision capture time.

---

### Example 13: Proactive Suggestions

**Scenario:** Memphis runs in background and notifies you when it has a good prediction.

```bash
# Start daemon (runs every 30 minutes)
./scripts/model-c-daemon.sh &

# Or check manually
memphis suggest --force

# Output:
# 🔔 PROACTIVE SUGGESTIONS
#
# Based on your current context:
#
# 1. 🟢 [85%] Use TypeScript for new features
#    Evidence: 12 similar decisions • 87% accuracy
#
# Actions:
#   [a] Accept
#   [n] None
#   [c] Custom
#   [i] Ignore
#
# Your choice: a
#
# ✓ Saved as decision#20
```

---

### Example 14: Tracking Accuracy

**Scenario:** You've been using predictions for a month and want to see how accurate they are.

```bash
memphis accuracy

# Output:
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
#
# 2. [80%] Use PostgreSQL
#    8 predictions, stable ➡️
#
# ⚠️  NEEDS IMPROVEMENT:
# 1. [45%] Use REST API
#    5 predictions, declining ⬇️
#    Consider: More training data or context mismatch
```

---

## Advanced Workflows

### Example 15: Decision Archaeology

**Scenario:** You joined a project and want to understand why certain choices were made.

```bash
# 1. Search for relevant decisions
memphis recall "database"

# Output:
# Found 5 relevant entries:
#
# 1. [decision#12] Database choice
#    Chosen: PostgreSQL
#    Reasoning: Better JSON support
#    Date: 2026-03-01
#
# 2. [decision#8] ORM selection
#    Chosen: Prisma
#    Reasoning: Type-safe, good DX
#    Date: 2026-02-15

# 2. Show decision chain
memphis show decision dec_abc123 --history

# Output:
# Decision History:
#
# 1. [decision#8] Database choice → PostgreSQL
#    Reasoning: Better JSON support
#    Date: 2026-02-15
#
# 2. [decision#12] Revised → CockroachDB
#    Reasoning: Need distributed SQL
#    Date: 2026-03-01
#
# 3. [decision#15] Revised → PostgreSQL
#    Reasoning: CockroachDB too complex for our scale
#    Date: 2026-03-10
```

---

### Example 16: Weekly Decision Review

**Scenario:** Every Friday, review decisions made this week.

```bash
# Create a script: weekly-review.sh
#!/bin/bash

echo "📊 WEEKLY DECISION REVIEW"
echo "========================="
echo ""

# Decisions this week
echo "NEW DECISIONS:"
memphis decisions --recent 7 --status active

echo ""
echo "REVISED DECISIONS:"
memphis decisions --recent 7 --status revised

echo ""
echo "PREDICTIONS ACCURACY:"
memphis accuracy

echo ""
echo "PATTERNS HEALTH:"
memphis patterns stats
```

---

### Example 17: Pre-Meeting Prep

**Scenario:** You have an architecture review meeting and want to recall past decisions.

```bash
# Quick summary
memphis ask "What decisions did we make about the API?"

# Output:
# Searching memory for: "What decisions did we make about the API?"
#
# Found 8 relevant entries:
#
# 1. [decision#5] API Architecture → GraphQL
#    Reasoning: Flexible queries for frontend
#    Date: 2026-02-20
#
# 2. [decision#8] Authentication → JWT
#    Reasoning: Stateless, scalable
#    Date: 2026-02-22
#
# 3. [decision#12] Rate Limiting → Redis
#    Reasoning: Fast, distributed
#    Date: 2026-02-25

# Export for meeting notes
memphis recall "API" --chain decisions --json > api-decisions.json
```

---

## Team Use Cases

### Example 18: Onboarding Documentation

**Scenario:** New developer joins team, needs to understand project decisions.

```bash
# Export all decisions
memphis decisions --status active --json > team-decisions.json

# Create readable doc
memphis decisions --recent 365 > ONBOARDING-DECISIONS.md

# New developer reads it
cat ONBOARDING-DECISIONS.md
```

**Benefit:** New developer understands WHY, not just WHAT.

---

### Example 19: Team Decision Sync

**Scenario:** Two developers working on same codebase need to sync decisions.

```bash
# Developer A pushes decisions
memphis share-sync --push

# Output:
# ⬆️  Pushing to IPFS...
# ✓ CID: QmXyz...
# ✓ Manifest updated

# Developer B pulls
memphis share-sync --pull

# Output:
# ⬇️  Pulling from IPFS...
# ✓ 3 new decisions synced
# ✓ 2 new journal entries synced
```

---

### Example 20: Trade Decisions

**Scenario:** Team A wants to share API decisions with Team B.

```bash
# Team A creates trade
memphis trade create did:memphis:team-b \
  --blocks decisions:0-100 \
  --ttl 7

# Output:
# 📦 Trade Manifest Created
#
# Recipient: did:memphis:team-b
# Blocks: 100 decisions
# TTL: 7 days
# Manifest: trade-manifest.json

# Team B accepts
memphis trade accept trade-manifest.json

# Output:
# ✓ 100 decisions imported
# ✓ Chain verified
```

---

## Integration Examples

### Example 21: Git Hook Integration

**Scenario:** Auto-detect decisions on every commit.

```bash
# .git/hooks/post-commit
#!/bin/bash

# Get commit message
MESSAGE=$(git log -1 --pretty=%B)

# Check if it's a decision-worthy commit
if echo "$MESSAGE" | grep -qiE "(refactor|migrate|switch|choose|implement)"; then
  # Prompt to capture
  echo "💡 Potential decision detected in commit"
  memphis infer --since 1 --prompt
fi
```

---

### Example 22: IDE Integration (VS Code)

**Scenario:** Quick decision capture from editor.

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Capture Decision",
      "type": "shell",
      "command": "memphis decide-fast",
      "problemMatcher": [],
      "presentation": {
        "echo": true,
        "reveal": "always",
        "panel": "shared"
      }
    }
  ]
}
```

**Usage:** Cmd+Shift+P → "Tasks: Run Task" → "Capture Decision"

---

### Example 23: Slack Bot Integration

**Scenario:** Team decisions via Slack.

```javascript
// slack-bot.js
const { WebClient } = require('@slack/web-api');
const { execSync } = require('child_process');

const client = new WebClient(process.env.SLACK_TOKEN);

app.command('/decide', async ({ command, ack, respond }) => {
  await ack();
  
  const [title, chosen] = command.text.split('|').map(s => s.trim());
  
  // Execute Memphis command
  const result = execSync(
    `memphis decide "${title}" "${chosen}" --scope project`
  ).toString();
  
  await respond({
    response_type: 'in_channel',
    text: `✅ Decision recorded: ${title} → ${chosen}`
  });
});
```

**Usage:** `/decide Use PostgreSQL | PostgreSQL`

---

### Example 24: CI/CD Integration

**Scenario:** Track deployment decisions.

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Record deployment decision
        run: |
          memphis decide "Deploy to production" "yes" \
            --reasoning "All tests passed, ready for release" \
            --scope project \
            --tags deployment,production
      
      - name: Deploy
        run: ./deploy.sh
```

---

### Example 25: Dashboard Integration

**Scenario:** Custom web dashboard showing decision stats.

```javascript
// dashboard.js
const express = require('express');
const { execSync } = require('child_process');

const app = express();

app.get('/api/decisions', (req, res) => {
  const decisions = execSync('memphis decisions --json').toString();
  res.json(JSON.parse(decisions));
});

app.get('/api/accuracy', (req, res) => {
  const accuracy = execSync('memphis accuracy --json').toString();
  res.json(JSON.parse(accuracy));
});

app.get('/api/predictions', (req, res) => {
  const predictions = execSync('memphis predict --json').toString();
  res.json(JSON.parse(predictions));
});

app.listen(3000);
```

---

## Performance Examples

### Example 26: Frictionless Capture Benchmark

```bash
# Setup
./scripts/setup-frictionless.sh

# Test performance
time md "test decision"

# Output:
# ✓ [decisions#20] hash...
# ⚡ 92ms
#
# real    0m0.092s
# user    0m0.045s
# sys     0m0.030s
```

**Result:** 92ms average (target: <100ms) ✅

---

### Example 27: Pattern Learning Benchmark

```bash
# Time pattern learning
time memphis predict --learn --since 90

# Output:
# 📚 Learning patterns from last 90 days...
# ...
# ✅ Created 5 new patterns
#
# real    0m1.049s
# user    0m0.620s
# sys     0m0.180s
```

**Result:** 1049ms (target: <2000ms) ✅

---

## Summary

**Memphis helps you:**

1. ✅ Track decisions effortlessly (<100ms capture)
2. ✅ Detect decisions automatically (git inference)
3. ✅ Predict decisions proactively (pattern learning)
4. ✅ Recall decisions instantly (semantic search)
5. ✅ Share decisions with team (sync & trade)
6. ✅ Document project history (decision archaeology)

**Total examples in this guide:** 27

---

**Version:** 2.0.0  
**Last Updated:** 2026-03-02
