/**
 * Prediction Engine - Model C
 * 
 * Generates predictions based on learned patterns and current context.
 * 
 * @version 1.0.0
 * @created 2026-03-02
 */

import { PatternLearner, DecisionPattern, Prediction, DecisionContext } from './pattern-learner.js';
import { ContextAnalyzer, CurrentContext } from './context-analyzer.js';
import { ContextMatcher, ContextMatch } from './context-matcher.js';

// ============================================================================
// TYPES
// ============================================================================

export interface PredictionConfig {
  minConfidence: number;      // Minimum confidence to show (default: 0.6)
  maxPredictions: number;     // Max predictions to return (default: 5)
  recencyBoost: number;       // Boost for recent patterns (default: 0.1)
  diversityThreshold: number; // Avoid similar predictions (default: 0.8)
}

export interface PredictionResult {
  predictions: Prediction[];
  context: CurrentContext;
  patternContext: DecisionContext;
  stats: {
    patternsMatched: number;
    patternsTotal: number;
    avgConfidence: number;
  };
}

// ============================================================================
// PREDICTION ENGINE
// ============================================================================

export class PredictionEngine {
  private learner: PatternLearner;
  private analyzer: ContextAnalyzer;
  private matcher: ContextMatcher;
  private config: PredictionConfig;

  constructor(
    learner: PatternLearner,
    analyzer: ContextAnalyzer,
    config?: Partial<PredictionConfig>
  ) {
    this.learner = learner;
    this.analyzer = analyzer;
    this.matcher = new ContextMatcher({
      weights: {
        activity: 0.3,
        time: 0.15,
        files: 0.25,
        branch: 0.15,
        graph: 0.15,
      },
      minScore: 0.5,
    });
    this.config = {
      minConfidence: config?.minConfidence || 0.6,
      maxPredictions: config?.maxPredictions || 5,
      recencyBoost: config?.recencyBoost || 0.1,
      diversityThreshold: config?.diversityThreshold || 0.8,
    };
  }

  /**
   * Generate predictions for current context
   */
  async predict(): Promise<PredictionResult> {
    // 1. Analyze current context
    const currentContext = await this.analyzer.analyzeCurrentContext();
    const patternContext = this.analyzer.toPatternContext(currentContext);

    // 2. Get all patterns
    const patterns = this.learner.getPatterns();

    // 3. Match patterns to context (using advanced matcher)
    const matches = this.matcher.matchPatterns(patterns, currentContext, patternContext);

    // 4. Score and rank predictions
    const predictions = this.scorePredictions(matches);

    // 5. Filter and diversify
    const filtered = this.filterAndDiversify(predictions);

    return {
      predictions: filtered,
      context: currentContext,
      patternContext,
      stats: {
        patternsMatched: matches.length,
        patternsTotal: patterns.length,
        avgConfidence: filtered.length > 0 
          ? filtered.reduce((sum, p) => sum + p.confidence, 0) / filtered.length 
          : 0,
      },
    };
  }

  /**
   * Match patterns to current context
   */
  private matchPatterns(
    patterns: DecisionPattern[],
    context: DecisionContext
  ): DecisionPattern[] {
    const matched: DecisionPattern[] = [];

    for (const pattern of patterns) {
      const similarity = this.calculateContextSimilarity(context, pattern.context);
      
      if (similarity >= 0.5) { // Loose match threshold
        matched.push(pattern);
      }
    }

    return matched;
  }

  /**
   * Calculate context similarity (0.0-1.0)
   */
  private calculateContextSimilarity(a: DecisionContext, b: DecisionContext): number {
    let score = 0;
    let weights = 0;

    // Activity similarity (weight: 3)
    if (a.activity && b.activity) {
      const overlap = a.activity.filter((x: string) => b.activity!.includes(x));
      const union = [...new Set([...a.activity, ...b.activity])];
      score += (overlap.length / union.length) * 3;
      weights += 3;
    }

    // Time similarity (weight: 1)
    if (a.timeOfDay !== undefined && b.timeOfDay !== undefined) {
      const timeDiff = Math.abs(a.timeOfDay - b.timeOfDay);
      const timeScore = Math.max(0, 1 - (timeDiff / 12)); // Max 12h difference
      score += timeScore;
      weights += 1;
    }

    // Day similarity (weight: 1)
    if (a.dayOfWeek !== undefined && b.dayOfWeek !== undefined) {
      const bothWeekend = (a.dayOfWeek === 0 || a.dayOfWeek === 6) && 
                          (b.dayOfWeek === 0 || b.dayOfWeek === 6);
      const bothWeekday = (a.dayOfWeek >= 1 && a.dayOfWeek <= 5) && 
                          (b.dayOfWeek >= 1 && b.dayOfWeek <= 5);
      
      if (bothWeekend || bothWeekday) {
        score += 1;
      }
      weights += 1;
    }

    // Recent activity similarity (weight: 2)
    if (a.recentCommits !== undefined && b.recentCommits !== undefined) {
      const commitDiff = Math.abs(a.recentCommits - b.recentCommits);
      const commitScore = Math.max(0, 1 - (commitDiff / 5)); // Max 5 commits diff
      score += commitScore * 2;
      weights += 2;
    }

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Score predictions from matches
   */
  private scorePredictions(matches: ContextMatch[]): Prediction[] {
    const predictions: Prediction[] = [];

    for (const match of matches) {
      const pattern = match.pattern;
      
      // Calculate confidence
      let confidence = pattern.prediction.confidence;

      // Boost for match score
      confidence *= (0.5 + match.score * 0.5); // Scale by match quality

      // Boost for recency
      const daysSinceLast = this.daysSince(pattern.lastSeen);
      if (daysSinceLast < 7) {
        confidence += this.config.recencyBoost * (1 - daysSinceLast / 7);
      }

      // Adjust by pattern accuracy
      if (pattern.accuracy !== undefined) {
        confidence *= (1 - this.config.diversityThreshold) + 
                      (pattern.accuracy * this.config.diversityThreshold);
      }

      // Boost for high-confidence evidence
      if (pattern.prediction.evidence.length >= 5) {
        confidence += 0.05;
      }

      // Cap at 0.95 (predictions never 100%)
      confidence = Math.min(confidence, 0.95);

      predictions.push({
        type: pattern.prediction.type,
        title: pattern.prediction.title,
        confidence: Math.round(confidence * 1000) / 1000, // Round to 3 decimals
        basedOn: pattern.prediction.evidence.slice(0, 5),
        evidence: this.getEvidenceDescriptions(pattern, match),
        pattern,
      });
    }

    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);

    return predictions;
  }

  /**
   * Get evidence descriptions
   */
  private getEvidenceDescriptions(pattern: DecisionPattern, match: ContextMatch): string[] {
    // Return simplified evidence with match reason
    return [
      `${pattern.occurrences} similar decisions`,
      pattern.accuracy 
        ? `${Math.round(pattern.accuracy * 100)}% accuracy`
        : 'New pattern',
      match.reason,
    ];
  }

  /**
   * Filter and diversify predictions
   */
  private filterAndDiversify(predictions: Prediction[]): Prediction[] {
    // 1. Filter by minimum confidence
    let filtered = predictions.filter(p => p.confidence >= this.config.minConfidence);

    // 2. Diversify (avoid similar predictions)
    const diversified: Prediction[] = [];
    
    for (const prediction of filtered) {
      // Check if too similar to existing
      const tooSimilar = diversified.some(existing => 
        this.calculateTitleSimilarity(existing.title, prediction.title) >= 
        this.config.diversityThreshold
      );

      if (!tooSimilar) {
        diversified.push(prediction);
      }

      // Stop when we have enough
      if (diversified.length >= this.config.maxPredictions) {
        break;
      }
    }

    return diversified;
  }

  /**
   * Calculate title similarity (0.0-1.0)
   */
  private calculateTitleSimilarity(a: string, b: string): number {
    const aWords = a.toLowerCase().split(/\s+/);
    const bWords = b.toLowerCase().split(/\s+/);
    
    const overlap = aWords.filter(w => bWords.includes(w));
    const union = [...new Set([...aWords, ...bWords])];
    
    return overlap.length / union.length;
  }

  /**
   * Calculate days since date
   */
  private daysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    return diff / (1000 * 60 * 60 * 24);
  }

  /**
   * Format predictions for display
   */
  formatPredictions(result: PredictionResult): string {
    const lines: string[] = [];
    
    lines.push('🔮 PREDICTED DECISIONS');
    lines.push('');
    
    if (result.predictions.length === 0) {
      lines.push('No predictions available yet.');
      lines.push('');
      lines.push('💡 Keep making decisions to train the prediction engine!');
      return lines.join('\n');
    }

    lines.push(`Based on your current work (${result.context.activeFiles.length} files, ${result.context.recentCommits.length} commits today):`);
    lines.push('');

    for (let i = 0; i < result.predictions.length; i++) {
      const pred = result.predictions[i];
      const emoji = pred.confidence >= 0.8 ? '🟢' : 
                    pred.confidence >= 0.7 ? '🟡' : '🔴';
      
      lines.push(`${i + 1}. ${emoji} [${(pred.confidence * 100).toFixed(0)}%] ${pred.title}`);
      lines.push(`   Type: ${pred.type}`);
      lines.push(`   Evidence: ${pred.evidence.join(', ')}`);
      lines.push('');
    }

    lines.push(`📊 Stats: ${result.stats.patternsMatched}/${result.stats.patternsTotal} patterns matched`);
    lines.push(`   Avg confidence: ${(result.stats.avgConfidence * 100).toFixed(0)}%`);

    return lines.join('\n');
  }
}
