# Repository Map (What to Download)

This page answers one question: **which repo should I clone?**

## TL;DR
For almost everyone:

```bash
git clone https://github.com/elathoxu-crypto/memphis.git
```

Start with `memphis` only. It is the canonical onboarding path.

---

## Repo roles

### 1) `memphis` (canonical) ✅
**Use this by default.**

Contains:
- TypeScript CLI
- operational scripts
- production docs
- OpenClaw integration guidance

If you're a new user, this is the only repo you need.

---

### 2) `memphis-chain-core` (optional / advanced) 🧪
Use only if you explicitly need Rust chain-core work.

Contains:
- Rust memory-chain core
- lower-level/core experiments and builds

Not required for standard Memphis CLI onboarding.

---

### 3) Other Memphis-named repos (if visible on GitHub)
Treat as **specialized/legacy/experimental** unless docs explicitly say otherwise.

Rule:
- if docs do not explicitly require them, do **not** clone them for first install.
- `memphis` remains source-of-truth for onboarding.

---

## Install decision tree

1. Need Memphis as a user/operator? -> clone `memphis`
2. Need Rust core development? -> clone `memphis` + `memphis-chain-core`
3. Unsure? -> clone `memphis` only

---

## Verified onboarding path
Use:
- `docs/INSTALL-VERIFIED-PRODUCTION.md`
- `scripts/first-time-user-smoke.sh`

These are the supported "green path" steps for reliable setup.
