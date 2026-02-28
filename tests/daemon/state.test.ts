import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonStateStore } from "../../src/daemon/state.js";

describe("DaemonStateStore", () => {
  it("persists and reloads state", () => {
    const dir = mkdtempSync(join(tmpdir(), "memphis-state-"));
    const statePath = join(dir, "state.json");

    const store = new DaemonStateStore(statePath);
    store.update(state => {
      state.shell = { files: { "/tmp/history": { size: 42, updatedAt: "2026-02-28T00:00:00Z" } } };
    });

    const reloaded = new DaemonStateStore(statePath);
    expect(reloaded.getState().shell?.files["/tmp/history"]?.size).toBe(42);
  });

  it("recovers from invalid json", () => {
    const dir = mkdtempSync(join(tmpdir(), "memphis-state-bad-"));
    const statePath = join(dir, "state.json");
    writeFileSync(statePath, "{not:json}", "utf-8");

    const store = new DaemonStateStore(statePath);
    expect(Object.keys(store.getState().shell?.files ?? {})).toHaveLength(0);
  });
});
