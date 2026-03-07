# Rollback Runbook (Rust -> TS)

## Trigger conditions
- elevated errors
- parity drift
- latency regression
- data-integrity anomaly

## Fast rollback
1. Set runtime mode to `ts` in active config/env.
2. Restart runtime service.
3. Run smoke:
   - `bash scripts/first-time-user-smoke.sh`
   - `bash scripts/daily-ops-check.sh`
4. Verify bot logs for no recurring 401/409 and no output-noise regressions.

## Post-rollback
- Collect parity/error logs for incident analysis.
- Create corrective patch before next canary.
