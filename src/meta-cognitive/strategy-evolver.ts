/**
 * Memphis Model E: Strategy Evolver
 * 
 * Evolutionary strategy optimization and adaptation.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import type {
  Strategy,
  StrategyType,
  StrategyCondition,
  StrategyPerformance,
  EvolutionEvent,
  EvolutionOperator,
  MetaCognitiveConfig
} from './types.js';

/**
 * Strategy Evolver - evolutionary optimization
 */
export class StrategyEvolver {
  private config: MetaCognitiveConfig['evolution'];
  private strategies: Map<string, Strategy>;
  private evolutionEvents: EvolutionEvent[];
  private generation: number;

  constructor(config: MetaCognitiveConfig['evolution']) {
    this.config = config;
    this.strategies = new Map();
    this.evolutionEvents = [];
    this.generation = 0;
  }

  /**
   * Register strategy
   */
  registerStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Get strategy by ID
   */
  getStrategy(strategyId: string): Strategy | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get active strategies
   */
  getActiveStrategies(): Strategy[] {
    return Array.from(this.strategies.values()).filter(s => s.active);
  }

  /**
   * Run evolution cycle
   */
  async evolve(): Promise<EvolutionEvent> {
    const activeStrategies = this.getActiveStrategies();
    
    // Select best performers
    const selected = this.select(activeStrategies);
    
    // Create offspring through crossover
    const offspring = this.crossover(selected);
    
    // Apply mutations
    const mutated = this.mutate(offspring);
    
    // Prune poor performers
    this.prune();
    
    // Add diversity if needed
    if (this.strategies.size < this.config.populationSize) {
      this.diversify();
    }
    
    // Create evolution event
    const event: EvolutionEvent = {
      id: this.generateId(),
      operator: 'select',
      parentStrategies: selected.map(s => s.id),
      childStrategies: mutated.map(s => s.id),
      trigger: 'scheduled',
      reason: `Evolution cycle ${this.generation}`,
      timestamp: new Date(),
      generation: this.generation
    };
    
    this.evolutionEvents.push(event);
    this.generation++;
    
    return event;
  }

  /**
   * Select best strategies
   */
  private select(strategies: Strategy[]): Strategy[] {
    if (strategies.length === 0) return [];

    // Sort by performance (success rate * avg reward)
    const sorted = strategies.sort((a, b) => {
      const aScore = a.performance.successRate * (a.performance.avgReward + 1);
      const bScore = b.performance.successRate * (b.performance.avgReward + 1);
      return bScore - aScore;
    });

    // Select top performers based on selection pressure
    const selectCount = Math.max(2, Math.floor(sorted.length * this.config.selectionPressure));
    
    return sorted.slice(0, selectCount);
  }

  /**
   * Crossover strategies
   */
  private crossover(parents: Strategy[]): Strategy[] {
    if (parents.length < 2) return [];

    const offspring: Strategy[] = [];
    const pairs = this.createPairs(parents);
    
    for (const [parent1, parent2] of pairs) {
      if (Math.random() < this.config.crossoverRate) {
        const child = this.combineStrategies(parent1, parent2);
        offspring.push(child);
        this.strategies.set(child.id, child);
      }
    }
    
    return offspring;
  }

  /**
   * Create pairs for crossover
   */
  private createPairs(strategies: Strategy[]): Array<[Strategy, Strategy]> {
    const pairs: Array<[Strategy, Strategy]> = [];
    const shuffled = [...strategies].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      pairs.push([shuffled[i], shuffled[i + 1]]);
    }
    
    return pairs;
  }

  /**
   * Combine two strategies
   */
  private combineStrategies(parent1: Strategy, parent2: Strategy): Strategy {
    const id = this.generateId();
    
    // Combine parameters
    const parameters = new Map<string, number>();
    for (const [key, value] of parent1.parameters) {
      const otherValue = parent2.parameters.get(key);
      if (otherValue !== undefined) {
        // Average the values
        parameters.set(key, (value + otherValue) / 2);
      } else {
        parameters.set(key, value);
      }
    }
    for (const [key, value] of parent2.parameters) {
      if (!parameters.has(key)) {
        parameters.set(key, value);
      }
    }
    
    // Combine conditions (take from better performer)
    const conditions = parent1.performance.successRate >= parent2.performance.successRate
      ? [...parent1.conditions]
      : [...parent2.conditions];
    
    const child: Strategy = {
      id,
      type: Math.random() < 0.5 ? parent1.type : parent2.type,
      name: `${parent1.name}+${parent2.name}`,
      description: `Crossover of ${parent1.id} and ${parent2.id}`,
      parameters,
      conditions,
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
      parent: undefined,
      mutations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true
    };
    
    // Track parent-child relationship
    parent1.mutations.push(id);
    parent2.mutations.push(id);
    
    return child;
  }

  /**
   * Mutate strategies
   */
  private mutate(strategies: Strategy[]): Strategy[] {
    const mutated: Strategy[] = [];
    
    for (const strategy of strategies) {
      if (Math.random() < this.config.mutationRate) {
        const mutant = this.applyMutation(strategy);
        mutated.push(mutant);
        this.strategies.set(mutant.id, mutant);
      }
    }
    
    return mutated;
  }

  /**
   * Apply mutation to strategy
   */
  private applyMutation(original: Strategy): Strategy {
    const id = this.generateId();
    
    // Clone parameters
    const parameters = new Map(original.parameters);
    
    // Mutate random parameter
    const paramKeys = Array.from(parameters.keys());
    if (paramKeys.length > 0) {
      const randomKey = paramKeys[Math.floor(Math.random() * paramKeys.length)];
      const currentValue = parameters.get(randomKey) || 0;
      
      // Apply mutation (±20%)
      const mutation = (Math.random() - 0.5) * 0.4;
      parameters.set(randomKey, currentValue * (1 + mutation));
    }
    
    const mutant: Strategy = {
      id,
      type: original.type,
      name: `${original.name}_mut${original.mutations.length}`,
      description: `Mutation of ${original.id}`,
      parameters,
      conditions: [...original.conditions],
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
      parent: original.id,
      mutations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true
    };
    
    // Track mutation
    original.mutations.push(id);
    
    return mutant;
  }

  /**
   * Prune poor performers
   */
  private prune(): void {
    const strategies = this.getActiveStrategies();
    
    if (strategies.length <= this.config.populationSize) return;
    
    // Sort by performance
    const sorted = strategies.sort((a, b) => {
      const aScore = a.performance.successRate * (a.performance.avgReward + 1);
      const bScore = b.performance.successRate * (b.performance.avgReward + 1);
      return aScore - bScore;
    });
    
    // Deactivate worst performers
    const toRemove = sorted.slice(0, sorted.length - this.config.populationSize);
    for (const strategy of toRemove) {
      strategy.active = false;
    }
  }

  /**
   * Add diversity
   */
  private diversify(): void {
    const types: StrategyType[] = ['exploration', 'exploitation', 'balanced', 'conservative', 'aggressive', 'adaptive'];
    
    while (this.strategies.size < this.config.populationSize) {
      const strategy = this.createRandomStrategy(types[Math.floor(Math.random() * types.length)]);
      this.strategies.set(strategy.id, strategy);
    }
  }

  /**
   * Create random strategy
   */
  private createRandomStrategy(type: StrategyType): Strategy {
    const id = this.generateId();
    
    const parameters = new Map<string, number>();
    parameters.set('exploration_rate', Math.random());
    parameters.set('learning_rate', Math.random() * 0.5);
    parameters.set('risk_tolerance', Math.random());
    
    return {
      id,
      type,
      name: `random_${type}_${Date.now()}`,
      description: `Random ${type} strategy for diversity`,
      parameters,
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
  }

  /**
   * Record strategy usage
   */
  recordUsage(strategyId: string, reward: number): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;
    
    strategy.performance.usageCount++;
    strategy.performance.totalReward += reward;
    strategy.performance.avgReward = strategy.performance.totalReward / strategy.performance.usageCount;
    strategy.performance.lastUsed = new Date();
    
    if (reward > 0) {
      strategy.performance.successCount++;
    } else if (reward < 0) {
      strategy.performance.failureCount++;
    }
    
    strategy.performance.successRate = strategy.performance.successCount / strategy.performance.usageCount;
    strategy.updatedAt = new Date();
  }

  /**
   * Get best strategy
   */
  getBestStrategy(): Strategy | undefined {
    const strategies = this.getActiveStrategies();
    if (strategies.length === 0) return undefined;
    
    return strategies.sort((a, b) => {
      const aScore = a.performance.successRate * (a.performance.avgReward + 1);
      const bScore = b.performance.successRate * (b.performance.avgReward + 1);
      return bScore - aScore;
    })[0];
  }

  /**
   * Get evolution history
   */
  getEvolutionHistory(): EvolutionEvent[] {
    return [...this.evolutionEvents];
  }

  /**
   * Export strategies
   */
  export(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Import strategies
   */
  import(strategies: Strategy[]): void {
    this.strategies.clear();
    
    for (const strategy of strategies) {
      this.strategies.set(strategy.id, strategy);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalStrategies: number;
    activeStrategies: number;
    avgSuccessRate: number;
    avgReward: number;
    generation: number;
    evolutionEvents: number;
  } {
    const active = this.getActiveStrategies();
    
    const avgSuccessRate = active.length > 0
      ? active.reduce((sum, s) => sum + s.performance.successRate, 0) / active.length
      : 0;
    
    const avgReward = active.length > 0
      ? active.reduce((sum, s) => sum + s.performance.avgReward, 0) / active.length
      : 0;
    
    return {
      totalStrategies: this.strategies.size,
      activeStrategies: active.length,
      avgSuccessRate,
      avgReward,
      generation: this.generation,
      evolutionEvents: this.evolutionEvents.length
    };
  }
}
