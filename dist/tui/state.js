/**
 * Memphis TUI – Global State
 * Centralised store for all mutable UI state.
 * Screens read and write here; no cross-screen imports needed.
 */
export const SCREEN_NAMES = [
    "dashboard",
    "journal",
    "vault",
    "recall",
    "ask",
    "decisions",
    "summary",
    "openclaw",
    "cline",
    "offline",
    "settings",
];
/** Maps 1-9 keyboard digit to ScreenName */
export const KEY_TO_SCREEN = {
    "1": "dashboard",
    "2": "journal",
    "3": "vault",
    "4": "recall",
    "5": "ask",
    "0": "decisions",
    "s": "summary",
    "6": "openclaw",
    "7": "cline",
    "8": "offline",
    "9": "settings",
};
/** Maps ScreenName to sidebar label */
export const SCREEN_LABELS = {
    dashboard: " Dashboard",
    journal: " Journal",
    vault: " Vault",
    recall: " Recall",
    ask: " Ask",
    decisions: " Decisions",
    summary: " Summary",
    openclaw: " OpenClaw",
    cline: " Cline",
    offline: " Offline",
    settings: " Settings",
};
export function createInitialState() {
    return {
        currentScreen: "dashboard",
        inputMode: "",
        llmProviderName: "none",
        offlineMode: false,
        selectedModel: process.env.OLLAMA_MODEL || "llama3.2:1b",
    };
}
//# sourceMappingURL=state.js.map