import chalk from "chalk";
import { loadConfig } from "../../config/loader.js";
import { Store } from "../../memory/store.js";
import { EmbeddingService } from "../../embeddings/service.js";
import { LocalOllamaBackend } from "../../embeddings/backends/local.js";

interface EmbedCliOptions {
  chain?: string;
  since?: string;
  limit?: number | string;
  force?: boolean;
  dryRun?: boolean;
  report?: boolean;
}

export async function embedCommand(opts: EmbedCliOptions) {
  const config = loadConfig();
  const store = new Store(config.memory.path);
  const backend = new LocalOllamaBackend();
  const service = new EmbeddingService(store, backend);

  if (opts.report) {
    const report = service.getReport(opts.chain);
    if (report.length === 0) {
      console.log(chalk.gray("No embedding metadata available yet."));
      return;
    }
    for (const entry of report) {
      console.log(chalk.cyan(`${entry.chain}`));
      console.log(`  vectors: ${entry.totalVectors}`);
      console.log(`  last run: ${entry.lastRun || "never"}`);
      console.log(`  backend: ${entry.backend} (${entry.model})`);
      console.log();
    }
    return;
  }

  const limit =
    typeof opts.limit === "string"
      ? parseInt(opts.limit, 10)
      : typeof opts.limit === "number"
        ? opts.limit
        : undefined;
  const chains = resolveChains(opts.chain, config, store);

  if (chains.length === 0) {
    console.log(chalk.yellow("No chains selected for embedding."));
    return;
  }

  for (const chain of chains) {
    console.log(chalk.cyan(`\n==> Embedding chain: ${chain}`));
    try {
      const iterator = service.embedChain({
        chain,
        since: opts.since,
        limit,
        force: opts.force,
        dryRun: opts.dryRun,
      });

      for await (const event of iterator) {
        if (event.type === "skip" && event.blockIndex !== undefined) {
          console.log(chalk.gray(`  • skip block #${String(event.blockIndex).padStart(6, "0")}`));
        } else if (event.type === "process" && event.blockIndex !== undefined) {
          console.log(chalk.green(`  • embed block #${String(event.blockIndex).padStart(6, "0")}`));
        } else if (event.type === "end") {
          console.log(chalk.white(`  done: processed=${event.processed ?? 0}, skipped=${event.skipped ?? 0}, duration=${event.durationMs ?? 0}ms`));
        }
      }
    } catch (err) {
      console.log(chalk.red(`  ✗ ${chain}: ${err}`));
      process.exitCode = 1;
    }
  }
}

function resolveChains(value: string | undefined, config: any, store: Store): string[] {
  if (value) {
    return value
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }

  if (Array.isArray(config.semantic?.chains) && config.semantic.chains.length > 0) {
    return config.semantic.chains;
  }

  const preferred = ["journal", "thoughts", "ask", "decision"];
  const available = store.listChains().filter((chain) => !["vault", "credential"].includes(chain));
  const selected = preferred.filter((chain) => available.includes(chain));
  return selected.length > 0 ? selected : available;
}
