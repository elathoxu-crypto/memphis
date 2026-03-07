# ClawHub Manual Cleanup Checklist

Use this checklist when running cleanup with account that has moderator/admin permissions.

## Targets
- Legacy/overlap skills to hide/deprecate (example: `memphis-super`).

## Steps
1. Confirm canonical replacement package/documentation is published.
2. Add migration note in old skill description:
   - "Deprecated. Use canonical Memphis docs/workflow (v3.8.x)."
3. Hide/deprecate old skill in ClawHub panel.
4. Verify search results prioritize canonical package.
5. Re-run install smoke from clean workspace.

## Suggested migration note
"This skill is deprecated. Please use the canonical Memphis package/docs (v3.8.x) with source/npm install guidance and MEMORY-WORKFLOWS canonical flow."
