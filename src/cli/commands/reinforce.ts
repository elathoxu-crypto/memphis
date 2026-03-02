/**
 * CLI command: memphis reinforce
 * 
 * Reinforce an existing decision with new evidence
 */

import { Command } from "commander";
import { reinforceDecision } from "../../decision/lifecycle.js";

export interface ReinforceOptions {
  evidence?: string;
  reason?: string;
}

export async function reinforceCommand(decisionId: string, opts: ReinforceOptions): Promise<void> {
  const evidence = opts.evidence || "";
  const reason = opts.reason || "";

  if (!decisionId) {
    console.error("\n  ✗ Missing decision ID\n");
    console.error("  Usage: memphis reinforce <decisionId> --evidence \"proof\" --reason \"why\"\n");
    process.exit(1);
  }

  try {
    await reinforceDecision(decisionId, evidence, reason);
  } catch (error) {
    console.error("\n  ✗ Failed to reinforce decision\n");
    console.error(`  Error: ${error}\n`);
    process.exit(1);
  }
}

export function registerReinforceCommand(program: Command): void {
  program
    .command("reinforce")
    .description("Reinforce a decision with new evidence")
    .argument("<decisionId>", "Decision ID to reinforce")
    .option("-e, --evidence <text>", "Supporting evidence", "")
    .option("-r, --reason <text>", "Why does this reinforce?", "")
    .action((id, opts) => reinforceCommand(id, opts));
}
