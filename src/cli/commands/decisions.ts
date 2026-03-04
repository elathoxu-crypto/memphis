import { Command } from 'commander';
import chalk from 'chalk';
import { createWorkspaceStore } from "../utils/workspace-store.js";
import { safeParseDecisionV1 } from "../../decision/decision-v1.js";

interface DecisionsListOptions {
  limit?: string;
  tags?: string;
  json?: boolean;
}

export function registerDecisionsCommand(program: Command): void {
  const decisions = program.command("decisions").description("Decision management commands");

  decisions
    .command("list")
    .description("List all decisions")
    .option("-l, --limit <n>", "Maximum decisions to show", "10")
    .option("-t, --tags <tags>", "Filter by tags (comma-separated)")
    .option("-j, --json", "Output as JSON")
    .action(async (options: DecisionsListOptions) => {
      await handleDecisionsList(options);
    });
}

async function handleDecisionsList(options: DecisionsListOptions): Promise<void> {
  const store = await createWorkspaceStore();
  const limit = parseInt(options.limit || "10");
  
  console.log(chalk.bold.cyan("\n📋 Decisions List\n"));

  try {
    // Read from decisions chain (primary)
    const decisionsBlocks = store.guard.readChain("decisions");
    // Also check legacy decision chain
    let decisionBlocks: any[] = [];
    try {
      decisionBlocks = store.guard.readChain("decision");
    } catch {}

    const allBlocks = [...decisionsBlocks, ...decisionBlocks];
    const decisions: any[] = [];

    for (const block of allBlocks) {
      if (block?.data?.type !== "decision") continue;
      const parsed = safeParseDecisionV1(block.data.content);
      if (!parsed.ok) continue;

      // Tag filter
      if (options.tags) {
        const filterTags = options.tags.split(",").map(t => t.trim().toLowerCase());
        const blockTags = (block.data.tags || []).map((t: string) => t.toLowerCase());
        if (!filterTags.some(t => blockTags.includes(t))) continue;
      }

      decisions.push({
        index: block.index,
        chain: block.chain,
        decisionId: parsed.value.decisionId,
        title: parsed.value.title,
        chosen: parsed.value.chosen,
        status: parsed.value.status,
        createdAt: parsed.value.createdAt,
        tags: block.data.tags || []
      });
    }

    // Sort by date (newest first)
    decisions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply limit
    const limited = decisions.slice(0, limit);

    if (options.json) {
      console.log(JSON.stringify(limited, null, 2));
      return;
    }

    if (limited.length === 0) {
      console.log(chalk.gray("  No decisions found"));
      return;
    }

    console.log(chalk.white(`  Showing ${limited.length} of ${decisions.length} decisions:\n`));

    for (const dec of limited) {
      const date = new Date(dec.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const statusIcon = dec.status === "active" ? "✅" : 
                         dec.status === "superseded" ? "🔄" : 
                         dec.status === "contradicted" ? "❌" : "❓";

      console.log(chalk.white(`  ${statusIcon} [${dec.index}] ${dec.title}`));
      console.log(chalk.gray(`     Chosen: ${dec.chosen}`));
      console.log(chalk.gray(`     ID: ${dec.decisionId.substring(0, 16)}... • ${date}`));
      if (dec.tags.length > 0) {
        console.log(chalk.cyan(`     Tags: ${dec.tags.slice(0, 5).join(", ")}`));
      }
      console.log("");
    }

    console.log(chalk.gray(`─`.repeat(50)));
    console.log(chalk.gray(`  Use 'memphis show decision <id>' for details`));
    console.log(chalk.gray(`  Use 'memphis recall decision <query>' to search`));

  } catch (error: any) {
    console.error(chalk.red("\n✗ Failed to list decisions:"), error.message);
    process.exit(1);
  }
}
