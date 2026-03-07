# Skills Knowledge Harvest (2026-03-07)

## Goal
Capture useful operational and product knowledge from legacy/overlapping skills **before** hiding/deprecating packages on ClawHub.

## Skills reviewed
- memphis-cognitive (meta package)
- .memphis-cognitive.hidden
- .memphis-brain.hidden
- .memphis-super.hidden
- canva + canva-connect overlap (flagged for later cleanup)

## Retain (high value)

### 1) memphis-brain patterns
- Journal-first workflow for durable memory.
- Decision recording with explicit rationale and options.
- Recall/ask pattern with `--top` and semantic context.
- Reflection and graph workflows as advanced memory maintenance.
- Strong tag taxonomy (`identity`, `preferences`, `decision`, `session`, `learning`, `project:*`, `share`).

### 2) memphis-cognitive (meta) guidance
- Keep explicit note that skill is docs/meta package and requires Memphis CLI.
- Keep 3-model framing (conscious/manual, detected/automatic, predictive) as educational architecture.
- Keep quick-start sequences for onboarding users in <5 min.

### 3) memphis-super automation ideas
- Auto-detection of message intent:
  - questions -> ask
  - decisions -> decide
  - insights -> journal
  - session markers -> summary
- Multi-provider routing concept + local-first preference.
- Operational emphasis on full-chain support and consistency.

## What to merge into canonical docs
- Merge all retained items into:
  - `docs/README.md` (entrypoint)
  - `docs/TELEGRAM_BOT_OPERATIONS.md` (ops)
  - future: `docs/MEMORY-WORKFLOWS.md` (journal/decide/ask/reflect/tag taxonomy)

## Hide/deprecate candidates (after merge verification)
- Duplicate/legacy hidden Memphis skills:
  - `.memphis-brain.hidden`
  - `.memphis-super.hidden`
  - `.memphis-cognitive.hidden`
- Keep one canonical public package strategy:
  - either `memphis-cognitive` as docs umbrella
  - or move to single `memphis` canonical skill with explicit migration note

## ClawHub cleanup policy
1. Export/merge knowledge first (this file + canonical docs updates).
2. Publish docs update.
3. Hide deprecated/duplicate skills on ClawHub.
4. Add migration notes and replacement slug(s).

## Notes
- ClawHub auth verified (`clawhub whoami` OK: Memphis-Chains).
- Current installed overlap includes both `canva` and `canva-connect`.
