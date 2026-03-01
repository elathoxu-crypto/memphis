/**
 * Memphis TUI – Global State
 * Centralised store for all mutable UI state.
 * Screens read and write here; no cross-screen imports needed.
 */

export type ScreenName =
  | "dashboard"
  | "journal"
  | "vault"
  | "recall"
  | "ask"
  | "decisions"
  | "summary"
  | "network"
  | "intelligence";

export const SCREEN_NAMES: ScreenName[] = [
  "dashboard",
  "journal",
  "vault",
  "recall",
  "ask",
  "decisions",
  "summary",
  "network",
  "intelligence",
];

/** Maps keyboard keys to ScreenName */
export const KEY_TO_SCREEN: Record<string, ScreenName> = {
  "1": "dashboard",
  "2": "journal",
  "3": "vault",
  "4": "recall",
  "5": "ask",
  "6": "decisions",
  "7": "summary",
  "8": "network",
  "9": "intelligence",
};

/** Maps ScreenName to sidebar label */
export const SCREEN_LABELS: Record<ScreenName, string> = {
  dashboard: " Dashboard",
  journal:   " Journal",
  vault:     " Vault",
  recall:    " Recall",
  ask:       " Ask",
  decisions: " Decisions",
  summary:   " Summary",
  network:   " Network",
  intelligence: " Intelligence",
};

export type GuardedMode = "locked" | "armed" | "open";

export interface TUIState {
  currentScreen: ScreenName;
  inputMode: string;
  /** LLM provider name shown in UI */
  llmProviderName: string;
  /** Is the app in offline mode? */
  offlineMode: boolean;
  /** Currently selected Ollama model (overridable at runtime) */
  selectedModel: string;
  /** Current operating role */
  activeRole: "operator" | "ingester" | "advisor";
  /** ISO timestamp of last sync */
  lastSync?: string;
  /** ISO timestamp of last backup */
  lastBackup?: string;
  /** USB status descriptor */
  usbStatus: string;
  /** Current guarded terminal state */
  guardedMode: GuardedMode;
}

export function createInitialState(): TUIState {
  return {
    currentScreen: "dashboard",
    inputMode: "",
    llmProviderName: "none",
    offlineMode: false,
    selectedModel: process.env.OLLAMA_MODEL || "llama3.2:1b",
    activeRole: "operator",
    lastSync: undefined,
    lastBackup: undefined,
    usbStatus: "unknown",
    guardedMode: "locked",
  };
}
