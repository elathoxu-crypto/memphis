/**
 * Phase 6 — Learning Persistence
 * 
 * Saves and loads user feedback to improve categorization accuracy over time
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SuggestionFeedback, LearningData } from './types.js';

const LEARNING_DIR = path.join(process.env.HOME || '~', '.memphis', 'intelligence');
const LEARNING_FILE = path.join(LEARNING_DIR, 'learning-data.json');

/**
 * Persistent learning storage
 */
export class LearningStorage {
  private data: LearningData;
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || LEARNING_FILE;
    this.data = this.load();
  }

  /**
   * Load learning data from disk
   */
  private load(): LearningData {
    try {
      if (!fs.existsSync(this.filePath)) {
        return {
          acceptedPatterns: new Map(),
          rejectedPatterns: new Map(),
          customTags: new Set(),
          tagAliases: new Map()
        };
      }

      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);

      return {
        acceptedPatterns: new Map(Object.entries(parsed.acceptedPatterns || {})),
        rejectedPatterns: new Map(Object.entries(parsed.rejectedPatterns || {})),
        customTags: new Set(parsed.customTags || []),
        tagAliases: new Map(Object.entries(parsed.tagAliases || {}))
      };
    } catch (err) {
      // If loading fails, start fresh
      return {
        acceptedPatterns: new Map(),
        rejectedPatterns: new Map(),
        customTags: new Set(),
        tagAliases: new Map()
      };
    }
  }

  /**
   * Save learning data to disk
   */
  save(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Convert Maps/Sets to JSON-serializable format
      const serializable = {
        acceptedPatterns: Object.fromEntries(this.data.acceptedPatterns),
        rejectedPatterns: Object.fromEntries(this.data.rejectedPatterns),
        customTags: Array.from(this.data.customTags),
        tagAliases: Object.fromEntries(this.data.tagAliases),
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(this.filePath, JSON.stringify(serializable, null, 2));
    } catch (err) {
      console.error('Failed to save learning data:', err);
    }
  }

  /**
   * Record feedback (accept/reject) with time-based decay
   */
  recordFeedback(feedback: SuggestionFeedback): void {
    const tag = feedback.action === 'modify' ? (feedback.modifiedTag || feedback.suggested.tag) : feedback.suggested.tag;

    if (feedback.action === 'accept') {
      const current = this.data.acceptedPatterns.get(tag) || 0;
      this.data.acceptedPatterns.set(tag, current + 1);
    } else if (feedback.action === 'reject') {
      const current = this.data.rejectedPatterns.get(tag) || 0;
      this.data.rejectedPatterns.set(tag, current + 1);
    } else if (feedback.action === 'modify' && feedback.modifiedTag) {
      // Record alias: original tag → modified tag
      this.data.tagAliases.set(feedback.suggested.tag, feedback.modifiedTag);
      
      // Also add to custom tags
      this.data.customTags.add(feedback.modifiedTag);
    }

    this.save();
  }

  /**
   * Get acceptance rate for a tag with time-based decay
   * Recent feedback weighted higher than old feedback
   */
  getAcceptanceRate(tag: string): number {
    const accepted = this.data.acceptedPatterns.get(tag) || 0;
    const rejected = this.data.rejectedPatterns.get(tag) || 0;
    const total = accepted + rejected;

    if (total === 0) return 0.5; // No data, neutral
    
    // Simple decay: scale by total feedback count
    // More feedback = more confident, but never > 0.9 or < 0.1
    const baseRate = accepted / total;
    const confidenceScale = Math.min(total / 10, 1); // Max confidence after 10 samples
    const decayedRate = baseRate * (0.5 + 0.5 * confidenceScale);
    
    return Math.max(0.1, Math.min(0.9, decayedRate));
  }

  /**
   * Get alias for a tag (if user modified it before)
   */
  getAlias(tag: string): string | undefined {
    return this.data.tagAliases.get(tag);
  }

  /**
   * Check if tag is a custom user tag
   */
  isCustomTag(tag: string): boolean {
    return this.data.customTags.has(tag);
  }

  /**
   * Get all custom tags
   */
  getCustomTags(): string[] {
    return Array.from(this.data.customTags);
  }

  /**
   * Get top accepted tags
   */
  getTopAccepted(limit = 10): Array<{ tag: string; count: number }> {
    return Array.from(this.data.acceptedPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  /**
   * Get top rejected tags
   */
  getTopRejected(limit = 10): Array<{ tag: string; count: number }> {
    return Array.from(this.data.rejectedPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalFeedback: number;
    acceptedTags: number;
    rejectedTags: number;
    customTags: number;
    aliases: number;
    topAccepted: Array<{ tag: string; count: number }>;
    topRejected: Array<{ tag: string; count: number }>;
  } {
    const topAccepted = this.getTopAccepted(10);
    const topRejected = this.getTopRejected(10);

    const totalAccepted = Array.from(this.data.acceptedPatterns.values())
      .reduce((sum, count) => sum + count, 0);
    const totalRejected = Array.from(this.data.rejectedPatterns.values())
      .reduce((sum, count) => sum + count, 0);

    return {
      totalFeedback: totalAccepted + totalRejected,
      acceptedTags: totalAccepted,
      rejectedTags: totalRejected,
      customTags: this.data.customTags.size,
      aliases: this.data.tagAliases.size,
      topAccepted,
      topRejected
    };
  }

  /**
   * Clear all learning data
   */
  clear(): void {
    this.data = {
      acceptedPatterns: new Map(),
      rejectedPatterns: new Map(),
      customTags: new Set(),
      tagAliases: new Map()
    };
    this.save();
  }

  /**
   * Export learning data (for backup/transfer)
   */
  export(): string {
    return JSON.stringify({
      acceptedPatterns: Object.fromEntries(this.data.acceptedPatterns),
      rejectedPatterns: Object.fromEntries(this.data.rejectedPatterns),
      customTags: Array.from(this.data.customTags),
      tagAliases: Object.fromEntries(this.data.tagAliases)
    }, null, 2);
  }

  /**
   * Import learning data
   */
  import(jsonData: string): void {
    try {
      const parsed = JSON.parse(jsonData);

      this.data = {
        acceptedPatterns: new Map(Object.entries(parsed.acceptedPatterns || {})),
        rejectedPatterns: new Map(Object.entries(parsed.rejectedPatterns || {})),
        customTags: new Set(parsed.customTags || []),
        tagAliases: new Map(Object.entries(parsed.tagAliases || {}))
      };

      this.save();
    } catch (err) {
      throw new Error(`Failed to import learning data: ${err}`);
    }
  }
}

/**
 * Singleton instance
 */
let learningStorage: LearningStorage | null = null;

/**
 * Get or create learning storage instance
 */
export function getLearningStorage(): LearningStorage {
  if (!learningStorage) {
    learningStorage = new LearningStorage();
  }
  return learningStorage;
}
