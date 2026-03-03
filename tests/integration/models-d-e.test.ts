/**
 * Memphis Integration Tests - Models D & E
 * 
 * Collective + Meta-Cognitive integration tests.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import { describe, it, expect } from '@jest/globals';
import { VotingEngine } from '../src/collective/voting-engine.js';
import { ConsensusMechanism } from '../src/collective/consensus-mechanism.js';
import { ReputationTracker } from '../src/collective/reputation-tracker.js';
import { AgentRegistry } from '../src/collective/agent-registry.js';
import { CollectiveMemoryManager } from '../src/collective/collective-memory.js';
import { ReflectionEngine } from '../src/meta-cognitive/reflection-engine.js';
import { LearningLoopManager } from '../src/meta-cognitive/learning-loop.js';
import { StrategyEvolver } from '../src/meta-cognitive/strategy-evolver.js';
import { PerformanceTracker } from '../src/meta-cognitive/performance-tracker.js';

describe('Model D - Collective Decisions', () => {
  
  describe('VotingEngine', () => {
    it('should tally votes correctly', () => {
      const engine = new VotingEngine({
        defaultMethod: 'simple_majority',
        minParticipation: 0.6,
        timeout: 30000,
        enableDelegation: true,
        reputationDecayRate: 0.01
      });
      
      const votes = [
        { id: '1', proposalId: 'p1', agentId: 'a1', choice: 'yes', weight: 1, timestamp: new Date() },
        { id: '2', proposalId: 'p1', agentId: 'a2', choice: 'yes', weight: 1, timestamp: new Date() },
        { id: '3', proposalId: 'p1', agentId: 'a3', choice: 'no', weight: 1, timestamp: new Date() }
      ];
      
      const result = engine.tallyVotes(votes);
      expect(result.winner).toBe('yes');
      expect(result.totalVotes).toBe(3);
    });
    
    it('should validate votes', () => {
      const engine = new VotingEngine({
        defaultMethod: 'simple_majority',
        minParticipation: 0.6,
        timeout: 30000,
        enableDelegation: true,
        reputationDecayRate: 0.01
      });
      
      const proposal = {
        id: 'p1',
        title: 'Test',
        description: '',
        options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
        createdAt: new Date(),
        createdBy: 'system',
        status: 'active' as const,
        deadline: new Date(Date.now() + 86400000),
        votingMethod: 'simple_majority',
        minParticipation: 0.6,
        consensusThreshold: 0.67
      };
      
      const vote = {
        id: 'v1',
        proposalId: 'p1',
        agentId: 'a1',
        choice: 'yes',
        weight: 1,
        timestamp: new Date()
      };
      
      const validation = engine.validateVote(vote, proposal);
      expect(validation.valid).toBe(true);
    });
  });
  
  describe('ConsensusMechanism', () => {
    it('should achieve threshold consensus', async () => {
      const consensus = new ConsensusMechanism({
        algorithm: 'threshold',
        threshold: 0.67,
        timeout: 30000,
        maxRetries: 3
      });
      
      const proposal = {
        id: 'p1',
        title: 'Test',
        description: '',
        options: [],
        createdAt: new Date(),
        createdBy: 'system',
        status: 'active' as const,
        deadline: new Date(Date.now() + 86400000),
        votingMethod: 'simple_majority',
        minParticipation: 0.6,
        consensusThreshold: 0.67
      };
      
      const votes = [
        { id: '1', proposalId: 'p1', agentId: 'a1', choice: 'yes', weight: 1, timestamp: new Date() },
        { id: '2', proposalId: 'p1', agentId: 'a2', choice: 'yes', weight: 1, timestamp: new Date() },
        { id: '3', proposalId: 'p1', agentId: 'a3', choice: 'no', weight: 1, timestamp: new Date() }
      ];
      
      const agents = [
        { agentId: 'a1', voted: true },
        { agentId: 'a2', voted: true },
        { agentId: 'a3', voted: true }
      ];
      
      const result = await consensus.achieveConsensus(proposal, votes, agents);
      expect(result.consensus).toBeGreaterThan(0.66);
      expect(result.decision).toBe('yes');
    });
  });
  
  describe('ReputationTracker', () => {
    it('should track reputation', () => {
      const tracker = new ReputationTracker({
        decayRate: 0.01,
        boost: 0.05,
        penalty: 0.03
      });
      
      tracker.recordSuccess('agent1', 'decision_making');
      tracker.recordSuccess('agent1', 'decision_making');
      
      const score = tracker.getScore('agent1');
      expect(score).toBeDefined();
      expect(score!.overall).toBeGreaterThan(0.5);
    });
    
    it('should apply decay', () => {
      const tracker = new ReputationTracker({
        decayRate: 0.01,
        boost: 0.05,
        penalty: 0.03
      });
      
      tracker.recordSuccess('agent1', 'decision_making');
      const beforeScore = tracker.getScore('agent1')!.overall;
      
      tracker.applyDecay();
      const afterScore = tracker.getScore('agent1')!.overall;
      
      expect(afterScore).toBeLessThan(beforeScore);
    });
  });
  
  describe('AgentRegistry', () => {
    it('should register agents', () => {
      const registry = new AgentRegistry();
      
      const agent = registry.register('a1', 'Agent One', 'security', ['monitoring', 'alerts']);
      
      expect(agent.id).toBe('a1');
      expect(agent.name).toBe('Agent One');
      expect(agent.role).toBe('security');
      expect(agent.capabilities).toContain('monitoring');
    });
    
    it('should find best agent', () => {
      const registry = new AgentRegistry();
      
      registry.register('a1', 'Agent One', 'security', ['monitoring']);
      registry.register('a2', 'Agent Two', 'security', ['monitoring', 'advanced']);
      
      // Boost a2 reputation
      const agent2 = registry.getAgent('a2')!;
      agent2.reputation.overall = 0.9;
      registry.updateAgentReputation('a2', agent2.reputation);
      
      const best = registry.findBestAgent('security', 'monitoring');
      expect(best!.id).toBe('a2');
    });
  });
  
  describe('CollectiveMemoryManager', () => {
    it('should store memories', () => {
      const memory = new CollectiveMemoryManager();
      
      const mem = memory.addMemory('architecture', 'Use microservices', ['a1', 'a2'], 0.85);
      
      expect(mem.id).toBeDefined();
      expect(mem.topic).toBe('architecture');
      expect(mem.agreement).toBe(0.85);
    });
    
    it('should search memories', () => {
      const memory = new CollectiveMemoryManager();
      
      memory.addMemory('architecture', 'Use microservices for scalability', ['a1'], 0.8);
      memory.addMemory('architecture', 'Implement caching layer', ['a2'], 0.9);
      
      const results = memory.search('microservices');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

describe('Model E - Meta-Cognitive', () => {
  
  describe('ReflectionEngine', () => {
    it('should perform reflection', async () => {
      const engine = new ReflectionEngine({
        enabled: true,
        interval: 86400000,
        triggers: ['scheduled', 'manual'],
        maxFindings: 10,
        maxRecommendations: 5
      });
      
      const reflection = await engine.reflect('performance', 'manual');
      
      expect(reflection.id).toBeDefined();
      expect(reflection.type).toBe('performance');
      expect(reflection.findings.length).toBeGreaterThan(0);
    });
  });
  
  describe('LearningLoopManager', () => {
    it('should record learning', () => {
      const manager = new LearningLoopManager({
        enabled: true,
        domains: ['decision_making', 'prediction'],
        maxLessons: 100,
        applicabilityThreshold: 0.5,
        confidenceThreshold: 0.5
      });
      
      const lesson = manager.recordLearning(
        'decision_making',
        'Multi-factor analysis improves accuracy',
        'Observed in production',
        'experience',
        0.8,
        0.9,
        0.15
      );
      
      expect(lesson.id).toBeDefined();
      expect(lesson.domain).toBe('decision_making');
      expect(lesson.confidence).toBe(0.9);
    });
    
    it('should get top lessons', () => {
      const manager = new LearningLoopManager({
        enabled: true,
        domains: ['decision_making'],
        maxLessons: 100,
        applicabilityThreshold: 0.5,
        confidenceThreshold: 0.5
      });
      
      manager.recordLearning('decision_making', 'Lesson 1', 'Context', 'experience', 0.8, 0.9, 0.2);
      manager.recordLearning('decision_making', 'Lesson 2', 'Context', 'experience', 0.8, 0.7, 0.1);
      
      const top = manager.getTopLessons('decision_making', 2);
      expect(top.length).toBe(2);
    });
  });
  
  describe('StrategyEvolver', () => {
    it('should evolve strategies', async () => {
      const evolver = new StrategyEvolver({
        enabled: true,
        interval: 604800000,
        populationSize: 10,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        selectionPressure: 0.3
      });
      
      // Register some strategies
      const strat1 = evolver.registerStrategy({
        id: 's1',
        type: 'balanced',
        name: 'Strategy 1',
        description: 'Test',
        parameters: new Map([['exploration', 0.5]]),
        conditions: [],
        performance: {
          usageCount: 10,
          successCount: 8,
          failureCount: 2,
          successRate: 0.8,
          avgReward: 0.7,
          totalReward: 7,
          lastUsed: new Date()
        },
        version: 1,
        mutations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
      });
      
      const event = await evolver.evolve();
      expect(event.id).toBeDefined();
      expect(event.generation).toBe(0);
    });
    
    it('should record strategy usage', () => {
      const evolver = new StrategyEvolver({
        enabled: true,
        interval: 604800000,
        populationSize: 10,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        selectionPressure: 0.3
      });
      
      evolver.registerStrategy({
        id: 's1',
        type: 'balanced',
        name: 'Strategy 1',
        description: 'Test',
        parameters: new Map(),
        conditions: [],
        performance: {
          usageCount: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
          avgReward: 0,
          totalReward: 0,
          lastUsed: new Date()
        },
        version: 1,
        mutations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
      });
      
      evolver.recordUsage('s1', 0.8);
      const strategy = evolver.getStrategy('s1');
      
      expect(strategy!.performance.usageCount).toBe(1);
      expect(strategy!.performance.avgReward).toBe(0.8);
    });
  });
  
  describe('PerformanceTracker', () => {
    it('should track metrics', () => {
      const tracker = new PerformanceTracker({
        trackingEnabled: true,
        metrics: ['confidence', 'impact'],
        historySize: 100,
        alertThresholdes: new Map([['confidence', 0.5]])
      });
      
      tracker.record('confidence', 0.85);
      
      const value = tracker.getValue('confidence');
      expect(value).toBe(0.85);
    });
    
    it('should calculate trends', () => {
      const tracker = new PerformanceTracker({
        trackingEnabled: true,
        metrics: ['confidence'],
        historySize: 100,
        alertThresholdes: new Map()
      });
      
      // Record improving trend
      for (let i = 0; i < 10; i++) {
        tracker.record('confidence', 0.5 + (i * 0.05));
      }
      
      const metric = tracker.getMetric('confidence');
      expect(metric!.trend).toBe('improving');
    });
  });
});

describe('Integration - D + E', () => {
  
  it('should integrate collective with meta-cognitive', async () => {
    // Setup collective
    const voting = new VotingEngine({
      defaultMethod: 'simple_majority',
      minParticipation: 0.6,
      timeout: 30000,
      enableDelegation: true,
      reputationDecayRate: 0.01
    });
    
    const reputation = new ReputationTracker({
      decayRate: 0.01,
      boost: 0.05,
      penalty: 0.03
    });
    
    // Setup meta-cognitive
    const learning = new LearningLoopManager({
      enabled: true,
      domains: ['decision_making'],
      maxLessons: 100,
      applicabilityThreshold: 0.5,
      confidenceThreshold: 0.5
    });
    
    // Record collective decision success
    reputation.recordSuccess('agent1', 'decision_making');
    
    // Learn from it
    learning.recordLearning(
      'decision_making',
      'Collective voting improves accuracy',
      'Observed in multi-agent test',
      'experience',
      0.9,
      0.85,
      0.2
    );
    
    // Verify integration
    const repScore = reputation.getScore('agent1');
    const lessons = learning.getTopLessons('decision_making', 1);
    
    expect(repScore!.overall).toBeGreaterThan(0.5);
    expect(lessons.length).toBe(1);
  });
});
