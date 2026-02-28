import { watch as fsWatch, existsSync, mkdirSync } from "node:fs";
import { stat as statAsync } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { ingest, type IngestStats } from "../../core/ingestion.js";
import { GraphStore, GraphBuilder } from "../../core/graph.js";
import { MEMPHIS_HOME } from "../../config/defaults.js";

const WATCH_STATE_FILE = path.join(MEMPHIS_HOME, "watch-state.json");
const DEBOUNCE_MS = 2000;

interface WatchOptions {
  chain?: string;
  noEmbed?: boolean;
  quiet?: boolean;
}

interface WatchStateEntry {
  target: string;
  chain: string;
  embed: boolean;
  quiet: boolean;
  updatedAt: string;
  files: Record<string, {
    timestamp: string;
    chunks: number;
    embedded: number;
  }>;
}

type WatchState = Record<string, WatchStateEntry>;

function ensureStateDir() {
  mkdirSync(path.dirname(WATCH_STATE_FILE), { recursive: true, mode: 0o700 });
}

async function loadWatchState(): Promise<WatchState> {
  try {
    const data = await readFile(WATCH_STATE_FILE, "utf-8");
    return JSON.parse(data) as WatchState;
  } catch (err: any) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

async function saveWatchState(state: WatchState) {
  ensureStateDir();
  await writeFile(WATCH_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

async function updateWatchState(
  key: string,
  updates: Partial<WatchStateEntry> & { files?: WatchStateEntry["files"] }
) {
  const state = await loadWatchState();
  const current: WatchStateEntry = state[key] ?? {
    target: updates.target ?? key,
    chain: updates.chain ?? "journal",
    embed: updates.embed ?? true,
    quiet: updates.quiet ?? false,
    updatedAt: new Date().toISOString(),
    files: {},
  };

  const mergedFiles = { ...current.files };
  if (updates.files) {
    for (const [file, info] of Object.entries(updates.files)) {
      mergedFiles[file] = info;
    }
  }

  state[key] = {
    ...current,
    ...updates,
    target: updates.target ?? current.target,
    chain: updates.chain ?? current.chain,
    embed: updates.embed ?? current.embed,
    quiet: updates.quiet ?? current.quiet,
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
    files: mergedFiles,
  };

  await saveWatchState(state);
}

function relPath(file: string): string {
  const rel = path.relative(process.cwd(), file);
  return rel.startsWith("..") ? file : rel;
}

async function rebuildGraph(store: Store, graphStore: GraphStore, quiet: boolean) {
  try {
    const builder = new GraphBuilder(store, graphStore);
    if (!quiet) {
      console.log(chalk.dim("[watch] updating knowledge graph..."));
    }
    await builder.build();
    if (!quiet) {
      console.log(chalk.dim("[watch] graph updated"));
    }
  } catch (err) {
    console.error(chalk.red(`[watch] graph rebuild failed: ${err}`));
  }
}

async function ingestChangedFile(
  store: Store,
  file: string,
  chain: string,
  embed: boolean,
  quiet: boolean,
  stateKey: string
): Promise<IngestStats | null> {
  try {
    const stats = await ingest(store, file, {
      chain,
      embed,
      recursive: false,
      dryRun: false,
      skipDuplicates: false,
    });

    const result = stats.results[0];
    if (!result) return stats;

    if (!quiet) {
      if (result.chunks > 0) {
        console.log(chalk.green(`[watch] ingested: ${relPath(file)} (${result.chunks} chunks)`));
      } else if (result.skipped > 0) {
        console.log(chalk.gray(`[watch] skipped (duplicate): ${relPath(file)}`));
      } else if (result.error) {
        console.log(chalk.red(`[watch] error: ${relPath(file)} — ${result.error}`));
      }
    }

    await updateWatchState(stateKey, {
      files: {
        [file]: {
          timestamp: new Date().toISOString(),
          chunks: result.chunks,
          embedded: result.embedded,
        },
      },
    });

    return stats;
  } catch (err) {
    console.error(chalk.red(`[watch] failed ingest for ${file}: ${err}`));
    return null;
  }
}

export async function watchCommand(target: string | undefined, options: WatchOptions = {}) {
  const resolvedTarget = path.resolve(target ?? process.cwd());
  let stats;
  try {
    stats = await statAsync(resolvedTarget);
  } catch (err) {
    console.error(chalk.red(`[watch] path not found: ${resolvedTarget}`));
    process.exit(1);
  }

  const watchRoot = stats.isDirectory() ? resolvedTarget : path.dirname(resolvedTarget);
  const singleFile = stats.isFile() ? resolvedTarget : null;
  const stateKey = singleFile ?? watchRoot;
  const chain = options.chain ?? "journal";
  const embed = options.noEmbed ? false : true;
  const quiet = Boolean(options.quiet);

  const config = loadConfig();
  const store = new Store(config.memory.path);
  const graphStore = new GraphStore();

  if (!quiet) {
    const scope = singleFile ? `${watchRoot} (file: ${path.basename(singleFile)})` : watchRoot;
    console.log(chalk.cyan(`[watch] watching ${scope}`));
    console.log(chalk.dim(`[watch] chain=${chain} embed=${embed}`));
  }

  await updateWatchState(stateKey, {
    target: resolvedTarget,
    chain,
    embed,
    quiet,
    updatedAt: new Date().toISOString(),
  });

  const pending = new Set<string>();
  let debounce: NodeJS.Timeout | null = null;

  const schedule = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const files = Array.from(pending);
      pending.clear();
      if (files.length === 0) return;
      for (const file of files) {
        const exists = existsSync(file);
        if (!exists) continue;
        await ingestChangedFile(store, file, chain, embed, quiet, stateKey);
      }
      await rebuildGraph(store, graphStore, quiet);
    }, DEBOUNCE_MS);
  };

  const handleEvent = (fileName?: string | Buffer) => {
    if (!fileName) return;
    const rel = fileName.toString();
    const candidate = path.resolve(watchRoot, rel);
    if (singleFile && candidate !== singleFile) return;
    pending.add(candidate);
    schedule();
  };

  let watcher;
  try {
    watcher = fsWatch(watchRoot, { recursive: stats.isDirectory() });
  } catch {
    watcher = fsWatch(watchRoot);
  }

  watcher.on("change", (_, fileName) => handleEvent(fileName));
  watcher.on("rename", (_, fileName) => handleEvent(fileName));

  const shutdown = async () => {
    watcher.close();
    if (debounce) clearTimeout(debounce);
    if (!quiet) {
      console.log(chalk.gray("[watch] stopped"));
    }
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
