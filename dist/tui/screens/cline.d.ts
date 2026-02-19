/**
 * Memphis TUI – Cline Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
export declare function renderCline(store: Store): string;
export declare function setupClineInput(store: Store, widgets: TUIWidgets, onDone: () => void): void;
