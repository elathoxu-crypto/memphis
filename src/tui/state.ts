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
  | "openclaw"
  | "cline"
  | "offline"
  | "settings";

export const SCREEN_NAMES: ScreenName[] = [
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

/** Maps keyboard keys to ScreenName */
export const KEY_TO_SCREEN: Record<string, ScreenName> = {
  "1": "dashboard",
  "2": "journal",
  "3": "vault",
  "4": "recall",
  "5": "ask",
  "-": "decisions",
  "0": "summary",
  "6": "openclaw",
  "7": "cline",
  "8": "offline",
  "9": "settings",
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
  openclaw:  " OpenClaw",
  cline:     " Cline",
  offline:   " Offline",
  settings:  " Settings",
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
