# Rust Core Migration Plan (No-Downtime)

## Objective
Move Memphis core execution from TS-first to Rust-first with zero user-visible downtime.

## Scope (Phase 1)
- Commands: `status`, `journal`, `recall`
- Runtime modes:
  - `core=ts` (stable default)
  - `core=shadow` (Rust in parallel, TS serves)
  - `core=rust` (Rust serves, TS fallback)

## Delivery workflow
1. Contract finalized (JSON schema + error codes)
2. Adapter implemented in TS
3. Shadow execution + parity logs
4. Canary rollout (10% -> 50% -> 100%)
5. Rollback verified and documented

## Gating metrics
- Error delta <= +0.5% vs TS baseline
- p95 latency <= +20% vs TS baseline
- parity >= 99% on sampled requests
- zero data-loss / duplicate writes

## Immediate tasks (next hours)
- [ ] Add runtime mode config (`ts|shadow|rust`)
- [ ] Add TS adapter shim for Rust core invocation
- [ ] Add parity checker script
- [ ] Add canary health script
- [ ] Add rollback runbook and command set

## Rollback command model
- Set runtime mode to `ts`
- Restart dependent service
- Validate smoke checks

## Artifacts
- `docs/CANARY-GATES.md`
- `docs/ROLLBACK-RUNBOOK.md`
- `scripts/core-parity-check.sh`
- `scripts/canary-health-check.sh`
