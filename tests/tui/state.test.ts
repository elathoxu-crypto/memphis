import { describe, it, expect } from "vitest";
import {
  createInitialState,
  KEY_TO_SCREEN,
  SCREEN_NAMES,
  SCREEN_LABELS,
} from "../../src/tui/state.js";

describe("createInitialState", () => {
  it("starts on dashboard", () => {
    const s = createInitialState();
    expect(s.currentScreen).toBe("dashboard");
  });

  it("starts with no inputMode", () => {
    const s = createInitialState();
    expect(s.inputMode).toBe("");
  });

  it("starts with llmProviderName = none", () => {
    const s = createInitialState();
    expect(s.llmProviderName).toBe("none");
  });

  it("starts with offlineMode = false", () => {
    const s = createInitialState();
    expect(s.offlineMode).toBe(false);
  });
});

describe("KEY_TO_SCREEN", () => {
  it("maps '1' to dashboard", () => {
    expect(KEY_TO_SCREEN["1"]).toBe("dashboard");
  });

  it("maps '9' to settings", () => {
    expect(KEY_TO_SCREEN["9"]).toBe("settings");
  });

  it("has exactly 13 entries", () => {
    expect(Object.keys(KEY_TO_SCREEN)).toHaveLength(13);
  });

  it("all values are valid ScreenNames", () => {
    for (const val of Object.values(KEY_TO_SCREEN)) {
      expect(SCREEN_NAMES).toContain(val);
    }
  });
});

describe("SCREEN_NAMES", () => {
  it("has 12 screens", () => {
    expect(SCREEN_NAMES).toHaveLength(12);
  });

  it("contains expected screens", () => {
    const expected = ["dashboard", "journal", "vault", "recall", "ask", "decisions", "summary", "openclaw", "cline", "offline", "settings", "soul"];
    for (const name of expected) {
      expect(SCREEN_NAMES).toContain(name);
    }
  });
});

describe("SCREEN_LABELS", () => {
  it("has a label for every screen name", () => {
    for (const name of SCREEN_NAMES) {
      expect(SCREEN_LABELS[name]).toBeDefined();
      expect(SCREEN_LABELS[name].length).toBeGreaterThan(0);
    }
  });
});
