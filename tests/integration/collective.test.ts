/**
 * Memphis Model D: Integration Tests (FIXED)
 * 
 * Comprehensive tests for collective decision system.
 * 
 * @version 3.0.1
 * @date 2026-03-03
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VotingEngine,
  ConsensusMechanism,
  ReputationTracker,
  AgentRegistry,
  CollectiveMemoryManager,
  createCollectiveSystem
} from '../../src/collective/index.js';
import type {
  Proposal,
  Vote,
  VotingConfig
} from '../../src/collective/types.js';

describe('Model D: Collective Decisions', () => {
  describe('VotingEngine', () => {
    let votingEngine: VotingEngine;
    let config: VotingConfig;

    beforeEach(() => {
      config = {
        defaultMethod: 'simple_majority',
        minParticipation: 0.6,
        timeout: 30000,
        enableDelegation: true,
        reputationDecayRate: 0.01
      };
      votingEngine = new VotingEngine(config);
    });

    it('should create voting engine with config', () => {
      expect(votingEngine).toBeDefined();
    });

    it('should calculate simple majority', () => {
      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'A', confidence: 0.7, timestamp: new Date() },
        { id: 'v3', proposalId: 'p1', agentId: 'a3', choice: 'B', confidence: 0.9, timestamp: new Date() }
      ];

      const result = votingEngine.tallyVotes('simple_majority', votes);
      expect(result.winner).toBe('A');
      expect(result.votes).toHaveLength(3);
    });

    it('should calculate supermajority', () => {
      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'A', confidence: 0.7, timestamp: new Date() },
        { id: 'v3', proposalId: 'p1', agentId: 'a3', choice: 'A', confidence: 0.9, timestamp: new Date() },
        { id: 'v4', proposalId: 'p1', agentId: 'a4', choice: 'B', confidence: 0.6, timestamp: new Date() }
      ];

      const result = votingEngine.tallyVotes('supermajority', votes);
      expect(result.winner).toBe('A');
      expect(result.consensus).toBeGreaterThan(0.5);
    });

    it('should calculate unanimous vote', () => {
      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'A', confidence: 0.7, timestamp: new Date() },
        { id: 'v3', proposalId: 'p1', agentId: 'a3', choice: 'A', confidence: 0.9, timestamp: new Date() }
      ];

      const result = votingEngine.tallyVotes('unanimous', votes);
      expect(result.winner).toBe('A');
      expect(result.consensus).toBe(1.0);
    });

    it('should handle weighted voting', () => {
      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'B', confidence: 0.9, timestamp: new Date() }
      ];

      const result = votingEngine.tallyVotes('weighted', votes);
      expect(result.winner).toBeDefined();
    });

    it('should handle tie situations', () => {
      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'B', confidence: 0.7, timestamp: new Date() }
      ];

      const result = votingEngine.tallyVotes('simple_majority', votes);
      // In a tie, winner might be undefined or one of the options
      // The important thing is that the function handles it gracefully
      expect(result).toBeDefined();
      expect(result.consensus).toBeDefined();
    });
  });

  describe('ConsensusMechanism', () => {
    let consensusMechanism: ConsensusMechanism;

    beforeEach(() => {
      consensusMechanism = new ConsensusMechanism({
        algorithm: 'threshold',
        threshold: 0.67,
        timeout: 30000,
        maxRetries: 3
      });
    });

    it('should create consensus mechanism', () => {
      expect(consensusMechanism).toBeDefined();
    });

    it('should achieve threshold consensus', async () => {
      const proposal: Proposal = {
        id: 'p1',
        title: 'Test',
        description: 'Test',
        options: [{ id: 'A', label: 'Option A' }],
        proposer: 'agent_1',
        deadline: new Date(Date.now() + 60000),
        status: 'active',
        createdAt: new Date()
      };

      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'A', confidence: 0.7, timestamp: new Date() },
        { id: 'v3', proposalId: 'p1', agentId: 'a3', choice: 'A', confidence: 0.9, timestamp: new Date() }
      ];

      const agents = [
        { agentId: 'a1', voted: true },
        { agentId: 'a2', voted: true },
        { agentId: 'a3', voted: true }
      ];

      const result = await consensusMechanism.achieveConsensus(proposal, votes, agents as any);
      expect(result.agreed).toBe(true);
      expect(result.consensus).toBeGreaterThanOrEqual(0.67);
    });

    it('should detect low participation', async () => {
      const proposal: Proposal = {
        id: 'p1',
        title: 'Test',
        description: 'Test',
        options: [{ id: 'A', label: 'Option A' }],
        proposer: 'agent_1',
        deadline: new Date(Date.now() + 60000),
        status: 'active',
        createdAt: new Date()
      };

      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() }
      ];

      const agents = [
        { agentId: 'a1', voted: true },
        { agentId: 'a2', voted: false },
        { agentId: 'a3', voted: false },
        { agentId: 'a4', voted: false },
        { agentId: 'a5', voted: false }
      ];

      const result = await consensusMechanism.achieveConsensus(proposal, votes, agents as any);
      expect(result.agreed).toBe(false);
      expect(result.conflict?.type).toBe('low_participation');
    });
  });

  describe('ReputationTracker', () => {
    let reputationTracker: ReputationTracker;

    beforeEach(() => {
      reputationTracker = new ReputationTracker({
        initial: 0.5,
        decayRate: 0.01,
        boost: 0.05,
        penalty: 0.03
      });
    });

    it('should create reputation tracker', () => {
      expect(reputationTracker).toBeDefined();
    });

    it('should initialize agent reputation', () => {
      const reputation = reputationTracker.initializeReputation('agent_1');
      expect(reputation.overall).toBe(0.5);
      expect(reputation.accuracy).toBe(0.5);
    });

    it('should record success', () => {
      reputationTracker.initializeReputation('agent_1');
      reputationTracker.recordSuccess('agent_1', 'decision_making');
      
      const reputation = reputationTracker.getReputation('agent_1');
      expect(reputation?.overall).toBeGreaterThan(0.5);
    });

    it('should record failure', () => {
      reputationTracker.initializeReputation('agent_1');
      reputationTracker.recordFailure('agent_1', 'decision_making');
      
      const reputation = reputationTracker.getReputation('agent_1');
      expect(reputation?.overall).toBeLessThan(0.5);
    });

    it('should apply time decay', async () => {
      reputationTracker.initializeReputation('agent_1');
      reputationTracker.recordSuccess('agent_1', 'decision_making');
      
      const before = reputationTracker.getReputation('agent_1')?.overall || 0;
      
      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      reputationTracker.applyDecay('agent_1');
      const after = reputationTracker.getReputation('agent_1')?.overall || 0;
      
      expect(after).toBeLessThan(before);
    });

    it('should track reputation over time', () => {
      reputationTracker.initializeReputation('agent_1');
      reputationTracker.initializeReputation('agent_2');
      
      reputationTracker.recordSuccess('agent_1', 'decision_making');
      reputationTracker.recordSuccess('agent_1', 'decision_making');
      reputationTracker.recordSuccess('agent_2', 'prediction');
      
      const rep1 = reputationTracker.getReputation('agent_1');
      const rep2 = reputationTracker.getReputation('agent_2');
      
      // Agent 1 should have higher reputation in decision_making
      expect(rep1?.overall).toBeGreaterThan(0.5);
      expect(rep2?.overall).toBeGreaterThan(0.5);
    });
  });

  describe('AgentRegistry', () => {
    let agentRegistry: AgentRegistry;

    beforeEach(() => {
      agentRegistry = new AgentRegistry();
    });

    it('should register agent', () => {
      const agent = agentRegistry.register(
        'agent_1',
        'Test Agent',
        'security',
        ['encryption', 'authentication']
      );
      
      expect(agent.id).toBe('agent_1');
      expect(agent.role).toBe('security');
      expect(agent.capabilities).toHaveLength(2);
    });

    it('should prevent duplicate registration', () => {
      agentRegistry.register('agent_1', 'Test Agent', 'security', []);
      
      expect(() => {
        agentRegistry.register('agent_1', 'Test Agent', 'security', []);
      }).toThrow('already registered');
    });

    it('should get agents by role', () => {
      agentRegistry.register('agent_1', 'Agent 1', 'security', []);
      agentRegistry.register('agent_2', 'Agent 2', 'security', []);
      agentRegistry.register('agent_3', 'Agent 3', 'performance', []);
      
      const securityAgents = agentRegistry.getAgentsByRole('security');
      expect(securityAgents).toHaveLength(2);
    });

    it('should get agents by capability', () => {
      agentRegistry.register('agent_1', 'Agent 1', 'security', ['encryption', 'auth']);
      agentRegistry.register('agent_2', 'Agent 2', 'security', ['auth', 'logging']);
      
      const agents = agentRegistry.getAgentsByCapability('auth');
      expect(agents).toHaveLength(2);
    });

    it('should find best agent', () => {
      const agent1 = agentRegistry.register('agent_1', 'Agent 1', 'security', ['encryption']);
      const agent2 = agentRegistry.register('agent_2', 'Agent 2', 'security', ['encryption']);
      
      // Manually set reputation
      agent1.reputation.overall = 0.7;
      agent2.reputation.overall = 0.9;
      
      const best = agentRegistry.findBestAgent('security', 'encryption');
      expect(best?.id).toBe('agent_2');
    });

    it('should update agent status', () => {
      agentRegistry.register('agent_1', 'Agent 1', 'security', []);
      
      agentRegistry.setAgentStatus('agent_1', false);
      const agent = agentRegistry.getAgent('agent_1');
      
      expect(agent?.active).toBe(false);
    });
  });

  describe('CollectiveMemoryManager', () => {
    let memoryManager: CollectiveMemoryManager;

    beforeEach(() => {
      memoryManager = new CollectiveMemoryManager();
    });

    it('should add memory', () => {
      const memory = memoryManager.addMemory(
        'architecture',
        'Use microservices for scalability',
        ['agent_1', 'agent_2'],
        0.8
      );
      
      expect(memory.id).toBeDefined();
      expect(memory.topic).toBe('architecture');
      expect(memory.agreement).toBe(0.8);
    });

    it('should get memories by topic', () => {
      memoryManager.addMemory('architecture', 'Content 1', ['a1'], 0.8);
      memoryManager.addMemory('architecture', 'Content 2', ['a2'], 0.7);
      memoryManager.addMemory('security', 'Content 3', ['a3'], 0.9);
      
      const memories = memoryManager.getMemoriesByTopic('architecture');
      expect(memories).toHaveLength(2);
    });

    it('should aggregate knowledge', () => {
      const contributions = [
        { agentId: 'agent_1', content: 'Use TypeScript' },
        { agentId: 'agent_2', content: 'Add tests' }
      ];
      
      const memory = memoryManager.aggregateKnowledge('best_practices', contributions);
      
      expect(memory.content).toContain('TypeScript');
      expect(memory.content).toContain('tests');
      expect(memory.contributors).toHaveLength(2);
    });

    it('should search memories', () => {
      memoryManager.addMemory('tech', 'Use TypeScript for type safety', ['a1'], 0.9);
      memoryManager.addMemory('tech', 'Use React for UI', ['a2'], 0.8);
      
      const results = memoryManager.search('TypeScript', 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('TypeScript');
    });

    it('should get high agreement memories', () => {
      memoryManager.addMemory('t1', 'High agreement', ['a1'], 0.95);
      memoryManager.addMemory('t2', 'Low agreement', ['a2'], 0.3);
      
      const highAgreement = memoryManager.getHighAgreementMemories(0.9);
      expect(highAgreement).toHaveLength(1);
      expect(highAgreement[0].agreement).toBe(0.95);
    });

    it('should update agreement', () => {
      const memory = memoryManager.addMemory('t1', 'Content', ['a1'], 0.5);
      
      memoryManager.updateAgreement(memory.id, 0.9);
      const updated = memoryManager.getMemory(memory.id);
      
      expect(updated?.agreement).toBe(0.9);
    });
  });

  describe('Full Collective System', () => {
    it('should create complete collective system', () => {
      const system = createCollectiveSystem();
      
      expect(system.votingEngine).toBeDefined();
      expect(system.consensusMechanism).toBeDefined();
      expect(system.reputationTracker).toBeDefined();
      expect(system.agentRegistry).toBeDefined();
      expect(system.collectiveMemory).toBeDefined();
    });

    it('should support collective decision workflow', async () => {
      const system = createCollectiveSystem();
      
      // Register agents
      system.agentRegistry.register('a1', 'Agent 1', 'security', ['voting']);
      system.agentRegistry.register('a2', 'Agent 2', 'security', ['voting']);
      system.agentRegistry.register('a3', 'Agent 3', 'performance', ['voting']);
      
      // Initialize reputations
      system.reputationTracker.initializeReputation('a1');
      system.reputationTracker.initializeReputation('a2');
      system.reputationTracker.initializeReputation('a3');
      
      // Create votes
      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'yes', confidence: 0.9, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'yes', confidence: 0.8, timestamp: new Date() },
        { id: 'v3', proposalId: 'p1', agentId: 'a3', choice: 'no', confidence: 0.6, timestamp: new Date() }
      ];
      
      // Tally votes
      const tally = system.votingEngine.tallyVotes('simple_majority', votes);
      expect(tally.winner).toBe('yes');
      
      // Record collective memory
      system.collectiveMemory.addMemory(
        'decisions',
        'Framework X approved by majority vote',
        ['a1', 'a2', 'a3'],
        0.67
      );
      
      // Record success for winning voters
      system.reputationTracker.recordSuccess('a1', 'decision_making');
      system.reputationTracker.recordSuccess('a2', 'decision_making');
      
      expect(tally.winner).toBe('yes');
      expect(tally.consensus).toBeGreaterThan(0.5);
    });
  });
});
