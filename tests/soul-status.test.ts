import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectSoulStatus } from "../src/soul/status.js";

function setupWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "memphis-soul-"));
  mkdirSync(join(dir, "logs"), { recursive: true });
  mkdirSync(join(dir, "tasks"), { recursive: true });
  writeFileSync(join(dir, "SOUL.md"), "# Soul test\n", "utf-8");
  writeFileSync(join(dir, "HEARTBEAT.md"), "- test", "utf-8");
  writeFileSync(join(dir, "USER.md"), "user", "utf-8");
  writeFileSync(join(dir, "tasks", "QUEUE.md"), "- [ ] sample task", "utf-8");
  writeFileSync(join(dir, "logs", "heartbeat-state.json"), JSON.stringify({ memphisShareSync: new Date().toISOString() }));
  return dir;
}

describe("collectSoulStatus", () => {
  it("returns structured status", () => {
    const workspace = setupWorkspace();
    const report = collectSoulStatus({ workspaceRoot: workspace, touchHeartbeat: false });
    expect(report.workspaceRoot).toBe(workspace);
    expect(report.identity.agent).toBeTruthy();
    expect(report.signals.shareSync).toBeDefined();
    expect(report.queue.length).toBeGreaterThan(0);
  });
});
