/**
 * Memphis TUI – Decisions Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
export declare function renderDecisionsStatic(): string;
export declare function setupDecisionsInput(store: Store, widgets: TUIWidgets, onDone: () => void): void;
