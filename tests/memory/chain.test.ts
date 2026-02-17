import { describe, it, expect } from "vitest";
import { createBlock, verifyBlock, verifyChain } from "../../src/memory/chain.js";

describe("chain", () => {
  it("creates genesis block", () => {
    const block = createBlock("test", {
      type: "journal",
      content: "hello world",
      tags: ["test"],
    });

    expect(block.index).toBe(0);
    expect(block.prev_hash).toBe("0".repeat(64));
    expect(block.hash).toHaveLength(64);
    expect(block.chain).toBe("test");
  });

  it("links blocks", () => {
    const b0 = createBlock("test", { type: "journal", content: "first", tags: [] });
    const b1 = createBlock("test", { type: "journal", content: "second", tags: [] }, b0);

    expect(b1.index).toBe(1);
    expect(b1.prev_hash).toBe(b0.hash);
  });

  it("verifies valid chain", () => {
    const b0 = createBlock("test", { type: "journal", content: "first", tags: [] });
    const b1 = createBlock("test", { type: "journal", content: "second", tags: [] }, b0);
    const b2 = createBlock("test", { type: "journal", content: "third", tags: [] }, b1);

    expect(verifyChain([b0, b1, b2])).toEqual({ valid: true });
  });

  it("detects tampering", () => {
    const b0 = createBlock("test", { type: "journal", content: "first", tags: [] });
    const b1 = createBlock("test", { type: "journal", content: "second", tags: [] }, b0);

    // Tamper
    b1.data.content = "HACKED";

    expect(verifyChain([b0, b1])).toEqual({ valid: false, broken_at: 1 });
  });
});
