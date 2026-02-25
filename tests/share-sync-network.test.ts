import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "os";
import path from "path";
import fs from "fs/promises";

const loadModule = async () => {
  vi.resetModules();
  return await import("../src/cli/share-sync.ts");
};

let originalHome: string | undefined;
let tempHome: string;

describe("share-sync network helpers", () => {
  beforeEach(async () => {
    originalHome = process.env.HOME;
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "share-sync-test-"));
    process.env.HOME = tempHome;
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    await fs.rm(tempHome, { recursive: true, force: true });
  });

  it("appends entries with default status and reads them", async () => {
    const mod = await loadModule();
    await mod.appendNetworkEntry({
      cid: "cid1",
      agent: "Style",
      timestamp: new Date("2026-02-25T22:00:00Z").toISOString(),
      chain: "journal",
      index: 10,
    });
    const entries = await mod.readNetworkEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe("pinned");
  });

  it("supports sorting order and unique filtering", async () => {
    const mod = await loadModule();
    const baseTime = Date.parse("2026-02-25T22:00:00Z");
    for (let i = 0; i < 3; i++) {
      await mod.appendNetworkEntry({
        cid: i === 2 ? "dup" : `cid${i}`,
        agent: "Style",
        timestamp: new Date(baseTime + i * 1000).toISOString(),
        chain: "journal",
        index: i,
      });
    }
    await mod.appendNetworkEntry({
      cid: "dup",
      agent: "Style",
      timestamp: new Date(baseTime + 5000).toISOString(),
      chain: "journal",
      index: 99,
      status: "imported",
    });

    const asc = await mod.readNetworkEntries({ sort: "asc" });
    expect(asc[0].cid).toBe("cid0");

    const desc = await mod.readNetworkEntries({ sort: "desc" });
    expect(desc[0].cid).toBe("dup");

    const unique = await mod.readNetworkEntries({ sort: "desc", unique: true });
    expect(unique).toHaveLength(3);
    expect(unique[0].cid).toBe("dup");
    expect(unique.find((e: any) => e.cid === "dup")?.status).toBe("imported");
  });
});
