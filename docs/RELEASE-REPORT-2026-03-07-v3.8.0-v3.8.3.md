# Release Report — v3.8.0 → v3.8.3 (2026-03-07)

## Scope summary
This report captures shipped changes across the release train:
- v3.8.0 — RM-061 roadmap package
- v3.8.1 — canonical memory workflow docs + skill harvest
- v3.8.2 — install UX hardening (source/npm default)
- v3.8.3 — documentation integrity (missing pages + broken links)

## Shipped releases

### v3.8.0
- ROADMAP package and scripts:
  - `ROADMAP.md`
  - `scripts/embedding-coverage-report.sh`
  - `scripts/embedding-coverage-alert.sh`
  - `scripts/night-backup-heartbeat.sh`
  - `scripts/share-sync-runner.sh`
- CLI/logging surfaces:
  - `src/chains/log.ts`
  - `src/cli/commands/log.ts`
  - `src/cli/index.ts` extensions
- Provider env mapping:
  - `src/integrations/vault-providers.ts` (`zai -> ZAI_API_KEY`)

### v3.8.1
- Added canonical memory docs:
  - `docs/MEMORY-WORKFLOWS.md`
  - `docs/SKILLS-KNOWLEDGE-HARVEST-2026-03-07.md`
- Updated `docs/README.md` index to include canonical memory docs.

### v3.8.2
- README/Quickstart UX hardening:
  - source/npm install explicitly marked as production-default
  - binaries explicitly marked experimental due to snapshot compatibility risk

### v3.8.3
- Documentation integrity fixes:
  - added missing pages: `CONTRIBUTING.md`, `docs/MODEL-A-GUIDE.md`, `docs/MONITORING.md`, `docs/CODE_OF_CONDUCT.md`
  - fixed broken links in key docs files

## Post-release operational fixes (same day)
- Telegram bot stabilized with systemd-only runtime policy and runbook (`docs/TELEGRAM_BOT_OPERATIONS.md`).
- Watra node synced to latest release tags/commits over SSH.

## Known manual follow-up
- ClawHub hide/deprecate for legacy skill slugs requires moderator/admin role (CLI returned `Forbidden` for hide action).

## Validation checkpoints
- TypeScript build passed after release changes.
- Main + Watra repositories synced to latest release commits.
