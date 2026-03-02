/**
 * Tests for Event Detection System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  EventDetector,
  mapEventToSuggestion,
  checkEventTriggers
} from '../event-detector.js';
import {
  type ProcessEvent,
  type FileEvent,
  type PatternEvent
} from '../event-types.js';

describe('EventDetector', () => {
  let detector: EventDetector;

  beforeEach(() => {
    detector = new EventDetector({ enabled: false });
  });

  afterEach(async () => {
    await detector.stop();
  });

  describe('Process Monitoring', () => {
    it('should track process start', () => {
      const events: any[] = [];
      detector.on('event', (e) => events.push(e));

      detector.reportProcessStarted('npm', 12345, 'npm run build');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('process-started');
      expect(events[0].processName).toBe('npm');
      expect(events[0].pid).toBe(12345);
    });

    it('should track process completion', () => {
      const events: any[] = [];
      detector.on('event', (e) => events.push(e));

      detector.reportProcessStarted('npm', 12345, 'npm run build');
      
      // Simulate 6 minutes passing
      const startTime = Date.now() - 360000;
      detector['activeProcesses'].get(12345)!.timestamp = startTime;
      
      detector.reportProcessFinished(12345, 0);

      expect(events).toHaveLength(2);
      expect(events[1].type).toBe('process-finished');
      expect(events[1].duration).toBeGreaterThan(300000);
    });

    it('should ignore short processes', () => {
      const events: any[] = [];
      detector.on('event', (e) => events.push(e));

      detector.reportProcessStarted('npm', 12345);
      detector.reportProcessFinished(12345, 0);

      // Only start event, no finish event (too short)
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('process-started');
    });

    it('should detect failed processes', () => {
      const events: any[] = [];
      detector.on('event', (e) => events.push(e));

      detector.reportProcessStarted('npm', 12345);
      
      // Simulate 6 minutes
      const startTime = Date.now() - 360000;
      detector['activeProcesses'].get(12345)!.timestamp = startTime;
      
      detector.reportProcessFinished(12345, 1);

      expect(events[1].type).toBe('process-failed');
      expect(events[1].exitCode).toBe(1);
    });

    it('should ignore shell processes', () => {
      const events: any[] = [];
      detector.on('event', (e) => events.push(e));

      detector.reportProcessStarted('bash', 12345);

      expect(events).toHaveLength(0);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect error spikes', () => {
      // Add 3 failed processes
      for (let i = 0; i < 3; i++) {
        detector.reportProcessStarted('npm', 10000 + i);
        const startTime = Date.now() - 360000;
        detector['activeProcesses'].get(10000 + i)!.timestamp = startTime;
        detector.reportProcessFinished(10000 + i, 1);
      }

      const patterns = detector.detectPatterns();
      const errorSpike = patterns.find(p => p.type === 'error-spike');

      expect(errorSpike).toBeDefined();
      expect(errorSpike?.severity).toBe('warning');
    });

    it('should detect activity bursts', () => {
      // Add 10 events quickly
      for (let i = 0; i < 12; i++) {
        detector.reportProcessStarted('node', 20000 + i);
      }

      const patterns = detector.detectPatterns();
      const burst = patterns.find(p => p.type === 'activity-burst');

      expect(burst).toBeDefined();
      expect(burst?.severity).toBe('info');
    });
  });

  describe('Event Management', () => {
    it('should store events in buffer', () => {
      detector.reportProcessStarted('npm', 12345);

      const events = detector.getRecentEvents();
      expect(events).toHaveLength(1);
    });

    it('should filter events by type', () => {
      detector.reportProcessStarted('npm', 12345);

      const processEvents = detector.getEventsByType('process');
      expect(processEvents).toHaveLength(1);
    });

    it('should clear events', () => {
      detector.reportProcessStarted('npm', 12345);
      detector.clearEvents();

      const events = detector.getRecentEvents();
      expect(events).toHaveLength(0);
    });
  });
});

describe('mapEventToSuggestion', () => {
  it('should map process completion to suggestion', () => {
    const event: ProcessEvent = {
      id: 'test-1',
      timestamp: Date.now(),
      source: 'process',
      type: 'process-finished',
      processName: 'npm',
      pid: 12345,
      duration: 360000 // 6 minutes
    };

    const suggestion = mapEventToSuggestion(event);

    expect(suggestion).toBeDefined();
    expect(suggestion?.type).toBe('journal');
    expect(suggestion?.priority).toBe('medium');
    expect(suggestion?.message).toContain('npm');
    expect(suggestion?.message).toContain('completed');
  });

  it('should map process failure to high priority suggestion', () => {
    const event: ProcessEvent = {
      id: 'test-2',
      timestamp: Date.now(),
      source: 'process',
      type: 'process-failed',
      processName: 'cargo',
      pid: 12345,
      exitCode: 1
    };

    const suggestion = mapEventToSuggestion(event);

    expect(suggestion?.priority).toBe('high');
    expect(suggestion?.message).toContain('failed');
  });

  it('should map config file changes to suggestion', () => {
    const event: FileEvent = {
      id: 'test-3',
      timestamp: Date.now(),
      source: 'file',
      type: 'file-modified',
      path: '/home/user/project/tsconfig.json',
      isConfig: true
    };

    const suggestion = mapEventToSuggestion(event);

    expect(suggestion?.priority).toBe('medium');
    expect(suggestion?.message).toContain('Config updated');
  });

  it('should map large file changes to suggestion', () => {
    const event: FileEvent = {
      id: 'test-4',
      timestamp: Date.now(),
      source: 'file',
      type: 'file-modified',
      path: '/home/user/project/src/index.ts',
      linesAdded: 150
    };

    const suggestion = mapEventToSuggestion(event);

    expect(suggestion?.priority).toBe('low');
    expect(suggestion?.message).toContain('Big changes');
  });

  it('should map error spike to high priority suggestion', () => {
    const event: PatternEvent = {
      id: 'test-5',
      timestamp: Date.now(),
      source: 'pattern',
      type: 'error-spike',
      severity: 'warning',
      details: '3 errors in 10 minutes'
    };

    const suggestion = mapEventToSuggestion(event);

    expect(suggestion?.priority).toBe('high');
    expect(suggestion?.message).toContain('Multiple errors');
  });

  it('should map activity burst to low priority suggestion', () => {
    const event: PatternEvent = {
      id: 'test-6',
      timestamp: Date.now(),
      source: 'pattern',
      type: 'activity-burst',
      severity: 'info',
      details: '12 events in 5 minutes'
    };

    const suggestion = mapEventToSuggestion(event);

    expect(suggestion?.priority).toBe('low');
    expect(suggestion?.message).toContain('Busy period');
  });

  it('should return null for non-significant events', () => {
    const event: ProcessEvent = {
      id: 'test-7',
      timestamp: Date.now(),
      source: 'process',
      type: 'process-started', // Started events don't generate suggestions
      processName: 'npm',
      pid: 12345
    };

    const suggestion = mapEventToSuggestion(event);

    expect(suggestion).toBeNull();
  });
});

describe('checkEventTriggers', () => {
  it('should generate suggestions from multiple events', () => {
    const events: any[] = [
      {
        id: '1',
        timestamp: Date.now(),
        source: 'process',
        type: 'process-finished',
        processName: 'npm',
        pid: 12345,
        duration: 360000
      },
      {
        id: '2',
        timestamp: Date.now(),
        source: 'pattern',
        type: 'error-spike',
        severity: 'warning',
        details: '3 errors'
      }
    ];

    const suggestions = checkEventTriggers(events);

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].trigger).toBe('process-finished');
    expect(suggestions[1].trigger).toBe('error-spike');
  });

  it('should deduplicate suggestions by trigger', () => {
    const events: any[] = [
      {
        id: '1',
        timestamp: Date.now(),
        source: 'process',
        type: 'process-finished',
        processName: 'npm',
        pid: 12345,
        duration: 360000
      },
      {
        id: '2',
        timestamp: Date.now(),
        source: 'process',
        type: 'process-finished',
        processName: 'node',
        pid: 12346,
        duration: 400000
      }
    ];

    const suggestions = checkEventTriggers(events);

    // Should only have 1 suggestion (deduplicated by trigger)
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].trigger).toBe('process-finished');
  });
});
