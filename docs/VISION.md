# Memphis Vision - Oficjalna Wizja Projektu

**Data:** 2026-02-19  
**Status:** Zaakceptowana

---

## 🧠 Memphis w jednym zdaniu

> Memphis = lokalny agent + offline LLM + kontekst z szyfrowanego blockchaina pamięci

---

## 🎯 Czym Memphis JEST

- **Lokalny agent** - działa na komputerze użytkownika
- **Offline LLM** - mały model (llama 3.x 1B-8B, mistral, phi, gemma)
- **Blockchain pamięci** - kryptograficznie zabezpieczony, append-only ledger
- **Suwerenny system poznawczy** - nie "aplikacja AI", lecz personal cognition infrastructure

---

## ❌ Czym Memphis NIE JEST

- ❌ Notatnik
- ❌ Knowledge base
- ❌ Typowe CLI tool
- ❌ Blockchain (tokeny, sieć, consensus)
- ❌ Zależny od chmury
- ❌ Vendor lock-in

---

## 🏗️ Architektura (wg wizji)

### 1. Agent lokalny (runtime)
Proces, który:
- Słucha zdarzeń (terminal, kod, błędy, prompts)
- Zapisuje je do memory chain
- Reaguje kontekstowo
- **To NIE CLI - to daemon**

### 2. Offline LLM
- Mały, szybki model (llama 3.x 1B-8B, mistral, phi, gemma)
- Rola: interpretacja kontekstu, nie generowanie świata

### 3. Blockchain pamięci
Każdy block:
```
- hash(prev) 
- timestamp 
- source 
- type 
- payload (encrypted)
- signature (optional)
```

Właściwości:
- append-only
- tamper detection
- lineage wiedzy
- replay historii

### 4. Context extraction
Agent zapisuje tylko:
- Decyzje
- Błędy
- Rozwiązania
- Anomalie

---

## 🔐 Najważniejsza zasada

To **NIE jest blockchain "crypto"**:
- ❌ tokeny
- ❌ sieć
- ❌ consensus

To **lokalny, kryptograficzny dziennik pamięci**:
- ✅ hash chain
- ✅ podpisy
- ✅ integralność
- ✅ audytowalność

Bardziej: **git / ledger / event sourcing** niż Ethereum

---

## 🔥 Największa siła wizji

- **Suwerenność** - brak chmury
- **Brak vendor lock** - wszystko lokalnie
- **Brak telemetry** - prywatność
- **Brak wycieku wiedzy** - użytkownik kontroluje swoje dane

---

## 🧭 Roadmap (wg wizji)

| Etap | Zadanie | Priorytet |
|------|---------|-----------|
| 1 | Memory ledger (core) | ✅ Fundament |
| 2 | Agent runtime | Zbiera events |
| 3 | Offline LLM | Interpretacja |
| 4 | Interface (CLI/TUI/IDE) | Warstwa prezentacji |

---

## 📌 Wybrany kierunek

**A) Memphis jako "AI dla człowieka"**
- Osobisty mózg użytkownika
- Personal memory
- Personal cognition

**Uzasadnienie:**
1. Rynkowo - krótszy path to value
2. Motywacyjnie - proof of concept (używasz codziennie)
3. Technicznie - agent runtime może być ewolucją, nie rewolucją

---

## 🧠 Serce Memphis: PAMIĘĆ DECYZJI (Opcja C)

**Wybór:** C) pamięć decyzji = cognitive engine

**Dlaczego:**
- Najbliższa oryginalnej wizji
- "co powinienem sobie przypomnieć teraz?"
- "czy już kiedyś miałem taki problem?"
- reflective memory
- Nie "ładniejszy notatnik" - to przegrywa

### Jednostka systemu: cognitive event

```typescript
interface CognitiveBlock {
  timestamp: string;
  type: "decision" | "insight" | "problem" | "observation";
  context: string;
  emotional_weight?: number;  // opcjonalnie
  links: string[];           // powiązane bloki
  source: string;
}
```

---

### Co staje się priorytetem:
1. Frictionless capture - zapisywanie myśli w 2 sekundy
2. Recall w momentach decyzji - nie manual search
3. Reflection AI - pyta Ciebie, nie odwrotnie

### Co przestaje być ważne:
- TUI jako UI showcase
- CLI jako produkt
- Multi-agent integracje
- Enterprise

---

## 🧠 Model A + B (Docelowy)

### A) Conscious Decisions
Ty mówisz: `memphis decide: "Idziemy w personal brain"`
- Pełny reasoning
- Opcje rozważane
- Typ: strategic

### B) Inferred Decisions
Agent wykrywa:
- Commit kierunku
- Porzucony branch  
- Zmianę strategii
- Powtarzalne wybory

Zapisuje:
```
type: inferred_decision
confidence: 0.62
evidence: commits / actions / patterns
```
To NIE jest twarda decyzja - to hipoteza poznawcza.

---

## 🧱 Decision Schema v1 (propozycja)

```typescript
interface DecisionBlock {
  id: string;
  timestamp: string;
  mode: "conscious" | "inferred";
  title: string;
  context: string;
  options: string[];
  chosen: string;
  reasoning: string;
  confidence: number;
  evidence_links: string[];
  impact_scope: "personal" | "project" | "life";
  status: "active" | "revised" | "deprecated" | "contradicted";
}
```

---

## 🧬 Decision Lifecycle

Decyzja żyje:
- **revised** - zaktualizowana
- **contradicted** - obalona
- **deprecated** - nieaktualna
- **reinforced** - wzmocniona

---

## 🧭 Zasada projektowa

**Agent: proponuje, nie decyduje**  
**Człowiek: zatwierdza, nadaje znaczenie**

---

## 🔥 Minimalna wersja B (realna)

```
possible_decision detected: "Project direction shifted from X to Y"
confidence: 0.48
save? [y/n]
```

Ty potwierdzasz → staje się conscious.

---

## ❓ Pierwszy krok do realizacji

Co budujemy jako pierwsze?
1. Decision schema (fundament)
2. CLI "memphis decide" (świadome decyzje)
3. Agent detector v0 (sygnały z repo/terminala)
4. Reflection (LLM analizuje)

---

## 🪓 Ryzyka

- Zbyt dużo naraz (4 ciężkie systemy)
- Rozwijać etapami, nie równolegle

---

*Wizja zaakceptowana - stanowi kierunek rozwoju projektu.*

---

## 🎯 Core Memphis v1 - Ostateczna definicja

Jedyna funkcja: `memphis decide`

### UX Spec v1

**1️⃣ Najkrótsza forma:**
```
memphis decide "Offline zamiast cloud"
```

**2️⃣ Pełna forma:**
```
memphis decide "Offline zamiast cloud" -r "privacy + sovereignty"
```

---

## 🏗️ Zasady v1 (twarde)

### 1) projectPath jako hint, nie prawda
- `projectPath = cwd`
- Opcjonalnie `gitRoot` (jeśli wykryty)

### 2) Minimalny payload, bogate metadane
- title, reasoning, mode, confidence, createdAt, decisionId/recordId
- Metadata: projectPath, gitRoot, hostname, source

### 3) Zero LLM w decide
- LLM tylko w reflection, osobno
- decide <100ms

### 4) Jedna komenda = jeden block (append-only)
- Rewizje = nowy block z supersedes

---

## ⚡ Auto-detect v1
```
projectPath = process.cwd()
gitRoot = git rev-parse --show-toplevel || null
```

---

## 🗂️ Architektura: Global ledger + auto-tag
```
~/.memphis (global ledger)
  └── decisions/
```
