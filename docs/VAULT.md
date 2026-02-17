# Memphis Vault - User Guide

Secure your API keys and secrets with AES-256-GCM encryption.

## Quick Start

### 1. Initialize Vault
```bash
npx @elathoxu-crypto/memphis vault init
```
This creates your unique DID (Decentralized Identifier).

### 2. Add Secrets
```bash
# Add API key
npx @elathoxu-crypto/memphis vault add openrouter sk-xxxxx --password YOUR_PASSWORD

# Add another secret
npx @elathoxu-crypto/memphis vault add minimax sk-yyyyy --password YOUR_PASSWORD
```

### 3. List Secrets
```bash
npx @elathoxu-crypto/memphis vault list
```

### 4. Get Secret
```bash
npx @elathoxu-crypto/memphis vault get openrouter --password YOUR_PASSWORD
```

## Commands

| Command | Description |
|---------|-------------|
| `vault init` | Initialize vault with DID |
| `vault add <key> <value>` | Add encrypted secret |
| `vault list` | List all secret names |
| `vault get <key>` | Decrypt and show secret |

## Security

- **Encryption**: AES-256-GCM (military-grade)
- **Key Derivation**: PBKDF2 with 100k iterations
- **Password**: Required for encrypt/decrypt
- **Chain**: Each secret linked to previous block

## DID (Self-Sovereign Identity)

Your DID is generated on `vault init`:
```
did:memphis:78da2777c413b2b32995a6829966a6d0
```

This is your portable identity - store it safely!

## Troubleshooting

### Wrong password
```
✗ Wrong password or corrupted data!
```
Make sure you use the same password as when adding the secret.

### Vault already initialized
```
Vault already initialized!
```
Vault can only be initialized once. Use `vault add` to add more secrets.
