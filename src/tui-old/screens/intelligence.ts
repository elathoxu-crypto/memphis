/**
 * Memphis TUI – Intelligence Screen (Phase 6)
 */
import type { Store } from "../../memory/store.js";
import type { MemphisConfig } from "../../config/loader.js";
import type { TUIState } from "../state.js";
import { getLearningStorage } from "../../intelligence/learning.js";
import { PATTERN_STATS } from "../../intelligence/patterns.js";

export function renderIntelligence(store: Store, config: MemphisConfig, state: TUIState): string {
  const learningStorage = getLearningStorage();
  const stats = learningStorage.getStats();
  
  let content = `{bold}{cyan}🧠 Phase 6 — Intelligence{/cyan}{/bold}\n\n`;

  // Learning Stats
  content += `{bold}📊 Learning Statistics:{/bold}\n`;
  content += `  Total feedback: {cyan}${stats.totalFeedback}{/cyan}\n`;
  content += `  Accepted tags: {green}${stats.acceptedTags}{/green}\n`;
  content += `  Rejected tags: {red}${stats.rejectedTags}{/red}\n`;
  
  if (stats.acceptedTags > 0 || stats.rejectedTags > 0) {
    const accuracy = stats.acceptedTags / (stats.acceptedTags + stats.rejectedTags);
    const accuracyColor = accuracy > 0.8 ? 'green' : accuracy > 0.5 ? 'yellow' : 'red';
    content += `  Accuracy: {${accuracyColor}}${(accuracy * 100).toFixed(1)}%{/${accuracyColor}}\n`;
  }
  content += `\n`;

  // Top Accepted Tags
  if (stats.topAccepted.length > 0) {
    content += `{bold}{green}✅ Top Accepted Tags:{/green}{/bold}\n`;
    stats.topAccepted.slice(0, 5).forEach((item, i) => {
      const bar = '█'.repeat(Math.min(item.count, 10));
      const barColor = item.count > 5 ? 'green' : item.count > 2 ? 'yellow' : 'gray';
      content += `  ${i + 1}. ${item.tag.padEnd(20)} {${barColor}}${bar}{/${barColor}} {gray}(${item.count}){/gray}\n`;
    });
    content += `\n`;
  }

  // Top Rejected Tags
  if (stats.topRejected.length > 0) {
    content += `{bold}{red}❌ Top Rejected Tags:{/red}{/bold}\n`;
    stats.topRejected.slice(0, 5).forEach((item, i) => {
      const bar = '█'.repeat(Math.min(item.count, 10));
      content += `  ${i + 1}. ${item.tag.padEnd(20)} {red}${bar}{/red} {gray}(${item.count}){/gray}\n`;
    });
    content += `\n`;
  }

  // Pattern Database
  content += `{bold}{blue}📚 Pattern Database:{/blue}{/bold}\n`;
  content += `  Tag patterns: {cyan}${PATTERN_STATS.totalPatterns}{/cyan}\n`;
  content += `  Regex patterns: {cyan}${PATTERN_STATS.totalRegexPatterns}{/cyan}\n\n`;

  content += `{bold}By Category:{/bold}\n`;
  const categories = Object.entries(PATTERN_STATS.byCategory)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  categories.forEach(([category, count]) => {
    const bar = '█'.repeat(Math.min(count, 20));
    content += `  ${category.padEnd(15)} {cyan}${bar}{/cyan} {gray}(${count}){/gray}\n`;
  });
  content += `\n`;

  // Custom Tags
  const customTags = learningStorage.getCustomTags();
  if (customTags.length > 0) {
    content += `{bold}{magenta}🏷️  Custom Tags:{/magenta}{/bold}\n`;
    customTags.slice(0, 10).forEach(tag => {
      content += `  • {yellow}${tag}{/yellow}\n`;
    });
    content += `\n`;
  }

  // Quick Actions
  content += `{bold}⌨️  Quick Actions:{/bold}\n`;
  content += `  {gray}[c]{/gray} Clear learning data\n`;
  content += `  {gray}[r]{/gray} Refresh stats\n`;
  content += `  {gray}[t]{/gray} Test categorization\n`;
  content += `  {gray}[q]{/gray} Back to dashboard\n`;

  return content;
}

/**
 * Handle keyboard input for intelligence screen
 */
export function handleIntelligenceInput(key: string, state: TUIState): string | null {
  switch (key.toLowerCase()) {
    case 'c':
      return 'clear';
    case 'r':
      return 'refresh';
    case 't':
      return 'test';
    case 'q':
    case 'escape':
      return 'dashboard';
    default:
      return null;
  }
}
