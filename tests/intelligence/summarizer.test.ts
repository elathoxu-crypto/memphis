/**
 * Tests for Smart Summaries
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeStats,
  detectTrends,
  extractThemes,
  generateSummary
} from '../../src/intelligence/summarizer.js';

describe('Smart Summaries', () => {
  describe('analyzeStats', () => {
    it('should calculate basic statistics', () => {
      const blocks = [
        { timestamp: Date.now(), data: { tags: ['meeting', 'work'] } },
        { timestamp: Date.now(), data: { tags: ['bug', 'work'] } },
        { timestamp: Date.now() - 86400000, data: { tags: ['meeting'] } }
      ];

      const stats = analyzeStats(blocks);

      expect(stats.totalEntries).toBe(3);
      expect(stats.avgPerDay).toBeGreaterThan(0);
      expect(stats.topTags.length).toBeGreaterThan(0);
    });

    it('should count top tags correctly', () => {
      const blocks = [
        { timestamp: Date.now(), data: { tags: ['meeting', 'work'] } },
        { timestamp: Date.now(), data: { tags: ['meeting', 'project'] } },
        { timestamp: Date.now(), data: { tags: ['meeting'] } }
      ];

      const stats = analyzeStats(blocks);

      expect(stats.topTags[0].tag).toBe('meeting');
      expect(stats.topTags[0].count).toBe(3);
    });

    it('should handle empty blocks', () => {
      const stats = analyzeStats([]);

      expect(stats.totalEntries).toBe(0);
      expect(stats.avgPerDay).toBe(0);
    });
  });

  describe('detectTrends', () => {
    it('should detect upward trend', () => {
      const current = [1, 2, 3, 4, 5, 6, 7]; // 7 entries
      const previous = [1, 2, 3, 4, 5]; // 5 entries

      const trends = detectTrends(current, previous);

      expect(trends[0].direction).toBe('up');
      expect(trends[0].change).toBeGreaterThan(0);
    });

    it('should detect downward trend', () => {
      const current = [1, 2]; // 2 entries
      const previous = [1, 2, 3, 4, 5]; // 5 entries

      const trends = detectTrends(current, previous);

      expect(trends[0].direction).toBe('down');
    });
  });

  describe('extractThemes', () => {
    it('should extract tag categories as themes', () => {
      const blocks = [
        { timestamp: Date.now(), data: { tags: ['tech:react', 'tech:typescript'] } },
        { timestamp: Date.now(), data: { tags: ['tech:docker', 'work'] } },
        { timestamp: Date.now(), data: { tags: ['work', 'project'] } }
      ];

      const themes = extractThemes(blocks);

      expect(themes).toContain('tech');
      expect(themes).toContain('work');
    });
  });

  describe('generateSummary', () => {
    it('should generate complete summary', () => {
      const blocks = [
        { timestamp: Date.now(), data: { tags: ['meeting', 'positive'] } },
        { timestamp: Date.now(), data: { tags: ['bug', 'work'] } }
      ];

      const summary = generateSummary(blocks, 'weekly');

      expect(summary.period).toBe('weekly');
      expect(summary.stats).toBeDefined();
      expect(summary.trends).toBeDefined();
      expect(summary.themes).toBeDefined();
      expect(summary.sentiment).toBeDefined();
    });

    it('should detect positive sentiment', () => {
      const blocks = [
        { timestamp: Date.now(), data: { tags: ['positive'] } },
        { timestamp: Date.now(), data: { tags: ['positive'] } },
        { timestamp: Date.now(), data: { tags: ['negative'] } }
      ];

      const summary = generateSummary(blocks);

      expect(summary.sentiment).toBe('positive');
    });

    it('should detect negative sentiment', () => {
      const blocks = [
        { timestamp: Date.now(), data: { tags: ['negative'] } },
        { timestamp: Date.now(), data: { tags: ['negative'] } },
        { timestamp: Date.now(), data: { tags: ['positive'] } }
      ];

      const summary = generateSummary(blocks);

      expect(summary.sentiment).toBe('negative');
    });
  });
});
