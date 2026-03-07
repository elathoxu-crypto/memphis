# Semantic Search — How Memphis Recall Works

**Purpose:** Explain how Memphis semantic search, embeddings, and confidence scoring work

---

## Overview

Memphis uses semantic search to find relevant information in your memory chains. Unlike keyword search, semantic search understands meaning and context.

## How It Works

### 1. Embeddings
- Every block is converted to a vector embedding using Ollama (nomic-embed-text)
- Similar concepts = vectors close together in vector space

### 2. Search Process
```
User query → Generate query embedding → Compare with stored embeddings → Return top results
```

### 3. Confidence Scoring
- **0.8+** — High confidence, very relevant
- **0.5-0.7** — Medium confidence, likely relevant  
- **<0.5** — Low confidence, may not be relevant

## Usage

### CLI
```bash
memphis recall "topic"
memphis recall "topic" --chain journal
memphis recall "topic" --limit 10
```

### Parameters
- `query` — What to search for
- `chain` — Which chain(s) to search
- `limit` — Max results (default: 8)
- `semanticWeight` — Balance semantic vs keyword (0-1)

## Source Attribution

Every recall result shows:
- Chain and block ID
- Timestamp
- Confidence score
- Relevant excerpt

## Best Practices

1. Use specific terms
2. Chain filtering improves results
3. Check confidence scores
4. Use `--limit` for focused results

---

**Related:** [USER-GUIDELINES.md](USER-GUIDELINES.md) | [CASE-STUDIES.md](CASE-STUDIES.md)
