# Evidence Index — Audit Snapshot 2026-03-07

## Release evidence
- Commit: `f256a22`
- Tag: `v3.8.12`
- Remote push status: completed

## Build & smoke evidence
- `npm run build` (PASS)
- `scripts/smoke-rm090-ask-tooling-regression.sh` (PASS)
- `scripts/smoke-rm095-ask-quality-v3.sh` (PASS)
- `scripts/smoke-rm104-no-false-decision.sh` (PASS)

## Ops evidence
- `scripts/ops-routine-pack.sh` includes RM090 regression smoke
- Daily ops + runbook artifacts exist in docs/workspace lineage

## Functional fixes included
- `src/core/ask.ts`
  - external query handling
  - source attribution
  - confidence append
  - status-intent guardrails
- `src/cli/commands/ask.ts`
  - empty-input guard
  - model label fallback
- `src/core/decision-detector.ts`
  - stricter ask decision detection
- `src/core/planner.ts`
  - decision field mapping fix (`undefined` removal)

## Documentation evidence
- `SOUL.md` v1.2.0 updates (capabilities/limits/tool-vs-memory)
- `docs/SEMANTIC-SEARCH.md`
- `docs/AUDIT-PACKET-2026-03-07/*`

## Known blockers evidence
- npm publish: `ENEEDAUTH` against npm.pkg.github.com
- ClawHub publish: account age restriction (retry in 4 days)
- Reminder persisted for retry date: 2026-03-11
