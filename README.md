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

### Run TUI (Terminal UI)

```bash
npm run build
npx tsx src/cli/index.ts tui
```

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

## Screenshots

```
╔══════════════════════════════════════════════════════════════════════════════╗
║     🦅 MEMPHIS - Przewodnik i Katalizator                                 ║
╠════════════════════════════════════════════════════════════════════════════╣
║ ⬡ NAWIGACJA                     │ ⬡ STATYSTYKI                           ║
║                                 │                                        ║
║ › ⌂ Dashboard  [1]              │  Łańcuchy: 2                          ║
║   ✎ Journal    [2]              │  Bloki: 543                           ║
║   🔐 Vault     [3]              │    📝 journal: 539                     ║
║   🔍 Recall    [4]              │    🔐 vault: 4                         ║
║   💭 Ask       [5]              │                                        ║
║   🦅 OpenClaw [6]              │  ⬡ MYŚĆ DNIA                          ║
║   🤖 Cline    [c]              │  "Łączę to co było                   ║
║   📴 Offline  [o]              │   z tym co będzie."                   ║
║   ⚙ Settings  [9]              │                                        ║
╠════════════════════════════════════════════════════════════════════════════╣
║ q=wyjście | strzałki=nawigacja | enter=wybierz | c=Cline                ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Key bindings

| Key | Action |
|-----|--------|
| `1-9` | Quick nav to screen |
| `↑/↓` | Navigate menu |
| `Enter` | Select |
| `c` | Cline integration |
| `o` | Offline mode |
| `q/Esc` | Quit |

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
- [x] Tests (33+ unit tests)
- [x] Vault (encrypted secrets with AES-256-GCM + SSI)
- [x] TUI (Terminal UI with Nawal E Theme 🦅)
- [x] LLM integration (Ollama local)
- [x] Polish language (PL)
- [x] Cline bridge
- [ ] Git auto-commit on every block
- [ ] Context window (feed relevant memory to LLM)
- [ ] OpenClaw bridge (automation)

## Tech Stack

TypeScript, Node.js 20+, SHA256 (node:crypto), Commander.js, Vitest, YAML

## Tests

```bash
npm test
# Runs 33+ unit tests:
# - Memory chain (create, verify, tamper detection)
# - Crypto (encrypt, decrypt, random IV)
# - TUI helpers (truncate, format, validate)
# - Behaviors (greetings, acknowledgments)
```

## License

MIT

Built by Memphis for the Oswobodzeni community.
