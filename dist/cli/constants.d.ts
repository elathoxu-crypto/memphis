/**
 * Memphis CLI - Constants
 * All magic numbers and strings extracted to named constants
 */
export declare const CLI: {
    readonly NAME: "memphis";
    readonly DESCRIPTION: "Local-first AI brain with persistent memory";
    readonly VERSION: "0.1.0";
};
export declare const TUI: {
    readonly NAVIGATION_DELAY_MS: 500;
    readonly SCREEN_MAP: Record<string, number>;
};
export declare const CLI_ERRORS: {
    readonly INVALID_ACTION: "Invalid action. Run 'memphis --help' for usage.";
    readonly COMMAND_FAILED: "Command failed with error:";
    readonly UNKNOWN_ERROR: "An unexpected error occurred:";
};
export declare const CLI_MESSAGES: {
    readonly INITIALIZED: "Memphis initialized successfully!";
    readonly RUNNING: "Memphis is running. Press Ctrl+C to exit.";
};
export declare const VAULT_ACTIONS: {
    readonly INIT: "init";
    readonly ADD: "add";
    readonly LIST: "list";
    readonly GET: "get";
    readonly DELETE: "delete";
};
export declare const AGENT_ACTIONS: {
    readonly START: "start";
    readonly STOP: "stop";
    readonly STATUS: "status";
    readonly OPENCLAW: "openclaw";
    readonly COLLAB: "collab";
};
export declare const VALID_SCREENS: readonly ["dashboard", "journal", "vault", "recall", "ask", "openclaw", "cline", "offline", "settings"];
