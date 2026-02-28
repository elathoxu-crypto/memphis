import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { ingest, type IngestStats } from "../../core/ingestion.js";
import chalk from "chalk";
import { extname } from "node:path";

function formatResult(result: IngestStats["results"][0], verbose: boolean) {
  const base = result.file.split("/").slice(-2).join("/");

  if (result.error) {
    console.log(`  ${chalk.red("✗")} ${base} — ${chalk.red(result.error)}`);
    return;
  }

  const parts: string[] = [];
  if (result.chunks > 0) parts.push(`${chalk.green(result.chunks)} ingested`);
  if (result.skipped > 0) parts.push(`${chalk.dim(result.skipped)} skipped`);
  if (result.embedded > 0) parts.push(`${chalk.blue(result.embedded)} embedded`);

  console.log(`  ${chalk.green("✓")} ${base} — ${parts.join(", ")} (${result.durationMs}ms)`);

  if (verbose && result.blockIndices.length > 0) {
    console.log(`    ${chalk.dim(`blocks: #${result.blockIndices.join(", #")}`)}`);
  }
}

export async function ingestCommand(
  path: string,
  options: {
    chain?: string;
    tags?: string;
    maxTokens?: string;
    overlap?: string;
    embed?: boolean;
    recursive?: boolean;
    dryRun?: boolean;
    force?: boolean;
    json?: boolean;
    verbose?: boolean;
  }
) {
  const config = loadConfig();
  const store = new Store(config.memory.path);

  const tags = options.tags ? options.tags.split(",").map(t => t.trim()) : [];
  const chunkOptions = {
    maxTokens: options.maxTokens ? parseInt(options.maxTokens) : undefined,
    overlap: options.overlap ? parseInt(options.overlap) : undefined,
  };

  if (!options.json) {
    const flags: string[] = [];
    if (options.chain) flags.push(`chain=${options.chain}`);
    if (options.embed) flags.push("embed");
    if (options.recursive) flags.push("recursive");
    if (options.dryRun) flags.push("dry-run");
    if (options.force) flags.push("force");
    console.log(chalk.cyan(`📥 Ingesting: ${path}`) + (flags.length ? chalk.dim(` [${flags.join(", ")}]`) : ""));
  }

  let stats: IngestStats;
  try {
    stats = await ingest(store, path, {
      chain: options.chain,
      tags,
      chunkOptions,
      embed: options.embed,
      recursive: options.recursive,
      dryRun: options.dryRun,
      skipDuplicates: !options.force,
    });
  } catch (err: any) {
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log();
  for (const result of stats.results) {
    formatResult(result, options.verbose ?? false);
  }

  console.log();
  console.log(chalk.bold("📊 Summary"));
  console.log(`  Files   : ${stats.files}`);
  console.log(`  Chunks  : ${chalk.green(stats.totalChunks)}`);
  if (stats.totalSkipped > 0) console.log(`  Skipped : ${chalk.dim(stats.totalSkipped)} (duplicates)`);
  if (stats.totalEmbedded > 0) console.log(`  Embedded: ${chalk.blue(stats.totalEmbedded)}`);
  console.log(`  Time    : ${stats.durationMs}ms`);

  if (options.dryRun) {
    console.log(chalk.yellow("\n  (dry-run — nothing saved)"));
  }
}
