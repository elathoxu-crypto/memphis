/**
 * Memphis Model E: Performance Tracker
 * 
 * Track and analyze meta-cognitive performance metrics.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import type {
  PerformanceMetric,
  MetricDataPoint,
  MetaCognitiveConfig
} from './types.js';

/**
 * Performance Tracker - metrics and analysis
 */
export class PerformanceTracker {
  private config: MetaCognitiveConfig['performance'];
  private metrics: Map<string, PerformanceMetric>;

  constructor(config: MetaCognitiveConfig['performance']) {
    this.config = config;
    this.metrics = new Map();
    
    // Initialize configured metrics
    for (const metricName of config.metrics) {
      this.initializeMetric(metricName);
    }
  }

  /**
   * Initialize metric
   */
  private initializeMetric(name: string): void {
    this.metrics.set(name, {
      id: `metric_${name}`,
      name,
      description: `${name} performance metric`,
      value: 0,
      unit: 'score',
      history: [],
      trend: 'stable',
      trendStrength: 0,
      updatedAt: new Date()
    });
  }

  /**
   * Record metric value
   */
  record(name: string, value: number, context?: Map<string, any>): void {
    let metric = this.metrics.get(name);
    
    if (!metric) {
      this.initializeMetric(name);
      metric = this.metrics.get(name)!;
    }
    
    // Update current value
    metric.value = value;
    metric.updatedAt = new Date();
    
    // Add to history
    metric.history.push({
      timestamp: new Date(),
      value,
      context
    });
    
    // Trim history to configured size
    if (metric.history.length > (this.config.historySize || 100)) {
      metric.history = metric.history.slice(-(this.config.historySize || 100));
    }
    
    // Calculate trend
    this.calculateTrend(metric);
    
    // Check alert threshold
    this.checkAlert(name, value);
  }

  /**
   * Get metric value
   */
  getValue(name: string): number | undefined {
    return this.metrics.get(name)?.value;
  }

  /**
   * Get metric
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Calculate trend for metric
   */
  private calculateTrend(metric: PerformanceMetric): void {
    if (metric.history.length < 5) {
      metric.trend = 'stable';
      metric.trendStrength = 0;
      return;
    }
    
    // Get recent history
    const recent = metric.history.slice(-10);
    
    // Calculate linear regression
    const n = recent.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recent[i].value;
      sumXY += i * recent[i].value;
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Determine trend
    if (Math.abs(slope) < 0.01) {
      metric.trend = 'stable';
      metric.trendStrength = 0;
    } else if (slope > 0) {
      metric.trend = 'improving';
      metric.trendStrength = Math.min(Math.abs(slope), 1);
    } else {
      metric.trend = 'declining';
      metric.trendStrength = Math.min(Math.abs(slope), 1);
    }
  }

  /**
   * Check alert threshold
   */
  private checkAlert(name: string, value: number): void {
    const threshold = this.config.alertThresholds.get(name);
    
    if (threshold !== undefined && value < threshold) {
      console.warn(`⚠️ Alert: ${name} = ${value} (threshold: ${threshold})`);
    }
  }

  /**
   * Get metric history
   */
  getHistory(name: string, limit?: number): MetricDataPoint[] {
    const metric = this.metrics.get(name);
    if (!metric) return [];
    
    if (limit) {
      return metric.history.slice(-limit);
    }
    
    return [...metric.history];
  }

  /**
   * Get metric trend
   */
  getTrend(name: string): { trend: string; strength: number } {
    const metric = this.metrics.get(name);
    
    if (!metric) {
      return { trend: 'stable', strength: 0 };
    }
    
    return {
      trend: metric.trend,
      strength: metric.trendStrength
    };
  }

  /**
   * Set target for metric
   */
  setTarget(name: string, target: number): void {
    const metric = this.metrics.get(name);
    if (!metric) return;
    
    metric.target = target;
  }

  /**
   * Set threshold for metric
   */
  setThreshold(name: string, threshold: number): void {
    const metric = this.metrics.get(name);
    if (!metric) return;
    
    metric.threshold = threshold;
  }

  /**
   * Export metrics
   */
  export(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Import metrics
   */
  import(metrics: PerformanceMetric[]): void {
    this.metrics.clear();
    
    for (const metric of metrics) {
      this.metrics.set(metric.name, metric);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalMetrics: number;
    improving: number;
    declining: number;
    stable: number;
    avgValue: number;
  } {
    const all = Array.from(this.metrics.values());
    
    const improving = all.filter(m => m.trend === 'improving').length;
    const declining = all.filter(m => m.trend === 'declining').length;
    const stable = all.filter(m => m.trend === 'stable').length;
    
    const avgValue = all.length > 0
      ? all.reduce((sum, m) => sum + m.value, 0) / all.length
      : 0;
    
    return {
      totalMetrics: all.length,
      improving,
      declining,
      stable,
      avgValue
    };
  }
}
