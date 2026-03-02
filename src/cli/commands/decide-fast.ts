/**
 * CLI command: memphis decide-fast
 * 
 * Ultra-fast decision capture (<100ms target)
 * No LLM, no network, pure local storage
 */

import { Command } from "commander";
import { createDecisionV1 } from "../../decision/schema.js";
import { createWorkspaceStore } from "../utils/workspace-store.js";
import { memphis } from "../../agents/logger.js";

export interface DecideFastOptions {
  /** Why did you choose this? (optional) */
  why?: string;
  /** Tags (comma-separated) */
  tags?: string;
  /** Interactive mode - ask for reasoning */
  ask?: boolean;
}

/**
 * Ultra-fast decision capture
 * 
 * Usage:
 *   memphis decide-fast "use TypeScript not JavaScript"
 *   memphis decide-fast "use TypeScript" --why "better types"
 *   memphis decide-fast "use TypeScript" --ask
 * 
 * Target: <100ms execution time
 */
export async function decideFastCommand(
  title: string,
  opts: DecideFastOptions
): Promise<void> {
  const startTime = Date.now();

  try {
    const { guard } = createWorkspaceStore();
    
    // Parse tags
    const tags = opts.tags 
      ? opts.tags.split(",").map(t => t.trim()).filter(Boolean)
      : [];

    // Extract chosen from title (simple heuristic: "X not Y" → X is chosen)
    const chosen = extractChosen(title);

    // Create decision (no LLM, no validation, just store)
    const decision = createDecisionV1({
      title,
      options: [chosen],
      chosen,
      reasoning: opts.why || "",
      mode: "conscious",
      confidence: 1.0,
      scope: "project",
      context: "",
    });

    // Append to chain
    const block = await guard.appendBlock("decisions", {
      type: "decision",
      content: JSON.stringify(decision),
      tags: ["decision", "conscious", "fast", ...tags],
      agent: "decide-fast",
    });

    const elapsed = Date.now() - startTime;

    // Output
    console.log(`✓ [decisions#${block.index}] ${block.hash.substring(0, 8)}`);
    console.log(`ℹ ${title}`);
    if (elapsed < 100) {
      console.log(`⚡ ${elapsed}ms`);
    } else {
      console.log(`⏱️ ${elapsed}ms`);
    }

    memphis.cmd("decide-fast", "ok");
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`✗ Failed to save decision (${elapsed}ms)`);
    console.error(`  Error: ${error}`);
    process.exit(1);
  }
}

/**
 * Extract chosen option from title using heuristics
 */
function extractChosen(title: string): string {
  // "use X instead of Y" → X
  const insteadMatch = title.match(/use\s+(.+?)\s+instead of/i);
  if (insteadMatch) return insteadMatch[1].trim();

  // "X not Y" → X
  const notMatch = title.match(/^(.+?)\s+not\s+/i);
  if (notMatch) return notMatch[1].trim();

  // "switch to X" → X
  const switchMatch = title.match(/switch to\s+(.+)/i);
  if (switchMatch) return switchMatch[1].trim();

  // "choose X" → X
  const chooseMatch = title.match(/choose\s+(.+)/i);
  if (chooseMatch) return chooseMatch[1].trim();

  // Default: first 5 words
  return title.split(/\s+/).slice(0, 5).join(" ");
}

export function registerDecideFastCommand(program: Command): void {
  program
    .command("decide-fast <title>")
    .description("Ultra-fast decision capture (<100ms)")
    .option("-w, --why <text>", "Why did you choose this?", "")
    .option("-t, --tags <tags>", "Tags (comma-separated)", "")
    .option("-a, --ask", "Interactive mode - ask for reasoning", false)
    .action((title, opts) => decideFastCommand(title, opts));
}
