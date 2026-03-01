/**
 * Time-Based Suggestions Engine
 *
 * Generates proactive journaling suggestions based on time patterns
 */

export interface Suggestion {
  type: 'journal' | 'reflect' | 'summarize';
  message: string;
  priority: 'low' | 'medium' | 'high';
  trigger: string;
  timestamp: number;
}

export interface TimeTriggers {
  hoursSinceLastJournal: number;
  endOfDayHour: number;
  weeklyDay: number; // 0=Sunday, 1=Monday, etc.
  weeklyHour: number;
}

const DEFAULT_TRIGGERS: TimeTriggers = {
  hoursSinceLastJournal: 6,
  endOfDayHour: 17, // 5 PM
  weeklyDay: 0,     // Sunday
  weeklyHour: 18    // 6 PM
};

/**
 * Check time-based triggers and generate suggestions
 */
export function checkTimeTriggers(
  lastJournalTime: number,
  now: Date = new Date(),
  config: TimeTriggers = DEFAULT_TRIGGERS
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const hoursSince = (now.getTime() - lastJournalTime) / (1000 * 60 * 60);

  // 1. 6-hour inactivity trigger
  if (hoursSince >= config.hoursSinceLastJournal) {
    suggestions.push({
      type: 'journal',
      message: `Haven't journaled in ${Math.floor(hoursSince)}h. Anything to capture?`,
      priority: 'medium',
      trigger: '6h-inactivity',
      timestamp: now.getTime()
    });
  }

  // 2. End-of-day reflection trigger
  const hour = now.getHours();
  if (hour === config.endOfDayHour && hoursSince > 4) {
    suggestions.push({
      type: 'journal',
      message: 'End of day approaching. Quick reflection?',
      priority: 'low',
      trigger: 'end-of-day',
      timestamp: now.getTime()
    });
  }

  // 3. Weekly summary trigger
  const day = now.getDay();
  if (day === config.weeklyDay && hour === config.weeklyHour) {
    suggestions.push({
      type: 'summarize',
      message: 'Weekly summary time! Review your week?',
      priority: 'medium',
      trigger: 'weekly-summary',
      timestamp: now.getTime()
    });
  }

  return suggestions;
}

/**
 * Check if suggestion was recently dismissed
 */
export function isDismissed(
  trigger: string,
  dismissedTriggers: string[],
  cooldownMs: number = 4 * 60 * 60 * 1000 // 4 hours
): boolean {
  // TODO: Implement with timestamp tracking
  return dismissedTriggers.includes(trigger);
}

/**
 * Get suggestion priority score (for ranking)
 */
export function getPriorityScore(suggestion: Suggestion): number {
  const priorityWeights = {
    high: 3,
    medium: 2,
    low: 1
  };

  return priorityWeights[suggestion.priority];
}

/**
 * Format suggestion for TUI display
 */
export function formatSuggestion(suggestion: Suggestion): string {
  const icons = {
    journal: '📝',
    reflect: '💭',
    summarize: '📊'
  };

  const icon = icons[suggestion.type];
  return `${icon} ${suggestion.message}`;
}
