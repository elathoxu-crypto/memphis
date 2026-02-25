# Codex 5.1 Mini – Task Ladder (IPFS Share Sync)

Cel: rozbić implementację `share-sync` na małe kroki dla Codex 5.1 Mini (jedna iteracja = 1 zadanie).

## Warunki wstępne
- Repo: `~/memphis`
- Branch: `master` (brak zmian lokalnych poza szkicem `src/cli/share-sync.ts`)
- Dołączone pliki: `docs/ipfs-shared-memory-plan.md`, `src/cli/share-sync.ts`

## Kolejne zadania (odpalane sekwencyjnie)

1. **Register CLI command**
   - Zmodyfikuj `src/cli/index.ts`: dodaj komendę `share-sync` z opcjami `--push`, `--pull`, `--all`, `--cleanup`, `--limit`, `--since`, `--dry-run`, `--push-disabled`.
   - Handler ma wołać `shareSyncCommand(opts)`.
   - Dodaj wpis w help (krótki opis).

2. **Pinata config loader**
   - W `createPinataBridge()` rozbuduj pobieranie konfiguracji:
     - najpierw `config.integrations?.pinata?.jwt` / `.apiKey` / `.apiSecret`
     - fallback na ENV (`PINATA_JWT`, `PINATA_API_KEY`, `PINATA_SECRET`)
     - gdy brak – rzuć błąd z podpowiedzią.
   - Jeśli dostępne tylko para API key/secret → ustaw je w `PinataBridgeConfig` (teraz przyjmujemy `apiKey` = JWT; trzeba rozszerzyć konstruktor w bridge).

3. **Eksporter bloków (`exportShareBlocks`)**
   - Iteruj po łańcuchach (`store.listChains()`), pomiń `vault`/`share`/`.internal`.
   - Z każdego łańcucha pobierz najnowsze bloki z tagiem `share` (z limitem i filtrem `since`).
   - Mapuj do `SharePayload` (z wycinkiem content ≤ 2KB, bez prywatnych pól).
   - Zwróć listę posortowaną od najstarszego do najnowszego.

4. **Network chain helpers**
   - `appendNetworkEntry()` – dopisz automatyczne dodawanie `status: "pinned"` (jeśli brak).
   - `readNetworkEntries()` – dodaj opcję sortowania (np. najnowsze ostatnie) + filtr unikalnych CID.
   - Napisz test Vitest `tests/share-sync-network.spec.ts` pokrywający append/read (w tym duplikaty, pusty plik).

5. **Fetch & validate (`fetchShareCid`)**
   - Pobierz JSON z `https://gateway.pinata.cloud/ipfs/${cid}` (node-fetch lub builtin fetch).
   - Limit rozmiaru (max 4096 bajtów) – w razie przekroczenia zwróć `null` i zapisz log.
   - Walidacja `sharePayloadSchema`; błędny JSON → zwróć `null`.

6. **Importer (`importShareBlock`)**
   - Upewnij się, że istnieje łańcuch `share` (`store.ensureChain("share")`).
   - Zapisz blok z `type: "share"`, `tags: ["share","remote", ...payload.tags]`, `content` = `payload.content`, oraz metadane (`agent`, `sourceChain`, `sourceIndex`).
   - Zwróć indeks bloku.

7. **Implement shareSyncCommand**
   - `--push`: eksportuj share-bloki → dla każdego pinuj (PinataBridge), dodaj wpis do network chain.
   - `--pull`: czytaj network chain (lokalny plik), wybierz CIDs bez statusu `imported`, pobierz, zaimportuj, zaktualizuj status.
   - `--all`: sekwencja `push` (jeśli nie `pushDisabled`) + `pull`.
   - `--cleanup`: użyj PinataBridge do unpin starych pinów (TTL 7 dni) + usuń wpisy z network chain.
   - Obsługa `--dry-run` – tylko loguje co by zrobił.

8. **CLI UX**
   - Kolorowe logi (chalk) dla push/pull/import.
   - Przy pushu wypisz `CID`, przy pullu – nowy indeks bloku.
   - Zabezpieczenia: brak share-bloków → przyjazny komunikat.

## Po każdym kroku
- `npm run lint` (jeśli jest), `npm test` (Vitest).
- Commit z opisem `feat(share-sync): <krok>`.

Ten szkic dawaj Codexowi krok po kroku; każdy krok powinien być niezależny i mały (≤30 linii modyfikacji).