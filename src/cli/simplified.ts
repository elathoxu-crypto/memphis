#!/usr/bin/env node

/**
 * Memphis CLI — Simplified Interface
 *
 * Usage:
 *   mem <command> [options...]
 *
 * Shortcuts:
 *   mem j "text"        = mem journal "text"
 *   mem a "question"      = mem ask "question"
 *   mem r "keyword"      = mem recall "keyword"
 *   mem s                 = mem status
 *   mem t                 = mem tui
 *
 * Groups:
 *   Core: journal, ask, recall, status
 *   Insights: embed, graph, reflect, summarize
 *   Decisions: decide, show, revise
 *   Data: ingest, watch, share-sync, vault
 *   Setup: init, tui, workspace
 *   System: agent, daemon, verify, repair
 */

import { Command } from "commander";
import { spawn } from "node:child_process";
import chalk from "chalk";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Get path to original CLI
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const originalCLI = path.join(__dirname, "index.js");

/**
 * Run original CLI with given arguments
 */
function runOriginalCLI(args: string[]): void {
  const child = spawn("node", [originalCLI, ...args], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

// Create simplified program structure
const program = new Command();

program
  .name("mem")
  .description("Memphis — Local-first cognitive engine")
  .version("1.5.0")
  .usage("[command] [options...]");

// === SHORTCUTS ===
program
  .command("j [message...]")
  .description("Shortcut: add journal entry")
  .action((message) => {
    runOriginalCLI(["journal", ...message]);
  });

program
  .command("a [question...]")
  .description("Shortcut: ask question")
  .action((question) => {
    runOriginalCLI(["ask", ...question]);
  });

program
  .command("r [query...]")
  .description("Shortcut: recall memories")
  .action((query) => {
    runOriginalCLI(["recall", ...query]);
  });

program
  .command("s")
  .description("Shortcut: show status")
  .action(() => {
    runOriginalCLI(["status"]);
  });

program
  .command("t")
  .description("Shortcut: launch TUI")
  .action(() => {
    runOriginalCLI(["tui"]);
  });

// === GROUPED HELP ===
program
  .command("core")
  .description("Show core commands (journal, ask, recall, status)")
  .action(() => {
    console.log(chalk.blue("🧠 Core Commands\\n"));
    console.log("  mem journal \"text\"    Add memories to your brain");
    console.log("  mem ask \"question\"    Ask with full context");
    console.log("  mem recall \"keyword\"  Search your memories");
    console.log("  mem status            Check system health\\n");
    console.log("Shortcuts: mem j, mem a, mem r, mem s");
  });

program
  .command("insights")
  .description("Show insight commands (embed, graph, reflect, summarize)")
  .action(() => {
    console.log(chalk.green("💡 Insight Commands\\n"));
    console.log("  mem embed          Generate semantic embeddings");
    console.log("  mem graph          Build knowledge graph");
    console.log("  mem reflect        Self-reflection reports");
    console.log("  mem summarize      Create summaries\\n");
  });

program
  .command("decisions")
  .description("Show decision commands (decide, show, revise)")
  .action(() => {
    console.log(chalk.yellow("⚖️  Decision Commands\\n"));
    console.log("  mem decide <title> <choice>  Record decisions");
    console.log("  mem show decision <id>       Show decision details");
    console.log("  mem revise <id>               Revise decisions\\n");
  });

program
  .command("data")
  .description("Show data commands (ingest, watch, share-sync, vault)")
  .action(() => {
    console.log(chalk.cyan("📁 Data Commands\\n"));
    console.log("  mem ingest <path>         Import files");
    console.log("  mem watch <path>          Auto-ingest changes");
    console.log("  mem share-sync            Agent synchronization");
    console.log("  mem vault                 Encrypted secrets\\n");
  });

program
  .command("setup")
  .description("Show setup commands (init, tui, workspace)")
  .action(() => {
    console.log(chalk.magenta("⚙️  Setup Commands\\n"));
    console.log("  mem init                 Initialize workspace");
    console.log("  mem tui                  Visual interface");
    console.log("  mem workspace             Manage workspaces\\n");
  });

program
  .command("system")
  .description("Show system commands (agent, daemon, verify, repair)")
  .action(() => {
    console.log(chalk.red("🔧 System Commands\\n"));
    console.log("  mem agent                 Manage agents");
    console.log("  mem daemon               Background services");
    console.log("  mem verify                Check integrity");
    console.log("  mem repair                Fix corruption\\n");
  });

// === QUICKSTART GUIDE ===
program
  .command("quickstart")
  .description("Show 5-minute quickstart guide")
  .action(() => {
    console.log(chalk.blue("🚀 Memphis Quickstart — 5 Minutes\\n"));
    console.log("1. Install:");
    console.log("   git clone https://github.com/elathoxu-crypto/memphis.git");
    console.log("   cd memphis && npm install && npm link\\n");
    console.log("2. Initialize:");
    console.log("   mem init && mem status\\n");
    console.log("3. First memory:");
    console.log("   mem j \"My first memory\" --tags test\\n");
    console.log("4. Ask about it:");
    console.log("   mem a \"what did I just remember?\"\\n");
    console.log("5. Visual interface:");
    console.log("   mem tui\\n");
    console.log("That's it! You have a working AI brain. 🎉\\n");
    console.log("More: mem core | mem insights | mem decisions");
    console.log("Full docs: https://github.com/elathoxu-crypto/memphis");
  });

// === FALLBACK TO ORIGINAL CLI ===
program
  .command("*")
  .description("Pass through to original CLI")
  .action((command, ...args) => {
    // If it's a recognized command, pass to original
    const knownCommands = [
      "journal", "ask", "recall", "status", "embed", "graph",
      "reflect", "summarize", "decide", "show", "revise",
      "ingest", "watch", "share-sync", "vault", "init", "tui",
      "workspace", "agent", "daemon", "verify", "repair"
    ];

    if (knownCommands.includes(command)) {
      runOriginalCLI([command, ...args]);
    } else {
      console.log(chalk.red(`Unknown command: ${command}`));
      console.log(chalk.blue("\\nTry: mem core | mem insights | mem quickstart"));
      console.log(chalk.gray("Full help: mem --help"));
      process.exit(1);
    }
  });

// === DEFAULT ACTION (show help) ===
if (process.argv.length <= 2) {
  console.log(chalk.blue("🧠 Memphis — Local-first Cognitive Engine\\n"));
  console.log("Quick commands:");
  console.log("  mem j \"text\"        Add memories");
  console.log("  mem a \"question\"     Ask questions");
  console.log("  mem r \"keyword\"      Search");
  console.log("  mem s                 Status");
  console.log("  mem t                 TUI\\n");
  console.log("Learn more:");
  console.log("  mem quickstart       5-min guide");
  console.log("  mem core             Core commands");
  console.log("  mem insights         Insight commands");
  console.log("  mem --help           Full help\\n");
  console.log(chalk.gray("Full documentation: https://github.com/elathoxu-crypto/memphis"));
  process.exit(0);
}

program.parse();
