# Decision Schema v1

**Status:** Draft  
**Wersja:** 1.0  
**Data:** 2026-02-19

---

## 🎯 Cel

Stabilny format blocka decyzji dla Memphis Cognitive Engine.  
Schemat musi obsługiwać:
- Conscious decisions (ręczne)
- Inferred decisions (wykryte przez agenta)
- Lifecycle (active → revised/deprecated/contradicted)
- Linkowanie między decyzjami

---

## 📦 Block Schema

### Pola obowiązkowe

| Pole | Typ | Opis |
|------|-----|------|
| `id` | string (UUID) | Unikalny identyfikator |
| `timestamp` | ISO 8601 | Kiedy decyzja została podjęta/wykryta |
| `mode` | `"conscious" \| "inferred"` | Sposób powstania |
| `title` | string (1-200 znaków) | Krótki opis decyzji |
| `chosen` | string | Co zostało wybrane |
| `impact_scope` | `"personal" \| "project" \| "life"` | Zakres wpływu |

### Pola opcjonalne

| Pole | Typ | Domyślnie | Opis |
|------|-----|------------|------|
| `context` | string | `""` | Szerszy kontekst sytuacji |
| `options` | string[] | `[]` | Opcje które rozważano |
| `reasoning` | string | `""` | Dlaczego taki wybór |
| `confidence` | number | `1.0` | Pewność (0.0-1.0) |
| `evidence_links` | string[] | `[]` | ID powiązanych blocków |
| `parent_id` | string | `null` | Poprzednia wersja (dla rewizji) |
| `status` | string | `"active"` | Stan decyzji |
| `tags` | string[] | `[]` | Tagi dla filtrowania |
| `source` | string | `"user\|agent"` | Kto wprowadził |

---

## 🔄 Status Lifecycle

```
active
    ├── revised     → nowy block z parent_id
    ├── contradicted → block z status: "contradicted"
    └── deprecated  → block z status: "deprecated"
    
reinforced (specjalny przypadek)
    └── nowy block wzmacniający poprzednią decyzję
```

---

## 📋 Przykładowe Bloki

### Conscious Decision (przykład)

```json
{
  "id": "dec_01JVX2K8M9Q3R5P7N4W6Y2B8C0E",
  "timestamp": "2026-02-19T21:30:00Z",
  "mode": "conscious",
  "title": "Memphis idzie w personal brain, nie w infra",
  "context": "Długa dyskusja o kierunku projektu. Wybrano opcję A (cognitive engine) zamiast B (memory layer dla agentów).",
  "options": [
    "A) Personal brain - cognitive engine dla człowieka",
    "B) Infra - memory layer dla agentów AI"
  ],
  "chosen": "A",
  "reasoning": "Krótszy path to value, proof of concept, natural evolution",
  "confidence": 1.0,
  "evidence_links": [],
  "parent_id": null,
  "status": "active",
  "impact_scope": "project",
  "tags": ["strategic", "direction", "2026-02"],
  "source": "user"
}
```

### Inferred Decision (przykład)

```json
{
  "id": "dec_01JVX4M8N2Q5R7P9K3W6Y1B4C8E",
  "timestamp": "2026-02-19T21:35:00Z",
  "mode": "inferred",
  "title": "Zmiana strategii: z minimal viable do full refactor",
  "context": "Agent wykrył zmianę w repo: porzucony branch 'mvp-pivot', nowy commit 'full-architecture-refactor'",
  "options": [],
  "chosen": "full architecture refactor",
  "confidence": 0.68,
  "evidence_links": [
    "commit_a1b2c3d4",
    "branch_mvp-pivot"
  ],
  "parent_id": null,
  "status": "pending_review",
  "impact_scope": "project",
  "tags": ["inferred", "strategy-shift"],
  "source": "agent",
  "agent_evidence": {
    "type": "branch_analysis",
    "confidence": 0.68,
    "signals": ["branch deleted", "commit message pattern"]
  }
}
```

### Revised Decision (przykład)

```json
{
  "id": "dec_01JVY2K8M3Q5R7P9N4W6Y1B8C2E",
  "timestamp": "2026-03-15T10:00:00Z",
  "mode": "conscious",
  "title": "Decyzja zrewidowana: dodajemy jednak inference v1",
  "context": "Po 3 tygodniach użytkowania - decyzja A była dobra, ale potrzebujemy też B",
  "options": [
    "A) Tylko conscious",
    "B) Tylko inferred", 
    "C) Oba (A+B)"
  ],
  "chosen": "C",
  "reasoning": "Model A+B jest jedyną wersją gdzie Memphis staje się prawdziwym cognitive engine",
  "confidence": 1.0,
  "evidence_links": ["dec_01JVX2K8M9Q3R5P7N4W6Y2B8C0E"],
  "parent_id": "dec_01JVX2K8M9Q3R5P7N4W6Y2B8C0E",
  "status": "active",
  "impact_scope": "project",
  "tags": ["strategic", "revision", "model-ab"],
  "source": "user"
}
```

---

## 🔗 Linkowanie

### Zasady

1. **Evidence links** - powiązane dowody (commity, bloki, pliki)
2. **Parent ID** - dla rewizji tej samej decyzji
3. **Bi-directional** - system automatycznie linkuje A→B i B→A

### Przykład linkowania

```
Decision A (original)
    │
    ├─── evidence_links: [commit_123, block_456]
    │
    └─── revised → Decision B (revised)
                    │
                    ├── parent_id: A.id
                    ├── evidence_links: [A.id]
                    └── system automatycznie: A.next_revision = B.id
```

---

## 🧪 Walidacja

### Obowiązkowe walidacje

- `id` - unikalny UUID
- `timestamp` - valid ISO 8601
- `mode` - tylko "conscious" lub "inferred"
- `title` - niepusty, 1-200 znaków
- `chosen` - niepusty
- `impact_scope` - tylko "personal", "project", "life"
- `confidence` - liczba 0.0-1.0

### Warunkowe

- Jeśli `mode: "conscious"` → `confidence` powinno być 1.0
- Jeśli `mode: "inferred"` → `confidence` < 1.0 (hipoteza)
- Jeśli `status: "revised"` → `parent_id` wymagane
- Jeśli `status: "pending_review"` → tylko dla mode: "inferred"

---

## 📌 Decyzje do podjęcia

1. **Czy `confidence` ma limit dla inferred?**  
   Propozycja: max 0.85 (zawsze jest hipotezą)

2. **Czy allowujemy deleted decisions?**  
   Propoozcja: NIE - append-only, status "deprecated" zamiast delete

3. **Czy inferred musi mieć evidence?**  
   Propozycja: TAK - minimal 1 evidence_link

4. **Jak często można revise?**  
   Propozycja: bez limitu - każda rewizja to nowy block

---

## 🚀 Do implementacji

1. Rozszerzyć `BlockData` w `chain.ts` o decision fields
2. Dodać walidację w `createBlock()`
3. CLI: `mempis decide` - create / list / show / revise
4. CLI: `memphis decisions` - list z filtrami

---

*Schema v1 - do dyskusji i zatwierdzenia.*
