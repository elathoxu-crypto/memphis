/**
 * TUI Theme System
 *
 * Supports dark and light themes for better accessibility
 */

export type ThemeName = "dark" | "light";

export interface Theme {
  name: ThemeName;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  background: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    name: "dark",
    primary: "cyan",
    secondary: "magenta",
    accent: "yellow",
    text: "white",
    textMuted: "gray",
    background: "black",
    border: "cyan",
    success: "green",
    warning: "yellow",
    error: "red",
    info: "blue",
  },

  light: {
    name: "light",
    primary: "blue",
    secondary: "magenta",
    accent: "cyan",
    text: "black",
    textMuted: "gray",
    background: "white",
    border: "blue",
    success: "green",
    warning: "yellow",
    error: "red",
    info: "blue",
  },
};

/**
 * Get theme by name
 */
export function getTheme(name: ThemeName = "dark"): Theme {
  return THEMES[name];
}

/**
 * Detect terminal background color (heuristic)
 */
export function detectTerminalTheme(): ThemeName {
  // Check common environment variables
  const term = process.env.TERM_PROGRAM || "";
  const colorScheme = process.env.COLOR_SCHEME || "";

  // Known dark terminals
  const darkTerminals = [
    "iTerm.app",
    "Terminal.app",
    "Alacritty",
    "kitty",
    "gnome-terminal",
  ];

  if (darkTerminals.includes(term)) {
    return "dark";
  }

  if (colorScheme.toLowerCase().includes("light")) {
    return "light";
  }

  // Default to dark (safer for most terminals)
  return "dark";
}

/**
 * Apply theme to blessed screen
 */
export function applyTheme(
  theme: Theme,
  elements: {
    header?: any;
    sidebar?: any;
    content?: any;
    statusBar?: any;
  }
): void {
  if (elements.header) {
    elements.header.style.fg = theme.text;
    elements.header.style.bg = theme.primary;
  }

  if (elements.sidebar) {
    elements.sidebar.style.fg = theme.text;
    elements.sidebar.style.bg = theme.background;
    elements.sidebar.style.border.fg = theme.border;
  }

  if (elements.content) {
    elements.content.style.fg = theme.text;
    elements.content.style.bg = theme.background;
    elements.content.style.border.fg = theme.border;
  }

  if (elements.statusBar) {
    elements.statusBar.style.fg = theme.text;
    elements.statusBar.style.bg = theme.secondary;
  }
}
