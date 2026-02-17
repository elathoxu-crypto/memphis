/**
 * Memphis TUI - Constants
 * All magic numbers extracted to named constants
 */
export declare const LAYOUT: {
    readonly HEADER_HEIGHT: 3;
    readonly SIDEBAR_WIDTH: "25%";
    readonly CONTENT_WIDTH: "75%";
    readonly INPUT_HEIGHT: 3;
    readonly STATUS_BAR_HEIGHT: 1;
    readonly SIDEBAR_HEIGHT: "90%";
};
export declare const BOX: {
    readonly WIDTH: 60;
    readonly LINE_CHAR: "─";
    readonly CORNER_TL: "╔";
    readonly CORNER_TR: "╗";
    readonly CORNER_BL: "╚";
    readonly CORNER_BR: "╝";
    readonly VERTICAL: "║";
    readonly HORIZONTAL: "═";
    readonly T_LEFT: "╠";
    readonly T_RIGHT: "╣";
    readonly T_DOWN: "╦";
    readonly T_UP: "╩";
};
export declare const TIMING: {
    readonly INPUT_DELAY_MS: 100;
    readonly CACHE_TIMEOUT_MS: 60000;
    readonly CONNECTIVITY_TIMEOUT_MS: 3000;
};
export declare const LIMITS: {
    readonly CONTENT_PREVIEW_SHORT: 50;
    readonly CONTENT_PREVIEW_MEDIUM: 60;
    readonly CONTENT_PREVIEW_LONG: 80;
    readonly CONTENT_PREVIEW_EXTRA_LONG: 100;
    readonly RECENT_BLOCKS: 3;
    readonly MAX_LOG_ENTRIES: 20;
    readonly SEARCH_RESULTS_LIMIT: 5;
    readonly HASH_PREVIEW_LENGTH: 30;
};
export declare const MENU: {
    readonly DASHBOARD: 1;
    readonly JOURNAL: 2;
    readonly VAULT: 3;
    readonly RECALL: 4;
    readonly ASK: 5;
    readonly OPENCLAW: 6;
    readonly CLINE: 7;
    readonly OFFLINE: 8;
    readonly SETTINGS: 9;
};
export declare const COLORS: {
    readonly primary: "cyan";
    readonly secondary: "magenta";
    readonly success: "green";
    readonly warning: "yellow";
    readonly error: "red";
    readonly text: "white";
    readonly muted: "gray";
    readonly bg: "black";
    readonly highlight: "blue";
    readonly accent: "bright cyan";
};
export declare const CHAIN_TYPES: {
    readonly JOURNAL: "journal";
    readonly BUILD: "build";
    readonly ADR: "adr";
    readonly OPS: "ops";
    readonly VAULT: "vault";
    readonly CREDENTIAL: "credential";
};
export declare const BLOCK_TYPES: readonly ["journal", "build", "adr", "ops", "ask", "system", "vault", "credential"];
export declare const NAV_ITEMS: readonly [{
    readonly index: 1;
    readonly key: "dashboard";
    readonly label: "Dashboard";
    readonly shortcut: "1";
}, {
    readonly index: 2;
    readonly key: "journal";
    readonly label: "Journal";
    readonly shortcut: "2";
}, {
    readonly index: 3;
    readonly key: "vault";
    readonly label: "Vault";
    readonly shortcut: "3";
}, {
    readonly index: 4;
    readonly key: "recall";
    readonly label: "Recall";
    readonly shortcut: "4";
}, {
    readonly index: 5;
    readonly key: "ask";
    readonly label: "Ask";
    readonly shortcut: "5";
}, {
    readonly index: 6;
    readonly key: "openclaw";
    readonly label: "OpenClaw";
    readonly shortcut: "6";
}, {
    readonly index: 7;
    readonly key: "cline";
    readonly label: "Cline";
    readonly shortcut: "c";
}, {
    readonly index: 8;
    readonly key: "offline";
    readonly label: "Offline";
    readonly shortcut: "o";
}, {
    readonly index: 9;
    readonly key: "settings";
    readonly label: "Settings";
    readonly shortcut: "9";
}];
export declare const DEFAULT_MODELS: {
    readonly PRIMARY: "llama3.2:1b";
    readonly FALLBACK: string[];
};
export declare const STATUS_MESSAGES: {
    readonly QUIT_HINT: "Press 'q' to quit | Arrow keys to navigate | Enter to select";
    readonly PRESS_ANY_KEY: "Press any key to continue...";
    readonly THINKING: "Thinking...";
    readonly NO_RESULTS: "No results found.";
    readonly NO_CHAINS: "No memory chains yet. Start by adding a journal entry!";
    readonly NO_LLM: "No LLM provider configured. Please set up Ollama or OpenAI.";
};
export declare const ERRORS: {
    readonly EMPTY_INPUT: "Input cannot be empty";
    readonly INVALID_MODEL: "Invalid model name";
    readonly ENCRYPTION_FAILED: "Failed to encrypt secret";
    readonly DECRYPTION_FAILED: "Failed to decrypt secret";
    readonly PROVIDER_NOT_CONFIGURED: "Provider not configured";
    readonly CHAIN_NOT_FOUND: "Chain not found";
    readonly BLOCK_ADD_FAILED: "Failed to add block";
};
