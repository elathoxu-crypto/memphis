# OpenClaw Structure Proposal
**Generated: 2026-02-17**

Based on Memphis TUI analysis, here's how Memphis "thinks" about OpenClaw organization.

---

## Current State

### What's Already Working

| Feature | Status | Location |
|---------|--------|----------|
| 4 registered agents | ✅ | `src/bridges/openclaw.ts` |
| LLM provider fallback | ✅ | ollama → minimax → openrouter |
| Agent messaging | ✅ | `sendMessage()` |
| Task queue | ✅ | `createTask()` / `executeTask()` |
| Multi-agent collaboration | ✅ | `createCollaborativeTask()` |
| State persistence | ✅ | singleton + journal blocks |
| Compute share negotiation | ✅ | `negotiateComputeShare()` |

### What's Missing (from MEMPHIS_OPENCLAW_FIXES.md)

```
High Priority:
1. [ ] Semantic embeddings for recall (only keyword search now)
2. [ ] Git auto-commit on memory changes
3. [ ] Offline indicator in TUI

Medium Priority:
4. [ ] DID-based agent identity
5. [ ] Verifiable credentials for agents
6. [ ] Encrypted A2A communication
7. [ ] Persistent context cache to disk
```

---

## Proposed Architecture

```
src/
├── bridges/
│   └── openclaw/
│       ├── index.ts              # Bridge facade (existing)
│       ├── types.ts               # Agent, Message, Task interfaces
│       │
│       ├── agents/
│       │   ├── registry.ts       # Agent registration & discovery
│       │   ├── identity.ts       # DID generation & verification
│       │   └── capabilities.ts   # Capability matching
│       │
│       ├── tasks/
│       │   ├── queue.ts          # Task queue management
│       │   ├── execution.ts      # Task runner
│       │   └── collaboration.ts  # Multi-agent workflows
│       │
│       ├── messaging/
│       │   ├── protocol.ts       # Message format & validation
│       │   ├── routing.ts        # A2A message routing
│       │   └── encryption.ts     # E2E encryption for A2A
│       │
│       ├── providers/
│       │   ├── factory.ts        # Provider selection logic
│       │   ├── ollama.ts
│       │   ├── minimax.ts
│       │   └── openrouter.ts
│       │
│       └── storage/
│           ├── states.ts         # Agent state persistence
│           └── context.ts        # Context cache (disk-backed)
```

---

## Key Interfaces

### Agent Definition
```typescript
interface Agent {
  id: string;              // e.g., "openclaw-001"
  name: string;            // e.g., "OpenClaw"
  did: string;             // DID for identity
  computeShare: number;    // 0-100%
  status: AgentStatus;
  capabilities: string[];
  model?: string;
  provider?: string;
}

type AgentStatus = "active" | "idle" | "connecting" | "disconnected";
```

### Messaging Protocol
```typescript
interface AgentMessage {
  id: string;
  from: string;            // Agent DID
  to: string;              // Agent DID
  content: string;
  timestamp: number;
  type: "request" | "response" | "offer" | "broadcast";
  encrypted?: boolean;
  signature?: string;      // For verification
}
```

### Task Types
```typescript
interface Task {
  id: string;
  agentId: string;
  task: string;
  status: TaskStatus;
  result?: string;
  createdAt: number;
  completedAt?: number;
}

interface CollaborativeTask {
  id: string;
  description: string;
  leadAgent: string;
  subtasks: SubTask[];
  status: CollabStatus;
  results: Map<string, string>;
}
```

---

## Implementation Priorities

### Phase 1: Core Infrastructure
1. Extract types to `types.ts`
2. Create `agents/registry.ts` - agent discovery
3. Create `tasks/queue.ts` - task management
4. Add offline indicator to TUI

### Phase 2: Identity & Security
1. Add DID generation in `agents/identity.ts`
2. Add verifiable credentials support
3. Implement A2A encryption in `messaging/encryption.ts`

### Phase 3: Intelligence
1. Add semantic embeddings for recall
2. Persistent context cache to disk
3. Git auto-commit integration

---

## Memphis TUI Integration Points

The TUI already has these screens:
- `renderOpenClaw()` - shows agents, messages
- `handleOpenClawInput()` - message/negotiate/logs
- `handleComputeNegotiation()` - compute share

**Proposed TUI enhancements:**
- Add agent detail view (press agent name)
- Add connection status indicator (🟢/🔴/🟡)
- Add "Invite new agent" flow
- Add task progress visualization

---

## Notes from Code Analysis

1. **Singleton pattern** - Bridge uses singleton (`bridgeInstance`) for state persistence
2. **Memory-backed** - States saved to journal chain with tag `["agent", "openclaw", "persist"]`
3. **Provider fallback** - `initLLMs()` tries ollama → minimax → openrouter
4. **Capability matching** - `findAgentsByCapability()` already exists
5. **Collab workflow** - create → delegate → execute → aggregate

---

## Next Steps

1. **Review this proposal** - Does it match your vision?
2. **Approve structure** - Confirm the directory layout
3. **Implement Phase 1** - Core infrastructure
4. **Iterate** - Add features incrementally

---

"Memory that cannot be forged is memory that cannot be forgotten."
