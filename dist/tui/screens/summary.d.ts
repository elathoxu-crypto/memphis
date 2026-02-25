/**
 * Memphis TUI – Summary Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
export declare function renderSummaryStatic(): string;
export declare function setupSummaryInput(store: Store, widgets: TUIWidgets, onDone: () => void): void;
