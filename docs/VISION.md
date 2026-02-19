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

## 🪓 Ryzyka

- Zbyt dużo naraz (4 ciężkie systemy)
- Rozwijać etapami, nie równolegle

---

*Wizja zaakceptowana - stanowi kierunek rozwoju projektu.*
