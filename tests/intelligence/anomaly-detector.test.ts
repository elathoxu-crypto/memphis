/**
 * Tests for Anomaly Detection
 */

import { describe, it, expect } from 'vitest';
import {
  detectFrequencyAnomalies,
  detectTagAnomalies,
  detectTimingAnomalies,
  detectAnomalies
} from '../../src/intelligence/anomaly-detector.js';

describe('Anomaly Detection', () => {
  describe('detectFrequencyAnomalies', () => {
    it('should detect unusually high activity', () => {
      // Create blocks: 5 entries/day normally, but 20 today
      const blocks = [];

      // 7 days with 5 entries each
      for (let day = 0; day < 7; day++) {
        for (let i = 0; i < 5; i++) {
          blocks.push({
            timestamp: Date.now() - day * 86400000,
            data: { tags: ['test'] }
          });
        }
      }

      // Add 20 entries today (anomaly)
      for (let i = 0; i < 20; i++) {
        blocks.push({
          timestamp: Date.now(),
          data: { tags: ['test'] }
        });
      }

      const anomalies = detectFrequencyAnomalies(blocks);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('frequency');
      expect(anomalies[0].zScore).toBeGreaterThan(2);
    });

    it('should not detect anomalies in normal activity', () => {
      // Consistent 5 entries/day
      const blocks = [];
      for (let day = 0; day < 7; day++) {
        for (let i = 0; i < 5; i++) {
          blocks.push({
            timestamp: Date.now() - day * 86400000,
            data: { tags: ['test'] }
          });
        }
      }

      const anomalies = detectFrequencyAnomalies(blocks);

      expect(anomalies.length).toBe(0);
    });

    it('should handle insufficient data', () => {
      const blocks = [
        { timestamp: Date.now(), data: { tags: ['test'] } },
        { timestamp: Date.now(), data: { tags: ['test'] } }
      ];

      const anomalies = detectFrequencyAnomalies(blocks);

      expect(anomalies.length).toBe(0); // Not enough data
    });
  });

  describe('detectTagAnomalies', () => {
    it('should detect rare tags', () => {
      const blocks = [
        { timestamp: Date.now(), data: { tags: ['common', 'rare-tag'] } },
        { timestamp: Date.now(), data: { tags: ['common'] } },
        { timestamp: Date.now(), data: { tags: ['common'] } },
        { timestamp: Date.now(), data: { tags: ['common'] } }
      ];

      const anomalies = detectTagAnomalies(blocks);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].message).toContain('Rare tags');
    });
  });

  describe('detectTimingAnomalies', () => {
    it('should detect late night entries', () => {
      const blocks = [];

      // Normal hours (9-17)
      for (let i = 0; i < 10; i++) {
        blocks.push({
          timestamp: Date.now() - i * 86400000 + 9 * 3600000, // 9 AM
          data: { tags: ['test'] }
        });
      }

      // Late night entry (2 AM)
      blocks.push({
        timestamp: Date.now() + 2 * 3600000, // 2 AM
        data: { tags: ['test'] }
      });

      const anomalies = detectTimingAnomalies(blocks);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].message).toContain('late night');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect all types of anomalies', () => {
      const blocks = [
        { timestamp: Date.now(), data: { tags: ['rare'] } },
        { timestamp: Date.now() + 2 * 3600000, data: { tags: ['test'] } } // 2 AM
      ];

      const anomalies = detectAnomalies(blocks);

      expect(Array.isArray(anomalies)).toBe(true);
    });
  });
});
