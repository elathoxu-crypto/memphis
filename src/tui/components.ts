/**
 * Memphis TUI - UI Components
 * Factory functions for creating blessed UI elements
 */

import blessed from "blessed";
import { COLORS, LAYOUT } from "./constants.js";

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
export function createBox(options: BoxOptions): blessed.Widgets.BoxElement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return blessed.box(options as any);
}

/**
 * Create the header box
 */
export function createHeaderBox(): blessed.Widgets.BoxElement {
  return createBox({
    top: 0,
    left: 0,
    width: "100%",
    height: LAYOUT.HEADER_HEIGHT,
    style: {
      fg: COLORS.text,
      bg: COLORS.primary,
      bold: true,
    },
    border: undefined,
    content: `{center}{bold} Memphis - Local-first AI Brain{/bold}{/center}`,
  });
}

/**
 * Create the sidebar box
 */
export function createSidebarBox(content: string = ""): blessed.Widgets.BoxElement {
  return createBox({
    top: LAYOUT.HEADER_HEIGHT,
    left: 0,
    width: LAYOUT.SIDEBAR_WIDTH,
    height: LAYOUT.SIDEBAR_HEIGHT,
    style: {
      fg: COLORS.text,
      bg: COLORS.bg,
      border: { fg: COLORS.primary },
    },
    tags: true,
    content,
  });
}

/**
 * Create the content box
 */
export function createContentBox(content: string = ""): blessed.Widgets.BoxElement {
  return createBox({
    top: LAYOUT.HEADER_HEIGHT,
    left: LAYOUT.SIDEBAR_WIDTH,
    width: LAYOUT.CONTENT_WIDTH,
    height: LAYOUT.SIDEBAR_HEIGHT,
    style: {
      fg: COLORS.text,
      bg: COLORS.bg,
      border: { fg: COLORS.primary },
    },
    tags: true,
    scrollable: true,
    content,
  });
}

/**
 * Create the input box (hidden by default)
 */
export function createInputBox(): blessed.Widgets.BoxElement {
  return createBox({
    top: "100%",
    left: 0,
    width: "100%",
    height: LAYOUT.INPUT_HEIGHT,
    style: {
      fg: COLORS.text,
      bg: COLORS.bg,
      border: { fg: COLORS.secondary },
    },
  });
}

/**
 * Create the input field
 */
export function createInputField(parent: blessed.Widgets.BoxElement): blessed.Widgets.TextboxElement {
  return blessed.textbox({
    parent,
    top: 0,
    left: 1,
    width: "98%",
    height: 1,
    style: {
      fg: COLORS.text,
      bg: COLORS.bg,
    },
    placeholder: "Type your input...",
  });
}

/**
 * Create the status bar
 */
export function createStatusBar(content: string = ""): blessed.Widgets.BoxElement {
  return createBox({
    top: "100%",
    left: 0,
    width: "100%",
    height: LAYOUT.STATUS_BAR_HEIGHT,
    style: {
      fg: COLORS.text,
      bg: COLORS.secondary,
    },
    border: undefined,
    content,
  });
}

/**
 * Create the main screen
 */
export function createScreen(): blessed.Widgets.Screen {
  return blessed.screen({
    smartCSR: true,
    title: "Memphis - AI Brain",
    fullUnicode: true,
  });
}

/**
 * Apply key bindings to screen
 */
export function applyKeyBindings(
  screen: blessed.Widgets.Screen,
  handlers: {
    onQuit?: () => void;
    onNavigation?: (direction: "up" | "down") => void;
    onEnter?: () => void;
    onNumber?: (num: number) => void;
    onChar?: (char: string) => void;
  }
): void {
  // Quit bindings
  screen.key(["escape", "q", "C-c"], () => {
    handlers.onQuit?.();
  });

  // Arrow key navigation
  screen.key(["up", "down"], (ch: string, key: { name: string }) => {
    handlers.onNavigation?.(key.name as "up" | "down");
  });

  // Enter key
  screen.key(["enter"], () => {
    handlers.onEnter?.();
  });

  // Number keys
  screen.key(["1", "2", "3", "4", "5", "6", "7", "8", "9"], (ch: string) => {
    handlers.onNumber?.(parseInt(ch));
  });

  // Character keys
  screen.key(["c", "j", "k", "o"], (ch: string) => {
    handlers.onChar?.(ch);
  });
}

/**
 * Update box content safely
 */
export function setBoxContent(box: blessed.Widgets.BoxElement, content: string): void {
  box.setContent(content);
}

/**
 * Show/hide input box
 */
export function setInputBoxVisible(box: blessed.Widgets.BoxElement, visible: boolean): void {
  if (visible) {
    box.show();
  } else {
    box.hide();
  }
}

/**
 * Focus input field
 */
export function focusInput(field: blessed.Widgets.TextboxElement): void {
  field.focus();
}

/**
 * Read input with callback
 */
export function readInput(
  field: blessed.Widgets.TextboxElement,
  callback: (err: unknown, value?: string) => void
): void {
  // Using any to bypass strict type checking for blessed's callback
  (field as any).readInput(callback);
}

/**
 * Set input placeholder
 */
export function setInputPlaceholder(field: blessed.Widgets.TextboxElement, placeholder: string): void {
  (field.options as any).placeholder = placeholder;
}

/**
 * Clear input value
 */
export function clearInput(field: blessed.Widgets.TextboxElement): void {
  field.setValue("");
}

/**
 * Render screen
 */
export function renderScreen(screen: blessed.Widgets.Screen): void {
  screen.render();
}
