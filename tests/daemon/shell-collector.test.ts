import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../../src/memory/store.js";
import { DaemonStateStore } from "../../src/daemon/state.js";
import { ShellCollector } from "../../src/daemon/collectors/shell.js";

describe("ShellCollector", () => {
  it("captures npm install events once", async () => {
    const dir = mkdtempSync(join(tmpdir(), "memphis-shell-"));
    const historyPath = join(dir, ".bash_history");
    writeFileSync(historyPath, "", "utf-8");

    const store = new Store(join(dir, "chains"));
    const state = new DaemonStateStore(join(dir, "daemon-state.json"));
    const collector = new ShellCollector(store, state, {
      historyPaths: [historyPath],
      chain: "journal",
    });

    writeFileSync(historyPath, "npm install chalk\n", { encoding: "utf-8" });
    await collector.collect();
    let blocks = store.readChain("journal");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].data.content).toContain("npm install chalk");

    await collector.collect();
    blocks = store.readChain("journal");
    expect(blocks).toHaveLength(1);
  });
});
