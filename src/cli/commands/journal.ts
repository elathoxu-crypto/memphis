import chalk from "chalk";
import { log } from "../../utils/logger.js";
import { memphis } from "../../agents/logger.js";
import { checkAndSaveDecision } from "../../core/decision-detector.js";
import { autosummarize, shouldTriggerAutosummary } from "../../core/autosummarizer.js";
import { createWorkspaceStore } from "../utils/workspace-store.js";
import { Categorizer, buildInferenceContext } from "../../intelligence/categorizer.js";
import * as readline from "readline";

export async function journalCommand(message: string, options: { tags?: string; force?: boolean; chain?: string; suggestTags?: boolean }) {
  const { guard } = createWorkspaceStore();
  const manualTags = options.tags ? options.tags.split(",").map(t => t.trim()) : [];
  const force = options.force || false;
  const chain = options.chain?.trim() || "journal";
  const suggestTags = options.suggestTags || false;

  let tags = manualTags;

  // Phase 6: Auto-categorization with --suggest-tags
  if (suggestTags && manualTags.length === 0) {
    try {
      const categorizer = new Categorizer();
      
      // Build context from recent blocks
      const allBlocks = guard.readChain(chain);
      const recentBlocks = allBlocks.slice(-20); // Last 20 blocks
      const context = buildInferenceContext(recentBlocks);
      
      // Get suggestions
      const result = await categorizer.suggestCategories(message, context);
      
      if (result.tags.length > 0 && result.overallConfidence > 0.5) {
        console.log(chalk.cyan(`\n✨ Suggested tags (${result.method} matching, ${Math.round(result.overallConfidence * 100)}% confidence):`));
        
        result.tags.slice(0, 5).forEach((tag, i) => {
          const confidence = Math.round(tag.confidence * 100);
          const evidence = tag.evidence ? chalk.gray(` (${tag.evidence.slice(0, 50)}...)`) : '';
          console.log(`  ${i + 1}. ${chalk.yellow(tag.tag)} ${chalk.gray(`(${confidence}%)`)} ${evidence}`);
        });
        
        // Prompt user
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise<string>((resolve) => {
          rl.question(chalk.cyan('\nAccept suggestions? [y/n/e=edit/s=skip]: '), (ans) => {
            rl.close();
            resolve(ans.toLowerCase().trim());
          });
        });
        
        if (answer === 'y' || answer === 'yes') {
          tags = result.tags.slice(0, 5).map(t => t.tag);
          console.log(chalk.green(`✓ Applied ${tags.length} tags`));
        } else if (answer === 'e' || answer === 'edit') {
          const suggestedStr = result.tags.slice(0, 5).map(t => t.tag).join(', ');
          console.log(chalk.gray(`Suggested: ${suggestedStr}`));
          
          const rl2 = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const customTags = await new Promise<string>((resolve) => {
            rl2.question(chalk.cyan('Enter tags (comma-separated): '), (ans) => {
              rl2.close();
              resolve(ans.trim());
            });
          });
          
          tags = customTags ? customTags.split(',').map(t => t.trim()) : result.tags.slice(0, 5).map(t => t.tag);
        } else if (answer === 's' || answer === 'skip') {
          tags = [];
          console.log(chalk.gray('Skipped tagging'));
        } else {
          console.log(chalk.gray('No tags applied'));
        }
        
        // Log performance
        if (result.processingTimeMs > 0) {
          log.info(chalk.gray(`Categorization: ${result.processingTimeMs}ms`));
        }
      } else {
        console.log(chalk.gray(`\n💡 No high-confidence tag suggestions (confidence: ${Math.round(result.overallConfidence * 100)}%)`));
      }
    } catch (err) {
      // Non-blocking - categorization is best-effort
      console.log(chalk.gray(`⚠ Categorization failed: ${err}`));
    }
  }

  const block = await guard.appendBlock(chain, {
    type: "journal",
    content: message,
    tags,
    agent: "journal",
  });

  log.block(chain, block.index, block.hash);
  log.info(message);

  // Check for decision (async, non-blocking)
  try {
    const decisionBlock = await checkAndSaveDecision(guard, block);
    if (decisionBlock) {
      console.log(`\n📋 Decision detected! Saved to decision#${String(decisionBlock.index).padStart(6, "0")}`);
    }
  } catch (err) {
    // Non-blocking - decision detection is best-effort
    console.log(chalk.gray(`\n⚠ Decision check failed: ${err}`));
  }

  // Check for autosummary trigger (non-blocking, with unref)
  // If --force is used, always trigger summary regardless of block count
  setTimeout(async () => {
    try {
      const shouldSummarize = force || shouldTriggerAutosummary(guard, 50);
      if (shouldSummarize) {
        const result = await autosummarize(guard, { dryRun: false, force });
        if (result.block) {
          const msg = force 
            ? `\n📊 Autosummary forced: summary#${String(result.block.index).padStart(6, "0")}`
            : `\n📊 Autosummary created: summary#${String(result.block.index).padStart(6, "0")}`;
          console.log(chalk.gray(msg));
        }
      }
    } catch (err) {
      // Non-blocking - autosummary is best-effort
    }
  }, 100).unref();
  
  // Log to unified logger
  memphis.cmd("journal", "ok");
}
