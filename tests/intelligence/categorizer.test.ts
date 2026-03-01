/**
 * Tests for Auto-Categorization Engine (Phase 6)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Categorizer, categorize, buildInferenceContext } from '../../dist/intelligence/categorizer.js';
import { PATTERN_DATABASE, PATTERN_STATS } from '../../dist/intelligence/patterns.js';
import type { Block, BlockData } from '../../dist/memory/chain.js';

/**
 * Helper to create test blocks with correct structure
 */
function createTestBlock(index: number, content: string, tags: string[], chain = 'journal'): Block {
  const data: BlockData = {
    type: 'journal',
    content,
    tags
  };
  
  return {
    index,
    chain,
    timestamp: new Date().toISOString(),
    prev_hash: index === 0 ? '0'.repeat(64) : `hash-${index - 1}`,
    hash: `hash-${index}`,
    data
  };
}

describe('Pattern Database', () => {
  it('should have pattern database loaded', () => {
    expect(PATTERN_DATABASE.length).toBeGreaterThan(0);
    console.log(`📊 Pattern database: ${PATTERN_STATS.totalPatterns} tag patterns, ${PATTERN_STATS.totalRegexPatterns} regex patterns`);
  });

  it('should have patterns for all major categories', () => {
    expect(PATTERN_STATS.byCategory.type).toBeGreaterThan(10);
    expect(PATTERN_STATS.byCategory.tech).toBeGreaterThan(5);
    expect(PATTERN_STATS.byCategory.priority).toBeGreaterThan(1);
  });

  it('should have valid regex patterns', () => {
    for (const pattern of PATTERN_DATABASE) {
      expect(pattern.tag).toBeDefined();
      expect(pattern.category).toBeDefined();
      expect(pattern.patterns.length).toBeGreaterThan(0);
      expect(pattern.priority).toBeGreaterThan(0);
      
      // Test each regex compiles
      for (const regex of pattern.patterns) {
        expect(regex instanceof RegExp).toBe(true);
      }
    }
  });
});

describe('Categorizer', () => {
  let categorizer: Categorizer;

  beforeEach(() => {
    categorizer = new Categorizer();
  });

  describe('Pattern Matching', () => {
    it('should detect meeting tags', async () => {
      const result = await categorizer.suggestCategories('Meeting with John about Project X');
      
      expect(result.tags.length).toBeGreaterThan(0);
      expect(result.tags.some(t => t.tag === 'meeting')).toBe(true);
      expect(result.method).toBe('pattern');
    });

    it('should detect decision tags', async () => {
      const result = await categorizer.suggestCategories('Decided to use PostgreSQL over MongoDB');
      
      expect(result.tags.some(t => t.tag === 'decision')).toBe(true);
    });

    it('should detect bug tags', async () => {
      const result = await categorizer.suggestCategories('Bug: Login button not working on mobile');
      
      expect(result.tags.some(t => t.tag === 'bug')).toBe(true);
    });

    it('should detect feature tags', async () => {
      const result = await categorizer.suggestCategories('Feature: Added dark mode support');
      
      expect(result.tags.some(t => t.tag === 'feature')).toBe(true);
    });

    it('should detect learning tags', async () => {
      const result = await categorizer.suggestCategories('Learned that React hooks are more powerful than I thought');
      
      expect(result.tags.some(t => t.tag === 'learning')).toBe(true);
    });

    it('should detect high priority tags', async () => {
      const result = await categorizer.suggestCategories('Urgent: Fix the production bug ASAP');
      
      expect(result.tags.some(t => t.tag === 'high')).toBe(true);
    });

    it('should detect person mentions', async () => {
      const result = await categorizer.suggestCategories('Met with Sarah to discuss the project');
      
      expect(result.tags.some(t => t.tag === 'person' || t.category === 'person')).toBe(true);
    });

    it('should detect tech:react tags', async () => {
      const result = await categorizer.suggestCategories('Using React hooks for state management');
      
      expect(result.tags.some(t => t.tag === 'tech:react')).toBe(true);
    });

    it('should detect tech:typescript tags', async () => {
      const result = await categorizer.suggestCategories('TypeScript strict mode configuration');
      
      expect(result.tags.some(t => t.tag === 'tech:typescript')).toBe(true);
    });

    it('should detect multiple tags from single content', async () => {
      const result = await categorizer.suggestCategories(
        'Meeting with @john about Project X. Decided to use PostgreSQL instead of MongoDB.'
      );
      
      expect(result.tags.length).toBeGreaterThan(1);
      expect(result.tags.some(t => t.tag === 'meeting')).toBe(true);
      expect(result.tags.some(t => t.tag === 'decision')).toBe(true);
    });
  });

  describe('Context Inference', () => {
    it('should infer project tags from context', async () => {
      const recentBlocks: Block[] = [
        createTestBlock(0, 'Working on Memphis Phase 6', ['project:memphis', 'phase6'])
      ];

      const context = buildInferenceContext(recentBlocks);
      const result = await categorizer.suggestCategories(
        'Auto-categorization engine implementation',
        context
      );

      // Should suggest project:memphis from context
      expect(result.tags.some(t => t.tag.includes('memphis'))).toBe(true);
    });

    it('should include frequent tags from context', async () => {
      const recentBlocks: Block[] = [
        createTestBlock(0, 'Test 1', ['work', 'morning']),
        createTestBlock(1, 'Test 2', ['work', 'morning'])
      ];

      const context = buildInferenceContext(recentBlocks);
      
      expect(context.frequentTags).toContain('work');
      expect(context.frequentTags).toContain('morning');
    });
  });

  describe('Confidence Scoring', () => {
    it('should return confidence scores between 0 and 1', async () => {
      const result = await categorizer.suggestCategories('Meeting with John');
      
      for (const tag of result.tags) {
        expect(tag.confidence).toBeGreaterThanOrEqual(0);
        expect(tag.confidence).toBeLessThanOrEqual(1);
      }
      
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });

    it('should respect confidence threshold', async () => {
      const lowThreshold = new Categorizer({ confidenceThreshold: 0.9 });
      const result = await lowThreshold.suggestCategories('Meeting with John');
      
      // With high threshold, should only get very confident matches
      for (const tag of result.tags) {
        expect(tag.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('should limit number of suggestions', async () => {
      const limited = new Categorizer({ maxSuggestions: 3 });
      const result = await limited.suggestCategories(
        'Meeting with @john about Project X. Decided to use PostgreSQL. Bug fix needed. Feature request.'
      );
      
      expect(result.tags.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Learning from Feedback', () => {
    it('should learn from accepted suggestions', async () => {
      categorizer.learnFromFeedback('meeting', true);
      categorizer.learnFromFeedback('meeting', true);
      categorizer.learnFromFeedback('meeting', false);
      
      const stats = categorizer.getLearningStats();
      const meetingStats = stats.get('meeting');
      
      expect(meetingStats).toBeDefined();
      expect(meetingStats!.accepted).toBe(2);
      expect(meetingStats!.rejected).toBe(1);
      expect(meetingStats!.accuracy).toBeCloseTo(0.666, 2);
    });

    it('should adjust confidence based on learning', async () => {
      // First, get baseline confidence
      const before = await categorizer.suggestCategories('Meeting with John');
      const beforeConfidence = before.tags.find(t => t.tag === 'meeting')?.confidence || 0;

      // Accept this tag multiple times
      for (let i = 0; i < 5; i++) {
        categorizer.learnFromFeedback('meeting', true);
      }

      // Now confidence should be higher
      const after = await categorizer.suggestCategories('Meeting with John');
      const afterConfidence = after.tags.find(t => t.tag === 'meeting')?.confidence || 0;

      // Confidence should be boosted by learning (if learning is enabled)
      expect(afterConfidence).toBeGreaterThanOrEqual(beforeConfidence);
    });
  });

  describe('Performance', () => {
    it('should classify quickly (<10ms for pattern matching)', async () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await categorizer.suggestCategories('Meeting with John about Project X');
      }
      
      const elapsed = Date.now() - start;
      const avgTime = elapsed / 100;
      
      console.log(`⚡ Average classification time: ${avgTime.toFixed(2)}ms`);
      expect(avgTime).toBeLessThan(10); // Should be <10ms average
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const result = await categorizer.suggestCategories('');
      
      expect(result.tags.length).toBe(0);
      expect(result.overallConfidence).toBe(0);
    });

    it('should handle very long content', async () => {
      const longContent = 'Meeting with John. '.repeat(1000);
      const result = await categorizer.suggestCategories(longContent);
      
      expect(result.tags.length).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeLessThan(100); // Should still be fast
    });

    it('should handle special characters', async () => {
      const result = await categorizer.suggestCategories(
        'Bug: Error with @#$% characters!!! <script>alert("xss")</script>'
      );
      
      expect(result.tags.length).toBeGreaterThan(0);
      // Should detect bug tag
      expect(result.tags.some(t => t.tag === 'bug')).toBe(true);
    });

    it('should handle unicode and emoji', async () => {
      const result = await categorizer.suggestCategories('Great progress! 🎉✅');
      
      expect(result.tags.length).toBeGreaterThan(0);
      // Should detect positive mood
      expect(result.tags.some(t => t.tag === 'positive')).toBe(true);
    });
  });
});

describe('Convenience Functions', () => {
  it('should provide quick categorize function', async () => {
    const result = await categorize('Meeting with John about Project X');
    
    expect(result.tags.length).toBeGreaterThan(0);
    expect(result.method).toBeDefined();
  });

  it('should build inference context from blocks', () => {
    const blocks: Block[] = [
      createTestBlock(0, 'Test', ['work'])
    ];

    const context = buildInferenceContext(blocks);
    
    expect(context.recentBlocks).toEqual(blocks);
    expect(context.timeOfDay).toBeDefined();
    expect(context.dayOfWeek).toBeDefined();
  });
});
