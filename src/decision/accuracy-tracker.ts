/**
 * Accuracy Tracker - Model C Phase 4
 * 
 * Tracks prediction accuracy and adjusts pattern confidence.
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
  patternId: string;
  prediction: string;         // What was predicted
  actual: string;             // What user chose
  correct: boolean;
  timestamp: Date;
  context: string;            // Where prediction occurred
  confidence: number;         // Confidence at prediction time
}

export interface AccuracyStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  byPattern: Map<string, PatternAccuracy>;
  byConfidenceRange: Map<string, RangeAccuracy>;
  recentTrend: 'improving' | 'declining' | 'stable';
}

export interface PatternAccuracy {
  patternId: string;
  patternTitle: string;
  total: number;
  correct: number;
  accuracy: number;
  lastCorrect?: Date;
  lastIncorrect?: Date;
}

export interface RangeAccuracy {
  range: string;              // "70-80%", "80-90%", "90%+"
  total: number;
  correct: number;
  accuracy: number;
}

export interface AccuracyTrackerConfig {
  historySize: number;        // How many events to keep (default: 1000)
  decayFactor: number;        // How much to weight recent events (default: 0.95)
  minEventsForStats: number;  // Min events before reporting stats (default: 10)
}

// ============================================================================
// ACCURACY TRACKER
// ============================================================================

export class AccuracyTracker {
  private events: AccuracyEvent[] = [];
  private config: AccuracyTrackerConfig;
  private storagePath: string;

  constructor(
    memphisDir: string = process.env.MEMPHIS_DIR || path.join(process.env.HOME || '', '.memphis'),
    config?: Partial<AccuracyTrackerConfig>
  ) {
    this.config = {
      historySize: config?.historySize || 1000,
      decayFactor: config?.decayFactor || 0.95,
      minEventsForStats: config?.minEventsForStats || 10,
    };
    this.storagePath = path.join(memphisDir, 'accuracy.json');
    this.load();
  }

  /**
   * Record a prediction outcome
   */
  record(event: Omit<AccuracyEvent, 'timestamp'>): void {
    const fullEvent: AccuracyEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);
    
    // Trim old events
    if (this.events.length > this.config.historySize) {
      this.events = this.events.slice(-this.config.historySize);
    }

    this.save();
  }

  /**
   * Calculate overall accuracy statistics
   */
  calculateStats(): AccuracyStats {
    const totalPredictions = this.events.length;
    const correctPredictions = this.events.filter(e => e.correct).length;
    const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

    // By pattern
    const byPattern = new Map<string, PatternAccuracy>();
    for (const event of this.events) {
      if (!byPattern.has(event.patternId)) {
        byPattern.set(event.patternId, {
          patternId: event.patternId,
          patternTitle: event.prediction,
          total: 0,
          correct: 0,
          accuracy: 0,
        });
      }

      const stats = byPattern.get(event.patternId)!;
      stats.total++;
      if (event.correct) {
        stats.correct++;
        stats.lastCorrect = event.timestamp;
      } else {
        stats.lastIncorrect = event.timestamp;
      }
      stats.accuracy = stats.correct / stats.total;
    }

    // By confidence range
    const byConfidenceRange = new Map<string, RangeAccuracy>();
    const ranges = [
      { min: 0.0, max: 0.6, label: '0-60%' },
      { min: 0.6, max: 0.7, label: '60-70%' },
      { min: 0.7, max: 0.8, label: '70-80%' },
      { min: 0.8, max: 0.9, label: '80-90%' },
      { min: 0.9, max: 1.0, label: '90%+' },
    ];

    for (const range of ranges) {
      const rangeEvents = this.events.filter(
        e => e.confidence >= range.min && e.confidence < range.max
      );
      
      byConfidenceRange.set(range.label, {
        range: range.label,
        total: rangeEvents.length,
        correct: rangeEvents.filter(e => e.correct).length,
        accuracy: rangeEvents.length > 0 
          ? rangeEvents.filter(e => e.correct).length / rangeEvents.length 
          : 0,
      });
    }

    // Recent trend (last 20 events vs previous 20)
    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (this.events.length >= 40) {
      const recent = this.events.slice(-20);
      const previous = this.events.slice(-40, -20);
      
      const recentAccuracy = recent.filter(e => e.correct).length / recent.length;
      const previousAccuracy = previous.filter(e => e.correct).length / previous.length;
      
      if (recentAccuracy > previousAccuracy + 0.05) {
        recentTrend = 'improving';
      } else if (recentAccuracy < previousAccuracy - 0.05) {
        recentTrend = 'declining';
      }
    }

    return {
      totalPredictions,
      correctPredictions,
      accuracy,
      byPattern,
      byConfidenceRange,
      recentTrend,
    };
  }

  /**
   * Get accuracy for specific pattern
   */
  getPatternAccuracy(patternId: string): PatternAccuracy | null {
    const patternEvents = this.events.filter(e => e.patternId === patternId);
    
    if (patternEvents.length === 0) {
      return null;
    }

    return {
      patternId,
      patternTitle: patternEvents[0].prediction,
      total: patternEvents.length,
      correct: patternEvents.filter(e => e.correct).length,
      accuracy: patternEvents.filter(e => e.correct).length / patternEvents.length,
      lastCorrect: patternEvents.filter(e => e.correct).pop()?.timestamp,
      lastIncorrect: patternEvents.filter(e => !e.correct).pop()?.timestamp,
    };
  }

  /**
   * Get confidence calibration (predicted vs actual accuracy)
   */
  getCalibration(): Array<{
    confidenceRange: string;
    predictedConfidence: number;
    actualAccuracy: number;
    samples: number;
  }> {
    const bins = [
      { min: 0.6, max: 0.7, label: '60-70%' },
      { min: 0.7, max: 0.8, label: '70-80%' },
      { min: 0.8, max: 0.9, label: '80-90%' },
      { min: 0.9, max: 1.0, label: '90%+' },
    ];

    return bins.map(bin => {
      const binEvents = this.events.filter(
        e => e.confidence >= bin.min && e.confidence < bin.max
      );

      const predictedConfidence = (bin.min + bin.max) / 2;
      const actualAccuracy = binEvents.length > 0
        ? binEvents.filter(e => e.correct).length / binEvents.length
        : 0;

      return {
        confidenceRange: bin.label,
        predictedConfidence,
        actualAccuracy,
        samples: binEvents.length,
      };
    });
  }

  /**
   * Load events from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
        this.events = data.events || [];
      }
    } catch (error) {
      console.warn('Failed to load accuracy events:', error);
      this.events = [];
    }
  }

  /**
   * Save events to disk
   */
  private save(): void {
    try {
      const data = { events: this.events };
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save accuracy events:', error);
    }
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.save();
  }

  /**
   * Export events as JSON
   */
  export(): string {
    return JSON.stringify({
      events: this.events,
      stats: this.calculateStats(),
      calibration: this.getCalibration(),
    }, null, 2);
  }
}
