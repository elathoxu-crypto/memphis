#!/usr/bin/env node
/**
 * Memphis Model C Daemon - Proactive Suggestions
 * 
 * Runs in background, checks context every 30 minutes,
 * and sends proactive suggestions when confidence >70%.
 * 
 * @version 2.0.0
 * @created 2026-03-02
 */

import { Store } from '../memory/store.js';
import { PatternLearner } from '../decision/pattern-learner.js';
import { ContextAnalyzer } from '../decision/context-analyzer.js';
import { PredictionEngine } from '../decision/prediction-engine.js';
import { ProactiveSuggester } from '../decision/proactive-suggester.js';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MEMPHIS_DIR = process.env.MEMPHIS_DIR || 
  require('path').join(process.env.HOME || '', '.memphis');

async function main() {
  console.log('🤖 Memphis Model C Daemon - Proactive Suggestions');
  console.log(`Interval: ${INTERVAL_MS / 1000 / 60} minutes`);
  console.log('');

  // Initialize components
  const store = new Store(require('path').join(MEMPHIS_DIR, 'chains'));
  const learner = new PatternLearner(store);
  const analyzer = new ContextAnalyzer();
  const engine = new PredictionEngine(learner, analyzer);
  const suggester = new ProactiveSuggester(engine, analyzer, learner, {
    minConfidence: 0.7,
    minInterval: 30,
    maxSuggestions: 3,
    channels: ['terminal'],
  });

  console.log('✅ Components initialized');
  console.log(`📊 Patterns: ${learner.getPatterns().length}`);
  console.log('');

  // Main loop
  while (true) {
    try {
      const suggestions = await suggester.checkAndSuggest();
      
      if (suggestions && suggestions.length > 0) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[${new Date().toISOString()}] 📢 SUGGESTIONS AVAILABLE`);
        console.log(`${'='.repeat(60)}\n`);
        console.log(suggester.formatSuggestions(suggestions));
      } else {
        console.log(`[${new Date().toISOString()}] ✓ No suggestions (patterns: ${learner.getPatterns().length})`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error:`, error);
    }

    // Sleep
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
  }
}

// Run
main().catch(console.error);
