/**
 * Memphis TUI – Journal Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
export declare function renderJournalStatic(): string;
export declare function setupJournalInput(store: Store, widgets: TUIWidgets, onDone: () => void): void;
