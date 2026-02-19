/**
 * Memphis TUI – OpenClaw Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
import type { OpenClawBridge } from "../../bridges/openclaw.js";
export declare function renderOpenClaw(bridge: OpenClawBridge): string;
export declare function setupOpenClawInput(store: Store, bridge: OpenClawBridge, widgets: TUIWidgets, onDone: () => void): void;
