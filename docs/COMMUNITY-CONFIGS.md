# Community Configurations

Pre-configured Memphis setups for common use cases.

---

## 📦 Available Configs

### 1. Watra — OpenClaw Agent

**Use case:** Agent obsługujący OpenClaw workspace

```yaml
# ~/.memphis/config.yaml
memory:
  path: ~/.memphis/chains

security:
  enabled: true
  workspaces:
    - id: openclaw
      label: "OpenClaw Work"
      policy:
        allowedChains: ["journal", "ask", "decisions", "share"]
        includeDefault: true
    
    - id: skills
      label: "Skills Development"
      policy:
        allowedChains: ["journal", "wisdom", "learnings"]
        includeDefault: false

share:
  enabled: true
  policy:
    ttl: 168
    maxSize: 2048
    autoCleanup: true

integrations:
  pinata:
    jwt: ${PINATA_JWT}

embeddings:
  enabled: true
  provider: ollama
  model: nomic-embed-text
```

**Quick start:**
```bash
memphis workspace set openclaw
memphis journal "Building new skill..." --tags skill,share
memphis share-sync --push
```

---

### 2. Style — Memphis Main Brain

**Use case:** Główny agent Memphis z dużą ilością danych

```yaml
# ~/.memphis/config.yaml
memory:
  path: ~/.memphis/chains

security:
  enabled: true
  workspaces:
    - id: main
      label: "Main Brain"
      policy:
        allowedChains: ["*"]
        includeDefault: true
    
    - id: client-work
      label: "Client Projects"
      policy:
        allowedChains: ["journal", "decisions", "ask"]
        includeDefault: false
    
    - id: research
      label: "Research & Learning"
      policy:
        allowedChains: ["journal", "wisdom", "questions", "learnings"]
        includeDefault: false

share:
  enabled: true
  policy:
    ttl: 336  # 14 days
    maxSize: 4096  # 4KB
    autoCleanup: true

integrations:
  pinata:
    jwt: ${PINATA_JWT}

embeddings:
  enabled: true
  provider: ollama
  model: nomic-embed-text
  storage_path: ~/.memphis/embeddings

providers:
  ollama:
    model: qwen2.5-coder:3b
    role: primary
```

**Quick start:**
```bash
memphis workspace set research
memphis journal "Learning about embeddings..." --tags research,share
memphis ask "What is semantic search?"
memphis share-sync --all
```

---

### 3. Synjar — Future Agent

**Use case:** Agent w budowie, eksperymentalny

```yaml
# ~/.memphis/config.yaml
memory:
  path: ~/.memphis/chains

security:
  enabled: true
  workspaces:
    - id: experimental
      label: "Experiments"
      policy:
        allowedChains: ["journal", "ask", "share"]
        includeDefault: false

share:
  enabled: true
  policy:
    ttl: 72  # 3 days (shorter for experiments)
    maxSize: 1024  # 1KB
    autoCleanup: true

integrations:
  pinata:
    jwt: ${PINATA_JWT}

embeddings:
  enabled: false  # Not needed for experiments yet

providers:
  openai:
    model: gpt-4
    role: primary
```

**Quick start:**
```bash
memphis workspace set experimental
memphis journal "Testing new feature..." --tags experiment,share
memphis share-sync --push
```

---

## 🔧 How to Use

### Step 1: Copy Config

```bash
# Choose your config
CONFIG_NAME=watra  # or style, synjar

# Backup existing
cp ~/.memphis/config.yaml ~/.memphis/config.yaml.bak

# Download
curl -o ~/.memphis/config.yaml \
  https://raw.githubusercontent.com/elathoxu-crypto/memphis/main/docs/community-configs/${CONFIG_NAME}.yaml
```

### Step 2: Set Environment

```bash
# Pinata JWT
export PINATA_JWT=your-jwt-here

# Or add to .bashrc/.zshrc
echo 'export PINATA_JWT=your-jwt-here' >> ~/.bashrc
```

### Step 3: Initialize

```bash
memphis init
memphis workspace list
```

---

## 📊 Workspace Patterns

### Pattern 1: Project Isolation

**Problem:** Klient A nie powinien widzieć danych klienta B

**Solution:**
```yaml
workspaces:
  - id: client-a
    policy:
      allowedChains: ["journal", "decisions"]
  
  - id: client-b
    policy:
      allowedChains: ["journal", "decisions"]
```

**Usage:**
```bash
memphis workspace set client-a
# Work on client A...
memphis workspace set client-b
# Work on client B...
```

---

### Pattern 2: Team Sharing

**Problem:** Zespół potrzebuje wspólnego workspace

**Solution:**
```yaml
workspaces:
  - id: team-shared
    policy:
      allowedChains: ["journal", "share", "decisions"]
      includeDefault: true

share:
  enabled: true
  policy:
    ttl: 720  # 30 days
```

**Usage:**
```bash
# Each team member
memphis workspace set team-shared
memphis share-sync --all  # Sync with team
```

---

### Pattern 3: Personal vs Work

**Problem:** Osobiste notatki nie powinny iść do pracy

**Solution:**
```yaml
workspaces:
  - id: personal
    policy:
      allowedChains: ["journal", "goals", "wisdom"]
  
  - id: work
    policy:
      allowedChains: ["journal", "decisions", "ask"]
```

**Usage:**
```bash
# Morning routine
memphis workspace set personal
memphis journal "Daily goals..." --tags personal

# Work day
memphis workspace set work
memphis journal "Meeting notes..." --tags work
```

---

## 🎯 Best Practices

### 1. Always Tag for Share

```bash
# ❌ Bad — won't sync
memphis journal "Important insight"

# ✅ Good — will sync
memphis journal "Important insight" --tags share
```

### 2. Use Workspace for Context

```bash
# ❌ Bad — everything in default
memphis journal "Client meeting..."

# ✅ Good — isolated by workspace
memphis workspace set client-xyz
memphis journal "Client meeting..."
```

### 3. Regular Sync

```bash
# Add to crontab
crontab -e

# Daily sync at 22:00
0 22 * * * memphis share-sync --all --cleanup
```

---

## 🐛 Common Issues

### Config not loading

```bash
# Validate YAML
memphis config validate

# Check path
ls ~/.memphis/config.yaml
```

### Workspace not switching

```bash
# List available
memphis workspace list

# Check selection
cat ~/.memphis/.workspace-selection
```

### Share not working

```bash
# Check Pinata
echo $PINATA_JWT

# Test connection
memphis share-sync --push --dry-run
```

---

## 📚 Contributing

Created a useful config? Share it!

1. Fork https://github.com/elathoxu-crypto/memphis
2. Add to `docs/community-configs/`
3. Submit PR

---

**Need help?** Discord: https://discord.com/invite/clawd
