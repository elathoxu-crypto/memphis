import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorage, JsonlStorage, createStorage } from "../../src/memory/storage.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

// ─── InMemoryStorage ────────────────────────────────────────────────────────

describe("InMemoryStorage", () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it("appends and reads blocks", async () => {
    await storage.appendBlock("journal", { type: "journal", content: "Hello", tags: [] });
    const blocks = await storage.readChain("journal");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].data.content).toBe("Hello");
  });

  it("lists chains", async () => {
    await storage.appendBlock("journal", { type: "journal", content: "A", tags: [] });
    await storage.appendBlock("ask", { type: "ask", content: "B", tags: [] });
    const chains = await storage.listChains();
    expect(chains).toContain("journal");
    expect(chains).toContain("ask");
  });

  it("filters by type", async () => {
    await storage.appendBlock("journal", { type: "journal", content: "J", tags: [] });
    await storage.appendBlock("journal", { type: "ask", content: "A", tags: [] });
    const blocks = await storage.readChain("journal", { type: "journal" });
    expect(blocks.every(b => b.data.type === "journal")).toBe(true);
  });

  it("filters by tags", async () => {
    await storage.appendBlock("journal", { type: "journal", content: "tagged", tags: ["important"] });
    await storage.appendBlock("journal", { type: "journal", content: "plain", tags: [] });
    const blocks = await storage.readChain("journal", { tags: ["important"] });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].data.content).toBe("tagged");
  });

  it("respects limit and offset", async () => {
    for (let i = 0; i < 5; i++) {
      await storage.appendBlock("journal", { type: "journal", content: `Entry ${i}`, tags: [] });
    }
    const page = await storage.readChain("journal", { limit: 2, offset: 1 });
    expect(page).toHaveLength(2);
    expect(page[0].data.content).toBe("Entry 1");
  });

  it("chainStats returns correct count", async () => {
    await storage.appendBlock("journal", { type: "journal", content: "A", tags: [] });
    await storage.appendBlock("journal", { type: "journal", content: "B", tags: [] });
    const stats = await storage.chainStats("journal");
    expect(stats.blocks).toBe(2);
    expect(stats.first).toBeDefined();
    expect(stats.last).toBeDefined();
  });

  it("lastBlock returns last appended", async () => {
    await storage.appendBlock("journal", { type: "journal", content: "First", tags: [] });
    await storage.appendBlock("journal", { type: "journal", content: "Last", tags: [] });
    const last = await storage.lastBlock("journal");
    expect(last?.data.content).toBe("Last");
  });

  it("getBlock retrieves by index", async () => {
    const b = await storage.appendBlock("journal", { type: "journal", content: "Indexed", tags: [] });
    const found = await storage.getBlock("journal", b.index);
    expect(found?.data.content).toBe("Indexed");
  });

  it("ping returns true", async () => {
    expect(await storage.ping()).toBe(true);
  });

  it("close clears state", async () => {
    await storage.appendBlock("journal", { type: "journal", content: "X", tags: [] });
    await storage.close();
    const chains = await storage.listChains();
    expect(chains).toHaveLength(0);
  });

  it("maintains block hash chain linkage", async () => {
    const b1 = await storage.appendBlock("journal", { type: "journal", content: "A", tags: [] });
    const b2 = await storage.appendBlock("journal", { type: "journal", content: "B", tags: [] });
    expect(b1.index).toBe(0);
    expect(b2.index).toBe(1);
    expect(b2.prev_hash).toBe(b1.hash);
  });
});

// ─── JsonlStorage ────────────────────────────────────────────────────────────

describe("JsonlStorage", () => {
  let tmpDir: string;
  let storage: JsonlStorage;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), "memphis-storage-test-"));
    storage = new JsonlStorage(tmpDir);
  });

  it("persists blocks to disk", async () => {
    await storage.appendBlock("journal", { type: "journal", content: "Persisted", tags: [] });
    // Create new storage pointing at same dir
    const storage2 = new JsonlStorage(tmpDir);
    const blocks = await storage2.readChain("journal");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].data.content).toBe("Persisted");
  });

  it("lists chains from filesystem", async () => {
    await storage.appendBlock("journal", { type: "journal", content: "A", tags: [] });
    await storage.appendBlock("ask", { type: "ask", content: "B", tags: [] });
    const chains = await storage.listChains();
    expect(chains).toContain("journal");
    expect(chains).toContain("ask");
  });

  it("ping returns true when accessible", async () => {
    expect(await storage.ping()).toBe(true);
  });
});

// ─── Factory ─────────────────────────────────────────────────────────────────

describe("createStorage", () => {
  it("creates InMemoryStorage for backend=memory", async () => {
    const storage = createStorage({ backend: "memory" });
    expect(storage.name).toBe("memory");
    expect(await storage.ping()).toBe(true);
  });

  it("creates JsonlStorage for backend=jsonl", () => {
    const tmpDir = mkdtempSync(join(os.tmpdir(), "memphis-factory-test-"));
    const storage = createStorage({ backend: "jsonl", basePath: tmpDir });
    expect(storage.name).toBe("jsonl");
  });

  it("throws for unknown backend", () => {
    expect(() => createStorage({ backend: "sqlite" as any })).toThrow();
  });

  it("throws for jsonl without basePath", () => {
    expect(() => createStorage({ backend: "jsonl" })).toThrow("basePath");
  });
});
