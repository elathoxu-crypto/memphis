# User Guidelines — How to Get the Best from Memphis

**Purpose:** Tips for interacting with Memphis effectively

---

## Quick Start

### Basic Questions
```bash
# Ask anything
memphis ask "what did we discuss about X?"

# Search memory
memphis recall "topic"

# Record something
memphis journal "today we started project X"
```

### Decision Making
```bash
# Record a decision
memphis decide "Project X approach" "Use PostgreSQL" -r "Because it's more scalable"

# Check past decisions
memphis recall "decision about database"
```

---

## Best Practices

### ✅ DO:
- Be specific: "What did we decide about the database?" > "What do you know?"
- Provide context: "In yesterday's session about deployment..."
- Use keywords: "recall about docker"
- Ask for decisions: "What decisions did we make about X?"
- Confirm important info: "Did we agree on Y?"

### ❌ DON'T:
- Ask vague questions: "What do you know?"
- Expect real-time info without tools
- Assume I remember outside Memphis
- Skip recording important decisions

---

## Memory-Only vs External Info

### When I Use Memory Only
- Past conversations
- Decisions we've made
- Project history
- Technical notes

### When You Need External Info
- Current weather → use web_fetch
- Latest news → use web_fetch  
- Run commands → use exec
- File contents → use read

---

## Example Interactions

### Good:
- "What decisions did we make about the API?"
- "Recall our discussion about authentication"
- "What was the conclusion about database choice?"
- "Journal: Started working on feature X"

### Less Effective:
- "What do you know?" (too vague)
- "Tell me everything" (too broad)
- "What's the latest news?" (need tools)

---

## Pro Tips

1. **Use chains**: `memphis recall "topic" --chain decisions`
2. **Be specific**: More context = better results
3. **Confirm**: "Did we decide to use Y?"
4. **Record**: Always save important decisions
5. **Review**: Check `memphis reflect --daily` regularly

---

**Related:** [SOUL-v2.md](SOUL-v2.md) | [SEMANTIC-SEARCH.md](SEMANTIC-SEARCH.md)
