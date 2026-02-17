/**
 * Memphis Bridges - Integration points for external tools
 *
 * This module exposes Memphis memory to external AI tools like Cline.
 *
 * Available bridges:
 * - cline.ts: Direct programmatic access + CLI
 *
 * Future bridges:
 * - openclaw.ts: Automation bridge
 * - vscode.ts: VS Code extension
 * - git.ts: Git hook integration
 */
export { MemphisBridge } from "./cline.js";
export type { JournalEntry, RecallResult, StatusResult } from "./cline.js";
