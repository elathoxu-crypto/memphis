/**
 * TUI Screen: Inferred Decisions Dashboard
 * 
 * Shows detected decisions with accept/reject/edit options
 */

import * as readline from "readline";
import { DecisionInferenceEngine, InferredDecision } from "../../decision/inference-engine.js";
import { ProactivePrompter } from "../../decision/proactive-prompter.js";
import chalk from "chalk";

export class InferredDecisionsScreen {
  private engine: DecisionInferenceEngine;
  private prompter: ProactivePrompter;

  constructor(repoPath: string = process.cwd()) {
    this.engine = new DecisionInferenceEngine(repoPath);
    this.prompter = new ProactivePrompter(repoPath, {
      confidenceThreshold: 0.5,
      maxPrompts: 10,
      interactive: true,
    });
  }

  /**
   * Main screen - show inferred decisions
   */
  async show(sinceDays: number = 7): Promise<void> {
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║         💡 Inferred Decisions Dashboard 💡                ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    try {
      // Detect decisions
      const decisions = await this.engine.detectDecisions(sinceDays);
      const highConfidence = this.engine.getHighConfidence(decisions, 0.5);

      if (highConfidence.length === 0) {
        console.log(chalk.gray("  No high-confidence decisions detected.\n"));
        console.log(chalk.gray("  Try analyzing more days: --since 30\n"));
        return;
      }

      // Display decisions
      console.log(chalk.bold(`  Detected ${highConfidence.length} decisions:\n`));

      for (let i = 0; i < highConfidence.length; i++) {
        const d = highConfidence[i];
        this.displayDecision(d, i + 1);
      }

      // Interactive mode
      await this.interactiveMode(highConfidence);
    } catch (error) {
      console.error(chalk.red("\n  ✗ Failed to detect decisions\n"));
      console.error(chalk.gray(`  Error: ${error}\n`));
    }
  }

  /**
   * Display single decision
   */
  private displayDecision(decision: InferredDecision, num: number): void {
    const confidenceEmoji = decision.confidence >= 0.7 ? "🟢" : decision.confidence >= 0.6 ? "🟡" : "🔴";
    const confidenceColor = decision.confidence >= 0.7 ? chalk.green : decision.confidence >= 0.6 ? chalk.yellow : chalk.red;

    console.log(chalk.bold(`  ${num}. ${confidenceEmoji} ${confidenceColor(`[${(decision.confidence * 100).toFixed(0)}%]`)} ${decision.title}`));
    console.log(chalk.gray(`     Type: ${decision.type} | Category: ${decision.category}`));
    console.log(chalk.gray(`     Evidence: ${decision.evidence}`));
    console.log("");
  }

  /**
   * Interactive mode - select which to save
   */
  private async interactiveMode(decisions: InferredDecision[]): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const selected: number[] = [];

    console.log(chalk.bold("\n  Select decisions to save:"));
    console.log(chalk.gray("  Enter numbers separated by spaces (e.g., 1 3 5)\n"));

    const answer = await new Promise<string>((resolve) => {
      rl.question("  Your choice: ", (input) => {
        rl.close();
        resolve(input);
      });
    });

    // Parse selection
    const nums = answer.trim().split(/\s+/).map(n => parseInt(n) - 1);
    const valid = nums.filter(n => n >= 0 && n < decisions.length);

    if (valid.length === 0) {
      console.log(chalk.gray("\n  ✓ No decisions selected\n"));
      return;
    }

    // Save selected decisions
    console.log(chalk.bold(`\n  Saving ${valid.length} decision(s)...\n`));

    for (const index of valid) {
      const decision = decisions[index];
      await this.saveDecision(decision);
    }

    console.log(chalk.green(`\n  ✓ ${valid.length} decision(s) saved!\n`));
  }

  /**
   * Format decision for display
   */
  private formatDecisionTitle(decision: InferredDecision, num: number): string {
    const confidenceEmoji = decision.confidence >= 0.7 ? "🟢" : decision.confidence >= 0.6 ? "🟡" : "🔴";
    const confidence = (decision.confidence * 100).toFixed(0);
    const title = decision.title.length > 50 ? decision.title.substring(0, 47) + "..." : decision.title;
    
    return `${confidenceEmoji} [${confidence}%] ${title}`;
  }

  /**
   * Save decision as conscious
   */
  private async saveDecision(decision: InferredDecision): Promise<void> {
    try {
      await this.prompter.checkAndPrompt(1);
      console.log(chalk.green(`  ✓ ${decision.title.substring(0, 40)}`));
    } catch (error) {
      console.error(chalk.red(`  ✗ Failed to save: ${decision.title}`));
    }
  }
}

/**
 * Quick display widget for dashboard
 */
export function displayInferredDecisionsWidget(decisions: InferredDecision[]): void {
  if (decisions.length === 0) return;

  console.log(chalk.bold("\n  💡 Inferred Decisions"));
  console.log("  ─────────────────────────────");

  const top3 = decisions.slice(0, 3);
  for (let i = 0; i < top3.length; i++) {
    const d = top3[i];
    const confidence = (d.confidence * 100).toFixed(0);
    const emoji = d.confidence >= 0.7 ? "🟢" : "🟡";
    const title = d.title.length > 35 ? d.title.substring(0, 32) + "..." : d.title;
    
    console.log(chalk.gray(`  ${emoji} [${confidence}%] ${title}`));
  }

  if (decisions.length > 3) {
    console.log(chalk.gray(`  ... and ${decisions.length - 3} more`));
  }

  console.log(chalk.gray("\n  [TUI:9] View all inferred decisions"));
}
