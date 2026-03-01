/**
 * Phase 6 — Intelligence CLI Commands
 */

import chalk from "chalk";
import { getLearningStorage } from "../../intelligence/learning.js";
import { PATTERN_STATS } from "../../intelligence/patterns.js";

export async function intelligenceCommand(action: string, options: { json?: boolean; clear?: boolean }) {
  if (action === 'stats') {
    await showStats(options);
  } else if (action === 'clear') {
    await clearLearning();
  } else {
    console.log(chalk.red(`Unknown action: ${action}`));
    console.log(chalk.gray('Usage: memphis intelligence stats|clear'));
    console.log(chalk.gray('  stats - Show learning statistics'));
    console.log(chalk.gray('  clear - Clear all learning data'));
  }
}

async function showStats(options: { json?: boolean }) {
  const storage = getLearningStorage();
  const stats = storage.getStats();

  if (options.json) {
    console.log(JSON.stringify({
      learning: stats,
      patternDatabase: PATTERN_STATS
    }, null, 2));
    return;
  }

  // Human-readable output
  console.log(chalk.cyan.bold('\n🧠 Phase 6 — Intelligence Stats\n'));

  // Learning stats
  console.log(chalk.yellow('📊 Learning Statistics:'));
  console.log(`  Total feedback events: ${chalk.white(stats.totalFeedback)}`);
  console.log(`  Accepted tags: ${chalk.green(stats.acceptedTags)}`);
  console.log(`  Rejected tags: ${chalk.red(stats.rejectedTags)}`);
  console.log(`  Custom tags created: ${chalk.blue(stats.customTags)}`);
  console.log(`  Tag aliases: ${chalk.magenta(stats.aliases)}`);

  if (stats.acceptedTags > 0 || stats.rejectedTags > 0) {
    const accuracy = stats.acceptedTags / (stats.acceptedTags + stats.rejectedTags);
    console.log(`  Accuracy: ${chalk.yellow((accuracy * 100).toFixed(1) + '%')}`);
  }

  // Top accepted tags
  if (stats.topAccepted.length > 0) {
    console.log(chalk.green('\n✅ Top Accepted Tags:'));
    stats.topAccepted.slice(0, 5).forEach((item, i) => {
      const bar = '█'.repeat(Math.min(item.count, 10));
      console.log(`  ${i + 1}. ${chalk.yellow(item.tag.padEnd(20))} ${chalk.green(bar)} ${chalk.gray(`(${item.count})`)}`);
    });
  }

  // Top rejected tags
  if (stats.topRejected.length > 0) {
    console.log(chalk.red('\n❌ Top Rejected Tags:'));
    stats.topRejected.slice(0, 5).forEach((item, i) => {
      const bar = '█'.repeat(Math.min(item.count, 10));
      console.log(`  ${i + 1}. ${chalk.yellow(item.tag.padEnd(20))} ${chalk.red(bar)} ${chalk.gray(`(${item.count})`)}`);
    });
  }

  // Pattern database stats
  console.log(chalk.blue('\n📚 Pattern Database:'));
  console.log(`  Total tag patterns: ${chalk.white(PATTERN_STATS.totalPatterns)}`);
  console.log(`  Total regex patterns: ${chalk.white(PATTERN_STATS.totalRegexPatterns)}`);
  
  console.log(chalk.gray('\nBy Category:'));
  for (const [category, count] of Object.entries(PATTERN_STATS.byCategory)) {
    if (count > 0) {
      console.log(`  ${category.padEnd(15)} ${chalk.cyan(count.toString())}`);
    }
  }

  // Custom tags
  const customTags = storage.getCustomTags();
  if (customTags.length > 0) {
    console.log(chalk.magenta('\n🏷️  Custom Tags:'));
    customTags.forEach(tag => {
      console.log(`  • ${chalk.yellow(tag)}`);
    });
  }

  console.log(chalk.gray('\n💡 Tip: Use --json flag for machine-readable output'));
  console.log();
}

async function clearLearning() {
  const storage = getLearningStorage();
  storage.clear();
  console.log(chalk.green('✓ Learning data cleared'));
  console.log(chalk.gray('All accepted/rejected patterns, custom tags, and aliases have been removed.'));
}
