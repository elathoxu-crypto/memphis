# Memphis Troubleshooting Guide

Common issues and their solutions.

---

## Terminal Issues

### Debug garbage output (`[DEBUG] Active handles`)

**Status:** ✅ Fixed in v3.7.2+

**Symptom:**
```
Status: OK
[DEBUG] Active handles (exit): [ 'WriteStream', 'ReadStream', 'WriteStream' ]
[DEBUG] Active requests (exit): []
[DEBUG] stdin: isTTY=true readable=true
```

**Fix:**
```bash
# Update to v3.7.2 or later
cd ~/memphis
git pull
npm run build
```

**Workaround for older versions:**
```bash
memphis status 2>/dev/null
```

---

### Terminal line wrap broken

**Status:** ✅ Fixed in v3.7.2+

**Symptom:**
- Terminal output scrambled
- Line wrap not working
- Text overwriting itself

**Fix:**
```bash
# Update to v3.7.2+
cd ~/memphis
git pull
npm run build
```

**Recovery:**
```bash
reset
stty sane
clear
```

---

## Installation Issues

### Node.js not found

**Symptom:**
```
bash: node: command not found
```

**Fix (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Fix (using nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

---

### Node.js version too old

**Symptom:**
```
❌ Node.js too old: v14.x.x (need 18+)
```

**Fix:**
```bash
# Using nvm
nvm install 20
nvm use 20

# Or reinstall Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

### Permission denied (npm link)

**Symptom:**
```
npm ERR! Error: EACCES: permission denied
```

**Fix:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Or use sudo for link
sudo npm link
```

---

### Ollama not found (embeddings fail)

**Symptom:**
```
⚠️ Embeddings failed: Ollama not responding
```

**Fix:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull embedding model
ollama pull nomic-embed-text

# Pull primary model
ollama pull qwen2.5-coder:3b

# Verify
ollama list
```

---

### Git not found

**Symptom:**
```
bash: git: command not found
```

**Fix:**
```bash
# Ubuntu/Debian
sudo apt install -y git

# macOS (Xcode Command Line Tools)
xcode-select --install

# Windows
# Download from https://git-scm.com/download/win
```

---

## Binary Issues

### Windows binary spawns multiple processes

**Status:** ❌ Known issue (pkg bug)

**Symptom:**
- Multiple `memphis-win-x64.exe` processes
- High CPU usage
- System slowdown

**Fix:**
Use WSL2 or classic installation instead.

```bash
# WSL2 (Windows Subsystem for Linux)
wsl --install -d Ubuntu
# Then use Linux installation method
```

**Track:** [GitHub Issue - Windows Binary](https://github.com/elathoxu-crypto/memphis/issues)

---

### Binary won't execute

**Symptom:**
```
bash: ./memphis-linux-x64: Permission denied
```

**Fix:**
```bash
# Add execute permission
chmod +x memphis-linux-x64

# Run
./memphis-linux-x64
```

---

### Binary segfaults / crashes

**Symptom:**
```
Segmentation fault (core dumped)
```

**Fix:**
- Use classic installation (Node.js)
- Binary may be incompatible with your system
- Check GitHub Issues for similar reports

---

## Memory Issues

### Embeddings not generated

**Symptom:**
```
⚠ no embeddings stored yet
```

**Fix:**
```bash
# Generate embeddings for journal
memphis embed --chain journal

# Generate for decisions
memphis embed --chain decisions

# Check status
memphis status
```

---

### Vault not initialized

**Symptom:**
```
Vault:
  ✗ not initialized
```

**Fix:**
```bash
# Initialize vault
memphis vault init

# Set password (will prompt)
# Password: [your-secure-password]

# Unlock vault
memphis vault unlock
```

---

### Memory chains empty

**Symptom:**
```
Chains:
  ⛓ journal — ✓ 0 blocks
```

**Fix:**
```bash
# Create first memory
memphis journal "My first memory" --tags genesis,first

# Verify
memphis status
```

---

## Network Issues

### Multi-agent sync fails

**Symptom:**
```
❌ Sync failed: Connection refused
```

**Fix:**
```bash
# Check if other agent is running
ssh other-agent 'memphis status'

# Check share chain
memphis share-sync --pull

# Manual sync
memphis share-sync
```

---

## Uninstallation

### How to uninstall Memphis

**Using uninstall script:**
```bash
~/memphis/uninstall.sh
```

**Manual uninstall:**
```bash
# Remove repo
rm -rf ~/memphis

# Remove data (optional)
rm -rf ~/.memphis

# Remove global command
npm unlink -g @elathoxu-crypto/memphis
```

---

## Still Having Issues?

### 1. Check GitHub Issues

Search existing issues:
https://github.com/elathoxu-crypto/memphis/issues

### 2. Join Discord

Get help from community:
https://discord.gg/clawd

### 3. Open New Issue

Provide:
- OS version: `uname -a`
- Node.js version: `node --version`
- Memphis version: `memphis --version`
- Error message (full output)
- Steps to reproduce

**Issue Template:**
```markdown
**Environment:**
- OS: Ubuntu 22.04
- Node.js: v20.11.0
- Memphis: v3.7.2

**Description:**
Brief description of the issue

**Steps to Reproduce:**
1. Run `memphis status`
2. See error...

**Expected:**
What should happen

**Actual:**
What actually happened

**Output:**
```
Paste error output here
```
```

---

## Known Limitations

- Windows binary broken (use WSL2)
- Embeddings require Ollama (local LLM)
- Multi-agent sync requires network access
- Vault requires password (can't recover if lost)

---

**Updated:** 2026-03-05
**Version:** v3.7.2
