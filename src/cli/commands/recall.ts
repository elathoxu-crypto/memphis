import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { recall, type RecallQuery, type RecallHit } from "../../core/recall.js";
import { recallDecisionsV1, formatDecisionOneLiner } from "../../decision/recall-v1.js";
import chalk from "chalk";

export async function recallCommand(
  scopeOrKeyword: string, 
  queryText: string | undefined, 
  options: { 
    chain?: string; 
    limit?: string; 
    tag?: string; 
    since?: string; 
    until?: string;
    type?: string;
    project?: boolean; 
    all?: boolean;
    json?: boolean;
    includeVault?: boolean;
  }
) {
  const config = loadConfig();
  const store = new Store(config.memory.path);
  const limit = options.limit ? parseInt(options.limit) : 20;

  // Handle "decisions" specially
  if (scopeOrKeyword === "decisions") {
    const results = recallDecisionsV1(store, {
      query: queryText,
      limit,
      since: options.since,
      projectOnly: !!options.project,
      allProjects: !!options.all,
    });

    if (results.length === 0) {
      console.log(chalk.yellow(`No decisions found${queryText ? ` for "${queryText}"` : ""}`));
      return;
    }

    for (const r of results) {
      console.log(formatDecisionOneLiner({
        decision: r.decision,
        timestamp: r.block.timestamp,
        projectLabel: r.projectLabel,
      }));
    }
    return;
  }

  // Build recall query
  const recallQuery: RecallQuery = {
    text: scopeOrKeyword || queryText,
    chain: options.chain,
    type: options.type,
    tag: options.tag,
    since: options.since,
    until: options.until,
    limit,
    includeVault: options.includeVault,
  };

  const result = await recall(store, recallQuery);

  // JSON output
  if (options.json) {
    console.log(JSON.stringify({
      query: result.query,
      hits: result.hits.map(h => ({
        chain: h.chain,
        index: h.index,
        timestamp: h.timestamp,
        type: h.type,
        tags: h.tags,
        score: h.score,
        snippet: h.snippet,
      })),
    }, null, 2));
    return;
  }

  // Human output
  if (result.hits.length === 0) {
    console.log(chalk.yellow(`Nothing found for "${recallQuery.text || "(all)"}"`));
    return;
  }

  console.log(chalk.bold(`\n🔍 ${result.hits.length} results:\n`));

  for (const hit of result.hits) {
    const time = new Date(hit.timestamp).toLocaleString("pl-PL", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    
    // Color by type
    const getTypeColor = (t: string) => {
      if (t === "ask") return chalk.cyan;
      if (t === "journal") return chalk.green;
      if (t === "decision") return chalk.magenta;
      if (t === "system") return chalk.yellow;
      return chalk.dim;
    };
    const typeColorFn = getTypeColor(hit.type);

    console.log(`${chalk.gray(time)} ${chalk.cyan(hit.chain)} ${typeColorFn(hit.type)} ${chalk.gray("[")}${hit.score}${chalk.gray("]")}`);
    console.log(`  ${hit.snippet}`);
    
    if (hit.tags.length > 0) {
      console.log(chalk.gray(`  tags: ${hit.tags.join(", ")}`));
    }
    console.log();
  }
}
