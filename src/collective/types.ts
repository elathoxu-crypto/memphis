/**
 * Memphis Model D: Collective Decisions - Type Definitions
 * 
 * Enables multi-agent collective decision making through voting,
 * consensus, and reputation tracking.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

// ==================== Voting Types ====================

/**
 * Voting Method - how votes are tallied
 */
export type VotingMethod = 
  | 'simple_majority'    // >50% wins
  | 'supermajority'      // >67% wins
  | 'unanimous'          // 100% required
  | 'ranked_choice'      // Instant runoff
  | 'approval'           // Vote for multiple
  | 'weighted'           // By reputation
  | 'delegated';         // Proxy voting

/**
 * Vote - individual agent's vote
 */
export interface Vote {
  agentId: string;
  proposalId: string;
  choice: string;              // Selected option
  confidence: number;          // 0-1
  reason?: string;             // Explanation
  timestamp: Date;
}

/**
 * Vote Result - outcome of voting
 */
export interface VoteResult {
  proposalId: string;
  winner?: string;             // Winning choice
  participation: number;       // 0-1, % of agents who voted
  consensus: number;           // 0-1, agreement level
  votes: Vote[];
  talliedAt: Date;
}

/**
 * Proposal - decision to be voted on
 */
export interface Proposal {
  id: string;
  title: string;
  description: string;
  options: ProposalOption[];
  proposer: string;            // Agent ID
  deadline: Date;
  config: VotingConfig;
  status: 'pending' | 'voting' | 'completed' | 'cancelled';
  result?: VoteResult;
  createdAt: Date;
}

/**
 * Proposal Option - available choice
 */
export interface ProposalOption {
  id: string;
  label: string;
  description?: string;
  votes?: number;              // Vote count
}

// ==================== Consensus Types ====================

/**
 * Consensus Algorithm - method for agreement
 */
export type ConsensusAlgorithm = 
  | 'threshold'         // Simple % threshold
  | 'raft'              // Leader-based
  | 'byzantine'         // Fault-tolerant
  | 'gossip';           // Gossip protocol

/**
 * Consensus Result - agreement outcome
 */
export interface ConsensusResult {
  proposalId: string;
  agreed: boolean;
  consensus: number;           // 0-1
  decision?: string;
  conflict: ConflictInfo | null;
  timestamp: Date;
  agents: ConsensusAgentStatus[];
}

/**
 * Conflict Info - when consensus fails
 */
export interface ConflictInfo {
  type: 'tie' | 'low_participation' | 'timeout' | 'byzantine';
  details: string;
  proposedResolution?: string;
}

/**
 * Consensus Agent Status - per-agent state
 */
export interface ConsensusAgentStatus {
  agentId: string;
  voted: boolean;
  agreed?: boolean;
  vote?: string;
}

// ==================== Reputation Types ====================

/**
 * Reputation Score - agent trust metrics
 */
export interface ReputationScore {
  overall: number;             // 0-1
  domains: Map<string, number>; // Domain-specific (security, performance, UX)
  accuracy: number;            // Historical prediction success
  participation: number;       // Engagement rate
  alignment: number;           // Agreement with consensus
  reliability: number;         // Uptime/responsiveness
  updatedAt: Date;
  history: ReputationEvent[];
}

/**
 * Reputation Event - history of changes
 */
export interface ReputationEvent {
  type: 'success' | 'failure' | 'participation' | 'decay';
  delta: number;               // Change in score
  reason: string;
  context?: string;
  timestamp: Date;
}

// ==================== Agent Types ====================

/**
 * Agent Role - specialized function
 */
export type AgentRole = 
  | 'security'          // Security patterns
  | 'performance'       // Optimization
  | 'ux'                // User experience
  | 'architecture'      // System design
  | 'testing'           // Quality assurance
  | 'general';          // General purpose

/**
 * Agent - registered voting agent
 */
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  capabilities: string[];
  reputation: ReputationScore;
  config: AgentConfig;
  active: boolean;
  createdAt: Date;
}

/**
 * Agent Config - agent-specific settings
 */
export interface AgentConfig {
  votingMethod: VotingMethod;
  minConfidence: number;
  delegateTo?: string;         // Proxy agent
  responseTimeout: number;     // ms
  maxLoad: number;             // max concurrent proposals
}

// ==================== Memory Types ====================

/**
 * Collective Memory - shared knowledge
 */
export interface CollectiveMemory {
  id: string;
  topic: string;
  content: string;
  contributors: string[];      // Agent IDs
  agreement: number;           // 0-1
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Config Types ====================

/**
 * Voting Config - global settings
 */
export interface VotingConfig {
  defaultMethod: VotingMethod;
  minParticipation: number;    // 0-1
  consensusThreshold: number;  // 0-1
  timeout: number;             // ms
  enableDelegation: boolean;
  reputationDecayRate: number; // per day
}

/**
 * Collective Config - Model D settings
 */
export interface CollectiveConfig {
  voting: VotingConfig;
  consensus: {
    algorithm: ConsensusAlgorithm;
    threshold: number;         // 0-1
    timeout: number;           // ms
    maxRetries: number;
  };
  reputation: {
    initial: number;           // Starting score
    decayRate: number;         // Daily decay rate
    boost: number;             // Success boost
    penalty: number;           // Failure penalty
  };
  agents: {
    maxConcurrentProposals: number;
    defaultTimeout: number;
    enableAutoDelegation: boolean;
  };
}
