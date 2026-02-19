import { type CreateDecisionInput, type DecisionV1 } from "./schema.js";
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
    since?: string;
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
        stats?: {
            files: number;
            insertions: number;
            deletions: number;
        };
    };
}
/**
 * Main entry: detect inferred decisions from git commit history.
 */
export declare function detectInferredDecisionsFromGit(opts?: DetectorGitOptions): InferredDecisionProposal[];
/**
 * If user confirms an inferred decision, you can "promote" it to conscious by
 * creating a new record with the same decisionId, mode=conscious, higher confidence,
 * and supersedes pointing to inferred recordId.
 */
export declare function promoteToConscious(inferred: DecisionV1, overrides?: Partial<CreateDecisionInput>): DecisionV1;
