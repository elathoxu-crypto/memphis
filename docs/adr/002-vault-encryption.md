# ADR-002: Vault Encryption with AES-256-GCM

**Status:** Accepted  
**Date:** 2026-02-17  
**Author:** Memphis Core Team

## Context

Memphis needs secure storage for:
- API keys (OpenRouter, Minimax, Ollama)
- Sensitive credentials
- User secrets

Secrets must be:
- Encrypted at rest
- Protected by user password
- Verifiable (tamper-evident)

## Decision

We will use **AES-256-GCM** with **PBKDF2** key derivation:

```
Master Password + Random Salt → PBKDF2 → AES-256 Key
Plaintext + AES-256-GCM + IV → Encrypted Data
```

### Block Structure (Vault Type)
```json
{
  "type": "vault",
  "content": "openrouter",
  "encrypted": "base64(iv + salt + tag + ciphertext)",
  "iv": "12 bytes (in encrypted)",
  "key_id": "secret name"
}
```

## Consequences

### Positive
- ✅ **Military-grade encryption**: AES-256-GCM (authenticated)
- ✅ **Secure key derivation**: PBKDF2 with 100k iterations
- ✅ **Tamper detection**: GCM auth tag fails if modified
- ✅ **Chain-linked**: Each secret can use prev_hash as salt

### Negative
- ⚠️ Password required: No password = no access
- ⚠️ No recovery: Lost password = lost secrets

## Implementation

See `src/utils/crypto.ts` and `src/cli/commands/vault.ts`.

## Related

- ADR-001: Blockchain memory storage
- ADR-003: SSI Identity (DID-based)
