# Time-Based Suggestions — Design Doc

**Feature:** Proactive journaling suggestions based on time/events
**Effort:** 1-2 days
**Priority:** 20 (highest)
**Start:** Monday 2026-03-02

---

## 🎯 Goal

Remind users to journal when:
1. Haven't journaled in 6+ hours
2. End of day approaching (17:00-18:00)
3. Weekly summary time (Sunday 18:00)
4. Unusual activity detected (future)

---

## 🔧 Implementation

### 1. Core Logic (`src/intelligence/suggestions.ts`)

```typescript
export interface Suggestion {
  type: 'journal' | 'reflect' | 'summarize';
  message: string;
  priority: 'low' | 'medium' | 'high';
  trigger: string;
  action?: () => void;
}

export interface TimeTriggers {
  hoursSinceLastJournal: number; // 6h threshold
  endOfDayHour: number;          // 17:00
  weeklyDay: number;             // 0=Sunday
  weeklyHour: number;            // 18:00
}

const DEFAULT_TRIGGERS: TimeTriggers = {
  hoursSinceLastJournal: 6,
  endOfDayHour: 17,
  weeklyDay: 0, // Sunday
  weeklyHour: 18
};

export function checkTimeTriggers(
  lastJournalTime: number,
  now: Date = new Date(),
  config: TimeTriggers = DEFAULT_TRIGGERS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // 1. 6h trigger
  const hoursSince = (now.getTime() - lastJournalTime) / (1000 * 60 * 60);
  if (hoursSince >= config.hoursSinceLastJournal) {
    suggestions.push({
      type: 'journal',
      message: `Haven't journaled in ${Math.floor(hoursSince)}h. Anything to capture?`,
      priority: 'medium',
      trigger: '6h-inactivity'
    });
  }

  // 2. End of day trigger
  const hour = now.getHours();
  if (hour === config.endOfDayHour && hoursSince > 4) {
    suggestions.push({
      type: 'journal',
      message: "End of day approaching. Quick reflection?",
      priority: 'low',
      trigger: 'end-of-day'
    });
  }

  // 3. Weekly summary trigger
  const day = now.getDay();
  if (day === config.weeklyDay && hour === config.weeklyHour) {
    suggestions.push({
      type: 'summarize',
      message: "Weekly summary time! Review your week?",
      priority: 'medium',
      trigger: 'weekly-summary'
    });
  }

  return suggestions;
}
```

---

### 2. TUI Integration (`src/tui/screens/*.ts`)

**Dashboard integration:**
```typescript
// In dashboard.ts, add suggestions widget
function renderSuggestions(state: TUIState): string {
  const suggestions = checkTimeTriggers(state.lastJournalTime);

  if (suggestions.length === 0) return '';

  let content = '{bold}💡 Suggestions:{/bold}\n';
  for (const s of suggestions) {
    content += `  ${s.message}\n`;
  }
  return content;
}
```

**Notification system:**
```typescript
// In tui/app.ts
function showNotification(suggestion: Suggestion) {
  // Non-intrusive banner at top of screen
  const banner = `{yellow-bg}💡 ${suggestion.message}{/yellow-bg}`;

  // Key handler: [j] = journal, [s] = skip
  state.keyHandlers['j'] = () => navigateTo('journal');
  state.keyHandlers['s'] = () => dismissNotification();
}
```

---

### 3. Data Access

**Get last journal time:**
```typescript
// From journal chain
const journalChain = store.readChain('journal');
const lastBlock = journalChain[journalChain.length - 1];
const lastJournalTime = lastBlock?.timestamp || 0;
```

**Store in TUI state:**
```typescript
interface TUIState {
  lastJournalTime: number;
  activeSuggestions: Suggestion[];
  suggestionDismissed: string[]; // Trigger IDs
}
```

---

## 🧪 Test Strategy

### Unit Tests (`tests/intelligence/suggestions.test.ts`)

```typescript
describe('Time-Based Suggestions', () => {
  it('should trigger after 6h', () => {
    const lastJournal = Date.now() - 6.5 * 60 * 60 * 1000;
    const suggestions = checkTimeTriggers(lastJournal);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].trigger).toBe('6h-inactivity');
  });

  it('should NOT trigger before 6h', () => {
    const lastJournal = Date.now() - 5 * 60 * 60 * 1000;
    const suggestions = checkTimeTriggers(lastJournal);
    expect(suggestions).toHaveLength(0);
  });

  it('should trigger at 17:00 if >4h since journal', () => {
    const lastJournal = Date.now() - 5 * 60 * 60 * 1000;
    const now = new Date();
    now.setHours(17, 0, 0, 0);

    const suggestions = checkTimeTriggers(lastJournal, now);
    expect(suggestions).toContainEqual(
      expect.objectContaining({ trigger: 'end-of-day' })
    );
  });

  it('should trigger weekly summary on Sunday 18:00', () => {
    const lastJournal = Date.now() - 2 * 60 * 60 * 1000;
    const now = new Date('2026-03-01T18:00:00'); // Sunday

    const suggestions = checkTimeTriggers(lastJournal, now);
    expect(suggestions).toContainEqual(
      expect.objectContaining({ trigger: 'weekly-summary' })
    );
  });
});
```

---

### Integration Tests

```typescript
describe('TUI Integration', () => {
  it('should show suggestion in dashboard', async () => {
    const state = { lastJournalTime: Date.now() - 7 * 60 * 60 * 1000 };
    const dashboard = renderDashboard(store, config, state);

    expect(dashboard).toContain("Haven't journaled");
  });

  it('should dismiss suggestion on [s] key', async () => {
    renderTUI();
    pressKey('s');

    const state = getTUIState();
    expect(state.suggestionDismissed).toContain('6h-inactivity');
  });

  it('should navigate to journal on [j] key', async () => {
    renderTUI();
    pressKey('j');

    const screen = getCurrentScreen();
    expect(screen).toBe('journal');
  });
});
```

---

## 📁 File Structure

```
src/intelligence/
  ├── suggestions.ts          (new) - Core logic
  └── types.ts                (update) - Add Suggestion interface

src/tui/
  ├── app.ts                  (update) - Notification system
  ├── state.ts                (update) - Add suggestion state
  └── screens/
      └── dashboard.ts        (update) - Suggestions widget

tests/intelligence/
  └── suggestions.test.ts     (new) - Unit tests

docs/
  └── time-based-suggestions-design.md (this file)
```

---

## 🎬 Monday Plan (1-2 days)

### Morning (3 hours)
1. ✅ Create `src/intelligence/suggestions.ts` (1h)
2. ✅ Add TUI state fields (30 min)
3. ✅ Implement `checkTimeTriggers()` (1h)
4. ✅ Write unit tests (30 min)

### Afternoon (3 hours)
1. ✅ Add dashboard widget (1h)
2. ✅ Implement notification system (1h)
3. ✅ Write integration tests (1h)

### Evening (1 hour)
1. ✅ Manual testing (30 min)
2. ✅ Documentation (15 min)
3. ✅ Commit + push (15 min)

**Done by Monday evening!** 🔥

---

## 📊 Success Criteria

- ✅ Unit tests pass (>95%)
- ✅ Integration tests pass (>90%)
- ✅ Performance <50ms (trigger check)
- ✅ Notifications non-intrusive
- ✅ [j] key works (journal)
- ✅ [s] key works (skip)

---

## 🔮 Future Enhancements

1. **Event-based triggers** (process finished, file changed)
2. **Smart timing** (learn user's journaling patterns)
3. **Priority adjustments** (urgent vs. nice-to-have)
4. **Custom triggers** (user-defined rules)

---

**Ready for Monday!** 🚀
