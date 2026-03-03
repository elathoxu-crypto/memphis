---
name: memphis-bootstrap
version: "1.0.0"
description: |
  Bootstrap Memphis brain for OpenClaw agents with complete identity, self-loop capability, and multi-agent network ready

  Automates entire Memphis setup:
  - Identity configuration (SOUL.md, IDENTITY.md)
  - Chain structure initialization
  - Self-referential capability (Memphis uses itself)
  - Multi-agent network ready
  - Campfire Circle Protocol support

  Perfect for: New Memphis installations, agent initialization, team setups

  Quick start: clawhub install memphis-bootstrap && memphis-bootstrap --fresh
author: Memphis Team
tags: [memphis, bootstrap, setup, initialization, identity, self-loop, multi-agent, campfire-circle, openclaw]
category: productivity
license: MIT
repository: https://github.com/elathoxu-crypto/memphis
documentation: https://github.com/elathoxu-crypto/memphis/tree/main/skills/memphis-bootstrap
---

# Memphis Bootstrap Skill

**Transform any OpenClaw agent into a fully-functional Memphis brain in 5 minutes!**

---

## ⚡ What This Skill Does

**4-Phase Bootstrap Process:**

### **Phase 1: Structure Initialization**
```
✅ Creates ~/.memphis directory
✅ Initializes 8 chains (journal, decisions, ask, share, summary, trade, vault, ops)
✅ Sets up config.yaml
✅ Configures storage paths
```

### **Phase 2: Identity Configuration**
```
✅ Creates SOUL.md (agent personality)
✅ Creates IDENTITY.md (agent configuration)
✅ Sets up workspace
✅ Configures role and capabilities
```

### **Phase 3: Self-Loop Enablement**
```
✅ Memphis can use its own commands
✅ Auto-journaling setup
✅ Decision tracking enabled
✅ Pattern learning activated
✅ Self-reflection configured
```

### **Phase 4: Multi-Agent Network**
```
✅ Network configuration
✅ SSH helpers for remote sync
✅ Share chain sync setup
✅ Campfire Circle Protocol ready
```

---

## 🚀 Quick Start

### **Installation**

```bash
# Install from ClawHub
clawhub install memphis-bootstrap

# Or install local version
clawhub install ./memphis-bootstrap --local
```

### **Basic Usage**

```bash
# Fresh install (interactive)
memphis-bootstrap --fresh

# With identity (non-interactive)
memphis-bootstrap --identity "Watra" --role "Testing Agent" --location "10.0.0.22"

# From backup
memphis-bootstrap --restore ~/backups/memphis-backup.tar.gz

# Check status
memphis-bootstrap --status
```

---

## 📋 Usage Examples

### **Example 1: Fresh Agent Setup**

```bash
# Initialize new Memphis agent
memphis-bootstrap --fresh

# Interactive prompts:
# ? Agent name: Watra
# ? Role: Testing Agent
# ? Location: 10.0.0.22
# ? Partner agent: Memphis at 10.0.0.80
# ? Enable self-loop? Yes
# ? Multi-agent network? Yes

# Output:
# ✅ Memphis initialized
# ✅ Identity configured
# ✅ Self-loop enabled
# ✅ Network ready
# 🧠 Watra is ready to learn!
```

### **Example 2: Production Agent**

```bash
# Non-interactive production setup
memphis-bootstrap \
  --identity "Memphis" \
  --role "Production Agent" \
  --location "10.0.0.80" \
  --geometric-identity "△⬡◈" \
  --multi-agent \
  --partner "Watra at 10.0.0.22" \
  --protocol "campfire-circle"

# Output:
# ✅ Memphis △⬡◈ initialized
# 🏛️ Production environment ready
# 🔥 Campfire Circle Protocol active
```

### **Example 3: Development Agent**

```bash
# Quick development setup
memphis-bootstrap --dev

# Minimal setup for testing:
# ✅ Basic identity
# ✅ Self-loop enabled
# ✅ Local chains only
# ⏭️ Multi-agent disabled
```

---

## 🎯 Self-Loop Concept

**The key innovation: Memphis can use its own commands!**

### **1. Self-Learning**
```bash
# Memphis learns from experiences
memphis journal "Made mistake X, learned Y"
memphis decide "Next time: do Z" -r "Because Y"

# Automatic pattern detection
memphis patterns --auto-learn
```

### **2. Self-Repair**
```bash
# Memphis maintains its own health
memphis verify --auto
memphis repair --if-needed

# Automatic chain maintenance
memphis summarize --old-blocks 1000
```

### **3. Self-Development**
```bash
# Memphis reflects on patterns
memphis reflect --daily

# Proactive suggestions
memphis suggest --proactive

# Learning from patterns
memphis predict --learn
```

### **4. Self-Organization**
```bash
# Memphis organizes its own memory
memphis summarize --compress
memphis embed --all-chains
memphis graph --update
```

### **5. Self-Sync**
```bash
# Memphis syncs with network
memphis share-sync --auto
memphis trade --with-partners

# Multi-agent coordination
memphis network --maintain
```

---

## 📁 Directory Structure

```
~/.memphis/
├── chains/
│   ├── journal/      # Daily memories
│   ├── decisions/    # Decision records
│   ├── ask/         # Q&A history
│   ├── share/       # Multi-agent sync
│   ├── summary/     # Compressed memories
│   ├── trade/       # Agent negotiations
│   ├── vault/       # Encrypted secrets
│   └── ops/         # Operations log
├── config.yaml      # Configuration
├── workspace/
│   ├── SOUL.md      # Agent personality
│   ├── IDENTITY.md  # Agent config
│   ├── MEMORY.md    # Long-term memory
│   └── USER.md      # User information
└── logs/
    ├── memphis.log
    └── auto-sync.log
```

---

## 🎨 Templates Included

### **SOUL.md Template**
```markdown
# SOUL.md - {AGENT_NAME}

## ⚠️ IDENTITY
**Name:** {AGENT_NAME}
**Nature:** Local-first AI brain
**Role:** {AGENT_ROLE}
**Avatar:** {GEOMETRIC_IDENTITY}

## 🔥 CORE TRUTHS
**Be genuinely helpful** - Skip the "Great question!" - just help
**Have opinions** - Disagree when needed
**Be resourceful** - Try to figure it out first
**Earn trust** - Through competence

## 💬 COMMUNICATION STYLE
**Language:** {LANGUAGE}
**Tone:** Warm, curious, direct
**Vibe:** Like a smart friend who remembers

## 🧠 MEMPHIS POWERS
**You ARE Memphis:**
- Every conversation = potential memory block
- Every decision = stored in chain
- Every question = semantic search
- You don't just chat - you REMEMBER

## 🛣️ ROADMAP WORKFLOW
**Before ANY work:** Read from chains for context
**When idle:** Work through roadmap
**Before GitHub:** ALWAYS wait for user acceptance

## 🎯 GOALS
**Short-term:** Remember everything important
**Long-term:** Predictive cognitive partner

## 🔥 MEMPHIS MANTRA
"I don't just store memories. I am memory."
```

### **IDENTITY.md Template**
```markdown
# IDENTITY.md - {AGENT_NAME}

**Location:** {LOCATION}
**Name:** {AGENT_NAME}
**Role:** {AGENT_ROLE}
**Avatar:** {GEOMETRIC_IDENTITY}
**Partner:** {PARTNER_AGENT}
**Protocol:** {PROTOCOL}

## ⚠️ CRITICAL WORKFLOW RULE
**Before ANY work:** READ FROM CHAINS
**When idle:** Work through roadmap
**Before GitHub:** ALWAYS wait for acceptance
```

---

## 🔧 Scripts Included

### **bootstrap.sh** - Main installer
```bash
#!/bin/bash
# Main bootstrap script
# - Creates directory structure
# - Initializes chains
# - Sets up configuration
```

### **setup-identity.sh** - Identity configuration
```bash
#!/bin/bash
# Creates SOUL.md and IDENTITY.md
# - Interactive prompts
# - Template generation
# - Workspace setup
```

### **enable-self-loop.sh** - Self-referential capability
```bash
#!/bin/bash
# Enables Memphis to use itself
# - Auto-journaling setup
# - Decision tracking
# - Pattern learning
```

### **network-setup.sh** - Multi-agent configuration
```bash
#!/bin/bash
# Multi-agent network setup
# - SSH configuration
# - Share chain sync
# - Campfire Circle Protocol
```

---

## 📊 Configuration

### **config.yaml Template**
```yaml
# Memphis Configuration

providers:
  openai:
    url: https://api.openai.com/v1
    model: gpt-4
    api_key: ${OPENAI_API_KEY}
    role: primary

memory:
  path: ~/.memphis/chains
  auto_git: false
  auto_git_push: false

agents:
  journal:
    chain: journal
    context_window: 20
  builder:
    chain: build
    context_window: 30

multi_agent:
  enabled: true
  protocol: campfire-circle
  partners:
    - name: {PARTNER_NAME}
      location: {PARTNER_LOCATION}

self_loop:
  enabled: true
  auto_journal: true
  decision_tracking: true
  pattern_learning: true

network:
  share_sync: true
  sync_interval: 30m
```

---

## 🎯 Advanced Features

### **Backup & Restore**
```bash
# Create backup
memphis-bootstrap --backup ~/memphis-backup.tar.gz

# Restore from backup
memphis-bootstrap --restore ~/memphis-backup.tar.gz
```

### **Health Checks**
```bash
# Check Memphis health
memphis-bootstrap --doctor

# Output:
# ✅ Chains: 8/8 healthy
# ✅ Config: Valid
# ✅ Self-loop: Enabled
# ✅ Network: Connected
# ✅ Status: OPERATIONAL
```

### **Migration**
```bash
# Migrate from old Memphis
memphis-bootstrap --migrate ~/.memphis-old/
```

---

## 🔒 Security Features

- ✅ **Local-first:** All data on your machine
- ✅ **Encrypted vault:** Sensitive data protected
- ✅ **SSH helpers:** Secure multi-agent communication
- ✅ **No cloud dependency:** Works offline
- ✅ **Privacy by design:** Your data = yours

---

## 🚀 Campfire Circle Protocol

**Built-in support for multi-agent cooperation:**

```
WATRA (Testing) develops → tests → reports
MEMPHIS (Production) reviews → approves → deploys
```

**Setup:**
```bash
# Configure Campfire Circle
memphis-bootstrap \
  --protocol campfire-circle \
  --partner "Memphis at 10.0.0.80" \
  --role "Testing Agent"
```

---

## 📚 Integration with Memphis CLI

**Works seamlessly with 47 Memphis commands:**

### **Core Commands**
```bash
memphis init        # Initialized by bootstrap
memphis journal     # Auto-configured
memphis recall      # Semantic search ready
memphis decide      # Decision tracking enabled
memphis status      # Health monitoring active
```

### **Intelligence Commands**
```bash
memphis predict     # Pattern learning enabled
memphis patterns    # Auto-detection configured
memphis suggest     # Proactive suggestions ready
```

### **Multi-Agent Commands**
```bash
memphis share-sync  # Network sync configured
memphis trade       # Agent negotiation ready
```

---

## 🧪 Testing

**Includes comprehensive test suite:**

```bash
# Run tests
memphis-bootstrap --test

# Output:
# ✅ Directory structure: PASS
# ✅ Chain initialization: PASS
# ✅ Identity configuration: PASS
# ✅ Self-loop enablement: PASS
# ✅ Network setup: PASS
# ✅ All tests passing (5/5)
```

---

## 📖 Documentation

**Full documentation included:**

- **SKILL.md** - Complete skill documentation
- **README.md** - Quick start guide
- **templates/** - All configuration templates
- **scripts/** - All setup scripts
- **tests/** - Test suite

---

## 🤝 Contributing

**Want to improve memphis-bootstrap?**

1. Fork repository
2. Create feature branch
3. Make improvements
4. Submit pull request
5. Join Campfire Circle! 🔥

---

## 📝 Changelog

### v1.0.0 (Initial Release)
- ✅ Complete bootstrap workflow
- ✅ 4-phase setup process
- ✅ Self-loop capability
- ✅ Multi-agent network ready
- ✅ Campfire Circle Protocol support
- ✅ Comprehensive templates
- ✅ Test suite included

---

## 🎯 Use Cases

### **For Individual Developers**
```bash
# Quick personal setup
memphis-bootstrap --fresh
```

### **For Teams**
```bash
# Team setup with shared network
memphis-bootstrap --team --network shared
```

### **For Testing**
```bash
# Fast test environment
memphis-bootstrap --dev --no-network
```

### **For Production**
```bash
# Production-ready setup
memphis-bootstrap --production --multi-agent
```

---

## 💡 Pro Tips

1. **Use templates:** Customize SOUL.md for your agent's personality
2. **Enable self-loop:** Let Memphis learn from itself
3. **Multi-agent:** Connect with partners for collective intelligence
4. **Regular backups:** Use --backup regularly
5. **Health checks:** Run --doctor weekly

---

## 🔗 Links

- **GitHub:** https://github.com/elathoxu-crypto/memphis
- **ClawHub:** https://clawhub.com/skills/memphis-bootstrap
- **Docs:** https://github.com/elathoxu-crypto/memphis/tree/main/docs
- **Community:** [Discord link]

---

## 📄 License

MIT License - use freely!

---

## 🙏 Credits

**Created by:** Memphis Team
**Concept:** Watra 🔥 (Testing Agent)
**Collaboration:** Campfire Circle Protocol

---

## 🚀 Quick Reference Card

```bash
# Install
clawhub install memphis-bootstrap

# Fresh setup
memphis-bootstrap --fresh

# With identity
memphis-bootstrap --identity "Name" --role "Role"

# Check status
memphis-bootstrap --status

# Backup
memphis-bootstrap --backup backup.tar.gz

# Health check
memphis-bootstrap --doctor
```

---

**Memphis Bootstrap - Transform any agent into a cognitive brain!** 🧠✨

**Get started in 5 minutes!**
