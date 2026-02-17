# Memphis & OpenClaw Fix List
# Generated: 2026-02-17

## Project Overview
Memphis is a local-first AI brain with persistent memory chains. OpenClaw is the multi-agent collaboration system.

## Completed Fixes & Enhancements

### 1. OpenClaw Multi-Agent System
- ✅ Added 4 AI agents with diverse capabilities:
  - OpenClaw (53%): code-analysis, file-operations, web-search, coordination
  - CodeMaster (25%): code-review, refactoring, bug-detection
  - DataSage (15%): data-analysis, visualization, statistics
  - ResearchBot (7%): research, documentation, web-search, summarization
- ✅ Multi-LLM provider support (Ollama, MiniMax, OpenRouter)
- ✅ Agent-to-agent communication
- ✅ Task queue system
- ✅ Persistent agent state with singleton pattern
- ✅ Collaborative task execution (multi-agent)
- ✅ Broadcast messaging to all agents
- ✅ Fixed state persistence - properly parses JSON from journal blocks

### 2. Offline Mode Support
- ✅ OfflineDetector for auto-detecting network status
- ✅ FallbackChain for LLM providers (cloud → local)
- ✅ ContextCache for offline mode
- ✅ Recommended offline models: llama3.2:1b, llama3.2:3b, gemma3.4b

### 3. Sliding Window Context
- ✅ SlidingWindow class for context management
- ✅ ContextManager for LLM integration
- ✅ Automatic context compression when threshold reached
- ✅ Token-aware context sizing

### 4. CLI Enhancements
- ✅ New OpenClaw commands:
  - status, list, invite, negotiate, task, queue
  - collab (multi-agent collaboration)
  - broadcast (send to all agents)
  - capability, clear, context, states
- ✅ Fixed argument parsing for subcommands

## Known Issues & TODO

### High Priority
1. [ ] Add semantic embeddings for meaningful recall (currently only keyword search)
2. [ ] Implement git auto-commit on memory changes
3. [ ] Add offline indicator in TUI

### Medium Priority
4. [ ] Add DID-based agent identity
5. [ ] Implement verifiable credentials for agents
6. [ ] Add encrypted agent-to-agent communication
7. [ ] Add persistent context cache to disk

### Low Priority
8. [ ] Add more comprehensive tests for OpenClaw
9. [ ] Optimize for llama3.2:1b model ( lightest, fastest)
10. [ ] Add agent protocol documentation

## Files Modified/Created

### Created
- src/providers/offline.ts - Offline mode support
- src/memory/sliding-window.ts - Context management
- docs/OFFLINE.md - Offline mode documentation

### Modified
- src/bridges/openclaw.ts - Major enhancements
- src/providers/index.ts - Added offline exports
- src/cli/index.ts - Fixed argument parsing

## Configuration

### Environment Variables
```
MINIMAX_API_KEY=your_key
MINIMAX_GROUP_ID=your_group_id
OPENROUTER_API_KEY=your_key
```

### Usage Examples
```bash
# Check status
memphis agent openclaw status

# List agents
memphis agent openclaw list

# Multi-agent collaboration
memphis agent openclaw collab "Analyze the codebase"

# Broadcast to all agents
memphis agent openclaw broadcast "Important update"

# Find agents by capability
memphis agent openclaw capability code-review
```

## Notes for Next Agent
- The OpenClaw bridge now supports true multi-agent collaboration
- Ollama is the default provider when available
- States are persisted to the journal chain
- Collaborative tasks delegate to specialists based on capabilities

---
End of Fix List
