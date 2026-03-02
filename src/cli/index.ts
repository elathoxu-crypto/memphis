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
import chalk from "chalk";
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
import { registerTradeCommand } from "./commands/trade.js";
import { soulStatusCommand } from "./commands/soul-status.js";
import { intelligenceCommand } from "./commands/intelligence.js";
import { inferCommand } from "./commands/infer.js";
import { contradictCommand } from "./commands/contradict.js";
import { reinforceCommand } from "./commands/reinforce.js";
import { decideFastCommand } from "./commands/decide-fast.js";
import { decisionsInferredCommand } from "./commands/decisions-inferred.js";
import { graphBuildCommand, graphShowCommand } from "./commands/graph.js";
import { createWorkspaceStore } from "./utils/workspace-store.js";
import { writeWorkspaceSelection, getWorkspaceSelectionFilePath } from "../security/workspace.js";
import { reflectCommand } from "./commands/reflect.js";
import { planCommand } from "./commands/plan.js";
import { ingestCommand } from "./commands/ingest.js";
import { watchCommand } from "./commands/watch.js";
import { DaemonManager } from "../daemon/index.js";
import { mcpStartCommand, mcpInspectCommand } from "./commands/mcp.js";
import { doctorCommand } from "./commands/doctor.js";

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
  .command("doctor")
  .description("Health check — diagnose common issues")
  .option("-j, --json", "Output JSON format")
  .action((options) => {
    doctorCommand(options);
  });

program
  .command("journal <message>")
  .description("Add a journal entry to memory")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .option("-f, --force", "Force autosummary after this entry")
  .option("--chain <chain>", "Target chain (default: journal)")
  .option("--suggest-tags", "Auto-suggest tags using AI categorization (Phase 6)")
  .action((message, options) => {
    journalCommand(message, {
      tags: options.tags,
      force: options.force,
      chain: options.chain,
      suggestTags: options.suggestTags,
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
  .option("--graph", "Force knowledge graph context when available")
  .option("--no-graph", "Disable knowledge graph context")
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
      graph: options.graph,
    });
  });

program
  .command("watch [path]")
  .description("Watch a path for changes and auto-ingest updates")
  .option("--no-embed", "Skip embedding after ingest")
  .option("--chain <chain>", "Target chain (default: journal)")
  .option("-q, --quiet", "Suppress output")
  .action(async (pathArg: string | undefined, opts) => {
    await watchCommand(pathArg, {
      chain: opts.chain,
      noEmbed: opts.noEmbed,
      quiet: opts.quiet,
    });
  });

const mcpProgram = program
  .command("mcp")
  .description("Model Context Protocol (MCP) utilities for Memphis");

mcpProgram
  .command("start")
  .description("Start the Memphis MCP server over stdio transport")
  .action(async () => {
    await mcpStartCommand();
  });

mcpProgram
  .command("inspect")
  .description("Show the MCP tools exposed by Memphis")
  .option("-j, --json", "Output JSON")
  .action(opts => {
    mcpInspectCommand({ json: opts.json });
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

const workspaceProgram = program
  .command("workspace")
  .description("Manage workspaces");

workspaceProgram
  .command("list")
  .description("List configured workspaces")
  .action(() => {
    const { config, workspace } = createWorkspaceStore();
    console.log();
    console.log(chalk.bold("  Workspaces:"));
    console.log(chalk.dim("    * marks the active workspace"));

    for (const def of config.security.workspaces) {
      const marker = def.id === workspace.id ? chalk.green("  *") : "   ";
      const label = def.label ?? "";
      const allowed = def.policy.allowedChains.includes("*")
        ? "all"
        : def.policy.allowedChains.join(", ") || "(defaults)";
      const includeDefault = def.policy.includeDefault ? "yes" : "no";
      console.log(`${marker} ${chalk.cyan(def.id)} ${chalk.gray(label)} — allowed: ${allowed} — includeDefault: ${includeDefault}`);
    }
    console.log();
  });

workspaceProgram
  .command("set <id>")
  .description("Set the active workspace")
  .action((id: string) => {
    const { config } = createWorkspaceStore();
    if (!config.security.workspaceMap[id]) {
      console.log(chalk.red(`Workspace '${id}' is not defined in config.`));
      process.exit(1);
    }
    writeWorkspaceSelection(id);
    console.log(chalk.green(`Workspace set to '${id}'.`));
    console.log(chalk.gray(`Persisted at ${getWorkspaceSelectionFilePath()}`));
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
  .option("-t, --tags <tags>", "Tags (comma-separated)", "")
  .action((title: string, chosen: string, opts: any) => {
    decideCommand(title, {
      options: opts.options,
      chosen,
      why: opts.reasoning,
      scope: opts.scope,
      mode: opts.mode,
      confidence: opts.confidence,
      tags: opts.tags,
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

// Model C: Predict command
program
  .command("predict")
  .description("🔮 Show predicted decisions based on learned patterns (Model C)")
  .option("--learn", "Learn patterns from decision history first")
  .option("--since <days>", "Days to analyze for learning", "30")
  .option("--min-confidence <n>", "Minimum confidence threshold (0-1)", "0.6")
  .option("--max <n>", "Maximum predictions to show", "5")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const { createWorkspaceStore } = await import("./utils/workspace-store.js");
    const { PatternLearner } = await import("../decision/pattern-learner.js");
    const { ContextAnalyzer } = await import("../decision/context-analyzer.js");
    const { PredictionEngine } = await import("../decision/prediction-engine.js");

    const { guard } = createWorkspaceStore();

    const learner = new PatternLearner(guard, {
      minOccurrences: 3,
      confidenceCap: 0.95,
      contextSimilarityThreshold: 0.7,
    });

    const analyzer = new ContextAnalyzer({
      recentFilesMinutes: 60,
      recentCommitsHours: 24,
      maxActiveFiles: 20,
    });

    const engine = new PredictionEngine(learner, analyzer, {
      minConfidence: parseFloat(opts.minConfidence),
      maxPredictions: parseInt(opts.max),
    });

    // Learn patterns if requested
    if (opts.learn) {
      console.log(`📚 Learning patterns from last ${opts.since} days...\n`);
      
      const newPatterns = await learner.learnFromHistory(parseInt(opts.since));
      const stats = learner.getStats();
      
      console.log(`✅ Learned ${newPatterns.length} new patterns`);
      console.log(`   Total patterns: ${stats.totalPatterns}`);
      console.log(`   Avg occurrences: ${stats.avgOccurrences.toFixed(1)}`);
      console.log('');
    }

    // Check if patterns exist
    const patterns = learner.getPatterns();
    if (patterns.length === 0) {
      console.log('⚠️  No patterns learned yet.');
      console.log('');
      console.log('💡 Run with --learn to learn from your decision history:');
      console.log('   memphis predict --learn');
      console.log('');
      console.log('   Or make more decisions first:');
      console.log('   memphis decide "Title" "Choice" -r "Reason"');
      return;
    }

    // Generate predictions
    console.log('🔮 Analyzing current context...\n');
    
    const result = await engine.predict();

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(engine.formatPredictions(result));
    }
  });

// Model C: Patterns command
program
  .command("patterns [action]")
  .description("📊 Inspect learned patterns (Model C)")
  .option("--json", "Output as JSON")
  .action(async (action, opts) => {
    const { createWorkspaceStore } = await import("./utils/workspace-store.js");
    const { PatternLearner } = await import("../decision/pattern-learner.js");
    const { readFileSync, existsSync, unlinkSync } = await import("fs");
    const { join } = await import("path");

    const actionType = action || 'list';
    const { guard } = createWorkspaceStore();
    const learner = new PatternLearner(guard);

    if (actionType === 'list') {
      const patterns = learner.getPatterns();
      
      if (opts.json) {
        console.log(JSON.stringify(patterns, null, 2));
        return;
      }

      if (patterns.length === 0) {
        console.log('⚠️  No patterns learned yet.');
        console.log('');
        console.log('💡 Run: memphis predict --learn');
        return;
      }

      console.log(`📊 LEARNED PATTERNS (${patterns.length})\n`);

      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        
        console.log(`${i + 1}. ${pattern.prediction.title}`);
        console.log(`   Type: ${pattern.prediction.type}`);
        console.log(`   Occurrences: ${pattern.occurrences}`);
        console.log(`   Confidence: ${(pattern.prediction.confidence * 100).toFixed(0)}%`);
        
        if (pattern.accuracy !== undefined) {
          console.log(`   Accuracy: ${(pattern.accuracy * 100).toFixed(0)}%`);
        }
        
        console.log(`   Created: ${new Date(pattern.created).toLocaleDateString()}`);
        console.log(`   Last seen: ${new Date(pattern.lastSeen).toLocaleDateString()}`);
        console.log('');
      }
    } else if (actionType === 'stats') {
      const stats = learner.getStats();

      if (opts.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      console.log('📊 PATTERN STATISTICS\n');
      console.log(`Total patterns: ${stats.totalPatterns}`);
      console.log(`Average occurrences: ${stats.avgOccurrences.toFixed(1)}`);
      
      if (stats.avgAccuracy !== null) {
        console.log(`Average accuracy: ${(stats.avgAccuracy * 100).toFixed(0)}%`);
      } else {
        console.log(`Average accuracy: N/A (no predictions yet)`);
      }
      
      if (stats.oldestPattern) {
        console.log(`Oldest pattern: ${new Date(stats.oldestPattern).toLocaleDateString()}`);
      }
      
      if (stats.newestPattern) {
        console.log(`Newest pattern: ${new Date(stats.newestPattern).toLocaleDateString()}`);
      }
    } else if (actionType === 'clear') {
      const patterns = learner.getPatterns();
      
      if (patterns.length === 0) {
        console.log('⚠️  No patterns to clear.');
        return;
      }

      console.log(`⚠️  This will delete ${patterns.length} learned patterns.`);
      console.log('Type "yes" to confirm:');
      
      // Auto-confirm for now (in production, would read from stdin)
      console.log('');
      console.log('Cancelled (use manual file deletion)');
      console.log(`File location: ~/.memphis/patterns.json`);
    }
  });

// Model C: Accuracy command
program
  .command("accuracy [action]")
  .description("📊 Track prediction accuracy (Model C)")
  .option("--json", "Output as JSON")
  .action(async (action, opts) => {
    const { AccuracyTracker } = await import("../decision/accuracy-tracker.js");

    const tracker = new AccuracyTracker();
    const actionType = action || 'stats';

    if (actionType === 'stats') {
      const stats = tracker.calculateStats();
      
      if (opts.json) {
        const output = {
          ...stats,
          byPattern: Object.fromEntries(stats.byPattern),
          byConfidenceRange: Object.fromEntries(stats.byConfidenceRange),
        };
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      console.log('📊 PREDICTION ACCURACY\n');
      
      if (stats.totalPredictions === 0) {
        console.log('No predictions tracked yet.');
        console.log('');
        console.log('💡 Start using predictions to build accuracy data:');
        console.log('   memphis predict --learn');
        console.log('   memphis predict');
        return;
      }

      console.log(`Total predictions: ${stats.totalPredictions}`);
      console.log(`Correct: ${stats.correctPredictions}`);
      console.log(`Accuracy: ${(stats.accuracy * 100).toFixed(1)}%`);
      console.log(`Trend: ${stats.recentTrend}`);
      console.log('');

      // By confidence range
      console.log('By Confidence Range:');
      for (const [range, rangeStats] of stats.byConfidenceRange) {
        if (rangeStats.total > 0) {
          console.log(`  ${range}: ${(rangeStats.accuracy * 100).toFixed(0)}% (${rangeStats.total} predictions)`);
        }
      }
      console.log('');

      // Calibration
      const calibration = tracker.getCalibration();
      console.log('Calibration (predicted vs actual):');
      for (const cal of calibration) {
        if (cal.samples > 0) {
          const diff = cal.actualAccuracy - cal.predictedConfidence;
          const emoji = Math.abs(diff) < 0.05 ? '✓' : diff > 0 ? '↑' : '↓';
          console.log(`  ${emoji} ${cal.confidenceRange}: predicted ${(cal.predictedConfidence * 100).toFixed(0)}%, actual ${(cal.actualAccuracy * 100).toFixed(0)}% (${cal.samples} samples)`);
        }
      }

    } else if (actionType === 'clear') {
      console.log('⚠️  This will clear all accuracy tracking data.');
      tracker.clear();
      console.log('✅ Accuracy data cleared');

    } else if (actionType === 'export') {
      console.log(tracker.export());
    }
  });

program
  .command("vault")
  .description("Manage encrypted secrets (SSI Vault)")
  .argument("<action>", "init | add | list | get | delete | export | backup | recover")
  .argument("[key]", "Secret key name")
  .argument("[value]", "Secret value")
  .option("--password-env <var>", "Read vault password from environment variable (recommended for scripts)")
  .option("--password-stdin", "Read vault password from stdin (recommended for scripts)")
  .option("--seed <phrase>", "Recovery seed phrase (for recover action)")
  .action(async (action, key, value, opts) => {
    await vaultCommand({
      action,
      key,
      value,
      passwordEnv: opts.passwordEnv,
      passwordStdin: opts.passwordStdin,
      seed: opts.seed,
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
  .option("-s, --screen <screen>", "Open specific screen (dashboard, journal, vault, recall, ask, decisions, summary, network)")
  .action((opts) => {
    const tui = new MemphisTUI();
    // If screen specified, navigate to it after a brief delay
    if (opts.screen) {
      setTimeout(() => {
        const screenMap: Record<string, string> = {
          dashboard: "dashboard",
          journal: "journal",
          vault: "vault",
          recall: "recall",
          ask: "ask",
          decisions: "decisions",
          summary: "summary",
          network: "network",
        };
        const screenName = screenMap[opts.screen.toLowerCase()];
        if (screenName) {
          tui.navigateTo(screenName as any);
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

registerTradeCommand(program);

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
        force: opts.force,
        triggerBlocks: threshold,
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

const offlineProgram = program
  .command("offline")
  .description("Manage offline mode settings");

offlineProgram
  .command("status")
  .description("Show current offline mode, network status, and active model")
  .action(async () => {
    const { offlineStatusCommand } = await import("./commands/offline.js");
    await offlineStatusCommand();
  });

offlineProgram
  .command("on")
  .description("Force offline mode (always use local models)")
  .action(async () => {
    const { offlineOnCommand } = await import("./commands/offline.js");
    await offlineOnCommand();
  });

offlineProgram
  .command("auto")
  .description("Enable auto-detection (switch based on network)")
  .action(async () => {
    const { offlineAutoCommand } = await import("./commands/offline.js");
    await offlineAutoCommand();
  });

offlineProgram
  .command("off")
  .description("Force online mode (disable offline)")
  .action(async () => {
    const { offlineOffCommand } = await import("./commands/offline.js");
    await offlineOffCommand();
  });

offlineProgram
  .command("model <name>")
  .description("Set preferred offline model")
  .action(async (name: string) => {
    const { offlineModelCommand } = await import("./commands/offline.js");
    await offlineModelCommand(name);
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

program
  .command("intelligence <action>")
  .description("Phase 6 Intelligence commands (stats, clear)")
  .option("-j, --json", "Output JSON format")
  .option("--clear", "Clear learning data (for 'clear' action)")
  .action((action, options) => {
    intelligenceCommand(action, {
      json: options.json,
      clear: options.clear
    });
  });

// Model B: Inferred decisions
program
  .command("infer")
  .description("Detect inferred decisions from git history (Model B MVP)")
  .option("--since <days>", "Analyze commits from last N days", "7")
  .option("--threshold <0-1>", "Minimum confidence threshold", "0.5")
  .option("--json", "Output as JSON")
  .option("--prompt", "Prompt to save detected decisions")
  .action((options) => {
    inferCommand({
      since: options.since,
      threshold: options.threshold,
      json: options.json,
      prompt: options.prompt
    });
  });

// Decision Lifecycle commands
program
  .command("revise <decisionId>")
  .description("Revise an existing decision (create new that supersedes old)")
  .option("-r, --reasoning <text>", "Reasoning for the revision", "")
  .option("-c, --chosen <option>", "New chosen option", "")
  .action((id, options) => {
    reviseCommand(id, {
      reasoning: options.reasoning,
      chosen: options.chosen
    });
  });

program
  .command("contradict <decisionId>")
  .description("Mark a decision as contradicted")
  .option("-e, --evidence <text>", "Evidence of contradiction", "")
  .option("-r, --reasoning <text>", "Why does this contradict?", "")
  .action((id, options) => {
    contradictCommand(id, {
      evidence: options.evidence,
      reasoning: options.reasoning
    });
  });

program
  .command("reinforce <decisionId>")
  .description("Reinforce a decision with new evidence")
  .option("-e, --evidence <text>", "Supporting evidence", "")
  .option("-r, --reason <text>", "Why does this reinforce?", "")
  .action((id, options) => {
    reinforceCommand(id, {
      evidence: options.evidence,
      reason: options.reason
    });
  });

// Frictionless Capture - Ultra-fast decision capture
program
  .command("decide-fast <title>")
  .description("Ultra-fast decision capture (<100ms, no LLM)")
  .option("-w, --why <text>", "Why did you choose this?", "")
  .option("-t, --tags <tags>", "Tags (comma-separated)", "")
  .option("-a, --ask", "Interactive mode - ask for reasoning", false)
  .action((title, options) => {
    decideFastCommand(title, {
      why: options.why,
      tags: options.tags,
      ask: options.ask
    });
  });

// TUI: Inferred Decisions Dashboard
program
  .command("decisions-inferred")
  .description("Interactive dashboard for inferred decisions")
  .option("--since <days>", "Analyze commits from last N days", "7")
  .action((options) => {
    decisionsInferredCommand({
      since: options.since
    });
  });

program.parse();

process.on("exit", () => dumpActiveHandles("exit"));
process.on("SIGINT", () => { dumpActiveHandles("SIGINT"); process.exit(130); });
process.on("SIGTERM", () => { dumpActiveHandles("SIGTERM"); process.exit(143); });
