# Tutorial: Build Your Personal Cognitive Market

**Level:** Intermediate  
**Time:** 30 minutes  
**Updated:** 2026-03-01

---

## 🎯 Czego się nauczysz

W tym tutorialu zbudujesz **osobisty rynek poznawczy** — system wymiany wiedzy między swoimi agentami AI.

```
┌────────────┐    share-sync    ┌────────────┐
│   Laptop   │ ◄──────────────► │   Phone    │
│  (Watra)   │    IPFS/Pinata   │  (Mobile)  │
└────────────┘                  └────────────┘
      │
      │  share-sync
      ▼
┌────────────┐
│  Desktop   │
│  (Style)   │
└────────────┘
```

**Co zyskasz:**
- ✅ Synchronizację pamięci między urządzeniami
- ✅ Wymianę wiedzy między agentami
- ✅ Backup na IPFS
- ✅ Izolację projektów (workspace)

---

## 📋 Prerequisites

- Memphis v1.3.0+ zainstalowany
- Pinata account (free tier: 1GB)
- 2+ urządzenia lub agenty

---

## Krok 1: Setup Pinata

### 1.1 Utwórz konto

```bash
# Przejdź do https://pinata.cloud
# Zarejestruj się (free tier)
```

### 1.2 Pobierz JWT

```bash
# API Keys → New Key → Admin
# Skopiuj JWT
```

### 1.3 Skonfiguruj Memphis

```bash
# Edytuj ~/.memphis/config.yaml
cat >> ~/.memphis/config.yaml << 'EOF'

integrations:
  pinata:
    jwt: your-pinata-jwt-here

share:
  enabled: true
  policy:
    ttl: 168          # 7 days
    maxSize: 2048     # 2KB per block
    autoCleanup: true
EOF
```

---

## Krok 2: Tag Your Blocks

### 2.1 Dodaj tag `share` do bloków

```bash
# Journal entry
memphis journal "Important decision: use GLM-5 for coding" --tags decision,share

# Decision
memphis decide "Move to GLM-5 stack" --context "Better reasoning" --tags share

# Ask
memphis ask "How to optimize embeddings?" --tags share
```

**Ważne:** Tylko bloki z tagiem `share` będą synchronizowane!

---

## Krok 3: First Sync

### 3.1 Na urządzeniu A (source)

```bash
# Sprawdź co zostanie wysłane
memphis share-sync --push --dry-run

# Wyślij do IPFS
memphis share-sync --push

# Output:
# ✓ Pinned 5 blocks to IPFS
# ✓ CID: QmXyz...
# ✓ Logged to network-chain.jsonl
```

### 3.2 Na urządzeniu B (target)

```bash
# Pobierz z IPFS
memphis share-sync --pull

# Output:
# ✓ Fetched 5 blocks from QmXyz...
# ✓ Imported to share chain
# ✓ Deduplicated 0 blocks
```

---

## Krok 4: Verify Sync

### 4.1 Sprawdź chain

```bash
# Na obu urządzeniach
memphis show share

# Powinno być to samo!
```

### 4.2 Sprawdź network log

```bash
cat ~/.memphis/network-chain.jsonl | jq .

# Output:
{
  "cid": "QmXyz...",
  "timestamp": "2026-03-01T10:00:00Z",
  "blocks": 5,
  "source": "watra@laptop"
}
```

---

## Krok 5: Workspace Isolation

### 5.1 Utwórz workspace dla projektu

```bash
# Edytuj ~/.memphis/config.yaml
cat >> ~/.memphis/config.yaml << 'EOF'

security:
  workspaces:
    - id: work
      label: "Work Projects"
      policy:
        allowedChains: ["journal", "decisions", "ask"]
        includeDefault: false
    
    - id: personal
      label: "Personal Notes"
      policy:
        allowedChains: ["journal", "goals", "wisdom"]
        includeDefault: true
EOF
```

### 5.2 Przełączaj workspace

```bash
# Lista workspace'ów
memphis workspace list

# Przełącz na work
memphis workspace set work

# Teraz wszystkie operacje są izolowane
memphis journal "Meeting with client..."
memphis decide "Use React for frontend"

# Powrót do default
memphis workspace set default
```

---

## Krok 6: Trade Protocol

### 6.1 Utwórz ofertę

```bash
# Agent A oferuje bloki
memphis trade create did:memphis:style-main \
  --blocks journal:0-100 \
  --ttl 7 \
  --usage "read-only"

# Output:
# ✓ Trade offer created
# ✓ Manifest: manifest-20260301.json
```

### 6.2 Zaakceptuj ofertę

```bash
# Agent B akceptuje
memphis trade accept manifest-20260301.json

# Output:
# ✓ Verified signature
# ✓ Imported 100 blocks
# ✓ Logged to trade chain
```

---

## Krok 7: MCP Integration

### 7.1 Start MCP server

```bash
# Na porcie stdio
memphis mcp start

# Teraz inne narzędzia mogą używać Memphis
```

### 7.2 Configure Claude Desktop

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "memphis": {
      "command": "memphis",
      "args": ["mcp", "start"]
    }
  }
}
```

### 7.3 Use in Claude

```
Claude: Use memphis.search to find blocks about "embeddings"
Claude: Use memphis.journal.add to save this insight
```

---

## 🎉 Gratulacje!

Masz teraz działający **osobisty rynek poznawczy**:

- ✅ Synchronizacja między urządzeniami
- ✅ Backup na IPFS
- ✅ Izolacja workspace'ów
- ✅ Bezpieczna wymiana między agentami
- ✅ MCP integration dla innych narzędzi

---

## 📚 Co dalej?

### Automatyzacja

```bash
# Cron job (codziennie o 22:00)
0 22 * * * memphis share-sync --all
```

### Advanced Workflows

```bash
# Full sync z cleanup
memphis share-sync --all --cleanup

# Limit bloków
memphis share-sync --push --limit 20

# Od konkretnej daty
memphis share-sync --pull --since 2026-03-01
```

### Monitoring

```bash
# Status sieci
memphis status

# Sprawdź chainy
memphis verify --all

# Audit log
cat ~/.memphis/network-chain.jsonl | jq -r '.[] | "\(.timestamp) \(.blocks) blocks"'
```

---

## 🐛 Troubleshooting

### Pinata rate limit

```
Error: Pinata rate limit exceeded
```

**Fix:** Poczekaj lub upgrade planu.

### CID not found

```
Error: CID QmXyz... not found on gateway
```

**Fix:** Pinata propagation trwa do 5 minut. Spróbuj ponownie.

### Duplicate blocks

```
Warning: 10 blocks deduplicated
```

**To normalne!** Memphis sprawdza hash i pomija duplikaty.

---

## 📖 Resources

- **Docs:** `docs/NEXUS.md`
- **Examples:** `examples/`
- **Community:** https://discord.com/invite/clawd
- **GitHub:** https://github.com/elathoxu-crypto/memphis

---

**Questions?** Otwórz issue na GitHub lub zapytaj na Discord!
