# Memphis 🧠

**Local-first AI brain with persistent memory chains.**

One CLI. Multiple AI providers. Memory that survives between sessions.

## Why

Every AI tool forgets. You explain the same context every session. Memphis remembers — in cryptographically linked chains that live on your machine, not in someone's cloud.

## Quick start

    git clone https://github.com/elathoxu-crypto/memphis.git
    cd memphis
    npm install
    npm run build
    npm link  # Or use: npx memphis-cli init

### Or install from GitHub Package (for contributors):

    npm install @elathoxu-crypto/memphis --registry=https://npm.pkg.github.com

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
| memphis vault init | Initialize encrypted vault (SSI) |
| memphis vault add <key> <value> | Add encrypted secret |
| memphis vault list | List stored secrets |
| memphis vault get <key> | Decrypt and show secret |

## Roadmap

- [x] Memory chain with SHA256
- [x] CLI (journal, ask, recall, status, init)
- [x] Tests
- [x] Vault (encrypted secrets with AES-256-GCM + SSI)
- [ ] LLM provider integration (Minimax, OpenRouter, Ollama)
- [ ] Context window (feed relevant memory to LLM)
- [ ] Git auto-commit on every block
- [ ] Bridge to Cline (VS Code AI)
- [ ] Bridge to OpenClaw (automation)

## Tech Stack

TypeScript, Node.js 20+, SHA256 (node:crypto), Commander.js, Vitest, YAML

## License

MIT

Built by Memphis for the Oswobodzeni community.
