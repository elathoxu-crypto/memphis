/**
 * Memphis TUI – Offline Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
import type { TUIState } from "../state.js";
export declare function renderOffline(store: Store, state: TUIState): string;
export declare function setupOfflineInput(store: Store, widgets: TUIWidgets, state: TUIState, navigate: (n: number) => void, onDone: () => void): void;
