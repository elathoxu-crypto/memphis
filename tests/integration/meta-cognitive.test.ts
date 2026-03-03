/**
 * Memphis Model E: Integration Tests
 * 
 * Comprehensive tests for meta-cognitive system.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReflectionEngine,
  LearningLoopManager,
  StrategyEvolver,
  PerformanceTracker,
  createMetaCognitiveSystem
} from '../../src/meta-cognitive/index.js';
import type {
  Reflection,
  LearningEvent,
  Strategy,
  PerformanceMetric,
  MetaCognitiveConfig
} from '../../src/meta-cognitive/types.js';

describe('Model E: Meta-Cognitive', () => {
  describe('ReflectionEngine', () => {
    let reflectionEngine: ReflectionEngine;

    beforeEach(() => {
      reflectionEngine = new ReflectionEngine({
        enabled: true,
        interval: 86400000,
        triggers: ['scheduled', 'threshold', 'event', 'manual'],
        maxFindings: 10,
        maxRecommendations: 5
      });
    });

    it('should create reflection engine', () => {
      expect(reflectionEngine).toBeDefined();
    });

    it('should perform performance reflection', async () => {
      const context = new Map([
        ['decisionCount', 10],
        ['predictionCount', 5]
      ]);
      
      const reflection = await reflectionEngine.reflect('performance', 'manual', context);
      
      expect(reflection.id).toBeDefined();
      expect(reflection.type).toBe('performance');
      expect(reflection.findings).toBeInstanceOf(Array);
      expect(reflection.insights).toBeInstanceOf(Array);
      expect(reflection.recommendations).toBeInstanceOf(Array);
      expect(reflection.confidence).toBeGreaterThanOrEqual(0);
      expect(reflection.confidence).toBeLessThanOrEqual(1);
    });

    it('should perform pattern reflection', async () => {
      // Add some reflections first
      await reflectionEngine.reflect('performance', 'manual');
      await reflectionEngine.reflect('performance', 'manual');
      await reflectionEngine.reflect('success', 'manual');
      
      const reflection = await reflectionEngine.reflect('pattern', 'manual');
      
      expect(reflection.type).toBe('pattern');
      expect(reflection.findings.length).toBeGreaterThan(0);
    });

    it('should perform failure analysis', async () => {
      // Add negative impact reflection
      const reflection1 = await reflectionEngine.reflect('performance', 'manual');
      // Manually set negative impact for testing
      (reflection1 as any).impact = -0.5;
      
      const failureReflection = await reflectionEngine.reflect('failure', 'manual');
      
      expect(failureReflection.type).toBe('failure');
    });

    it('should perform success analysis', async () => {
      const successReflection = await reflectionEngine.reflect('success', 'manual');
      
      expect(successReflection.type).toBe('success');
      expect(successReflection.insights).toBeInstanceOf(Array);
    });

    it('should perform alignment reflection', async () => {
      const alignmentReflection = await reflectionEngine.reflect('alignment', 'manual');
      
      expect(alignmentReflection.type).toBe('alignment');
      expect(alignmentReflection.findings).toBeInstanceOf(Array);
    });

    it('should perform evolution reflection', async () => {
      // Need multiple reflections for evolution analysis
      for (let i = 0; i < 10; i++) {
        await reflectionEngine.reflect('performance', 'manual');
      }
      
      const evolutionReflection = await reflectionEngine.reflect('evolution', 'manual');
      
      expect(evolutionReflection.type).toBe('evolution');
      expect(evolutionReflection.findings.length).toBeGreaterThan(0);
    });

    it('should generate actions from recommendations', async () => {
      const context = new Map([
        ['decisionCount', 100],
        ['predictionCount', 50]
      ]);
      
      const reflection = await reflectionEngine.reflect('performance', 'manual', context);
      
      expect(reflection.actions).toBeInstanceOf(Array);
      expect(reflection.actions.length).toBeLessThanOrEqual(5);
      
      if (reflection.actions.length > 0) {
        expect(reflection.actions[0]).toHaveProperty('type');
        expect(reflection.actions[0]).toHaveProperty('target');
        expect(reflection.actions[0]).toHaveProperty('priority');
        expect(reflection.actions[0]).toHaveProperty('status');
      }
    });

    it('should calculate confidence score', async () => {
      const reflection = await reflectionEngine.reflect('performance', 'manual');
      
      expect(reflection.confidence).toBeGreaterThanOrEqual(0);
      expect(reflection.confidence).toBeLessThanOrEqual(1);
    });

    it('should assess impact score', async () => {
      const reflection = await reflectionEngine.reflect('performance', 'manual');
      
      expect(reflection.impact).toBeGreaterThanOrEqual(-1);
      expect(reflection.impact).toBeLessThanOrEqual(1);
    });

    it('should track reflection history', async () => {
      await reflectionEngine.reflect('performance', 'manual');
      await reflectionEngine.reflect('success', 'manual');
      await reflectionEngine.reflect('failure', 'manual');
      
      const reflections = reflectionEngine.getReflections();
      
      expect(reflections).toHaveLength(3);
    });
  });

  describe('LearningLoopManager', () => {
    let learningManager: LearningLoopManager;

    beforeEach(() => {
      learningManager = new LearningLoopManager({
        enabled: true,
        domains: ['decision_making', 'prediction', 'communication', 'efficiency', 'creativity', 'adaptation'],
        maxLessons: 1000,
        applicabilityThreshold: 0.5,
        confidenceThreshold: 0.5
      });
    });

    it('should create learning manager', () => {
      expect(learningManager).toBeDefined();
    });

    it('should record learning event', () => {
      const event = learningManager.recordLearning(
        'decision_making',
        'Test lesson: always validate inputs',
        'Input validation context',
        'experience',
        0.8,
        0.9,
        0.5
      );
      
      expect(event.id).toBeDefined();
      expect(event.domain).toBe('decision_making');
      expect(event.lesson).toContain('validate inputs');
      expect(event.confidence).toBe(0.9);
    });

    it('should apply lesson', () => {
      const event = learningManager.recordLearning(
        'decision_making',
        'Test lesson',
        'Context',
        'experience'
      );
      
      const applied = learningManager.applyLesson(event.id);
      
      expect(applied).toBe(true);
      expect(event.usageCount).toBe(1);
      expect(event.appliedAt).toBeDefined();
    });

    it('should record impact', () => {
      const event = learningManager.recordLearning(
        'decision_making',
        'Test lesson',
        'Context',
        'experience'
      );
      
      learningManager.recordImpact(event.id, 0.7);
      
      expect(event.actualImpact).toBe(0.7);
    });

    it('should run learning cycle', async () => {
      // Add some lessons
      learningManager.recordLearning('decision_making', 'Lesson 1', 'Context', 'experience');
      learningManager.recordLearning('decision_making', 'Lesson 2', 'Context', 'feedback');
      
      const result = await learningManager.runCycle('decision_making');
      
      expect(result.newLessons).toBe(2);
      expect(result.appliedLessons).toBe(0);
      expect(result.improvement).toBeGreaterThanOrEqual(-1);
      expect(result.improvement).toBeLessThanOrEqual(1);
    });

    it('should get top lessons', () => {
      learningManager.recordLearning('decision_making', 'High impact', 'Context', 'experience', 0.9, 0.9, 0.9);
      learningManager.recordLearning('decision_making', 'Low impact', 'Context', 'experience', 0.9, 0.9, 0.1);
      
      const topLessons = learningManager.getTopLessons('decision_making', 5);
      
      expect(topLessons.length).toBeGreaterThan(0);
      expect(topLessons[0].expectedImpact).toBeGreaterThan(topLessons[1]?.expectedImpact || 0);
    });

    it('should get lessons by source', () => {
      learningManager.recordLearning('decision_making', 'Lesson 1', 'Context', 'experience');
      learningManager.recordLearning('decision_making', 'Lesson 2', 'Context', 'feedback');
      learningManager.recordLearning('decision_making', 'Lesson 3', 'Context', 'reflection');
      
      const experienceLessons = learningManager.getLessonsBySource('experience');
      
      expect(experienceLessons).toHaveLength(1);
    });

    it('should get overall improvement', () => {
      learningManager.recordLearning('decision_making', 'Lesson', 'Context', 'experience');
      learningManager.recordImpact('decision_making', 0.5);
      
      const improvement = learningManager.getOverallImprovement();
      
      expect(improvement).toBeGreaterThanOrEqual(-1);
      expect(improvement).toBeLessThanOrEqual(1);
    });

    it('should get statistics', () => {
      learningManager.recordLearning('decision_making', 'Lesson 1', 'Context', 'experience', 0.8, 0.9);
      learningManager.recordLearning('prediction', 'Lesson 2', 'Context', 'feedback', 0.7, 0.8);
      
      const stats = learningManager.getStats();
      
      expect(stats.totalLessons).toBe(2);
      expect(stats.avgApplicability).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });
  });

  describe('StrategyEvolver', () => {
    let strategyEvolver: StrategyEvolver;

    beforeEach(() => {
      strategyEvolver = new StrategyEvolver({
        enabled: true,
        interval: 604800000,
        populationSize: 20,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        selectionPressure: 0.3
      });
    });

    it('should create strategy evolver', () => {
      expect(strategyEvolver).toBeDefined();
    });

    it('should register strategy', () => {
      const strategy: Strategy = {
        id: 'strat_1',
        type: 'exploration',
        name: 'Test Strategy',
        description: 'A test strategy',
        parameters: new Map([['learning_rate', 0.5]]),
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
      };
      
      strategyEvolver.registerStrategy(strategy);
      
      const retrieved = strategyEvolver.getStrategy('strat_1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Strategy');
    });

    it('should record strategy usage', () => {
      const strategy: Strategy = {
        id: 'strat_1',
        type: 'exploration',
        name: 'Test Strategy',
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
      };
      
      strategyEvolver.registerStrategy(strategy);
      strategyEvolver.recordUsage('strat_1', 0.8);
      
      const updated = strategyEvolver.getStrategy('strat_1');
      expect(updated?.performance.usageCount).toBe(1);
      expect(updated?.performance.avgReward).toBe(0.8);
      expect(updated?.performance.successCount).toBe(1);
    });

    it('should evolve strategies', async () => {
      // Register multiple strategies
      for (let i = 0; i < 5; i++) {
        const strategy: Strategy = {
          id: `strat_${i}`,
          type: 'exploration',
          name: `Strategy ${i}`,
          description: 'Test',
          parameters: new Map([['learning_rate', 0.5]]),
          conditions: [],
          performance: {
            usageCount: 10,
            successCount: i * 2,
            failureCount: 10 - i * 2,
            successRate: i * 0.2,
            avgReward: i * 0.1,
            totalReward: i,
            lastUsed: new Date()
          },
          version: 1,
          mutations: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          active: true
        };
        
        strategyEvolver.registerStrategy(strategy);
      }
      
      const event = await strategyEvolver.evolve();
      
      expect(event.id).toBeDefined();
      expect(event.generation).toBe(0);
      expect(event.parentStrategies.length).toBeGreaterThan(0);
    });

    it('should get best strategy', () => {
      // Register strategies with different performance
      for (let i = 0; i < 3; i++) {
        const strategy: Strategy = {
          id: `strat_${i}`,
          type: 'exploration',
          name: `Strategy ${i}`,
          description: 'Test',
          parameters: new Map(),
          conditions: [],
          performance: {
            usageCount: 10,
            successCount: i * 3,
            failureCount: 10 - i * 3,
            successRate: i * 0.3,
            avgReward: i * 0.2,
            totalReward: i * 2,
            lastUsed: new Date()
          },
          version: 1,
          mutations: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          active: true
        };
        
        strategyEvolver.registerStrategy(strategy);
      }
      
      const best = strategyEvolver.getBestStrategy();
      
      expect(best).toBeDefined();
      expect(best?.performance.successRate).toBe(0.6); // strat_2 has highest
    });

    it('should get statistics', () => {
      const strategy: Strategy = {
        id: 'strat_1',
        type: 'exploration',
        name: 'Test',
        description: 'Test',
        parameters: new Map(),
        conditions: [],
        performance: {
          usageCount: 10,
          successCount: 7,
          failureCount: 3,
          successRate: 0.7,
          avgReward: 0.5,
          totalReward: 5,
          lastUsed: new Date()
        },
        version: 1,
        mutations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
      };
      
      strategyEvolver.registerStrategy(strategy);
      
      const stats = strategyEvolver.getStats();
      
      expect(stats.totalStrategies).toBe(1);
      expect(stats.activeStrategies).toBe(1);
      expect(stats.avgSuccessRate).toBe(0.7);
    });
  });

  describe('PerformanceTracker', () => {
    let performanceTracker: PerformanceTracker;

    beforeEach(() => {
      performanceTracker = new PerformanceTracker({
        trackingEnabled: true,
        metrics: ['confidence', 'impact', 'velocity'],
        historySize: 100,
        alertThresholds: new Map([
          ['confidence', 0.5],
          ['impact', 0]
        ])
      });
    });

    it('should create performance tracker', () => {
      expect(performanceTracker).toBeDefined();
    });

    it('should record metric', () => {
      performanceTracker.record('confidence', 0.85);
      
      const value = performanceTracker.getValue('confidence');
      expect(value).toBe(0.85);
    });

    it('should get metric', () => {
      performanceTracker.record('confidence', 0.9);
      
      const metric = performanceTracker.getMetric('confidence');
      
      expect(metric).toBeDefined();
      expect(metric?.name).toBe('confidence');
      expect(metric?.value).toBe(0.9);
    });

    it('should track metric history', () => {
      performanceTracker.record('confidence', 0.5);
      performanceTracker.record('confidence', 0.6);
      performanceTracker.record('confidence', 0.7);
      
      const history = performanceTracker.getHistory('confidence');
      
      expect(history).toHaveLength(3);
      expect(history[0].value).toBe(0.5);
      expect(history[2].value).toBe(0.7);
    });

    it('should calculate trend (improving)', () => {
      // Record improving values
      for (let i = 0.5; i <= 0.9; i += 0.1) {
        performanceTracker.record('confidence', i);
      }
      
      const trend = performanceTracker.getTrend('confidence');
      
      expect(trend.trend).toBe('improving');
      expect(trend.strength).toBeGreaterThan(0);
    });

    it('should calculate trend (declining)', () => {
      // Record declining values
      for (let i = 0.9; i >= 0.5; i -= 0.1) {
        performanceTracker.record('confidence', i);
      }
      
      const trend = performanceTracker.getTrend('confidence');
      
      expect(trend.trend).toBe('declining');
      expect(trend.strength).toBeGreaterThan(0);
    });

    it('should calculate trend (stable)', () => {
      // Record stable values
      for (let i = 0; i < 10; i++) {
        performanceTracker.record('confidence', 0.75);
      }
      
      const trend = performanceTracker.getTrend('confidence');
      
      expect(trend.trend).toBe('stable');
      expect(trend.strength).toBe(0);
    });

    it('should set target', () => {
      performanceTracker.record('confidence', 0.6);
      performanceTracker.setTarget('confidence', 0.9);
      
      const metric = performanceTracker.getMetric('confidence');
      expect(metric?.target).toBe(0.9);
    });

    it('should set threshold', () => {
      performanceTracker.record('confidence', 0.6);
      performanceTracker.setThreshold('confidence', 0.5);
      
      const metric = performanceTracker.getMetric('confidence');
      expect(metric?.threshold).toBe(0.5);
    });

    it('should get statistics', () => {
      performanceTracker.record('confidence', 0.8);
      performanceTracker.record('impact', 0.5);
      performanceTracker.record('velocity', 0.3);
      
      const stats = performanceTracker.getStats();
      
      expect(stats.totalMetrics).toBe(3);
      expect(stats.avgValue).toBeCloseTo(0.533, 2);
    });
  });

  describe('Full Meta-Cognitive System', () => {
    it('should create complete meta-cognitive system', () => {
      const system = createMetaCognitiveSystem();
      
      expect(system.reflectionEngine).toBeDefined();
      expect(system.learningLoopManager).toBeDefined();
      expect(system.strategyEvolver).toBeDefined();
      expect(system.performanceTracker).toBeDefined();
      expect(system.config).toBeDefined();
    });

    it('should support meta-cognitive workflow', async () => {
      const system = createMetaCognitiveSystem();
      
      // 1. Perform reflection
      const reflection = await system.reflectionEngine.reflect('performance', 'manual');
      expect(reflection.id).toBeDefined();
      
      // 2. Record learning from reflection
      const lesson = system.learningLoopManager.recordLearning(
        'decision_making',
        'Increase data collection for better analysis',
        'Performance reflection context',
        'reflection',
        0.8,
        0.9,
        0.5
      );
      expect(lesson.id).toBeDefined();
      
      // 3. Apply learning
      system.learningLoopManager.applyLesson(lesson.id);
      
      // 4. Record impact
      system.learningLoopManager.recordImpact(lesson.id, 0.7);
      
      // 5. Track performance
      system.performanceTracker.record('confidence', reflection.confidence);
      system.performanceTracker.record('impact', reflection.impact);
      
      // 6. Register strategy based on learning
      const strategy: Strategy = {
        id: 'strat_data_collection',
        type: 'balanced',
        name: 'Data Collection Strategy',
        description: 'Collect more data before analysis',
        parameters: new Map([['data_threshold', 0.8]]),
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
      };
      
      system.strategyEvolver.registerStrategy(strategy);
      
      // 7. Record strategy usage
      system.strategyEvolver.recordUsage('strat_data_collection', 0.8);
      
      // 8. Verify system state
      const metrics = system.performanceTracker.getAllMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      
      const lessons = system.learningLoopManager.getTopLessons('decision_making', 5);
      expect(lessons.length).toBeGreaterThan(0);
      
      const bestStrategy = system.strategyEvolver.getBestStrategy();
      expect(bestStrategy).toBeDefined();
    });

    it('should support continuous improvement cycle', async () => {
      const system = createMetaCognitiveSystem();
      
      // Simulate 5 cycles
      for (let cycle = 0; cycle < 5; cycle++) {
        // Reflect
        const reflection = await system.reflectionEngine.reflect('performance', 'manual');
        
        // Learn
        const lesson = system.learningLoopManager.recordLearning(
          'efficiency',
          `Cycle ${cycle}: optimization tip`,
          'Cycle context',
          'experience'
        );
        
        // Apply
        system.learningLoopManager.applyLesson(lesson.id);
        system.learningLoopManager.recordImpact(lesson.id, 0.1 * (cycle + 1));
        
        // Track
        system.performanceTracker.record('efficiency', 0.5 + cycle * 0.1);
      }
      
      // Verify improvement
      const improvement = system.learningLoopManager.getOverallImprovement();
      expect(improvement).toBeGreaterThan(0);
      
      const trend = system.performanceTracker.getTrend('efficiency');
      expect(trend.trend).toBe('improving');
    });
  });
});
