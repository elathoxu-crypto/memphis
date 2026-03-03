/**
 * Memphis Model E: Meta-Cognitive Engine
 * 
 * Self-reflection, learning loops, and strategy evolution.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

// Export all types
export * from './types.js';

// Export core components
export { ReflectionEngine } from './reflection-engine.js';
export { LearningLoopManager } from './learning-loop.js';
export { StrategyEvolver } from './strategy-evolver.js';
export { PerformanceTracker } from './performance-tracker.js';

// Import for createMetaCognitiveSystem
import type { MetaCognitiveConfig } from './types.js';
import { ReflectionEngine } from './reflection-engine.js';
import { LearningLoopManager } from './learning-loop.js';
import { StrategyEvolver } from './strategy-evolver.js';
import { PerformanceTracker } from './performance-tracker.js';

/**
 * Create complete meta-cognitive system
 */
export function createMetaCognitiveSystem(config?: Partial<MetaCognitiveConfig>) {
  const defaultConfig: MetaCognitiveConfig = {
    reflection: {
      enabled: true,
      interval: 86400000, // 24 hours
      triggers: ['scheduled', 'threshold', 'event', 'manual'],
      maxFindings: 10,
      maxRecommendations: 5
    },
    learning: {
      enabled: true,
      domains: ['decision_making', 'prediction', 'communication', 'efficiency', 'creativity', 'adaptation'],
      maxLessons: 1000,
      applicabilityThreshold: 0.5,
      confidenceThreshold: 0.5
    },
    evolution: {
      enabled: true,
      interval: 604800000, // 7 days
      populationSize: 20,
      mutationRate: 0.1,
      crossoverRate: 0.7,
      selectionPressure: 0.3
    },
    performance: {
      trackingEnabled: true,
      metrics: ['confidence', 'impact', 'velocity', 'efficiency'],
      historySize: 100,
      alertThresholds: new Map([
        ['confidence', 0.5],
        ['impact', 0]
      ])
    }
  };

  const finalConfig = mergeDeep(defaultConfig, config || {});

  return {
    reflectionEngine: new ReflectionEngine(finalConfig.reflection),
    learningLoopManager: new LearningLoopManager(finalConfig.learning),
    strategyEvolver: new StrategyEvolver(finalConfig.evolution),
    performanceTracker: new PerformanceTracker(finalConfig.performance),
    config: finalConfig
  };
}

/**
 * Deep merge utility
 */
function mergeDeep(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * Check if value is object
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
