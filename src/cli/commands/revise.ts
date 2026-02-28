import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadConfig } from "../../config/loader.js";
import { Store } from "../../memory/store.js";
import { log } from "../../utils/logger.js";
import { safeParseDecisionV1, type DecisionV1 } from "../../decision/decision-v1.js";

function randomId(): string {
  return crypto.randomBytes(12).toString("hex");
}

function getGitRoot(cwd: string): string | undefined {
  try {
    const res = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" });
    if (res.status === 0) {
      const out = (res.stdout ?? "").toString().trim();
      return out || undefined;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function findLatestDecision(blocks: any[], decisionId: string): { block: any; decision: DecisionV1 } | null {
  const matches: Array<{ block: any; decision: DecisionV1 }> = [];
  for (const block of blocks) {
    if (block?.data?.type !== "decision") continue;
    const parsed = safeParseDecisionV1(block.data.content);
    if (!parsed.ok) continue;
    if (parsed.value.decisionId === decisionId) {
      matches.push({ block, decision: parsed.value });
    }
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => (b.decision.createdAt || "").localeCompare(a.decision.createdAt || ""));
  return matches[0];
}

export async function reviseCommand(decisionId: string, opts: { reason: string; title?: string; status?: string }) {
  const id = decisionId.trim();
  if (!id) {
    log.error("decisionId is required");
    return;
  }

  const config = loadConfig();
  const store = new Store(config.memory.path);

  const blocks = store.readChain("decisions");
  const found = findLatestDecision(blocks as any[], id);

  if (!found) {
    log.warn(`Decision not found: ${id}`);
    return;
  }

  const now = new Date().toISOString();
  const cwd = process.cwd();
  const gitRoot = getGitRoot(cwd);

  const status = (opts.status?.trim().toLowerCase() || "revised") as any;

  const revised: DecisionV1 = {
    ...found.decision,
    recordId: randomId(),
    createdAt: now,
    title: (opts.title ?? found.decision.title).trim(),
    reasoning: opts.reason.trim(),
    mode: "conscious",
    status,
    supersedes: found.decision.recordId,
    confidence: 0.85,
    metadata: {
      ...(found.decision.metadata ?? {}),
      projectPath: cwd,
      gitRoot,
      source: "cli:revise",
    },
  };

  await store.appendBlock("decisions", {
    type: "decision" as any,
    content: JSON.stringify(revised),
    tags: ["decision", revised.mode, revised.scope, revised.status].filter(Boolean),
    agent: "revise",
  });

  log.info(`Revised decision ${revised.decisionId} (supersedes ${found.decision.recordId})`);
}
