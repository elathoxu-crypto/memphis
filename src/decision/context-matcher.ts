/**
 * Context Matcher - Model C Phase 2
 * 
 * Advanced context matching with knowledge graph integration.
 * 
 * @version 1.0.0
 * @created 2026-03-02
 */

import { DecisionContext, DecisionPattern } from './pattern-learner.js';
import { CurrentContext } from './context-analyzer.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ContextMatch {
  pattern: DecisionPattern;
  score: number;              // 0.0-1.0
  breakdown: {
    activity: number;         // Activity similarity
    time: number;             // Time similarity
    files: number;            // File pattern similarity
    branch: number;           // Branch similarity
    graph: number;            // Knowledge graph similarity
  };
  reason: string;             // Why this match
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  connections: string[];
  weight: number;
}

export interface MatcherConfig {
  weights: {
    activity: number;         // Weight for activity matching
    time: number;             // Weight for time matching
    files: number;            // Weight for file matching
    branch: number;           // Weight for branch matching
    graph: number;            // Weight for knowledge graph
  };
  minScore: number;           // Minimum score to consider a match
  graphBoost: number;         // Boost for graph-connected patterns
}

// ============================================================================
// CONTEXT MATCHER
// ============================================================================

export class ContextMatcher {
  private config: MatcherConfig;
  private knowledgeGraph: Map<string, GraphNode> = new Map();

  constructor(config?: Partial<MatcherConfig>) {
    this.config = {
      weights: config?.weights || {
        activity: 0.3,
        time: 0.15,
        files: 0.25,
        branch: 0.15,
        graph: 0.15,
      },
      minScore: config?.minScore || 0.5,
      graphBoost: config?.graphBoost || 0.2,
    };
  }

  /**
   * Match patterns to current context
   */
  matchPatterns(
    patterns: DecisionPattern[],
    currentContext: CurrentContext,
    patternContext: DecisionContext
  ): ContextMatch[] {
    const matches: ContextMatch[] = [];

    for (const pattern of patterns) {
      const match = this.calculateMatch(pattern, currentContext, patternContext);
      
      if (match.score >= this.config.minScore) {
        matches.push(match);
      }
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    return matches;
  }

  /**
   * Calculate match score for a pattern
   */
  private calculateMatch(
    pattern: DecisionPattern,
    currentContext: CurrentContext,
    patternContext: DecisionContext
  ): ContextMatch {
    const breakdown = {
      activity: this.matchActivity(patternContext, pattern.context),
      time: this.matchTime(patternContext, pattern.context),
      files: this.matchFiles(currentContext, pattern.context),
      branch: this.matchBranch(currentContext, pattern.context),
      graph: this.matchGraph(pattern),
    };

    // Calculate weighted score
    const weights = this.config.weights;
    const score = 
      breakdown.activity * weights.activity +
      breakdown.time * weights.time +
      breakdown.files * weights.files +
      breakdown.branch * weights.branch +
      breakdown.graph * weights.graph;

    // Generate reason
    const reason = this.generateReason(breakdown, score);

    return {
      pattern,
      score: Math.min(score, 1.0),
      breakdown,
      reason,
    };
  }

  /**
   * Match activity patterns
   */
  private matchActivity(current: DecisionContext, pattern: DecisionContext): number {
    if (!current.activity || !pattern.activity) return 0.5;

    const currentSet = new Set(current.activity);
    const patternSet = new Set(pattern.activity);

    const intersection = [...currentSet].filter(x => patternSet.has(x));
    const union = new Set([...currentSet, ...patternSet]);

    if (union.size === 0) return 0.5;

    return intersection.length / union.size;
  }

  /**
   * Match time patterns
   */
  private matchTime(current: DecisionContext, pattern: DecisionContext): number {
    if (current.timeOfDay === undefined || pattern.timeOfDay === undefined) {
      return 0.5;
    }

    const hourDiff = Math.abs(current.timeOfDay - pattern.timeOfDay);
    
    // Max 12 hours difference
    const score = Math.max(0, 1 - (hourDiff / 12));
    
    return score;
  }

  /**
   * Match file patterns
   */
  private matchFiles(current: CurrentContext, pattern: DecisionContext): number {
    if (!current.activeFiles || current.activeFiles.length === 0) {
      return 0.5;
    }

    if (!pattern.files || pattern.files.length === 0) {
      return 0.5;
    }

    // Check how many active files match pattern
    let matches = 0;
    for (const file of current.activeFiles) {
      for (const patternFile of pattern.files) {
        if (this.fileMatchesPattern(file, patternFile)) {
          matches++;
          break;
        }
      }
    }

    return matches / current.activeFiles.length;
  }

  /**
   * Check if file matches pattern (e.g., src/api/users.ts → src/api/*.ts)
   */
  private fileMatchesPattern(file: string, pattern: string): boolean {
    // Convert glob to regex
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regex}$`).test(file);
  }

  /**
   * Match branch patterns
   */
  private matchBranch(current: CurrentContext, pattern: DecisionContext): number {
    if (!current.branch || current.branch === 'unknown') {
      return 0.5;
    }

    if (!pattern.branches || pattern.branches.length === 0) {
      return 0.5;
    }

    // Check if current branch matches any pattern branch
    for (const patternBranch of pattern.branches) {
      if (this.branchMatches(current.branch, patternBranch)) {
        return 1.0;
      }
    }

    return 0.0;
  }

  /**
   * Check if branch matches pattern (e.g., feature/user-api → feature/*)
   */
  private branchMatches(branch: string, pattern: string): boolean {
    if (pattern === '*' || branch === pattern) {
      return true;
    }

    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return branch.startsWith(prefix + '/');
    }

    return false;
  }

  /**
   * Match using knowledge graph
   */
  private matchGraph(pattern: DecisionPattern): number {
    // TODO: Integrate with knowledge graph from Phase 6
    // For now, return neutral score
    return 0.5;
  }

  /**
   * Generate human-readable reason for match
   */
  private generateReason(breakdown: ContextMatch['breakdown'], score: number): string {
    const parts: string[] = [];

    if (breakdown.activity >= 0.7) {
      parts.push('similar activity');
    }

    if (breakdown.time >= 0.8) {
      parts.push('similar time of day');
    }

    if (breakdown.files >= 0.7) {
      parts.push('working on similar files');
    }

    if (breakdown.branch >= 0.9) {
      parts.push('same branch pattern');
    }

    if (parts.length === 0) {
      return 'weak match';
    }

    const confidence = score >= 0.8 ? 'Strong' : score >= 0.6 ? 'Moderate' : 'Weak';
    return `${confidence} match: ${parts.join(', ')}`;
  }

  /**
   * Load knowledge graph (for future integration)
   */
  loadKnowledgeGraph(nodes: GraphNode[]): void {
    this.knowledgeGraph.clear();
    for (const node of nodes) {
      this.knowledgeGraph.set(node.id, node);
    }
  }

  /**
   * Get related patterns from knowledge graph
   */
  getRelatedPatterns(pattern: DecisionPattern): string[] {
    const related: string[] = [];

    // Check if pattern has graph nodes
    if (!pattern.prediction.evidence) return related;

    for (const evidenceId of pattern.prediction.evidence) {
      const node = this.knowledgeGraph.get(evidenceId);
      if (node) {
        related.push(...node.connections);
      }
    }

    return [...new Set(related)];
  }

  /**
   * Get match statistics
   */
  getStats(matches: ContextMatch[]): {
    total: number;
    strong: number;      // score >= 0.8
    moderate: number;    // score >= 0.6
    weak: number;        // score < 0.6
    avgScore: number;
  } {
    return {
      total: matches.length,
      strong: matches.filter(m => m.score >= 0.8).length,
      moderate: matches.filter(m => m.score >= 0.6 && m.score < 0.8).length,
      weak: matches.filter(m => m.score < 0.6).length,
      avgScore: matches.length > 0 
        ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length 
        : 0,
    };
  }

  /**
   * Format matches for display
   */
  formatMatches(matches: ContextMatch[], maxDisplay: number = 5): string {
    if (matches.length === 0) {
      return 'No pattern matches found.';
    }

    const lines: string[] = [];
    lines.push(`Found ${matches.length} matching patterns:\n`);

    for (let i = 0; i < Math.min(matches.length, maxDisplay); i++) {
      const match = matches[i];
      const emoji = match.score >= 0.8 ? '🟢' : match.score >= 0.6 ? '🟡' : '🔴';
      
      lines.push(`${i + 1}. ${emoji} [${(match.score * 100).toFixed(0)}%] ${match.pattern.prediction.title}`);
      lines.push(`   ${match.reason}`);
      lines.push(`   Activity: ${(match.breakdown.activity * 100).toFixed(0)}% | Time: ${(match.breakdown.time * 100).toFixed(0)}% | Files: ${(match.breakdown.files * 100).toFixed(0)}%`);
      lines.push('');
    }

    if (matches.length > maxDisplay) {
      lines.push(`... and ${matches.length - maxDisplay} more matches`);
    }

    return lines.join('\n');
  }
}
