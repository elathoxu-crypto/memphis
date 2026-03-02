/**
 * CLI command: memphis contradict
 * 
 * Contradict an existing decision
 */

import { Command } from "commander";
import { contradictDecision } from "../../decision/lifecycle.js";

export interface ContradictOptions {
  evidence?: string;
  reasoning?: string;
}

export async function contradictCommand(decisionId: string, opts: ContradictOptions): Promise<void> {
  const evidence = opts.evidence || "";
  const reasoning = opts.reasoning || "";

  if (!decisionId) {
    console.error("\n  ✗ Missing decision ID\n");
    console.error("  Usage: memphis contradict <decisionId> --evidence \"proof\" --reasoning \"why\"\n");
    process.exit(1);
  }

  try {
    await contradictDecision(decisionId, evidence, reasoning);
  } catch (error) {
    console.error("\n  ✗ Failed to contradict decision\n");
    console.error(`  Error: ${error}\n`);
    process.exit(1);
  }
}

export function registerContradictCommand(program: Command): void {
  program
    .command("contradict")
    .description("Mark a decision as contradicted")
    .argument("<decisionId>", "Decision ID to contradict")
    .option("-e, --evidence <text>", "Evidence of contradiction", "")
    .option("-r, --reasoning <text>", "Why does this contradict?", "")
    .action((id, opts) => contradictCommand(id, opts));
}
