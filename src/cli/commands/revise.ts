import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { log } from "../../utils/logger.js";
import { safeParseDecisionV1, type DecisionV1 } from "../../decision/decision-v1.js";
import { createWorkspaceStore } from "../utils/workspace-store.js";

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

function recordExists(blocks: any[], recordId: string): boolean {
  for (const block of blocks) {
    if (block?.data?.type !== "decision") continue;
    const parsed = safeParseDecisionV1(block.data.content);
    if (!parsed.ok) continue;
    if (parsed.value.recordId === recordId) {
      return true;
    }
  }
  return false;
}

export async function reviseCommand(decisionId: string, opts: { reason: string; title?: string; status?: string; supersedes?: string }) {
  const id = decisionId.trim();
  if (!id) {
    log.error("decisionId is required");
    return;
  }

  const { guard } = createWorkspaceStore();

  const blocks = guard.readChain("decisions");
  const found = findLatestDecision(blocks as any[], id);

  if (!found) {
    log.warn(`Decision not found: ${id}`);
    return;
  }

  const supersedesInput = opts.supersedes?.trim();
  if (supersedesInput && !recordExists(blocks as any[], supersedesInput)) {
    log.warn(`Supersedes recordId not found: ${supersedesInput}`);
  }

  const effectiveSupersedes = supersedesInput || found.decision.recordId;

  const now = new Date().toISOString();
  const cwd = process.cwd();
  const gitRoot = getGitRoot(cwd);

  const status = (opts.status?.trim().toLowerCase() || "revised") as any;

  // Mark previous decision as "revised" via a tombstone block
  const tombstone: DecisionV1 = {
    ...found.decision,
    status: "revised",
    supersedes: undefined,
  };
  await guard.appendBlock("decisions", {
    type: "decision" as any,
    content: JSON.stringify(tombstone),
    tags: ["decision", "lifecycle", "revised"].filter(Boolean),
    agent: "revise:tombstone",
  });

  const revised: DecisionV1 = {
    ...found.decision,
    recordId: randomId(),
    createdAt: now,
    title: (opts.title ?? found.decision.title).trim(),
    reasoning: opts.reason.trim(),
    mode: "conscious",
    status,
    supersedes: effectiveSupersedes,
    confidence: 0.85,
    metadata: {
      ...(found.decision.metadata ?? {}),
      projectPath: cwd,
      gitRoot,
      source: "cli:revise",
    },
  };

  await guard.appendBlock("decisions", {
    type: "decision" as any,
    content: JSON.stringify(revised),
    tags: ["decision", revised.mode, revised.scope, revised.status].filter(Boolean),
    agent: "revise",
  });

  log.info(`Revised decision ${revised.decisionId} (supersedes ${effectiveSupersedes})`);
}
