# Verified Production Install (Golden Path)

Use this when onboarding a new user to Memphis.

## Scope
This is the **recommended** installation path for reliability.
- ✅ Source build (Node.js + npm + git)
- ⚠️ Binary release assets are experimental and not the default path

---

## 1) Prerequisites

```bash
node --version   # >= 20 recommended
npm --version    # >= 9
git --version
```

If Node is missing (Ubuntu/Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

---

## 2) Install from source

```bash
git clone https://github.com/elathoxu-crypto/memphis.git
cd memphis
npm install
npm run build
npm link
```

---

## 3) Initialize and verify CLI

```bash
memphis init
memphis status
memphis journal "install smoke" --tags install,smoke
memphis recall "install smoke"
```

Expected:
- status shows healthy chains/providers
- journal writes block
- recall returns the inserted text

---

## 4) Optional OpenClaw integration

If OpenClaw is installed:
```bash
clawhub install memphis-cognitive
openclaw gateway restart
```

Verify:
```bash
openclaw status --deep
```

---

## 5) Bot operations baseline (if using Telegram bot)

Use systemd-only runtime policy:
```bash
systemctl --user status memphis-bot.service
journalctl --user -u memphis-bot.service -n 80 --no-pager
```

Reference: `docs/TELEGRAM_BOT_OPERATIONS.md`

---

## 6) Known issues

- Binary release artifacts may fail due to snapshot compatibility.
- If ClawHub browser login fails on WSL (`xdg-open ENOENT`), use token login:
  ```bash
  clawhub login --token "<token>"
  clawhub whoami
  ```

---

## 7) Done criteria (new user ready)

- [ ] `memphis status` passes
- [ ] `memphis journal/recall` smoke passes
- [ ] (optional) OpenClaw skill installed and gateway healthy
- [ ] (optional) bot service healthy and no recurring 401/409 in logs

## 8) One-command first-time smoke

Use automated PASS/FAIL smoke:
```bash
bash scripts/first-time-user-smoke.sh
```
