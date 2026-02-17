# Memphis 🧠

**Local-first AI brain with persistent memory chains.**

One CLI. Multiple AI providers. Memory that survives between sessions.

## Why

Every AI tool forgets. You explain the same context every session.
Memphis remembers — in cryptographically linked chains that live
on your machine, not in someone's cloud.

## Quick start

```bash
# Install
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install

# Initialize
npx tsx src/cli/index.ts init

# Add your first memory
npx tsx src/cli/index.ts journal "Memphis is alive" -t "genesis"

# Search memory
npx tsx src/cli/index.ts recall "alive"

# Check status
npx tsx src/cli/index.ts status
Features

Memory chains — append-only blocks with SHA256 linking
Tamper detection — every block is verified against its hash
Multiple chains — journal, build, adr, ops (or custom)
Search — by keyword, tag, chain, date
Any LLM — Minimax, OpenRouter, Ollama, OpenAI (coming soon)
Offline-first — works without internet
Zero dependencies on cloud — your data stays on your machine

How it works
CopyYou: memphis journal "decided to use TypeScript"
              │
              ▼
    ┌──────────────────┐
    │  Create block     │
    │  index: 0         │
    │  data: "decided.."│
    │  prev_hash: 000.. │
    │  hash: sha256(..) │
    └────────┬─────────┘
             │
             ▼
    ~/.memphis/chains/journal/000000.json
Every block links to the previous one via SHA256 hash.
If anyone tampers with a block, the chain breaks — and Memphis detects it.
Commands
CommandDescriptionmemphis initInitialize Memphismemphis journal "..."Add journal entrymemphis ask "..."Search memory (LLM coming)memphis recall "keyword"Search by keywordmemphis statusShow chains and providers
Block structure
jsonCopy{
  "index": 0,
  "timestamp": "2026-02-16T23:49:00.587Z",
  "chain": "journal",
  "data": {
    "type": "journal",
    "content": "Memphis is alive",
    "tags": ["genesis", "v0.1"],
    "agent": "journal"
  },
  "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "hash": "8d4ff2e9f1c6..."
}
Roadmap

 Memory chain with SHA256
 CLI (journal, ask, recall, status, init)
 Tests
 LLM provider integration (Minimax, OpenRouter, Ollama)
 Context window (feed relevant memory to LLM)
 Git auto-commit on every block
 Bridge to Cline (VS Code AI)
 Bridge to OpenClaw (automation)
 npm package (npx memphis-ai)
 Ed25519 block signing
 IPFS backup (optional)
 Web dashboard (optional)

Architecture
Copymemphis/
├── src/
│   ├── cli/          # Commander.js CLI
│   ├── memory/       # Chain, Store, Query
│   ├── providers/    # LLM adapters (OpenAI-compatible)
│   ├── agents/       # Journal, Builder, Architect, Ops
│   ├── bridges/      # Cline, OpenClaw, Git
│   ├── context/      # Sliding window for LLM
│   ├── config/       # YAML config loader
│   └── utils/        # Hash, Logger
└── tests/
License
MIT

Built by Memphis for the Oswobodzeni community.
