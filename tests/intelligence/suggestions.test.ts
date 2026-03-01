/**
 * Tests for Time-Based Suggestions Engine
 */

import { describe, it, expect } from 'vitest';
import {
  checkTimeTriggers,
  formatSuggestion,
  getPriorityScore,
  type Suggestion,
  type TimeTriggers
} from '../../src/intelligence/suggestions.js';

describe('Time-Based Suggestions', () => {
  describe('checkTimeTriggers', () => {
    it('should trigger after 6 hours of inactivity', () => {
      const lastJournal = Date.now() - 6.5 * 60 * 60 * 1000; // 6.5h ago
      const suggestions = checkTimeTriggers(lastJournal);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].trigger).toBe('6h-inactivity');
      expect(suggestions[0].type).toBe('journal');
    });

    it('should NOT trigger before 6 hours', () => {
      const lastJournal = Date.now() - 5 * 60 * 60 * 1000; // 5h ago
      const suggestions = checkTimeTriggers(lastJournal);

      expect(suggestions).toHaveLength(0);
    });

    it('should trigger at exactly 6 hours', () => {
      const lastJournal = Date.now() - 6 * 60 * 60 * 1000;
      const suggestions = checkTimeTriggers(lastJournal);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].trigger).toBe('6h-inactivity');
    });

    it('should trigger end-of-day at 17:00 if >4h since journal', () => {
      const lastJournal = Date.now() - 5 * 60 * 60 * 1000; // 5h ago
      const now = new Date();
      now.setHours(17, 0, 0, 0);

      const suggestions = checkTimeTriggers(lastJournal, now);

      const eodSuggestion = suggestions.find(s => s.trigger === 'end-of-day');
      expect(eodSuggestion).toBeDefined();
      expect(eodSuggestion?.message).toContain('End of day');
    });

    it('should NOT trigger end-of-day if <4h since journal', () => {
      const lastJournal = Date.now() - 3 * 60 * 60 * 1000; // 3h ago
      const now = new Date();
      now.setHours(17, 0, 0, 0);

      const suggestions = checkTimeTriggers(lastJournal, now);

      const eodSuggestion = suggestions.find(s => s.trigger === 'end-of-day');
      expect(eodSuggestion).toBeUndefined();
    });

    it('should trigger weekly summary on Sunday at 18:00', () => {
      const lastJournal = Date.now() - 2 * 60 * 60 * 1000;
      const now = new Date('2026-03-01T18:00:00'); // Sunday March 1, 2026

      const suggestions = checkTimeTriggers(lastJournal, now);

      const weeklySuggestion = suggestions.find(s => s.trigger === 'weekly-summary');
      expect(weeklySuggestion).toBeDefined();
      expect(weeklySuggestion?.type).toBe('summarize');
    });

    it('should NOT trigger weekly summary on other days', () => {
      const lastJournal = Date.now() - 2 * 60 * 60 * 1000;
      const now = new Date('2026-03-02T18:00:00'); // Monday

      const suggestions = checkTimeTriggers(lastJournal, now);

      const weeklySuggestion = suggestions.find(s => s.trigger === 'weekly-summary');
      expect(weeklySuggestion).toBeUndefined();
    });

    it('should support custom trigger config', () => {
      const customConfig: TimeTriggers = {
        hoursSinceLastJournal: 3, // 3h instead of 6h
        endOfDayHour: 16,
        weeklyDay: 1, // Monday
        weeklyHour: 10
      };

      const lastJournal = Date.now() - 3.5 * 60 * 60 * 1000; // 3.5h ago
      const suggestions = checkTimeTriggers(lastJournal, new Date(), customConfig);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].trigger).toBe('6h-inactivity');
    });

    it('should return multiple suggestions when applicable', () => {
      const lastJournal = Date.now() - 7 * 60 * 60 * 1000; // 7h ago
      const now = new Date();
      now.setHours(17, 0, 0, 0);

      const suggestions = checkTimeTriggers(lastJournal, now);

      expect(suggestions.length).toBeGreaterThan(1);
      expect(suggestions.map(s => s.trigger)).toContain('6h-inactivity');
      expect(suggestions.map(s => s.trigger)).toContain('end-of-day');
    });

    it('should include timestamp in suggestions', () => {
      const lastJournal = Date.now() - 7 * 60 * 60 * 1000;
      const now = new Date();
      const suggestions = checkTimeTriggers(lastJournal, now);

      expect(suggestions[0].timestamp).toBe(now.getTime());
    });
  });

  describe('formatSuggestion', () => {
    it('should format journal suggestion with emoji', () => {
      const suggestion: Suggestion = {
        type: 'journal',
        message: 'Test message',
        priority: 'medium',
        trigger: 'test',
        timestamp: Date.now()
      };

      const formatted = formatSuggestion(suggestion);
      expect(formatted).toContain('📝');
      expect(formatted).toContain('Test message');
    });

    it('should format summarize suggestion with correct emoji', () => {
      const suggestion: Suggestion = {
        type: 'summarize',
        message: 'Weekly summary',
        priority: 'high',
        trigger: 'weekly-summary',
        timestamp: Date.now()
      };

      const formatted = formatSuggestion(suggestion);
      expect(formatted).toContain('📊');
    });
  });

  describe('getPriorityScore', () => {
    it('should return 3 for high priority', () => {
      const suggestion: Suggestion = {
        type: 'journal',
        message: 'Test',
        priority: 'high',
        trigger: 'test',
        timestamp: Date.now()
      };

      expect(getPriorityScore(suggestion)).toBe(3);
    });

    it('should return 2 for medium priority', () => {
      const suggestion: Suggestion = {
        type: 'journal',
        message: 'Test',
        priority: 'medium',
        trigger: 'test',
        timestamp: Date.now()
      };

      expect(getPriorityScore(suggestion)).toBe(2);
    });

    it('should return 1 for low priority', () => {
      const suggestion: Suggestion = {
        type: 'journal',
        message: 'Test',
        priority: 'low',
        trigger: 'test',
        timestamp: Date.now()
      };

      expect(getPriorityScore(suggestion)).toBe(1);
    });
  });
});
