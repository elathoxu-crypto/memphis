/**
 * Pattern Learning Engine - Model C
 * 
 * Learns decision patterns from Model A+B history
 * and generates predictive suggestions.
 * 
 * @version 1.0.0
 * @created 2026-03-02
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IStore } from '../memory/store.js';
import type { Block, BlockData } from '../memory/chain.js';

// Re-export Block as DecisionBlock for clarity
export type DecisionBlock = Block;

// ============================================================================
// TYPES
// ============================================================================

export interface DecisionContext {
  files?: string[];           // ["src/api/*.ts"]
  branches?: string[];        // ["feature/*"]
  activity?: string[];        // ["new-feature", "refactor"]
  timeOfDay?: number;         // 0-23
  dayOfWeek?: number;         // 0-6
  recentCommits?: number;     // Count in last 24h
  recentDecisions?: number;   // Count in last 7 days
}

export interface Prediction {
  type: 'strategic' | 'tactical' | 'technical';
  title: string;
  confidence: number;         // 0.0-0.95 (never 100%)
  basedOn: string[];          // Decision IDs
  evidence: string[];         // Short descriptions
  pattern: DecisionPattern;
}

export interface DecisionPattern {
  id: string;
  context: DecisionContext;
  prediction: {
    type: 'strategic' | 'tactical' | 'technical';
    title: string;
    confidence: number;
    evidence: string[];
  };
  occurrences: number;        // How often this pattern appears
  lastSeen: Date;
  accuracy?: number;          // How often prediction was correct
  totalPredictions?: number;
  correctPredictions?: number;
  created: Date;
  updated: Date;
}

export interface PatternLearningConfig {
  minOccurrences: number;     // Minimum to create pattern (default: 3)
  confidenceCap: number;      // Max confidence (default: 0.95)
  contextSimilarityThreshold: number;  // Min similarity to match (default: 0.7)
  recencyBoost: number;       // Boost for recent patterns (default: 0.1)
  accuracyWeight: number;     // How much accuracy affects confidence (default: 0.5)
}

// ============================================================================
// PATTERN STORAGE
// ============================================================================

export class PatternStorage {
  private patternsPath: string;
  private patterns: Map<string, DecisionPattern> = new Map();

  constructor(memphisDir: string = process.env.MEMPHIS_DIR || path.join(process.env.HOME || '', '.memphis')) {
    this.patternsPath = path.join(memphisDir, 'patterns.json');
    this.load();
  }

  load(): void {
    try {
      if (fs.existsSync(this.patternsPath)) {
        const data = JSON.parse(fs.readFileSync(this.patternsPath, 'utf-8'));
        this.patterns = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load patterns, starting fresh:', error);
      this.patterns = new Map();
    }
  }

  save(): void {
    try {
      const data = Object.fromEntries(this.patterns);
      fs.writeFileSync(this.patternsPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save patterns:', error);
    }
  }

  get(id: string): DecisionPattern | undefined {
    return this.patterns.get(id);
  }

  getAll(): DecisionPattern[] {
    return Array.from(this.patterns.values());
  }

  set(pattern: DecisionPattern): void {
    this.patterns.set(pattern.id, pattern);
    this.save();
  }

  delete(id: string): boolean {
    const result = this.patterns.delete(id);
    if (result) {
      this.save();
    }
    return result;
  }

  clear(): void {
    this.patterns.clear();
    this.save();
  }

  count(): number {
    return this.patterns.size;
  }
}

// ============================================================================
// PATTERN LEARNER
// ============================================================================

export class PatternLearner {
  private storage: PatternStorage;
  private store: IStore;
  private config: PatternLearningConfig;

  constructor(
    store: IStore,
    config?: Partial<PatternLearningConfig>
  ) {
    this.store = store;
    this.storage = new PatternStorage();
    this.config = {
      minOccurrences: config?.minOccurrences || 3,
      confidenceCap: config?.confidenceCap || 0.95,
      contextSimilarityThreshold: config?.contextSimilarityThreshold || 0.7,
      recencyBoost: config?.recencyBoost || 0.1,
      accuracyWeight: config?.accuracyWeight || 0.5,
    };
  }

  /**
   * Learn patterns from decision history
   */
  async learnFromHistory(sinceDays: number = 30): Promise<DecisionPattern[]> {
    const decisions = await this.getRecentDecisions(sinceDays);
    const newPatterns: DecisionPattern[] = [];

    console.log(`📚 Analyzing ${decisions.length} decisions...`);

    // Group decisions by similar context
    const contextGroups = this.groupBySimilarContext(decisions);

    console.log(`🔍 Found ${contextGroups.size} context groups`);

    // Create patterns from groups with enough occurrences
    for (const [contextKey, group] of contextGroups) {
      if (group.length >= this.config.minOccurrences) {
        const pattern = this.createPattern(contextKey, group);
        
        // Check if pattern already exists
        const existing = this.findSimilarPattern(pattern);
        if (existing) {
          // Update existing pattern
          existing.occurrences += group.length;
          existing.lastSeen = new Date();
          existing.updated = new Date();
          this.storage.set(existing);
        } else {
          // Save new pattern
          this.storage.set(pattern);
          newPatterns.push(pattern);
        }
      }
    }

    console.log(`✅ Created ${newPatterns.length} new patterns`);
    return newPatterns;
  }

  /**
   * Get recent decisions from chain
   */
  private async getRecentDecisions(sinceDays: number): Promise<DecisionBlock[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - sinceDays);

    try {
      const blocks = this.store.readChain('decisions');
      return blocks
        .filter((block: Block) => block.timestamp && new Date(block.timestamp) >= cutoff)
        .filter((block: Block) => block.data && block.data.type === 'decision') as DecisionBlock[];
    } catch (error) {
      // If chain doesn't exist, return empty
      return [];
    }
  }

  /**
   * Group decisions by similar context
   */
  private groupBySimilarContext(decisions: DecisionBlock[]): Map<string, DecisionBlock[]> {
    const groups = new Map<string, DecisionBlock[]>();

    for (const decision of decisions) {
      const context = this.extractContext(decision);
      const contextKey = this.contextToKey(context);

      if (!groups.has(contextKey)) {
        groups.set(contextKey, []);
      }
      groups.get(contextKey)!.push(decision);
    }

    return groups;
  }

  /**
   * Extract context from decision
   */
  private extractContext(decision: DecisionBlock): DecisionContext {
    const context: DecisionContext = {};

    // Extract from tags
    if (decision.data && decision.data.tags) {
      context.activity = decision.data.tags.filter((tag: string) => 
        ['new-feature', 'refactor', 'bugfix', 'docs', 'test', 'api', 'ui', 'backend'].includes(tag)
      );
    }

    // Extract from timestamp
    if (decision.timestamp) {
      const date = new Date(decision.timestamp);
      context.timeOfDay = date.getHours();
      context.dayOfWeek = date.getDay();
    }

    // Extract from content if it's a decision
    if (decision.data && decision.data.content) {
      try {
        const content = JSON.parse(decision.data.content);
        if (content.scope) {
          context.activity = context.activity || [];
          context.activity.push(content.scope);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    return context;
  }

  /**
   * Convert context to comparable key
   */
  private contextToKey(context: DecisionContext): string {
    const parts: string[] = [];

    if (context.activity && context.activity.length > 0) {
      parts.push(`activity:${context.activity.sort().join(',')}`);
    }

    if (context.timeOfDay !== undefined) {
      const timeSlot = Math.floor(context.timeOfDay / 4); // 0-5 slots
      parts.push(`time:${timeSlot}`);
    }

    if (context.dayOfWeek !== undefined) {
      const isWeekend = context.dayOfWeek === 0 || context.dayOfWeek === 6;
      parts.push(`weekend:${isWeekend}`);
    }

    return parts.join('|');
  }

  /**
   * Create pattern from decision group
   */
  private createPattern(contextKey: string, decisions: DecisionBlock[]): DecisionPattern {
    // Find most common decision in group
    const decisionCounts = new Map<string, number>();
    for (const decision of decisions) {
      let title = 'unknown';
      
      // Extract title from content
      if (decision.data && decision.data.content) {
        try {
          const content = JSON.parse(decision.data.content);
          title = content.title || 'unknown';
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      decisionCounts.set(title, (decisionCounts.get(title) || 0) + 1);
    }

    const mostCommon = Array.from(decisionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const id = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      context: this.keyToContext(contextKey),
      prediction: {
        type: this.inferDecisionType(mostCommon[0]),
        title: mostCommon[0],
        confidence: Math.min(
          (mostCommon[1] / decisions.length) * 0.85,
          this.config.confidenceCap
        ),
        evidence: decisions.slice(0, 5).map(d => d.hash || 'unknown'),
      },
      occurrences: decisions.length,
      lastSeen: new Date(),
      created: new Date(),
      updated: new Date(),
    };
  }

  /**
   * Convert key back to context
   */
  private keyToContext(key: string): DecisionContext {
    const context: DecisionContext = {};
    
    const parts = key.split('|');
    for (const part of parts) {
      const [type, value] = part.split(':');
      
      if (type === 'activity') {
        context.activity = value.split(',');
      } else if (type === 'time') {
        context.timeOfDay = parseInt(value) * 4;
      } else if (type === 'weekend') {
        // Already captured in timeOfDay
      }
    }

    return context;
  }

  /**
   * Infer decision type from title
   */
  private inferDecisionType(title: string): 'strategic' | 'tactical' | 'technical' {
    const strategic = ['direction', 'vision', 'roadmap', 'strategy', 'goal', 'mission'];
    const tactical = ['process', 'workflow', 'approach', 'method', 'plan'];
    
    const lower = title.toLowerCase();
    
    if (strategic.some(s => lower.includes(s))) return 'strategic';
    if (tactical.some(t => lower.includes(t))) return 'tactical';
    return 'technical';
  }

  /**
   * Find similar existing pattern
   */
  private findSimilarPattern(pattern: DecisionPattern): DecisionPattern | undefined {
    const existing = this.storage.getAll();
    
    for (const existingPattern of existing) {
      const similarity = this.calculateContextSimilarity(
        pattern.context,
        existingPattern.context
      );
      
      if (similarity >= this.config.contextSimilarityThreshold) {
        return existingPattern;
      }
    }

    return undefined;
  }

  /**
   * Calculate context similarity (0.0-1.0)
   */
  private calculateContextSimilarity(a: DecisionContext, b: DecisionContext): number {
    let score = 0;
    let weights = 0;

    // Activity similarity
    if (a.activity && b.activity) {
      const overlap = a.activity.filter(x => b.activity!.includes(x));
      const union = [...new Set([...a.activity, ...b.activity])];
      score += overlap.length / union.length;
      weights += 1;
    }

    // Time similarity
    if (a.timeOfDay !== undefined && b.timeOfDay !== undefined) {
      const timeDiff = Math.abs(a.timeOfDay - b.timeOfDay);
      const timeScore = 1 - (timeDiff / 24);
      score += timeScore;
      weights += 1;
    }

    // Day similarity
    if (a.dayOfWeek !== undefined && b.dayOfWeek !== undefined) {
      const bothWeekend = (a.dayOfWeek === 0 || a.dayOfWeek === 6) && 
                          (b.dayOfWeek === 0 || b.dayOfWeek === 6);
      const bothWeekday = (a.dayOfWeek >= 1 && a.dayOfWeek <= 5) && 
                          (b.dayOfWeek >= 1 && b.dayOfWeek <= 5);
      
      if (bothWeekend || bothWeekday) {
        score += 1;
        weights += 1;
      }
    }

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Get all patterns
   */
  getPatterns(): DecisionPattern[] {
    return this.storage.getAll();
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): DecisionPattern | undefined {
    return this.storage.get(id);
  }

  /**
   * Update pattern accuracy
   */
  updateAccuracy(patternId: string, correct: boolean): void {
    const pattern = this.storage.get(patternId);
    if (!pattern) return;

    pattern.totalPredictions = (pattern.totalPredictions || 0) + 1;
    if (correct) {
      pattern.correctPredictions = (pattern.correctPredictions || 0) + 1;
    }

    const total = pattern.totalPredictions;
    const correctCount = pattern.correctPredictions || 0;
    pattern.accuracy = total > 0 ? correctCount / total : 0;
    pattern.updated = new Date();

    this.storage.set(pattern);
  }

  /**
   * Get pattern statistics
   */
  getStats(): {
    totalPatterns: number;
    avgOccurrences: number;
    avgAccuracy: number | null;
    oldestPattern: Date | null;
    newestPattern: Date | null;
  } {
    const patterns = this.storage.getAll();
    
    if (patterns.length === 0) {
      return {
        totalPatterns: 0,
        avgOccurrences: 0,
        avgAccuracy: null,
        oldestPattern: null,
        newestPattern: null,
      };
    }

    const totalOccurrences = patterns.reduce((sum, p) => sum + p.occurrences, 0);
    const patternsWithAccuracy = patterns.filter(p => p.accuracy !== undefined);
    const totalAccuracy = patternsWithAccuracy.reduce((sum, p) => sum + (p.accuracy || 0), 0);

    return {
      totalPatterns: patterns.length,
      avgOccurrences: totalOccurrences / patterns.length,
      avgAccuracy: patternsWithAccuracy.length > 0 
        ? totalAccuracy / patternsWithAccuracy.length 
        : null,
      oldestPattern: patterns.reduce((oldest, p) => 
        oldest && oldest < p.created ? oldest : p.created, null as Date | null),
      newestPattern: patterns.reduce((newest, p) => 
        newest && newest > p.created ? newest : p.created, null as Date | null),
    };
  }
}
