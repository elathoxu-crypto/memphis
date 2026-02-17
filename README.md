# Memphis 🧠

**Local-first AI brain with persistent memory chains.**

One CLI. Multiple AI providers. Memory that survives between sessions.

## Why

Every AI tool forgets. You explain the same context every session. Memphis remembers — in cryptographically linked chains that live on your machine, not in someone's cloud.

## Quick start

    git clone https://github.com/elathoxu-crypto/memphis.git
    cd memphis
    npm install
    npx tsx src/cli/index.ts init
    npx tsx src/cli/index.ts journal "Memphis is alive" -t "genesis"
    npx tsx src/cli/index.ts recall "alive"
    npx tsx src/cli/index.ts status

## Features

- **Memory chains** — append-only blocks with SHA256 linking
- **Tamper detection** — every block is verified against its hash
- **Multiple chains** — journal, build, adr, ops (or custom)
- **Search** — by keyword, tag, chain, date
- **Any LLM** — Minimax, OpenRouter, Ollama, OpenAI (coming soon)
- **Offline-first** — works without internet
- **Zero dependencies on cloud** — your data stays on your machine

## Commands

| Command | Description |
|---------|-------------|
| memphis init | Initialize Memphis |
| memphis journal "..." | Add journal entry |
| memphis ask "..." | Search memory (LLM coming) |
| memphis recall "keyword" | Search by keyword |
| memphis status | Show chains and providers |

## Roadmap

- [x] Memory chain with SHA256
- [x] CLI (journal, ask, recall, status, init)
- [x] Tests
- [ ] LLM provider integration (Minimax, OpenRouter, Ollama)
- [ ] Context window (feed relevant memory to LLM)
- [ ] Git auto-commit on every block
- [ ] Bridge to Cline (VS Code AI)
- [ ] Bridge to OpenClaw (automation)
- [ ] npm package (npx memphis-ai)

## Tech Stack

TypeScript, Node.js 20+, SHA256 (node:crypto), Commander.js, Vitest, YAML

## License

MIT

Built by Memphis for the Oswobodzeni community.
