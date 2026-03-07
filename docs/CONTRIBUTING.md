# Contributing to Memphis

**Version:** 2.0.0  
**Date:** 2026-03-02

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)

---

## Getting Started

### Prerequisites

- Node.js 20+
- Git 2.x+
- Basic TypeScript knowledge
- Familiarity with CLI tools

---

### Initial Setup

**1. Fork and clone:**
```bash
# Fork on GitHub first

# Clone your fork
git clone https://github.com/YOUR_USERNAME/memphis.git
cd memphis
```

**2. Add upstream remote:**
```bash
git remote add upstream https://github.com/elathoxu-crypto/memphis.git
```

**3. Install dependencies:**
```bash
npm install
```

**4. Build project:**
```bash
npm run build
```

**5. Verify installation:**
```bash
node dist/cli/index.js doctor
```

---

### Development Commands

```bash
# Watch mode (auto-rebuild)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Check code quality
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

---

## Development Workflow

### 1. Create Branch

**Naming convention:**
- `feature/add-new-feature`
- `fix/fix-bug-description`
- `docs/update-documentation`
- `refactor/refactor-component`
- `test/add-tests-for-xyz`

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

---

### 2. Make Changes

**Before coding:**
- Check existing issues: https://github.com/elathoxu-crypto/memphis/issues
- Read related code
- Understand existing patterns

**While coding:**
- Write tests first (TDD)
- Follow coding standards (below)
- Write documentation (JSDoc)
- Update CHANGELOG.md

---

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test file
npm test pattern-learner.test.ts

# Run integration tests
npm run test:integration

# Check coverage
npm run test:coverage
```

**Ensure all tests pass:**
- Unit tests: 100% pass
- Integration tests: 100% pass
- Coverage: No decrease

---

### 4. Commit Changes

**Commit message format:**
```
type(scope): subject

body

footer
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `style` — Code style (formatting, etc.)
- `refactor` — Code refactoring
- `test` — Adding or updating tests
- `chore` — Maintenance tasks

**Examples:**
```
feat(decision): add pattern learning engine

Implement pattern learning from decision history.
Extracts patterns with minimum 3 occurrences.

Closes #123

---

fix(inference): handle missing git repo gracefully

Fixed crash when running infer outside git directory.

Fixes #456

---

docs(readme): update installation instructions

Added Ollama installation instructions.
Simplified setup steps.

---

refactor(chain): improve block hashing performance

Optimized SHA256 calculation with caching.
Reduced hashing time by 40%.
```

---

### 5. Push to Fork

```bash
# Push to your fork
git push origin feature/your-feature-name
```

---

### 6. Create Pull Request

**On GitHub:**
1. Go to https://github.com/elathoxu-crypto/memphis
2. Click "Pull Requests"
3. Click "New Pull Request"
4. Select your branch
5. Fill PR template

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests passing

## Documentation
- [ ] API documentation updated
- [ ] README updated
- [ ] CHANGELOG.md updated

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] No new warnings
- [ ] Added tests
- [ ] Documentation updated
```

---

## Coding Standards

### TypeScript Style

**1. Use strict TypeScript:**
```typescript
// Enable strict mode
// tsconfig.json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}

// Always type variables
const name: string = "John";  // ✅
const name = "John";         // ❌ (no type)
```

---

**2. Use interfaces for object shapes:**
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email?: string;
}

// ❌ Avoid
const user = {
  id: string;
  name: string;
} as any;
```

---

**3. Use const by default:**
```typescript
// ✅ Good
const PI = 3.14159;

// ❌ Avoid
let pi = 3.14159;  // Not reassigned
```

---

### Naming Conventions

**1. CamelCase for variables/functions:**
```typescript
const userName = "John";
function getUser() { }
```

**2. PascalCase for classes/interfaces:**
```typescript
class PatternLearner { }
interface Decision { }
```

**3. UPPER_CASE for constants:**
```typescript
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;
```

**4. snake_case for files:**
```
pattern-learner.ts
inference-engine.ts
decision-store.ts
```

---

### Code Organization

**File structure:**
```
src/
├── decision/           # Model A/B/C code
│   ├── decide.ts
│   ├── inference.ts
│   └── predict.ts
├── chain/              # Chain storage
│   ├── store.ts
│   └── block.ts
├── cli/                # CLI commands
│   ├── commands/
│   └── index.ts
├── utils/              # Utilities
│   └── helpers.ts
└── index.ts           # Main entry
```

---

**One responsibility per file:**
```typescript
// ✅ Good: Single responsibility
class PatternLearner {
  async learn(): Promise<Pattern[]> { }
}

// ❌ Avoid: Multiple responsibilities
class DecisionManager {
  async capture(): Promise<Decision> { }
  async infer(): Promise<Decision[]> { }
  async predict(): Promise<Prediction[]> { }
}
```

---

### Error Handling

**Use custom errors:**
```typescript
// Define error class
class MemphisError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MemphisError';
  }
}

// Use error
throw new MemphisError('Pattern not found', 'PATTERN_NOT_FOUND');
```

**Async error handling:**
```typescript
// ✅ Good
async function loadPattern(id: string): Promise<Pattern> {
  const pattern = await store.get(id);
  if (!pattern) {
    throw new MemphisError('Pattern not found', 'PATTERN_NOT_FOUND');
  }
  return pattern;
}

// ❌ Avoid
async function loadPattern(id: string): Promise<Pattern> {
  return store.get(id);  // Might return null
}
```

---

### JSDoc Documentation

**Document all public APIs:**
```typescript
/**
 * Learn patterns from decision history
 * 
 * @param sinceDays - Number of days to analyze
 * @param minOccurrences - Minimum occurrences to form pattern
 * @returns Array of learned patterns
 * @throws MemphisError if decision history is empty
 * 
 * @example
 * ```ts
 * const patterns = await learner.learnFromHistory(30, 3);
 * console.log(`Learned ${patterns.length} patterns`);
 * ```
 */
async learnFromHistory(
  sinceDays: number,
  minOccurrences: number = 3
): Promise<Pattern[]> {
  // Implementation
}
```

---

## Testing

### Test Structure

```typescript
// src/decision/pattern-learner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PatternLearner } from './pattern-learner';

describe('PatternLearner', () => {
  let learner: PatternLearner;

  beforeEach(() => {
    learner = new PatternLearner();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('learnFromHistory', () => {
    it('should learn patterns from decisions', async () => {
      // Arrange
      const decisions = createMockDecisions(10);

      // Act
      const patterns = await learner.learnFromHistory(decisions);

      // Assert
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].occurrences).toBeGreaterThanOrEqual(3);
    });

    it('should require minimum 3 occurrences', async () => {
      const decisions = createMockDecisions(2);

      const patterns = await learner.learnFromHistory(decisions);

      expect(patterns).toHaveLength(0);
    });
  });
});
```

---

### Test Coverage

**Target coverage:**
- Overall: 85%
- Core logic (chain/, decision/): 90%
- CLI: 75%
- Utilities: 80%

**Check coverage:**
```bash
npm run test:coverage
```

---

### Writing Good Tests

**1. Test one thing:**
```typescript
// ✅ Good: Single assertion
it('should create pattern with correct id', () => {
  const pattern = createPattern();
  expect(pattern.id).toBe('pattern_123');
});

// ❌ Avoid: Multiple assertions
it('should create pattern', () => {
  const pattern = createPattern();
  expect(pattern.id).toBe('pattern_123');
  expect(pattern.title).toBe('Test');
  expect(pattern.occurrences).toBe(1);
});
```

---

**2. Use descriptive test names:**
```typescript
// ✅ Good: Descriptive
it('should reject pattern with fewer than 3 occurrences', () => { });

// ❌ Avoid: Vague
it('should handle patterns', () => { });
```

---

**3. Arrange-Act-Assert:**
```typescript
it('should learn patterns', async () => {
  // Arrange
  const decisions = createMockDecisions(10);

  // Act
  const patterns = await learner.learn(decisions);

  // Assert
  expect(patterns).toHaveLength(3);
});
```

---

## Documentation

### Documentation Requirements

**For new features:**
- [ ] JSDoc comments for all public APIs
- [ ] Examples in JSDoc
- [ ] Update README.md
- [ ] Add to CHANGELOG.md
- [ ] Create/update guide in docs/
- [ ] Add examples to EXAMPLES.md

---

### Documentation Style

**Tone:** Helpful, clear, concise

**Language:** Simple, jargon-free

**Examples:** Copy-paste ready

**Structure:**
1. Overview
2. Installation/Setup
3. Usage
4. Examples
5. API Reference
6. Troubleshooting

---

### Markdown Style

```markdown
# H1 — Document title

## H2 — Main section

### H3 — Subsection

**Bold text** for emphasis

`code` for inline code

\`\`\`
code blocks
\`\`\`

- Lists
  - Nested items

1. Numbered lists
   1. Nested items

> Blockquotes for notes

| Table | Header |
|--------|--------|
| Cell   | Cell   |

[Project repository](https://github.com/elathoxu-crypto/memphis)
```

---

## Pull Request Process

### Before Submitting

**Checklist:**
- [ ] All tests passing
- [ ] Coverage not decreased
- [ ] No linting errors
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Self-reviewed
- [ ] Descriptive commit messages

---

### PR Review Process

**What reviewers check:**
- Code quality and style
- Test coverage
- Documentation
- Breaking changes
- Performance impact

**Expected timeline:**
- Initial review: 2-3 days
- Revisions: 1-2 days
- Merge: 1-2 days after approval

---

### After Merge

**Cleanup:**
```bash
# Delete feature branch
git branch -d feature/your-feature

# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main
```

---

## Community Guidelines

### Code of Conduct

**Be respectful:**
- Treat everyone with respect
- Welcome newcomers
- Assume positive intent

**Be constructive:**
- Provide helpful feedback
- Focus on what can be improved
- Acknowledge good work

**Be inclusive:**
- Welcome all contributions
- Use inclusive language
- Respect different perspectives

---

### Getting Help

**Channels:**
- **Discord:** https://discord.gg/clawd
- **GitHub Issues:** https://github.com/elathoxu-crypto/memphis/issues
- **Email:** contributors@memphis.ai

**Before asking:**
- Check documentation
- Search existing issues
- Read code

---

### Recognition

**All contributors are credited in:**
- CONTRIBUTORS.md
- Release notes
- GitHub contributors page

**Ways to contribute:**
- Code
- Documentation
- Bug reports
- Feature requests
- Code review
- Testing
- Translation
- Design

---

## Development Tools

### VS Code Extensions (Recommended)

- ESLint
- Prettier
- TypeScript
- GitLens
- Better Comments

---

### EditorConfig

**Project includes `.editorconfig`:**
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{ts,js,json}]
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

---

### Git Hooks (Optional)

**Install husky:**
```bash
npm run prepare
```

**Pre-commit hooks:**
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run type-check
```

---

## Questions?

**Get in touch:**
- 📖 [Documentation](https://docs.openclaw.ai)
- 💬 [Discord](https://discord.gg/clawd)
- 🐛 [GitHub Issues](https://github.com/elathoxu-crypto/memphis/issues)

---

**Happy contributing!** 🚀

---

**Contributing Guide Version:** 2.0.0  
**Last Updated:** 2026-03-02
