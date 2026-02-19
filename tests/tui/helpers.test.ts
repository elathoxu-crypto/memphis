import { describe, it, expect, vi } from "vitest";
import {
  truncate,
  formatDate,
  validateInput,
  safeAsync,
  safeSync,
  buildBox,
} from "../../src/tui/helpers.js";

// ─── truncate ─────────────────────────────────────────────────────────────────
describe("truncate", () => {
  it("returns empty string for empty input", () => {
    expect(truncate("", 10)).toBe("");
  });

  it("returns string unchanged when shorter than maxLen", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns string unchanged when exactly maxLen", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and appends ellipsis when too long", () => {
    const result = truncate("hello world", 8);
    expect(result).toBe("hello...");
    expect(result.length).toBe(8);
  });

  it("handles maxLen of 3 (ellipsis only)", () => {
    expect(truncate("abcdef", 3)).toBe("...");
  });

  it("handles undefined-like falsy gracefully", () => {
    // @ts-expect-error testing runtime behaviour
    expect(truncate(null, 10)).toBe("");
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────
describe("formatDate", () => {
  it("returns N/A for undefined", () => {
    expect(formatDate(undefined)).toBe("N/A");
  });

  it("returns 'Invalid date' for non-parseable string", () => {
    expect(formatDate("not-a-date")).toBe("Invalid date");
  });

  it("formats a valid ISO date as string (non-empty)", () => {
    const result = formatDate("2025-06-15T12:00:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe("N/A");
    expect(result).not.toBe("Invalid date");
  });
});

// ─── validateInput ────────────────────────────────────────────────────────────
describe("validateInput", () => {
  it("returns false for empty string", () => {
    expect(validateInput("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(validateInput("   ")).toBe(false);
  });

  it("returns false for null", () => {
    expect(validateInput(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(validateInput(undefined)).toBe(false);
  });

  it("returns true for valid string", () => {
    expect(validateInput("hello")).toBe(true);
  });

  it("returns true for string with leading/trailing spaces", () => {
    expect(validateInput("  hello  ")).toBe(true);
  });
});

// ─── safeAsync ────────────────────────────────────────────────────────────────
describe("safeAsync", () => {
  it("returns [result, null] on success", async () => {
    const [result, err] = await safeAsync(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(err).toBeNull();
  });

  it("returns [null, Error] on rejection", async () => {
    const [result, err] = await safeAsync(() => Promise.reject(new Error("boom")));
    expect(result).toBeNull();
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toBe("boom");
  });

  it("wraps non-Error rejects in Error", async () => {
    const [result, err] = await safeAsync(async () => { throw "string-error"; });
    expect(result).toBeNull();
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toBe("string-error");
  });
});

// ─── safeSync ─────────────────────────────────────────────────────────────────
describe("safeSync", () => {
  it("returns [result, null] on success", () => {
    const [result, err] = safeSync(() => "ok");
    expect(result).toBe("ok");
    expect(err).toBeNull();
  });

  it("returns [null, Error] on throw", () => {
    const [result, err] = safeSync(() => { throw new Error("sync-boom"); });
    expect(result).toBeNull();
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toBe("sync-boom");
  });

  it("wraps non-Error throws in Error", () => {
    const [, err] = safeSync(() => { throw 42; });
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toBe("42");
  });
});

// ─── buildBox ─────────────────────────────────────────────────────────────────
describe("buildBox", () => {
  it("returns a string", () => {
    const result = buildBox("Title", ["Line one", "Line two"]);
    expect(typeof result).toBe("string");
  });

  it("contains the title", () => {
    const result = buildBox("My Title", []);
    expect(result).toContain("My Title");
  });

  it("contains each line", () => {
    const result = buildBox("T", ["alpha", "beta"]);
    expect(result).toContain("alpha");
    expect(result).toContain("beta");
  });

  it("starts with top-left corner character", () => {
    const result = buildBox("T", []);
    expect(result.trim().startsWith("╔")).toBe(true);
  });

  it("truncates long title to fit width", () => {
    const longTitle = "A".repeat(200);
    const result = buildBox(longTitle, [], 40);
    // Each line should be roughly width characters (not exceeding width + decorators)
    const lines = result.split("\n");
    for (const line of lines) {
      // Strip ANSI-safe check: raw line shouldn't vastly exceed width
      expect(line.length).toBeLessThan(200);
    }
  });
});
