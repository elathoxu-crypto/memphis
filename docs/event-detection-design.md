# Event Detection System Design

## Overview

Detect significant events and generate proactive suggestions for journaling.

**Goal:** "Process finished" → "Great time to capture what you learned!"

---

## Event Types

### 1. Process Events
- **Process Started** - New long-running task begins
- **Process Finished** - Task completes (success/failure)
- **Process Failed** - Error/crash detection

### 2. File Events
- **Large File Change** - Significant modifications (>100 lines)
- **Config Changed** - Important files modified
- **Git Commit** - Code changes committed

### 3. Pattern Events
- **Error Spike** - Multiple errors in short time
- **Activity Burst** - High activity period
- **Inactivity** - No activity for extended period

---

## Architecture

```
Event Sources
     ↓
Event Detector (event-detector.ts)
     ↓
Event → Suggestion Mapper
     ↓
Suggestion Engine (suggestions.ts)
     ↓
TUI / Dashboard
```

---

## Implementation Plan

### Phase 1: Process Monitoring (30 min)
- [ ] Track active processes
- [ ] Detect completion events
- [ ] Generate suggestions

### Phase 2: File Monitoring (20 min)
- [ ] Enhance existing watch.ts
- [ ] Track significant changes
- [ ] Filter noise

### Phase 3: Pattern Detection (20 min)
- [ ] Integrate with anomaly-detector.ts
- [ ] Detect error patterns
- [ ] Activity analysis

### Phase 4: Integration (10 min)
- [ ] Hook into suggestions.ts
- [ ] TUI notifications
- [ ] Dashboard widget

---

## Event Detection Rules

### Process Events

```typescript
interface ProcessEvent {
  type: 'process-started' | 'process-finished' | 'process-failed';
  processName: string;
  pid: number;
  duration?: number;  // ms
  exitCode?: number;
  timestamp: number;
}

// Detection rules:
// - Duration > 5 min → suggest on completion
// - Exit code != 0 → suggest reflection on failure
// - Process name contains "test" → suggest test results
```

### File Events

```typescript
interface FileEvent {
  type: 'file-created' | 'file-modified' | 'file-deleted';
  path: string;
  linesAdded?: number;
  linesRemoved?: number;
  timestamp: number;
}

// Detection rules:
// - Lines changed > 100 → significant change
// - Path contains "config" → config change
// - Git commit detected → code change
```

### Pattern Events

```typescript
interface PatternEvent {
  type: 'error-spike' | 'activity-burst' | 'inactivity';
  severity: 'info' | 'warning' | 'alert';
  details: string;
  timestamp: number;
}

// Detection rules:
// - 3+ errors in 10 min → error spike
// - 10+ events in 5 min → activity burst
// - 0 events in 6h → inactivity (already done)
```

---

## Suggestion Mapping

| Event | Suggestion | Priority |
|-------|-----------|----------|
| Process finished (>5min) | "Task completed. What did you learn?" | Medium |
| Process failed | "Process failed. Debug notes?" | High |
| Large file change | "Big changes detected. Document them?" | Low |
| Config changed | "Config updated. Record why?" | Medium |
| Error spike | "Multiple errors. Root cause?" | High |
| Activity burst | "Busy period! Capture your work?" | Low |

---

## Configuration

```yaml
eventDetection:
  enabled: true
  processes:
    minDuration: 300000  # 5 min
    trackNames:
      - "node"
      - "npm"
      - "git"
  files:
    significantChangeLines: 100
    watchPaths:
      - "~/memphis/src"
      - "~/.memphis"
  patterns:
    errorSpikeThreshold: 3
    errorSpikeWindow: 600000  # 10 min
    activityBurstThreshold: 10
    activityBurstWindow: 300000  # 5 min
```

---

## File Structure

```
src/intelligence/
├── suggestions.ts          # Time-based suggestions (existing)
├── event-detector.ts       # NEW: Event detection engine
├── event-types.ts          # NEW: Event interfaces
├── event-mapper.ts         # NEW: Event → Suggestion mapping
└── anomaly-detector.ts     # Anomaly detection (existing)
```

---

## API

### Start Event Detection

```typescript
import { EventDetector } from './event-detector';

const detector = new EventDetector(config);

// Start monitoring
detector.start();

// Subscribe to events
detector.on('event', (event) => {
  console.log(`Event: ${event.type}`);
});

// Stop monitoring
detector.stop();
```

### Get Active Suggestions

```typescript
import { checkTimeTriggers } from './suggestions';
import { checkEventTriggers } from './event-detector';

const timeSuggestions = checkTimeTriggers(lastJournalTime);
const eventSuggestions = checkEventTriggers(recentEvents);

const allSuggestions = [...timeSuggestions, ...eventSuggestions];
```

---

## Performance Considerations

- Event buffer: Keep last 100 events in memory
- Debouncing: Aggregate rapid events (5s window)
- Persistence: Save events to ~/.memphis/events.jsonl
- Cleanup: Remove events older than 24h

---

## Testing Strategy

1. **Unit Tests**
   - Event detection logic
   - Suggestion mapping
   - Debouncing

2. **Integration Tests**
   - Process monitoring
   - File watching
   - TUI integration

3. **Manual Testing**
   - Run long process, verify suggestion
   - Edit large file, verify suggestion
   - Trigger errors, verify suggestion

---

## Future Enhancements

1. **Smart Filtering** - ML-based relevance scoring
2. **Custom Rules** - User-defined event triggers
3. **External Hooks** - Webhook integration
4. **Calendar Sync** - Meeting end detection
5. **Git Integration** - Branch completion detection

---

## Success Metrics

- [ ] Process completion detection working
- [ ] File change detection enhanced
- [ ] Error pattern detection active
- [ ] TUI shows event-based suggestions
- [ ] 50% reduction in "forgot to journal" moments

---

**Version:** 1.0
**Created:** 2026-03-02
**Status:** Ready for implementation
