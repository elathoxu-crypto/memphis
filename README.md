# Memphis 🧠

**Local-first cognitive engine with AI-powered intelligence features.**

**Latest: v1.7.6 — Event Detection System (Phase 6 Week 3-4)**

[English](#english) | [Polski](#polski)

---

## English

### 🚀 New to Memphis?

**→ [Read the 5-minute Quickstart Guide](docs/QUICKSTART.md) ←**

Get your first memory saved in 5 minutes. No complexity, just the essentials.

### ✨ What's New in v1.7.6?

**Event Detection System (Phase 6 Week 3-4):**
- **Process Monitoring** — Detects when processes start/finish/fail
- **File Change Detection** — Tracks create/modify/delete events
- **Pattern Detection** — Identifies error spikes and activity bursts
- **Smart Suggestions** — Context-aware prompts based on events
- **Combined Triggers** — Time + event-based suggestions working together

**TUI Complete (v1.7.3-v1.7.5):**
- **Phase 3** — Search integration, Tab autocomplete, sync status widget
- **Phase 4** — Keyboard shortcuts (Ctrl+J/R/S/T), dark/light themes, command history
- **Phase 5** — Journal sidebar, config export/import, persistent settings

**Quick Example:**
```bash
# Event detection works automatically in background
memphis journal "Finished debugging session"

# TUI shows event-based suggestions:
💡 Suggestions:
  [1] What did you learn from this debug session?
  [2] Record the root cause for future reference?
```

**Quick Example:**
```bash
memphis journal "Meeting with John about Project X" --suggest-tags

Suggested tags (confidence):
  meeting (100%)
  person (90%)
  project (80%)

Accept suggestions? [y/n/e=edit/s=skip]: y
✓ Applied: meeting, person, project
```

**Performance:**
- Pattern matching: 0.27ms (37x faster than target)
- LLM fallback: 140ms (93x optimized)
- Event detection: <10ms for 100 events
- Tests: 182 tests passing (100%)

---

### Overview
Memphis is a self-hosted AI brain that keeps append-only chains for every action (journal, ask, decisions, summaries, share). It blends keyword + semantic recall, grows a knowledge graph, runs daily reflections, and keeps a daemon watching repos so you can summon the right context instantly.

**Phase 6 adds:**
- **Auto-categorization** — Tags your journal entries automatically
- **Learning system** — Adapts to your workflow
- **Time-based prompts** — Never forget to journal
- **Smart suggestions** — Context-aware reminders

### ASCII Architecture
```
                 ┌────────────┐        ┌────────────┐
  Files / Git ──▶│  ingest    │──┬────▶│  chains    │◀─────┐   Local CLI
  Plans / LLM ──▶│  journal   │  │     │ (SHA256)   │      │   (ask/tui)
                 └────┬───────┘  │     └────┬───────┘      │
                      │          │          │              │
                      │          │    ┌─────▼────┐   ┌─────▼────┐
                      │          └───▶│  recall  │   │  reflect │
                      │               └────┬─────┘   └────┬─────┘
                      │                    │              │
                      │               ┌────▼────┐   ┌─────▼────┐
                      └──────────────▶│  graph  │──▶│   ask    │
                                       └────┬───┘   └──────────┘
                                            │
                                      ┌─────▼─────┐
                                      │  daemon   │ (watchers, share-sync, autosummary)
                                      └───────────┘
```

### Install, Upgrade, and Smoke Test
1. **Clone & install**
   ```bash
   git clone https://github.com/elathoxu-crypto/memphis.git
   cd memphis
   npm install
   ```
2. **Build CLI** – `npm run build` (outputs `dist/`).
3. **Initialize data home** – `node dist/cli/index.js init` (recreates `~/.memphis`).
4. **Run the mandatory smoke** – the repo ships `scripts/smoke-test.sh`:
   ```bash
   chmod +x scripts/smoke-test.sh
   bash scripts/smoke-test.sh
   ```
   It checks status, journals a tagged entry, exercises recall, reflections, graph, ingest dry-run, and daemon status—mirroring real workflows.
5. **Regression tests** – `npm run build && npx vitest run` must stay green (currently 163 tests).

### Command Handbook (All Commands)
_Core memory_

| Command | What it does / key flags |
| --- | --- |
| `memphis init` | Bootstrap `~/.memphis` store and config. |
| `memphis journal <text> [--tags --force]` | Append entries; `--force` triggers autosummary. |
| `memphis recall <scopeOrKeyword> [query]` | Keyword + semantic recall with `--chain`, `--tag`, `--since`, `--json`. |
| `memphis ask <question>` | Pull recall context, knowledge graph, summaries; supports `--provider`, `--model`, `--graph`, `--no-save`. |
| `memphis status [--json --verbose]` | Inspect providers, chain counts, daemon heartbeat. |
| `memphis reflect [--daily|--weekly|--deep]` | Generate reflection summaries; `--save` stores outputs. |
| `memphis summarize [--dry-run --force --llm]` | Manual autosummary trigger with block thresholds. |

_Knowledge graph & ingestion_

| Command | What it does / key flags |
| --- | --- |
| `memphis embed [--chain --since --limit --force]` | Build embeddings for recall/graph. |
| `memphis ingest <path> [--chain --tags --embed --recursive --dry-run]` | Chunk + ingest docs or folders. |
| `memphis watch [path] [--chain --no-embed --quiet]` | File watcher that ingests on change. |
| `memphis graph build [--chains --threshold --limit --dry-run]` | Materialize triples into `graph` chain. |
| `memphis graph show [nodeId] [--depth --tag --stats]` | Explore nodes, edges, and stats. |

_Decisions, plans, agents_

| Command | What it does / key flags |
| --- | --- |
| `memphis decide <title> <chosen>` | Record decisions with `--options`, `--scope`, `--mode`, `--confidence`. |
| `memphis show decision <id>` | Display decision or record details. |
| `memphis revise <decisionId> [--reasoning]` | Append a revision referencing the original decision. |
| `memphis plan [--focus --goal --since --output --exec --yolo]` | Emit Codex-ready plans or JSON tasks. |
| `memphis agent <start|stop|status|openclaw|collab> [options]` | Control automation agents, OpenClaw bridge. |
| `memphis bot [start|webhook]` | Launch or configure the Telegram bot. |
| `memphis tui [--screen]` | Start the terminal UI dashboard. |

_Share, sync, vault_

| Command | What it does / key flags |
| --- | --- |
| `memphis share-sync [--push --pull --all --limit --since --dry-run --push-disabled]` | Push/pull `share` chain blocks through Pinata/IPFS. |
| `memphis share replicator [--plan --push --pull --file --limit --dry-run]` | Manage share manifests between Watra ↔ Style setups. |
| `memphis vault <action> [key] [value] [--password-env --password-stdin]` | Initialize, list, add, fetch, or delete encrypted secrets. |
| `memphis soul status [--pretty --workspace]` | Report SOUL/autonomy status for the workspace. |

_Ops & safety_

| Command | What it does / key flags |
| --- | --- |
| `memphis verify [--chain --json --verbose]` | Validate chain integrity. |
| `memphis repair [--chain --dry-run --json]` | Quarantine or fix corrupted blocks. |
| `memphis embed ...` | (see above) often rerun post-repair. |
| `memphis share-sync ...` | (see above) ties into release gating. |
| `memphis daemon <start|stop|status|restart|logs>` | Manage the background daemon / collectors. |

_Daemon-adjacent utilities_

| Command | What it does / key flags |
| --- | --- |
| `memphis reflect ...` | (see above) run scheduled reflections on demand. |
| `memphis plan ...` | (see above) ensures Codex/self-coding feedback loop. |
| `memphis share-sync ...` | (see above) replicates share-tagged payloads. |
| `memphis ingest ...` | (see above) is your ingestion surface for daemon + manual flows. |

> **Tip:** call commands either via `node dist/cli/index.js <cmd>` (direct) or install globally and use the `memphis` binary.

---

### Best Workflow

Memphis grows over time. The more you feed it, the smarter it gets.

**Week 1 — Just journal (no analysis yet)**
```bash
# Morning: set intention
memphis journal "Today I want to..." --tags goal,focus

# During work: capture decisions and insights
memphis journal "Decided: X instead of Y because..." --tags decision
memphis journal "Problem: ... Solution: ..." --tags bug,fix
memphis journal "Insight: ..." --tags insight

# Evening: end of day
memphis journal "EOD: done X, tomorrow Y" --tags eod
```

**Week 2 — First embeddings and graph**
```bash
memphis embed                  # once a day (after journaling)
memphis graph build            # after embed
memphis reflect --weekly       # every Friday
```

**Week 3+ — Ask questions with context**
```bash
memphis ask "what decisions did I make about architecture?"
memphis ask "what problems are still unresolved?"
memphis recall decision --since 7d
```

**Always on — daemon in background**
```bash
memphis daemon start           # captures git commits + shell history automatically
```

> 💡 **Rule of thumb:** graph clusters appear after ~20 blocks. Real insights start at ~100. At 1000+ blocks Memphis becomes a map of your thinking.

---

## Polski

### Opis
Memphis to lokalny silnik poznawczy: zapisuje każdy blok w łańcuchach z hashem SHA256, miesza wyszukiwanie słowne z embeddingami, buduje graf wiedzy, prowadzi automatyczne refleksje i posiada demona pilnującego repozytoriów.

### Architektura ASCII
```
                 ┌────────────┐        ┌────────────┐
  Pliki / Git ──▶│  ingest    │──┬────▶│  chains    │◀─────┐   CLI lokalne
  Plany / LLM ──▶│  journal   │  │     │ (SHA256)   │      │   (ask/tui)
                 └────┬───────┘  │     └────┬───────┘      │
                      │          │          │              │
                      │          │    ┌─────▼────┐   ┌─────▼────┐
                      │          └───▶│  recall  │   │  reflect │
                      │               └────┬─────┘   └────┬─────┘
                      │                    │              │
                      │               ┌────▼────┐   ┌─────▼────┐
                      └──────────────▶│  graph  │──▶│   ask    │
                                       └────┬───┘   └──────────┘
                                            │
                                      ┌─────▼─────┐
                                      │  daemon   │ (watchers, share-sync, autosummary)
                                      └───────────┘
```

### Szybki start + smoke test
1. `git clone … && cd memphis && npm install`.
2. `npm run build` aby wygenerować `dist/`.
3. `node dist/cli/index.js init` – tworzy świeże `~/.memphis`.
4. Test dymny:
   ```bash
   chmod +x scripts/smoke-test.sh
   bash scripts/smoke-test.sh
   ```
5. Regressje: `npm run build && npx vitest run` (163 testów powinno przejść).

### Tabela komend (pełna)
| Komenda | Opis |
| --- | --- |
| `memphis init` | Inicjuje katalog domowy Memphis. |
| `memphis journal <tekst> [--tags --force]` | Dodaje wpis do łańcucha journal, `--force` wymusza autosummary. |
| `memphis recall <zakres|słowo> [query]` | Szuka po słowach, tagach, czasie, z opcją `--json`. |
| `memphis ask <pytanie>` | Zadaje pytanie z kontekstem recall/graph; wybierz model i providera. |
| `memphis status [--json --verbose]` | Stan łańcuchów, providerów i demona. |
| `memphis reflect [--daily|--weekly|--deep]` | Generuje refleksje i (opcjonalnie) zapisuje je. |
| `memphis summarize [--dry-run --force --llm]` | Ręczne wyzwolenie autosummaries. |
| `memphis embed [...]` | Buduje embeddingi dla wybranych łańcuchów. |
| `memphis ingest <ścieżka> [...]` | Wczytuje pliki/katalogi do pamięci, może od razu embedować. |
| `memphis watch [ścieżka] [...]` | Nasłuchuje zmian i wywołuje ingest. |
| `memphis graph build [...]` | Buduje graf wiedzy z progami podobieństwa. |
| `memphis graph show [nodeId] [...]` | Pokazuje węzły, krawędzie lub statystyki grafu. |
| `memphis decide <tytuł> <wybór>` | Rejestruje decyzję wraz z kontekstem. |
| `memphis show decision <id>` | Wyświetla konkretną decyzję/blok. |
| `memphis revise <decisionId>` | Dodaje rewizję dla wcześniejszej decyzji. |
| `memphis plan [...]` | Buduje plan dla agenta Codex/self-coding. |
| `memphis agent <akcja>` | Steruje agentami (start/stop/status/openclaw/collab). |
| `memphis bot [start|webhook]` | Bot telegramowy. |
| `memphis tui [--screen]` | Uruchamia TUI. |
| `memphis share-sync [...]` | Push/pull łańcucha `share` (IPFS/Pinata). |
| `memphis share replicator [...]` | Zarządza manifestami Watra ↔ Style. |
| `memphis vault <akcja>` | Szyfruje sekret (`init/add/list/get/delete`). |
| `memphis soul status [...]` | Status SOUL/autonomy dla workspace. |
| `memphis verify [...]` | Sprawdza integralność łańcucha. |
| `memphis repair [...]` | Naprawia / izoluje uszkodzone bloki. |
| `memphis daemon <start|stop|status|restart|logs>` | Kontroluje proces demona. |

Dbaj o zachowanie workflowu: smoke-test, `npm run build`, `npx vitest run`, a przed wydaniem wypchnij `share` oraz dziennik zmian.

---

### Najlepszy workflow

Memphis rośnie z czasem. Im więcej karmisz, tym mądrzejszy staje się.

**Tydzień 1 — sam journaling (bez analizy)**
```bash
# Rano: intencja
memphis journal "Dziś chcę..." --tags cel,focus

# W trakcie: decyzje i insighty
memphis journal "Postanawiam: X zamiast Y bo..." --tags decyzja
memphis journal "Problem: ... Rozwiązanie: ..." --tags bug,fix
memphis journal "Insight: ..." --tags insight

# Wieczór: koniec dnia
memphis journal "EOD: zrobiłem X, jutro Y" --tags eod
```

**Tydzień 2 — pierwsze embeddingi i graf**
```bash
memphis embed                  # raz dziennie po journalowaniu
memphis graph build            # po embed
memphis reflect --weekly       # co piątek
```

**Tydzień 3+ — pytania z kontekstem**
```bash
memphis ask "jakie decyzje podjąłem o architekturze?"
memphis ask "jakie problemy są nierozwiązane?"
memphis recall decyzja --since 7d
```

**Zawsze — daemon w tle**
```bash
memphis daemon start           # łapie git commity i historię shella automatycznie
```

> 💡 **Zasada kciuka:** klastry w grafie pojawiają się po ~20 blokach. Prawdziwe insighty od ~100. Przy 1000+ blokach Memphis staje się mapą Twojego myślenia.
