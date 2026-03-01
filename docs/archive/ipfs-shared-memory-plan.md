# IPFS Shared Memory – Plan (2026-02-25)

## Cel
Zbudować realny, automatyczny przepływ "share-tagged" bloków pomiędzy agentami Memphis (Style ↔ Watra ↔ przyszłe węzły) oparty na Pinata/IPFS + lokalnym network chain.

## Założenia
1. Style ma działający dostęp do Pinata API (upload + list + unpin).
2. Watra ma co najmniej dostęp do gateway.pinata.cloud (read-only). Upload może być delegowany Style'owi, jeśli jego sieć blokuje API.
3. Bloki do synchronizacji są oznaczane tagiem `share` (w chains: `journal`, `thoughts`, `ask`, itp.).
4. Maksymalny rozmiar pojedynczego payloadu: **≤ 2 KB** (limit Pinata JSON pin).
5. Potrzebujemy lokalnej listy `network-chain` (JSON) zawierającej CIDs + metadane, aby każdy agent wiedział co już zaimportował.

## Architektura (MVP)
```
memphis share-export → pinata pin JSON → network-chain.json append → gateway fetch → memphis share-import
```
1. **Export** – CLI/skrypt zbiera nowe bloki z tagiem `share`, tworzy minimalny JSON (agent, timestamp, chain, index, content, tags).
2. **Pin** – JSON pinowany na Pinacie (REST). W odpowiedzi otrzymujemy CID.
3. **Network chain** – lokalny plik (np. `~/.memphis/network-chain.jsonl`) przechowuje rekord `{cid, agent, timestamp, status}`. W przyszłości można go również publikować na IPFS jako "lista CIDs".
4. **Import** – drugi agent czyta network chain (na razie ręcznie kopiowany/gateway), sprawdza, których CID jeszcze nie widział, pobiera JSON z `gateway.pinata.cloud/ipfs/<cid>`, waliduje i wstawia do swojego Memphis jako nowy blok (np. `share` chain + tag `remote`).

## Acceptance Criteria
1. Nowa komenda CLI `memphis share-sync` dostępna w `src/cli/index.ts` (`--push`, `--pull`, `--all`, `--cleanup`).
2. Konfiguracja Pinaty (JWT/API) czytana z `~/.memphis/config.yaml` (`integrations.pinata.*`) z fallbackiem na `PINATA_JWT`/`PINATA_API_KEY` env.
3. Importowane wpisy trafiają do dedykowanego łańcucha `share` (auto-tworzony jeśli brak) z tagiem `remote`, żeby nie mieszać ich z lokalnym journalem.
4. Wszystkie payloady z IPFS walidowane przez Zoda schema (rozmiar ≤ 2 KB, dozwolone pola). Błędne CIDs oznaczane w network chain `status: "unavailable"`.
5. Jednostkowe testy (Vitest) dla helperów `appendNetworkEntry/readNetworkEntries` oraz walidatora payloadu.

## Zadania (kolejność wykonywania)
| Nr | Zadanie | Szczegóły | Owner | Status |
|----|---------|-----------|-------|--------|
| 1 | **Eksporter tagu `share`** | Funkcja `exportShareBlocks(limit, since)` zwracająca lekkie JSON-y | Style | TODO |
| 2 | **Pinata client util** | Ujednolicony wrapper (reuse `src/integrations/pinata.ts`) + funkcje CLI `pin`, `list`, `cleanup` | Style | ✅ (wrapper istnieje) |
| 3 | **Network chain storage** | Plik `~/.memphis/network-chain.jsonl` + helpery `appendEntry` / `listEntries` | Style | TODO |
| 4 | **Sync CLI** | Nowa komenda: `memphis share-sync [--push|--pull|--all]` korzystająca z eksportu, Pinaty i network chain | Codex 5.1 | TODO |
| 5 | **Importer** | Wewnątrz sync CLI: `importShareCid(cid)` → walidacja schema (Zod) → `store.appendBlock("share", {tags:["share","remote"]})` | Codex 5.1 | TODO |
| 6 | **Cleanup job** | `memphis share-sync --cleanup` usuwa stare CIDs (TTL 7 dni) przez Pinata API + lokalne wpisy | Style | TODO |
| 7 | **Heartbeat hook** | (Po MVP) – wpis do `HEARTBEAT.md`: co X minut `memphis share-sync --all` | Style | TODO |

## Wymogi techniczne
- Minimalne payloady (bez zbędnych pól). Docelowy schema:
```json
{
  "agent": "Style",
  "timestamp": "2026-02-25T21:50:00.000Z",
  "chain": "journal",
  "index": 1041,
  "tags": ["share","veiled-nexus"],
  "content": "Zwięzła notatka (≤ 1 KB)",
  "meta": {"source": "style@memphis"}
}
```
- Pinata JWT przechowywany w `~/.memphis/pinata.env` (już skonfigurowane). Sync CLI powinien odczytać env lub lokalny config.
- Importer nie może nadpisywać istniejących bloków → jeśli CID już zaimportowano, pomijamy z wpisem w logu.

## Ryzyka / Otwarte pytania
1. **Dostęp Watry do Pinata API** – jeśli wciąż zablokowany, Watra działa tylko jako konsument (read-only). To trzeba obsłużyć w CLI flagą `--push-disabled`.
2. **Spójność network chain** – na razie lokalny plik; docelowo można też publikować ten plik na IPFS (CID-of-CIDs). MVP zakłada ręczne przenoszenie/commit przez Git.
3. **Ochrona danych** – share tag powinien być stosowany wyłącznie do jawnie publicznych myśli. W planie dodać walidację (np. blokowany łańcuch `vault`).
4. **Limit Pinaty** – ~100 pinów / 1 GB. Cleanup musi usuwać stare wpisy (np. TTL 7 dni) i lokalnie zaznaczać, że CID został unpinned.

---
_Przygotowane przez Style_ – 2026-02-25 22:39 CET.
