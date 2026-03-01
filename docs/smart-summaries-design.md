# Smart Summaries — Design Doc

**Feature:** AI-generated weekly/monthly summaries with insights
**Effort:** 3 days
**Priority:** HIGH (visibility + value)

---

## 🎯 Goal

Generate intelligent summaries that reveal:
- Themes (what you worked on)
- Trends (how it changed)
- Actions (what needs attention)
- Sentiment (how you feel)

---

## 📊 Implementation

### 1. Statistical Analysis (No LLM, Fast)

```typescript
interface SummaryStats {
  period: 'daily' | 'weekly' | 'monthly';
  totalEntries: number;
  avgPerDay: number;
  topTags: Array<{ tag: string; count: number }>;
  timeDistribution: {
    morning: number;  // 6-12
    afternoon: number; // 12-18
    evening: number;   // 18-24
    night: number;     // 0-6
  };
}

function analyzeStats(blocks: Block[]): SummaryStats {
  // Calculate basic statistics
  const total = blocks.length;
  const days = uniqueDays(blocks);
  const avgPerDay = total / days;

  // Count tags
  const tagCounts = countTags(blocks);
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  // Time distribution
  const timeDistribution = analyzeTimeDistribution(blocks);

  return { period: 'weekly', totalEntries: total, avgPerDay, topTags, timeDistribution };
}
