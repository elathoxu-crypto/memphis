/**
 * Proactive Prompter - Model B to Conscious Decision Bridge
 * 
 * Prompts user to save inferred decisions as conscious decisions
 */

import * as readline from "readline";
import { DecisionInferenceEngine, InferredDecision } from "./inference-engine.js";
import { log } from "../utils/logger.js";
import { createDecisionV1 } from "./schema.js";
import { createWorkspaceStore } from "../cli/utils/workspace-store.js";

export interface PrompterConfig {
  /** Minimum confidence to prompt (default: 0.5) */
  confidenceThreshold: number;
  /** Max prompts per check (default: 3) */
  maxPrompts: number;
  /** Enable interactive mode (default: true) */
  interactive: boolean;
  /** Auto-accept threshold (default: 0.85, never auto-accept if null) */
  autoAcceptThreshold: number | null;
}

export class ProactivePrompter {
  private engine: DecisionInferenceEngine;
  private config: PrompterConfig;
  private rl: readline.Interface | null = null;

  constructor(
    repoPath: string = process.cwd(),
    config: Partial<PrompterConfig> = {}
  ) {
    this.engine = new DecisionInferenceEngine(repoPath);
    this.config = {
      confidenceThreshold: config.confidenceThreshold ?? 0.5,
      maxPrompts: config.maxPrompts ?? 3,
      interactive: config.interactive ?? true,
      autoAcceptThreshold: config.autoAcceptThreshold ?? null,
    };
  }

  /**
   * Main entry: Check for decisions and prompt user
   */
  async checkAndPrompt(sinceDays: number = 7): Promise<InferredDecision[]> {
    const decisions = await this.engine.detectDecisions(sinceDays);
    const highConfidence = this.engine.getHighConfidence(
      decisions,
      this.config.confidenceThreshold
    );

    if (highConfidence.length === 0) {
      log.debug("No high-confidence decisions detected");
      return [];
    }

    // Limit to max prompts
    const toPrompt = highConfidence.slice(0, this.config.maxPrompts);

    if (this.config.interactive) {
      return await this.interactivePrompt(toPrompt);
    } else {
      this.printDecisions(toPrompt);
      return toPrompt;
    }
  }

  /**
   * Interactive prompt loop
   */
  private async interactivePrompt(
    decisions: InferredDecision[]
  ): Promise<InferredDecision[]> {
    const accepted: InferredDecision[] = [];

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║         💡 Inferred Decisions Detected 💡                 ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    for (let i = 0; i < decisions.length; i++) {
      const decision = decisions[i];
      const accepted_decision = await this.promptSingle(decision, i + 1, decisions.length);
      
      if (accepted_decision) {
        accepted.push(accepted_decision);
      }
    }

    this.rl.close();
    this.rl = null;

    if (accepted.length > 0) {
      console.log(`\n  ✓ ${accepted.length} decision(s) saved as conscious\n`);
    } else {
      console.log("\n  ✓ No decisions saved\n");
    }

    return accepted;
  }

  /**
   * Prompt for single decision
   */
  private async promptSingle(
    decision: InferredDecision,
    current: number,
    total: number
  ): Promise<InferredDecision | null> {
    const confidenceEmoji = decision.confidence >= 0.7 ? "🟢" : decision.confidence >= 0.6 ? "🟡" : "🔴";

    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  [${current}/${total}] ${confidenceEmoji} [${(decision.confidence * 100).toFixed(0)}%] ${decision.title}`);
    console.log(`  Type: ${decision.type} | Category: ${decision.category}`);
    console.log(`  Evidence: ${decision.evidence}`);
    console.log(`  ─────────────────────────────────────────────────────\n`);

    const answer = await this.getUserInput("  Save as conscious decision? [y/n/e=edit/s=skip] ");

    switch (answer.toLowerCase().trim()) {
      case "y":
      case "yes":
        return await this.acceptDecision(decision);

      case "e":
      case "edit":
        return await this.editAndAccept(decision);

      case "n":
      case "no":
        console.log("  ✗ Skipped\n");
        return null;

      case "s":
      case "skip":
        return null;

      default:
        console.log("  ✗ Skipped (invalid input)\n");
        return null;
    }
  }

  /**
   * Accept decision as-is (convert to conscious)
   */
  private async acceptDecision(decision: InferredDecision): Promise<InferredDecision> {
    try {
      const { guard } = createWorkspaceStore();
      
      // Create decision block
      const decisionData = createDecisionV1({
        title: decision.title,
        options: [this.extractChosen(decision.title)],  // Use chosen as the only option
        chosen: this.extractChosen(decision.title),
        reasoning: `Inferred from ${decision.evidence}`,
        mode: "inferred",  // Mark as inferred (but promoted to conscious)
        confidence: 1.0,   // Upgraded to full confidence
        scope: "project",
        evidence: { refs: [decision.evidence], note: "Proactive prompt" },
      });

      // Save to decisions chain
      const block = await guard.appendBlock("decisions", {
        type: "decision",
        content: JSON.stringify(decisionData),
        tags: ["decision", "inferred", "conscious", decision.category],
        agent: "proactive-prompter",
      });
      
      console.log(`  ✓ Accepted as conscious decision [${block.hash.substring(0, 8)}]\n`);
      return decision;
    } catch (error) {
      console.error("  ✗ Failed to save decision:", error);
      return decision;
    }
  }

  /**
   * Edit decision before accepting
   */
  private async editAndAccept(decision: InferredDecision): Promise<InferredDecision> {
    console.log("\n  Current title:", decision.title);
    const newTitle = await this.getUserInput("  New title (Enter to keep): ");

    const finalTitle = newTitle.trim() || decision.title;
    const why = await this.getUserInput("  Why (optional): ");

    try {
      const { guard } = createWorkspaceStore();
      
      // Create decision block
      const decisionData = createDecisionV1({
        title: finalTitle,
        options: [this.extractChosen(finalTitle)],  // Use chosen as the only option
        chosen: this.extractChosen(finalTitle),
        reasoning: why.trim() || `Inferred from ${decision.evidence}`,
        mode: "inferred",
        confidence: 1.0,
        scope: "project",
        evidence: { refs: [decision.evidence], note: "Proactive prompt (edited)" },
      });

      // Save to decisions chain
      const block = await guard.appendBlock("decisions", {
        type: "decision",
        content: JSON.stringify(decisionData),
        tags: ["decision", "inferred", "conscious", "edited", decision.category],
        agent: "proactive-prompter",
      });
      
      console.log(`  ✓ Edited and accepted [${block.hash.substring(0, 8)}]\n`);
      return { ...decision, title: finalTitle };
    } catch (error) {
      console.error("  ✗ Failed to save decision:", error);
      return { ...decision, title: finalTitle };
    }
  }

  /**
   * Extract chosen option from title (simple heuristic)
   */
  private extractChosen(title: string): string {
    // Simple heuristic: if title contains "to" or "→", take the second part
    const parts = title.split(/(?:\s+to\s+|→|->)/);
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return title;
  }

  /**
   * Get user input via readline
   */
  private getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.rl) {
        resolve("");
        return;
      }
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * Non-interactive: just print decisions
   */
  private printDecisions(decisions: InferredDecision[]): void {
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║         💡 Inferred Decisions Detected 💡                 ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    for (let i = 0; i < decisions.length; i++) {
      const d = decisions[i];
      const confidenceEmoji = d.confidence >= 0.7 ? "🟢" : d.confidence >= 0.6 ? "🟡" : "🔴";

      console.log(`  ${i + 1}. ${confidenceEmoji} [${(d.confidence * 100).toFixed(0)}%] ${d.title}`);
      console.log(`     Type: ${d.type} | Category: ${d.category}`);
      console.log(`     Evidence: ${d.evidence}`);
      console.log("");
    }

    console.log("  ─────────────────────────────────────────────────────");
    console.log("  Run with --interactive to save as conscious decisions\n");
  }

  /**
   * Daemon integration: periodic check
   */
  async startPeriodicCheck(
    intervalMinutes: number = 60,
    sinceDays: number = 7
  ): Promise<void> {
    console.log(`Starting periodic decision inference (every ${intervalMinutes} min)`);

    // Initial check
    await this.checkAndPrompt(sinceDays);

    // Periodic checks
    setInterval(async () => {
      log.debug("Running periodic decision inference check");
      await this.checkAndPrompt(sinceDays);
    }, intervalMinutes * 60 * 1000);
  }
}
