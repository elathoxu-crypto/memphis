/**
 * Memphis Model D: Consensus Mechanism
 * 
 * Achieves agreement across multiple agents through various
 * consensus algorithms and conflict resolution.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import type {
  ConsensusAlgorithm,
  ConsensusResult,
  ConflictInfo,
  ConsensusAgentStatus,
  Proposal,
  Vote
} from './types.js';

/**
 * Consensus Mechanism - multi-agent agreement
 */
export class ConsensusMechanism {
  private algorithm: ConsensusAlgorithm;
  private threshold: number;
  private timeout: number;
  private maxRetries: number;

  constructor(config: {
    algorithm: ConsensusAlgorithm;
    threshold: number;
    timeout: number;
    maxRetries: number;
  }) {
    this.algorithm = config.algorithm;
    this.threshold = config.threshold;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
  }

  /**
   * Achieve consensus on a proposal
   */
  async achieveConsensus(
    proposal: Proposal,
    votes: Vote[],
    agents: ConsensusAgentStatus[]
  ): Promise<ConsensusResult> {
    switch (this.algorithm) {
      case 'threshold':
        return this.thresholdConsensus(proposal, votes, agents);
      
      case 'raft':
        return this.raftConsensus(proposal, votes, agents);
      
      case 'byzantine':
        return this.byzantineConsensus(proposal, votes, agents);
      
      case 'gossip':
        return this.gossipConsensus(proposal, votes, agents);
      
      default:
        return this.thresholdConsensus(proposal, votes, agents);
    }
  }

  /**
   * Threshold-based consensus (simple percentage)
   */
  private async thresholdConsensus(
    proposal: Proposal,
    votes: Vote[],
    agents: ConsensusAgentStatus[]
  ): Promise<ConsensusResult> {
    // Count participation
    const participatingAgents = agents.filter(a => a.voted);
    const participation = participatingAgents.length / agents.length;

    // Check if we have enough votes
    if (participation < this.threshold) {
      return {
        proposalId: proposal.id,
        agreed: false,
        consensus: participation,
        conflict: {
          type: 'low_participation',
          details: `Only ${(participation * 100).toFixed(1)}% participation, need ${(this.threshold * 100).toFixed(1)}%`
        },
        timestamp: new Date(),
        agents
      };
    }

    // Count votes for each option
    const voteCounts = new Map<string, number>();
    for (const vote of votes) {
      const current = voteCounts.get(vote.choice) || 0;
      voteCounts.set(vote.choice, current + 1);
    }

    // Find winning option
    let maxVotes = 0;
    let winner: string | undefined;
    for (const [option, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }

    // Calculate consensus level
    const consensus = maxVotes / votes.length;
    const agreed = consensus >= this.threshold;

    // Detect ties
    const conflict = this.detectConflict(voteCounts, votes.length);

    return {
      proposalId: proposal.id,
      agreed,
      consensus,
      decision: winner,
      conflict,
      timestamp: new Date(),
      agents: this.updateAgentStatus(agents, votes, winner)
    };
  }

  /**
   * Raft-like leader-based consensus
   */
  private async raftConsensus(
    proposal: Proposal,
    votes: Vote[],
    agents: ConsensusAgentStatus[]
  ): Promise<ConsensusResult> {
    // Simplified Raft implementation
    // In full implementation, would have leader election + log replication
    
    // For now, treat first agent as leader
    const leader = agents[0];
    
    if (!leader || !leader.voted) {
      return {
        proposalId: proposal.id,
        agreed: false,
        consensus: 0,
        conflict: {
          type: 'timeout',
          details: 'Leader did not respond'
        },
        timestamp: new Date(),
        agents
      };
    }

    // Leader's vote determines outcome
    const leaderVote = votes.find(v => v.agentId === leader.agentId);
    
    return {
      proposalId: proposal.id,
      agreed: true,
      consensus: 1.0,
      decision: leaderVote?.choice,
      conflict: null,
      timestamp: new Date(),
      agents
    };
  }

  /**
   * Byzantine fault-tolerant consensus
   */
  private async byzantineConsensus(
    proposal: Proposal,
    votes: Vote[],
    agents: ConsensusAgentStatus[]
  ): Promise<ConsensusResult> {
    // Simplified Byzantine consensus
    // Assumes up to f faulty nodes, needs 3f+1 total nodes
    
    const n = agents.length;
    const f = Math.floor((n - 1) / 3); // Max faulty nodes
    
    // Count votes
    const voteCounts = new Map<string, number>();
    for (const vote of votes) {
      const current = voteCounts.get(vote.choice) || 0;
      voteCounts.set(vote.choice, current + 1);
    }

    // Need at least 2f+1 votes for same value
    const required = 2 * f + 1;
    
    let winner: string | undefined;
    let maxVotes = 0;
    
    for (const [option, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }

    const agreed = maxVotes >= required;
    const consensus = maxVotes / n;

    return {
      proposalId: proposal.id,
      agreed,
      consensus,
      decision: winner,
      conflict: agreed ? null : {
        type: 'byzantine',
        details: `Insufficient agreement: ${maxVotes}/${required} required for Byzantine tolerance`
      },
      timestamp: new Date(),
      agents
    };
  }

  /**
   * Gossip-based consensus
   */
  private async gossipConsensus(
    proposal: Proposal,
    votes: Vote[],
    agents: ConsensusAgentStatus[]
  ): Promise<ConsensusResult> {
    // Simplified gossip protocol
    // Agents exchange information until convergence
    
    // In full implementation, would have:
    // 1. Rumor spreading
    // 2. Anti-entropy exchanges
    // 3. Convergence detection
    
    // For now, use threshold on spread
    const participation = votes.length / agents.length;
    const agreed = participation >= this.threshold;

    // Count votes
    const voteCounts = new Map<string, number>();
    for (const vote of votes) {
      const current = voteCounts.get(vote.choice) || 0;
      voteCounts.set(vote.choice, current + 1);
    }

    let winner: string | undefined;
    let maxVotes = 0;
    
    for (const [option, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }

    const consensus = maxVotes / votes.length;

    return {
      proposalId: proposal.id,
      agreed,
      consensus,
      decision: winner,
      conflict: agreed ? null : {
        type: 'low_participation',
        details: `Gossip not converged: ${votes.length}/${agents.length} agents reached`
      },
      timestamp: new Date(),
      agents
    };
  }

  /**
   * Detect conflict (tie, low participation, etc.)
   */
  private detectConflict(
    voteCounts: Map<string, number>,
    total: number
  ): ConflictInfo | null {
    const counts = Array.from(voteCounts.values());
    
    // Check for tie
    if (counts.length >= 2) {
      const sorted = counts.sort((a, b) => b - a);
      if (sorted[0] === sorted[1]) {
        return {
          type: 'tie',
          details: 'Multiple options tied for first place',
          proposedResolution: 'Use ranked choice voting or flip coin'
        };
      }
    }

    // No conflict
    return null;
  }

  /**
   * Update agent status based on votes
   */
  private updateAgentStatus(
    agents: ConsensusAgentStatus[],
    votes: Vote[],
    winner?: string
  ): ConsensusAgentStatus[] {
    return agents.map(agent => {
      const vote = votes.find(v => v.agentId === agent.agentId);
      
      return {
        ...agent,
        voted: vote !== undefined,
        agreed: vote ? vote.choice === winner : false,
        vote: vote?.choice
      };
    });
  }

  /**
   * Retry consensus with different parameters
   */
  async retryWithDifferentThreshold(
    proposal: Proposal,
    votes: Vote[],
    agents: ConsensusAgentStatus[],
    newThreshold: number
  ): Promise<ConsensusResult> {
    const originalThreshold = this.threshold;
    this.threshold = newThreshold;
    
    try {
      const result = await this.achieveConsensus(proposal, votes, agents);
      return result;
    } finally {
      this.threshold = originalThreshold;
    }
  }
}
