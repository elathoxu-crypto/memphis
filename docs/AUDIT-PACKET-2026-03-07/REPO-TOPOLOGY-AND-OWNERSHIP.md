# Repo Topology & Ownership

## Canonical mapping

### 1) memphis (canonical runtime)
- URL: https://github.com/elathoxu-crypto/memphis
- Purpose: primary product/runtime (CLI, memory chains, integrations, ops scripts, docs)
- Audit stance: **source of truth** for current runtime behavior and operational hardening

### 2) memphis-chain-core (adjacent core track)
- URL: https://github.com/elathoxu-crypto/memphis-chain-core
- Purpose: core chain/storage engine evolution track
- Audit stance: assess as adjacent core component, validate interface/contract with `memphis`

### 3) Memphis_Ai_Brain_On_Chain (umbrella/orchestration)
- URL: https://github.com/elathoxu-crypto/Memphis_Ai_Brain_On_Chain
- Purpose: ecosystem orchestration/integration scripts and workflow-level assets
- Audit stance: control-plane/supporting repo

### 4) memphis-cli (legacy thin split)
- URL: https://github.com/elathoxu-crypto/memphis-cli
- Purpose: historical CLI split; limited recent activity
- Audit stance: classify as legacy/supporting unless reactivated

## Ownership note
For functional correctness of production behavior, prioritize evidence from `memphis` first, then cross-check adjacent repos where relevant.
