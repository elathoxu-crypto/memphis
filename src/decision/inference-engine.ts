/**
 * Decision Inference Engine (Simplified)
 * 
 * Detects decisions from git commits, branches, and file changes
 */

import { execSync } from "child_process";
import { log } from "../utils/logger.js";
import {
  COMMIT_PATTERNS,
  BRANCH_PATTERNS,
  FILE_PATTERNS,
} from "./patterns.js";

export interface InferredDecision {
  title: string;
  confidence: number;
  evidence: string;
  type: "strategic" | "tactical" | "technical";
  category: string;
  suggested: boolean;
  createdAt: string;
}

export class DecisionInferenceEngine {
  private repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
  }

  /**
   * Main entry point: detect all inferred decisions
   */
  async detectDecisions(sinceDays: number = 7): Promise<InferredDecision[]> {
    const allDecisions: InferredDecision[] = [];

    // Analyze commits
    const commitDecisions = this.analyzeCommits(sinceDays);
    allDecisions.push(...commitDecisions);

    // Analyze branches
    const branchDecisions = this.analyzeBranches();
    allDecisions.push(...branchDecisions);

    // Deduplicate and sort by confidence
    const deduped = this.deduplicateDecisions(allDecisions);
    deduped.sort((a, b) => b.confidence - a.confidence);

    return deduped;
  }

  /**
   * Analyze recent commits for decision patterns
   */
  analyzeCommits(sinceDays: number = 7): InferredDecision[] {
    const decisions: InferredDecision[] = [];

    try {
      // Get commits from last N days
      const since = new Date();
      since.setDate(since.getDate() - sinceDays);
      const sinceStr = since.toISOString().split("T")[0];

      const output = execSync(
        `git log --since="${sinceStr}" --pretty=format:"%H|%s" --no-merges`,
        { cwd: this.repoPath, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );

      const commits = output.trim().split("\n").filter(Boolean);

      for (const commit of commits) {
        const [hash, message] = commit.split("|");

        // Try each pattern
        for (const pattern of COMMIT_PATTERNS) {
          const match = message.match(pattern.regex);

          if (match) {
            const title = pattern.template.replace("{1}", match[1]);
            const confidence = pattern.confidence;
            const evidence = `commit ${hash.substring(0, 7)}: ${message}`;

            decisions.push({
              title,
              confidence: this.adjustConfidence(confidence),
              evidence,
              type: pattern.type,
              category: pattern.category,
              suggested: false,
              createdAt: new Date().toISOString(),
            });

            // Only use first matching pattern per commit
            break;
          }
        }
      }
    } catch (error) {
      log.debug(`Could not analyze commits: ${error}`);
    }

    return decisions;
  }

  /**
   * Analyze branches for decision patterns
   */
  analyzeBranches(): InferredDecision[] {
    const decisions: InferredDecision[] = [];

    try {
      // Get recently deleted branches
      const deletedBranches = this.getDeletedBranches();
      for (const branch of deletedBranches) {
        const pattern = BRANCH_PATTERNS.find((p) => p.pattern === "deleted");
        if (pattern) {
          const title = pattern.template.replace("{branchName}", branch);
          const evidence = `branch ${branch}`;

          decisions.push({
            title,
            confidence: pattern.confidence,
            evidence,
            type: "tactical",
            category: pattern.category,
            suggested: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Get recently merged branches
      const mergedBranches = this.getMergedBranches();
      for (const branch of mergedBranches.slice(0, 5)) {
        const pattern = BRANCH_PATTERNS.find((p) => p.pattern === "merged");
        if (pattern) {
          const title = pattern.template.replace("{branchName}", branch);
          const evidence = `branch ${branch}`;

          decisions.push({
            title,
            confidence: pattern.confidence,
            evidence,
            type: "tactical",
            category: pattern.category,
            suggested: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      log.debug(`Could not analyze branches: ${error}`);
    }

    return decisions;
  }

  /**
   * Get recently deleted branches from reflog
   */
  private getDeletedBranches(): string[] {
    try {
      const output = execSync(
        'git reflog --pretty=format:"%gs" | grep "deleted:" | head -10',
        { cwd: this.repoPath, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );

      return output
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const match = line.match(/deleted: (.+)/);
          return match ? match[1].trim() : null;
        })
        .filter(Boolean) as string[];
    } catch {
      return [];
    }
  }

  /**
   * Get recently merged branches
   */
  private getMergedBranches(): string[] {
    try {
      const output = execSync(
        'git branch --merged master | grep -v "^[* ]*master$"',
        { cwd: this.repoPath, encoding: "utf-8", stdio: ["pipe", "pipe"] }
      );

      return output
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((b) => b.trim());
    } catch {
      return [];
    }
  }

  /**
   * Adjust confidence based on multiple evidence
   */
  private adjustConfidence(baseConfidence: number): number {
    // Cap at 0.85 (inferred decisions should never be 100% confident)
    return Math.min(baseConfidence * 1.1, 0.85);
  }

  /**
   * Deduplicate similar decisions
   */
  private deduplicateDecisions(decisions: InferredDecision[]): InferredDecision[] {
    const seen = new Map<string, InferredDecision>();

    for (const decision of decisions) {
      const key = decision.title.toLowerCase();
      if (!seen.has(key) || seen.get(key)!.confidence < decision.confidence) {
        seen.set(key, decision);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Get high-confidence decisions only
   */
  getHighConfidence(decisions: InferredDecision[], threshold: number = 0.5): InferredDecision[] {
    return decisions.filter((d) => d.confidence >= threshold);
  }
}
