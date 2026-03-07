# Case Studies — Real Memphis Scenarios

**Purpose:** 3 real-world examples of Memphis in action

---

## Case 1: Troubleshooting

### Scenario
User notices bot stopped responding. They need to diagnose and fix.

### How Memphis Helps:
```bash
# 1. Check status
memphis status

# 2. Check logs
memphis logs --error

# 3. Verify chains
memphis verify

# 4. Check embeddings
memphis embed --report
```

### Key Decisions:
- Embeddings were stale → regenerated with `--force`
- Bot now sees all recent decisions

### Outcome:
- Bot fixed in 10 minutes
- Decision recorded for future reference

---

## Case 2: Research

### Scenario
User wants to understand a new technology (e.g., ChromaDB).

### How Memphis Helps:
```bash
# 1. Recall previous research
memphis recall "ChromaDB"

# 2. Use web_fetch for docs
# (user requests, Memphis uses tool)

# 3. Record findings
memphis journal "Research: ChromaDB - vector DB, similar to Pinecone, local-first"
```

### Key Decisions:
- Document new learnings
- Link to previous knowledge
- Save for future recall

### Outcome:
- Knowledge accumulated over time
- Easy recall of past research

---

## Case 3: Release Operations

### Scenario
User wants to release a new version of Memphis.

### How Memphis Helps:
```bash
# 1. Recall previous releases
memphis recall "release v3.8"

# 2. Check roadmap
memphis recall "roadmap"

# 3. Verify integrity
memphis verify

# 4. Record decision
memphis decide "Release v3.9" "Add feature X, fix Y" -r "Based on user request"
```

### Key Decisions:
- Track all release-related decisions
- Document rationale
- Maintain audit trail

### Outcome:
- Complete release history
- Easy rollback if needed

---

## Lessons Learned

1. **Always verify** before major actions
2. **Record decisions** with rationale
3. **Use embeddings** for better recall
4. **Check chains** regularly
5. **Document** everything

---

**Related:** [SOUL-v2.md](SOUL-v2.md) | [USER-GUIDELINES.md](USER-GUIDELINES.md)
