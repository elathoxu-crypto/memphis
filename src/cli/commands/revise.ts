/**
 * CLI command: memphis revise
 * 
 * Revise an existing decision
 */

import { Command } from "commander";
import { reviseDecision } from "../../decision/lifecycle.js";
import { log } from "../../utils/logger.js";

export interface ReviseOptions {
  reasoning?: string;
  chosen?: string;
}

export async function reviseCommand(decisionId: string, opts: ReviseOptions): Promise<void> {
  const reasoning = opts.reasoning || "";
  const newChosen = opts.chosen;

  if (!decisionId) {
    console.error("\n  ✗ Missing decision ID\n");
    console.error("  Usage: memphis revise <decisionId> --reasoning \"why\" [--chosen \"new option\"]\n");
    process.exit(1);
  }

  try {
    await reviseDecision(decisionId, reasoning, newChosen);
  } catch (error) {
    console.error("\n  ✗ Failed to revise decision\n");
    console.error(`  Error: ${error}\n`);
    process.exit(1);
  }
}

export function registerReviseCommand(program: Command): void {
  program
    .command("revise")
    .description("Revise an existing decision")
    .argument("<decisionId>", "Decision ID to revise")
    .option("-r, --reasoning <text>", "Reasoning for the revision", "")
    .option("-c, --chosen <option>", "New chosen option", "")
    .action((id, opts) => reviseCommand(id, opts));
}
