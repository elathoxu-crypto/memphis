import chalk from "chalk";
import { log } from "../../utils/logger.js";
import { memphis } from "../../agents/logger.js";
import { checkAndSaveDecision } from "../../core/decision-detector.js";
import { autosummarize, shouldTriggerAutosummary } from "../../core/autosummarizer.js";
import { createWorkspaceStore } from "../utils/workspace-store.js";

export async function journalCommand(message: string, options: { tags?: string; force?: boolean; chain?: string }) {
  const { guard } = createWorkspaceStore();
  const tags = options.tags ? options.tags.split(",").map(t => t.trim()) : [];
  const force = options.force || false;
  const chain = options.chain?.trim() || "journal";

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
