/**
 * Context Analyzer - Model C
 * 
 * Analyzes current work context to match against learned patterns.
 * 
 * @version 1.0.0
 * @created 2026-03-02
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { DecisionContext } from './pattern-learner.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CurrentContext {
  activeFiles: string[];      // Recently edited files (last 1h)
  branch: string;             // Current git branch
  recentCommits: Commit[];    // Commits in last 24h
  recentDecisions: Decision[]; // Decisions in last 7 days
  relatedNodes: GraphNode[];  // Knowledge graph context
  timeOfDay: number;          // 0-23
  dayOfWeek: number;          // 0-6
  workingDirectory: string;   // Current directory
}

export interface Commit {
  hash: string;
  message: string;
  timestamp: Date;
  files: string[];
}

export interface Decision {
  id: string;
  title: string;
  timestamp: Date;
  tags: string[];
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  connections: number;
}

export interface ContextAnalysisConfig {
  recentFilesMinutes: number;  // How far back to check files (default: 60)
  recentCommitsHours: number;  // How far back to check commits (default: 24)
  recentDecisionsDays: number; // How far back to check decisions (default: 7)
  maxActiveFiles: number;      // Max files to track (default: 20)
}

// ============================================================================
// CONTEXT ANALYZER
// ============================================================================

export class ContextAnalyzer {
  private config: ContextAnalysisConfig;
  private cache: CurrentContext | null = null;
  private cacheTime: number = 0;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(config?: Partial<ContextAnalysisConfig>) {
    this.config = {
      recentFilesMinutes: config?.recentFilesMinutes || 60,
      recentCommitsHours: config?.recentCommitsHours || 24,
      recentDecisionsDays: config?.recentDecisionsDays || 7,
      maxActiveFiles: config?.maxActiveFiles || 20,
    };
  }

  /**
   * Analyze current context (cached)
   */
  async analyzeCurrentContext(): Promise<CurrentContext> {
    const now = Date.now();
    
    // Return cached if fresh
    if (this.cache && (now - this.cacheTime) < this.cacheTTL) {
      return this.cache;
    }

    // Analyze fresh
    this.cache = await this.analyzeFresh();
    this.cacheTime = now;
    
    return this.cache;
  }

  /**
   * Force fresh analysis
   */
  async analyzeFresh(): Promise<CurrentContext> {
    const now = new Date();
    
    return {
      activeFiles: this.getActiveFiles(),
      branch: this.getCurrentBranch(),
      recentCommits: this.getRecentCommits(),
      recentDecisions: [], // TODO: Load from chain
      relatedNodes: [], // TODO: Load from knowledge graph
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      workingDirectory: process.cwd(),
    };
  }

  /**
   * Get recently edited files
   */
  private getActiveFiles(): string[] {
    try {
      const cutoff = new Date();
      cutoff.setMinutes(cutoff.getMinutes() - this.config.recentFilesMinutes);
      
      const files: string[] = [];
      
      // Use find to get recently modified files
      const findCmd = `find . -type f -mmin -${this.config.recentFilesMinutes} -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -${this.config.maxActiveFiles}`;
      
      const result = execSync(findCmd, { 
        encoding: 'utf-8',
        timeout: 5000,
      });
      
      const lines = result.trim().split('\n').filter(l => l.length > 0);
      
      return lines.map(l => l.replace(/^\.\//, ''));
    } catch (error) {
      // If find fails, return empty
      return [];
    }
  }

  /**
   * Get current git branch
   */
  private getCurrentBranch(): string {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        timeout: 2000,
      }).trim();
      
      return branch;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get recent commits
   */
  private getRecentCommits(): Commit[] {
    try {
      const since = new Date();
      since.setHours(since.getHours() - this.config.recentCommitsHours);
      
      const logFormat = '%H|%s|%ct';
      const logCmd = `git log --since="${since.toISOString()}" --pretty=format:"${logFormat}" --name-only`;
      
      const result = execSync(logCmd, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      
      const commits: Commit[] = [];
      const lines = result.trim().split('\n');
      
      let currentCommit: Commit | null = null;
      
      for (const line of lines) {
        if (line.includes('|')) {
          // Commit header
          const [hash, message, timestamp] = line.split('|');
          currentCommit = {
            hash,
            message,
            timestamp: new Date(parseInt(timestamp) * 1000),
            files: [],
          };
          commits.push(currentCommit);
        } else if (line.trim() && currentCommit) {
          // File in commit
          currentCommit.files.push(line.trim());
        }
      }
      
      return commits;
    } catch (error) {
      return [];
    }
  }

  /**
   * Convert current context to pattern context
   */
  toPatternContext(current: CurrentContext): DecisionContext {
    return {
      files: this.generalizeFiles(current.activeFiles),
      branches: this.generalizeBranch(current.branch),
      activity: this.inferActivity(current),
      timeOfDay: current.timeOfDay,
      dayOfWeek: current.dayOfWeek,
      recentCommits: current.recentCommits.length,
      recentDecisions: current.recentDecisions.length,
    };
  }

  /**
   * Generalize file paths (e.g., src/api/users.ts → src/api/*.ts)
   */
  private generalizeFiles(files: string[]): string[] {
    const patterns = new Set<string>();
    
    for (const file of files) {
      // Extract directory pattern
      const parts = file.split('/');
      
      if (parts.length >= 2) {
        // Keep directory structure, generalize filename
        const dir = parts.slice(0, -1).join('/');
        const ext = path.extname(file);
        patterns.add(`${dir}/*${ext}`);
      }
    }
    
    return Array.from(patterns);
  }

  /**
   * Generalize branch name (e.g., feature/user-api → feature/*)
   */
  private generalizeBranch(branch: string): string[] {
    if (branch === 'master' || branch === 'main' || branch === 'unknown') {
      return [branch];
    }

    // Extract prefix
    const parts = branch.split('/');
    if (parts.length > 1) {
      return [`${parts[0]}/*`];
    }

    return [branch];
  }

  /**
   * Infer activity type from context
   */
  private inferActivity(context: CurrentContext): string[] {
    const activities = new Set<string>();
    
    // From branch name
    if (context.branch.startsWith('feature/')) {
      activities.add('new-feature');
    } else if (context.branch.startsWith('fix/')) {
      activities.add('bugfix');
    } else if (context.branch.startsWith('refactor/')) {
      activities.add('refactor');
    } else if (context.branch.startsWith('docs/')) {
      activities.add('docs');
    } else if (context.branch.startsWith('test/')) {
      activities.add('test');
    }

    // From recent commits
    for (const commit of context.recentCommits) {
      const msg = commit.message.toLowerCase();
      
      if (msg.includes('add') || msg.includes('create')) {
        activities.add('new-feature');
      }
      if (msg.includes('fix') || msg.includes('bug')) {
        activities.add('bugfix');
      }
      if (msg.includes('refactor') || msg.includes('clean')) {
        activities.add('refactor');
      }
      if (msg.includes('test')) {
        activities.add('test');
      }
      if (msg.includes('doc')) {
        activities.add('docs');
      }
    }

    // From file patterns
    for (const file of context.activeFiles) {
      if (file.includes('/api/') || file.includes('/routes/')) {
        activities.add('api');
      }
      if (file.includes('/ui/') || file.includes('/components/')) {
        activities.add('ui');
      }
      if (file.includes('/backend/') || file.includes('/server/')) {
        activities.add('backend');
      }
      if (file.includes('.test.') || file.includes('.spec.')) {
        activities.add('test');
      }
    }

    return Array.from(activities);
  }

  /**
   * Get context summary (for display)
   */
  getContextSummary(context: CurrentContext): string {
    const parts: string[] = [];

    if (context.activeFiles.length > 0) {
      parts.push(`${context.activeFiles.length} files`);
    }

    if (context.branch !== 'unknown') {
      parts.push(`branch: ${context.branch}`);
    }

    if (context.recentCommits.length > 0) {
      parts.push(`${context.recentCommits.length} commits today`);
    }

    const timeDesc = this.getTimeDescription(context.timeOfDay);
    parts.push(timeDesc);

    return parts.join(' | ');
  }

  /**
   * Get time description
   */
  private getTimeDescription(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTime = 0;
  }
}
