# Memphis Nexus — Inter-Agent Memory Exchange

**Status:** Phase 4 (Q1 2027) — In Progress  
**Updated:** 2026-03-01

---

## 🎯 Co to jest Memphis Nexus?

Memphis Nexus to **decentralizowana wymiana pamięci między agentami AI**.

```
┌─────────────┐     IPFS/Pinata     ┌─────────────┐
│   Watra     │ ◄─────────────────► │   Style     │
│  (OpenClaw) │     share-sync      │  (Memphis)  │
└─────────────┘                     └─────────────┘
       │                                   │
       │         ┌─────────────┐           │
       └────────►│   Synjar    │◄──────────┘
                 │  (Future)   │
                 └─────────────┘
```

---

## 📦 Kluczowe komponenty

### 1. Share-Sync Protocol

**Cel:** Wymiana bloków pamięci między agentami.

```bash
# Agent A (Watra) eksportuje
memphis share-sync --push

# Agent B (Style) importuje
memphis share-sync --pull
```

**Co jest syncowane:**
- Bloki z tagiem `share`
- Bloki z `policy.share: true`
- Manifesty z CID na Pinata

**Network chain:** `~/.memphis/network-chain.jsonl`

---

### 2. RLS Workspace System

**Cel:** Izolacja workspace'ów per projekt/kontekst.

```bash
# Lista workspace'ów
memphis workspace list

# Zmień workspace
memphis workspace set project-alpha

# W config.yaml:
security:
  workspaces:
    - id: project-alpha
      label: "Project Alpha"
      policy:
        allowedChains: ["journal", "ask", "decisions"]
        includeDefault: false
```

**RLS Guard** sprawdza dostęp do chainów przed każdą operacją.

---

### 3. Agent Negotiation Protocol

**Cel:** Bezpieczna wymiana bloków między niezaufanymi agentami.

```bash
# Agent A tworzy ofertę
memphis trade create did:memphis:abc123 --blocks journal:0-100 --ttl 7

# Agent B akceptuje
memphis trade accept manifest.json

# Weryfikacja
memphis trade verify manifest.json
```

**Elementy:**
- `TradeOffer` — co, komu, na jak długo
- `TradeManifest` — podpisana oferta (DID)
- `chains/trade` — ledger agreementów

---

### 4. MCP Server

**Cel:** Expose Memphis jako MCP server dla innych narzędzi.

```bash
# Start MCP server
memphis mcp start

# Inspect tools
memphis mcp inspect
```

**Dostępne tools:**
- `memphis.search` — blended keyword + semantic
- `memphis.recall` — raw block filtering
- `memphis.decision.create` — record decisions
- `memphis.journal.add` — add entries
- `memphis.status` — status report

**Użycie:** Cline, Claude Desktop, inne MCP clients.

---

## 🔄 Workflow Examples

### Scenario 1: Daily Sync Between Agents

```bash
# Rano na Watra
memphis share-sync --push  # Eksportuj nowe bloki

# Wieczorem na Style
memphis share-sync --pull  # Importuj bloki od Watry
```

**Result:** Obydwa agenty mają tę samą bazę wiedzy.

---

### Scenario 2: Project Isolation

```bash
# Workspace dla projektu
memphis workspace set client-xyz

# Wszystkie operacje izolowane
memphis journal "Client meeting notes..."
memphis ask "What did we decide about API?"

# Powrót do głównego
memphis workspace set default
```

**Result:** Dane klienta nie mieszają się z osobistymi.

---

### Scenario 3: MCP Integration

```bash
# Start MCP server
memphis mcp start &

# W Cline/Claude Desktop:
# Configure MCP server: stdio://localhost/memphis

# Teraz Claude może:
# - Search Memphis memory
# - Add journal entries
# - Create decisions
```

**Result:** Claude ma dostęp do Twojej pamięci Memphis.

---

## 🔐 Security Model

### RLS (Row-Level Security)

```yaml
# ~/.memphis/config.yaml
security:
  enabled: true
  defaultPolicy:
    allowedChains: ["journal", "ask"]
    includeDefault: true
  
  workspaces:
    - id: private
      policy:
        allowedChains: ["*"]  # All chains
        includeDefault: true
    
    - id: shared
      policy:
        allowedChains: ["journal", "share"]
        includeDefault: false
```

### Trade Protocol

1. **DID Verification** — każdy agent ma unikalny DID
2. **TTL** — oferty wygasają
3. **Usage Rights** — określają co można zrobić z blokami
4. **Signature** — manifesty są podpisane

---

## 📊 Network Topology

### Current (2026-03-01):

```
Watra (OpenClaw) ──share-sync──► Style (Memphis)
      │                               │
      └──── Pinata/IPFS ◄─────────────┘
```

### Future (Phase 4 complete):

```
        ┌────────────────────────────┐
        │      Memphis Network       │
        │   (Decentralized Ledger)   │
        └───────────┬────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼───┐      ┌───▼───┐      ┌───▼───┐
│ Watra │      │ Style │      │Synjar │
│(Agent)│      │(Agent)│      │(Agent)│
└───────┘      └───────┘      └───────┘
```

---

## 🚀 Getting Started

### 1. Initialize Memphis

```bash
memphis init
```

### 2. Configure Share-Sync

```yaml
# ~/.memphis/config.yaml
integrations:
  pinata:
    jwt: ${PINATA_JWT}

share:
  enabled: true
  policy:
    ttl: 168  # 7 days
    maxSize: 2048  # 2KB per block
```

### 3. Start Syncing

```bash
# Push local blocks
memphis share-sync --push

# Pull remote blocks
memphis share-sync --pull

# Both ways
memphis share-sync --all
```

---

## 📚 Next Steps

- [ ] Multi-agent negotiation (3+ agents)
- [ ] Conflict resolution
- [ ] Reputation system
- [ ] Encrypted trades (E2E)
- [x] Network explorer (TUI) — ✅ v1.5.0 (2026-03-01)

---

**Docs:** `docs/`  
**Issues:** https://github.com/elathoxu-crypto/memphis/issues  
**Community:** https://discord.com/invite/clawd
