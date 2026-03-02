/**
 * Proactive Suggester - Model C Phase 3
 * 
 * Proactively suggests predictions to user based on context.
 * 
 * @version 1.0.0
 * @created 2026-03-02
 */

import { PredictionEngine, PredictionResult, Prediction } from './prediction-engine.js';
import { ContextAnalyzer, CurrentContext } from './context-analyzer.js';
import { PatternLearner } from './pattern-learner.js';

// ============================================================================
// TYPES
// ============================================================================

export interface Suggestion {
  prediction: Prediction;
  context: CurrentContext;
  timestamp: Date;
  shown: boolean;
  accepted: boolean | null;
  customChoice?: string;
}

export interface SuggesterConfig {
  minConfidence: number;      // Minimum confidence to show (default: 0.7)
  minInterval: number;        // Minimum minutes between suggestions (default: 30)
  maxSuggestions: number;     // Max suggestions per session (default: 3)
  channels: NotificationChannel[];
}

export type NotificationChannel = 'desktop' | 'terminal' | 'slack' | 'discord' | 'webhook';

export interface NotificationPayload {
  title: string;
  body: string;
  confidence: number;
  actions: string[];
  data?: any;
}

// ============================================================================
// PROACTIVE SUGGESTER
// ============================================================================

export class ProactiveSuggester {
  private engine: PredictionEngine;
  private analyzer: ContextAnalyzer;
  private learner: PatternLearner;
  private config: SuggesterConfig;
  private recentSuggestions: Suggestion[] = [];
  private lastSuggestionTime: number = 0;

  constructor(
    engine: PredictionEngine,
    analyzer: ContextAnalyzer,
    learner: PatternLearner,
    config?: Partial<SuggesterConfig>
  ) {
    this.engine = engine;
    this.analyzer = analyzer;
    this.learner = learner;
    this.config = {
      minConfidence: config?.minConfidence || 0.7,
      minInterval: config?.minInterval || 30,
      maxSuggestions: config?.maxSuggestions || 3,
      channels: config?.channels || ['terminal'],
    };
  }

  /**
   * Check if we should show suggestions
   */
  async checkAndSuggest(): Promise<Suggestion[] | null> {
    // Check cooldown
    const now = Date.now();
    const minutesSinceLast = (now - this.lastSuggestionTime) / 1000 / 60;
    
    if (minutesSinceLast < this.config.minInterval) {
      return null;
    }

    // Check max suggestions
    if (this.recentSuggestions.length >= this.config.maxSuggestions) {
      return null;
    }

    // Generate predictions
    const result = await this.engine.predict();
    
    // Filter by confidence
    const highConfidence = result.predictions.filter(
      p => p.confidence >= this.config.minConfidence
    );

    if (highConfidence.length === 0) {
      return null;
    }

    // Create suggestions
    const suggestions: Suggestion[] = highConfidence.slice(0, 3).map(prediction => ({
      prediction,
      context: result.context,
      timestamp: new Date(),
      shown: false,
      accepted: null,
    }));

    // Send notifications
    await this.sendNotifications(suggestions);

    // Update state
    this.lastSuggestionTime = now;
    this.recentSuggestions.push(...suggestions);

    return suggestions;
  }

  /**
   * Send notifications to configured channels
   */
  private async sendNotifications(suggestions: Suggestion[]): Promise<void> {
    for (const channel of this.config.channels) {
      for (const suggestion of suggestions) {
        const payload = this.createNotificationPayload(suggestion);
        
        try {
          await this.sendToChannel(channel, payload);
          suggestion.shown = true;
        } catch (error) {
          console.error(`Failed to send ${channel} notification:`, error);
        }
      }
    }
  }

  /**
   * Create notification payload
   */
  private createNotificationPayload(suggestion: Suggestion): NotificationPayload {
    const pred = suggestion.prediction;
    
    return {
      title: '🔮 Predicted Decision',
      body: `${pred.title} (${(pred.confidence * 100).toFixed(0)}% confidence)`,
      confidence: pred.confidence,
      actions: ['Accept', 'Reject', 'Custom'],
      data: {
        predictionId: pred.pattern.id,
        title: pred.title,
        type: pred.type,
      },
    };
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload
  ): Promise<void> {
    switch (channel) {
      case 'desktop':
        await this.sendDesktopNotification(payload);
        break;
      
      case 'terminal':
        this.sendTerminalNotification(payload);
        break;
      
      case 'slack':
        await this.sendSlackNotification(payload);
        break;
      
      case 'discord':
        await this.sendDiscordNotification(payload);
        break;
      
      case 'webhook':
        await this.sendWebhookNotification(payload);
        break;
    }
  }

  /**
   * Send desktop notification (using notify-send on Linux)
   */
  private async sendDesktopNotification(payload: NotificationPayload): Promise<void> {
    const { execSync } = await import('child_process');
    
    try {
      const cmd = `notify-send "${payload.title}" "${payload.body}" --icon=dialog-information`;
      execSync(cmd, { timeout: 5000 });
    } catch (error) {
      // Desktop notifications may not be available
      console.warn('Desktop notification failed:', error);
    }
  }

  /**
   * Send terminal notification
   */
  private sendTerminalNotification(payload: NotificationPayload): void {
    console.log('\n' + '='.repeat(60));
    console.log(`🔔 ${payload.title}`);
    console.log('='.repeat(60));
    console.log(`\n${payload.body}\n`);
    console.log('Actions:', payload.actions.join(' | '));
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Send Slack notification (placeholder)
   */
  private async sendSlackNotification(payload: NotificationPayload): Promise<void> {
    // TODO: Implement Slack webhook integration
    console.log('[Slack] Would send:', payload.title);
  }

  /**
   * Send Discord notification (placeholder)
   */
  private async sendDiscordNotification(payload: NotificationPayload): Promise<void> {
    // TODO: Implement Discord webhook integration
    console.log('[Discord] Would send:', payload.title);
  }

  /**
   * Send webhook notification (placeholder)
   */
  private async sendWebhookNotification(payload: NotificationPayload): Promise<void> {
    // TODO: Implement generic webhook
    console.log('[Webhook] Would send:', payload.title);
  }

  /**
   * Record user response
   */
  recordResponse(suggestionIndex: number, accepted: boolean, customChoice?: string): void {
    if (suggestionIndex >= this.recentSuggestions.length) {
      return;
    }

    const suggestion = this.recentSuggestions[suggestionIndex];
    suggestion.accepted = accepted;
    suggestion.customChoice = customChoice;

    // Update pattern accuracy
    this.learner.updateAccuracy(
      suggestion.prediction.pattern.id,
      accepted
    );
  }

  /**
   * Get recent suggestions
   */
  getRecentSuggestions(): Suggestion[] {
    return this.recentSuggestions;
  }

  /**
   * Get suggestion statistics
   */
  getStats(): {
    total: number;
    shown: number;
    accepted: number;
    rejected: number;
    pending: number;
    acceptanceRate: number | null;
  } {
    const total = this.recentSuggestions.length;
    const shown = this.recentSuggestions.filter(s => s.shown).length;
    const accepted = this.recentSuggestions.filter(s => s.accepted === true).length;
    const rejected = this.recentSuggestions.filter(s => s.accepted === false).length;
    const pending = this.recentSuggestions.filter(s => s.accepted === null).length;

    const responded = accepted + rejected;
    const acceptanceRate = responded > 0 ? accepted / responded : null;

    return {
      total,
      shown,
      accepted,
      rejected,
      pending,
      acceptanceRate,
    };
  }

  /**
   * Clear old suggestions
   */
  clearOld(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.recentSuggestions = this.recentSuggestions.filter(
      s => new Date(s.timestamp).getTime() > cutoff
    );
  }

  /**
   * Format suggestions for display
   */
  formatSuggestions(suggestions: Suggestion[]): string {
    if (suggestions.length === 0) {
      return 'No suggestions available.';
    }

    const lines: string[] = [];
    lines.push('🔮 PROACTIVE SUGGESTIONS\n');
    lines.push('Based on your current context:\n');

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const emoji = s.prediction.confidence >= 0.8 ? '🟢' : 
                    s.prediction.confidence >= 0.7 ? '🟡' : '🔴';

      lines.push(`${i + 1}. ${emoji} [${(s.prediction.confidence * 100).toFixed(0)}%] ${s.prediction.title}`);
      lines.push(`   ${s.prediction.evidence.join(' • ')}`);
      lines.push('');
    }

    lines.push('Actions:');
    lines.push('  [a] Accept first suggestion');
    lines.push('  [n] Reject all');
    lines.push('  [c] Custom decision');
    lines.push('  [i] Ignore for now');

    return lines.join('\n');
  }
}
