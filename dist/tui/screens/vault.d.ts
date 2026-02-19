/**
 * Memphis TUI – Vault Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
export declare function renderVaultStatic(): string;
export declare function setupVaultInput(store: Store, widgets: TUIWidgets, onDone: () => void): void;
