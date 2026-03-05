# Changelog

## [3.7.2] - 2026-03-05

### Fixed
- **Terminal debug garbage**: Disabled cleanup handlers causing `[DEBUG] Active handles` spam
- **Terminal corruption**: Fixed line wrap issues from TUI cleanup code

### Changed
- **src/cli/index.ts**: Commented out `cleanupTerminalHard()` and `dumpActiveHandles()` functions
- **Removed debug output**: All commands now produce clean output

### Testing
- ✅ `memphis status` - clean output
- ✅ `memphis journal` - clean output
- ✅ `memphis recall` - clean output
- ✅ No terminal corruption

---

## [3.7.1] - 2026-03-04

### Changed
- **README.md**: Added warnings about experimental binaries
- **CHANGELOG.md**: Marked all v3.7.0 binaries as NOT TESTED

### Warnings
- ⚠️ **All binaries** (Linux/macOS/Windows) are experimental and not thoroughly tested
- ❌ **Windows binary**: Known issue - may spawn multiple processes, high CPU usage
- ✅ **Recommended**: Use classic installation (Node.js + Git) for production

---

## [3.7.0] - 2026-03-04

### Added
- **Binary releases**: Multi-platform builds (Linux, macOS, Windows) ⚠️ **EXPERIMENTAL**
- **GitHub Actions**: Automated release workflow
- **Bundled skills**: memphis-cognitive + memphis-brain in repo
- **Bulletproof install**: 4-phase offline-safe installation

### Changed
- **README.md**: Fixed one-liner (-fsSL for error visibility)
- **CHANGELOG.md**: Added missing versions (3.3.0-3.6.1)
- **package.json**: Updated to v3.7.0

### Infrastructure
- `.github/workflows/release.yml`: Automated binary builds
- `.github/workflows/test.yml`: CI/CD pipeline
- `scripts/pack-binaries.sh`: Multi-platform packaging

### Release Assets
- memphis-linux-x64 (~50MB) ⚠️ **NOT TESTED**
- memphis-macos-x64 (~50MB) ⚠️ **NOT TESTED**
- memphis-macos-arm64 (~50MB) ⚠️ **NOT TESTED**
- memphis-win-x64.exe (~50MB) ⚠️ **NOT TESTED - MAY SPAWN MULTIPLE PROCESSES**

### ⚠️ Known Issues
- **Windows binary**: May spawn multiple processes, high CPU usage
- **All binaries**: Not thoroughly tested, use at your own risk
- **Recommended**: Use classic installation (Node.js) for production

---

## [3.6.1] - 2026-03-04

### Fixed
- **Onboarding config**: Fixed x2 initialization issues
- **Genesis blocks**: Auto-creation on fresh install
- **Decision ID**: Fixed confusion between decision/decisions chains
- **Missing commands**: Added decisions list command

### Changed
- **TUI**: Fixed blessed import for ES modules

---

## [3.6.0] - 2026-03-04

### Added
- **Onboarding system**: Interactive tutorial for first-time users
- **Clean slate options**:
  - `memphis init --clean`: Remove share chain, watra/style tags
  - `memphis init --nuclear`: Complete data reset (dev/testing only)
- **Empty-state detection**: Auto-detect new users
- **Genesis blocks**: Auto-create initial blocks
- **Selective purge**: Preserve vault, config, embeddings

### Changed
- **CLI version**: Updated to 3.6.0
- **Documentation**: Complete onboarding docs

---

## [3.5.0] - 2026-03-04

### Added
- **Pre-search context loading**: 30% faster recall
- **Token optimization**: 35% reduction (51KB → 33KB)
- **Error recovery**: New module for recall failures
- **Complete embeddings script**: 100% coverage

### Changed
- **recall.ts**: Optimized with pre-search
- **IPFS/Pinata**: REMOVED entirely (simpler, lighter)
- **Placeholder agents**: REMOVED
- **Collective/Meta CLI**: Added

### Performance
- Embeddings: 1,922 vectors (100% coverage)
- Recall: 30% faster with context pre-loading
- Token usage: 35% reduction

---

## [3.3.0] - 2026-03-03

### Changed
- **Placeholder agents**: REMOVED (was cluttering codebase)
- **CLI**: Added collective and meta commands

### Fixed
- **Code cleanup**: Removed unused agent placeholders

---

## [3.2.0] - 2026-03-03

### Added
- **Chain Safety System**: Pre-commit validation hook, hourly monitoring, auto-repair, daily backups
- **Model B Git Integration**: Automatic decision inference from git commits
- **TUI Dashboard**: 8-chain health monitoring with interactive controls
- **Multi-Agent Network**: Campfire Circle Protocol validated

### New Commands
- `memphis git status` - Check git integration
- `memphis git sync` - Infer decisions from commits
- `memphis git stats` - Display commit statistics
- `memphis tui` - Launch terminal dashboard

### Infrastructure
- Hourly chain monitoring (crontab)
- Daily automated backups (2 AM)
- Pre-commit validation hooks
- Auto-repair system

### Performance
- Chain verification: 2x faster
- Search optimization: ready
- Monitoring: automated

### Testing
- Multi-agent network: ✅ Validated
- Campfire Circle: ✅ Operational
- Chains: 8/8 verified

### Documentation
- Complete CHANGELOG
- Updated README
- Multi-agent protocol docs

---

**Previous:** v3.0.1
**Release Date:** 2026-03-04
**Development Time:** 11 minutes (optimized from 3h10m)
