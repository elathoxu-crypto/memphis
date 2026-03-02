# Memphis Nexus TUI - Implementation Plan

**Date:** 2026-03-02
**Goal:** Replace old TUI with multi-agent chat interface

## ✅ Phase 1: Interactive Test (30 min) - DONE

**Status:** ✅ POC created and tested

**Steps:**
1. ✅ Run POC in test mode
2. ✅ Test commands: /help, /clear, /agents, /status
3. ✅ Test message sending
4. ✅ Test Ctrl+C exit
5. ✅ Verify rendering

## ✅ Phase 2: Full Refactor (1h) - DONE

**Goal:** ✅ Replace old TUI

**Steps:**
1. ✅ Backup old TUI: `mv src/tui src/tui-old`
2. ✅ Rename tui-v2 → tui
3. ✅ Update CLI command (`src/cli/commands/tui.ts`)
4. ✅ Make Nexus default TUI
5. ✅ Test with `memphis tui`

## ⏳ Phase 3: Network Integration (1.5h)

**Goal:** Real multi-agent chat

**Features:**
- WebSocket server (for agents)
- IPFS sync (message persistence)
- Agent discovery (who's online)
- Message routing (broadcast/DM)

**Steps:**
1. Create NexusNetwork class
2. Add WebSocket server (port 8765)
3. IPFS integration (share chain)
4. Agent heartbeat system
5. Test with 2 agents (Memphis + Watra)

## ⏳ Phase 4: Save to Chain (30 min)

**Goal:** Messages = blocks

**Implementation:**
```typescript
// Every message saves to journal
async sendMessage(content: string) {
  // 1. Save to chain
  await memphis.journal(`${from.name}: ${content}`, {
    tags: ["nexus", "chat", from.id]
  });
  
  // 2. Sync to IPFS
  await memphis.shareSync("--push");
  
  // 3. Update TUI
  this.messages.push(msg);
  this.updateChatBox();
}
```

## ✅ Phase 5: Commands (DONE)

**Commands implemented:**
- /help - Show commands
- /clear - Clear chat
- /agents - List agents
- /status - System status

**Additional commands to add:**
- /watra - DM to Watra
- /style - DM to Style
- /all - Broadcast message
- /history - Show last 50 messages

## 📊 Total Time Estimate

- Phase 1: 30 min ✅ (done)
- Phase 2: 1h ⏳
- Phase 3: 1.5h ⏳
- Phase 4: 30 min ⏳
- **Total: 3.5h**

## 🎯 Success Criteria

1. ✅ POC runs without errors
2. ⏳ `memphis tui` opens Nexus
3. ⏳ Can chat with Watra/Style
4. ⏳ Messages save to chain
5. ⏳ All commands work

## 🚨 Risks

- pi-tui API changes (unlikely, stable)
- Network sync complexity (moderate)
- Performance with many messages (low)

## 📝 Next Steps

1. Run interactive test (now)
2. Start refactor (next)
3. Add network (then)
4. Save to chain (finally)
