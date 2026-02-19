/**
 * Memphis TUI – Ask Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
export declare function renderAskStatic(llmProviderName: string): string;
export declare function setupAskInput(store: Store, widgets: TUIWidgets, llmProvider: any, llmProviderName: string, selectedModel: string, onDone: () => void): void;
