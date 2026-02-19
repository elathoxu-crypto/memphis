import { spawnSync } from "node:child_process";
import { Store } from "../memory/store.js";
import type { Block } from "../memory/chain.js";
import { safeParseDecisionV1, type DecisionV1 } from "./decision-v1.js";

export interface RecallDecisionsOptions {
  query?: string;
  limit?: number;
  since?: string; // "14d" | "7d" | ISO date
  projectOnly?: boolean;
  allProjects?: boolean;
  cwd?: string;
}

export interface RecalledDecision {
  block: Block;
  decision: DecisionV1;
  score: number;
  projectLabel?: string;
}

function toDay(s: string): string {
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return s.slice(0, 10);
  }
}

function truncate(s: string, n: number): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= n) return t;
  return t.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
}

export function formatDecisionOneLiner(d: { decision: DecisionV1; timestamp: string; projectLabel?: string }): string {
  const day = toDay(d.timestamp || d.decision.createdAt);
  const id = d.decision.decisionId.slice(0, 6);
  const title = truncate(d.decision.title, 70);
  const reason = truncate(d.decision.reasoning ?? "", 60);
  const suffix = reason ? ` — ${reason}` : "";
  const proj = d.projectLabel ? ` (${d.projectLabel})` : "";
  return `${day} ${id} ${title}${suffix}${proj}`.trim();
}

function parseSince(since?: string): Date | null {
  if (!since) return null;
  const trimmed = since.trim();

  // Supports "14d", "2w", "3m" (days/weeks/months)
  const m = trimmed.match(/^([0-9]+)\s*([dwm])$/i);
  if (m) {
    const num = Number(m[1]);
    const unit = m[2].toLowerCase();
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = unit === "d" ? num : unit === "w" ? num * 7 : num * 30;
    return new Date(now.getTime() - days * msPerDay);
  }

  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date;
  return null;
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

function projectLabelFromPath(p?: string): string | undefined {
  if (!p) return undefined;
  const norm = p.replace(/\\/g, "/").replace(/\/+$/g, "");
  const parts = norm.split("/").filter(Boolean);
  return parts[parts.length - 1] || undefined;
}

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function scoreDecision(d: DecisionV1, q?: string, projectHint?: { cwd: string; gitRoot?: string }): number {
  let score = 0;

  // Query matching
  if (q && q.trim().length > 0) {
    const query = q.trim();
    if (includesInsensitive(d.title, query)) score += 3;
    if (d.reasoning && includesInsensitive(d.reasoning, query)) score += 2;
    // Also match decisionId
    if (includesInsensitive(d.decisionId, query)) score += 2;
  } else {
    // No query: base score so recency can drive ordering
    score += 1;
  }

  // Project matching
  if (projectHint) {
    const meta = d.metadata;
    const projectPath = meta?.projectPath;
    const gitRoot = meta?.gitRoot;

    if (projectPath && includesInsensitive(projectPath, projectHint.cwd)) score += 1;
    if (gitRoot && projectHint.gitRoot && gitRoot === projectHint.gitRoot) score += 2;
  }

  // Recency bonus 0..2
  const created = new Date(d.createdAt);
  if (!isNaN(created.getTime())) {
    const ageDays = (Date.now() - created.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays <= 7) score += 2;
    else if (ageDays <= 30) score += 1;
  }

  return score;
}

function isWithinSince(d: DecisionV1, sinceDate: Date | null): boolean {
  if (!sinceDate) return true;
  const t = new Date(d.createdAt);
  if (isNaN(t.getTime())) return true;
  return t >= sinceDate;
}

function matchesProject(d: DecisionV1, hint: { cwd: string; gitRoot?: string }): boolean {
  const meta = d.metadata;
  if (!meta) return false;
  if (meta.gitRoot && hint.gitRoot && meta.gitRoot === hint.gitRoot) return true;
  if (meta.projectPath && meta.projectPath === hint.cwd) return true;
  // Loose match: cwd is within projectPath
  if (meta.projectPath && hint.cwd.startsWith(meta.projectPath)) return true;
  return false;
}

export function recallDecisionsV1(store: Store, opts: RecallDecisionsOptions = {}): RecalledDecision[] {
  const limit = opts.limit ?? 15;
  const cwd = opts.cwd ?? process.cwd();
  const gitRoot = getGitRoot(cwd);
  const projectHint = { cwd, gitRoot };

  const sinceDate = parseSince(opts.since);

  const blocks = store.readChain("decisions");
  const results: RecalledDecision[] = [];

  for (const block of blocks) {
    if (block.data.type !== "decision") continue;

    const parsed = safeParseDecisionV1(block.data.content);
    if (!parsed.ok) continue;

    const decision = parsed.value;

    if (!isWithinSince(decision, sinceDate)) continue;

    const wantProjectOnly = opts.projectOnly && !opts.allProjects;
    if (wantProjectOnly && !matchesProject(decision, projectHint)) continue;

    const score = scoreDecision(decision, opts.query, wantProjectOnly ? projectHint : undefined);

    // If query is present and score is minimal, skip.
    if (opts.query && score < 3) continue;

    results.push({
      block,
      decision,
      score,
      projectLabel: projectLabelFromPath(decision.metadata?.gitRoot ?? decision.metadata?.projectPath),
    });
  }

  // Sort by score desc then createdAt desc
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.decision.createdAt || "").localeCompare(a.decision.createdAt || "");
  });

  return results.slice(0, limit);
}
