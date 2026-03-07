# Canary Gates (Rust Core)

## Pre-canary checklist
- [ ] TS baseline captured (error + p95)
- [ ] Shadow mode running with parity logs
- [ ] Rollback drill executed successfully

## Gate thresholds
- Error rate: Rust <= TS + 0.5%
- p95 latency: Rust <= TS + 20%
- Output parity: >= 99%
- Write integrity: no duplicates, no missing writes

## Rollout levels
1. 10% traffic / selected commands
2. 50% after 30-60 min stable window
3. 100% only after full gate pass

## Stop conditions
- Any sustained gate breach > 5 min
- Data integrity anomaly
- Bot output regression

## Action on breach
1. Flip runtime to `ts`
2. Restart service
3. Run smoke scripts
4. Capture incident notes
