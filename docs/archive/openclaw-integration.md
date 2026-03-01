# OpenClaw Integration Guide

Memphis współpracuje z OpenClaw jako "mózg" pamięci dla agenta Style. Ten plik opisuje, jak przygotować repo do pracy w kontekście OpenClaw oraz jak utrzymać czyste środowisko.

## 1. Instalacja (na hostach z OpenClaw)

```bash
git clone https://github.com/memphis-chains/memphis.git
cd memphis
npm install
npm run build # opcjonalnie, publish/CI
npm link        # albo `npx tsx src/cli/index.ts` bez linka
```

### Wymagania
- Node.js 20+
- git
- `~/.memphis` katalog z prawami RW dla użytkownika OpenClaw
- (opcjonalnie) Ollama z modelem `qwen2.5-coder:3b` lub innym lokalnym LLM

## 2. Konfiguracja Style ↔ Memphis

1. **Workspace**: Style (OpenClaw) powinien mieć dostęp do katalogu z repo (`~/memphis`). W `SOUL.md`/`AGENTS.md` w workspace opisujemy rolę Style + Memphis.
2. **Binarne wywołania**: w automatyzacjach zawsze używaj pełnej ścieżki, np.
   ```bash
   cd ~/memphis && npx tsx src/cli/index.ts status
   ```
   lub po `npm link` po prostu `memphis status`.
3. **Memphis CLI**: Style może uruchamiać komendy `memphis journal|ask|recall|status|repair`. Upewnij się, że output trafia do plików/logów w workspace (np. `session-report.md`).
4. **Cline/integ**: jeżeli korzystasz z Cline (coding agent), trzymaj się reguły `cline -c ~/memphis ...`, żeby budowa odbywała się w repo Memphis.

## 3. Offline Toggle & Local-only Mode

Memphis ma wbudowany Offline Detector i Fallback Chain (`src/providers/offline.ts`). Jeśli chcesz działać wyłącznie lokalnie:

1. Zainstaluj Ollamę (lub inny lokalny runtime) i pobierz model, np. `qwen2.5-coder:3b`:
   ```bash
   curl https://ollama.com/install.sh | sh
   ollama pull qwen2.5-coder:3b
   ```
2. Ustaw status na `offline` i wybierz model lokalny w `config/offline-toggle.json`:
   ```json
   {
     "status": "offline",
     "preferredModel": "qwen2.5-coder:3b",
     "fallbackModels": ["o3:mini"]
   }
   ```
3. W Memphis TUI przełącz się na Offline i wybierz lokalny model.
4. `memphis status` powinien pokazywać, że provider = Ollama; żadne zapytania nie idą do MiniMax/OpenRouter.

Każdy toggle logujemy w journalu z tagiem `offline-toggle` + `agent:style`/`role:user`.

## 4. Vault Policy

Sekrety (API keys, SSI) muszą być zarządzane wyłącznie przez Memphis TUI (`memphis vault`). Style nie zapisuje sekretów w chainach OpenClaw.

Checklist:
- `memphis vault init`
- `memphis vault add OPENAI_API_KEY sk-...`
- Taguj wpisy w journalu: `security`, `vault`, `workflow`
- Jeśli ktoś próbuje wprowadzić sekret przez OpenClaw, loguj ostrzeżenie i odsyłaj do TUI.

## 5. Deploy na drugim PC (Ubuntu + GPU)

1. `sudo apt update && sudo apt upgrade`
2. `sudo apt install build-essential curl git python3 python3-pip zip unzip`
3. `sudo ubuntu-drivers autoinstall` + restart, `nvidia-smi`
4. `git clone ... ~/memphis && cd ~/memphis && npm install`
5. (opcjonalnie) `pip install -r requirements.txt`
6. Skopiuj `~/.memphis` (rsync) i zweryfikuj `memphis status`
7. Dodaj lokalne modele (Ollama) i sprawdź offline toggle

## 6. Monitoring i naprawy

- `memphis repair --dry-run` → pokazuje, które łańcuchy są uszkodzone bez modyfikacji
- `memphis repair` → przenosi uszkodzone bloki do `~/.memphis/.quarantine` i instruuje, by uruchomić `memphis verify`
- Bot Telegram (`memphis bot`) zapewnia zdalny interfejs (komendy /status, /ask, /decisions, etc.)

## 7. Hygiena repo

- Nie commituj `node_modules`, `dist`, `.memphis`, `.openclaw`, logów. `.gitignore` już to uwzględnia.
- Pliki operacyjne (raporty, klucze, paczki ZIP) trzymaj poza repo – np. w `workspace/archive/`.
- README i docs odzwierciedlają funkcje używane przez Style; jeśli dodajesz nowe funkcje, aktualizuj ten plik.

## 8. Troubleshooting: czysty start

Jeśli CLI krzyczy `ConfigError: providers ... expected record, received null`, zrób pełny reset:

```bash
# 1. Upewnij się, że używasz Node 20
node -v            # jeśli >20 → nvm use 20

# 2. Usuń stare dane i config
rm -rf ~/.memphis

# 3. Zainstaluj / przebuduj repo
cd ~/memphis
npm install
npm run build
node dist/cli/index.js init
```

Po tych krokach `~/.memphis/config.yaml` zostanie wygenerowany od nowa, a `memphis status` powinien pokazać lokalnego providera (Ollama). Jeśli korzystasz z globalnej komendy `memphis`, pamiętaj by po rebuildzie wykonać `npm link` lub uruchamiać CLI przez `node dist/cli/index.js <cmd>`.

⚠️ Jeśli `status` wywala błąd `providers: Invalid input: expected record, received null`, oznacza to że config ma puste pole providers. Napraw ręcznie:

```bash
cat <<'EOF' > ~/.memphis/config.yaml
providers:
  ollama:
    url: http://localhost:11434
    model: llama2
    role: primary

memory:
  path: ~/.memphis/chains
  auto_git: false
  auto_git_push: false
EOF
```

---
Ta instrukcja powinna być aktualizowana razem z nowymi integracjami. Jeśli Style zyskuje nowe uprawnienia lub ograniczenia, dopisz je tutaj i w README.
