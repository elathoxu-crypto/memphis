# Changelog

All notable changes to Memphis are documented in this file.

## [2.0.0] - 2026-03-02

### Added - Model C (Predictive Decisions)

**Pattern Learning Engine**
- Automatic pattern extraction from decision history
- Context grouping (activity, time, files, branch)
- Confidence scoring (0.0-0.95)
- Persistent pattern storage (`~/.memphis/patterns.json`)
- Minimum 3 occurrences to create pattern

**Context Analysis**
- Real-time context monitoring
- Active file tracking (last 1h)
- Current branch detection
- Recent commit analysis (last 24h)
- 5-minute context cache

**Advanced Pattern Matching**
- Weighted scoring system:
  - Activity matching (30%)
  - File pattern matching (25%)
  - Time matching (15%)
  - Branch matching (15%)
  - Knowledge graph matching (15%)
- Context similarity calculation
- Match reason generation

**Prediction Engine**
- Predictions from patterns (0.6-0.95 confidence)
- Prediction scoring and ranking
- Confidence filtering
- Diversity filtering
- Context-aware suggestions

**Proactive Suggestions**
- Background context analysis (30-min intervals)
- Multi-channel notifications (desktop/terminal/slack/discord)
- Cooldown management
- Accept/Reject/Custom flow
- Suggestion formatting

**Accuracy Tracking**
- Event recording (accept/reject)
- Pattern accuracy tracking
- Trend detection (improving/declining/stable)
- Top performers identification
- Persistent storage (`~/.memphis/accuracy.json`)

**CLI Commands**
- `memphis predict` — Generate predictions
- `memphis predict --learn` — Learn patterns from history
- `memphis patterns list` — List learned patterns
- `memphis patterns stats` — Show pattern statistics
- `memphis patterns clear` — Clear all patterns
- `memphis suggest` — Check for proactive suggestions
- `memphis accuracy` — View accuracy tracking
- `memphis accuracy clear` — Clear accuracy data

**Documentation**
- MODEL-C-GUIDE.md (10KB, 500+ lines)
- MODEL-C-INTEGRATION-TESTS.md (3.5KB)
- MODEL-C-PLAN.md (19KB, preserved from planning)

**Integration Tests**
- Automated test suite (scripts/test-model-c.sh)
- 8 integration tests
- Performance validation (<1000ms)
- JSON output validation
- Pass/fail reporting

**Daemon**
- Background context analysis
- 30-minute intervals
- Pattern learning integration
- Proactive suggestion triggering

### Performance

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Pattern Learning | <2000ms | 1049ms | ✅ 47% faster |
| Prediction Generation | <1000ms | 648ms | ✅ 35% faster |
| Context Analysis | <1000ms | 610ms | ✅ 39% faster |
| Accuracy Tracking | <500ms | ~200ms | ✅ 60% faster |

### Test Results

- Integration Tests: 8/8 passing (100%)
- Performance Tests: All under target
- JSON Output: ✅ Valid
- Error Handling: ✅ Working

### Breaking Changes

None. Model C is additive to Model A+B.

### Migration

No migration required. Model C features are opt-in:
```bash
# Learn patterns (first time)
memphis predict --learn --since 30

# Generate predictions
memphis predict
```

### Known Limitations

- Minimum 50+ decisions recommended for reliable predictions
- Predictions require pattern training (one-time setup)
- Proactive suggestions need daemon running

### Future Enhancements (v2.1.0+)

- Knowledge graph integration
- Multi-agent pattern sharing
- Time-series predictions
- Custom pattern rules
- Pattern export/import
- Web UI dashboard

---

## [1.8.0] - 2026-03-02

### Added - Model B (Inferred Decisions)

**Inference Engine**
- Git commit analysis (20 patterns)
- Confidence scoring (50-83%)
- Evidence collection
- Category detection

**Decision Lifecycle**
- `memphis revise` — Update decisions
- `memphis contradict` — Mark as contradicted
- `memphis reinforce` — Strengthen decisions

**Frictionless Capture**
- `memphis decide-fast` (alias: md)
- 92ms average (target <100ms)
- 7x faster than planned

**TUI Dashboard**
- Inferred decisions screen
- Quick commands (/j, /a, /d)

**Documentation**
- MODEL-B-GUIDE.md (380 lines)
- Quick start guide
- Performance benchmarks

### Performance

- Capture: 92ms (target <100ms)
- Inference: 641ms
- Full pipeline: 766ms average

---

## [1.7.5] - 2026-03-02

### Added - TUI Phase 5

- Journal sidebar with real data
- Configuration persistence
- Export/Import settings
- Theme toggle (dark/light)
- Keyboard shortcuts

### Commands

- `/config` — Show configuration
- `/export-config` — Export to file
- `/import-config` — Import from file
- `/reset-config` — Reset to defaults

---

## [1.7.4] - 2026-03-02

### Added - TUI Phase 4

- Keyboard shortcuts (Ctrl+J, Ctrl+R, Ctrl+S, Ctrl+T)
- Theme system (dark/light)
- Command history (100 items)
- Help system

---

## [1.7.3] - 2026-03-02

### Added - TUI Phase 3

- Search integration (/search)
- Tab completion
- Recall widget
- Sync status

---

## [1.7.0] - 2026-03-01

### Added - Intelligence System

- Auto-categorization (77.2% accuracy)
- Pattern matching (366 patterns, 36 tags)
- LLM fallback (140ms)
- Learning persistence
- Intelligence dashboard

---

## [1.5.0] - 2026-03-01

### Added - Nexus Multi-Agent

- Agent trade protocol
- MCP server
- Workspace management
- Share replicator

---

## [1.3.0] - 2026-03-01

### Added - Phase 2+3

- Offline mode
- Vault recovery
- Reflection collector
- Knowledge graph

---

## [1.0.0] - 2026-02-25

### Added - Initial Release

- Memory chains (journal, decisions, ask)
- Embeddings (semantic search)
- Ollama integration
- CLI commands
- TUI dashboard

---

**Full Changelog:** https://github.com/elathoxu-crypto/memphis/commits/master
