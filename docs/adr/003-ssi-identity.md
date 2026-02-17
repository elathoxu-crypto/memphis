# ADR-003: Self-Sovereign Identity (SSI) with DID

**Status:** Proposed  
**Date:** 2026-02-17  
**Author:** Memphis Core Team

## Context

Memphis needs a portable, decentralized identity system that:
- Works offline
- Is controlled by the user (self-sovereign)
- Can verify credentials without central authority
- Integrates with the existing blockchain

## Decision

We will use **Decentralized Identifiers (DID)** following W3C standard:

```
DID Format: did:memphis:<random-16-bytes-hex>

Example: did:memphis:0f2ae1d44a3b6149b50e2c00390874ec
```

### Credential Structure
```json
{
  "type": "credential",
  "schema": "api_key",           // credential type
  "issuer": "did:memphis:xxx",   // who issued
  "holder": "did:memphis:yyy",   // owner
  "proof": "...",                // digital signature
  "encrypted": "...",             // optional encrypted data
  "tags": ["verified"]
}
```

## Chain-Link Identity (Forging the Links)

Each vault block can use `prev_hash` as part of the encryption key:
- Block N+1 key = PBKDF2(password + Block N hash)
- This creates a "chain of trust" - compromising one block weakens all subsequent blocks
- "Forging links" metaphor: Kuć Ogniwa 🔗

## Consequences

### Positive
- ✅ **Portable**: DID works anywhere, no central registry
- ✅ **Verifiable**: Cryptographic proofs without intermediaries
- ✅ **Chain-linked**: Tampering breaks the chain of trust
- ✅ **Offline-first**: Works without internet

### Negative
- ⚠️ No revocation authority: Must implement revocation list
- ⚠️ Complexity: DID resolution requires additional logic

## Implementation

See `src/utils/crypto.ts` (generateDID function) and `src/memory/chain.ts` (credential type).

## Related

- ADR-001: Blockchain memory storage
- ADR-002: Vault encryption
