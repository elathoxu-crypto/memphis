/**
 * Memphis Model E: Learning Loop
 * 
 * Continuous learning and improvement system.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import type {
  LearningEvent,
  LearningDomain,
  LearningLoop as LearningLoopType,
  MetaCognitiveConfig
} from './types.js';

/**
 * Learning Loop Manager - continuous improvement
 */
export class LearningLoopManager {
  private config: MetaCognitiveConfig['learning'];
  private learningEvents: LearningEvent[];
  private learningLoops: Map<LearningDomain, LearningLoopType>;

  constructor(config: MetaCognitiveConfig['learning']) {
    this.config = config;
    this.learningEvents = [];
    this.learningLoops = new Map();
    
    // Initialize learning loops for each domain
    for (const domain of config.domains) {
      this.learningLoops.set(domain, {
        id: `loop_${domain}`,
        domain,
        cycleCount: 0,
        lastCycleAt: new Date(),
        cycleInterval: 86400000, // 24 hours
        lessons: [],
        patterns: [],
        improvement: 0,
        velocity: 0,
        active: true
      });
    }
  }

  /**
   * Record learning event
   */
  recordLearning(
    domain: LearningDomain,
    lesson: string,
    context: string,
    source: LearningEvent['source'],
    applicability: number = 0.5,
    confidence: number = 0.5,
    expectedImpact: number = 0
  ): LearningEvent {
    const event: LearningEvent = {
      id: this.generateId(),
      domain,
      lesson,
      context,
      source,
      applicability: Math.max(0, Math.min(1, applicability)),
      confidence: Math.max(0, Math.min(1, confidence)),
      expectedImpact: Math.max(-1, Math.min(1, expectedImpact)),
      timestamp: new Date(),
      usageCount: 0
    };

    // Store event
    this.learningEvents.push(event);
    
    // Add to learning loop
    const loop = this.learningLoops.get(domain);
    if (loop) {
      loop.lessons.push(event.id);
    }

    // Trim to max size
    if (this.learningEvents.length > (this.config.maxLessons || 1000)) {
      const removed = this.learningEvents.shift();
      if (removed) {
        // Remove from loop
        for (const loop of this.learningLoops.values()) {
          const index = loop.lessons.indexOf(removed.id);
          if (index > -1) {
            loop.lessons.splice(index, 1);
          }
        }
      }
    }

    return event;
  }

  /**
   * Apply lesson (track usage)
   */
  applyLesson(lessonId: string): boolean {
    const event = this.learningEvents.find(e => e.id === lessonId);
    if (!event) return false;

    event.usageCount++;
    event.appliedAt = new Date();
    
    return true;
  }

  /**
   * Record actual impact
   */
  recordImpact(lessonId: string, actualImpact: number): boolean {
    const event = this.learningEvents.find(e => e.id === lessonId);
    if (!event) return false;

    event.actualImpact = Math.max(-1, Math.min(1, actualImpact));
    
    // Update loop improvement metric
    this.updateLoopImprovement(event.domain);
    
    return true;
  }

  /**
   * Run learning cycle for domain
   */
  async runCycle(domain: LearningDomain): Promise<{
    newLessons: number;
    appliedLessons: number;
    improvement: number;
  }> {
    const loop = this.learningLoops.get(domain);
    if (!loop || !loop.active) {
      return { newLessons: 0, appliedLessons: 0, improvement: 0 };
    }

    // Get domain events
    const domainEvents = this.learningEvents.filter(e => e.domain === domain);
    
    // Count new and applied lessons
    const newLessons = domainEvents.filter(e => e.usageCount === 0).length;
    const appliedLessons = domainEvents.filter(e => e.usageCount > 0).length;
    
    // Calculate improvement
    const eventsWithImpact = domainEvents.filter(e => e.actualImpact !== undefined);
    let improvement = 0;
    
    if (eventsWithImpact.length > 0) {
      improvement = eventsWithImpact.reduce((sum, e) => sum + (e.actualImpact || 0), 0) / eventsWithImpact.length;
    }

    // Update loop
    loop.cycleCount++;
    loop.lastCycleAt = new Date();
    loop.velocity = newLessons;
    loop.improvement = improvement;

    return {
      newLessons,
      appliedLessons,
      improvement
    };
  }

  /**
   * Get top lessons for domain
   */
  getTopLessons(domain: LearningDomain, limit: number = 10): LearningEvent[] {
    return this.learningEvents
      .filter(e => e.domain === domain)
      .filter(e => e.confidence >= (this.config.confidenceThreshold || 0.5))
      .filter(e => e.applicability >= (this.config.applicabilityThreshold || 0.5))
      .sort((a, b) => {
        // Sort by actual impact (if available) or expected impact
        const aImpact = a.actualImpact !== undefined ? a.actualImpact : a.expectedImpact;
        const bImpact = b.actualImpact !== undefined ? b.actualImpact : b.expectedImpact;
        return bImpact - aImpact;
      })
      .slice(0, limit);
  }

  /**
   * Get lessons by source
   */
  getLessonsBySource(source: LearningEvent['source']): LearningEvent[] {
    return this.learningEvents.filter(e => e.source === source);
  }

  /**
   * Get loop status
   */
  getLoopStatus(domain: LearningDomain): LearningLoopType | undefined {
    return this.learningLoops.get(domain);
  }

  /**
   * Get overall improvement
   */
  getOverallImprovement(): number {
    const loops = Array.from(this.learningLoops.values());
    if (loops.length === 0) return 0;
    
    return loops.reduce((sum, loop) => sum + loop.improvement, 0) / loops.length;
  }

  /**
   * Export learning data
   */
  export(): { events: LearningEvent[]; loops: LearningLoopType[] } {
    return {
      events: [...this.learningEvents],
      loops: Array.from(this.learningLoops.values())
    };
  }

  /**
   * Import learning data
   */
  import(data: { events: LearningEvent[]; loops: LearningLoopType[] }): void {
    this.learningEvents = data.events;
    
    for (const loop of data.loops) {
      this.learningLoops.set(loop.domain, loop);
    }
  }

  /**
   * Update loop improvement metric
   */
  private updateLoopImprovement(domain: LearningDomain): void {
    const loop = this.learningLoops.get(domain);
    if (!loop) return;

    const domainEvents = this.learningEvents.filter(e => e.domain === domain && e.actualImpact !== undefined);
    
    if (domainEvents.length > 0) {
      loop.improvement = domainEvents.reduce((sum, e) => sum + (e.actualImpact || 0), 0) / domainEvents.length;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalLessons: number;
    byDomain: Map<LearningDomain, number>;
    bySource: Map<LearningEvent['source'], number>;
    avgApplicability: number;
    avgConfidence: number;
    appliedRate: number;
  } {
    const byDomain = new Map<LearningDomain, number>();
    const bySource = new Map<LearningEvent['source'], number>();

    for (const event of this.learningEvents) {
      // Count by domain
      const domainCount = byDomain.get(event.domain) || 0;
      byDomain.set(event.domain, domainCount + 1);

      // Count by source
      const sourceCount = bySource.get(event.source) || 0;
      bySource.set(event.source, sourceCount + 1);
    }

    const avgApplicability = this.learningEvents.length > 0
      ? this.learningEvents.reduce((sum, e) => sum + e.applicability, 0) / this.learningEvents.length
      : 0;

    const avgConfidence = this.learningEvents.length > 0
      ? this.learningEvents.reduce((sum, e) => sum + e.confidence, 0) / this.learningEvents.length
      : 0;

    const appliedCount = this.learningEvents.filter(e => e.usageCount > 0).length;
    const appliedRate = this.learningEvents.length > 0
      ? appliedCount / this.learningEvents.length
      : 0;

    return {
      totalLessons: this.learningEvents.length,
      byDomain,
      bySource,
      avgApplicability,
      avgConfidence,
      appliedRate
    };
  }
}
