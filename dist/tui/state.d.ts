/**
 * Memphis TUI – Global State
 * Centralised store for all mutable UI state.
 * Screens read and write here; no cross-screen imports needed.
 */
export type ScreenName = "dashboard" | "journal" | "vault" | "recall" | "ask" | "decisions" | "summary" | "openclaw" | "cline" | "offline" | "settings";
export declare const SCREEN_NAMES: ScreenName[];
/** Maps 1-9 keyboard digit to ScreenName */
export declare const KEY_TO_SCREEN: Record<string, ScreenName>;
/** Maps ScreenName to sidebar label */
export declare const SCREEN_LABELS: Record<ScreenName, string>;
export interface TUIState {
    currentScreen: ScreenName;
    inputMode: string;
    /** LLM provider name shown in UI */
    llmProviderName: string;
    /** Is the app in offline mode? */
    offlineMode: boolean;
    /** Currently selected Ollama model (overridable at runtime) */
    selectedModel: string;
}
export declare function createInitialState(): TUIState;
