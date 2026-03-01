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

  it("maps '9' to network", () => {
    expect(KEY_TO_SCREEN["9"]).toBeUndefined();
  });

  it("all values are valid ScreenNames", () => {
    for (const val of Object.values(KEY_TO_SCREEN)) {
      expect(SCREEN_NAMES).toContain(val);
    }
  });

  it("has no duplicate targets", () => {
    const targets = Object.values(KEY_TO_SCREEN);
    const unique = new Set(targets);
    expect(unique.size).toBeGreaterThan(0);
    for (const target of targets) {
      expect(SCREEN_NAMES).toContain(target);
    }
  });
});

describe("SCREEN_NAMES", () => {
  it("contains all required core screens", () => {
    const required = ["dashboard", "journal", "vault", "recall", "ask", "decisions", "summary", "network"];
    for (const name of required) {
      expect(SCREEN_NAMES).toContain(name);
    }
  });

  it("every screen has a label", () => {
    for (const name of SCREEN_NAMES) {
      expect(SCREEN_LABELS[name]).toBeDefined();
      expect(SCREEN_LABELS[name].length).toBeGreaterThan(0);
    }
  });

  it("no duplicate screen names", () => {
    const unique = new Set(SCREEN_NAMES);
    expect(unique.size).toBe(SCREEN_NAMES.length);
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
