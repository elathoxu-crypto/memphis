/**
 * Memphis CLI - Constants
 * All magic numbers and strings extracted to named constants
 */

// CLI metadata
export const CLI = {
  NAME: "memphis",
  DESCRIPTION: "Local-first AI brain with persistent memory",
  VERSION: "0.1.0",
} as const;

// TUI settings
export const TUI = {
  NAVIGATION_DELAY_MS: 500,
  SCREEN_MAP: {
    dashboard: 1,
    journal: 2,
    vault: 3,
    recall: 4,
    ask: 5,
    openclaw: 6,
    cline: 7,
    offline: 8,
    settings: 9,
  } as Record<string, number>,
} as const;

// Error messages
export const CLI_ERRORS = {
  INVALID_ACTION: "Invalid action. Run 'memphis --help' for usage.",
  COMMAND_FAILED: "Command failed with error:",
  UNKNOWN_ERROR: "An unexpected error occurred:",
} as const;

// Success messages
export const CLI_MESSAGES = {
  INITIALIZED: "Memphis initialized successfully!",
  RUNNING: "Memphis is running. Press Ctrl+C to exit.",
} as const;

// Command action constants
export const VAULT_ACTIONS = {
  INIT: "init",
  ADD: "add",
  LIST: "list",
  GET: "get",
  DELETE: "delete",
} as const;

export const AGENT_ACTIONS = {
  START: "start",
  STOP: "stop",
  STATUS: "status",
  OPENCLAW: "openclaw",
  COLLAB: "collab",
} as const;

// Validation patterns
export const VALID_SCREENS = [
  "dashboard",
  "journal",
  "vault",
  "recall",
  "ask",
  "openclaw",
  "cline",
  "offline",
  "settings",
] as const;
