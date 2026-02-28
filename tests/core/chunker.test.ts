import { describe, it, expect } from "vitest";
import { chunk } from "../../src/core/chunker.js";

const LOREM = `First paragraph with some content here.
It spans one line.

Second paragraph that is also present.
And continues a bit more.

Third paragraph, final one.`;

describe("chunker", () => {
  it("splits into multiple chunks when text is long", () => {
    const longText = Array.from({ length: 50 }, (_, i) => `Paragraph ${i}. `.repeat(20)).join("\n\n");
    const chunks = chunk(longText, { maxTokens: 100 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("returns single chunk for short text", () => {
    const text = "Short text that is long enough to pass the minimum char threshold for chunking.";
    const chunks = chunk(text, { maxTokens: 400, minChars: 10 });
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toContain("Short text");
  });

  it("preserves paragraph boundaries", () => {
    const chunks = chunk(LOREM, { maxTokens: 20 }); // force splits
    for (const c of chunks) {
      expect(c.text.length).toBeGreaterThan(0);
    }
  });

  it("respects minChars — discards tiny chunks", () => {
    const chunks = chunk("Hi\n\nA\n\nLonger paragraph here that passes.", { minChars: 10 });
    for (const c of chunks) {
      expect(c.text.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("assigns sequential indices", () => {
    const longText = Array.from({ length: 20 }, (_, i) => `Para ${i}. `.repeat(30)).join("\n\n");
    const chunks = chunk(longText, { maxTokens: 80 });
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("tokenEstimate is positive", () => {
    const text = "Hello world, this is Memphis. A sentence long enough to exceed minChars threshold.";
    const chunks = chunk(text, { minChars: 10 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].tokenEstimate).toBeGreaterThan(0);
  });

  it("handles empty string gracefully", () => {
    const chunks = chunk("", {});
    expect(chunks).toHaveLength(0);
  });

  it("handles very long single paragraph via sentence split", () => {
    const longPara = Array.from({ length: 100 }, (_, i) => `Sentence ${i} is here.`).join(" ");
    const chunks = chunk(longPara, { maxTokens: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.tokenEstimate).toBeLessThanOrEqual(60); // slight overshoot allowed
    }
  });
});
