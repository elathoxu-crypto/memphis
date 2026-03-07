# Model A Guide (Conscious Decisions)

Model A is the explicit decision-capture workflow.

## Core command
```bash
memphis decide "Title" "Choice" --reasoning "Why" --tags decision,project:x
```

## When to use
- architecture choices
- provider/tooling changes
- roadmap forks
- production policies

## Best practice
After each major decision, add a follow-up journal entry:
```bash
memphis journal "Decision applied: <title> -> <choice>" --tags decision,milestone
```

See also:
- [DECISION_SCHEMA.md](DECISION_SCHEMA.md)
- [MEMORY-WORKFLOWS.md](MEMORY-WORKFLOWS.md)
