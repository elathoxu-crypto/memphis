import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Store } from "../../src/memory/store.js";
import { recallDecisionsV1 } from "../../src/decision/recall-v1.js";

function makeTempStore(): { dir: string; store: Store; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "memphis-test-"));
  const store = new Store(dir);
  return {
    dir,
    store,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function addDecision(store: Store, input: any) {
  store.addBlock("decisions", {
    type: "decision" as any,
    content: JSON.stringify(input),
    tags: ["decision", input.mode ?? "conscious", input.scope ?? "personal", input.status ?? "active"],
    agent: "test",
  });
}

describe("recallDecisionsV1", () => {
  let ctx: ReturnType<typeof makeTempStore>;

  beforeEach(() => {
    if (ctx) ctx.cleanup();
    ctx = makeTempStore();
  });

  it("returns newest decisions when no query", () => {
    addDecision(ctx.store, {
      decisionId: "aaa111",
      recordId: "r1",
      createdAt: "2026-02-01T10:00:00.000Z",
      title: "Older",
      reasoning: "old reason",
      mode: "conscious",
      status: "active",
      scope: "project",
      metadata: { projectPath: "/x/a" },
    });

    addDecision(ctx.store, {
      decisionId: "bbb222",
      recordId: "r2",
      createdAt: "2026-02-10T10:00:00.000Z",
      title: "Newer",
      reasoning: "new reason",
      mode: "conscious",
      status: "active",
      scope: "project",
      metadata: { projectPath: "/x/b" },
    });

    const res = recallDecisionsV1(ctx.store, { limit: 10, allProjects: true });
    expect(res.length).toBe(2);
    expect(res[0].decision.decisionId).toBe("bbb222");
  });

  it("filters by query in title/reasoning", () => {
    addDecision(ctx.store, {
      decisionId: "ccc333",
      recordId: "r3",
      createdAt: "2026-02-10T10:00:00.000Z",
      title: "Offline zamiast cloud",
      reasoning: "privacy + sovereignty",
      mode: "conscious",
      status: "active",
      scope: "project",
      metadata: { projectPath: "/x/memphis" },
    });

    addDecision(ctx.store, {
      decisionId: "ddd444",
      recordId: "r4",
      createdAt: "2026-02-11T10:00:00.000Z",
      title: "Rename var",
      reasoning: "cleanup",
      mode: "conscious",
      status: "active",
      scope: "project",
      metadata: { projectPath: "/x/memphis" },
    });

    const res = recallDecisionsV1(ctx.store, { query: "offline", limit: 10, allProjects: true });
    expect(res.length).toBe(1);
    expect(res[0].decision.decisionId).toBe("ccc333");
  });

  it("filters by since window", () => {
    addDecision(ctx.store, {
      decisionId: "eee555",
      recordId: "r5",
      createdAt: "2026-01-01T10:00:00.000Z",
      title: "Very old",
      reasoning: "",
      mode: "conscious",
      status: "active",
      scope: "project",
      metadata: { projectPath: "/x/memphis" },
    });

    addDecision(ctx.store, {
      decisionId: "fff666",
      recordId: "r6",
      createdAt: new Date().toISOString(),
      title: "Recent",
      reasoning: "",
      mode: "conscious",
      status: "active",
      scope: "project",
      metadata: { projectPath: "/x/memphis" },
    });

    const res = recallDecisionsV1(ctx.store, { since: "14d", limit: 10, allProjects: true });
    expect(res.some((r) => r.decision.decisionId === "eee555")).toBe(false);
    expect(res.some((r) => r.decision.decisionId === "fff666")).toBe(true);
  });
});
