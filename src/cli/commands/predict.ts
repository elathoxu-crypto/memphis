/**
 * CLI command: memphis predict
 * 
 * Shows predicted decisions based on learned patterns.
 * 
 * @version 1.0.0
 * @created 2026-03-02
 */

import { Command } from 'commander';
import * as path from 'path';
import { createWorkspaceStore } from '../utils/workspace-store.js';
import { PatternLearner } from '../../decision/pattern-learner.js';
import { ContextAnalyzer } from '../../decision/context-analyzer.js';
import { PredictionEngine } from '../../decision/prediction-engine.js';

export function createPredictCommand(): Command {
  const command = new Command('predict');

  command
    .description('Show predicted decisions based on learned patterns')
    .option('--learn', 'Learn patterns from history first')
    .option('--since <days>', 'Days to analyze for learning', '30')
    .option('--min-confidence <n>', 'Minimum confidence threshold', '0.6')
    .option('--max <n>', 'Maximum predictions to show', '5')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        await runPredict({
          learn: options.learn || false,
          since: parseInt(options.since),
          minConfidence: parseFloat(options.minConfidence),
          max: parseInt(options.max),
          json: options.json || false,
        });
      } catch (error) {
        console.error('Error:', error);
        process.exit(1);
      }
    });

  return command;
}

interface PredictOptions {
  learn: boolean;
  since: number;
  minConfidence: number;
  max: number;
  json: boolean;
}

async function runPredict(options: PredictOptions): Promise<void> {
  const { guard } = createWorkspaceStore();

  // Initialize components
  const learner = new PatternLearner(guard, {
    minOccurrences: 3,
    confidenceCap: 0.95,
    contextSimilarityThreshold: 0.7,
  });
  const analyzer = new ContextAnalyzer({
    recentFilesMinutes: 60,
    recentCommitsHours: 24,
    maxActiveFiles: 20,
  });
  const engine = new PredictionEngine(learner, analyzer, {
    minConfidence: options.minConfidence,
    maxPredictions: options.max,
  });

  // Learn patterns if requested
  if (options.learn) {
    console.log(`📚 Learning patterns from last ${options.since} days...\n`);
    
    const newPatterns = await learner.learnFromHistory(options.since);
    const stats = learner.getStats();
    
    console.log(`✅ Learned ${newPatterns.length} new patterns`);
    console.log(`   Total patterns: ${stats.totalPatterns}`);
    console.log(`   Avg occurrences: ${stats.avgOccurrences.toFixed(1)}`);
    console.log('');
  }

  // Check if patterns exist
  const patterns = learner.getPatterns();
  if (patterns.length === 0) {
    console.log('⚠️  No patterns learned yet.');
    console.log('');
    console.log('💡 Run with --learn to learn from your decision history:');
    console.log('   memphis predict --learn');
    console.log('');
    console.log('   Or make more decisions first:');
    console.log('   memphis decide "Title" "Choice" -r "Reason"');
    return;
  }

  // Generate predictions
  console.log('🔮 Analyzing current context...\n');
  
  const result = await engine.predict();

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(engine.formatPredictions(result));
  }
}
