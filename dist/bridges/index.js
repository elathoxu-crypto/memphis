/**
 * Memphis Bridges - Integration points for external tools
 *
 * This module exposes Memphis memory to external AI tools like Cline.
 *
 * Available bridges:
 * - cline.ts: Direct programmatic access + CLI
 * - openclaw.ts: Agent collaboration (53% compute share)
 *
 * Future bridges:
 * - vscode.ts: VS Code extension
 * - git.ts: Git hook integration
 */
export { MemphisBridge } from "./cline.js";
export { OpenClawBridge, runOpenClawCommands } from "./openclaw.js";
//# sourceMappingURL=index.js.map