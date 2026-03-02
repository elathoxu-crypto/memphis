# Testing Guide

**Version:** 2.0.0  
**Date:** 2026-03-02

---

## 📋 Table of Contents

- [Test Overview](#test-overview)
- [Running Tests](#running-tests)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [Performance Tests](#performance-tests)
- [Manual Testing](#manual-testing)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)

---

## Test Overview

**Memphis has multiple test suites:**

| Type | Count | Purpose |
|------|-------|---------|
| **Unit Tests** | 182+ | Test individual functions |
| **Integration Tests** | 8+ | Test component interactions |
| **Performance Tests** | 8 | Validate performance targets |
| **Smoke Tests** | 15+ | Basic functionality |

---

## Running Tests

### All Tests

```bash
# Run all tests
npm test

# Output:
# Test Files  25 passed (25)
#      Tests  182 passed (182)
#   Duration  12.34s
```

---

### Unit Tests Only

```bash
# Run unit tests
npm run test:unit

# Or with Vitest
npx vitest run src/**/*.test.ts
```

---

### Integration Tests Only

```bash
# Run integration tests
npm run test:integration

# Or manually
bash scripts/test-model-c.sh
```

---

### Watch Mode

```bash
# Watch for changes
npm run test:watch

# Or with Vitest
npx vitest watch
```

---

### Specific Test File

```bash
# Run specific file
npx vitest run src/decision/pattern-learner.test.ts

# Run specific test
npx vitest run -t "should learn patterns"
```

---

## Unit Tests

### Test Structure

```
src/
├── decision/
│   ├── pattern-learner.ts
│   ├── pattern-learner.test.ts
│   ├── inference-engine.ts
│   ├── inference-engine.test.ts
│   └── ...
├── cli/
│   ├── commands/
│   │   ├── decide.test.ts
│   │   └── ...
│   └── ...
└── ...
```

---

### Example Unit Test

```typescript
// src/decision/pattern-learner.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PatternLearner } from './pattern-learner';

describe('PatternLearner', () => {
  let learner: PatternLearner;

  beforeEach(() => {
    learner = new PatternLearner();
  });

  describe('learnFromHistory', () => {
    it('should learn patterns from decisions', async () => {
      // Arrange
      const decisions = [
        createMockDecision({ title: 'Use TypeScript' }),
        createMockDecision({ title: 'Use TypeScript' }),
        createMockDecision({ title: 'Use TypeScript' }),
      ];

      // Act
      const patterns = await learner.learnFromHistory(decisions);

      // Assert
      expect(patterns).toHaveLength(1);
      expect(patterns[0].occurrences).toBe(3);
      expect(patterns[0].confidence).toBeGreaterThan(0.7);
    });

    it('should require minimum 3 occurrences', async () => {
      const decisions = [
        createMockDecision({ title: 'Use X' }),
        createMockDecision({ title: 'Use X' }),
      ];

      const patterns = await learner.learnFromHistory(decisions);

      expect(patterns).toHaveLength(0);
    });
  });
});
```

---

### Test Categories

#### **Model A Tests** (`src/decision/`)

- Decision creation
- Block appending
- Lifecycle management (revise/contradict/reinforce)

```bash
npx vitest run src/decision/decide.test.ts
```

---

#### **Model B Tests** (`src/decision/`)

- Inference engine
- Pattern detection
- Git analysis

```bash
npx vitest run src/decision/inference-engine.test.ts
```

---

#### **Model C Tests** (`src/decision/`)

- Pattern learning
- Context matching
- Prediction generation
- Accuracy tracking

```bash
npx vitest run src/decision/pattern-learner.test.ts
npx vitest run src/decision/prediction-engine.test.ts
```

---

#### **Chain Tests** (`src/chain/`)

- Block creation
- Hash calculation
- Chain integrity

```bash
npx vitest run src/chain/store.test.ts
```

---

## Integration Tests

### Model C Integration Test Suite

**Location:** `scripts/test-model-c.sh`

**Tests:**
1. Pattern learning
2. Context analysis
3. Pattern listing
4. Pattern stats
5. Proactive suggestions
6. Accuracy tracking
7. JSON output
8. Performance

**Run:**
```bash
bash scripts/test-model-c.sh
```

**Expected output:**
```
🧪 MODEL C INTEGRATION TEST SUITE
==================================

Test 1: Pattern learning
  ✅ PASS

Test 2: Context analysis
  ✅ PASS

Test 3: Pattern listing
  ✅ PASS

Test 4: Pattern stats
  ✅ PASS

Test 5: Proactive suggestions
  ✅ PASS

Test 6: Accuracy tracking
  ✅ PASS

Test 7: JSON output (patterns)
  ✅ PASS

Test 8: Performance (<1000ms)
  ✅ PASS (660ms)

==================================
RESULTS
==================================
Total: 8
Passed: 8
Failed: 0

✅ ALL TESTS PASSED!
```

---

### End-to-End Tests

**Location:** `scripts/e2e-test.sh` (planned)

**Tests:**
1. Full decision lifecycle
2. Inference → Decision flow
3. Pattern learning → Prediction flow
4. Sync between agents

**Run:**
```bash
bash scripts/e2e-test.sh
```

---

## Performance Tests

### Decision Capture Performance

```bash
# Test frictionless capture
time md "test decision"

# Expected: <100ms
```

**Benchmark script:**
```bash
# scripts/benchmark-capture.sh
#!/bin/bash

echo "Testing decision capture performance..."

for i in {1..10}; do
  start=$(date +%s%N)
  md "test decision $i" > /dev/null 2>&1
  end=$(date +%s%N)
  duration=$(( (end - start) / 1000000 ))
  echo "Run $i: ${duration}ms"
done
```

---

### Pattern Learning Performance

```bash
# Test pattern learning
time memphis predict --learn --since 90

# Expected: <2000ms
```

---

### Prediction Generation Performance

```bash
# Test prediction
time memphis predict

# Expected: <1000ms
```

---

### Search Performance

```bash
# Test semantic search
time memphis recall "test query"

# Expected: <100ms
```

---

## Manual Testing

### Model A Manual Test

```bash
# 1. Create decision
memphis decide "Test decision" "Choice A" \
  --reasoning "Testing Model A"

# 2. Verify
memphis decisions --recent 1

# 3. Revise
memphis revise <id> "Choice B" --reasoning "Changed mind"

# 4. Verify revision
memphis show decision <id>

# 5. Contradict
memphis contradict <id> --evidence "Was wrong"

# 6. Verify status
memphis show decision <id>
```

---

### Model B Manual Test

```bash
# 1. Make some git commits
echo "test" > test.txt
git add test.txt
git commit -m "Migrated from REST to GraphQL"

# 2. Run inference
memphis infer --since 1

# 3. Verify detection
# Should detect "Migrated from REST to GraphQL"

# 4. Interactive mode
memphis infer --prompt --since 1

# 5. Accept decision
# Press 'y' to save
```

---

### Model C Manual Test

```bash
# 1. Make 50+ decisions first
for i in {1..60}; do
  md "test decision $i"
done

# 2. Learn patterns
memphis predict --learn --since 90

# 3. Verify patterns
memphis patterns list

# 4. Generate predictions
memphis predict

# 5. Check accuracy
memphis accuracy

# 6. Test suggestions
memphis suggest --force
```

---

### Integration Manual Test

```bash
# Full flow test

# 1. Create decision (Model A)
memphis decide "API Architecture" "GraphQL" --reasoning "Flexible"

# 2. Make git commit (Model B)
git commit -m "Migrated from REST to GraphQL"

# 3. Run inference
memphis infer --since 1
# Should detect the migration

# 4. After 50+ decisions, train Model C
memphis predict --learn --since 90

# 5. Get predictions
memphis predict

# 6. Search memory
memphis recall "GraphQL"
```

---

## Test Coverage

### Check Coverage

```bash
# Run with coverage
npm run test:coverage

# Output:
# % Stmts  % Branch  % Funcs  % Lines
#   85.23    78.45    90.12    85.67
```

---

### Coverage Report

```bash
# Generate HTML report
npm run test:coverage -- --reporter=html

# Open in browser
open coverage/index.html
```

---

### Coverage Targets

| Component | Target | Current |
|-----------|--------|---------|
| **Core (chain/)** | 90% | 88% |
| **Decision (decision/)** | 85% | 85% |
| **CLI (cli/)** | 75% | 72% |
| **Utilities (utils/)** | 80% | 78% |
| **Overall** | 85% | 85% |

---

## Writing Tests

### Test Template

```typescript
// src/module/file.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MyClass } from './file';

describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    // Setup
    instance = new MyClass();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = 'test';

      // Act
      const result = await instance.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle errors', async () => {
      // Arrange
      const input = null;

      // Act & Assert
      await expect(instance.methodName(input))
        .rejects.toThrow('Invalid input');
    });
  });
});
```

---

### Mocking

```typescript
import { vi } from 'vitest';

// Mock external dependency
vi.mock('ollama', () => ({
  default: {
    generate: vi.fn().mockResolvedValue({ response: 'mocked' }),
  },
}));

// Test with mock
it('should use mocked ollama', async () => {
  const result = await callOllama();
  expect(result).toBe('mocked');
});
```

---

### Test Fixtures

```typescript
// src/test/fixtures.ts
export function createMockDecision(overrides = {}) {
  return {
    id: 'dec_123',
    title: 'Test Decision',
    chosen: 'Choice A',
    timestamp: new Date().toISOString(),
    mode: 'conscious',
    status: 'active',
    confidence: 1.0,
    ...overrides,
  };
}

// Usage
const decision = createMockDecision({
  title: 'Custom Title',
  confidence: 0.8,
});
```

---

### Test Utilities

```typescript
// src/test/utils.ts
export class TestChain {
  async setup() {
    // Create test chain
  }

  async addBlocks(count: number) {
    // Add N blocks
  }

  async teardown() {
    // Clean up
  }
}

// Usage
describe('Chain tests', () => {
  let chain: TestChain;

  beforeEach(async () => {
    chain = new TestChain();
    await chain.setup();
  });

  afterEach(async () => {
    await chain.teardown();
  });
});
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Run tests before commit
npm test

if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

---

## Test Commands Summary

```bash
# All tests
npm test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npx vitest run src/file.test.ts

# Specific test
npx vitest run -t "test name"

# Update snapshots
npx vitest run --update

# Debug
npx vitest run --inspect
```

---

**Testing Guide Version:** 2.0.0  
**Last Updated:** 2026-03-02
