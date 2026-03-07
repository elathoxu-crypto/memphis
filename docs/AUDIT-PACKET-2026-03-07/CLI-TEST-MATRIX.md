# CLI Test Matrix (session snapshot)

## Passed / expected operational
- `memphis watch` → starts watcher and stops cleanly
- `memphis plan` → generates planning output (post-fix: no `undefined` lines)
- `memphis trade` → usage/help path OK
- `memphis collective` → usage/help path OK
- `memphis git` → usage/help path OK
- `memphis log INFO "..." --source memphis-cli` → writes log entry

## Expected argument-required responses (not failures)
- `memphis ingest` → requires `<path>`
- `memphis revise` → requires `<decisionId>`
- `memphis reinforce` → requires `<decisionId>`
- `memphis decide-fast` → requires `<title>`
- `memphis log` → requires `<level>`

## Corrected quality issues in this snapshot
- empty ask input handling
- status-intent synthesis quality
- decision false-positive reduction for generic ask content
- planner decision field mapping (`undefined` cleanup)
