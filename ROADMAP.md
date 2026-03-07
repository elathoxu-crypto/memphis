# 🗺️ Memphis Roadmap - LOGS ON CHAIN + SYSTEM MANAGEMENT

## 🎯 Roadmap (wg. priorytetów)

**Priorytety:**
1. LOGS ON CHAIN → EXEC CHAIN → SYSTEM MANAGEMENT
2. Wszystkie komendy exec (wszystkie powyższe)
3. 30 dni retencja logów
4. Critical + Errors alerts
5. Komenda w bot (opcja 2)
6. Dashboard opcjonalny (nie priorytet)
7. Powiadomienia: Bot + decydujemy później
8. Access: Tylko owner + mix

---

## 📋 Faza 1: LOGS ON CHAIN (MVP)

### Priorytet: P0 - Krytyczne
**Czas:** 2-3 dni
**Scope:** Przechowywanie i przeglądanie logów w Memphis chains

#### Tasks:
- [ ] **1.1 Log Chain Schema**
  - Definiuj strukturę: id, timestamp, level, source, message, context?
  - Levels: DEBUG, INFO, WARN, ERROR, CRITICAL
  - Sources: memphis-cli, memphis-bot, openclaw, system, exec

- [ ] **1.2 Log Chain Implementation**
  - Plik: `src/chains/log.ts`
  - Metody: add(), query(), tail(), export()
  - Obsługa batch operations (logowanie wielu naraz)
  - Integracja z Store (Memphis)

- [ ] **1.3 Log CLI (Podstawowe)**
  - `memphis log <level> <message>` - dodaj log
  - `memphis logs [--source <src>] [--level <lvl>]` - przegladaj
  - `memphis logs --tail <n>` - ostatnie N logów
  - Wsparcie: --json, --pretty

- [ ] **1.4 Auto-logging**
  - Memphis CLI: automatycznie loguje start/stop
  - Memphis Bot: automatycznie loguje przyjęcie/wysłaniu wiadomości
  - Obsługa: try/catch w głównych funkcjach

- [ ] **1.5 Integracja z Bot**
  - Bot loguje do chain (zamiast `/tmp/memphis-bot.log`)
  - Użyj: `memphis log info "Bot started" --source memphis-bot`
  - Przykład: `memphis log error "Failed to send message" --context {error}`

**Deliverables:**
- ✅ Log Chain schema i implementation
- ✅ Log CLI (podstawowe komendy)
- ✅ Auto-logging w CLI + Bot
- ✅ Testy: dodawanie, przeglądanie, filtrowanie

**Success Criteria:**
- [ ] Log Chain działa (przechowywanie)
- [ ] Log CLI działa (dodawanie, przeglądanie)
- [ ] Bot loguje do chain
- [ ] CLI loguje do chain
- [ ] Zapisywanie do łańcucha (nie tylko plik)

---

## 📋 Faza 2: EXEC CHAIN (MVP)

### Priorytet: P1 - Wysoki
**Czas:** 2-3 dni
**Scope:** Wykonywanie komend systemowych (wszystkie powyższe)

#### Tasks:
- [ ] **2.1 Exec Chain Schema**
  - Definiuj strukturę: id, timestamp, command, exitCode, stdout, stderr, background?, pid?
  - Obsługa: komendy blokujące, background, PTY

- [ ] **2.2 Exec Chain Implementation**
  - Plik: `src/chains/exec.ts`
  - Metody: run(), runBackground(), kill(), getOutput(), list()
  - Integracja z Node.js child_process

- [ ] **2.3 Exec CLI (wszystkie komendy)**
  - `memphis exec <command>` - uruchom komendę (blokująco)
  - `memphis exec --background <cmd>` - uruchom w tle
  - `memphis exec --list` - lista uruchomionych
  - `memphis exec --kill <pid>` - zakończ proces
  - `memphis exec --output <id>` - pobierz wynik

- [ ] **2.4 System Commands (wszystkie powyższe)**
  - Podstawowe: ls, cd, cp, mv, rm, mkdir, rmdir, chmod
  - Dysk: df, du, mount, umount, fdisk
  - Sieć: ping, curl, ssh, scp, netstat, ip
  - Procesy: ps, kill, top, htop
  - Deweloperskie: npm, npx, node, yarn, pnpm
  - Python: python, python3, pip, pip3
  - Git: git, git add, git commit, git push
  - System: systemctl, journalctl, service

- [ ] **2.5 Integracja z Log Chain**
  - Automatyczne logowanie każdej komendy
  - `memphis log info "Exec completed" --context {command, exitCode}`
  - Logowanie błędów: `memphis log error "Exec failed"`

- [ ] **2.6 PID Tracking**
  - Śledzenie uruchomionych procesów
  - Auto-cleanup po zakończeniu
  - Status: running, stopped, failed

**Deliverables:**
- ✅ Exec Chain schema i implementation
- ✅ Exec CLI (wszystkie komendy)
- ✅ Obsługa wszystkich kategorii komend
- ✅ Integracja z Log Chain

**Success Criteria:**
- [ ] Exec Chain działa (przechowywanie)
- [ ] Exec CLI działa (uruchamianie, background)
- [ ] Wszystkie kategorie komend wspierane
- [ ] Automatyczne logowanie
- [ ] PID tracking działa

---

## 📋 Faza 3: SYSTEM MANAGEMENT (MVP)

### Priorytet: P2 - Średni
**Czas:** 3-4 dni
**Scope:** Monitoring, status, podstawowe powiadomienia

#### Tasks:
- [ ] **3.1 Status Commands**
  - `/status_system` - status serwera (CPU, RAM, uptime)
  - `/status_services` - status usług
  - `/status_logs` - ostatnie logi
  - Integracja z system: /proc, /sys, systemctl

- [ ] **3.2 Bot Integration**
  - Dodaj komendy do bot-group.ts:
    ```typescript
    case "/status_system":
      const status = await this.runSystemStatus();
      await this.sendMessage(chatId, this.formatStatus(status));
      break;
    ```
  - Owner-only: `/status_system`, `/status_services`
  - Public: `/ping`, `/whoami`

- [ ] **3.3 Monitoring**
  - CPU usage (% dla każdego core)
  - RAM usage (total/used/free)
  - Disk usage (każda partycja, % zajęto)
  - Network stats (up/down jeśli dostępne)

- [ ] **3.4 Alerts (Critical + Errors)**
  - Thresholds: CPU > 80%, RAM > 90%, Disk > 90%
  - Error alerts: >10 errors/h
  - Critical alerts: service down
  - Powiadomienia: bot (owner only)

- [ ] **3.5 Log Retention (30 dni)**
  - Auto-cleanup logów starszych niż 30 dni
  - Kompresja starych logów (opcjonalnie)
  - Archiwizacja przed usunięciem (opcjonalnie)

**Deliverables:**
- ✅ Status commands (system, services, logs)
- ✅ Bot integration
- ✅ Monitoring backend
- ✅ System alerts (Critical + Errors)
- ✅ Log retention (30 dni)

**Success Criteria:**
- [ ] Status commands działają
- [ ] Bot wyświetla status systemu
- [ ] Monitoring działa (CPU, RAM, dysk)
- [ ] Alerts wysyłane (Critical + Errors)
- [ ] Log retention działa (30 dni)

---

## 📋 Faza 4: BOT INTEGRATION (Opcja 2)

### Priorytet: P2 - Średni
**Czas:** 1-2 dni
**Scope:** Memphis CLI jako komenda w bot-group.ts

#### Tasks:
- [ ] **4.1 Command Pattern**
  - `/memphis <memphis-command>` - uruchom Memphis CLI
  - Przykład: `/memphis status`, `/memphis ask "pytanie"`

- [ ] **4.2 Bot Integration**
  - Zintegruj z bot-group.ts:
    ```typescript
    case "/memphis":
      const args = text.substring(9).trim();
      const result = await this.runMemphisCLI(args);
      await this.sendMessage(chatId, result);
      break;
    ```

- [ ] **4.3 Output Formatting**
  - Parse stdout/stderr
  - Formatowanie dla Telegram (Markdown)
  - Obsługa długich wyników (truncate)

- [ ] **4.4 Access Control**
  - Owner-only dla niektórych komend
  - Publiczne dla bezpiecznych
  - Mix zależności (owner tylko /memphis status)

**Deliverables:**
- ✅ `/memphis` command w bot
- ✅ Integracja z Memphis CLI
- ✅ Formatowanie outputu
- ✅ Access control (owner/public)

**Success Criteria:**
- [ ] `/memphis` działa w bot
- [ ] Output poprawnie sformatowany
- [ ] Access control działa

---

## 📋 Faza 5: DASHBOARD (Opcjonalny)

### Priorytet: P3 - Niski
**Czas:** 5-7 dni
**Scope:** Webowy dashboard do podglądu (opcjonalny)

#### Tasks:
- [ ] **5.1 Backend (HTTP Server)**
  - API endpointy: /status, /logs, /exec, /monitor
  - Wybór frameworku (Express, Fastify, Bun)
  - WebSocket dla live updates

- [ ] **5.2 Frontend**
  - Wybór: React/Vue/szybki HTML
  - Pages: Status, Logs, Monitor, Settings
  - Charts: CPU/RAM/Disk over time

- [ ] **5.3 Integracja**
  - Reads from Memphis chains
  - Reads from Exec Chain
  - Reads from Log Chain
  - Real-time updates (WebSocket)

- [ ] **5.4 Authentication**
  - Gateway token
  - Owner-only access
  - OAuth (opcjonalnie)

**Deliverables:**
- ✅ Backend HTTP API
- ✅ Frontend dashboard
- ✅ Integracja z Memphis chains
- ✅ Live monitoring

**Success Criteria:**
- [ ] Dashboard działa (lokalnie)
- [ ] Wyświetla status systemu
- [ ] Wyświetla logi (live)
- [ ] Wyświetla monitoring

---

## 📋 Faza 6: POWIADOMIENIA (Decydujemy później)

### Priorytet: P3 - Niski
**Czas:** Decydujemy później
**Scope:** Bot + email (decydujemy po fazach 1-5)

#### Tasks (na później):
- [ ] **6.1 Bot Notifications**
  - Alerts wysyłane do ownera (DM)
  - Formatowanie wiadomości
  - Frequency limiting (nie spamuj)

- [ ] **6.2 Email Notifications (Opcjonalne)**
  - SMTP configuration
  - Email templates
  - Test delivery

- [ ] **6.3 Dashboard Notifications**
  - In-app notifications
  - Webhook support
  - Push notifications (opcjonalnie)

**Decydujemy:**
- [ ] Zrobimy po fazach 1-5
- [ ] W zależności od wyników MVP
- [ ] Priorytet po innych features

---

## 📋 Faza 7: ACCESS CONTROL (Mix)

### Priorytet: P2 - Średni
**Czas:** 1-2 dni
**Scope:** Tylko owner + mix zależności

#### Tasks:
- [ ] **7.1 Command Categories**
  - Owner-only: `/status_system`, `/backup`, `/autorun`, `/exec kill`
  - Publiczne: `/ping`, `/whoami`, `/ask`
  - Mix: `/status` (publiczne summary), `/exec` (tylko niektóre komendy)

- [ ] **7.2 Authorization Logic**
  - Update bot-group.ts:
    ```typescript
    private isAdminCommand(cmd: string): boolean {
      return ["status_system", "backup", "autorun"].includes(cmd);
    }
    ```

- [ ] **7.3 Error Messages**
  - "⛔ Only owner can run this command"
  - "ℹ️ This command requires additional permissions"
  - "ℹ️ Available commands: ..."

**Deliverables:**
- ✅ Command categories zdefiniowane
- ✅ Authorization logic
- ✅ Clear error messages

**Success Criteria:**
- [ ] Access control działa
- [ ] Owner-only commands zablokowane dla publicu
- [ ] Mix zależności działają

---

## 📋 Faza 8: ADVANCED FEATURES (Nice to Have)

### Priorytet: P4 - Bardzo niski
**Czas:** 7-10 dni
**Scope:** Features przydatne, ale nie krytyczne

#### Tasks:
- [ ] **8.1 Advanced Log Queries**
  - `memphis logs --search <text>` - szukaj w logach
  - `memphis logs --export <format>` - export JSON/CSV
  - `memphis logs --stats` - statystyki

- [ ] **8.2 Advanced Exec**
  - PTY support (interaktywne procesy)
  - Process trees (pid, ppid, children)
  - Resource limiting (CPU, RAM)

- [ ] **8.3 Automation**
  - Cron job management (add/list/remove/enable/disable)
  - Auto-backup
  - Auto-cleanup

- [ ] **8.4 Advanced Monitoring**
  - Container integration (docker, podman)
  - Service control (start/stop/restart)
  - Resource alerts (detailed)

**Deliverables:**
- ✅ Advanced log queries
- ✅ PTY support
- ✅ Cron management
- ✅ Container integration

**Success Criteria:**
- [ ] Advanced features działają
- [ ] Well-tested
- [ ] Documented

---

## 📊 ROADMAP SUMMARY

### MVP (Minimal Viable Product)
**Fazy 1-3:** LOGS → EXEC → SYSTEM
**Czas:** 7-10 dni
**Value:**
- ✅ Logi w Memphis chains
- ✅ Komendy systemowe
- ✅ Monitoring podstawowy
- ✅ Bot zintegrowany
- ✅ Alerts (Critical + Errors)

### Full Version
**Fazy 4-8:** BOT → DASHBOARD → NOTIFICATIONS → ACCESS → ADVANCED
**Czas:** 15-20 dni (po MVP)
**Value:**
- ✅ Web dashboard
- ✅ Powiadomienia (bot + email)
- ✅ Advanced features
- ✅ Pełna integracja

---

## ❓ PRIORITIES (wg. odpowiedzi)

**Kolejność faz:**
1. ✅ **LOGS ON CHAIN** (Faza 1) - P0 krytyczne
2. ✅ **EXEC CHAIN** (Faza 2) - P1 wysoki
3. ✅ **SYSTEM MANAGEMENT** (Faza 3) - P2 średni
4. ✅ **BOT INTEGRATION** (Faza 4) - P2 średni (opcja 2)
5. ✅ **DASHBOARD** (Faza 5) - P3 niski (opcjonalny)
6. ⏳ **POWIADOMIENIA** (Faza 6) - P3 niski (decydujemy później)
7. ✅ **ACCESS CONTROL** (Faza 7) - P2 średni (mix)
8. ✅ **ADVANCED** (Faza 8) - P4 bardzo niski (nice to have)

**Konfiguracja:**
- [ ] **Log retencja:** 30 dni ✅
- [ ] **Alert thresholds:** Critical + Errors ✅
- [ ] **Integration:** Opcja 2 (komenda w bot) ✅
- [ ] **Dashboard:** Opcjonalny (priorytet nie) ✅
- [ ] **Notifications:** Bot + decydujemy później ✅
- [ ] **Access:** Tylko owner + mix zależności ✅

---

## 🎯 NEXT STEPS (Dziś/Jutro)

1. **Zacznij Fazę 1:** LOGS ON CHAIN
   - Zdefiniuj log chain schema
   - Stwórz plik: `src/chains/log.ts`
   - Dodaj log CLI: `src/cli/commands/log.ts`

2. **Testuj iteracyjnie**
   - Implementuj minimum viable
   - Testuj po każdej fazie
   - Raportuj postępy

3. **Zintegruj z bot**
   - Po fazie 1, zintegruj log chain z bot-group.ts
   - Zastąp `/tmp/memphis-bot.log`

4. **Kontynuuj zgodnie z roadmap**
   - Po fazie 1, przejdź do fazy 2
   - Utrzymuj tempo

---

**Roadmap ustalona!** 🗺️

**Zacznij Fazę 1?** 🚀
