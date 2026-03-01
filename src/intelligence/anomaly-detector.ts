/**
 * Anomaly Detection Engine
 *
 * Detects unusual patterns using statistical methods (z-scores)
 */

export interface Anomaly {
  type: 'frequency' | 'tags' | 'timing';
  severity: 'info' | 'warning' | 'alert';
  message: string;
  zScore?: number;
  value?: number;
  expected?: number;
}

export interface AnomalyConfig {
  zScoreThreshold: number; // Default: 2.0 (2 standard deviations)
  minSampleSize: number;   // Default: 5 (need at least 5 data points)
}

const DEFAULT_CONFIG: AnomalyConfig = {
  zScoreThreshold: 2.0,
  minSampleSize: 5
};

/**
 * Calculate mean of array
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Calculate z-score
 */
function zScore(value: number, meanVal: number, stdDevVal: number): number {
  if (stdDevVal === 0) return 0;
  return (value - meanVal) / stdDevVal;
}

/**
 * Group blocks by day
 */
function groupByDay(blocks: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();

  blocks.forEach(block => {
    const date = new Date(block.timestamp).toDateString();
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(block);
  });

  return groups;
}

/**
 * Detect frequency anomalies
 */
export function detectFrequencyAnomalies(
  blocks: any[],
  config: AnomalyConfig = DEFAULT_CONFIG
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Group by day
  const byDay = groupByDay(blocks);
  const dailyCounts = Array.from(byDay.values()).map(day => day.length);

  if (dailyCounts.length < config.minSampleSize) {
    return anomalies; // Not enough data
  }

  // Calculate stats
  const avgPerDay = mean(dailyCounts);
  const std = stdDev(dailyCounts);

  // Check today
  const today = new Date().toDateString();
  const todayCount = byDay.get(today)?.length || 0;
  const todayZScore = zScore(todayCount, avgPerDay, std);

  if (Math.abs(todayZScore) > config.zScoreThreshold) {
    anomalies.push({
      type: 'frequency',
      severity: Math.abs(todayZScore) > 3 ? 'alert' : 'warning',
      message: `Unusual activity today (${todayCount} entries vs ${avgPerDay.toFixed(1)} avg)`,
      zScore: Math.round(todayZScore * 10) / 10,
      value: todayCount,
      expected: Math.round(avgPerDay)
    });
  }

  return anomalies;
}

/**
 * Detect tag distribution anomalies
 */
export function detectTagAnomalies(
  blocks: any[],
  config: AnomalyConfig = DEFAULT_CONFIG
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Count all tags
  const tagCounts: Record<string, number> = {};
  blocks.forEach(block => {
    if (block.data?.tags) {
      block.data.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  // Find very rare tags (used only 1-2 times)
  const rareTags = Object.entries(tagCounts)
    .filter(([_, count]) => count <= 2)
    .map(([tag, count]) => ({ tag, count }));

  if (rareTags.length > 0) {
    anomalies.push({
      type: 'tags',
      severity: 'info',
      message: `Rare tags used: ${rareTags.slice(0, 3).map(t => t.tag).join(', ')}`
    });
  }

  return anomalies;
}

/**
 * Detect timing anomalies
 */
export function detectTimingAnomalies(
  blocks: any[],
  config: AnomalyConfig = DEFAULT_CONFIG
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Get hours of all blocks
  const hours = blocks.map(b => new Date(b.timestamp).getHours());

  if (hours.length < config.minSampleSize) {
    return anomalies;
  }

  const avgHour = mean(hours);
  const std = stdDev(hours);

  // Check last entry
  const lastHour = hours[hours.length - 1];
  const lastZScore = zScore(lastHour, avgHour, std);

  if (Math.abs(lastZScore) > config.zScoreThreshold) {
    const timeOfDay = lastHour < 6 ? 'late night' : lastHour > 22 ? 'late night' : 'unusual time';
    anomalies.push({
      type: 'timing',
      severity: 'info',
      message: `First ${timeOfDay} entry in a while (${lastHour}:00)`,
      zScore: Math.round(lastZScore * 10) / 10
    });
  }

  return anomalies;
}

/**
 * Detect all anomalies
 */
export function detectAnomalies(
  blocks: any[],
  config: AnomalyConfig = DEFAULT_CONFIG
): Anomaly[] {
  const frequency = detectFrequencyAnomalies(blocks, config);
  const tags = detectTagAnomalies(blocks, config);
  const timing = detectTimingAnomalies(blocks, config);

  return [...frequency, ...tags, ...timing];
}
