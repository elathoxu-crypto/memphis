# Memphis 🧠

**Local-first AI brain with persistent memory chains — cognitive loop for personal knowledge management.**

[English](#english) | [Polski](#polski)

---

## English

### What is Memphis?

Memphis is a **personal AI brain** that remembers everything you tell it. It's built on the principle that AI should augment human memory, not replace it — with full ownership, offline-first architecture, and cryptographically verified chains.

### Core Features

| Feature | Description |
|---------|-------------|
| **Memory Chains** | Append-only blocks with SHA256 linking — tamper-evident |
| **Ask v2.2** | LLM-powered Q&A with context from recall + summaries |
| **Decision Detector** | Auto-detects decisions from journal/ask entries |
| **Autosummarizer** | Deterministic summaries every 50 blocks |
| **TUI** | Terminal UI with Dashboard, Journal, Recall, Ask, Decisions, Summary |
| **Multiple Providers** | OpenClaw (MiniMax), Ollama, OpenAI, OpenRouter, Codex |
| **Offline-first** | Works without internet (Ollama) |
| **Vault** | Encrypted secrets with AES-256-GCM |

### Installation

Requirements:
- Node.js 20+ (tested on 20.11 / 20.12)
- npm 10+
- Optional: Pinata account (for IPFS share-sync)

```bash
# Clone & install dependencies
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install

# Build TypeScript once (creates dist/)
npm run build

# Optional: expose CLI globally
npm link
```

After linking you can call `memphis` from anywhere. For a clean slate remove `~/.memphis` before running `memphis init`.

### Quick Start

```bash
# Clone & build
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install
npm run build

# Fresh install / reset (recommended)
rm -rf ~/.memphis            # remove old chains & config
node dist/cli/index.js init  # create clean ~/.memphis

# (Optional) expose CLI globally
npm link

# Daily usage
memphis journal "Working on Memphis AI brain today"
memphis ask "what was I working on?"
memphis recall "memphis"

# Decision tracking (auto-detected)
memphis journal "Postanawiam, że używamy TypeScript"
→ Decision detected → saved to decision chain
```

### Commands

| Command | Description |
|---------|-------------|
| `memphis init` | Initialize Memphis in ~/.memphis |
| `memphis journal "text"` | Add journal entry |
| `memphis journal "text" --tags tag1,tag2` | Add with tags |
| `memphis ask "question"` | Ask with context (uses recall + summaries) |
| `memphis ask "question" --prefer-summaries` | Prefer summary context |
| `memphis ask "question" --no-summaries` | Skip summaries |
| `memphis ask "question" --explain-context` | Show context reasoning |
| `memphis recall "keyword"` | Search by keyword |
| `memphis recall --chain decision` | Search specific chain |
| `memphis recall --tag friction` | Search by tag |
| `memphis status` | Show chains, providers, stats |
| `memphis summarize` | Create/force autosummary |
| `memphis summarize --dry-run` | Preview without saving |
| `memphis tui` | Launch terminal UI |
| `memphis share-sync [flags]` | Sync share-tagged blocks via Pinata/IPFS |
| `memphis vault init` | Initialize encrypted vault |
| `memphis vault add <key> <value>` | Add secret |
| `memphis vault list` | List secrets |

### Share Sync (IPFS + Pinata)

Memphis potrafi publikować i importować wpisy oznaczone tagiem `share` przez Pinata/IPFS. Szczegóły architektury znajdziesz w [`docs/ipfs-shared-memory-plan.md`](./docs/ipfs-shared-memory-plan.md) oraz drabince zadań [`docs/ipfs-share-sync-codex.md`](./docs/ipfs-share-sync-codex.md).

#### Konfiguracja (\~/\.memphis/config.yaml)

```yaml
integrations:
  pinata:
    # Najprościej JWT – ustaw w configu lub przez env PINATA_JWT
    jwt: ${PINATA_JWT}
    # Alternatywnie para API key + secret
    # apiKey: ${PINATA_API_KEY}
    # apiSecret: ${PINATA_SECRET}
```

Możesz też pominąć wpis w pliku i polegać tylko na zmiennych środowiskowych (`PINATA_JWT` albo `PINATA_API_KEY` + `PINATA_SECRET`).

#### Użycie CLI

```bash
# Wypchnięcie lokalnych bloków share
memphis share-sync --push

# Pobranie nowych CIDów i import do łańcucha `share`
memphis share-sync --pull

# Push+pull w jednym kroku (z limitem 5 wpisów)
memphis share-sync --all --limit 5

# Symulacja bez zmian
memphis share-sync --all --dry-run

# Czyszczenie starych pinów / wpisów sieciowych
memphis share-sync --cleanup

# Gdy agent nie może uploadować (np. Watra)
memphis share-sync --all --push-disabled
```

Polecenia zapisują log `~/.memphis/network-chain.jsonl`, więc łatwo śledzić historię CIDów.

### Architecture

```
┌─────────────────────────────────────────────┐
│                  Memphis                     │
│         (Cognitive Loop Engine)              │
├─────────────────────────────────────────────┤
│  write → appendBlock (SOUL validation)      │
│  recall → search (keyword + tags)            │
│  ask → recall + LLM + summaries             │
│  decide → decision detector                 │
│  summarize → autosummarizer                │
├─────────────────────────────────────────────┤
│  Chains:                                    │
│  - journal: daily entries                    │
│  - ask: Q&A history                         │
│  - decision: detected decisions             │
│  - summary: autosummaries                   │
│  - vault: encrypted secrets                 │
└─────────────────────────────────────────────┘
```

### Providers

Priority order (fallback chain):
1. **OpenClaw** (MiniMax-M2.5) — your LLM
2. **Codex** — coding agent
3. **Ollama** — local (qwen3:8b, llama3.1)
4. **OpenAI** — GPT-4o
5. **OpenRouter** — Claude, etc.

➡️ See [`docs/openclaw-integration.md`](./docs/openclaw-integration.md) for full instructions on wiring Memphis into OpenClaw/Style, offline toggle usage, vault policy, deployment on a second PC, and monitoring commands.

### Use Cases

- **Daily journaling** — capture thoughts, decisions, progress
- **Context for AI** — ask questions with full memory context
- **Decision tracking** — auto-detected decisions with source refs
- **Weekly reviews** — autosummaries provide overview
- **Knowledge base** — searchable, verifiable memory

### Documentation

- [`docs/openclaw-integration.md`](./docs/openclaw-integration.md) — Style/OpenClaw setup, offline toggle, vault policy, monitoring
- [`docs/deployment-second-pc.md`](./docs/deployment-second-pc.md) — instrukcja instalacji na Ubuntu + GTX 1060
- [`docs/offline-toggle-checklist.md`](./docs/offline-toggle-checklist.md) — wymagania dla TUI offline
- [`docs/vault-policy.md`](./docs/vault-policy.md) — polityka dostępu do sekretów

### Troubleshooting

| Problem | Rozwiązanie |
|---------|-------------|
| `Pinata credentials missing` | Dodaj `integrations.pinata` w configu albo ustaw `PINATA_JWT` / `PINATA_API_KEY` + `PINATA_SECRET`. Możesz szybko przetestować `memphis share-sync --push --dry-run`. |
| `process.exit` podczas testów | Upewnij się, że moduł Pinaty nie jest uruchamiany jako skrypt (w repo zastosowaliśmy already guard). Przy własnych testach mockuj `createPinataBridge`. |
| `Failed to fetch CID` / `payload exceeds 4KB` | CID prawdopodobnie jest uszkodzony lub zawiera za duży JSON. Sprawdź `~/.memphis/network-chain.jsonl`, oznacz wpis jako `ignored` albo usuń go. |
| Brak nowych bloków do push | Dodaj tag `share` w dowolnym łańcuchu (journal/ask/decision). Eksporter pomija `vault` i `share`. |
| Cleanup nic nie usuwa | Domyślny TTL to 7 dni i dotyczy tylko wpisów ze statusem `imported` / `unavailable`. W razie potrzeby usuń ręcznie plik `network-chain.jsonl`. |

### Tech Stack

- TypeScript
- Node.js 20+
- SHA256 (node:crypto)
- Commander.js
- Blessed (TUI)
- Vitest

### License

MIT

---

## Polski

### Co to jest Memphis?

Memphis to **osobisty mózg AI** — zapamiętuje wszystko, co mu powiesz. Zbudowany na zasadzie, że AI powinien wspierać ludzką pamięć, nie ją zastępować — z pełną własnością, architekturą offline-first i kryptograficznie weryfikowanymi łańcuchami.

### Główne Funkcje

| Funkcja | Opis |
|---------|------|
| **Łańcuchy Pamięci** | Append-only bloki z linkowaniem SHA256 |
| **Ask v2.2** | Q&A z kontekstem z recall + podsumowań |
| **Detector Decyzji** | Auto-wykrywanie decyzji z wpisów |
| **Autosummarizer** | Deterministic podsumowania co 50 bloków |
| **TUI** | Interfejs terminalowy |
| **Wielu Providerów** | OpenClaw, Ollama, OpenAI, OpenRouter |
| **Offline-first** | Działa bez internetu |
| **Vault** | Szyfrowane sekrety |

### Szybki Start

```bash
# Klonowanie i budowanie
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install
npm run build
npm link

# Inicjalizacja
memphis init

# Codzienne użycie
memphis journal "Pracuję nad Memphis AI brain"
memphis ask "nad czym pracowałem?"
memphis recall "memphis"

# Śledzenie decyzji (auto-wykrywanie)
memphis journal "Postanawiam, że używamy TypeScript"
→ Decision detected → zapisane do łańcucha decision
```

### Struktura Projektu

```
src/
├── cli/              # Command-line interface
│   └── commands/     # journal, ask, recall, status, etc.
├── core/             # Business logic
│   ├── ask.ts        # Ask with context
│   ├── recall.ts     # Search engine
│   ├── decision-detector.ts  # Auto-decision
│   └── autosummarizer.ts    # Summaries
├── memory/           # Chain storage
│   ├── store.ts      # Atomic writes
│   └── chain.ts      # Block validation
├── providers/        # LLM integrations
│   ├── ollama.ts     # Local models
│   ├── openai.ts     # OpenAI
│   └── openclaw.ts   # Gateway
└── tui/              # Terminal UI
    └── screens/      # Dashboard, Journal, Ask, etc.
```

### Roadmap

- [x] Łańcuchy pamięci z SHA256
- [x] CLI (journal, ask, recall, status)
- [x] Vault (szyfrowane sekrety)
- [x] Decision detector
- [x] Autosummarizer
- [x] TUI (Dashboard, Decisions, Summary)
- [ ] Decision lifecycle (active/superseded)
- [ ] Agent loop (automatyzacje)
- [ ] Memory compression (hierarchiczne)

### License

MIT

---

Built by Memphis for the Oswobodzeni community.
