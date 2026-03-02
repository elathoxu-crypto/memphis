/**
 * CLI command: memphis decisions-inferred
 * 
 * Interactive dashboard for inferred decisions
 */

import { Command } from "commander";
import { InferredDecisionsScreen } from "../../tui/screens/inferred-decisions.js";

export interface DecisionsInferredOptions {
  since?: string;
}

export async function decisionsInferredCommand(opts: DecisionsInferredOptions): Promise<void> {
  const since = parseInt(opts.since || "7", 10);
  
  const screen = new InferredDecisionsScreen();
  await screen.show(since);
}

export function registerDecisionsInferredCommand(program: Command): void {
  program
    .command("decisions-inferred")
    .description("Interactive dashboard for inferred decisions")
    .option("--since <days>", "Analyze commits from last N days", "7")
    .action((opts) => decisionsInferredCommand(opts));
}
