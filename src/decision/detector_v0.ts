import { execFileSync } from "node:child_process";
import { createDecisionV1, type CreateDecisionInput, type DecisionV1 } from "./schema.js";

/**
 * Agent Detector v0
 * -----------------
 * Minimal "inference" engine: looks at git history and proposes inferred decisions.
 *
 * Goals:
 * - Local-only (no network)
 * - Deterministic + explainable heuristics
 * - Produces Decision v1 objects (mode=inferred) with evidence refs
 *
 * Integration:
 * - Call detectInferredDecisionsFromGit(...) to get proposals.
 * - Optionally call promoteToConscious(...) after user confirmation.
 *
 * NOTE: This module does NOT write to the chain/store by itself.
 * Keep storage concerns elsewhere (append-only ledger).
 */

export interface DetectorGitOptions {
  repoPath?: string;
  since?: string; // e.g. "7 days ago", "2 weeks ago", "2026-01-01"
  maxCommits?: number;
  /** If true, include diffs stats (slower) */
  withStats?: boolean;
}

export interface InferredDecisionProposal {
  decision: DecisionV1;
  /** short reason why detector produced it */
  rationale: string;
  /** raw evidence that led to proposal */
  evidence: {
    sha: string;
    subject: string;
    body?: string;
    stats?: { files: number; insertions: number; deletions: number };
  };
}

const DEFAULTS: Required<Pick<DetectorGitOptions, "repoPath" | "since" | "maxCommits" | "withStats">> = {
  repoPath: process.cwd(),
  since: "14 days ago",
  maxCommits: 80,
  withStats: false,
};

function runGit(repoPath: string, args: string[]): string {
  return execFileSync("git", args, { cwd: repoPath, encoding: "utf8" }).trim();
}

function safeRunGit(repoPath: string, args: string[]): string | null {
  try {
    return runGit(repoPath, args);
  } catch {
    return null;
  }
}

function parseNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseNumstat(numstatLine: string): { files: number; insertions: number; deletions: number } | null {
  // git log --numstat produces lines: "<ins>\t<del>\t<path>"
  const parts = numstatLine.split("\t");
  if (parts.length < 3) return null;
  const ins = parts[0] === "-" ? 0 : parseNum(parts[0]);
  const del = parts[1] === "-" ? 0 : parseNum(parts[1]);
  return { files: 1, insertions: ins, deletions: del };
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function scoreCommit(subject: string, body: string): { score: number; tags: string[]; chosen: string } {
  const text = `${subject}\n${body}`.toLowerCase();
  const tags: string[] = [];
  let score = 0;

  // Strong signals (decision-y)
  const strong: Array<[RegExp, number, string]> = [
    [/breaking change|major\b|v?\d+\.\d+\.\d+/, 3, "versioning"],
    [/\bremove\b|\bdrop\b|\bdelete\b|\bdeprecate\b/, 3, "removal"],
    [/\bmigrate\b|\bswitch\b|\bmove to\b|\breplace\b|\bswap\b/, 3, "migration"],
    [/\brefactor\b|\brewrite\b|\brestructure\b/, 2, "refactor"],
    [/\bsecurity\b|\bencrypt\b|\bvault\b|\bcrypto\b/, 2, "security"],
    [/\boffline\b|\bollama\b|\blocal\b|\bno cloud\b/, 2, "local-first"],
    [/\barchitecture\b|\bdesign\b|\bschema\b|\bapi\b/, 2, "architecture"],
    [/\bperformance\b|\boptimi[sz]e\b|\bfaster\b/, 2, "performance"],
  ];

  for (const [re, w, tag] of strong) {
    if (re.test(text)) {
      score += w;
      tags.push(tag);
    }
  }

  // Weak signals
  const weak: Array<[RegExp, number, string]> = [
    [/\bfix\b|\bbug\b|\bissue\b/, 1, "fix"],
    [/\btest\b|\bvitest\b|\bunit\b/, 1, "tests"],
    [/\bdocs\b|\breadme\b/, 1, "docs"],
  ];

  for (const [re, w, tag] of weak) {
    if (re.test(text)) {
      score += w;
      tags.push(tag);
    }
  }

  // Choose a "decision type" / chosen option based on best-matching tag
  const chosen = tags.includes("migration")
    ? "changed approach / technology"
    : tags.includes("removal")
    ? "removed / deprecated something"
    : tags.includes("security")
    ? "prioritized security hardening"
    : tags.includes("architecture")
    ? "committed to an architecture decision"
    : tags.includes("refactor")
    ? "refactored structure for maintainability"
    : tags.includes("local-first")
    ? "reinforced local-first direction"
    : tags.includes("performance")
    ? "prioritized performance"
    : "made an implementation decision";

  return { score, tags: Array.from(new Set(tags)), chosen };
}

function buildDecisionFromCommit(input: {
  sha: string;
  subject: string;
  body: string;
  rationale: string;
  chosen: string;
  tags: string[];
  stats?: { files: number; insertions: number; deletions: number };
}): DecisionV1 {
  const title = normalize(input.subject);
  const options = [
    "keep current direction",
    "make an implementation decision",
    input.chosen,
  ];

  const contextLines = [
    `Detected from git commit.`,
    `Commit: ${input.sha}`,
    input.stats ? `Stats: +${input.stats.insertions} -${input.stats.deletions} files:${input.stats.files}` : "",
    input.tags.length ? `Tags: ${input.tags.join(", ")}` : "",
  ].filter(Boolean);

  const decisionInput: CreateDecisionInput = {
    title,
    mode: "inferred",
    scope: "project",
    context: contextLines.join("\n"),
    options,
    chosen: input.chosen,
    reasoning: normalize(input.rationale),
    confidence: 0.55, // detector v0 is conservative
    evidence: {
      refs: [`git:${input.sha}`],
      note: normalize(`${input.subject}${input.body ? ` — ${input.body}` : ""}`),
    },
  };

  return createDecisionV1(decisionInput);
}

function gitLogRaw(repoPath: string, since: string, maxCommits: number): string {
  // Fields: sha, subject, body (separated safely)
  // Use ASCII unit separators to avoid collisions.
  const SEP = "\u001f"; // unit separator
  const REC = "\u001e"; // record separator
  const format = [`%H`, `%s`, `%b`].join(SEP) + REC;
  const out = safeRunGit(repoPath, ["log", `--since=${since}`, `-n`, String(maxCommits), `--pretty=format:${format}`]) ?? "";
  return out;
}

function gitCommitStats(repoPath: string, shas: string[]): Map<string, { files: number; insertions: number; deletions: number }> {
  const map = new Map<string, { files: number; insertions: number; deletions: number }>();
  for (const sha of shas) {
    const out = safeRunGit(repoPath, ["show", "--numstat", "--format=", sha]);
    if (!out) continue;
    const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
    let files = 0,
      insertions = 0,
      deletions = 0;
    for (const line of lines) {
      const parsed = parseNumstat(line);
      if (!parsed) continue;
      files += parsed.files;
      insertions += parsed.insertions;
      deletions += parsed.deletions;
    }
    map.set(sha, { files, insertions, deletions });
  }
  return map;
}

/**
 * Main entry: detect inferred decisions from git commit history.
 */
export function detectInferredDecisionsFromGit(opts: DetectorGitOptions = {}): InferredDecisionProposal[] {
  const repoPath = opts.repoPath ?? DEFAULTS.repoPath;
  const since = opts.since ?? DEFAULTS.since;
  const maxCommits = opts.maxCommits ?? DEFAULTS.maxCommits;
  const withStats = opts.withStats ?? DEFAULTS.withStats;

  // Basic sanity: ensure we're in a git repo
  const isRepo = safeRunGit(repoPath, ["rev-parse", "--is-inside-work-tree"]);
  if (!isRepo) return [];

  const raw = gitLogRaw(repoPath, since, maxCommits);
  if (!raw) return [];

  const REC = "\u001e";
  const SEP = "\u001f";
  const records = raw.split(REC).map((r) => r.trim()).filter(Boolean);

  const commits = records
    .map((r) => r.split(SEP))
    .filter((p) => p.length >= 2)
    .map(([sha, subject, body = ""]) => ({ sha, subject: subject ?? "", body: body ?? "" }))
    .filter((c) => c.sha && c.subject);

  const statsMap = withStats ? gitCommitStats(repoPath, commits.map((c) => c.sha)) : new Map();

  const proposals: InferredDecisionProposal[] = [];

  for (const c of commits) {
    const subject = normalize(c.subject);
    const body = normalize(c.body);
    const { score, tags, chosen } = scoreCommit(subject, body);

    // Threshold: only propose if "decision-ish" enough
    if (score < 3) continue;

    const rationale = [
      `Heuristic score=${score}.`,
      tags.length ? `Matched tags: ${tags.join(", ")}.` : "",
      `This looks like a decision point rather than routine work.`,
    ]
      .filter(Boolean)
      .join(" ");

    const stats = withStats ? statsMap.get(c.sha) : undefined;

    const decision = buildDecisionFromCommit({
      sha: c.sha,
      subject,
      body,
      rationale,
      chosen,
      tags,
      stats,
    });

    proposals.push({
      decision,
      rationale,
      evidence: { sha: c.sha, subject, body: body || undefined, stats },
    });
  }

  // De-dup by (title + chosen) to reduce spam
  const seen = new Set<string>();
  const deduped: InferredDecisionProposal[] = [];
  for (const p of proposals) {
    const key = `${p.decision.title.toLowerCase()}::${p.decision.chosen.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  // Sort by confidence desc - already in git log order; keep stable
  return deduped;
}

/**
 * If user confirms an inferred decision, you can "promote" it to conscious by
 * creating a new record with the same decisionId, mode=conscious, higher confidence,
 * and supersedes pointing to inferred recordId.
 */
export function promoteToConscious(inferred: DecisionV1, overrides?: Partial<CreateDecisionInput>): DecisionV1 {
  return createDecisionV1({
    decisionId: inferred.decisionId,
    supersedes: inferred.recordId,
    title: inferred.title,
    options: inferred.options,
    chosen: inferred.chosen,
    context: inferred.context,
    reasoning: inferred.reasoning,
    links: inferred.links,
    scope: inferred.scope,
    mode: "conscious",
    confidence: 0.85,
    evidence: inferred.evidence,
    ...overrides,
  });
}
