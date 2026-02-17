# ADR-001: Blockchain-Based Memory Storage

**Status:** Accepted  
**Date:** 2026-02-17  
**Author:** Memphis Core Team

## Context

Memphis needs an immutable, tamper-evident storage system for AI memory that:
- Survives between sessions
- Cannot be forged or modified retroactively
- Supports multiple independent memory chains (journal, build, adr, ops)

## Decision

We will use a **blockchain-inspired append-only ledger** with SHA256 hash linking:

```
Block N:   { index, timestamp, data, prev_hash }
                          ↓
Hash:      sha256(index + timestamp + data + prev_hash)
                          ↓
Block N+1: { ..., prev_hash = Hash(Block N) }
```

## Consequences

### Positive
- ✅ **Tamper detection**: Any modification breaks the chain
- ✅ **Integrity**: SHA256 linking ensures historical integrity
- ✅ **Multiple chains**: Separate chains for different data types
- ✅ **Lightweight**: No proof-of-work, just hash linking

### Negative
- ⚠️ Append-only: Deletion requires new "revocation" blocks
- ⚠️ No distributed consensus (local-first design)

## Implementation

See `src/memory/chain.ts` and `SOUL.md` for full specification.

## Related

- SOUL.md: Immutable ledger rules
- ADR-002: Vault encryption for secrets
