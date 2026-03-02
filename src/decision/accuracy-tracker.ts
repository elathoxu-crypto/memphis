/**
 * Accuracy Tracker - Model C Phase 3
 * 
 * Tracks prediction accuracy and adjusts confidence accordingly.
 * 
 * @version 1.0.0
 * @created 2026-03-02
 */

import * as fs from 'fs';
import * as path from 'path';
import { DecisionPattern } from './pattern-learner.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AccuracyEvent {
  timestamp: Date;
  patternId: string;
  predictedTitle: string;
  accepted: boolean;
  userChoice?: string;           // If different from prediction
  confidence: number;
  context: string;               // Description of context when shown
}

export interface PatternAccuracy {
  patternId: string;
  totalPredictions: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;        // 0.0-1.0
  recentAccuracy: number;        // Last 10 predictions
  trend: 'improving' | 'declining' | 'stable';
  lastUpdated: Date;
}

export interface AccuracyStats {
  totalEvents: number;
  overallAccuracy: number;
  patternsTracked: number;
  improvingPatterns: number;
  decliningPatterns: number;
  topPerformers: PatternAccuracy[];
  needsWork: PatternAccuracy[];
}

export interface AccuracyTrackerConfig {
  historySize: number;           // How many events to keep (default: 1000)
  recencyWindow: number;         // How many recent events for "recent accuracy" (default: 10)
  decayRate: number;             // How fast old events decay (default: 0.1)
  minEventsForStats: number;     // Min events before showing stats (default: 5)
}

// ============================================================================
// ACCURACY TRACKER
// ============================================================================

export class AccuracyTracker {
  private events: AccuracyEvent[] = [];
  private accuracies: Map<string, PatternAccuracy> = new Map();
  private config: AccuracyTrackerConfig;
  private dataPath: string;

  constructor(
    memphisDir: string = process.env.MEMPHIS_DIR || path.join(process.env.HOME || '', '.memphis'),
    config?: Partial<AccuracyTrackerConfig>
  ) {
    this.config = {
      historySize: config?.historySize || 1000,
      recencyWindow: config?.recencyWindow || 10,
      decayRate: config?.decayRate || 0.1,
      minEventsForStats: config?.minEventsForStats || 5,
    };
    
    this.dataPath = path.join(memphisDir, 'accuracy.json');
    this.load();
  }

  /**
   * Record an accuracy event
   */
  record(event: Omit<AccuracyEvent, 'timestamp'>): void {
    const fullEvent: AccuracyEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add to history
    this.events.push(fullEvent);

    // Trim history if needed
    if (this.events.length > this.config.historySize) {
      this.events = this.events.slice(-this.config.historySize);
    }

    // Update pattern accuracy
    this.updatePatternAccuracy(fullEvent);

    // Save
    this.save();
  }

  /**
   * Update pattern accuracy stats
   */
  private updatePatternAccuracy(event: AccuracyEvent): void {
    const patternId = event.patternId;

    let accuracy = this.accuracies.get(patternId);

    if (!accuracy) {
      accuracy = {
        patternId,
        totalPredictions: 0,
        accepted: 0,
        rejected: 0,
        acceptanceRate: 0,
        recentAccuracy: 0,
        trend: 'stable',
        lastUpdated: new Date(),
      };
      this.accuracies.set(patternId, accuracy);
    }

    // Update counts
    accuracy.totalPredictions++;
    if (event.accepted) {
      accuracy.accepted++;
    } else {
      accuracy.rejected++;
    }

    // Update acceptance rate
    accuracy.acceptanceRate = accuracy.accepted / accuracy.totalPredictions;

    // Update recent accuracy (last N events for this pattern)
    const recentEvents = this.events
      .filter(e => e.patternId === patternId)
      .slice(-this.config.recencyWindow);
    
    const recentAccepted = recentEvents.filter(e => e.accepted).length;
    accuracy.recentAccuracy = recentAccepted / recentEvents.length;

    // Determine trend
    if (accuracy.totalPredictions >= 10) {
      const olderAccuracy = this.calculateOlderAccuracy(patternId, 10);
      const diff = accuracy.recentAccuracy - olderAccuracy;
      
      if (diff > 0.1) {
        accuracy.trend = 'improving';
      } else if (diff < -0.1) {
        accuracy.trend = 'declining';
      } else {
        accuracy.trend = 'stable';
      }
    }

    accuracy.lastUpdated = new Date();
  }

  /**
   * Calculate accuracy for older period
   */
  private calculateOlderAccuracy(patternId: string, skipRecent: number): number {
    const patternEvents = this.events
      .filter(e => e.patternId === patternId)
      .slice(0, -skipRecent);

    if (patternEvents.length === 0) return 0.5;

    const accepted = patternEvents.filter(e => e.accepted).length;
    return accepted / patternEvents.length;
  }

  /**
   * Get accuracy for a pattern
   */
  getPatternAccuracy(patternId: string): PatternAccuracy | undefined {
    return this.accuracies.get(patternId);
  }

  /**
   * Get overall stats
   */
  getStats(): AccuracyStats {
    const patterns = Array.from(this.accuracies.values());

    const improving = patterns.filter(p => p.trend === 'improving').length;
    const declining = patterns.filter(p => p.trend === 'declining').length;

    const sorted = patterns.sort((a, b) => b.acceptanceRate - a.acceptanceRate);
    
    const topPerformers = sorted.filter(p => p.totalPredictions >= this.config.minEventsForStats).slice(0, 5);
    const needsWork = sorted
      .filter(p => p.totalPredictions >= this.config.minEventsForStats && p.acceptanceRate < 0.5)
      .reverse()
      .slice(0, 5);

    const overallAccuracy = this.events.length > 0
      ? this.events.filter(e => e.accepted).length / this.events.length
      : 0;

    return {
      totalEvents: this.events.length,
      overallAccuracy,
      patternsTracked: patterns.length,
      improvingPatterns: improving,
      decliningPatterns: declining,
      topPerformers,
      needsWork,
    };
  }

  /**
   * Load from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
        
        this.events = data.events || [];
        
        this.accuracies = new Map(
          Object.entries(data.accuracies || {}).map(([k, v]) => [k, v as PatternAccuracy])
        );
      }
    } catch (error) {
      console.warn('Failed to load accuracy data:', error);
    }
  }

  /**
   * Save to disk
   */
  private save(): void {
    try {
      const data = {
        events: this.events,
        accuracies: Object.fromEntries(this.accuracies),
      };
      
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save accuracy data:', error);
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.events = [];
    this.accuracies.clear();
    this.save();
  }

  /**
   * Format stats for display
   */
  formatStats(stats: AccuracyStats): string {
    const lines: string[] = [];
    
    lines.push('📊 ACCURACY TRACKING\n');
    lines.push(`Total events: ${stats.totalEvents}`);
    lines.push(`Overall accuracy: ${(stats.overallAccuracy * 100).toFixed(0)}%`);
    lines.push(`Patterns tracked: ${stats.patternsTracked}`);
    lines.push('');

    if (stats.improvingPatterns > 0 || stats.decliningPatterns > 0) {
      lines.push(`📈 Improving: ${stats.improvingPatterns} | 📉 Declining: ${stats.decliningPatterns}`);
      lines.push('');
    }

    if (stats.topPerformers.length > 0) {
      lines.push('🏆 TOP PERFORMERS:\n');
      stats.topPerformers.forEach((p, i) => {
        lines.push(`${i + 1}. [${(p.acceptanceRate * 100).toFixed(0)}%] ${p.patternId}`);
        lines.push(`   ${p.totalPredictions} predictions, ${p.trend}`);
      });
      lines.push('');
    }

    if (stats.needsWork.length > 0) {
      lines.push('⚠️  NEEDS IMPROVEMENT:\n');
      stats.needsWork.forEach((p, i) => {
        lines.push(`${i + 1}. [${(p.acceptanceRate * 100).toFixed(0)}%] ${p.patternId}`);
        lines.push(`   ${p.totalPredictions} predictions, ${p.trend}`);
      });
    }

    return lines.join('\n');
  }
}
