/**
 * Memphis Model D: Integration Tests
 * 
 * Comprehensive tests for collective decision system.
 * 
 * @version 1.0.0
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
  Agent,
  CollectiveMemory,
  VotingConfig,
  CollectiveConfig
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

    it('should cast vote successfully', () => {
      const proposal: Proposal = {
        id: 'prop_1',
        title: 'Test Proposal',
        description: 'A test proposal',
        options: [
          { id: 'opt_1', label: 'Option A' },
          { id: 'opt_2', label: 'Option B' }
        ],
        proposer: 'agent_1',
        deadline: new Date(Date.now() + 60000),
        status: 'active',
        createdAt: new Date()
      };

      const vote: Vote = {
        id: 'vote_1',
        proposalId: 'prop_1',
        agentId: 'agent_1',
        choice: 'opt_1',
        confidence: 0.9,
        timestamp: new Date()
      };

      const result = votingEngine.castVote(proposal, vote);
      expect(result).toBeDefined();
      expect(result.totalVotes).toBe(1);
    });

    it('should calculate simple majority', () => {
      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'A', confidence: 0.7, timestamp: new Date() },
        { id: 'v3', proposalId: 'p1', agentId: 'a3', choice: 'B', confidence: 0.9, timestamp: new Date() }
      ];

      const result = votingEngine.tallyVotes('simple_majority', votes);
      expect(result.winner).toBe('A');
      expect(result.totals.get('A')).toBe(2);
      expect(result.totals.get('B')).toBe(1);
    });

    it('should calculate supermajority', () => {
      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'A', confidence: 0.7, timestamp: new Date() },
        { id: 'v3', proposalId: 'p1', agentId: 'a3', choice: 'A', confidence: 0.9, timestamp: new Date() },
        { id: 'v4', proposalId: 'p1', agentId: 'a4', choice: 'B', confidence: 0.6, timestamp: new Date() }
      ];

      const result = votingEngine.tallyVotes('supermajority', votes, 0.67);
      expect(result.winner).toBe('A');
      expect(result.consensus).toBeGreaterThan(0.67);
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

      const weights = new Map([
        ['a1', 0.3],
        ['a2', 0.7]
      ]);

      const result = votingEngine.tallyVotes('weighted', votes, 0.5, weights);
      expect(result.winner).toBe('B'); // Higher weight
    });

    it('should detect ties', () => {
      const votes: Vote[] = [
        { id: 'v1', proposalId: 'p1', agentId: 'a1', choice: 'A', confidence: 0.8, timestamp: new Date() },
        { id: 'v2', proposalId: 'p1', agentId: 'a2', choice: 'B', confidence: 0.7, timestamp: new Date() }
      ];

      const result = votingEngine.tallyVotes('simple_majority', votes);
      expect(result.tied).toBe(true);
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
        decay: 0.01,
        boost: 0.05,
        penalty: 0.03
      });
    });

    it('should create reputation tracker', () => {
      expect(reputationTracker).toBeDefined();
    });

    it('should initialize agent reputation', () => {
      const reputation = reputationTracker.initialize('agent_1');
      expect(reputation.overall).toBe(0.5);
      expect(reputation.accuracy).toBe(0.5);
    });

    it('should record success', () => {
      reputationTracker.initialize('agent_1');
      reputationTracker.recordSuccess('agent_1', 'decision_making');
      
      const reputation = reputationTracker.getReputation('agent_1');
      expect(reputation?.overall).toBeGreaterThan(0.5);
    });

    it('should record failure', () => {
      reputationTracker.initialize('agent_1');
      reputationTracker.recordFailure('agent_1', 'decision_making');
      
      const reputation = reputationTracker.getReputation('agent_1');
      expect(reputation?.overall).toBeLessThan(0.5);
    });

    it('should apply time decay', async () => {
      reputationTracker.initialize('agent_1');
      reputationTracker.recordSuccess('agent_1', 'decision_making');
      
      const before = reputationTracker.getReputation('agent_1')?.overall || 0;
      
      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      reputationTracker.applyDecay('agent_1');
      const after = reputationTracker.getReputation('agent_1')?.overall || 0;
      
      expect(after).toBeLessThan(before);
    });

    it('should identify experts', () => {
      reputationTracker.initialize('agent_1');
      reputationTracker.initialize('agent_2');
      
      reputationTracker.recordSuccess('agent_1', 'decision_making');
      reputationTracker.recordSuccess('agent_1', 'decision_making');
      reputationTracker.recordSuccess('agent_2', 'prediction');
      
      const experts = reputationTracker.getExperts('decision_making', 0.6);
      expect(experts).toContain('agent_1');
      expect(experts).not.toContain('agent_2');
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
      expect(results).toHaveLength(1);
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
      system.reputationTracker.initialize('a1');
      system.reputationTracker.initialize('a2');
      system.reputationTracker.initialize('a3');
      
      // Create proposal
      const proposal: Proposal = {
        id: 'p1',
        title: 'Adopt new framework',
        description: 'Should we adopt framework X?',
        options: [
          { id: 'yes', label: 'Yes' },
          { id: 'no', label: 'No' }
        ],
        proposer: 'a1',
        deadline: new Date(Date.now() + 60000),
        status: 'active',
        createdAt: new Date()
      };
      
      // Cast votes
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
