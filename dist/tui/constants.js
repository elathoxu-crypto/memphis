/**
 * Memphis TUI - Constants
 * All magic numbers extracted to named constants
 */
// Layout constants
export const LAYOUT = {
    HEADER_HEIGHT: 3,
    SIDEBAR_WIDTH: "25%",
    CONTENT_WIDTH: "75%",
    INPUT_HEIGHT: 3,
    STATUS_BAR_HEIGHT: 1,
    SIDEBAR_HEIGHT: "90%",
};
// Box dimensions
export const BOX = {
    WIDTH: 60,
    LINE_CHAR: "─",
    CORNER_TL: "╔",
    CORNER_TR: "╗",
    CORNER_BL: "╚",
    CORNER_BR: "╝",
    VERTICAL: "║",
    HORIZONTAL: "═",
    T_LEFT: "╠",
    T_RIGHT: "╣",
    T_DOWN: "╦",
    T_UP: "╩",
};
// Timing
export const TIMING = {
    INPUT_DELAY_MS: 100,
    CACHE_TIMEOUT_MS: 60000,
    CONNECTIVITY_TIMEOUT_MS: 3000,
};
// Content limits
export const LIMITS = {
    CONTENT_PREVIEW_SHORT: 50,
    CONTENT_PREVIEW_MEDIUM: 60,
    CONTENT_PREVIEW_LONG: 80,
    CONTENT_PREVIEW_EXTRA_LONG: 100,
    RECENT_BLOCKS: 3,
    MAX_LOG_ENTRIES: 20,
    SEARCH_RESULTS_LIMIT: 5,
    HASH_PREVIEW_LENGTH: 30,
};
// Menu indices
export const MENU = {
    DASHBOARD: 1,
    JOURNAL: 2,
    VAULT: 3,
    RECALL: 4,
    ASK: 5,
    OPENCLAW: 6,
    CLINE: 7,
    OFFLINE: 8,
    SETTINGS: 9,
};
// Color palette
export const COLORS = {
    primary: "cyan",
    secondary: "magenta",
    success: "green",
    warning: "yellow",
    error: "red",
    text: "white",
    muted: "gray",
    bg: "black",
    highlight: "blue",
    accent: "bright cyan",
};
// Chain types
export const CHAIN_TYPES = {
    JOURNAL: "journal",
    BUILD: "build",
    ADR: "adr",
    OPS: "ops",
    VAULT: "vault",
    CREDENTIAL: "credential",
};
// Block types (from SOUL.md)
export const BLOCK_TYPES = [
    "journal",
    "build",
    "adr",
    "ops",
    "ask",
    "system",
    "vault",
    "credential",
];
// Navigation menu items
export const NAV_ITEMS = [
    { index: MENU.DASHBOARD, key: "dashboard", label: "Dashboard", shortcut: "1" },
    { index: MENU.JOURNAL, key: "journal", label: "Journal", shortcut: "2" },
    { index: MENU.VAULT, key: "vault", label: "Vault", shortcut: "3" },
    { index: MENU.RECALL, key: "recall", label: "Recall", shortcut: "4" },
    { index: MENU.ASK, key: "ask", label: "Ask", shortcut: "5" },
    { index: MENU.OPENCLAW, key: "openclaw", label: "OpenClaw", shortcut: "6" },
    { index: MENU.CLINE, key: "cline", label: "Cline", shortcut: "c" },
    { index: MENU.OFFLINE, key: "offline", label: "Offline", shortcut: "o" },
    { index: MENU.SETTINGS, key: "settings", label: "Settings", shortcut: "9" },
];
// Default models (for offline mode)
export const DEFAULT_MODELS = {
    PRIMARY: "llama3.2:1b",
    FALLBACK: ["llama3.2:3b", "gemma3:4b"],
};
// Status messages
export const STATUS_MESSAGES = {
    QUIT_HINT: "Press 'q' to quit | Arrow keys to navigate | Enter to select",
    PRESS_ANY_KEY: "Press any key to continue...",
    THINKING: "Thinking...",
    NO_RESULTS: "No results found.",
    NO_CHAINS: "No memory chains yet. Start by adding a journal entry!",
    NO_LLM: "No LLM provider configured. Please set up Ollama or OpenAI.",
};
// Error messages
export const ERRORS = {
    EMPTY_INPUT: "Input cannot be empty",
    INVALID_MODEL: "Invalid model name",
    ENCRYPTION_FAILED: "Failed to encrypt secret",
    DECRYPTION_FAILED: "Failed to decrypt secret",
    PROVIDER_NOT_CONFIGURED: "Provider not configured",
    CHAIN_NOT_FOUND: "Chain not found",
    BLOCK_ADD_FAILED: "Failed to add block",
};
//# sourceMappingURL=constants.js.map