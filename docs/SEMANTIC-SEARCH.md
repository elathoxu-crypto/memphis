# Semantic Search — How Memphis Recall Works

**Purpose:** Explain how Memphis semantic search, embeddings, context assembly, and confidence signals work.

---

## Overview

Memphis uses semantic recall to find relevant information by meaning (not only exact keywords).

## How it works

### 1) Query intake
- User question is normalized.
- Memphis classifies intent (`memory-only` vs `external`) when applicable.

### 2) Retrieval
- Recall runs across memory chains (`journal`, `ask`, `decision`, `summary`, `share`, etc.).
- Ranking blends:
  - keyword relevance,
  - semantic similarity (embeddings).

### 3) Context assembly
- Top hits are selected (bounded by `topK`).
- Optional enrichments:
  - summaries,
  - graph neighbors,
  - `WEB CONTEXT` for external queries.

### 4) Answer generation
- LLM receives structured context.
- External mode should include:
  - `SOURCES`
  - `CONFIDENCE: high|medium|low`

---

## Embeddings

- Backend: Ollama (`nomic-embed-text` default).
- Each block is embedded into vector space.
- Similar concepts have closer vectors.

Recommended maintenance:
```bash
memphis embed --force
memphis status
```

---

## Confidence model

Current heuristic:
- **high**: external context used + >=2 sources + supporting recall hits
- **medium**: external context with at least one source OR strong recall support
- **low**: weak external support and weak recall support

Confidence is an operational signal, not formal truth guarantee.

---

## Failure modes

1. **Provider unavailable**
- Memphis may return recall-only fallback.

2. **Noisy web content**
- HTML stripping can degrade structure.
- Source quality varies.

3. **Stale embeddings**
- Semantic quality drops if new blocks are not embedded.

---

## Operator checklist

If answers feel generic:
1. `memphis embed --force`
2. `memphis status`
3. `memphis ask "..." --explain-context`

If external answers lack sources/confidence:
1. verify external trigger in query
2. run smoke tests:

```bash
./scripts/smoke-rm090-ask-tooling-regression.sh
./scripts/smoke-rm095-ask-quality-v3.sh
```

---

## Related
- `docs/USER-GUIDELINES.md`
- `docs/CASE-STUDIES.md`
- `SOUL.md` (tool-vs-memory policy)
