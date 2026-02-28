import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { GraphStore, GraphBuilder } from "../../core/graph.js";
import chalk from "chalk";

export async function graphBuildCommand(options: {
  chains?: string;
  threshold?: string;
  limit?: string;
  dryRun?: boolean;
  json?: boolean;
}) {
  const config = loadConfig();
  const store = new Store(config.memory.path);
  const graphStore = new GraphStore();
  const builder = new GraphBuilder(store, graphStore);

  const chains = options.chains ? options.chains.split(",").map(s => s.trim()) : undefined;
  const threshold = options.threshold ? parseFloat(options.threshold) : undefined;
  const limit = options.limit ? parseInt(options.limit) : undefined;

  if (!options.json) {
    console.log(chalk.cyan("🕸️  Building knowledge graph..."));
    if (chains) console.log(chalk.dim(`  chains: ${chains.join(", ")}`));
    if (threshold) console.log(chalk.dim(`  threshold: ${threshold}`));
    if (options.dryRun) console.log(chalk.yellow("  (dry-run mode)"));
  }

  const stats = await builder.build({ chains, threshold, limit, dryRun: options.dryRun });

  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log(chalk.green("\n✅ Graph built!"));
  console.log(`  Nodes : ${chalk.bold(stats.nodes)}`);
  console.log(`  Edges : ${chalk.bold(stats.edges)}`);
  console.log(`  Chains: ${stats.chains.join(", ")}`);
  console.log(`  Time  : ${stats.durationMs}ms`);
  console.log(chalk.dim(`  Built : ${stats.builtAt}`));
}

export async function graphShowCommand(
  nodeId: string | undefined,
  options: {
    chain?: string;
    tag?: string;
    depth?: string;
    minScore?: string;
    json?: boolean;
    stats?: boolean;
  }
) {
  const graphStore = new GraphStore();

  // Show stats only
  if (options.stats) {
    const meta = graphStore.loadMeta();
    if (!meta) {
      console.log(chalk.yellow("No graph built yet. Run: memphis graph build"));
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(meta, null, 2));
      return;
    }
    console.log(chalk.cyan("🕸️  Graph stats:"));
    console.log(`  Nodes : ${chalk.bold(meta.nodes)}`);
    console.log(`  Edges : ${chalk.bold(meta.edges)}`);
    console.log(`  Chains: ${meta.chains.join(", ")}`);
    console.log(`  Built : ${meta.builtAt}`);
    console.log(`  Time  : ${meta.durationMs}ms`);
    return;
  }

  const depth = options.depth ? parseInt(options.depth) : 1;
  const minScore = options.minScore ? parseFloat(options.minScore) : 0;

  const result = graphStore.query({
    nodeId,
    chain: options.chain,
    tag: options.tag,
    depth,
    minScore,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.nodes.length === 0) {
    console.log(chalk.yellow("No nodes found."));
    return;
  }

  console.log(chalk.cyan(`🕸️  Graph: ${result.nodes.length} nodes, ${result.edges.length} edges\n`));

  // Show nodes
  for (const node of result.nodes.slice(0, 30)) {
    const ts = new Date(node.timestamp).toLocaleDateString();
    const tags = node.tags.length ? chalk.dim(` [${node.tags.join(", ")}]`) : "";
    console.log(
      `  ${chalk.bold(node.id)} ${chalk.dim(ts)} ${chalk.yellow(node.type)}${tags}`
    );
    console.log(`    ${chalk.dim(node.snippet)}`);
  }

  if (result.nodes.length > 30) {
    console.log(chalk.dim(`  ... and ${result.nodes.length - 30} more nodes`));
  }

  // Show edges grouped by type
  const semantic = result.edges.filter(e => e.type === "semantic");
  const tag = result.edges.filter(e => e.type === "tag");
  const ref = result.edges.filter(e => e.type === "ref");

  console.log(chalk.cyan("\n📎 Edges:"));
  if (semantic.length) {
    console.log(`  ${chalk.blue("semantic")} (${semantic.length}):`);
    for (const e of semantic.slice(0, 10)) {
      console.log(`    ${e.from} ←→ ${e.to} ${chalk.green(e.score.toFixed(3))}`);
    }
    if (semantic.length > 10) console.log(chalk.dim(`    ... and ${semantic.length - 10} more`));
  }
  if (tag.length) {
    console.log(`  ${chalk.magenta("tag")} (${tag.length}) — shared tags`);
  }
  if (ref.length) {
    console.log(`  ${chalk.yellow("ref")} (${ref.length}) — context references`);
  }
}
