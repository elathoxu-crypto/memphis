/**
 * Memphis Model D: Collective Decisions
 * 
 * Multi-agent collective intelligence through voting, consensus,
 * reputation tracking, and shared memory.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

// Export all types
export * from './types.js';

// Export core components
export { VotingEngine } from './voting-engine.js';
export { ConsensusMechanism } from './consensus-mechanism.js';
export { ReputationTracker } from './reputation-tracker.js';
export { AgentRegistry } from './agent-registry.js';
export { CollectiveMemoryManager } from './collective-memory.js';

// Import types for factory function
import type { CollectiveConfig, VotingConfig } from './types.js';
import { VotingEngine } from './voting-engine.js';
import { ConsensusMechanism } from './consensus-mechanism.js';
import { ReputationTracker } from './reputation-tracker.js';
import { AgentRegistry } from './agent-registry.js';
import { CollectiveMemoryManager } from './collective-memory.js';

/**
 * Create complete collective system
 */
export function createCollectiveSystem(config?: Partial<CollectiveConfig>) {
  const defaultConfig: CollectiveConfig = {
    voting: {
      defaultMethod: 'simple_majority',
      minParticipation: 0.6,
      timeout: 30000,
      enableDelegation: true,
      reputationDecayRate: 0.01
    } as VotingConfig,
    consensus: {
      algorithm: 'threshold',
      threshold: 0.67,
      timeout: 30000,
      maxRetries: 3
    },
    reputation: {
      initial: 0.5,
      decayRate: 0.01,
      boost: 0.05,
      penalty: 0.03
    },
    agents: {
      maxConcurrentProposals: 10,
      defaultTimeout: 5000,
      enableAutoDelegation: false
    }
  };

  const finalConfig = { ...defaultConfig, ...config };

  return {
    votingEngine: new VotingEngine(finalConfig.voting),
    consensusMechanism: new ConsensusMechanism(finalConfig.consensus),
    reputationTracker: new ReputationTracker(finalConfig.reputation),
    agentRegistry: new AgentRegistry(),
    collectiveMemory: new CollectiveMemoryManager(),
    config: finalConfig
  };
}

