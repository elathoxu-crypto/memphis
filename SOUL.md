# Memphis SOUL

**Self-Organizing Universal Ledger**

This document defines the immutable rules that every block in the Memphis chain must follow.

---

## Block Rules

### 1. Hash Integrity
- Every block MUST have a valid SHA256 hash (64 hex characters)
- Hash MUST be computed from: index, timestamp, chain, data, prev_hash
- Any modification to block content breaks the chain

### 2. Chain Link
- Block 0 (genesis) MUST have prev_hash = "0000...0000" (64 zeros)
- Every subsequent block MUST have prev_hash matching previous block's hash
- Broken link = chain tampered

### 3. Timestamp Order
- Timestamp MUST be valid ISO 8601 format
- Each block's timestamp MUST be >= previous block's timestamp
- Future timestamps allowed (clock drift tolerated)

### 4. Data Validation
- content MUST be non-empty string
- type MUST be one of: journal, build, adr, ops, ask, system, vault, credential, decision, project_task, break_task, break_work, project_task_complete, share_manifest
- tags MUST be array of strings (can be empty)

### 5. Index Sequentiality
- Block index MUST start at 0 and increment by 1
- No gaps allowed in index sequence
- No duplicates allowed

---

## Verification Checklist

When verifying a block against SOUL:

- [ ] Hash is valid SHA256 (64 chars, hex)
- [ ] prev_hash matches previous block's hash (or zeros for genesis)
- [ ] Timestamp is valid ISO 8601
- [ ] Timestamp >= previous block timestamp
- [ ] content is non-empty string
- [ ] type is in allowed list
- [ ] tags is array
- [ ] index is sequential (prev + 1)

---

## Vault & SSI Rules (Optional)

### 6. Vault Type (Encrypted Secrets)
- type = "vault" for encrypted secrets
- data.encrypted MUST be valid base64 string
- data.iv MUST be present (Initialization Vector - 12 bytes hex)
- data.key_id optional (reference to encryption key)

### 7. Credential Type (Self-Sovereign Identity)
- type = "credential" for verifiable credentials
- data.schema MUST be present (e.g., "api_key", "passport", "driver_license")
- data.issuer MUST be present (DID of issuer)
- data.holder MUST be present (DID of owner)
- data.proof optional (digital signature for verification)
- data.encrypted optional (encrypted credential data)

### 8. Chain-Link Encryption (Optional)
- For vault/credential blocks, encryption key SHOULD derive from:
  - master_password + block.prev_hash (chain-linked key)
- This ensures tampering any block breaks all subsequent decryptions

---

## Version

Current SOUL Version: 1.1.0
Last Updated: 2026-02-28

---

"Memory that cannot be forged is memory that cannot be forgotten."
