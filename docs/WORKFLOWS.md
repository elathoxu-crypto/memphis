# Sample Workflows

Real-world examples of Memphis in action.

---

## 🔄 Workflow 1: Multi-Agent Coding Session

**Scenario:** Watra koduje → Style review'uje → Synjar testuje

### Participants

| Agent | Role | Model |
|-------|------|-------|
| Watra | Main coder | GLM-5 |
| Style | Code reviewer | GLM-4.7 |
| Synjar | Test writer | GLM-4.5-air |

### Step-by-Step

```bash
# === WATRA (Laptop) ===
memphis workspace set coding
memphis journal "Starting RLS implementation" --tags coding,share

# Koduję...
memphis decide "Use RLS guard pattern" --context "Security requirement" --tags share

# Sync do Style
memphis share-sync --push

# === STYLE (Desktop) ===
memphis share-sync --pull
memphis workspace set coding

# Review
memphis journal "Review: RLS guard looks good, but needs tests" --tags review,share

# Sync back
memphis share-sync --push

# === SYNJAR (Server) ===
memphis share-sync --pull
memphis workspace set coding

# Write tests
memphis journal "Tests written for RLS guard" --tags tests,share

# Final sync
memphis share-sync --push

# === ALL AGENTS ===
memphis share-sync --all
```

**Result:** Wszyscy mają tę samą bazę wiedzy o implementacji.

---

## 🔄 Workflow 2: Daily Knowledge Sync

**Scenario:** Codzienna synchronizacja między urządzeniami

### Cron Jobs

```bash
# Laptop (Watra) — rano
0 8 * * * memphis share-sync --push

# Desktop (Style) — wieczorem
0 22 * * * memphis share-sync --all --cleanup
```

### Manual Check

```bash
# Sprawdź co przyszło
memphis show share --since today

# Review new blocks
memphis recall --chain share --since 24h

# Tag important ones
memphis revise <block-id> --add-tags important
```

---

## 🔄 Workflow 3: Project Handoff

**Scenario:** Przekazanie projektu między agentami

### Agent A (leaves project)

```bash
# Finalize work
memphis workspace set project-alpha
memphis journal "Project Alpha completed" --tags handoff,share

# Export decisions
memphis recall --chain decisions --json > project-alpha-decisions.json

# Create trade offer
memphis trade create did:memphis:style-main \
  --blocks journal:0-200,decisions:0-20 \
  --ttl 30 \
  --usage "read-write" \
  --output manifest-alpha.json

# Push to IPFS
memphis share-sync --push
```

### Agent B (takes over)

```bash
# Accept handoff
memphis trade accept manifest-alpha.json

# Import decisions
cat project-alpha-decisions.json | memphis import --chain decisions

# Review context
memphis recall --chain journal --limit 50

# Continue work
memphis journal "Taking over Project Alpha from Watra" --tags handoff,share
```

---

## 🔄 Workflow 4: Research Collaboration

**Scenario:** Dwaj agenci badają ten sam temat

### Parallel Research

```bash
# === WATRA ===
memphis workspace set research-embeddings
memphis ask "How do embeddings work?" --tags research,share
memphis journal "Found: embeddings are vector representations" --tags research,share
memphis share-sync --push

# === STYLE (simultaneously) ===
memphis workspace set research-embeddings
memphis ask "What is semantic search?" --tags research,share
memphis journal "Found: semantic search uses vector similarity" --tags research,share
memphis share-sync --push
```

### Merge Results

```bash
# Both agents
memphis share-sync --pull

# Review combined research
memphis recall --chain share --tag research --since 7d

# Create summary
memphis journal "Research summary: embeddings + semantic search" --tags research,summary,share
memphis share-sync --push
```

---

## 🔄 Workflow 5: MCP-Powered Claude Integration

**Scenario:** Claude Desktop używa Memphis jako pamięci

### Setup

```bash
# Start MCP server
memphis mcp start &

# Configure Claude Desktop
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "memphis": {
      "command": "/usr/local/bin/memphis",
      "args": ["mcp", "start"]
    }
  }
}
EOF
```

### Usage in Claude

```
User: "Search my Memphis memory for 'embeddings'"

Claude: [uses memphis.search]
Found 5 blocks about embeddings:
1. "How do embeddings work?" (journal#123)
2. "Semantic search uses vector similarity" (share#45)
...

User: "Save this insight to Memphis"

Claude: [uses memphis.journal.add]
✓ Saved to journal#124
```

---

## 🔄 Workflow 6: Backup & Recovery

**Scenario:** Regular backup na IPFS z możliwośćią odzyskania

### Backup

```bash
# Daily backup script
cat > ~/memphis-backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
memphis share-sync --push --all
memphis status --json > ~/.memphis/backups/status-${DATE}.json
echo "Backup complete: $(date)"
EOF

chmod +x ~/memphis-backup.sh

# Cron (daily at 2 AM)
0 2 * * * ~/memphis-backup.sh >> ~/.memphis/backups/backup.log 2>&1
```

### Recovery

```bash
# List backups
ls ~/.memphis/backups/

# Check network chain
cat ~/.memphis/network-chain.jsonl | jq -r '.[] | "\(.timestamp) \(.cid)"'

# Pull from specific CID
memphis share-sync --pull --cid QmXyz...
```

---

## 🔄 Workflow 7: Team Decision Making

**Scenario:** Zespół podejmuje decyzję architektoniczną

### Process

```bash
# === ALL TEAM MEMBERS ===
memphis workspace set team-architecture

# Member 1: Propose
memphis decide "Use microservices architecture" \
  --context "Scalability requirement" \
  --options "microservices|monolith|serverless" \
  --chosen "microservices" \
  --tags architecture,team,share

memphis share-sync --push

# Member 2: Vote
memphis share-sync --pull
memphis journal "Vote: +1 for microservices" --tags vote,share
memphis share-sync --push

# Member 3: Counter-proposal
memphis decide "Use serverless instead" \
  --context "Cost optimization" \
  --supersedes <previous-decision-id> \
  --tags architecture,team,share

memphis share-sync --push

# Final: Consensus
memphis share-sync --all
memphis recall --chain decisions --tag architecture
```

---

## 📊 Workflow Metrics

### Track Progress

```bash
# Daily stats
memphis status --json | jq '{
  journal: .chains[] | select(.name=="journal") | .blocks,
  decisions: .chains[] | select(.name=="decisions") | .blocks,
  share: .chains[] | select(.name=="share") | .blocks
}'

# Weekly summary
memphis reflect --weekly --save
```

### Monitor Sync

```bash
# Check sync health
cat ~/.memphis/network-chain.jsonl | \
  jq -s 'map(select(.timestamp > "2026-03-01")) | length'

# Last sync time
cat ~/.memphis/network-chain.jsonl | \
  jq -s 'max_by(.timestamp) | .timestamp'
```

---

## 🎯 Best Practices

### 1. Consistent Tagging

```bash
# ✅ Good
memphis journal "..." --tags project-x,share,important

# ❌ Bad (no tags)
memphis journal "..."
```

### 2. Workspace Discipline

```bash
# ✅ Good (explicit workspace)
memphis workspace set project-x
memphis journal "..."

# ❌ Bad (default workspace pollution)
memphis journal "..." # in default
```

### 3. Regular Cleanup

```bash
# Weekly cleanup
memphis share-sync --cleanup
memphis verify --all
```

---

## 🐛 Troubleshooting

### Sync conflicts

```bash
# Check differences
memphis show share
memphis recall --chain share --since 7d

# Manual merge
memphis revise <block-id> --add-tags merged
```

### Missing blocks

```bash
# Re-sync from scratch
rm ~/.memphis/network-chain.jsonl
memphis share-sync --pull
```

---

**More examples?** Check `examples/` directory!
