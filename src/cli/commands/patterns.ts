/**
 * CLI command: memphis patterns
 * 
 * Inspect and manage learned patterns.
 * 
 * @version 1.0.0
 * @created 2026-03-02
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { createWorkspaceStore } from '../utils/workspace-store.js';
import { PatternLearner } from '../../decision/pattern-learner.js';

export function createPatternsCommand(): Command {
  const command = new Command('patterns');

  command
    .description('📊 Inspect learned patterns (Model C)')
    .argument('[action]', 'list | stats | clear', 'list')
    .option('--json', 'Output as JSON')
    .action(async (action, options) => {
      try {
        await runPatterns(action, options);
      } catch (error) {
        console.error('Error:', error);
        process.exit(1);
      }
    });

  return command;
}

async function runPatterns(action: string, options: any): Promise<void> {
  const { guard } = createWorkspaceStore();
  const learner = new PatternLearner(guard);

  switch (action) {
    case 'list':
      await listPatterns(learner, options.json);
      break;
    
    case 'stats':
      await showStats(learner, options.json);
      break;
    
    case 'clear':
      await clearPatterns(learner);
      break;
    
    default:
      console.error(`Unknown action: ${action}`);
      console.log('Available actions: list, stats, clear');
      process.exit(1);
  }
}

async function listPatterns(learner: PatternLearner, json: boolean): Promise<void> {
  const patterns = learner.getPatterns();

  if (json) {
    console.log(JSON.stringify(patterns, null, 2));
    return;
  }

  if (patterns.length === 0) {
    console.log('⚠️  No patterns learned yet.');
    console.log('');
    console.log('💡 Run: memphis predict --learn');
    return;
  }

  console.log(`📊 LEARNED PATTERNS (${patterns.length})\n`);

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    
    console.log(`${i + 1}. ${pattern.prediction.title}`);
    console.log(`   Type: ${pattern.prediction.type}`);
    console.log(`   Occurrences: ${pattern.occurrences}`);
    console.log(`   Confidence: ${(pattern.prediction.confidence * 100).toFixed(0)}%`);
    
    if (pattern.accuracy !== undefined) {
      console.log(`   Accuracy: ${(pattern.accuracy * 100).toFixed(0)}%`);
    }
    
    console.log(`   Created: ${new Date(pattern.created).toLocaleDateString()}`);
    console.log(`   Last seen: ${new Date(pattern.lastSeen).toLocaleDateString()}`);
    console.log('');
  }
}

async function showStats(learner: PatternLearner, json: boolean): Promise<void> {
  const stats = learner.getStats();

  if (json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log('📊 PATTERN STATISTICS\n');
  console.log(`Total patterns: ${stats.totalPatterns}`);
  console.log(`Average occurrences: ${stats.avgOccurrences.toFixed(1)}`);
  
  if (stats.avgAccuracy !== null) {
    console.log(`Average accuracy: ${(stats.avgAccuracy * 100).toFixed(0)}%`);
  } else {
    console.log(`Average accuracy: N/A (no predictions yet)`);
  }
  
  if (stats.oldestPattern) {
    console.log(`Oldest pattern: ${new Date(stats.oldestPattern).toLocaleDateString()}`);
  }
  
  if (stats.newestPattern) {
    console.log(`Newest pattern: ${new Date(stats.newestPattern).toLocaleDateString()}`);
  }
}

async function clearPatterns(learner: PatternLearner): Promise<void> {
  const patterns = learner.getPatterns();
  
  if (patterns.length === 0) {
    console.log('⚠️  No patterns to clear.');
    return;
  }

  console.log(`⚠️  This will delete ${patterns.length} learned patterns.`);
  console.log('Type "yes" to confirm:');
  
  // Read from stdin
  const answer = await new Promise<string>(resolve => {
    process.stdin.once('data', data => {
      resolve(data.toString().trim());
    });
  });

  if (answer !== 'yes') {
    console.log('Cancelled.');
    return;
  }

  // Clear all patterns
  for (const pattern of patterns) {
    // Pattern storage doesn't have a clear all method, so delete individually
    // learner.storage.delete(pattern.id); // This would work if we expose it
  }

  // Actually, let's just delete the patterns file
  const memphisDir = process.env.MEMPHIS_DIR || path.join(process.env.HOME || '', '.memphis');
  const patternsPath = path.join(memphisDir, 'patterns.json');
  
  if (fs.existsSync(patternsPath)) {
    fs.unlinkSync(patternsPath);
    console.log(`✅ Deleted ${patterns.length} patterns`);
  } else {
    console.log('⚠️  Patterns file not found');
  }
}
