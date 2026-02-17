# ADR-004: Modular Monorepo Architecture

**Status:** Accepted  
**Date:** 2026-02-17  
**Author:** Memphis Core Team

## Context

Memphis started as a simple CLI tool but is evolving into an ecosystem. We need an architecture that:
- Remains simple for contributors
- Supports future expansion (plugins, providers)
- Enables CI/CD with GitHub Actions
- Publishes to npm / GitHub Packages

## Decision

We will use a **modular monorepo** approach:

```
memphis/
├── src/
│   ├── agents/      # Auto-agents (autosave)
│   ├── bridges/     # External integrations (cline)
│   ├── cli/         # CLI commands
│   ├── config/     # Configuration loading
│   ├── memory/     # Core blockchain (SOUL)
│   ├── providers/  # LLM adapters
│   ├── tui/        # Terminal UI
│   └── utils/      # Crypto, hash, logging
├── docs/
│   └── adr/        # Architecture Decision Records
├── tests/          # Vitest test suite
└── package.json    # Single package (npm publish)
```

## Package Distribution

Single package `@elathoxu-crypto/memphis` published to GitHub Packages:
- CLI entry points: `memphis`, `memphis-tui`
- Modular imports for programmatic use

## Consequences

### Positive
- ✅ **Simple**: One package to install, one repo to clone
- ✅ **Flexible**: Modules can be imported independently
- ✅ **CI/CD**: Simple GitHub Actions workflow
- ✅ **Discoverable**: All code in one place

### Negative
- ⚠️ Scale: May need splitting at >10k LOC
- ⚠️ Pub/Sub: Could benefit from event system later

## Future Considerations

When scaling, consider:
- Splitting into `@memphis/core`, `@memphis/cli`, `@memphis/vault`
- Using workspace (npm/yarn/pnpm)
- Adding MCP server plugin system

## Implementation

See `package.json`, `.github/workflows/`, and directory structure above.

## Related

- ADR-001: Blockchain memory storage
- ADR-002: Vault encryption
- ADR-003: SSI Identity
