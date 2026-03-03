/**
 * Memphis Model E: Reflection Engine
 * 
 * Self-analysis and introspection for continuous improvement.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import type {
  Reflection,
  ReflectionType,
  ReflectionTrigger,
  ReflectionAction,
  MetaCognitiveConfig
} from './types.js';

/**
 * Reflection Engine - self-analysis system
 */
export class ReflectionEngine {
  private config: MetaCognitiveConfig['reflection'];
  private reflections: Reflection[];
  private lastReflectionAt?: Date;

  constructor(config: MetaCognitiveConfig['reflection']) {
    this.config = config;
    this.reflections = [];
  }

  /**
   * Perform reflection
   */
  async reflect(
    type: ReflectionType,
    trigger: ReflectionTrigger,
    context?: Map<string, any>
  ): Promise<Reflection> {
    const startTime = Date.now();
    
    // Gather data based on reflection type
    const subject = this.getReflectionSubject(type);
    const analysisContext = context || new Map();
    
    // Perform analysis
    const { findings, insights, recommendations } = await this.analyze(type, analysisContext);
    
    // Calculate metrics
    const confidence = this.calculateConfidence(findings, insights);
    const impact = this.assessImpact(findings, recommendations);
    
    // Generate actions
    const actions = this.generateActions(recommendations);
    
    // Create reflection
    const reflection: Reflection = {
      id: this.generateId(),
      type,
      trigger,
      subject,
      context: analysisContext,
      findings,
      insights,
      recommendations,
      confidence,
      impact,
      actions,
      timestamp: new Date(),
      duration: Date.now() - startTime
    };
    
    // Store reflection
    this.reflections.push(reflection);
    this.lastReflectionAt = new Date();
    
    // Trim to max size
    if (this.reflections.length > 100) {
      this.reflections = this.reflections.slice(-100);
    }
    
    return reflection;
  }

  /**
   * Analyze based on reflection type
   */
  private async analyze(
    type: ReflectionType,
    context: Map<string, any>
  ): Promise<{
    findings: string[];
    insights: string[];
    recommendations: string[];
  }> {
    switch (type) {
      case 'performance':
        return this.analyzePerformance(context);
      
      case 'pattern':
        return this.analyzePatterns(context);
      
      case 'failure':
        return this.analyzeFailures(context);
      
      case 'success':
        return this.analyzeSuccesses(context);
      
      case 'alignment':
        return this.analyzeAlignment(context);
      
      case 'evolution':
        return this.analyzeEvolution(context);
      
      default:
        return this.analyzePerformance(context);
    }
  }

  /**
   * Analyze performance
   */
  private async analyzePerformance(context: Map<string, any>): Promise<{
    findings: string[];
    insights: string[];
    recommendations: string[];
  }> {
    const findings: string[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Check recent reflections
    const recentReflections = this.getRecentReflections(10);
    
    if (recentReflections.length > 0) {
      const avgConfidence = recentReflections.reduce((sum, r) => sum + r.confidence, 0) / recentReflections.length;
      const avgImpact = recentReflections.reduce((sum, r) => sum + r.impact, 0) / recentReflections.length;
      
      findings.push(`Recent reflection confidence: ${(avgConfidence * 100).toFixed(1)}%`);
      findings.push(`Recent reflection impact: ${(avgImpact * 100).toFixed(1)}%`);
      
      if (avgConfidence < 0.5) {
        insights.push('Confidence is below threshold - may need more data');
        recommendations.push('Increase data collection for better analysis');
      }
      
      if (avgImpact < 0) {
        insights.push('Negative impact detected - interventions may be counterproductive');
        recommendations.push('Review and adjust recent interventions');
      }
    }

    // Context-based analysis
    const decisionCount = context.get('decisionCount') || 0;
    const predictionCount = context.get('predictionCount') || 0;
    
    if (decisionCount > 0) {
      findings.push(`Recent decisions: ${decisionCount}`);
    }
    
    if (predictionCount > 0) {
      findings.push(`Recent predictions: ${predictionCount}`);
    }

    return { findings, insights, recommendations };
  }

  /**
   * Analyze patterns
   */
  private async analyzePatterns(context: Map<string, any>): Promise<{
    findings: string[];
    insights: string[];
    recommendations: string[];
  }> {
    const findings: string[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Analyze reflection types
    const typeCounts = new Map<ReflectionType, number>();
    for (const reflection of this.reflections) {
      const count = typeCounts.get(reflection.type) || 0;
      typeCounts.set(reflection.type, count + 1);
    }

    // Find dominant pattern
    let maxType: ReflectionType | null = null;
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxType = type;
        maxCount = count;
      }
    }

    if (maxType) {
      findings.push(`Dominant reflection type: ${maxType} (${maxCount} times)`);
      insights.push(`Focus tends toward ${maxType} analysis`);
    }

    // Check for action patterns
    const actionCounts = new Map<string, number>();
    for (const reflection of this.reflections) {
      for (const action of reflection.actions) {
        const count = actionCounts.get(action.type) || 0;
        actionCounts.set(action.type, count + 1);
      }
    }

    if (actionCounts.size > 0) {
      const topAction = Array.from(actionCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];
      findings.push(`Most common action: ${topAction[0]} (${topAction[1]} times)`);
    }

    return { findings, insights, recommendations };
  }

  /**
   * Analyze failures
   */
  private async analyzeFailures(context: Map<string, any>): Promise<{
    findings: string[];
    insights: string[];
    recommendations: string[];
  }> {
    const findings: string[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Check recent failures
    const failureReflections = this.reflections.filter(r => r.impact < 0);
    
    if (failureReflections.length > 0) {
      findings.push(`Found ${failureReflections.length} negative-impact reflections`);
      
      // Identify common failure patterns
      const failureTypes = new Map<ReflectionType, number>();
      for (const reflection of failureReflections) {
        const count = failureTypes.get(reflection.type) || 0;
        failureTypes.set(reflection.type, count + 1);
      }

      const worstType = Array.from(failureTypes.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      if (worstType) {
        insights.push(`${worstType[0]} analysis has most failures (${worstType[1]})`);
        recommendations.push(`Improve ${worstType[0]} analysis methods`);
      }
    } else {
      insights.push('No significant failures detected');
    }

    return { findings, insights, recommendations };
  }

  /**
   * Analyze successes
   */
  private async analyzeSuccesses(context: Map<string, any>): Promise<{
    findings: string[];
    insights: string[];
    recommendations: string[];
  }> {
    const findings: string[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Check recent successes
    const successReflections = this.reflections.filter(r => r.impact > 0.5);
    
    if (successReflections.length > 0) {
      findings.push(`Found ${successReflections.length} high-impact reflections`);
      
      // Identify success patterns
      const successActions = new Map<string, number>();
      for (const reflection of successReflections) {
        for (const action of reflection.actions) {
          if (action.status === 'applied') {
            const count = successActions.get(action.type) || 0;
            successActions.set(action.type, count + 1);
          }
        }
      }

      if (successActions.size > 0) {
        const bestAction = Array.from(successActions.entries())
          .sort((a, b) => b[1] - a[1])[0];
        insights.push(`${bestAction[0]} actions are most effective (${bestAction[1]} successes)`);
        recommendations.push(`Prioritize ${bestAction[0]} actions in future`);
      }
    }

    return { findings, insights, recommendations };
  }

  /**
   * Analyze alignment with goals
   */
  private async analyzeAlignment(context: Map<string, any>): Promise<{
    findings: string[];
    insights: string[];
    recommendations: string[];
  }> {
    const findings: string[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Check if actions align with recommendations
    const appliedActions = this.reflections
      .flatMap(r => r.actions)
      .filter(a => a.status === 'applied');

    const pendingActions = this.reflections
      .flatMap(r => r.actions)
      .filter(a => a.status === 'pending');

    findings.push(`Applied actions: ${appliedActions.length}`);
    findings.push(`Pending actions: ${pendingActions.length}`);

    const alignmentRate = appliedActions.length / (appliedActions.length + pendingActions.length);
    
    if (!isNaN(alignmentRate)) {
      insights.push(`Action alignment rate: ${(alignmentRate * 100).toFixed(1)}%`);
      
      if (alignmentRate < 0.5) {
        recommendations.push('Increase action follow-through rate');
      }
    }

    return { findings, insights, recommendations };
  }

  /**
   * Analyze evolution over time
   */
  private async analyzeEvolution(context: Map<string, any>): Promise<{
    findings: string[];
    insights: string[];
    recommendations: string[];
  }> {
    const findings: string[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];

    if (this.reflections.length < 5) {
      findings.push('Insufficient data for evolution analysis');
      return { findings, insights, recommendations };
    }

    // Split into old and new
    const midpoint = Math.floor(this.reflections.length / 2);
    const oldReflections = this.reflections.slice(0, midpoint);
    const newReflections = this.reflections.slice(midpoint);

    // Compare confidence
    const oldConfidence = oldReflections.reduce((sum, r) => sum + r.confidence, 0) / oldReflections.length;
    const newConfidence = newReflections.reduce((sum, r) => sum + r.confidence, 0) / newReflections.length;

    findings.push(`Confidence trend: ${(oldConfidence * 100).toFixed(1)}% → ${(newConfidence * 100).toFixed(1)}%`);

    if (newConfidence > oldConfidence) {
      insights.push('Confidence is improving over time');
    } else if (newConfidence < oldConfidence) {
      insights.push('Confidence is declining - investigate causes');
      recommendations.push('Review recent changes for negative impact');
    } else {
      insights.push('Confidence is stable');
    }

    // Compare impact
    const oldImpact = oldReflections.reduce((sum, r) => sum + r.impact, 0) / oldReflections.length;
    const newImpact = newReflections.reduce((sum, r) => sum + r.impact, 0) / newReflections.length;

    findings.push(`Impact trend: ${(oldImpact * 100).toFixed(1)}% → ${(newImpact * 100).toFixed(1)}%`);

    if (newImpact > oldImpact) {
      insights.push('Impact is improving over time');
    } else if (newImpact < oldImpact) {
      insights.push('Impact is declining - investigate causes');
    }

    return { findings, insights, recommendations };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(findings: string[], insights: string[]): number {
    // Base confidence on amount of data
    let confidence = 0.3; // Base confidence
    
    // Add for findings
    confidence += Math.min(findings.length * 0.1, 0.3);
    
    // Add for insights
    confidence += Math.min(insights.length * 0.15, 0.3);
    
    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Assess impact score
   */
  private assessImpact(findings: string[], recommendations: string[]): number {
    // Base impact on quality of recommendations
    let impact = 0;
    
    // Positive for having recommendations
    impact += recommendations.length * 0.2;
    
    // Cap at 1.0
    return Math.min(impact, 1.0);
  }

  /**
   * Generate actions from recommendations
   */
  private generateActions(recommendations: string[]): ReflectionAction[] {
    return recommendations.slice(0, this.config.maxRecommendations || 5).map(rec => ({
      type: this.inferActionType(rec),
      target: this.inferTarget(rec),
      value: undefined,
      priority: this.inferPriority(rec),
      status: 'pending' as const
    }));
  }

  /**
   * Infer action type from recommendation text
   */
  private inferActionType(rec: string): ReflectionAction['type'] {
    const lowerRec = rec.toLowerCase();
    
    if (lowerRec.includes('adjust') || lowerRec.includes('change') || lowerRec.includes('modify')) {
      return 'adjust_parameter';
    }
    if (lowerRec.includes('improve') || lowerRec.includes('enhance') || lowerRec.includes('better')) {
      return 'change_strategy';
    }
    if (lowerRec.includes('learn') || lowerRec.includes('pattern')) {
      return 'learn_pattern';
    }
    if (lowerRec.includes('review') || lowerRec.includes('investigate') || lowerRec.includes('issue')) {
      return 'flag_issue';
    }
    
    return 'adjust_parameter';
  }

  /**
   * Infer target from recommendation
   */
  private inferTarget(rec: string): string {
    // Extract key terms
    const terms = rec.toLowerCase().split(/\s+/);
    return terms.slice(0, 3).join('_');
  }

  /**
   * Infer priority from recommendation
   */
  private inferPriority(rec: string): ReflectionAction['priority'] {
    const lowerRec = rec.toLowerCase();
    
    if (lowerRec.includes('urgent') || lowerRec.includes('critical') || lowerRec.includes('immediately')) {
      return 'high';
    }
    if (lowerRec.includes('important') || lowerRec.includes('should')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get reflection subject
   */
  private getReflectionSubject(type: ReflectionType): string {
    const subjects: Record<ReflectionType, string> = {
      performance: 'Recent system performance',
      pattern: 'Behavioral patterns',
      failure: 'Recent failures',
      success: 'Recent successes',
      alignment: 'Goal alignment',
      evolution: 'Evolution over time'
    };
    return subjects[type];
  }

  /**
   * Get recent reflections
   */
  private getRecentReflections(count: number): Reflection[] {
    return this.reflections.slice(-count);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all reflections
   */
  getReflections(): Reflection[] {
    return [...this.reflections];
  }

  /**
   * Get last reflection time
   */
  getLastReflectionAt(): Date | undefined {
    return this.lastReflectionAt;
  }
}
