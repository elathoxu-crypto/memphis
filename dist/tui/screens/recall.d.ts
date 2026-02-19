/**
 * Memphis TUI – Recall Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
export declare function renderRecallStatic(): string;
export declare function setupRecallInput(store: Store, widgets: TUIWidgets, onDone: () => void): void;
