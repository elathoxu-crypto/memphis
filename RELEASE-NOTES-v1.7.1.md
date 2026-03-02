# Memphis Nexus v1.7.1 - Release Notes

**Release Date:** 2026-03-02
**Code Name:** "Multi-Agent Chat Foundation"
**Type:** Feature Release (Beta)

---

## 🎯 What's New

### Memphis Nexus TUI
**A complete rewrite of the terminal UI** with multi-agent chat support:

- **Chat-based interface** (like OpenClaw/Codex CLI)
- **Multi-agent support** (Memphis + Watra + Style)
- **Status bar** with real-time info
- **Slash commands** built-in
- **Auto-save to chain** every message

---

## ✨ Features

### 1. Chat Interface
```
🧠 Memphis: Testuje nowy TUI z multi-agent chat!
🔥 Watra: Hej chłopaki, nad czym pracujemy?
```

### 2. Status Bar
```
Agents: 🧠Memphis 🔥Watra | Chains: 880+ blocks | Provider: ollama | ⏱️ 08:48
```

### 3. Slash Commands
- `/help` - Show all commands
- `/clear` - Clear chat history
- `/agents` - List online agents
- `/status` - Show system status

### 4. Chain Integration
- Every message → journal block
- Auto-tags: `nexus`, `chat`, `agent-name`
- IPFS sync (share-sync --push)
- Recall message history

---

## 🚀 Quick Start

```bash
# Start Nexus TUI
memphis tui

# Or run POC directly
cd ~/memphis
./test-nexus.sh
```

**Controls:**
- `Enter` - Send message
- `Ctrl+C` - Exit
- `/help` - Show commands

---

## 📊 Technical Details

**Dependencies:**
- @mariozechner/pi-tui@0.55.3 (same as OpenClaw)
- chalk@5.5.0

**Architecture:**
- UI: pi-tui components (React-like)
- Chain: journal blocks + embeddings
- Network: TODO (Phase 3)

**Files Changed:**
- Added: `src/tui/nexus-poc.ts` (280 lines)
- Added: `src/tui/nexus-chain.ts` (105 lines)
- Added: `NEXUS-PROGRESS.md` (documentation)
- Renamed: `src/tui` → `src/tui-old` (backup)

---

## 🎯 Roadmap Status

**Completed (60%):**
- ✅ Phase 1: Interactive Test
- ✅ Phase 2: Full Refactor
- ✅ Phase 4: Save to Chain

**Pending (40%):**
- ⏳ Phase 3: Network Integration (WebSocket, multi-agent)
- ⏳ Phase 5: Polish & Document

---

## 🐛 Known Issues

1. **Chat history not updating dynamically**
   - Workaround: requestRender() called
   - Fix: Remove/re-add Text component

2. **Network sync not tested**
   - IPFS integration exists but needs real testing
   - Need 2 agents on different machines

3. **Timestamps not parsed**
   - Recall shows "today" for all messages
   - Need to parse actual timestamps

---

## 🔮 What's Next

**Option 1: Phase 3 (Network)**
- WebSocket server (port 8765)
- Real-time multi-agent chat
- Agent discovery
- Message routing

**Option 2: Polish**
- More commands (/watra, /style, /all)
- Better error handling
- User guide

**Option 3: Ship & Iterate**
- Release current version
- Gather feedback
- Plan Phase 3 based on usage

---

## 📝 Migration from Old TUI

**Old TUI:** `memphis tui` → multi-screen interface
**New TUI:** `memphis tui` → chat interface

**Backup:** Old TUI saved in `src/tui-old/`

**Rollback:**
```bash
cd ~/memphis
mv src/tui src/tui-nexus
mv src/tui-old src/tui
npm run build
```

---

## 🙏 Credits

**Built by:** Watra (OpenClaw agent) + Elathoxu
**Time invested:** 2.5 hours
**Lines of code:** ~400 (new)
**Commits:** 3 (5e53a60, c7b9475, e1bb9da)

**Inspired by:** OpenClaw TUI, Codex CLI, Claude Code

---

## 📖 Documentation

- **Progress:** `NEXUS-PROGRESS.md`
- **Implementation:** `src/tui/IMPLEMENTATION-PLAN.md`
- **Chain Integration:** `src/tui/nexus-chain.ts`

---

## 🚨 Breaking Changes

- Old TUI screens removed (dashboard, journal, vault, etc.)
- Single chat interface only
- No mouse support (keyboard-only)

---

## 💡 Feedback

**What works:**
- ✅ Chat interface smooth
- ✅ Chain integration solid
- ✅ Commands working
- ✅ Status bar informative

**What needs work:**
- ⏳ Network integration
- ⏳ Dynamic chat updates
- ⏳ Rich content (images, code)

---

**Release Type:** Feature Release
**Stability:** Beta (Phase 3 pending)
**Recommendation:** Test in development, not production yet

---

**Next Release:** v1.8.0 - Network Integration (Phase 3)
