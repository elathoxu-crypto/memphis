# Troubleshooting Guide

**Version:** 2.0.0  
**Date:** 2026-03-02

---

## 📋 Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Issues](#configuration-issues)
- [Model A Issues](#model-a-issues)
- [Model B Issues](#model-b-issues)
- [Model C Issues](#model-c-issues)
- [Performance Issues](#performance-issues)
- [Data Issues](#data-issues)
- [Network Issues](#network-issues)

---

## Installation Issues

### Problem: npm install fails with node-gyp error

**Symptoms:**
```
gyp ERR! stack Error: `make` failed with exit code: 2
```

**Cause:** Missing build tools

**Solution:**

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y build-essential python3-dev
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
```bash
npm install --global windows-build-tools
```

**Then retry:**
```bash
npm install
```

---

### Problem: npm install hangs forever

**Symptoms:**
```
npm install
(hangs for 10+ minutes)
```

**Cause:** Network timeout or registry issue

**Solution:**
```bash
# Clear cache
npm cache clean --force

# Try with verbose output
npm install --verbose

# If still hanging, use different registry
npm install --registry https://registry.npmjs.org

# Or use yarn
yarn install
```

---

### Problem: "Cannot find module" after installation

**Symptoms:**
```
Error: Cannot find module 'memphis'
```

**Cause:** Not built yet

**Solution:**
```bash
# Build the project
npm run build

# Then run
node dist/cli/index.js init
```

---

### Problem: "Permission denied" errors

**Symptoms:**
```
Error: EACCES: permission denied, open '/home/user/.memphis/config.yaml'
```

**Cause:** Wrong permissions on `~/.memphis`

**Solution:**
```bash
# Fix permissions
sudo chown -R $USER:$USER ~/.memphis
chmod -R 755 ~/.memphis

# Or delete and recreate
rm -rf ~/.memphis
node dist/cli/index.js init
```

---

## Configuration Issues

### Problem: "Config file not found"

**Symptoms:**
```
Error: Config file not found at ~/.memphis/config.yaml
```

**Cause:** Not initialized

**Solution:**
```bash
# Run init
node dist/cli/index.js init

# Verify
cat ~/.memphis/config.yaml
```

---

### Problem: "Invalid provider" error

**Symptoms:**
```
Error: Invalid provider: openai
```

**Cause:** Provider not configured

**Solution:**

**For Ollama:**
```yaml
# ~/.memphis/config.yaml
provider: ollama
model: qwen2.5-coder:3b
embeddings:
  backend: ollama
  model: nomic-embed-text
```

**For OpenAI:**
```yaml
provider: openai
model: gpt-4
api_key: sk-abc123...
embeddings:
  backend: openai
  model: text-embedding-3-small
```

---

### Problem: "Ollama not responding"

**Symptoms:**
```
Error: Ollama not responding at http://localhost:11434
```

**Cause:** Ollama not running

**Solution:**
```bash
# Start Ollama
ollama serve

# Check if running
curl http://localhost:11434/api/tags

# If still failing, check port
lsof -i :11434
```

---

### Problem: "API key invalid"

**Symptoms:**
```
Error: Invalid API key
```

**Cause:** Wrong or missing API key

**Solution:**
```bash
# Set environment variable
export OPENAI_API_KEY="sk-abc123..."

# Or add to config
# ~/.memphis/config.yaml
api_key: "sk-abc123..."

# Or use vault
memphis vault add openai_key "sk-abc123..."
```

---

## Model A Issues

### Problem: Decision capture is slow (>500ms)

**Symptoms:**
```
memphis decide "test" "test"
# Takes 2-3 seconds
```

**Cause:** Slow provider or network

**Solution:**
```bash
# Check provider
memphis doctor

# Use local Ollama instead
# ~/.memphis/config.yaml
provider: ollama
model: qwen2.5-coder:3b

# Or use frictionless capture
md "test"  # Should be <100ms
```

---

### Problem: "Block hash mismatch"

**Symptoms:**
```
Error: Block hash mismatch
```

**Cause:** Corrupted chain

**Solution:**
```bash
# Verify chain
memphis verify

# If corrupted, restore from backup
cp -r ~/backup/memphis/chains ~/.memphis/

# Or rebuild
rm -rf ~/.memphis/chains
node dist/cli/index.js init
```

---

### Problem: Cannot revise decision

**Symptoms:**
```
Error: Decision not found: dec_abc123
```

**Cause:** Wrong ID format

**Solution:**
```bash
# List decisions
memphis decisions

# Copy full ID
# Then revise
memphis revise dec_abc123def456 "new choice"
```

---

## Model B Issues

### Problem: Inference detects no decisions

**Symptoms:**
```
memphis infer --since 30
# Total detected: 0
```

**Cause:** No matching commits

**Solution:**
```bash
# Check if in git repo
git status

# Check commit history
git log --oneline -30

# Lower confidence threshold
memphis infer --since 30 --min-confidence 0.3
```

---

### Problem: Inference is too slow

**Symptoms:**
```
memphis infer --since 90
# Takes 10+ seconds
```

**Cause:** Too many commits

**Solution:**
```bash
# Limit date range
memphis infer --since 7

# Or use min-confidence
memphis infer --since 30 --min-confidence 0.7
```

---

### Problem: False positives in inference

**Symptoms:**
```
# Detects decisions that aren't real
```

**Cause:** Overly broad patterns

**Solution:**
```bash
# Increase confidence threshold
memphis infer --since 30 --min-confidence 0.8

# Use interactive mode
memphis infer --prompt --since 30
```

---

## Model C Issues

### Problem: "No patterns found"

**Symptoms:**
```
memphis patterns list
# Total patterns: 0
```

**Cause:** Not enough decisions or not learned

**Solution:**
```bash
# Check decision count
memphis decisions --recent 90

# Need 50+ decisions
# If enough, learn patterns
memphis predict --learn --since 90

# Verify
memphis patterns list
```

---

### Problem: Predictions always wrong

**Symptoms:**
```
memphis accuracy
# Overall accuracy: 30%
```

**Cause:** Bad patterns or context mismatch

**Solution:**
```bash
# Clear patterns
memphis patterns clear

# Re-learn from recent decisions
memphis predict --learn --since 30

# Make more decisions to improve training
memphis decide "test" "test" --reasoning "why"

# Re-learn
memphis predict --learn --since 30
```

---

### Problem: No proactive suggestions

**Symptoms:**
```
memphis suggest
# No suggestions
```

**Cause:** Cooldown or low confidence

**Solution:**
```bash
# Force check
memphis suggest --force

# Check patterns
memphis patterns list

# Check predictions
memphis predict --min-confidence 0.5
```

---

### Problem: Accuracy tracking not working

**Symptoms:**
```
memphis accuracy
# Total events: 0
```

**Cause:** Not using suggestions

**Solution:**
```bash
# Use suggestions
memphis suggest --force

# Accept or reject
# [a]ccept / [n]one

# Check again
memphis accuracy
```

---

## Performance Issues

### Problem: "Out of memory" error

**Symptoms:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**Cause:** Large chains or embeddings

**Solution:**
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Or limit operations
memphis recall "query" --limit 5
memphis decisions --limit 10
```

---

### Problem: Slow semantic search

**Symptoms:**
```
memphis recall "test"
# Takes 5+ seconds
```

**Cause:** No embeddings or slow provider

**Solution:**
```bash
# Check embeddings
ls ~/.memphis/embeddings/

# If missing, generate
memphis embeddings generate

# Use local Ollama
# ~/.memphis/config.yaml
embeddings:
  backend: ollama
  model: nomic-embed-text
```

---

### Problem: TUI is laggy

**Symptoms:**
```
memphis tui
# Slow updates, laggy typing
```

**Cause:** Terminal or large data

**Solution:**
```bash
# Use smaller terminal
# Or limit data
memphis tui --screen decisions

# Check terminal compatibility
echo $TERM

# Use simpler terminal emulator
```

---

## Data Issues

### Problem: Lost all my decisions

**Symptoms:**
```
memphis decisions
# No decisions found
```

**Cause:** Deleted or corrupted

**Solution:**
```bash
# Check if files exist
ls ~/.memphis/chains/decisions/

# If empty, restore from backup
cp -r ~/backup/memphis/chains/decisions ~/.memphis/chains/

# Or recover from git (if committed)
cd memphis
git checkout HEAD -- ~/.memphis/chains/
```

---

### Problem: Duplicate decisions

**Symptoms:**
```
memphis decisions
# Shows same decision twice
```

**Cause:** Manual duplication or sync conflict

**Solution:**
```bash
# Find duplicates
memphis decisions --json | jq '.[] | select(.title == "Same Title")'

# Manually edit chain
nano ~/.memphis/chains/decisions/000042.json

# Remove duplicate block
# Update chain index
```

---

### Problem: Chain corruption

**Symptoms:**
```
Error: Invalid block at index 42
```

**Cause:** File corruption

**Solution:**
```bash
# Find corrupted block
ls -la ~/.memphis/chains/decisions/

# Check JSON validity
for f in ~/.memphis/chains/decisions/*.json; do
  jq . "$f" > /dev/null 2>&1 || echo "Corrupted: $f"
done

# Restore from backup
# Or delete corrupted block
rm ~/.memphis/chains/decisions/000042.json

# Rebuild index
node dist/cli/index.js rebuild-index
```

---

## Network Issues

### Problem: Sync fails

**Symptoms:**
```
memphis share-sync --push
Error: IPFS connection failed
```

**Cause:** IPFS not running

**Solution:**
```bash
# Start IPFS
ipfs daemon

# Check connection
ipfs id

# Retry sync
memphis share-sync --push
```

---

### Problem: Pinata upload fails

**Symptoms:**
```
Error: Pinata API error: 401 Unauthorized
```

**Cause:** Invalid API keys

**Solution:**
```bash
# Add Pinata keys
memphis vault add pinata_api_key "your_key"
memphis vault add pinata_secret "your_secret"

# Verify
memphis vault get pinata_api_key

# Retry
memphis share-sync --push
```

---

### Problem: Multi-agent sync not working

**Symptoms:**
```
memphis share-sync --pull
Error: No manifest found
```

**Cause:** Not configured

**Solution:**
```bash
# Create share manifest
memphis share-init

# Configure peers
# ~/.memphis/config.yaml
share:
  enabled: true
  peers:
    - did:memphis:agent1
    - did:memphis:agent2

# Push first
memphis share-sync --push

# Then pull
memphis share-sync --pull
```

---

## Emergency Recovery

### Problem: Everything is broken

**Symptoms:**
- Cannot run any command
- Config corrupted
- Chains corrupted

**Solution:**
```bash
# 1. Backup current state
cp -r ~/.memphis ~/memphis-emergency-backup

# 2. Fresh install
rm -rf ~/.memphis
cd ~/memphis
npm run build
node dist/cli/index.js init

# 3. Restore chains from backup
cp -r ~/memphis-emergency-backup/chains ~/.memphis/

# 4. Verify
node dist/cli/index.js doctor
```

---

## Debug Mode

### Enable verbose logging

```bash
# Set debug environment
export DEBUG=memphis:*

# Run command
node dist/cli/index.js decide "test" "test"

# View logs
tail -f ~/.memphis/debug.log
```

---

## Getting Help

### Before asking for help, gather:

```bash
# System info
node --version
npm --version
uname -a

# Memphis status
memphis doctor > doctor-output.txt
memphis status > status-output.txt

# Recent logs
tail -100 ~/.memphis/daemon.log > daemon-logs.txt

# Package in one file
tar -czf memphis-debug.tar.gz \
  doctor-output.txt \
  status-output.txt \
  daemon-logs.txt \
  ~/.memphis/config.yaml
```

### Where to get help:

1. **Discord:** https://discord.gg/clawd
2. **GitHub Issues:** https://github.com/elathoxu-crypto/memphis/issues
3. **Documentation:** https://docs.openclaw.ai

**Include in your report:**
- Error message (full text)
- Command you ran
- Expected vs actual behavior
- `doctor` output
- System info

---

**Troubleshooting Guide Version:** 2.0.0  
**Last Updated:** 2026-03-02
