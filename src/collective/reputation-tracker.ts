/**
 * Memphis Model D: Reputation Tracker
 * 
 * Tracks agent trust scores and expertise metrics.
 * Implements time-based decay and domain-specific scoring.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import type {
  Agent,
  ReputationScore,
  ReputationEvent,
  ConsensusResult
} from './types.js';

/**
 * Reputation Tracker - manages agent trust scores
 */
export class ReputationTracker {
  private agentReputations: Map<string, ReputationScore>;
  private decayRate: number;
  private boostAmount: number;
  private penaltyAmount: number;

  constructor(config: {
    decayRate: number;
    boost: number;
    penalty: number;
  }) {
    this.agentReputations = new Map();
    this.decayRate = config.decayRate;
    this.boostAmount = config.boost;
    this.penaltyAmount = config.penalty;
  }

  /**
   * Get agent reputation
   */
  getReputation(agentId: string): ReputationScore | undefined {
    return this.agentReputations.get(agentId);
  }

  /**
   * Initialize reputation for new agent
   */
  initializeReputation(agentId: string, initialScore: number = 0.5): ReputationScore {
    const reputation: ReputationScore = {
      overall: initialScore,
      domains: new Map(),
      accuracy: initialScore,
      participation: 1.0,
      alignment: 1.0,
      reliability: 1.0,
      updatedAt: new Date(),
      history: []
    };
    
    this.agentReputations.set(agentId, reputation);
    return reputation;
  }

  /**
   * Record success (prediction/vote was correct)
   */
  recordSuccess(
    agentId: string,
    domain: string,
    context?: string
  ): void {
    const reputation = this.getOrCreateReputation(agentId);
    
    // Add success event
    const event: ReputationEvent = {
      type: 'success',
      delta: this.boostAmount,
      reason: `Correct prediction/vote in ${domain}`,
      context,
      timestamp: new Date()
    };
    
    reputation.history.push(event);
    
    // Update scores
    this.applyBoost(reputation, domain);
    reputation.updatedAt = new Date();
  }

  /**
   * Record failure (prediction/vote was wrong)
   */
  recordFailure(
    agentId: string,
    domain: string,
    context?: string
  ): void {
    const reputation = this.getOrCreateReputation(agentId);
    
    // Add failure event
    const event: ReputationEvent = {
      type: 'failure',
      delta: -this.penaltyAmount,
      reason: `Incorrect prediction/vote in ${domain}`,
      context,
      timestamp: new Date()
    };
    
    reputation.history.push(event);
    
    // Update scores
    this.applyPenalty(reputation, domain);
    reputation.updatedAt = new Date();
  }

  /**
   * Record participation (voted but outcome unknown)
   */
  recordParticipation(agentId: string, context?: string): void {
    const reputation = this.getOrCreateReputation(agentId);
    
    // Add participation event
    const event: ReputationEvent = {
      type: 'participation',
      delta: 0.01, // Small boost for participation
      reason: 'Participated in voting',
      context,
      timestamp: new Date()
    };
    
    reputation.history.push(event);
    
    // Update participation rate
    reputation.participation = Math.min(1.0, reputation.participation + 0.01);
    reputation.updatedAt = new Date();
  }

  /**
   * Apply time-based decay to all reputations
   */
  applyDecay(): void {
    for (const [agentId, reputation] of this.agentReputations) {
      // Decay overall score
      reputation.overall = Math.max(0, reputation.overall - this.decayRate);
      
      // Decay domain scores
      for (const [domain, score] of reputation.domains) {
        reputation.domains.set(domain, Math.max(0, score - this.decayRate));
      }
      
      // Add decay event
      reputation.history.push({
        type: 'decay',
        delta: -this.decayRate,
        reason: 'Time-based decay',
        timestamp: new Date()
      });
      
      reputation.updatedAt = new Date();
    }
  }

  /**
   * Update based on consensus result
   */
  updateFromConsensus(result: ConsensusResult): void {
    for (const agentStatus of result.agents) {
      if (!agentStatus.voted) continue;
      
      const reputation = this.getOrCreateReputation(agentStatus.agentId);
      
      // Did agent agree with consensus?
      if (agentStatus.agreed === result.agreed) {
        // Agent was on winning side
        this.recordSuccess(agentStatus.agentId, 'consensus', `Proposal ${result.proposalId}`);
      } else {
        // Agent was on losing side
        this.recordFailure(agentStatus.agentId, 'consensus', `Proposal ${result.proposalId}`);
      }
    }
  }

  /**
   * Get top agents by reputation
   */
  getTopAgents(limit: number = 10): Array<{ agentId: string; score: ReputationScore }> {
    const sorted = Array.from(this.agentReputations.entries())
      .sort((a, b) => b[1].overall - a[1].overall)
      .slice(0, limit);
    
    return sorted.map(([agentId, score]) => ({ agentId, score }));
  }

  /**
   * Get domain experts
   */
  getDomainExperts(domain: string, limit: number = 5): Array<{ agentId: string; score: number }> {
    const experts = [];
    
    for (const [agentId, reputation] of this.agentReputations) {
      const domainScore = reputation.domains.get(domain);
      if (domainScore !== undefined) {
        experts.push({ agentId, score: domainScore });
      }
    }
    
    return experts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate trust level for delegation
   */
  calculateTrustLevel(agentId: string): number {
    const reputation = this.getReputation(agentId);
    if (!reputation) return 0;
    
    // Weighted combination of metrics
    const trust = (
      reputation.overall * 0.4 +
      reputation.accuracy * 0.3 +
      reputation.reliability * 0.2 +
      reputation.alignment * 0.1
    );
    
    return Math.min(1.0, Math.max(0, trust));
  }

  // ==================== Private Helpers ====================

  /**
   * Get or create reputation
   */
  private getOrCreateReputation(agentId: string): ReputationScore {
    let reputation = this.agentReputations.get(agentId);
    
    if (!reputation) {
      reputation = this.initializeReputation(agentId);
    }
    
    return reputation;
  }

  /**
   * Apply boost to reputation
   */
  private applyBoost(reputation: ReputationScore, domain: string): void {
    // Boost overall score
    reputation.overall = Math.min(1.0, reputation.overall + this.boostAmount);
    
    // Boost accuracy
    reputation.accuracy = Math.min(1.0, reputation.accuracy + this.boostAmount * 0.5);
    
    // Boost domain score
    const currentDomain = reputation.domains.get(domain) || 0.5;
    reputation.domains.set(domain, Math.min(1.0, currentDomain + this.boostAmount));
  }

  /**
   * Apply penalty to reputation
   */
  private applyPenalty(reputation: ReputationScore, domain: string): void {
    // Penalize overall score
    reputation.overall = Math.max(0, reputation.overall - this.penaltyAmount);
    
    // Penalize accuracy
    reputation.accuracy = Math.max(0, reputation.accuracy - this.penaltyAmount * 0.5);
    
    // Penalize domain score
    const currentDomain = reputation.domains.get(domain) || 0.5;
    reputation.domains.set(domain, Math.max(0, currentDomain - this.penaltyAmount));
  }

  /**
   * Export reputation data
   */
  export(): Array<{ agentId: string; reputation: ReputationScore }> {
    return Array.from(this.agentReputations.entries()).map(([agentId, reputation]) => ({
      agentId,
      reputation
    }));
  }

  /**
   * Import reputation data
   */
  import(data: Array<{ agentId: string; reputation: ReputationScore }>): void {
    for (const { agentId, reputation } of data) {
      this.agentReputations.set(agentId, reputation);
    }
  }
}
