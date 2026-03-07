# Monitoring

Operational monitoring checklist for Memphis deployments.

## Quick checks
```bash
memphis status
openclaw status
systemctl --user status memphis-bot.service
journalctl --user -u memphis-bot.service -n 100 --no-pager
```

## Health signals
- CLI commands respond without provider crashes
- bot poll loop returns `ok:true`
- no repeated `401 Unauthorized` / `409 Conflict`
- chain writes and recall remain operational

## Incident first steps
1. Confirm token/config consistency.
2. Ensure single bot runner (systemd-only policy).
3. Restart service and re-check logs.

See also:
- [TELEGRAM_BOT_OPERATIONS.md](TELEGRAM_BOT_OPERATIONS.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
