# Telegram Bot Operations (Production)

## Source of truth
Use **systemd user service only**:
- Unit: `memphis-bot.service`
- Env: `~/.config/systemd/user/memphis-bot.env`

Do not run parallel `nohup npm exec tsx bot-group.ts` instances.

## Common commands
```bash
systemctl --user status memphis-bot.service
systemctl --user restart memphis-bot.service
journalctl --user -u memphis-bot.service -f
```

## Token rotation
1. Generate new token in BotFather.
2. Update `TELEGRAM_BOT_TOKEN` in `~/.config/systemd/user/memphis-bot.env`.
3. Reload + restart:
```bash
systemctl --user daemon-reload
systemctl --user restart memphis-bot.service
```
4. Verify logs show `ok:true` and no `401 Unauthorized`.

## Built-in runtime hardening
- Single-instance lock file (`/tmp/memphis-bot.lock`) prevents duplicate pollers.
- Stale lock recovery (dead PID lock is replaced).
- Markdown parse fallback: if Telegram returns `can't parse entities`, message is resent as plain text.

## Smoke test checklist
1. `/help` in DM returns command list.
2. `/ask test` returns response (provider ollama/qwen for bot path).
3. `/restart` causes service restart and bot comes back.
4. No recurring `409 Conflict` / `401 Unauthorized` in logs.

## Daily ops automation
Run daily quick health check:
```bash
bash scripts/daily-ops-check.sh
```

Recommended cron (example: every day 08:30):
```bash
30 8 * * * cd ~/memphis && bash scripts/daily-ops-check.sh >> ~/.memphis/logs/daily-ops-check.log 2>&1
```
