#!/usr/bin/env node
// Terminal hard reset (combines both cleanups into one)
function cleanupTerminalHard() {
  if (!process.stdin.isTTY) return;
  try { process.stdout.write("\x1b[?1049l\x1b[0m\x1b[?25h"); } catch {}
  try { process.stdin.setRawMode(false); } catch {}
  try { process.stdin.pause(); } catch {}
}

// Debug: dump active handles
function dumpActiveHandles(label = "final") {
  try {
    const handles = (process as any)._getActiveHandles?.() ?? [];
    const requests = (process as any)._getActiveRequests?.() ?? [];
    const hNames = handles.map((h: any) => h?.constructor?.name ?? "Unknown");
    const rNames = requests.map((r: any) => r?.constructor?.name ?? "Unknown");
    console.error("[DEBUG] Active handles (" + label + "):", hNames.slice(0,5));
    console.error("[DEBUG] Active requests (" + label + "):", rNames.slice(0,5));
    console.error("[DEBUG] stdin: isTTY=" + process.stdin.isTTY + " readable=" + (process.stdin as any).readable);
  } catch(e) { console.error("[DEBUG] Error:", e); }
}

// Register cleanup handlers
process.on("exit", cleanupTerminalHard);
process.on("SIGINT", () => { cleanupTerminalHard(); process.exit(130); });
process.on("SIGTERM", () => { cleanupTerminalHard(); process.exit(143); });

import { Command } from "commander";
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { journalCommand } from "./commands/journal.js";
import { askCommand } from "./commands/ask.js";
import { recallCommand } from "./commands/recall.js";
import { statusCommand } from "./commands/status.js";
import { initCommand } from "./commands/init.js";
import { vaultCommand } from "./commands/vault.js";
import { verifyCommand } from "./commands/verify.js";
import { repairCommand } from "./commands/repair.js";
import { reviseCommand } from "./commands/revise.js";
import { agentCommand } from "./commands/agent.js";
import { decideCommand } from "./commands/decide.js";
import { showCommand } from "./commands/show.js";
import { botCommand } from "./commands/bot.js";
import { runOpenClawCommands } from "../bridges/openclaw.js";
import { MemphisTUI } from "../tui/index.js";
import { shareSyncCommand } from "./share-sync.js";
import { embedCommand } from "./commands/embed.js";
import { shareReplicatorCommand } from "./commands/share-replicator.js";
import { soulStatusCommand } from "./commands/soul-status.js";
import { graphBuildCommand, graphShowCommand } from "./commands/graph.js";
import { reflectCommand } from "./commands/reflect.js";
import { planCommand } from "./commands/plan.js";
import { ingestCommand } from "./commands/ingest.js";
import { DaemonManager } from "../daemon/index.js";

const program = new Command();
const daemonManager = new DaemonManager();

program
  .name("memphis")
  .description("Local-first AI brain with persistent memory")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize Memphis in ~/.memphis")
  .action(initCommand);

program
  .command("journal <message>")
  .description("Add a journal entry to memory")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .option("-f, --force", "Force autosummary after this entry")
  .action((message, options) => {
    journalCommand(message, {
      tags: options.tags,
      force: options.force,
    });
  });

program
  .command("ask <question>")
  .description("Ask Memphis (uses recall context + LLM)")
  .option("-v, --use-vault", "Use API keys from vault (requires VAULT_PASSWORD env var)")
  .option("-p, --vault-password <password>", "Vault password (or use VAULT_PASSWORD env)")
  .option("-m, --model <model>", "Model to use (forces Ollama)")
  .option("--provider <provider>", "Provider: ollama, openai, openrouter, codex, openclaw")
  .option("-t, --top <n>", "Number of context hits (default: 8)", "8")
  .option("--since <date>", "Only recall blocks newer than date (YYYY-MM-DD)")
  .option("--include-vault", "Include vault blocks in recall search")
  .option("--semantic-only", "Use only semantic recall hits (requires embeddings)")
  .option("--semantic-weight <ratio>", "Blend weight (0-1) between semantic and keyword recall")
  .option("--no-semantic", "Disable semantic recall even if embeddings are enabled")
  .option("--no-save", "Don't save the answer to chain")
  .option("-j, --json", "Output JSON with answer + context")
  .option("--prefer-summaries", "Prefer summary context (for overview questions)")
  .option("--no-summaries", "Disable summary context")
  .option("--summaries <n>", "Max summaries to include (default: 2)", "2")
  .option("--explain-context", "Show why context was built this way")
  .action((question, options) => {
    askCommand(question, {
      useVault: options.useVault,
      vaultPassword: options.vaultPassword || process.env.VAULT_PASSWORD,
      model: options.model,
      provider: options.provider,
      top: parseInt(options.top) || 8,
      since: options.since,
      includeVault: options.includeVault,
      noSave: options.noSave,
      json: options.json,
      preferSummaries: options.preferSummaries,
      noSummaries: options.noSummaries,
      summariesMax: parseInt(options.summaries) || 2,
      semanticOnly: options.semanticOnly,
      semanticWeight: options.semanticWeight,
      noSemantic: options.noSemantic,
      explainContext: options.explainContext,
    });
  });

program
  .command("recall <scopeOrKeyword> [query]")
  .description("Recall memory (keyword search) or decisions")
  .option("-c, --chain <chain>", "Search specific chain")
  .option("-t, --type <type>", "Filter by type (journal/ask/decision/system)")
  .option("-l, --limit <n>", "Max results")
  .option("--tag <tag>", "Filter by tag")
  .option("--since <time>", "Time window, e.g. 14d, 2w, 2026-01-01")
  .option("--until <time>", "Until date")
  .option("--project", "Current project only (for decisions)")
  .option("--all", "All projects (for decisions)")
  .option("-j, --json", "Output JSON")
  .option("--include-vault", "Include vault in search")
  .action((scopeOrKeyword: string, query: string | undefined, options: any) => {
    recallCommand(scopeOrKeyword, query, options);
  });

program
  .command("status")
  .description("Show Memphis status")
  .option("-j, --json", "Output JSON")
  .option("-v, --verbose", "Show detailed info")
  .action((opts) => {
    statusCommand({ json: opts.json, verbose: opts.verbose });
  });

program
  .command("verify")
  .description("Verify chain integrity")
  .option("-c, --chain <chain>", "Verify specific chain only")
  .option("-j, --json", "Output JSON")
  .option("-v, --verbose", "Show detailed errors")
  .action((opts) => {
    verifyCommand({
      chain: opts.chain,
      json: opts.json,
      verbose: opts.verbose,
    });
  });

program
  .command("repair")
  .description("Repair chain integrity (safe mode - quarantine damaged blocks)")
  .option("-c, --chain <chain>", "Repair specific chain only")
  .option("-d, --dry-run", "Show what would be done without making changes")
  .option("-j, --json", "Output JSON")
  .action((opts) => {
    repairCommand({
      chain: opts.chain,
      dryRun: opts.dryRun,
      json: opts.json,
    });
  });

program
  .command("decide")
  .description("Record a decision (conscious or inferred)")
  .argument("<title>", "Decision title (what did you decide?)")
  .argument("<chosen>", "What did you choose?")
  .option("-o, --options <options>", "Options considered (pipe-separated, e.g. A|B|C)", "")
  .option("-r, --reasoning <reasoning>", "Why did you choose this?", "")
  .option("-s, --scope <scope>", "Impact scope: personal|project|life", "project")
  .option("-m, --mode <mode>", "Mode: conscious|inferred", "conscious")
  .option("-c, --confidence <n>", "Confidence 0-1", "1")
  .option("-l, --links <links>", "Related decision IDs (pipe-separated)", "")
  .option("-e, --evidence <evidence>", "Evidence refs for inferred (pipe-separated)", "")
  .action((title: string, chosen: string, opts: any) => {
    decideCommand(title, {
      options: opts.options,
      chosen,
      why: opts.reasoning,
      scope: opts.scope,
      mode: opts.mode,
      confidence: opts.confidence,
      links: opts.links,
      evidenceRefs: opts.evidence,
    });
  });

program
  .command("show")
  .description("Show a decision by ID")
  .argument("<kind>", "decision")
  .argument("<id>", "Decision ID or record ID")
  .action((kind, id) => {
    showCommand(kind, id);
  });

program
  .command("revise")
  .description("Revise a decision (creates new block)")
  .argument("<decisionId>", "Decision ID to revise")
  .option("-r, --reasoning <reasoning>", "New reasoning")
  .action((decisionId, opts) => {
    reviseCommand(decisionId, { reason: opts.reasoning || "" });
  });

program
  .command("vault")
  .description("Manage encrypted secrets (SSI Vault)")
  .argument("<action>", "init | add | list | get | delete")
  .argument("[key]", "Secret key name")
  .argument("[value]", "Secret value")
  .option("--password-env <var>", "Read vault password from environment variable (recommended for scripts)")
  .option("--password-stdin", "Read vault password from stdin (recommended for scripts)")
  .action(async (action, key, value, opts) => {
    await vaultCommand({
      action,
      key,
      value,
      passwordEnv: opts.passwordEnv,
      passwordStdin: opts.passwordStdin,
    });
  });

program
  .command("agent")
  .description("Manage agents (autosave, openclaw)")
  .argument("<action>", "start | stop | status | openclaw | collab")
  .argument("[subaction...]", "Optional subcommand and arguments")
  .option("-i, --interval <time>", "Interval for autosave (e.g., 5m)")
  .action(async (action, subactionArgs, opts) => {
    if (action === "openclaw" || action === "collab") {
      // subactionArgs is now an array of strings
      runOpenClawCommands(subactionArgs || []);
    } else {
      await agentCommand(action, { interval: opts.interval });
    }
  });

program
  .command("bot")
  .description("Run Telegram bot for Memphis")
  .argument("[action]", "start | webhook", "start")
  .action(botCommand);

program
  .command("tui")
  .description("Launch the terminal UI")
  .option("-s, --screen <screen>", "Open specific screen (dashboard, journal, vault, recall, ask, openclaw, settings)")
  .action((opts) => {
    const tui = new MemphisTUI();
    // If screen specified, navigate to it after a brief delay
    if (opts.screen) {
      setTimeout(() => {
        const screenMap: Record<string, number> = {
          dashboard: 1,
          journal: 2,
          vault: 3,
          recall: 4,
          ask: 5,
          openclaw: 6,
          settings: 7,
        };
        const screenNum = screenMap[opts.screen.toLowerCase()];
        if (screenNum) {
          // Access the navigateToMenu method via the instance
          (tui as any).navigateToMenu(screenNum);
        }
      }, 500);
    }
    tui.run();
  });

// Summarize command
import { autosummarize, shouldTriggerAutosummary } from "../core/autosummarizer.js";

program
  .command("embed")
  .description("Generate semantic embeddings for memory chains")
  .option("-c, --chain <chain>", "Specific chain or comma list (default: all)")
  .option("--since <time>", "Only blocks newer than date (YYYY-MM-DD)")
  .option("-l, --limit <n>", "Max blocks to embed this run", "50")
  .option("-f, --force", "Overwrite existing vectors")
  .option("--dry-run", "Log blocks without embedding")
  .option("--report", "Show coverage report and exit")
  .action(async (opts) => {
    await embedCommand({
      chain: opts.chain,
      since: opts.since,
      limit: opts.limit ? parseInt(opts.limit, 10) : undefined,
      force: opts.force,
      dryRun: opts.dryRun,
      report: opts.report,
    });
  });

program
  .command("share-sync")
  .description("Sync share-tagged memory blocks via Pinata/IPFS")
  .option("--push", "Export local share blocks and pin to IPFS")
  .option("--pull", "Fetch remote share blocks and import them")
  .option("--all", "Run push (unless disabled) followed by pull")
  .option("--cleanup", "Remove stale pins and cleanup network log")
  .option("--limit <n>", "Limit number of blocks per push", "10")
  .option("--since <time>", "Only include blocks newer than time (e.g. 24h, 2026-02-20)")
  .option("--dry-run", "Log actions without mutating state")
  .option("--push-disabled", "Skip push even if --push/--all is provided")
  .action(async (opts) => {
    await shareSyncCommand({
      push: opts.all ? true : opts.push,
      pull: opts.all ? true : opts.pull,
      cleanup: opts.cleanup,
      limit: opts.limit ? parseInt(opts.limit, 10) : undefined,
      since: opts.since,
      dryRun: opts.dryRun,
      pushDisabled: opts.pushDisabled,
    });
  });

const shareProgram = program
  .command("share")
  .description("Share utilities");

shareProgram
  .command("replicator")
  .description("Generate and manage share manifests")
  .option("--plan", "Show pending manifest actions")
  .option("--push", "Publish local manifest entries")
  .option("--pull", "Import remote manifest entries")
  .option("--file <path>", "Manifest JSONL file for --pull")
  .option("--limit <n>", "Limit number of manifests per action", "25")
  .option("--dry-run", "Log actions without mutating state")
  .action(async (opts) => {
    await shareReplicatorCommand({
      plan: opts.plan,
      push: opts.push,
      pull: opts.pull,
      file: opts.file,
      limit: opts.limit ? parseInt(opts.limit, 10) : undefined,
      dryRun: opts.dryRun,
    });
  });

program
  .command("plan")
  .description("Generate a coding task from Memphis memory → codex exec")
  .option("-f, --focus <file>", "Focus on specific file or module")
  .option("-g, --goal <text>", "Override goal description")
  .option("--since <date>", "Memory window (e.g. 7d, 2026-02-01)")
  .option("--output <format>", "Output format: prompt|shell|json (default: prompt)")
  .option("--exec", "Auto-launch codex with the generated prompt")
  .option("--yolo", "Use codex --yolo instead of --full-auto (faster, no sandbox)")
  .option("-j, --json", "Output raw JSON task")
  .action(async (opts) => {
    await planCommand({
      focus: opts.focus,
      goal: opts.goal,
      since: opts.since,
      output: opts.output,
      exec: opts.exec,
      yolo: opts.yolo,
      json: opts.json,
    });
  });

program
  .command("ingest <path>")
  .description("Ingest external files or directories into Memphis memory")
  .option("-c, --chain <chain>", "Target chain (default: journal)")
  .option("-t, --tags <tags>", "Extra tags (comma-separated)")
  .option("--max-tokens <n>", "Max tokens per chunk (default: 400)")
  .option("--overlap <n>", "Overlap chars between chunks (default: 100)")
  .option("--embed", "Also generate embeddings after ingestion")
  .option("-r, --recursive", "Recurse into subdirectories")
  .option("--dry-run", "Preview chunks without saving")
  .option("-f, --force", "Skip duplicate detection")
  .option("-v, --verbose", "Show block indices")
  .option("-j, --json", "Output JSON stats")
  .action(async (path, opts) => {
    await ingestCommand(path, {
      chain: opts.chain,
      tags: opts.tags,
      maxTokens: opts.maxTokens,
      overlap: opts.overlap,
      embed: opts.embed,
      recursive: opts.recursive,
      dryRun: opts.dryRun,
      force: opts.force,
      json: opts.json,
      verbose: opts.verbose,
    });
  });

program
  .command("reflect")
  .description("Generate a self-reflection report from memory")
  .option("--daily", "Light daily check-in (last 24h)")
  .option("--weekly", "Weekly reflection (last 7d, default)")
  .option("--deep", "Deep dive (last 30d)")
  .option("--since <date>", "Custom window start (YYYY-MM-DD or e.g. 14d)")
  .option("-c, --chain <chain>", "Focus on specific chain")
  .option("--save", "Save reflection summary to journal")
  .option("--dry-run", "Generate without saving")
  .option("-j, --json", "Output raw JSON report")
  .action(async (opts) => {
    await reflectCommand({
      daily: opts.daily,
      weekly: opts.weekly,
      deep: opts.deep,
      since: opts.since,
      chain: opts.chain,
      save: opts.save,
      dryRun: opts.dryRun,
      json: opts.json,
    });
  });

const graphProgram = program
  .command("graph")
  .description("Knowledge graph overlay");

graphProgram
  .command("build")
  .description("Build knowledge graph from memory chains")
  .option("-c, --chains <chains>", "Comma-separated chains to include")
  .option("-t, --threshold <n>", "Similarity threshold (default: 0.75)")
  .option("-l, --limit <n>", "Max nodes to process")
  .option("--dry-run", "Compute without saving")
  .option("-j, --json", "Output JSON")
  .action(async (opts) => {
    await graphBuildCommand({
      chains: opts.chains,
      threshold: opts.threshold,
      limit: opts.limit,
      dryRun: opts.dryRun,
      json: opts.json,
    });
  });

graphProgram
  .command("show [nodeId]")
  .description("Show graph nodes and edges")
  .option("-c, --chain <chain>", "Filter by chain")
  .option("--tag <tag>", "Filter by tag")
  .option("-d, --depth <n>", "Traversal depth (default: 1)")
  .option("--min-score <n>", "Min edge score")
  .option("--stats", "Show graph stats only")
  .option("-j, --json", "Output JSON")
  .action(async (nodeId, opts) => {
    await graphShowCommand(nodeId, {
      chain: opts.chain,
      tag: opts.tag,
      depth: opts.depth,
      minScore: opts.minScore,
      stats: opts.stats,
      json: opts.json,
    });
  });

const soulProgram = program
  .command("soul")
  .description("SOUL utilities");

soulProgram
  .command("status")
  .description("Show SOUL/autonomy status")
  .option("--pretty", "Pretty-print output")
  .option("--workspace <path>", "Workspace root override")
  .action((opts) => {
    soulStatusCommand({
      pretty: opts.pretty,
      workspace: opts.workspace,
    });
  });

program
  .command("summarize")
  .description("Create or check autosummary")
  .option("--dry-run", "Show what would be summarized without saving")
  .option("--force", "Force summary creation regardless of block count")
  .option("--llm", "Use LLM for narrative summary (requires Ollama)")
  .option("--blocks <n>", "Trigger after N new blocks (default: 50)")
  .action(async (opts) => {
    const config = loadConfig();
    const store = new Store(config.memory.path);
    const threshold = parseInt(opts.blocks) || 50;
    
    if (!opts.force && !shouldTriggerAutosummary(store, threshold)) {
      console.log(`Not enough new blocks (need ${threshold})`);
      console.log(`Use --force to create anyway`);
      return;
    }
    
    try {
      const result = await autosummarize(store, {
        useLLM: opts.llm,
        dryRun: opts.dryRun,
      });
      
      if (opts.dryRun) {
        console.log("=== DRY RUN - Summary that would be created ===");
        console.log(result.summary);
      } else if (result.block) {
        console.log(`✓ Summary created: summary#${String(result.block.index).padStart(6, "0")}`);
        console.log(`  Range: ${result.summary.range.from} → ${result.summary.range.to}`);
        console.log(`  Stats: ${result.summary.stats.journal} journal, ${result.summary.stats.ask} ask, ${result.summary.stats.decisions} decisions`);
      }
    } catch (err) {
      console.error("Summary failed:", err);
    }
  });

const daemonProgram = program
  .command("daemon")
  .description("Manage the Memphis background daemon");

daemonProgram
  .command("start")
  .description("Start daemon in background")
  .action(async () => {
    await daemonManager.start();
  });

daemonProgram
  .command("stop")
  .description("Stop daemon")
  .action(async () => {
    await daemonManager.stop();
  });

daemonProgram
  .command("status")
  .description("Show daemon status")
  .action(() => {
    daemonManager.status();
  });

daemonProgram
  .command("restart")
  .description("Restart daemon")
  .action(async () => {
    await daemonManager.restart();
  });

daemonProgram
  .command("logs")
  .description("Tail daemon logs")
  .option("-n, --lines <count>", "Lines to show", "50")
  .action((opts) => {
    const lines = Number.parseInt(opts.lines, 10) || 50;
    daemonManager.logs(lines);
  });

program.parse();

process.on("exit", () => dumpActiveHandles("exit"));
process.on("SIGINT", () => { dumpActiveHandles("SIGINT"); process.exit(130); });
process.on("SIGTERM", () => { dumpActiveHandles("SIGTERM"); process.exit(143); });
