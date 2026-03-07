# Memory Workflows (Canonical)

## Purpose
Canonical operational memory flow for Memphis users and agents.

## Core loop
1. **Journal** important facts and outcomes.
2. **Decide** explicit choices with rationale.
3. **Ask/Recall** for context-aware retrieval.
4. **Reflect** to detect patterns and improve future decisions.

---

## 1) Journal-first
Use journal for durable state and milestones.

```bash
memphis journal "Completed X with result Y" --tags project:x,milestone
```

Recommended tags:
- `identity`
- `preferences`
- `decision`
- `session`
- `learning`
- `project:<name>`
- `share`

---

## 2) Decision capture
For impactful choices, always persist title + choice + reason.

```bash
memphis decide "Provider strategy" "local-first" \
  --options "cloud|local|hybrid" \
  --reasoning "Reliability + privacy" \
  --tags architecture,ops
```

---

## 3) Ask / Recall
Use semantic retrieval before acting on uncertain context.

```bash
memphis ask "What did we decide about release flow?" --top 20
memphis recall "release flow" --limit 10
```

---

## 4) Reflection
Periodically run reflection to detect repeated blockers/patterns.

```bash
memphis reflect --daily
```

---

## Bot/Agent routing guidance
Message intent routing (recommended):
- question -> `ask`
- decision statement -> `decide`
- insight/lesson -> `journal`
- session close -> summary journal block

---

## Migration note
This document consolidates high-value guidance harvested from legacy/overlapping skills. See:
- `docs/SKILLS-KNOWLEDGE-HARVEST-2026-03-07.md`
