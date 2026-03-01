/**
 * Smart Summaries Engine
 *
 * Generates AI-powered summaries with statistical insights
 */

export interface SummaryStats {
  period: 'daily' | 'weekly' | 'monthly';
  totalEntries: number;
  avgPerDay: number;
  topTags: Array<{ tag: string; count: number }>;
  timeDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
}

export interface Trend {
  direction: 'up' | 'down' | 'stable';
  metric: string;
  change: number;
  description: string;
}

export interface SmartSummary {
  period: 'daily' | 'weekly' | 'monthly';
  stats: SummaryStats;
  trends: Trend[];
  themes: string[];
  actions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  highlights: string[];
}

/**
 * Calculate basic statistics from blocks
 */
export function analyzeStats(
  blocks: any[],
  period: 'daily' | 'weekly' | 'monthly' = 'weekly'
): SummaryStats {
  const total = blocks.length;

  // Calculate unique days
  const days = new Set(
    blocks.map(b => new Date(b.timestamp).toDateString())
  ).size;
  const avgPerDay = days > 0 ? total / days : 0;

  // Count tags
  const tagCounts: Record<string, number> = {};
  blocks.forEach(b => {
    if (b.data?.tags) {
      b.data.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  // Time distribution
  const timeDistribution = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  blocks.forEach(b => {
    const hour = new Date(b.timestamp).getHours();
    if (hour >= 6 && hour < 12) timeDistribution.morning++;
    else if (hour >= 12 && hour < 18) timeDistribution.afternoon++;
    else if (hour >= 18 && hour < 24) timeDistribution.evening++;
    else timeDistribution.night++;
  });

  return {
    period,
    totalEntries: total,
    avgPerDay: Math.round(avgPerDay * 10) / 10,
    topTags,
    timeDistribution
  };
}

/**
 * Detect trends by comparing periods
 */
export function detectTrends(
  current: any[],
  previous: any[]
): Trend[] {
  const trends: Trend[] = [];

  // Frequency trend
  const currentCount = current.length;
  const previousCount = previous.length;
  const freqChange = previousCount > 0
    ? ((currentCount - previousCount) / previousCount) * 100
    : 0;

  trends.push({
    direction: freqChange > 10 ? 'up' : freqChange < -10 ? 'down' : 'stable',
    metric: 'frequency',
    change: Math.round(freqChange),
    description: `${Math.abs(Math.round(freqChange))}% ${freqChange > 0 ? 'more' : 'fewer'} entries`
  });

  return trends;
}

/**
 * Extract themes from blocks (simplified version)
 */
export function extractThemes(blocks: any[]): string[] {
  // Count tag categories
  const categories: Record<string, number> = {};

  blocks.forEach(b => {
    if (b.data?.tags) {
      b.data.tags.forEach((tag: string) => {
        // Extract category (e.g., "tech:react" → "tech")
        const category = tag.split(':')[0];
        categories[category] = (categories[category] || 0) + 1;
      });
    }
  });

  // Top 3 categories as themes
  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);
}

/**
 * Generate smart summary
 */
export function generateSummary(
  blocks: any[],
  period: 'daily' | 'weekly' | 'monthly' = 'weekly',
  previousBlocks?: any[]
): SmartSummary {
  const stats = analyzeStats(blocks, period);
  const trends = previousBlocks ? detectTrends(blocks, previousBlocks) : [];
  const themes = extractThemes(blocks);

  // Simplified sentiment (count mood tags)
  let positiveCount = 0;
  let negativeCount = 0;

  blocks.forEach(b => {
    if (b.data?.tags) {
      if (b.data.tags.includes('positive')) positiveCount++;
      if (b.data.tags.includes('negative')) negativeCount++;
    }
  });

  const sentiment = positiveCount > negativeCount
    ? 'positive'
    : negativeCount > positiveCount
    ? 'negative'
    : 'neutral';

  return {
    period,
    stats,
    trends,
    themes,
    actions: [], // TODO: LLM extraction
    sentiment,
    highlights: [] // TODO: Find most important blocks
  };
}
