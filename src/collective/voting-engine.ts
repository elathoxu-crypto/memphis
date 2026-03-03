/**
 * Memphis Model D: Voting Engine
 * 
 * Executes voting algorithms on proposals from multiple agents.
 * Supports various voting methods and produces consensus metrics.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import type {
  Vote,
  VoteResult,
  Proposal,
  VotingMethod,
  VotingConfig,
  ProposalOption
} from './types.js';

/**
 * Voting Engine - executes voting algorithms
 */
export class VotingEngine {
  private config: VotingConfig;

  constructor(config: VotingConfig) {
    this.config = config;
  }

  /**
   * Tally votes for a proposal
   */
  tallyVotes(proposal: Proposal, votes: Vote[]): VoteResult {
    const method = proposal.config.defaultMethod || this.config.defaultMethod;
    
    // Count votes by option
    const voteCounts = this.countVotes(votes);
    
    // Calculate participation
    const participation = votes.length / (proposal.options.length || 1);
    
    // Determine winner based on method
    const winner = this.determineWinner(voteCounts, method, votes);
    
    // Calculate consensus (agreement level)
    const consensus = this.calculateConsensus(voteCounts, votes);
    
    return {
      proposalId: proposal.id,
      winner,
      participation,
      consensus,
      votes,
      talliedAt: new Date()
    };
  }

  /**
   * Count votes by option
   */
  private countVotes(votes: Vote[]): Map<string, number> {
    const counts = new Map<string, number>();
    
    for (const vote of votes) {
      const current = counts.get(vote.choice) || 0;
      counts.set(vote.choice, current + 1);
    }
    
    return counts;
  }

  /**
   * Determine winner based on voting method
   */
  private determineWinner(
    counts: Map<string, number>,
    method: VotingMethod,
    votes: Vote[]
  ): string | undefined {
    const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
    
    if (total === 0) return undefined;

    switch (method) {
      case 'simple_majority':
        return this.simpleMajority(counts, total);
      
      case 'supermajority':
        return this.supermajority(counts, total);
      
      case 'unanimous':
        return this.unanimous(counts, total);
      
      case 'ranked_choice':
        return this.rankedChoice(votes);
      
      case 'approval':
        return this.approval(counts);
      
      case 'weighted':
        return this.weighted(votes);
      
      case 'delegated':
        return this.delegated(votes);
      
      default:
        return this.simpleMajority(counts, total);
    }
  }

  /**
   * Simple majority (>50%)
   */
  private simpleMajority(counts: Map<string, number>, total: number): string | undefined {
    for (const [option, count] of counts) {
      if (count / total > 0.5) {
        return option;
      }
    }
    return undefined; // No majority
  }

  /**
   * Supermajority (>67%)
   */
  private supermajority(counts: Map<string, number>, total: number): string | undefined {
    for (const [option, count] of counts) {
      if (count / total > 0.67) {
        return option;
      }
    }
    return undefined; // No supermajority
  }

  /**
   * Unanimous (100%)
   */
  private unanimous(counts: Map<string, number>, total: number): string | undefined {
    for (const [option, count] of counts) {
      if (count === total) {
        return option;
      }
    }
    return undefined; // Not unanimous
  }

  /**
   * Ranked choice voting (instant runoff)
   */
  private rankedChoice(votes: Vote[]): string | undefined {
    // Simplified implementation - would need ranked ballot structure
    // For now, use confidence-weighted simple majority
    const weighted = new Map<string, number>();
    
    for (const vote of votes) {
      const current = weighted.get(vote.choice) || 0;
      weighted.set(vote.choice, current + vote.confidence);
    }
    
    let maxWeight = 0;
    let winner: string | undefined;
    
    for (const [option, weight] of weighted) {
      if (weight > maxWeight) {
        maxWeight = weight;
        winner = option;
      }
    }
    
    return winner;
  }

  /**
   * Approval voting (multiple choices allowed)
   */
  private approval(counts: Map<string, number>): string | undefined {
    let maxVotes = 0;
    let winner: string | undefined;
    
    for (const [option, count] of counts) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }
    
    return winner;
  }

  /**
   * Weighted voting (by reputation/confidence)
   */
  private weighted(votes: Vote[]): string | undefined {
    const weighted = new Map<string, number>();
    
    for (const vote of votes) {
      const current = weighted.get(vote.choice) || 0;
      // Weight by confidence
      weighted.set(vote.choice, current + vote.confidence);
    }
    
    let maxWeight = 0;
    let winner: string | undefined;
    
    for (const [option, weight] of weighted) {
      if (weight > maxWeight) {
        maxWeight = weight;
        winner = option;
      }
    }
    
    return winner;
  }

  /**
   * Delegated voting (proxy)
   */
  private delegated(votes: Vote[]): string | undefined {
    // Simplified - would need delegation chain resolution
    // For now, treat as weighted voting
    return this.weighted(votes);
  }

  /**
   * Calculate consensus level (0-1)
   */
  private calculateConsensus(
    counts: Map<string, number>,
    votes: Vote[]
  ): number {
    const total = votes.length;
    if (total === 0) return 0;
    
    // Find max count
    const maxCount = Math.max(...counts.values());
    
    // Consensus = percentage for winning option
    return maxCount / total;
  }

  /**
   * Validate vote
   */
  validateVote(vote: Vote, proposal: Proposal): boolean {
    // Check if option exists
    const optionExists = proposal.options.some(opt => opt.id === vote.choice);
    if (!optionExists) return false;
    
    // Check confidence range
    if (vote.confidence < 0 || vote.confidence > 1) return false;
    
    // Check if agent already voted
    // (Would need proposal state tracking)
    
    return true;
  }

  /**
   * Get voting statistics
   */
  getStats(result: VoteResult): {
    totalVotes: number;
    uniqueAgents: number;
    averageConfidence: number;
    participation: number;
  } {
    const uniqueAgents = new Set(result.votes.map(v => v.agentId)).size;
    const avgConfidence = result.votes.reduce((sum, v) => sum + v.confidence, 0) / result.votes.length;
    
    return {
      totalVotes: result.votes.length,
      uniqueAgents,
      averageConfidence: avgConfidence || 0,
      participation: result.participation
    };
  }
}
