/**
 * Memphis TUI - UI Components
 * Factory functions for creating blessed UI elements
 */
import blessed from "blessed";
/**
 * Box element options
 */
export interface BoxOptions {
    top?: number | string;
    left?: number | string;
    width?: number | string;
    height?: number | string;
    style?: Record<string, unknown>;
    tags?: boolean;
    scrollable?: boolean;
    border?: unknown;
    content?: string;
}
/**
 * Create a standard box element
 */
export declare function createBox(options: BoxOptions): blessed.Widgets.BoxElement;
/**
 * Create the header box
 */
export declare function createHeaderBox(): blessed.Widgets.BoxElement;
/**
 * Create the sidebar box
 */
export declare function createSidebarBox(content?: string): blessed.Widgets.BoxElement;
/**
 * Create the content box
 */
export declare function createContentBox(content?: string): blessed.Widgets.BoxElement;
/**
 * Create the input box (hidden by default)
 */
export declare function createInputBox(): blessed.Widgets.BoxElement;
/**
 * Create the input field
 */
export declare function createInputField(parent: blessed.Widgets.BoxElement): blessed.Widgets.TextboxElement;
/**
 * Create the status bar
 */
export declare function createStatusBar(content?: string): blessed.Widgets.BoxElement;
/**
 * Create the main screen
 */
export declare function createScreen(): blessed.Widgets.Screen;
/**
 * Apply key bindings to screen
 */
export declare function applyKeyBindings(screen: blessed.Widgets.Screen, handlers: {
    onQuit?: () => void;
    onNavigation?: (direction: "up" | "down") => void;
    onEnter?: () => void;
    onNumber?: (num: number) => void;
    onChar?: (char: string) => void;
}): void;
/**
 * Update box content safely
 */
export declare function setBoxContent(box: blessed.Widgets.BoxElement, content: string): void;
/**
 * Show/hide input box
 */
export declare function setInputBoxVisible(box: blessed.Widgets.BoxElement, visible: boolean): void;
/**
 * Focus input field
 */
export declare function focusInput(field: blessed.Widgets.TextboxElement): void;
/**
 * Read input with callback
 */
export declare function readInput(field: blessed.Widgets.TextboxElement, callback: (err: unknown, value?: string) => void): void;
/**
 * Set input placeholder
 */
export declare function setInputPlaceholder(field: blessed.Widgets.TextboxElement, placeholder: string): void;
/**
 * Clear input value
 */
export declare function clearInput(field: blessed.Widgets.TextboxElement): void;
/**
 * Render screen
 */
export declare function renderScreen(screen: blessed.Widgets.Screen): void;
