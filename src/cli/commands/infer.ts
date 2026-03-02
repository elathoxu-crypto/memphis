/**
 * CLI command: memphis infer
 * 
 * Run the decision inference engine (Model B MVP)
 */

import { Command } from "commander";
import { DecisionInferenceEngine, InferredDecision } from "../../decision/inference-engine.js";
import * as readline from "readline";

export interface InferOptions {
  since?: string;
  threshold?: string;
  json?: boolean;
  prompt?: boolean;
}

export async function inferCommand(opts: InferOptions): Promise<void> {
  const since = parseInt(opts.since || "7", 10);
  const threshold = parseFloat(opts.threshold || "0.5");
  const json = opts.json || false;
  const shouldPrompt = opts.prompt || false;

  const engine = new DecisionInferenceEngine();

  try {
    // Detect decisions
    const decisions = await engine.detectDecisions(since);
    const highConfidence = engine.getHighConfidence(decisions, threshold);

    if (json) {
      console.log(JSON.stringify(highConfidence, null, 2));
      return;
    }

    // Interactive prompt mode
    if (shouldPrompt && highConfidence.length > 0) {
      const { ProactivePrompter } = await import("../../decision/proactive-prompter.js");
      const prompter = new ProactivePrompter(process.cwd(), {
        confidenceThreshold: threshold,
        maxPrompts: 3,
        interactive: true,
      });
      
      await prompter.checkAndPrompt(since);
      return;
    }

    // Human-readable output (non-interactive)
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║           Memphis Decision Inference Engine 🧠            ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
    console.log(`\n  Analyzed commits from last ${since} days`);
    console.log(`  Confidence threshold: ${(threshold * 100).toFixed(0)}%`);
    console.log(`  Total detected: ${decisions.length}`);
    console.log(`  High confidence: ${highConfidence.length}`);

    if (highConfidence.length === 0) {
      console.log("\n  ✓ No high-confidence decisions detected\n");
      return;
    }

    console.log("\n  ─────────────────────────────────────────────────────");
    console.log("  DETECTED DECISIONS:");
    console.log("  ─────────────────────────────────────────────────────\n");

    for (let i = 0; i < highConfidence.length; i++) {
      const d = highConfidence[i];
      const confidenceEmoji = d.confidence >= 0.7 ? "🟢" : d.confidence >= 0.6 ? "🟡" : "🔴";

      console.log(`  ${i + 1}. ${confidenceEmoji} [${(d.confidence * 100).toFixed(0)}%] ${d.title}`);
      console.log(`     Type: ${d.type} | Category: ${d.category}`);
      console.log(`     Evidence: ${d.evidence}`);
      console.log("");
    }

    console.log("  ─────────────────────────────────────────────────────");
    console.log(`  Run with --prompt to save these as conscious decisions\n`);
  } catch (error) {
    console.error("\n  ✗ Inference failed. Make sure you're in a git repository.\n");
    console.error(`  Error: ${error}\n`);
    process.exit(1);
  }
}

// Register command
export function registerInferCommand(program: Command): void {
  program
    .command("infer")
    .description("Detect inferred decisions from git history (Model B)")
    .option("--since <days>", "Analyze commits from last N days", "7")
    .option("--threshold <0-1>", "Minimum confidence threshold", "0.5")
    .option("--json", "Output as JSON")
    .option("--prompt", "Prompt to save detected decisions (future)")
    .action((opts) => inferCommand(opts));
}
