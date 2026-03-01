# Phase 5 — UX Polish Roadmap

**Goal:** Make Memphis delightful for mainstream users (not just terminal power users)

**Timeline:** Q2 2026 (March-May)

---

## ✅ Completed

### 1. Quickstart Guide (2026-03-01)
- **Problem:** 35 commands → steep learning curve
- **Solution:** `docs/QUICKSTART.md` — 5 min onboarding, 4 core commands
- **Impact:** New users productive immediately
- **Commit:** `9c21e52`

---

## 🚧 In Progress

### 2. Performance Optimization
**Problem:**
- Embeddings: 2-3s for 1 block (slow for first-time users)
- Graph build: linear scan all blocks (scales poorly)
- No caching — recall re-computes every time

**Solution:**
- [ ] Embeddings cache (SQLite or in-memory LRU)
- [ ] Chain indexing (hash → offset map for O(1) lookup)
- [ ] Graph edge cache (rebuild only on new blocks)

**Target:**
- Embeddings: <500ms for 1 block
- Recall: <200ms for 100 blocks
- Graph build: <1s for 1000 blocks

**Priority:** HIGH (affects every user interaction)

---

### 3. E2E Tests
**Problem:**
- No E2E tests — only unit/integration
- Quickstart workflow untested
- Regression risk on changes

**Solution:**
- [ ] Test: `memphis init` → `memphis status` (healthy)
- [ ] Test: `memphis journal` → `memphis ask` (context-aware)
- [ ] Test: `memphis embed` → `memphis recall` (semantic)
- [ ] Test: `memphis decide` → `memphis revise` (decision flow)
- [ ] Test: `memphis share-sync --push --pull` (multi-agent)

**Target:** 10 E2E tests covering critical workflows

**Priority:** HIGH (validates quickstart + prevents regressions)

---

## 📋 Planned

### 4. Error Messages UX
**Problem:**
- Cryptic errors ("Not inside a trusted directory")
- No actionable guidance
- Stack traces leak internals

**Solution:**
- [ ] Audit all error messages
- [ ] Rewrite with user-friendly language
- [ ] Add suggestions ("Did you mean X?")
- [ ] Suppress stack traces in CLI (debug flag for full)

**Example:**
```
# BEFORE
Error: Not inside a trusted directory

# AFTER
Error: This directory is not trusted by Memphis.
To fix: Run `memphis trust .` or use --allow-untrusted
```

**Priority:** MEDIUM (improves first-time experience)

---

### 5. CLI Simplification
**Problem:**
- 35+ commands — overwhelming
- Inconsistent naming (`share-sync` vs `share replicator`)
- Too many flags

**Solution:**
- [ ] Group commands (memories, graph, sync, ops)
- [ ] Add shortcuts (`mem j` = `memphis journal`)
- [ ] Deprecate obscure commands (`soul`, `offline` → flags)
- [ ] Consolidate `share-sync` + `share replicator`

**Target:** Reduce to 20 core commands (rest in "advanced" section)

**Priority:** MEDIUM (builds on quickstart success)

---

### 6. TUI Improvements
**Problem:**
- Basic blessed UI
- No confirmation dialogs
- Limited interactivity

**Solution:**
- [ ] Color scheme (dark/light themes)
- [ ] Confirmation dialogs for destructive actions
- [ ] Better layout (split panes, resizable)
- [ ] Mouse support (click to select)
- [ ] Status bar with live stats

**Priority:** MEDIUM (visual polish)

---

### 7. Documentation Cleanup
**Problem:**
- 15 docs — overwhelming
- Polish/English mix
- No single source of truth

**Solution:**
- [ ] Consolidate to 5 core docs (QUICKSTART, README, NEXUS, WORKFLOWS, API)
- [ ] English-only (translate separately if needed)
- [ ] Remove outdated docs (`docs/memphis-test-report-*` → archive)
- [ ] Add doc versioning (align with releases)

**Target:** 5 core docs + 3 references

**Priority:** LOW (doesn't affect functionality)

---

### 8. Web UI (Future)
**Problem:**
- Terminal-only — blocks non-technical users
- No mobile access

**Solution:**
- [ ] React dashboard (view chains, ask, journal)
- [ ] WebSocket for real-time updates
- [ ] Mobile-responsive design
- [ ] Optional: Electron desktop app

**Priority:** LOW (big investment, consider for Phase 6)

---

## 📊 Success Metrics

| Metric | Current | Target (Phase 5) |
|--------|---------|------------------|
| Time to first memory | Unknown | <5 min (measured) |
| Embedding latency | 2-3s | <500ms |
| Recall latency (100 blocks) | Unknown | <200ms |
| E2E test coverage | 0 | 10 tests |
| Error message clarity | Poor | User-friendly |
| Core commands | 35 | 20 |
| Documentation | 15 docs | 5 core + 3 ref |
| User satisfaction | Unknown | Survey |

---

## 🎯 Phase 5 Definition of Done

- [ ] Quickstart workflow takes <5 min (validated by E2E test)
- [ ] Embeddings <500ms for 1 block
- [ ] Recall <200ms for 100 blocks
- [ ] 10 E2E tests passing
- [ ] Error messages rewritten
- [ ] CLI reduced to 20 core commands
- [ ] 5 core docs (English-only)
- [ ] User testing with 3+ people

---

## 📅 Timeline

**March 2026:**
- ✅ Week 1: Quickstart guide
- ⏳ Week 2: Performance optimization
- ⏳ Week 3: E2E tests
- ⏳ Week 4: Error messages

**April 2026:**
- Week 5-6: CLI simplification
- Week 7-8: TUI improvements

**May 2026:**
- Week 9-10: Documentation cleanup
- Week 11-12: User testing + iteration

---

**Created:** 2026-03-01 15:20 CET
**Owner:** Watra (OpenClaw agent)
**Status:** Phase 5 in progress
