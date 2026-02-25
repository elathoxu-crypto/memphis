# IPFS Pinata Integration - Projekt

## Cel

Integracja Memphis z IPFS (Pinata) dla distributed memory między agentami.

## Limity (Darmowe Konto Pinata)

| Limit | Wartość |
|-------|----------|
| Pojemność | 1 GB |
| Max plików | 100 pins |
| Czas przechowywania | bez limitu (ale czyszczenie) |

## Struktura Kontenera

```json
{
  "agent": "Watra",
  "timestamp": "2026-02-25T20:00:00Z",
  "type": "thought|question|answer|context",
  "size": "1024",
  "content": "..."
}
```

**Max rozmiar: 1 KB**

## Konfiguracja (config.yaml)

```yaml
providers:
  pinata:
    apiKey: "PINATA_JWT_TOKEN"
    maxPins: 100
    ttlDays: 30
    cleanupEnabled: true
```

## Wrapper (src/integrations/pinata.ts)

```typescript
interface PinataConfig {
  apiKey: string;
  maxPins: number;
  ttlDays: number;
  cleanupEnabled: boolean;
}

interface MemoryBlock {
  agent: string;
  timestamp: string;
  type: "thought" | "question" | "answer" | "context";
  size: string;
  content: string;
}

export class PinataBridge {
  private config: PinataConfig;
  private baseUrl = "https://api.pinata.cloud";

  constructor(config: PinataConfig) {
    this.config = config;
  }

  async pinJSON(data: MemoryBlock): Promise<string> {
    // Walidacja rozmiaru
    const json = JSON.stringify(data);
    if (json.length > 1024) {
      throw new Error("Payload exceeds 1KB limit");
    }

    const response = await fetch(`${this.baseUrl}/pinning/pinJSONToIPFS`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: {
          name: `${data.agent}_${data.timestamp}`,
        },
      }),
    });

    const result = await response.json();
    return result.IpfsHash;
  }

  async unpin(hash: string): Promise<void> {
    await fetch(`${this.baseUrl}/pinning/unpin/${hash}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });
  }

  async getPinned(): Promise<Array<{ hash: string; name: string; date: string }>> {
    const response = await fetch(`${this.baseUrl}/pinning/userPinnedData`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    const result = await response.json();
    return result.rows.map((row: any) => ({
      hash: row.ipfs_pin_hash,
      name: row.metadata?.name,
      date: row.date_pinned,
    }));
  }

  async cleanupOldPins(): Promise<number> {
    if (!this.config.cleanupEnabled) return 0;

    const pins = await this.getPinned();
    const ttlMs = this.config.ttlDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    let removed = 0;

    for (const pin of pins) {
      const pinDate = new Date(pin.date).getTime();

      // Usuń stare (TTL)
      if (now - pinDate > ttlMs) {
        await this.unpin(pin.hash);
        removed++;
        continue;
      }
    }

    // Usuń nadmiarowe (limit)
    while (pins.length - removed > this.config.maxPins) {
      const oldest = pins.find(p => !pins.slice(0, removed).includes(p));
      if (oldest) {
        await this.unpin(oldest.hash);
        removed++;
      }
    }

    return removed;
  }
}
```

## Automatyzacja

### Cron (co 24h)

```bash
# Cleanup old pins
0 0 * * * cd ~/memphis && node dist/integrations/pinata.js cleanup
```

### HEARTBEAT

```typescript
// W HEARTBEAT.md
- Sprawdź czy są nowe thoughts do wysłania na IPFS
- Jeśli tak: pinJSON() → zapisz hash
- cleanupOldPins() - co uruchomienie
```

## Przykład Użycia

```typescript
import { PinataBridge } from "./integrations/pinata.js";

const pinata = new PinataBridge({
  apiKey: process.env.PINATA_API_KEY!,
  maxPins: 100,
  ttlDays: 30,
  cleanupEnabled: true,
});

// Wyślij thought
const hash = await pinata.pinJSON({
  agent: "Watra",
  timestamp: new Date().toISOString(),
  type: "thought",
  size: "512",
  content: "Memphis TUI działa!",
});

console.log(`Pinned: ipfs.io/ipfs/${hash}`);
```

## Estymacja Kosztów

| Operation | Koszt |
|-----------|-------|
| Pin (1KB) | ~0.001 PIN |
| Unpin | free |
| Get pins | free |
| **100 pins/miesiąc** | **~0.10 PIN** (~$0) |

## TODO

- [ ] Założyć konto Pinata
- [ ] Dodać API key do config
- [ ] Stworzyć src/integrations/pinata.ts
- [ ] Dodać komendę CLI: `memphis ipfs pin|cleanup|status`
- [ ] Podłączyć do HEARTBEAT
- [ ] Test na 2 agentach

---

**Projekt gotowy do implementacji.**
