# Memphis Offline Mode — Projekt

## 🎯 Cel

Stworzyć **w pełni offline** wersję Memphis — bez zależności od zewnętrznych API (OpenAI, MiniMax). Używa **lokalnych modeli LLM** o ograniczonej mocy.

---

## 📊 Dostępne Modele Lokalne

| Model | Rozmiar | RAM |Offline? |
|-------|---------|-----|---------|
| `llama3.2:1b` | 1GB | ~2GB | ✅ idealny |
| `llama3.2:3b` | 1GB | ~4GB | ✅ dobry |
| `gemma3:4b` | 3GB | ~6GB | ⚠️ średni |
| `llama3.1:latest` | 4GB | ~8GB | ❌ za duży |
| `mwiewior/bielik` | 7GB | ~12GB | ❌ za duży |

**Rekomendacja:** `llama3.2:1b` — najlżejszy, najszybszy, działa na każdym laptopie.

---

## 🏗️ Architektura Offline

```
┌─────────────────────────────────────────────────────────┐
│                    USER (Ty)                             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 MEMPHIS CLI / TUI                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Offline Mode Engine                   │    │
│  │  • Detekcja połączenia                        │    │
│  │  • Auto-wybor providera                       │    │
│  │  • Fallback chain                              │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │ Ollama  │  │  Local   │  │  Cache   │
   │ (LLM)   │  │  Embed   │  │  Offline │
   └─────────┘  └──────────┘  └──────────┘
        │
        ▼
   ┌─────────────────────────────────────────────────┐
   │            JOURNAL (lokalna pamięć)              │
   │            422 bloki — offline                   │
   └─────────────────────────────────────────────────┘
```

---

## 🔧 Struktura Kodu

```
memphis/
├── src/
│   ├── providers/
│   │   ├── index.ts          # Provider registry
│   │   ├── ollama.ts         # Lokalny LLM
│   │   ├── offline.ts        # NOWY: Offline provider
│   │   └── fallback.ts       # NOWY: Fallback chain
│   │
│   ├── memory/
│   │   ├── store.ts          # Blockchain pamięć
│   │   ├── query.ts          # Wyszukiwanie
│   │   └── offline-cache.ts  # NOWY: Offline cache
│   │
│   ├── agents/
│   │   ├── logger.ts         # Unified logger
│   │   └── offline-agent.ts  # NOWY: Offline agent
│   │
│   ├── cli/
│   │   └── commands/
│   │       ├── ask.ts        # Ask z offline support
│   │       └── status.ts     # Status z trybem offline
│   │
│   └── tui/
│       └── index.ts          # TUI z offline indicator
│
├── config/
│   └── offline.yaml          # NOWY: Konfiguracja offline
│
└── docs/
    └── OFFLINE.md            # NOWY: Dokumentacja
```

---

## ⚡ Kluczowe Funkcje Offline

### 1. Auto-detekcja trybu
```typescript
// src/providers/offline.ts
class OfflineDetector {
  async detect(): Promise<"online" | "offline"> {
    try {
      await fetch("https://api.openai.com");
      return "online";
    } catch {
      return "offline";
    }
  }
}
```

### 2. Fallback chain
```typescript
// src/providers/fallback.ts
const FALLBACK_CHAIN = [
  "ollama:llama3.2:1b",  // Najlżejszy
  "ollama:llama3.2:3b",  // Średni
  "ollama:gemma3:4b",     // Większy
];
```

### 3. Cache kontekstu
```typescript
// src/memory/offline-cache.ts
class ContextCache {
  // Cache ostatnich N bloków dla szybkiego dostępu
  private cache: Block[] = [];
  private maxSize = 50;
}
```

### 4. Offline indicator w TUI
```
┌────────────────────────────┐
│  Memphis 🧠 [OFFLINE]    │  ← Indicator
│  ─────────────────────── │
│  Model: llama3.2:1b      │  ← Lokalny model
│  Context: 50 blocks      │  ← Cache
└────────────────────────────┘
```

---

## 📦 Nowe Komendy CLI

```bash
# Status z trybem offline
memphis status
# Output:
# Memphis 🧠 [OFFLINE MODE]
# Model: llama3.2:1b (lokalny)
# Journal: 422 blocks

# Ask z offline
memphis ask "pytanie"
# Automatycznie używa lokalnego modelu

# Zarządzanie trybem offline
memphis offline on      # Wymuś offline
memphis offline auto    # Auto-detekcja
memphis offline model   # Wybierz model
```

---

## 🎯 Priorytety Implementacji

| Faza | Zadanie | Trudność |
|------|---------|----------|
| **1** | OfflineDetector (auto-detekcja) | 🟢 Łatwe |
| **2** | Fallback chain w providerze | 🟢 Łatwe |
| **3** | Offline indicator w TUI | 🟢 Łatwe |
| **4** | Context cache | 🟡 Średnie |
| **5** | Offline-cli commands | 🟡 Średnie |
| **6** | Optymalizacja pod `llama3.2:1b` | 🔴 Trudne |

---

## 💾 Wymagania Minimalne

| Zasób | Wymaganie |
|--------|-----------|
| RAM | 4GB |
| Dysk | 2GB |
| Procesor | Dowolny 64-bit |

---

## 🚀 Korzyści Offline

- ✅ **Prywatność** — dane nie wychodzą z maszyny
- ✅ **Niezależność** — działa bez internetu
- ✅ **Szybkość** — lokalny model = niska latencja
- ✅ **Darmowe** — brak kosztów API

---

## 📝 Konfiguracja

```yaml
# config/offline.yaml
offline:
  enabled: auto  # auto | on | off
  
  model:
    preferred: llama3.2:1b
    fallback:
      - llama3.2:3b
      - gemma3:4b
    
  cache:
    context_blocks: 50
    enabled: true
    
  memory:
    max_ram_usage: 2GB
```

---

**Chcesz żebym zaczął implementację?** 

Którą fazę najpierw? 🔧