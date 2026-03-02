# Security Considerations

**Version:** 2.0.0  
**Date:** 2026-03-02

---

## 📋 Table of Contents

- [Security Overview](#security-overview)
- [Data Privacy](#data-privacy)
- [Encryption](#encryption)
- [Access Control](#access-control)
- [Network Security](#network-security)
- [Supply Chain Security](#supply-chain-security)
- [Audit & Logging](#audit--logging)
- [Security Best Practices](#security-best-practices)

---

## Security Overview

**Memphis is designed with security-first principles:**

| Principle | Implementation |
|-----------|----------------|
| **Local-first** | Data stays on your machine |
| **No telemetry** | No analytics or tracking |
| **No cloud required** | Works offline |
| **Open source** | Code can be audited |
| **MIT licensed** | No restrictions |

---

## Data Privacy

### What Data Is Collected?

**Zero.** Memphis does NOT collect:
- ❌ Usage statistics
- ❌ Error logs (sent externally)
- ❌ Decision content (sent externally)
- ❌ User behavior
- ❌ Identifying information

**What IS stored locally:**
- ✅ Decision history
- ✅ Journal entries
- ✅ Q&A history
- ✅ Embeddings vectors
- ✅ Learned patterns
- ✅ Configuration

**All data stays in** `~/.memphis/`

---

### Data Location

**Default location:**
```
~/.memphis/
├── chains/          # Decision history (JSON)
├── embeddings/      # Search vectors (JSON)
├── patterns.json    # Learned patterns (JSON)
├── accuracy.json    # Accuracy tracking (JSON)
├── config.yaml      # Configuration (YAML)
└── vault/          # Encrypted secrets (encrypted JSON)
```

**Change location:**
```bash
export MEMPHIS_DIR=/custom/path
```

---

### Data Deletion

**Complete deletion:**
```bash
# Stop daemon
memphis daemon stop

# Delete all data
rm -rf ~/.memphis/

# Verify
ls ~/.memphis/
# Should return: No such file or directory
```

**Selective deletion:**
```bash
# Delete decisions only
rm -rf ~/.memphis/chains/decisions/

# Delete embeddings only
rm -rf ~/.memphis/embeddings/

# Delete patterns only
rm ~/.memphis/patterns.json
```

**No cloud traces** - everything is truly deleted.

---

## Encryption

### Vault Encryption

**Purpose:** Store sensitive data (API keys, secrets) securely.

**Algorithm:** AES-256-GCM

**Key Derivation:** PBKDF2 (100,000 iterations)

**Usage:**
```bash
# Initialize vault
memphis vault init

# Add secret
memphis vault add openai_key "sk-abc123..."

# List secrets
memphis vault list

# Get secret
memphis vault get openai_key

# Delete secret
memphis vault delete openai_key
```

---

### Backup & Recovery

**24-word seed phrase:**
```bash
memphis vault backup

# Output:
# Your 24-word recovery phrase:
# word1 word2 word3 ... word24
#
# Write this down. Store it safely.
# Without it, you cannot recover your secrets.
```

**Recover from seed:**
```bash
memphis vault recover --seed "word1 word2 ... word24"
```

---

### Password Management

**Options:**

1. **Environment variable:**
```bash
export MEMPHIS_VAULT_PASSWORD="your-password"
memphis vault add secret "value"
```

2. **Interactive prompt:**
```bash
memphis vault add secret "value"
# Password: ******
```

3. **From stdin:**
```bash
echo "your-password" | memphis vault add secret "value" --password-stdin
```

---

### Sync Encryption

**IPFS/Pinata sync (optional):**

- ✅ End-to-end encryption
- ✅ Data encrypted before upload
- ✅ Only you can decrypt
- ✅ Keys never leave your machine

**Configuration:**
```yaml
# ~/.memphis/config.yaml
share:
  encryption:
    enabled: true
    algorithm: AES-256-GCM
```

---

## Access Control

### File Permissions

**Recommended permissions:**
```bash
# Data directory: 700 (owner only)
chmod 700 ~/.memphis

# Config: 600 (owner read/write only)
chmod 600 ~/.memphis/config.yaml

# Vault: 600 (owner read/write only)
chmod 600 ~/.memphis/vault/*

# Chains: 600 (owner read/write only)
chmod 600 ~/.memphis/chains/*
```

---

### Service Permissions

**Systemd service:**
```ini
[Service]
User=yourusername
Group=yourusername
# Runs as non-root user
```

**Never run as root.**

---

### API Authentication (If Exposed)

**Bearer token:**
```yaml
# ~/.memphis/config.yaml
api:
  enabled: true
  bind_address: "127.0.0.1"  # Only localhost
  port: 3000
  auth:
    type: bearer
    secret: your-secret-key-change-me
```

**Usage:**
```bash
curl -H "Authorization: Bearer your-secret-key" \
  http://localhost:3000/decisions
```

---

### Multi-Agent Access Control

**Agent identity:**
```yaml
# ~/.memphis/config.yaml
agent:
  did: did:memphis:agent-abc123
  name: "My Agent"
  mode: gateway

share:
  allowed_peers:
    - did:memphis:agent-def456
    - did:memphis:agent-ghi789
```

**Only trusted peers** can sync.

---

## Network Security

### Local-Only By Default

**No network exposure:**
```bash
# Memphis CLI (no API)
memphis decide "test" "test"
# ✅ No network traffic (except optional LLM provider)
```

**Ollama:**
```bash
# Local only
curl http://localhost:11434/api/tags
# ✅ 127.0.0.1 only
```

---

### If Exposing API

**1. Bind to localhost only:**
```yaml
api:
  bind_address: "127.0.0.1"
```

**2. Use reverse proxy (nginx):**
```nginx
server {
    listen 443 ssl;
    server_name memphis.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**3. Add authentication:**
```yaml
api:
  auth:
    type: bearer
    secret: your-secret-key
```

---

### Firewall Rules

```bash
# Allow only from trusted network
sudo ufw allow from 192.168.1.0/24 to any port 3000

# Or block all (if not needed)
sudo ufw deny 3000
```

---

### HTTPS/TLS

**If exposing publicly:**

1. **Use Let's Encrypt:**
```bash
sudo certbot --nginx -d memphis.yourdomain.com
```

2. **Enforce HTTPS:**
```nginx
server {
    listen 80;
    server_name memphis.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

3. **HTTP/2 (recommended):**
```nginx
listen 443 ssl http2;
```

---

## Supply Chain Security

### Dependencies

**Audit dependencies:**
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Production audit
npm audit --production
```

**Lockfile:**
```bash
# Check package-lock.json integrity
npm ci
```

---

### npm Scripts

**Run locally:**
```bash
# All scripts run locally
npm run build  # Local TypeScript compilation
npm test       # Local tests
```

**No external script execution** from npm packages.

---

### Git Security

**Signed commits (recommended):**
```bash
# Setup GPG signing
git config --global commit.gpgsign true
git config --global gpg.program gpg

# Sign commits
git commit -S -m "Secure commit"
```

**Verify:**
```bash
git log --show-signature
```

---

### Docker Security

**If using Docker:**

```dockerfile
# Use non-root user
FROM node:20-slim
RUN useradd -m memphis
USER memphis

# Minimal base image
FROM node:20-alpine

# Don't run as root
USER memphis
```

---

## Audit & Logging

### Access Logs

**Daemon logs:**
```bash
# View logs
tail -f ~/.memphis/daemon.log

# Rotate logs
logrotate ~/.memphis/daemon.log
```

**Log format:**
```
[2026-03-02 17:00:00] INFO Daemon started
[2026-03-02 17:00:01] INFO Decision captured: dec_abc123
[2026-03-02 17:00:02] ERROR Pattern learning failed: ...
```

---

### Audit Trail

**All actions logged:**
- ✅ Decision created/modified/deleted
- ✅ Vault operations
- ✅ Sync operations
- ✅ API requests (if enabled)

**View audit log:**
```bash
memphis audit --since 7
```

---

### Integrity Verification

**Chain verification:**
```bash
memphis verify

# Output:
# ✓ Chain 'decisions': Valid
# ✓ Chain 'journal': Valid
# ✓ Chain 'ask': Valid
#
# All chains verified. No corruption detected.
```

---

## Security Best Practices

### General

**✅ DO:**
- Keep Node.js updated
- Use strong passwords for vault
- Enable 2FA on GitHub (for repo access)
- Review dependencies regularly
- Use HTTPS if exposing API
- Backup your data
- Use firewall if exposing API
- Review logs periodically

**❌ DON'T:**
- Run as root
- Store API keys in config files
- Expose API to public internet without auth
- Commit `.memphis/` to git
- Share 24-word seed phrase
- Use weak passwords
- Ignore security warnings

---

### Password Security

**Vault password requirements:**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Not reused across services

**Example:** `K3#9mP$2xQ!vF`

---

### API Keys

**Best practices:**
- ✅ Use vault for storage
- ✅ Rotate regularly
- ✅ Use environment-specific keys
- ❌ Never commit to git
- ❌ Never share publicly
- ❌ Don't use default keys

**Use vault:**
```bash
memphis vault add openai_key "sk-abc123..."
```

---

### Backup Security

**Secure backups:**
```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 memphis-backup.tar.gz

# Delete unencrypted backup
rm memphis-backup.tar.gz

# Store encrypted backup safely
cp memphis-backup.tar.gz.gpg /secure/backup/location/
```

---

### Multi-Agent Sync

**Secure sync:**
```yaml
share:
  encryption:
    enabled: true
  allowed_peers:
    - did:memphis:trusted-agent-1
    - did:memphis:trusted-agent-2
```

**Verify peer identity:**
```bash
memphis trade verify manifest.json
```

---

## Vulnerability Reporting

### Security Policy

**How to report vulnerabilities:**

1. **Email:** security@memphis.ai
2. **Subject:** SECURITY: [description]
3. **Include:**
   - Vulnerability description
   - Steps to reproduce
   - Impact
   - Suggested fix (optional)

4. **Expect response:** Within 48 hours

5. **Disclose:**
   - After fix is released
   - Credit to reporter

---

### Responsible Disclosure

**Timeline:**
- **Day 0-2:** Triage and response
- **Day 2-7:** Investigation and fix
- **Day 7-14:** Testing and validation
- **Day 14+:** Public disclosure

---

## Compliance

### GDPR

**Memphis is GDPR-compliant by design:**
- ✅ Data stored locally (user controls)
- ✅ Right to deletion (rm -rf ~/.memphis)
- ✅ No data collection
- ✅ No cross-border transfer (unless user enables sync)
- ✅ Transparent (open source)

---

### CCPA

**Memphis is CCPA-compliant:**
- ✅ User controls data
- ✅ Easy deletion
- ✅ No collection without consent
- ✅ Transparent data practices

---

## Security Checklist

**Before production deployment:**

- [ ] Running as non-root user
- [ ] File permissions: 700 (directory), 600 (files)
- [ ] API bound to localhost (or properly secured)
- [ ] Vault password strength: 12+ characters
- [ ] 24-word seed phrase stored securely
- [ ] HTTPS/TLS enabled (if exposing API)
- [ ] Authentication enabled (if exposing API)
- [ ] Firewall configured (if needed)
- [ ] Dependencies audited (`npm audit`)
- [ ] Logs configured and rotating
- [ ] Backups automated
- [ ] Chain verification enabled
- [ ] Sync encryption enabled (if using)
- [ ] Peer whitelist configured (multi-agent)
- [ ] Recovery plan documented

---

## Known Security Considerations

### Limitations

**1. No built-in rate limiting**
- Workaround: Use reverse proxy (nginx)

**2. No input sanitization for custom commands**
- Workaround: Validate user input

**3. No RBAC (Role-Based Access Control)**
- Workaround: Use OS-level permissions

**4. No audit log tamper protection**
- Workaround: Store logs in read-only location

---

## Security Updates

**Stay updated:**
```bash
# Check for updates
cd memphis
git fetch origin
git log HEAD..origin/master --oneline

# Update (after backup)
git pull origin master
npm ci
npm run build
```

**Subscribe to:**
- GitHub releases: https://github.com/elathoxu-crypto/memphis/releases
- Security advisories: https://github.com/elathoxu-crypto/memphis/security/advisories

---

## Questions?

**Security questions:**
- Email: security@memphis.ai
- Discord: https://discord.gg/clawd
- GitHub Issues: https://github.com/elathoxu-crypto/memphis/issues

---

**Security Version:** 2.0.0  
**Last Updated:** 2026-03-02

**This document is maintained by:** Memphis Security Team
