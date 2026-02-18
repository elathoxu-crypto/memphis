/**
 * Memphis TUI - UI Components
 * Factory functions for creating blessed UI elements
 * Nawal E Theme 🦅
 */
import blessed from "blessed";
import { LAYOUT } from "./constants.js";
/**
 * Create a standard box element
 */
export function createBox(options) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return blessed.box(options);
}
/**
 * Create the header box - Nawal E Style 🦅
 */
export function createHeaderBox(screen) {
    return createBox({
        parent: screen,
        top: 0,
        left: 0,
        width: "100%",
        height: LAYOUT.HEADER_HEIGHT,
        style: {
            fg: "black",
            bg: "yellow",
            bold: true,
        },
        border: undefined,
        content: `{center}{bold}{black}🦅 MEMPHIS 🦅{/black}{/bold}{/center}\n{center}{black}Przewodnik i Katalizator{/black}{/center}`,
    });
}
/**
 * Create the sidebar box
 */
export function createSidebarBox(screen, content = "") {
    return createBox({
        parent: screen,
        top: LAYOUT.HEADER_HEIGHT,
        left: 0,
        width: LAYOUT.SIDEBAR_WIDTH,
        height: LAYOUT.SIDEBAR_HEIGHT,
        style: {
            fg: "white",
            bg: "black",
            border: { fg: "yellow", type: "line" },
        },
        tags: true,
        content,
    });
}
/**
 * Create the content box
 */
export function createContentBox(screen, content = "") {
    return createBox({
        parent: screen,
        top: LAYOUT.HEADER_HEIGHT,
        left: LAYOUT.SIDEBAR_WIDTH,
        width: LAYOUT.CONTENT_WIDTH,
        height: LAYOUT.SIDEBAR_HEIGHT,
        style: {
            fg: "white",
            bg: "black",
            border: { fg: "cyan", type: "line" },
        },
        tags: true,
        scrollable: true,
        content,
    });
}
/**
 * Create the input box (hidden by default)
 */
export function createInputBox(screen) {
    return createBox({
        parent: screen,
        top: "100%",
        left: 0,
        width: "100%",
        height: LAYOUT.INPUT_HEIGHT,
        style: {
            fg: "white",
            bg: "black",
            border: { fg: "magenta", type: "line" },
        },
        visible: false,
    });
}
/**
 * Create the input field
 */
export function createInputField(parent) {
    return blessed.textbox({
        parent,
        top: 0,
        left: 1,
        width: "98%",
        height: 1,
        style: {
            fg: "yellow",
            bg: "black",
            bold: true,
        },
        placeholder: "Wpisz coś...",
    });
}
/**
 * Create the status bar
 */
export function createStatusBar(screen, content = "") {
    return createBox({
        parent: screen,
        top: "100%",
        left: 0,
        width: "100%",
        height: LAYOUT.STATUS_BAR_HEIGHT,
        style: {
            fg: "black",
            bg: "yellow",
            bold: true,
        },
        border: undefined,
        content,
    });
}
/**
 * Create the main screen
 */
export function createScreen() {
    return blessed.screen({
        smartCSR: true,
        title: "🦅 Memphis - AI Brain",
        fullUnicode: true,
        terminal: "xterm-256color",
    });
}
/**
 * Apply key bindings to screen
 */
export function applyKeyBindings(screen, handlers) {
    // Quit bindings
    screen.key(["escape", "q", "C-c"], () => {
        handlers.onQuit?.();
    });
    // Arrow key navigation
    screen.key(["up", "down"], (ch, key) => {
        handlers.onNavigation?.(key.name);
    });
    // Enter key
    screen.key(["enter"], () => {
        handlers.onEnter?.();
    });
    // Number keys
    screen.key(["1", "2", "3", "4", "5", "6", "7", "8", "9"], (ch) => {
        handlers.onNumber?.(parseInt(ch));
    });
    // Character keys
    screen.key(["c", "j", "k", "o"], (ch) => {
        handlers.onChar?.(ch);
    });
}
/**
 * Update box content safely
 */
export function setBoxContent(box, content) {
    box.setContent(content);
}
/**
 * Show/hide input box
 */
export function setInputBoxVisible(box, visible) {
    if (visible) {
        box.show();
    }
    else {
        box.hide();
    }
}
/**
 * Focus input field
 */
export function focusInput(field) {
    field.focus();
}
/**
 * Read input with callback
 */
export function readInput(field, callback) {
    // Using any to bypass strict type checking for blessed's callback
    field.readInput(callback);
}
/**
 * Set input placeholder
 */
export function setInputPlaceholder(field, placeholder) {
    field.options.placeholder = placeholder;
}
/**
 * Clear input value
 */
export function clearInput(field) {
    field.setValue("");
}
/**
 * Render screen
 */
export function renderScreen(screen) {
    screen.render();
}
//# sourceMappingURL=components.js.map