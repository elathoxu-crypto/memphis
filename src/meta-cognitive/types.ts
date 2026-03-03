/**
 * Memphis Model E: Meta-Cognitive Types
 * 
 * Self-reflection, learning loops, and strategy evolution.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

/**
 * Reflection types
 */
export type ReflectionType = 
  | 'performance'      // Analyze recent performance
  | 'pattern'          // Identify patterns in behavior
  | 'failure'          // Analyze failures
  | 'success'          // Analyze successes
  | 'alignment'        // Check alignment with goals
  | 'evolution';       // Track evolution over time

export type ReflectionTrigger =
  | 'scheduled'        // Regular scheduled reflection
  | 'threshold'        // Performance threshold reached
  | 'event'            // Specific event occurred
  | 'manual';          // Manual trigger

export interface Reflection {
  id: string;
  type: ReflectionType;
  trigger: ReflectionTrigger;
  
  // What was analyzed
  subject: string;
  context: Map<string, any>;
  
  // Analysis results
  findings: string[];
  insights: string[];
  recommendations: string[];
  
  // Metrics
  confidence: number; // 0-1
  impact: number;     // -1 to 1 (negative to positive)
  
  // Actions
  actions: ReflectionAction[];
  
  // Metadata
  timestamp: Date;
  duration: number;   // milliseconds
}

export interface ReflectionAction {
  type: 'adjust_parameter' | 'change_strategy' | 'learn_pattern' | 'flag_issue';
  target: string;     // What to adjust/change/learn
  value?: any;        // New value (if applicable)
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'applied' | 'rejected';
}

/**
 * Learning types
 */
export type LearningDomain = 
  | 'decision_making'  // Better decisions
  | 'prediction'       // Better predictions
  | 'communication'    // Better communication
  | 'efficiency'       // Better efficiency
  | 'creativity'       // More creative solutions
  | 'adaptation';      // Better adaptation to change

export interface LearningEvent {
  id: string;
  domain: LearningDomain;
  
  // What was learned
  lesson: string;
  context: string;
  
  // Source
  source: 'experience' | 'feedback' | 'observation' | 'reflection';
  
  // Application
  applicability: number;  // 0-1 (how broadly applicable)
  confidence: number;     // 0-1 (how confident in lesson)
  
  // Impact
  expectedImpact: number; // -1 to 1
  actualImpact?: number;  // -1 to 1 (after application)
  
  // Metadata
  timestamp: Date;
  appliedAt?: Date;
  usageCount: number;
}

export interface LearningLoop {
  id: string;
  domain: LearningDomain;
  
  // Learning cycle
  cycleCount: number;
  lastCycleAt: Date;
  cycleInterval: number; // milliseconds
  
  // Accumulated knowledge
  lessons: string[];      // Lesson IDs
  patterns: string[];     // Pattern IDs
  
  // Metrics
  improvement: number;    // -1 to 1 (improvement over time)
  velocity: number;       // lessons per cycle
  
  // Status
  active: boolean;
}

/**
 * Strategy types
 */
export type StrategyType =
  | 'exploration'      // Try new approaches
  | 'exploitation'     // Use proven approaches
  | 'balanced'         // Balance between explore/exploit
  | 'conservative'     // Minimize risk
  | 'aggressive'       // Maximize reward
  | 'adaptive';        // Adapt based on context

export interface Strategy {
  id: string;
  type: StrategyType;
  
  // Strategy definition
  name: string;
  description: string;
  
  // Parameters
  parameters: Map<string, number>;
  
  // Conditions
  conditions: StrategyCondition[];
  
  // Performance
  performance: StrategyPerformance;
  
  // Evolution
  version: number;
  parent?: string;      // Parent strategy ID
  mutations: string[];  // Child strategy IDs
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

export interface StrategyCondition {
  metric: string;       // What metric to check
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: number;
}

export interface StrategyPerformance {
  usageCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;  // 0-1
  
  avgReward: number;    // Average reward
  totalReward: number;  // Cumulative reward
  
  lastUsed: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
}

/**
 * Evolution types
 */
export type EvolutionOperator = 
  | 'mutate'           // Small parameter change
  | 'crossover'        // Combine two strategies
  | 'select'           // Keep best performers
  | 'prune'            // Remove poor performers
  | 'diversify';       // Add diversity

export interface EvolutionEvent {
  id: string;
  operator: EvolutionOperator;
  
  // Evolution details
  parentStrategies: string[];  // Strategy IDs
  childStrategies: string[];   // Strategy IDs
  
  // Reason
  trigger: 'scheduled' | 'performance_drop' | 'stagnation' | 'manual';
  reason: string;
  
  // Metadata
  timestamp: Date;
  generation: number;
}

/**
 * Performance tracking
 */
export interface PerformanceMetric {
  id: string;
  name: string;
  description: string;
  
  // Current value
  value: number;
  unit: string;
  
  // Historical
  history: MetricDataPoint[];
  
  // Targets
  target?: number;
  threshold?: number;
  
  // Trend
  trend: 'improving' | 'declining' | 'stable';
  trendStrength: number; // 0-1
  
  // Metadata
  updatedAt: Date;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  context?: Map<string, any>;
}

/**
 * Meta-cognitive config
 */
export interface MetaCognitiveConfig {
  reflection: {
    enabled: boolean;
    interval: number;        // milliseconds
    triggers: ReflectionTrigger[];
    maxFindings: number;
    maxRecommendations: number;
  };
  
  learning: {
    enabled: boolean;
    domains: LearningDomain[];
    maxLessons: number;
    applicabilityThreshold: number;
    confidenceThreshold: number;
  };
  
  evolution: {
    enabled: boolean;
    interval: number;        // milliseconds
    populationSize: number;
    mutationRate: number;    // 0-1
    crossoverRate: number;   // 0-1
    selectionPressure: number; // 0-1
  };
  
  performance: {
    trackingEnabled: boolean;
    metrics: string[];
    historySize: number;
    alertThresholds: Map<string, number>;
  };
}

/**
 * Meta-cognitive state
 */
export interface MetaCognitiveState {
  // Reflections
  reflections: Reflection[];
  lastReflectionAt?: Date;
  
  // Learning
  learningEvents: LearningEvent[];
  learningLoops: LearningLoop[];
  
  // Strategies
  strategies: Strategy[];
  activeStrategies: string[];  // Strategy IDs
  evolutionEvents: EvolutionEvent[];
  
  // Performance
  metrics: Map<string, PerformanceMetric>;
  
  // Overall
  generation: number;
  evolutionPressure: number; // 0-1
  adaptationRate: number;    // 0-1
}
