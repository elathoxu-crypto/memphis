import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { reflect, type ReflectionMode, type ReflectionReport } from "../../core/reflection.js";
import chalk from "chalk";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function printReport(report: ReflectionReport) {
  const modeEmoji: Record<ReflectionMode, string> = {
    daily: "🌅",
    weekly: "🗓️",
    deep: "🔭",
  };

  console.log(
    chalk.cyan(`\n${modeEmoji[report.mode]} Memphis Reflection — ${report.mode.toUpperCase()}`)
  );
  console.log(chalk.dim(`  Period: ${formatDate(report.period.from)} → ${formatDate(report.period.to)}`));
  console.log(chalk.dim(`  Generated: ${new Date(report.generatedAt).toLocaleTimeString()}\n`));

  // Stats
  console.log(chalk.bold("📊 Stats"));
  console.log(`  Journal entries : ${chalk.yellow(report.stats.journalBlocks)}`);
  console.log(`  Questions asked : ${chalk.yellow(report.stats.askBlocks)}`);
  console.log(`  Decisions made  : ${chalk.yellow(report.stats.decisions)}`);
  if (report.stats.topTags.length) {
    console.log(`  Top tags        : ${report.stats.topTags.slice(0, 6).join(", ")}`);
  }

  // Graph summary
  if (report.graphSummary) {
    console.log(chalk.bold("\n🕸️  Knowledge Graph"));
    console.log(`  Nodes: ${report.graphSummary.nodes}, Edges: ${report.graphSummary.edges}`);
    if (report.graphSummary.clusters.length) {
      console.log(`  Clusters (${report.graphSummary.clusters.length}):`);
      for (const cluster of report.graphSummary.clusters.slice(0, 3)) {
        console.log(`    • [${cluster.slice(0, 4).join(", ")}${cluster.length > 4 ? ` +${cluster.length - 4}` : ""}]`);
      }
    }
  }

  // Insights
  if (report.insights.length) {
    console.log(chalk.bold("\n💡 Insights"));
    for (const insight of report.insights) {
      const typeIcon: Record<string, string> = {
        pattern: "🔁",
        decision: "⚖️",
        theme: "🎯",
        contradiction: "⚠️",
        growth: "🌱",
      };
      const icon = typeIcon[insight.type] ?? "•";
      console.log(`  ${icon} ${chalk.bold(insight.title)}`);
      console.log(`     ${chalk.dim(insight.detail)}`);
      if (insight.evidence.length) {
        for (const e of insight.evidence.slice(0, 2)) {
          console.log(`     ${chalk.dim("↳")} "${e.slice(0, 80)}"`);
        }
      }
    }
  } else {
    console.log(chalk.dim("\n  No significant insights — try a longer window or add more journal entries."));
  }

  // Synthesis
  if (report.synthesis) {
    console.log(chalk.bold("\n🧠 Synthesis"));
    console.log(`  ${report.synthesis}`);
  }

  console.log(chalk.dim(`\n  [${report.durationMs}ms]`));
}

export async function reflectCommand(options: {
  daily?: boolean;
  weekly?: boolean;
  deep?: boolean;
  since?: string;
  chain?: string;
  save?: boolean;
  dryRun?: boolean;
  json?: boolean;
}) {
  const config = loadConfig();
  const store = new Store(config.memory.path);

  let mode: ReflectionMode = "weekly";
  if (options.daily) mode = "daily";
  if (options.deep) mode = "deep";

  if (!options.json) {
    console.log(chalk.dim("Reflecting..."));
  }

  const report = await reflect(store, {
    mode,
    since: options.since,
    chain: options.chain,
    save: options.save,
    dryRun: options.dryRun,
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printReport(report);

  if (options.save && !options.dryRun) {
    console.log(chalk.green("\n✅ Reflection saved to journal chain."));
  }
}
