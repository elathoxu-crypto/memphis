import { describe, it, expect } from "vitest";
import { 
  MEMPHIS_SOUL, 
  getMemphisSoul,
  truncateContent,
  formatBlockPreview,
  formatChainStats,
  padString,
  isValidModel,
  parseNumber,
} from "../../src/tui/helpers.js";

describe("MEMPHIS_SOUL", () => {
  it("should have Polish language setting", () => {
    expect(MEMPHIS_SOUL).toContain("Polish (PL)");
    expect(MEMPHIS_SOUL).toContain("Odpowiadaj po polsku");
  });

  it("should contain collaboration info", () => {
    expect(MEMPHIS_SOUL).toContain("Cline = hands");
    expect(MEMPHIS_SOUL).toContain("Memphis = wings");
  });

  it("should contain mission", () => {
    expect(MEMPHIS_SOUL).toContain("Connect what was with what will be");
  });
});

describe("getMemphisSoul", () => {
  it("should include current date", () => {
    const soul = getMemphisSoul();
    expect(soul).toContain("Today is:");
  });

  it("should include full SOUL content", () => {
    const soul = getMemphisSoul();
    expect(soul).toContain("Polish (PL)");
    expect(soul).toContain("Memphis = wings");
  });
});

describe("truncateContent", () => {
  it("should not truncate short content", () => {
    expect(truncateContent("short")).toBe("short");
  });

  it("should truncate long content with ellipsis", () => {
    const long = "a".repeat(100);
    const result = truncateContent(long, 20);
    expect(result.length).toBeLessThan(100);
    expect(result).toContain("...");
  });

  it("should handle undefined content", () => {
    expect(truncateContent(undefined, 10)).toBe("");
  });

  it("should use default limit", () => {
    const long = "a".repeat(200);
    const result = truncateContent(long);
    expect(result.length).toBeLessThan(200);
  });
});

describe("formatBlockPreview", () => {
  it("should format block correctly", () => {
    const block = {
      index: 1,
      timestamp: "2026-02-18T12:00:00.000Z",
      hash: "abc123def456",
      chain: "journal",
      data: {
        type: "journal",
        content: "Test content",
        tags: ["test"],
      },
    } as any;
    
    const result = formatBlockPreview(block);
    expect(result).toContain("Test content");
  });
});

describe("formatChainStats", () => {
  it("should format chain statistics", () => {
    const chains = ["journal", "vault"];
    const getStats = (chain: string) => ({
      blocks: chain === "journal" ? 100 : 5,
      first: "2026-02-01",
      last: "2026-02-18",
    });
    
    const result = formatChainStats(chains, getStats);
    expect(result).toContain("journal");
    expect(result).toContain("100");
    expect(result).toContain("vault");
    expect(result).toContain("5");
  });
});

describe("padString", () => {
  it("should pad string to specified length", () => {
    const result = padString("abc", 10);
    expect(result.length).toBe(10);
    expect(result.startsWith("abc")).toBe(true);
  });

  it("should not truncate if string is longer", () => {
    expect(padString("abcdefghij", 5)).toBe("abcdefghij");
  });

  it("should use default padding character", () => {
    const result = padString("a", 3);
    expect(result).toBe("a  ");
  });
});

describe("isValidModel", () => {
  it("should validate known models", () => {
    const models = ["llama3.2:1b", "gemma3:4b"];
    expect(isValidModel("llama3.2:1b", models)).toBe(true);
    expect(isValidModel("unknown", models)).toBe(false);
  });
});

describe("parseNumber", () => {
  it("should parse integers", () => {
    expect(parseNumber("123")).toBe(123);
  });

  it("should return null for invalid input", () => {
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });
});
